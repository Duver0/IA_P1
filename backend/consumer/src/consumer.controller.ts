import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnosService } from './turnos/turnos.service';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        private readonly turnosService: TurnosService,
        private readonly notificationsService: NotificationsService,
    ) { }

    @EventPattern('crear_turno')
    async handleCrearTurno(@Payload() data: CreateTurnoDto, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        // ⚕️ HUMAN CHECK - Lógica de Procesamiento de Mensajes
        // Verificar que los datos recibidos tengan la estructura esperada
        this.logger.log(`Recibido mensaje: ${JSON.stringify(data)}`);

        try {
            // Persistir turno en MongoDB
            const turno = await this.turnosService.crearTurno(data);
            this.logger.log(
                `Turno asignado al consultorio ${turno.consultorio} para el paciente ${turno.pacienteId} — ID: ${turno._id}`,
            );

            // Enviar notificación al paciente
            await this.notificationsService.sendNotification(turno.pacienteId, turno.consultorio);

            // ⚕️ HUMAN CHECK - Confirmación Manual (Ack)
            // Solo confirmar si el procesamiento fue exitoso.
            channel.ack(originalMsg);
        } catch (error) {
            this.logger.error('Error procesando mensaje', error);
            // Manejo de errores:
            // - Si es un error recuperable, se podría usar channel.nack(originalMsg)
            // - Si es un error fatal (datos inválidos), se podría descartar o enviar a DLQ.
            // channel.nack(originalMsg, false, false); // false, false = no requeue (DLQ si configurado)
        }
    }
}
