import { Injectable, Logger, Inject } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { TurnosService } from '../turnos/turnos.service';
import { ConfigService } from '@nestjs/config';

// ⚕️ HUMAN CHECK - Scheduler de asignación de consultorios
// Ahora el intervalo se lee desde ConfigService: SCHEDULER_INTERVAL_MS (default 15000ms, alineado con README)

// ⚕️ HUMAN CHECK - Número total de consultorios
// Configurable vía CONSULTORIOS_TOTAL. Reducido a 5 por requerimiento.
const DEFAULT_CONSULTORIOS = 5;

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly totalConsultorios: number;
    private readonly intervalMs: number;

    constructor(
        private readonly turnosService: TurnosService,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject('TURNOS_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) {
        // ⚕️ HUMAN CHECK - Configuración vía ConfigService
        // SCHEDULER_INTERVAL_MS configurable (default 15000ms) alineado con README
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;
        this.totalConsultorios = Number(this.configService.get('CONSULTORIOS_TOTAL')) || DEFAULT_CONSULTORIOS;
        this.logger.log(
            `Scheduler iniciado — ${this.totalConsultorios} consultorios, intervalo: ${this.intervalMs}ms`,
        );

        // ⚕️ HUMAN CHECK - Registro dinámico en SchedulerRegistry
        // Se mantiene la arquitectura de scheduler, pero con intervalo configurable en tiempo de arranque.
        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);
        this.schedulerRegistry.addInterval('scheduler-asignacion-turnos', interval);
    }

    // ⚕️ HUMAN CHECK - Scheduler de asignación de consultorios
    // Se ejecuta cada intervalo configurado (default 15000ms)
    // 1. Finaliza turnos llamados (llamado -> atendido)
    // 2. Asigna consultorios libres a pacientes en espera
    async handleSchedulerTick(): Promise<void> {
        try {
            // ⚕️ HUMAN CHECK - Paso 0: Finalizar turnos anteriores
            // Antes de asignar nuevos consultorios, liberamos los que ya fueron llamados
            // para que el flujo sea rápido (cada 5s hay una rotación completa si hay gente)
            const finalizados = await this.turnosService.finalizarTurnosLlamados();
            for (const t of finalizados) {
                this.notificationsClient.emit(
                    'turno_actualizado',
                    this.turnosService.toEventPayload(t),
                );
            }

            // 1. Obtener consultorios ocupados (en este punto deberían ser 0 tras finalizarTurnosLlamados)
            const ocupados = await this.turnosService.getConsultoriosOcupados();
            this.logger.debug(`Consultorios ocupados: [${ocupados.join(', ')}]`);

            // 2. Calcular consultorios libres
            const todosConsultorios = Array.from(
                { length: this.totalConsultorios },
                (_, i) => String(i + 1),
            );
            const libres = todosConsultorios.filter(c => !ocupados.includes(c));

            if (libres.length === 0) {
                this.logger.debug('No hay consultorios libres — esperando...');
                return;
            }

            // 3. Obtener pacientes en espera (ordenados por prioridad + timestamp)
            const enEspera = await this.turnosService.findPacientesEnEspera();

            if (enEspera.length === 0) {
                this.logger.debug('No hay pacientes en espera');
                return;
            }

            // 4. Asignar el primer consultorio libre al primer paciente en espera
            const paciente = enEspera[0];
            const consultorio = libres[0];

            // ⚕️ HUMAN CHECK - Asignación atómica
            const turnoActualizado = await this.turnosService.asignarConsultorio(
                String(paciente._id),
                consultorio,
            );

            if (turnoActualizado) {
                this.logger.log(
                    `✅ Consultorio ${consultorio} asignado a ${turnoActualizado.nombre} (cédula: ${turnoActualizado.cedula})`,
                );

                // 5. Emitir evento tipado para que el Producer haga broadcast por WebSocket
                this.notificationsClient.emit(
                    'turno_actualizado',
                    this.turnosService.toEventPayload(turnoActualizado),
                );
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error en scheduler de asignación: ${message}`);
        }
    }
}
