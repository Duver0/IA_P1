import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TurnoEventPayload } from '../domain/entities/turno.entity';
import { ConsultorioRealtimeEventPayload } from '../domain/events/consultorio-realtime.event';
import { RealtimeEventsBus } from './realtime-events.bus';





@Controller()
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(private readonly realtimeEventsBus: RealtimeEventsBus) { }

    @EventPattern('turno_creado')
    async handleTurnoCreado(@Payload() data: TurnoEventPayload): Promise<void> {
        this.logger.log(`Evento turno_creado recibido: ${data.id} — ${data.nombre}`);
        this.realtimeEventsBus.emitTurnoActualizado(data);
    }

    @EventPattern('turno_actualizado')
    async handleTurnoActualizado(@Payload() data: TurnoEventPayload): Promise<void> {
        this.logger.log(`Evento turno_actualizado recibido: ${data.id} — ${data.nombre} → ${data.estado}`);
                this.realtimeEventsBus.emitTurnoActualizado(data);
        }

        @EventPattern('consultorio_updated')
        async handleConsultorioUpdated(@Payload() data: ConsultorioRealtimeEventPayload): Promise<void> {
                this.logger.log(
                    `Evento consultorio_updated recibido: consultorio=${data.consultorioId} estado=${data.estado}`,
                );
                this.realtimeEventsBus.emitConsultorioUpdated(data);
        }

        @EventPattern('patient_assigned')
        async handlePatientAssigned(@Payload() data: ConsultorioRealtimeEventPayload): Promise<void> {
                this.logger.log(
                    `Evento patient_assigned recibido: consultorio=${data.consultorioId} patientId=${data.patientId ?? 'N/A'}`,
                );
                this.realtimeEventsBus.emitPatientAssigned(data);
        }

        @EventPattern('attention_finished')
        async handleAttentionFinished(@Payload() data: ConsultorioRealtimeEventPayload): Promise<void> {
                this.logger.log(
                    `Evento attention_finished recibido: consultorio=${data.consultorioId} estado=${data.estado}`,
                );
                this.realtimeEventsBus.emitAttentionFinished(data);
    }
}
