import { Test, TestingModule } from '@nestjs/testing';
import { ProducerService } from '../src/producer.service';
import { ClientProxy } from '@nestjs/microservices';

describe('ProducerService', () => {
    let service: ProducerService;
    let mockClientProxy: jest.Mocked<ClientProxy>;

    beforeEach(async () => {
        /**
         * Mock de ClientProxy (simula la conexión a RabbitMQ)
         * Mocleamos el método emit que es el que envía mensajes a la cola
         */
        mockClientProxy = {
            emit: jest.fn(),
        } as unknown as jest.Mocked<ClientProxy>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProducerService,
                {
                    provide: 'TURNOS_SERVICE',
                    useValue: mockClientProxy,
                },
            ],
        }).compile();

        service = module.get<ProducerService>(ProducerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createTurno - Casos exitosos', () => {
        /**
         * PRUEBA 1: Crear turno válido
         * Verifica que se envíe el mensaje a RabbitMQ y retorne confirmación
         */
        it('Debe enviar turno a RabbitMQ y retornar status accepted', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            const result = await service.createTurno(createTurnoDto);

            expect(mockClientProxy.emit).toHaveBeenCalledWith('crear_turno', createTurnoDto);
            expect(result).toEqual({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });
        });

        /**
         * PRUEBA 2: Múltiples turnos consecutivos
         * Verifica que cada turno se envíe correctamente
         */
        it('Debe manejar múltiples turnos consecutivos', async () => {
            const turno1 = { cedula: 111111111, nombre: 'Ana García' };
            const turno2 = { cedula: 222222222, nombre: 'Carlos López' };

            await service.createTurno(turno1);
            await service.createTurno(turno2);

            expect(mockClientProxy.emit).toHaveBeenCalledTimes(2);
            expect(mockClientProxy.emit).toHaveBeenNthCalledWith(1, 'crear_turno', turno1);
            expect(mockClientProxy.emit).toHaveBeenNthCalledWith(2, 'crear_turno', turno2);
        });

        /**
         * PRUEBA 3: Datos con caracteres especiales
         * Verifica que maneje nombres con acentos y caracteres especiales
         */
        it('Debe manejar nombres con acentos y caracteres especiales', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'María José O\'Connor-García',
            };

            const result = await service.createTurno(createTurnoDto);

            expect(mockClientProxy.emit).toHaveBeenCalledWith('crear_turno', createTurnoDto);
            expect(result.status).toBe('accepted');
        });
    });

    describe('createTurno - Manejo de errores', () => {
        /**
         * PRUEBA 4: Error en emit de RabbitMQ
         * Verifica que lance error si RabbitMQ no está disponible
         */
        it('Debe lanzar error si RabbitMQ no responde', async () => {
            const rabbitError = new Error('AMQP connection failed');
            mockClientProxy.emit.mockImplementationOnce(() => {
                throw rabbitError;
            });

            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            await expect(service.createTurno(createTurnoDto)).rejects.toThrow('AMQP connection failed');
        });

        /**
         * PRUEBA 5: Error de timeout
         * Verifica comportamiento si RabbitMQ tarda demasiado
         */
        it('Debe manejar timeout de RabbitMQ', async () => {
            const timeoutError = new Error('Request timeout');
            mockClientProxy.emit.mockImplementationOnce(() => {
                throw timeoutError;
            });

            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            await expect(service.createTurno(createTurnoDto)).rejects.toThrow('Request timeout');
        });

        /**
         * PRUEBA 6: Error de conexión
         * Verifica que lance error si no hay conexión
         */
        it('Debe lanzar error si la conexión está cerrada', async () => {
            const connectionError = new Error('Connection closed');
            mockClientProxy.emit.mockImplementationOnce(() => {
                throw connectionError;
            });

            const createTurnoDto = {
                cedula: 987654321,
                nombre: 'María López',
            };

            await expect(service.createTurno(createTurnoDto)).rejects.toThrow('Connection closed');
        });
    });

    describe('createTurno - Validación de datos enviados', () => {
        /**
         * PRUEBA 7: Verificar integridad del payload enviado
         * Verifica que los datos se envíen exactamente como se recibieron
         */
        it('Debe enviar los datos exactos sin modificaciones', async () => {
            const originalDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            await service.createTurno(originalDto);

            const callArgument = mockClientProxy.emit.mock.calls[0][1];
            expect(callArgument).toEqual(originalDto);
            expect(callArgument).toStrictEqual(originalDto);
        });

        /**
         * PRUEBA 8: Event name verification
         * Verifica que el nombre del evento sea exacto
         */
        it('Debe enviar el evento con nombre exacto "crear_turno"', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            await service.createTurno(createTurnoDto);

            const eventName = mockClientProxy.emit.mock.calls[0][0];
            expect(eventName).toBe('crear_turno');
            expect(eventName).not.toBe('crearTurno');
            expect(eventName).not.toBe('crear-turno');
        });
    });

    describe('createTurno - Tipos de datos edge cases', () => {
        /**
         * PRUEBA 9: Cédula muy grande
         * Verifica manejo de números grandes
         */
        it('Debe manejar cédulas con números muy grandes', async () => {
            const createTurnoDto = {
                cedula: Number.MAX_SAFE_INTEGER,
                nombre: 'Juan Pérez',
            };

            const result = await service.createTurno(createTurnoDto);
            expect(result.status).toBe('accepted');
            expect(mockClientProxy.emit).toHaveBeenCalled();
        });

        /**
         * PRUEBA 10: Nombre muy largo
         * Verifica que acepte nombres largos
         */
        it('Debe manejar nombres muy largos', async () => {
            const longName = 'A'.repeat(1000);
            const createTurnoDto = {
                cedula: 123456789,
                nombre: longName,
            };

            const result = await service.createTurno(createTurnoDto);
            expect(result.status).toBe('accepted');
        });
    });
});
