import { Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TurnosService } from '../turnos/turnos.service';
import { TurnoEventPayload } from '../types/turno-event';

// ⚕️ HUMAN CHECK - WebSocket Gateway
// cors: true permite conexiones de cualquier origen (solo para desarrollo)
// En producción, restringir a los dominios permitidos
@WebSocketGateway({
    namespace: '/ws/turnos',
    cors: {
        origin: '*',
    },
})
export class TurnosGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(TurnosGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly turnosService: TurnosService) { }

    // ⚕️ HUMAN CHECK - Conexión de cliente
    // Al conectarse, envía un snapshot de todos los turnos actuales
    async handleConnection(client: Socket): Promise<void> {
        this.logger.log(`Cliente conectado: ${client.id}`);

        try {
            const turnos = await this.turnosService.findAll();

            // ⚕️ HUMAN CHECK - Usa toEventPayload() para mapeo consistente
            const snapshot: TurnoEventPayload[] = turnos.map(t =>
                this.turnosService.toEventPayload(t),
            );

            client.emit('TURNOS_SNAPSHOT', {
                type: 'TURNOS_SNAPSHOT',
                data: snapshot,
            });

            this.logger.log(`Snapshot enviado a ${client.id} — ${snapshot.length} turnos`);
        } catch (error: unknown) {
            // ⚕️ HUMAN CHECK - Error tipado (eliminado any implícito)
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error enviando snapshot a ${client.id}: ${message}`);
        }
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }

    // ⚕️ HUMAN CHECK - Broadcast de actualización
    // Se llama desde el EventsController cuando llega un evento de RabbitMQ
    // ⚕️ HUMAN CHECK - Usa TurnoEventPayload en vez de inline object type
    broadcastTurnoActualizado(turno: TurnoEventPayload): void {
        this.server.emit('TURNO_ACTUALIZADO', {
            type: 'TURNO_ACTUALIZADO',
            data: turno,
        });

        this.logger.log(
            `Broadcast TURNO_ACTUALIZADO — ${turno.nombre} (estado: ${turno.estado}, consultorio: ${turno.consultorio ?? 'N/A'})`,
        );
    }
}
