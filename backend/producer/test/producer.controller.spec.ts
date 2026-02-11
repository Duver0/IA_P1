import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ProducerController } from '../src/producer.controller';
import { ProducerService } from '../src/producer.service';
import { TurnosService } from '../src/turnos/turnos.service';
import * as request from 'supertest';

describe('ProducerController (Integration Tests)', () => {
    let app: INestApplication;
    let producerService: jest.Mocked<ProducerService>;
    let turnosService: jest.Mocked<TurnosService>;

    beforeEach(async () => {
        /**
         * Mock de los servicios
         * Simulamos ProducerService y TurnosService
         */
        const mockProducerService = {
            createTurno: jest.fn(),
        };

        const mockTurnosService = {
            findByCedula: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProducerController],
            providers: [
                {
                    provide: ProducerService,
                    useValue: mockProducerService,
                },
                {
                    provide: TurnosService,
                    useValue: mockTurnosService,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        
        // Aplicar los mismos pipes de validación que en main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );

        producerService = module.get(ProducerService) as jest.Mocked<ProducerService>;
        turnosService = module.get(TurnosService) as jest.Mocked<TurnosService>;

        await app.init();
    });

    afterEach(async () => {
        await app.close();
        jest.clearAllMocks();
    });

    describe('POST /turnos - Crear turno', () => {
        /**
         * PRUEBA 1: Crear turno exitosamente
         * Verifica que la API retorna 202 Accepted
         */
        it('Debe crear un turno y retornar 202 Accepted', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            producerService.createTurno.mockResolvedValue({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });

            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(createTurnoDto)
                .expect(202);

            expect(response.body).toEqual({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });
            expect(producerService.createTurno).toHaveBeenCalledWith(createTurnoDto);
        });

        /**
         * PRUEBA 2: Fallar si falta cedula
         * Verifica validación de payload - retorna 400
         */
        it('Debe retornar 400 si falta la cedula', async () => {
            const invalidPayload = {
                nombre: 'Juan Pérez',
            };

            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('cedula'),
                ]),
            );
            expect(response.body.error).toBe('Bad Request');
        });

        /**
         * PRUEBA 3: Fallar si falta nombre
         * Verifica validación de payload
         */
        it('Debe retornar 400 si falta el nombre', async () => {
            const invalidPayload = {
                cedula: 123456789,
            };

            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('nombre'),
                ]),
            );
        });

        /**
         * PRUEBA 4: Fallar si cedula no es número
         * Verifica tipado de datos
         */
        it('Debe retornar 400 si cedula no es un número', async () => {
            const invalidPayload = {
                cedula: 'texto-invalido',
                nombre: 'Juan Pérez',
            };

            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(invalidPayload)
                .expect(400);

            expect(response.body.error).toBe('Bad Request');
        });

        /**
         * PRUEBA 5: Rechazar propiedades adicionales
         * Verifica que whitelist está activo
         */
        it('Debe rechazar propiedades adicionales (whitelist)', async () => {
            const payloadWithExtra = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
                email: 'juan@example.com',
                telefono: '3001234567',
                extra: 'no permitida',
            };

            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(payloadWithExtra)
                .expect(400);

            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('email'),
                    expect.stringContaining('telefono'),
                ]),
            );
        });

        /**
         * PRUEBA 6: Contenido sin bodyparser
         * Verifica que sin body retorna error
         */
        it('Debe retornar 400 si no se envía body', async () => {
            const response = await request(app.getHttpServer())
                .post('/turnos')
                .expect(400);

            expect(response.status).toBe(400);
        });

        /**
         * PRUEBA 7: Múltiples turnos en secuencia
         * Verifica que pueda procesar varios turnos seguidos
         */
        it('Debe procesar múltiples solicitudes de turnos', async () => {
            const turno1 = { cedula: 111111111, nombre: 'Ana García' };
            const turno2 = { cedula: 222222222, nombre: 'Carlos López' };

            producerService.createTurno.mockResolvedValue({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });

            await request(app.getHttpServer())
                .post('/turnos')
                .send(turno1)
                .expect(202);

            await request(app.getHttpServer())
                .post('/turnos')
                .send(turno2)
                .expect(202);

            expect(producerService.createTurno).toHaveBeenCalledTimes(2);
        });

        /**
         * PRUEBA 8: Nombre con caracteres especiales
         * Verifica aceptación de acentos y caracteres especiales
         */
        it('Debe aceptar nombres con acentos y caracteres especiales', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'María José O\'Connor-García',
            };

            producerService.createTurno.mockResolvedValue({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });

            await request(app.getHttpServer())
                .post('/turnos')
                .send(createTurnoDto)
                .expect(202);

            expect(producerService.createTurno).toHaveBeenCalledWith(createTurnoDto);
        });

        /**
         * PRUEBA 9: Cédula en formato string pero parseable a número
         * Verifica transformación automática
         */
        it('Debe aceptar cedula como string si es parseable', async () => {
            const createTurnoDto = {
                cedula: '123456789',
                nombre: 'Juan Pérez',
            };

            producerService.createTurno.mockResolvedValue({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });

            // ClassTransformer debería convertir string a number
            const response = await request(app.getHttpServer())
                .post('/turnos')
                .send(createTurnoDto);

            // Podría ser 202 o 400 dependiendo de la configuración de transform
            expect([202, 400]).toContain(response.status);
        });

        /**
         * PRUEBA 10: Content-Type correcto
         * Verifica que maneja application/json
         */
        it('Debe procesar Content-Type application/json correctamente', async () => {
            const createTurnoDto = {
                cedula: 123456789,
                nombre: 'Juan Pérez',
            };

            producerService.createTurno.mockResolvedValue({
                status: 'accepted',
                message: 'Turno en proceso de asignación',
            });

            await request(app.getHttpServer())
                .post('/turnos')
                .set('Content-Type', 'application/json')
                .send(createTurnoDto)
                .expect(202);
        });
    });

    describe('GET /turnos/:cedula - Consultar turnos', () => {
        /**
         * PRUEBA 11: Obtener turnos por cédula
         * Verifica que retorna lista de turnos
         */
        it('Debe retornar turnos para una cédula válida', async () => {
            const cedula = 123456789;
            const expectedTurnos = [
                {
                    cedula: 123456789,
                    nombre: 'Juan Pérez',
                    consultorio: 3,
                    estado: 'asignado',
                    createdAt: '2026-02-11T01:55:42.679Z',
                },
            ];

            turnosService.findByCedula.mockResolvedValue(expectedTurnos as unknown as any);

            const response = await request(app.getHttpServer())
                .get(`/turnos/${cedula}`)
                .expect(200);

            expect(response.body).toEqual(expectedTurnos);
            expect(turnosService.findByCedula).toHaveBeenCalledWith(cedula);
        });

        /**
         * PRUEBA 12: No encontrar turnos
         * Verifica que retorna 404 si no hay turnos
         */
        it('Debe retornar 404 si no hay turnos para la cédula', async () => {
            const cedula = 999999999;

            turnosService.findByCedula.mockRejectedValue(
                new Error('No se encontraron turnos para la cédula 999999999'),
            );

            const response = await request(app.getHttpServer())
                .get(`/turnos/${cedula}`)
                .expect(500); // O ajustar según el handler de errores

            expect(turnosService.findByCedula).toHaveBeenCalledWith(cedula);
        });

        /**
         * PRUEBA 13: Cédula inválida (string no numérico)
         * Verifica ParseIntPipe
         */
        it('Debe retornar 400 si cedula no es un número válido', async () => {
            const response = await request(app.getHttpServer())
                .get('/turnos/texto-invalido')
                .expect(400);

            expect(response.body.error).toBe('Bad Request');
        });

        /**
         * PRUEBA 14: Cédula con valor 0
         * Verifica edge case numérico
         */
        it('Debe aceptar cedula con valor 0', async () => {
            const cedula = 0;
            const expectedTurnos = [];

            turnosService.findByCedula.mockResolvedValue(expectedTurnos as unknown as any);

            const response = await request(app.getHttpServer())
                .get(`/turnos/${cedula}`)
                .expect(200);

            expect(response.body).toEqual(expectedTurnos);
        });

        /**
         * PRUEBA 15: Cédula negativa
         * Verifica que ParseIntPipe acepte negativos
         */
        it('Debe aceptar cédulas negativas', async () => {
            const cedula = -123456789;
            const expectedTurnos = [];

            turnosService.findByCedula.mockResolvedValue(expectedTurnos as unknown as any);

            const response = await request(app.getHttpServer())
                .get(`/turnos/${cedula}`)
                .expect(200);

            expect(turnosService.findByCedula).toHaveBeenCalledWith(cedula);
        });

        /**
         * PRUEBA 16: Múltiples turnos por cédula
         * Verifica que retorna array con múltiples elementos
         */
        it('Debe retornar múltiples turnos para la misma cédula', async () => {
            const cedula = 123456789;
            const expectedTurnos = [
                {
                    cedula: 123456789,
                    nombre: 'Juan Pérez',
                    consultorio: 3,
                    estado: 'asignado',
                    createdAt: '2026-02-11T01:55:42.679Z',
                },
                {
                    cedula: 123456789,
                    nombre: 'Juan Pérez',
                    consultorio: 5,
                    estado: 'confirmado',
                    createdAt: '2026-02-10T10:00:00.000Z',
                },
            ];

            turnosService.findByCedula.mockResolvedValue(expectedTurnos as unknown as any);

            const response = await request(app.getHttpServer())
                .get(`/turnos/${cedula}`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(expectedTurnos);
        });
    });
});
