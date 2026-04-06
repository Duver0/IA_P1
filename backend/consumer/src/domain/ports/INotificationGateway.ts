
export interface INotificationGateway {
    sendNotification(cedula: string, consultorio: string | null): Promise<void>;
}
