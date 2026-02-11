import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnosService } from './turnos/turnos.service';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        private readonly turnosService: TurnosService,
        private readonly notificationsService: NotificationsService,
        @Inject('TURNOS_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) { }

    @EventPattern('crear_turno')
    async handleCrearTurno(@Payload() data: CreateTurnoDto, @Ctx() context: RmqContext): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        // ⚕️ HUMAN CHECK - Lógica de Procesamiento de Mensajes
        // Verificar que los datos recibidos tengan la estructura esperada
        this.logger.log(`Recibido mensaje: ${JSON.stringify(data)}`);

        try {
            // Persistir turno en MongoDB (estado: espera, sin consultorio)
            const turno = await this.turnosService.crearTurno(data);
            this.logger.log(
                `Turno creado en espera para paciente ${turno.cedula} — ID: ${turno._id}`,
            );

            // Enviar notificación (log)
            await this.notificationsService.sendNotification(String(turno.cedula), turno.consultorio);

            // ⚕️ HUMAN CHECK - Emitir evento turno_creado al Producer
            // El Producer recibirá este evento y hará broadcast por WebSocket
            // Usa toEventPayload() para garantizar type safety
            this.notificationsClient.emit(
                'turno_creado',
                this.turnosService.toEventPayload(turno),
            );

            // ⚕️ HUMAN CHECK - Confirmación Manual (Ack)
            // Solo confirmar si el procesamiento fue exitoso.
            channel.ack(originalMsg);
        } catch (error: unknown) {
            // ⚕️ HUMAN CHECK - Error tipado (eliminado any implícito en catch)
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error procesando mensaje: ${message}`);
            // Manejo de errores:
            // channel.nack(originalMsg, false, false); // DLQ si configurado
        }
    }
}
