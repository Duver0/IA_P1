import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    // ⚕️ HUMAN CHECK - Servicio de Notificaciones
    // Reemplazar esta simulación con una integración real:
    // - Firebase Cloud Messaging (FCM) para notificaciones push
    // - SendGrid / Nodemailer para notificaciones por correo
    // - Twilio para notificaciones por SMS
    // ⚕️ HUMAN CHECK - Tipo corregido: consultorio es string | null (no number | null)
    // para coincidir con el schema de Turno
    async sendNotification(cedula: string, consultorio: string | null): Promise<void> {
        const message = consultorio
            ? `Su turno ha sido asignado al consultorio ${consultorio}`
            : 'Su turno ha sido registrado. Está en espera de asignación.';
        this.logger.log(`📩 Notificación enviada al paciente ${cedula}: ${message}`);
    }
}
