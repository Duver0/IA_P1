import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

const SCHEDULER_INTERVAL_NAME = 'scheduler-asignacion-turnos';

/**
 * Scheduler liviano de observabilidad.
 * No ejecuta lógica de negocio ni afecta flujo de asignación.
 */
@Injectable()
export class SchedulerService implements OnModuleDestroy {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly intervalMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;
        this.logger.log(`Scheduler iniciado en modo observabilidad, intervalo: ${this.intervalMs}ms`);

        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);
        this.schedulerRegistry.addInterval(SCHEDULER_INTERVAL_NAME, interval);
    }

    // ⚕️ HUMAN CHECK - add interval cleanup in onModuleDestroy
    onModuleDestroy(): void {
        this.schedulerRegistry.deleteInterval(SCHEDULER_INTERVAL_NAME);
        this.logger.log('Scheduler interval limpiado correctamente');
    }

    async handleSchedulerTick(): Promise<void> {
        try {
            this.logger.debug('scheduler_tick heartbeat=ok');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error en scheduler de observabilidad: ${message}`);
        }
    }
}
