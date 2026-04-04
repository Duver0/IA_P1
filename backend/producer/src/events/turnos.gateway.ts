import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ITurnoRepository } from '../domain/ports/ITurnoRepository';
import { TURNO_REPOSITORY_TOKEN } from '../domain/ports/tokens';
import { TurnoEventPayload } from '../domain/entities/turno.entity';
import { ConsultorioRealtimeEventPayload } from '../domain/events/consultorio-realtime.event';
import { RealtimeEventsBus } from './realtime-events.bus';

// ⚕️ HUMAN CHECK - WebSocket Gateway
// cors: true permite conexiones de cualquier origen (solo para desarrollo)
// En producción, restringir a los dominios permitidos
@WebSocketGateway({
    namespace: '/ws/turnos',
    cors: {
        origin: '*',
    },
})
export class TurnosGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TurnosGateway.name);

    private readonly turnoActualizadoListener = (turno: TurnoEventPayload): void => {
        void this.broadcastTurnoActualizado(turno);
    };

    private readonly consultorioUpdatedListener = (payload: ConsultorioRealtimeEventPayload): void => {
        this.broadcastConsultorioUpdated(payload);
    };

    private readonly patientAssignedListener = (payload: ConsultorioRealtimeEventPayload): void => {
        this.broadcastPatientAssigned(payload);
    };

    private readonly attentionFinishedListener = (payload: ConsultorioRealtimeEventPayload): void => {
        this.broadcastAttentionFinished(payload);
    };

    @WebSocketServer()
    server: Server;

    // ⚕️ HUMAN CHECK - DIP: inyecta ITurnoRepository (puerto), no TurnosService (concreto)
    constructor(
        @Inject(TURNO_REPOSITORY_TOKEN) private readonly turnoRepository: ITurnoRepository,
        private readonly realtimeEventsBus: RealtimeEventsBus,
    ) { }

    onModuleInit(): void {
        this.realtimeEventsBus.onTurnoActualizado(this.turnoActualizadoListener);
        this.realtimeEventsBus.onConsultorioUpdated(this.consultorioUpdatedListener);
        this.realtimeEventsBus.onPatientAssigned(this.patientAssignedListener);
        this.realtimeEventsBus.onAttentionFinished(this.attentionFinishedListener);
    }

    onModuleDestroy(): void {
        this.realtimeEventsBus.offTurnoActualizado(this.turnoActualizadoListener);
        this.realtimeEventsBus.offConsultorioUpdated(this.consultorioUpdatedListener);
        this.realtimeEventsBus.offPatientAssigned(this.patientAssignedListener);
        this.realtimeEventsBus.offAttentionFinished(this.attentionFinishedListener);
    }

    // ⚕️ HUMAN CHECK - Conexión de cliente
    // Al conectarse, envía un snapshot de todos los turnos actuales
    async handleConnection(client: Socket): Promise<void> {
        this.logger.log(`Cliente conectado: ${client.id}`);

        try {
            const turnos = await this.turnoRepository.findAll();

            const snapshot: TurnoEventPayload[] = turnos.map(t => t.toEventPayload());

            client.emit('TURNOS_SNAPSHOT', {
                type: 'TURNOS_SNAPSHOT',
                data: snapshot,
            });

            this.logger.log(`Snapshot enviado a ${client.id} — ${snapshot.length} turnos`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error enviando snapshot a ${client.id}: ${message}`);
        }
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }

    // ⚕️ HUMAN CHECK - Broadcast de actualización
    // Se dispara al recibir eventos internos desde RealtimeEventsBus.
    async broadcastTurnoActualizado(turno: TurnoEventPayload): Promise<void> {
        const payload = await this.enrichTurnoPayload(turno);

        this.server.emit('TURNO_ACTUALIZADO', {
            type: 'TURNO_ACTUALIZADO',
            data: payload,
        });

        this.logger.log(
            `Broadcast TURNO_ACTUALIZADO — ${payload.nombre} (estado: ${payload.estado}, consultorio: ${payload.consultorio ?? 'N/A'})`,
        );
    }

    private async enrichTurnoPayload(turno: TurnoEventPayload): Promise<TurnoEventPayload> {
        if (turno.medicoNombre || !turno.consultorio) {
            return turno;
        }

        try {
            const doctorName = await this.turnoRepository.findDoctorNameByConsultorioId(turno.consultorio);
            if (!doctorName) {
                return turno;
            }

            return {
                ...turno,
                medicoNombre: doctorName,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(
                `No fue posible enriquecer medicoNombre para consultorio=${turno.consultorio}: ${message}`,
            );
            return turno;
        }
    }

    broadcastConsultorioUpdated(payload: ConsultorioRealtimeEventPayload): void {
        this.server.emit('consultorio_updated', payload);
        this.logger.log(
            `Broadcast consultorio_updated — consultorio=${payload.consultorioId}, estado=${payload.estado}`,
        );
    }

    broadcastPatientAssigned(payload: ConsultorioRealtimeEventPayload): void {
        this.server.emit('patient_assigned', payload);
        this.logger.log(
            `Broadcast patient_assigned — consultorio=${payload.consultorioId}, patientId=${payload.patientId ?? 'N/A'}`,
        );
    }

    broadcastAttentionFinished(payload: ConsultorioRealtimeEventPayload): void {
        this.server.emit('attention_finished', payload);
        this.logger.log(
            `Broadcast attention_finished — consultorio=${payload.consultorioId}, estado=${payload.estado}`,
        );
    }
}
