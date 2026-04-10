import { StartMedicalAttentionUseCase } from '../../../src/application/use-cases/start-medical-attention.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../../src/domain/entities/consultorio-session.entity';
import { RecoverableInfraError } from '../../../src/application/errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../../src/domain/ports/IConsultorioSessionRepository';
import { IProcessedMedicalCommandRepository } from '../../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../../src/domain/ports/IUnitOfWork';
import { IEventPublisher } from '../../../src/domain/ports/IEventPublisher';

const buildConsultorioSessionRepository = (): jest.Mocked<IConsultorioSessionRepository> => ({
  findByConsultorioId: jest
    .fn<Promise<ConsultorioSession | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
  findByMedicoId: jest
    .fn<Promise<ConsultorioSession | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
  save: jest
    .fn<Promise<ConsultorioSession>, [ConsultorioSession, TransactionContext?]>()
    .mockImplementation(async (session) => session),
});

const buildProcessedCommandRepository = (): jest.Mocked<IProcessedMedicalCommandRepository> => ({
  tryStart: jest
    .fn<Promise<boolean>, [string, string, TransactionContext?]>()
    .mockResolvedValue(true),
  complete: jest
    .fn<Promise<void>, [string, ConsultorioSession, TransactionContext?]>()
    .mockResolvedValue(undefined),
  findCompletedSession: jest
    .fn<Promise<ConsultorioSession | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
});

const buildUnitOfWork = (): IUnitOfWork & { execute: jest.Mock } => {
  const execute = jest.fn(async (work: (tx: TransactionContext) => Promise<unknown>) =>
    work({ kind: 'mongo', value: { session: 'mock' } }),
  );

  return {
    execute: execute as unknown as IUnitOfWork['execute'] & jest.Mock,
  };
};

const buildEventPublisher = (): jest.Mocked<IEventPublisher> => ({
  publish: jest.fn(),
});

describe('StartMedicalAttentionUseCase (Application)', () => {
  it('inicia atencion con commandId, persiste en transaccion y emite consultorio_updated', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const result = await useCase.execute({
      doctorId: 'D1',
      pacienteNombre: 'Ana',
      pacienteDocumento: '10203040',
      commandId: 'cmd-1',
    });

    expect(result.estado).toBe('EnAtencion');
    expect(result.pacienteEnAtencion).toEqual({ nombre: 'Ana', documento: '10203040' });
    expect(processedCommandRepository.complete).toHaveBeenCalledWith(
      'cmd-1',
      expect.any(ConsultorioSession),
      expect.any(Object),
    );
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'EnAtencion',
        patientId: '10203040',
      }),
    );
  });

  it('retorna resultado idempotente cuando commandId ya fue completado', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const completedSession = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(completedSession);

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const result = await useCase.execute({
      doctorId: 'D1',
      pacienteNombre: 'Ana',
      pacienteDocumento: '10203040',
      commandId: 'cmd-dup',
    });

    expect(result).toBe(completedSession);
    expect(consultorioSessionRepository.findByMedicoId).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('solicita reintento cuando commandId esta en progreso y no hay resultado previo', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(null);

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const act = () =>
      useCase.execute({
        doctorId: 'D1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
        commandId: 'cmd-busy',
      });

    await expect(act()).rejects.toMatchObject({
      code: 'COMMAND_IN_PROGRESS',
      recoverable: true,
    } as Partial<RecoverableInfraError>);
  });

  it('rechaza inicio cuando el medico no tiene consultorio asociado', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const act = () =>
      useCase.execute({
        doctorId: 'D1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
        commandId: 'cmd-2',
      });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza inicio cuando el consultorio no esta disponible', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const act = () =>
      useCase.execute({
        doctorId: 'D1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
        commandId: 'cmd-3',
      });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId o commandId son vacios', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();

    const useCase = new StartMedicalAttentionUseCase(
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
    );

    const act = () =>
      useCase.execute({
        doctorId: '   ',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
        commandId: '   ',
      });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});