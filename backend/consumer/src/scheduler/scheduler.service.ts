import { Injectable, Logger, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { TurnosService } from '../turnos/turnos.service';

// ⚕️ HUMAN CHECK - Scheduler de asignación de consultorios
// SCHEDULER_INTERVAL no se puede inyectar dinámicamente en @Interval() (es estático en compilación).
// Si se necesita un intervalo configurable, usar setTimeout recursivo en lugar de @Interval.
// Se baja a 1000ms para verificar el fin de atención aleatoria (8-15s) oportunamente.
const SCHEDULER_INTERVAL_MS = 1000;

// ⚕️ HUMAN CHECK - Número total de consultorios
// Configurable vía CONSULTORIOS_TOTAL. Reducido a 5 por requerimiento.
const DEFAULT_CONSULTORIOS = 5;

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly totalConsultorios: number;

    constructor(
        private readonly turnosService: TurnosService,
        @Inject('TURNOS_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) {
        // ⚕️ HUMAN CHECK - Lectura de env vía process.env
        // ConfigService no se usa aquí porque el valor solo se necesita en el constructor.
        // Si se necesita hot-reload de config, inyectar ConfigService y usar .get().
        this.totalConsultorios = Number(process.env.CONSULTORIOS_TOTAL) || DEFAULT_CONSULTORIOS;
        this.logger.log(
            `Scheduler iniciado — ${this.totalConsultorios} consultorios, intervalo: ${SCHEDULER_INTERVAL_MS}ms`,
        );
    }

    // ⚕️ HUMAN CHECK - Scheduler de asignación de consultorios
    // Se ejecuta cada 5 segundos (SCHEDULER_INTERVAL_MS)
    // 1. Finaliza turnos llamados (llamado -> atendido)
    // 2. Asigna consultorios libres a pacientes en espera
    @Interval(SCHEDULER_INTERVAL_MS)
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
