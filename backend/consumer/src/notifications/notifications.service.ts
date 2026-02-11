import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    // ⚕️ HUMAN CHECK - Servicio de Notificaciones
    // Reemplazar esta simulación con una integración real:
    // - Firebase Cloud Messaging (FCM) para notificaciones push
    // - SendGrid / Nodemailer para notificaciones por correo
    // - Twilio para notificaciones por SMS
    async sendNotification(cedula: string, consultorio: number): Promise<void> {
        // Simulación de envío de notificación
        this.logger.log(
            `📩 Notificación enviada al paciente ${cedula}: ` +
            `Su turno ha sido asignado al consultorio ${consultorio}`,
        );

        // TODO: Implementar integración real con FCM o SendGrid
        // Ejemplo con FCM:
        // await this.firebaseAdmin.messaging().send({
        //     token: pacienteToken,
        //     notification: {
        //         title: 'Turno Asignado',
        //         body: `Su turno ha sido asignado al consultorio ${consultorio}`,
        //     },
        // });
    }
}
