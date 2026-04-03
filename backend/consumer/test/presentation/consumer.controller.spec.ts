import { BadRequestException } from '@nestjs/common';
import { ConsumerController } from '../../src/presentation/consumer.controller';
import { CreateTurnoUseCase } from '../../src/application/use-cases/create-turno.use-case';
import { AssignDoctorToConsultorioUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio.use-case';
import { SetDoctorAvailabilityUseCase } from '../../src/application/use-cases/set-doctor-availability.use-case';
import { StartMedicalAttentionUseCase } from '../../src/application/use-cases/start-medical-attention.use-case';
import { FinalizeMedicalAttentionUseCase } from '../../src/application/use-cases/finalize-medical-attention.use-case';
import { ReleaseConsultorioUseCase } from '../../src/application/use-cases/release-consultorio.use-case';
import { ProvisionDoctorFromUserUseCase } from '../../src/application/use-cases/provision-doctor-from-user.use-case';
import { ConsultorioDomainError } from '../../src/domain/entities/consultorio-session.entity';
import { RecoverableInfraError } from '../../src/domain/errors/message-processing.error';

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
        });
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
        });
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
});
