import { BadRequestException } from '@nestjs/common';
import { ConsumerController } from '../../../src/presentation/consumer.controller';
import { CreateTurnoUseCase } from '../../../src/application/use-cases/create-turno.use-case';
import { AssignDoctorToConsultorioUseCase } from '../../../src/application/use-cases/assign-doctor-to-consultorio.use-case';
import { SetDoctorAvailabilityUseCase } from '../../../src/application/use-cases/set-doctor-availability.use-case';
import { StartMedicalAttentionUseCase } from '../../../src/application/use-cases/start-medical-attention.use-case';
import { FinalizeMedicalAttentionUseCase } from '../../../src/application/use-cases/finalize-medical-attention.use-case';
import { ReleaseConsultorioUseCase } from '../../../src/application/use-cases/release-consultorio.use-case';
import { ProvisionDoctorFromUserUseCase } from '../../../src/application/use-cases/provision-doctor-from-user.use-case';
import { ConsultorioDomainError } from '../../../src/domain/entities/consultorio-session.entity';
import { RecoverableInfraError } from '../../../src/application/errors/message-processing.error';

describe('ConsumerController (Presentation)', () => {
    const createTurnoUseCase: Pick<CreateTurnoUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const assignDoctorToConsultorioUseCase: Pick<AssignDoctorToConsultorioUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const setDoctorAvailabilityUseCase: Pick<SetDoctorAvailabilityUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const startMedicalAttentionUseCase: Pick<StartMedicalAttentionUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const finalizeMedicalAttentionUseCase: Pick<FinalizeMedicalAttentionUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const releaseConsultorioUseCase: Pick<ReleaseConsultorioUseCase, 'execute'> = {
        execute: jest.fn(),
    };
    const provisionDoctorFromUserUseCase: Pick<ProvisionDoctorFromUserUseCase, 'execute'> = {
        execute: jest.fn(),
    };

    const channel = {
        ack: jest.fn(),
        nack: jest.fn(),
        assertQueue: jest.fn().mockResolvedValue({ queue: 'test.dlq' }),
        sendToQueue: jest.fn().mockReturnValue(true),
    };

    const context = {
        getChannelRef: jest.fn(() => channel),
        getMessage: jest.fn(() => ({
            id: 'msg-1',
            fields: { redelivered: false },
            properties: { messageId: 'cmd-msg-1', correlationId: 'corr-1', headers: {} },
        })),
    };

    let controller: ConsumerController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ConsumerController(
            createTurnoUseCase as CreateTurnoUseCase,
            assignDoctorToConsultorioUseCase as AssignDoctorToConsultorioUseCase,
            setDoctorAvailabilityUseCase as SetDoctorAvailabilityUseCase,
            startMedicalAttentionUseCase as StartMedicalAttentionUseCase,
            finalizeMedicalAttentionUseCase as FinalizeMedicalAttentionUseCase,
            releaseConsultorioUseCase as ReleaseConsultorioUseCase,
            provisionDoctorFromUserUseCase as ProvisionDoctorFromUserUseCase,
        );
    });

    it('delegates to use case and ACKs message on success', async () => {
        // Arrange: el caso de uso procesa el turno sin errores.
        (createTurnoUseCase.execute as jest.Mock).mockResolvedValue({});
        const data = { cedula: 123, nombre: 'Paciente', priority: 'media' as const };

        // Act: procesar el evento de RabbitMQ.
        await controller.handleCrearTurno(data, context as never);

        // Assert: delega al caso de uso y confirma el mensaje.
        expect(createTurnoUseCase.execute).toHaveBeenCalledWith(data);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('ACK y enruta a DLQ cuando hay BadRequestException', async () => {
        // Arrange: error de validación/negocio no recuperable.
        (createTurnoUseCase.execute as jest.Mock).mockRejectedValue(
            new BadRequestException('invalid payload'),
        );

        // Act: procesar evento con error controlado.
        await controller.handleCrearTurno({ cedula: 0, nombre: '' } as never, context as never);

        // Assert: no requeue; se preserva evidencia en DLQ y se ACKea el mensaje original.
        expect(channel.assertQueue).toHaveBeenCalledWith('crear_turno.dlq', { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('NACK con requeue cuando hay error transitorio', async () => {
        // Arrange: simular falla temporal (ej. base de datos no disponible).
        (createTurnoUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('mongo timeout', 'MONGO_TIMEOUT'),
        );

        // Act: procesar evento con error recuperable.
        await controller.handleCrearTurno({ cedula: 123, nombre: 'Paciente' } as never, context as never);

        // Assert: requeue habilitado para reintento posterior.
        expect(channel.nack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }), false, true);
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it('ACK y enruta a DLQ cuando el error transitorio excede reintentos', async () => {
        // Arrange: redelivery activo => supera el intento permitido por defecto (1).
        const redeliveredContext = {
            getChannelRef: jest.fn(() => channel),
            getMessage: jest.fn(() => ({
                id: 'msg-1',
                fields: { redelivered: true },
                properties: { messageId: 'cmd-msg-1', correlationId: 'corr-1', headers: {} },
            })),
        };
        (createTurnoUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('mongo timeout', 'MONGO_TIMEOUT'),
        );

        // Act
        await controller.handleCrearTurno({ cedula: 123, nombre: 'Paciente' } as never, redeliveredContext as never);

        // Assert
        expect(channel.assertQueue).toHaveBeenCalledWith('crear_turno.dlq', { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('delegates asociar_medico_consultorio and ACKs message on success', async () => {
        (assignDoctorToConsultorioUseCase.execute as jest.Mock).mockResolvedValue({});
        const data = { doctorId: 'D1', consultorioId: 'C1' };

        await controller.handleAsignarMedico(data, context as never);

        expect(assignDoctorToConsultorioUseCase.execute).toHaveBeenCalledWith({
            doctorId: 'D1',
            consultorioId: 'C1',
            commandId: 'cmd-msg-1',
        });
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('NACK con requeue cuando la asociacion llega antes del provisionamiento medico', async () => {
        (assignDoctorToConsultorioUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('El medico aun no ha sido provisionado', 'DOCTOR_NOT_PROVISIONED_YET'),
        );
        const data = { doctorId: 'D1', consultorioId: 'C1' };

        await controller.handleAsignarMedico(data, context as never);

        expect(channel.nack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }), false, true);
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it('delegates usuario_creado and ACKs message on success', async () => {
        (provisionDoctorFromUserUseCase.execute as jest.Mock).mockResolvedValue({
            status: 'created',
            doctorId: 'doctor-1',
        });
        const data = {
            userId: 'doctor-1',
            email: 'medico@example.com',
            nombre: 'Dra. Paula',
            rol: 'medico',
        };

        await controller.handleUsuarioCreado(data, context as never);

        expect(provisionDoctorFromUserUseCase.execute).toHaveBeenCalledWith({
            commandId: 'cmd-msg-1',
            userId: 'doctor-1',
            email: 'medico@example.com',
            nombre: 'Dra. Paula',
            rol: 'medico',
        });
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('delegates cambiar_disponibilidad_medico and ACKs message on success', async () => {
        (setDoctorAvailabilityUseCase.execute as jest.Mock).mockResolvedValue({});
        const data = { doctorId: 'D1', disponible: false };

        await controller.handleCambiarDisponibilidad(data, context as never);

        expect(setDoctorAvailabilityUseCase.execute).toHaveBeenCalledWith({
            doctorId: 'D1',
            disponible: false,
            commandId: 'cmd-msg-1',
        });
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('ACK y enruta a DLQ para errores de dominio medicos', async () => {
        (startMedicalAttentionUseCase.execute as jest.Mock).mockRejectedValue(
            new ConsultorioDomainError('El medico no tiene consultorio asociado'),
        );

        await controller.handleIniciarAtencion(
            { doctorId: 'D1', pacienteNombre: 'Ana', pacienteDocumento: '123' },
            context as never,
        );

        expect(startMedicalAttentionUseCase.execute).toHaveBeenCalledWith({
            doctorId: 'D1',
            pacienteNombre: 'Ana',
            pacienteDocumento: '123',
            commandId: 'cmd-msg-1',
        });
        expect(channel.assertQueue).toHaveBeenCalledWith('iniciar_atencion_medica.dlq', { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('NACK con requeue para iniciar_atencion_medica cuando hay error recuperable', async () => {
        (startMedicalAttentionUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('mongo timeout', 'MONGO_TIMEOUT'),
        );

        await controller.handleIniciarAtencion(
            { doctorId: 'D1', pacienteNombre: 'Ana', pacienteDocumento: '123' },
            context as never,
        );

        expect(channel.nack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }), false, true);
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it('ACK y enruta a DLQ para iniciar_atencion_medica si el error recuperable llega redelivered', async () => {
        const redeliveredContext = {
            getChannelRef: jest.fn(() => channel),
            getMessage: jest.fn(() => ({
                id: 'msg-1',
                fields: { redelivered: true },
                properties: { messageId: 'cmd-msg-1', correlationId: 'corr-1', headers: {} },
            })),
        };
        (startMedicalAttentionUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('mongo timeout', 'MONGO_TIMEOUT'),
        );

        await controller.handleIniciarAtencion(
            { doctorId: 'D1', pacienteNombre: 'Ana', pacienteDocumento: '123' },
            redeliveredContext as never,
        );

        expect(channel.assertQueue).toHaveBeenCalledWith('iniciar_atencion_medica.dlq', { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('delegates finalizar_atencion_medica and ACKs message on success', async () => {
        (finalizeMedicalAttentionUseCase.execute as jest.Mock).mockResolvedValue({});
        const data = { doctorId: 'D1' };

        await controller.handleFinalizarAtencion(data, context as never);

        expect(finalizeMedicalAttentionUseCase.execute).toHaveBeenCalledWith({
            doctorId: 'D1',
            commandId: 'cmd-msg-1',
        });
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('NACK con requeue para cambiar_disponibilidad_medico cuando hay error recuperable', async () => {
        (setDoctorAvailabilityUseCase.execute as jest.Mock).mockRejectedValue(
            new RecoverableInfraError('mongo timeout', 'MONGO_TIMEOUT'),
        );

        await controller.handleCambiarDisponibilidad({ doctorId: 'D1', disponible: false }, context as never);

        expect(channel.nack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }), false, true);
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it('ACK y enruta a DLQ para cambiar_disponibilidad_medico cuando falla con error de dominio', async () => {
        (setDoctorAvailabilityUseCase.execute as jest.Mock).mockRejectedValue(
            new ConsultorioDomainError('El medico no tiene consultorio asociado'),
        );

        await controller.handleCambiarDisponibilidad({ doctorId: 'D1', disponible: false }, context as never);

        expect(channel.assertQueue).toHaveBeenCalledWith('cambiar_disponibilidad_medico.dlq', { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('delegates liberar_consultorio and ACKs message on success', async () => {
        (releaseConsultorioUseCase.execute as jest.Mock).mockResolvedValue({});
        const data = { doctorId: 'D1' };

        await controller.handleLiberarConsultorio(data, context as never);

        expect(releaseConsultorioUseCase.execute).toHaveBeenCalledWith({
            doctorId: 'D1',
            commandId: 'cmd-msg-1',
        });
        expect(channel.ack).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1' }));
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('nackea sin requeue cuando falla el envio a DLQ', async () => {
        const failingDlqChannel = {
            ...channel,
            assertQueue: jest.fn().mockRejectedValue(new Error('dlq down')),
        };
        const failingDlqContext = {
            getChannelRef: jest.fn(() => failingDlqChannel),
            getMessage: jest.fn(() => ({
                id: 'msg-1',
                fields: { redelivered: true },
                properties: { messageId: 'cmd-msg-1', correlationId: 'corr-1', headers: {} },
            })),
        };
        (createTurnoUseCase.execute as jest.Mock).mockRejectedValue(new BadRequestException('invalid payload'));

        await controller.handleCrearTurno({ cedula: 0, nombre: '' } as never, failingDlqContext as never);

        expect(failingDlqChannel.nack).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'msg-1' }),
            false,
            false,
        );
        expect(failingDlqChannel.ack).not.toHaveBeenCalled();
    });

    it('resolveCommandId prioriza commandId del payload', () => {
        const result = (controller as any).resolveCommandId(
            'crear_turno',
            { commandId: 'payload-id' },
            context,
        );

        expect(result).toBe('payload-id');
    });

    it('resolveCommandId usa messageId cuando no hay commandId en payload', () => {
        const result = (controller as any).resolveCommandId('crear_turno', { cedula: 1 }, context);

        expect(result).toBe('cmd-msg-1');
    });

    it('resolveCommandId usa correlationId cuando messageId no existe', () => {
        const correlationOnlyContext = {
            getMessage: jest.fn(() => ({
                fields: { redelivered: false },
                properties: { correlationId: 'corr-only', headers: {} },
            })),
        };

        const result = (controller as any).resolveCommandId('crear_turno', { cedula: 1 }, correlationOnlyContext);

        expect(result).toBe('corr-only');
    });

    it('resolveCommandId genera hash cuando no hay ids en payload ni cabeceras', () => {
        const noIdsContext = {
            getMessage: jest.fn(() => ({ fields: {}, properties: {} })),
        };

        const result = (controller as any).resolveCommandId('crear_turno', { cedula: 123 }, noIdsContext);

        expect(typeof result).toBe('string');
        expect(result).toHaveLength(64);
    });

    it('resolveUserId usa userId y hace fallback a doctorId', () => {
        expect((controller as any).resolveUserId({ userId: 'u-1', doctorId: 'd-1' })).toBe('u-1');
        expect((controller as any).resolveUserId({ doctorId: 'd-1' })).toBe('d-1');
        expect((controller as any).resolveUserId({ doctorId: '   ' })).toBeNull();
    });

    it('getDeliveryAttempts soporta cabecera numerica, string y redelivery', () => {
        expect((controller as any).getDeliveryAttempts({ properties: { headers: { 'x-retry-count': 3 } } })).toBe(3);
        expect((controller as any).getDeliveryAttempts({ properties: { headers: { 'x-retry-count': '2' } } })).toBe(2);
        expect(
            (controller as any).getDeliveryAttempts({
                properties: { headers: { 'x-retry-count': 'invalid' } },
                fields: { redelivered: true },
            }),
        ).toBe(1);
        expect((controller as any).getDeliveryAttempts({ properties: { headers: {} }, fields: { redelivered: false } })).toBe(0);
    });

    it('classifyError distingue transitorio y no recuperable por defecto', () => {
        const transient = (controller as any).classifyError(new Error('ETIMEDOUT on broker'));
        const nonRecoverable = (controller as any).classifyError(new Error('fatal business issue'));

        expect(transient).toEqual({
            recoverable: true,
            code: 'TRANSIENT_INFRASTRUCTURE_FAILURE',
            category: 'recoverable',
        });
        expect(nonRecoverable).toEqual({
            recoverable: false,
            code: 'UNEXPECTED_NON_RECOVERABLE_ERROR',
            category: 'non_recoverable',
        });
    });

    it('resolvePositiveInteger usa fallback en valores vacios o invalidos', () => {
        expect((controller as any).resolvePositiveInteger(undefined, 5)).toBe(5);
        expect((controller as any).resolvePositiveInteger('0', 5)).toBe(5);
        expect((controller as any).resolvePositiveInteger('-1', 5)).toBe(5);
        expect((controller as any).resolvePositiveInteger('10.9', 5)).toBe(10);
    });

    it('resolveMaxRequeueAttempts usa 1 cuando configuracion no es valida', () => {
        const previous = process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS;
        process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS = '-10';

        const invalidResult = (controller as any).resolveMaxRequeueAttempts();

        process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS = '3';
        const validResult = (controller as any).resolveMaxRequeueAttempts();

        if (previous === undefined) {
            delete process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS;
        } else {
            process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS = previous;
        }

        expect(invalidResult).toBe(1);
        expect(validResult).toBe(3);
    });

    it('publishToDlq tolera backpressure cuando sendToQueue retorna false', async () => {
        const backpressureChannel = {
            ack: jest.fn(),
            nack: jest.fn(),
            assertQueue: jest.fn().mockResolvedValue({ queue: 'crear_turno.dlq' }),
            sendToQueue: jest.fn().mockReturnValue(false),
        };

        await expect(
            (controller as any).publishToDlq(
                backpressureChannel,
                'crear_turno',
                { cedula: 1 },
                {
                    fields: { redelivered: false },
                    properties: { messageId: 'm1', correlationId: 'c1', headers: {} },
                },
                new Error('boom'),
                { recoverable: false, code: 'TEST', category: 'non_recoverable' },
                0,
                { commandId: 'cmd-1', userId: null },
            ),
        ).resolves.not.toThrow();

        expect(backpressureChannel.assertQueue).toHaveBeenCalledWith('crear_turno.dlq', { durable: true });
        expect(backpressureChannel.sendToQueue).toHaveBeenCalledTimes(1);
    });
});
