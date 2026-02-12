import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TurnosGateway } from './turnos.gateway';
import { TurnoEventPayload } from '../types/turno-event';

// ⚕️ HUMAN CHECK - Controlador de eventos RabbitMQ → WebSocket
// Escucha eventos del Consumer y los reenvía por WebSocket a los clientes
// ⚕️ HUMAN CHECK - Eliminado uso de `any` en los handlers
// Ahora usa TurnoEventPayload para garantizar type safety end-to-end
@Controller()
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(private readonly turnosGateway: TurnosGateway) { }

    @EventPattern('turno_creado')
    async handleTurnoCreado(@Payload() data: TurnoEventPayload): Promise<void> {
        this.logger.log(`Evento turno_creado recibido: ${data.id} — ${data.nombre}`);
        this.turnosGateway.broadcastTurnoActualizado(data);
    }

    @EventPattern('turno_actualizado')
    async handleTurnoActualizado(@Payload() data: TurnoEventPayload): Promise<void> {
        this.logger.log(`Evento turno_actualizado recibido: ${data.id} — ${data.nombre} → ${data.estado}`);
        this.turnosGateway.broadcastTurnoActualizado(data);
    }
}
