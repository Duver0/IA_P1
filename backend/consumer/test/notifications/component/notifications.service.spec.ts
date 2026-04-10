import { NotificationsService } from '../../src/notifications/notifications.service';

describe('NotificationsService (Infrastructure)', () => {
    let service: NotificationsService;

    beforeEach(() => {
        service = new NotificationsService();
    });

    describe('sendNotification', () => {
        it('envía notificación cuando se asigna consultorio', async () => {
            // Arrange
            const cedula = '12345';
            const consultorio = '3';

            // Act & Assert (no debe lanzar error)
            await expect(service.sendNotification(cedula, consultorio)).resolves.toBeUndefined();
        });

        it('envía notificación cuando el turno está en espera (sin consultorio)', async () => {
            // Arrange
            const cedula = '67890';
            const consultorio = null;

            // Act & Assert
            await expect(service.sendNotification(cedula, consultorio)).resolves.toBeUndefined();
        });
    });
});
