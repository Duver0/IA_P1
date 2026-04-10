import { FinalizeMedicalAttentionUseCase } from '../../../src/application/use-cases/finalize-medical-attention.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../../src/domain/ports/IConsultorioSessionRepository';
import { IEventPublisher } from '../../../src/domain/ports/IEventPublisher';
import { IPatientAssignmentTurnoRepository } from '../../../src/domain/ports/IPatientAssignmentTurnoRepository';
import { AssignPatientToConsultorioUseCase } from '../../../src/application/use-cases/assign-patient-to-consultorio.use-case';
import { Turno } from '../../../src/domain/entities/turno.entity';
import { IProcessedMedicalCommandRepository } from '../../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../../src/domain/ports/IUnitOfWork';
import { RecoverableInfraError } from '../../../src/application/errors/message-processing.error';

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

const buildEventPublisher = (): jest.Mocked<IEventPublisher> => ({
  publish: jest.fn(),
});

const buildPatientAssignmentTurnoRepository = (): jest.Mocked<IPatientAssignmentTurnoRepository> => ({
  assignNextWaitingPatientToConsultorio: jest.fn(),
  markCalledTurnoAsAttended: jest.fn(),
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

const buildCalledTurno = (): Turno =>
  new Turno({
    id: 'turno-1',
    nombre: 'Ana',
    cedula: 10203040,
    consultorio: 'C1',
    estado: 'atendido',
    priority: 'media',
    timestamp: 1,
    finAtencionAt: null,
  });

describe('FinalizeMedicalAttentionUseCase (Application)', () => {
  it('finaliza atencion y vuelve a ConMedicoDisponible si no hay diferido', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'AttentionFinished',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);
    patientAssignmentTurnoRepository.markCalledTurnoAsAttended.mockResolvedValue(buildCalledTurno());

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const result = await useCase.execute({ doctorId: 'D1', commandId: 'cmd-1' });

    expect(result.estado).toBe('ConMedicoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
    expect(patientAssignmentTurnoRepository.markCalledTurnoAsAttended).toHaveBeenCalledWith(
      'C1',
      '10203040',
      expect.any(Object),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      'turno_actualizado',
      expect.objectContaining({
        id: 'turno-1',
        estado: 'atendido',
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'attention_finished',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      3,
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('AttentionFinished');
  });

  it('finaliza atencion y pasa a ConMedicoNoDisponible cuando hay diferido', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' })
      .marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const result = await useCase.execute({ doctorId: 'D1', commandId: 'cmd-2' });

    expect(result.estado).toBe('ConMedicoNoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      'attention_finished',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoNoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoNoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('retorna resultado idempotente cuando commandId ya fue completado', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const completedSession = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(completedSession);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const result = await useCase.execute({ doctorId: 'D1', commandId: 'cmd-dup' });

    expect(result).toBe(completedSession);
    expect(eventPublisher.publish).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('solicita reintento cuando commandId esta en progreso y no hay resultado previo', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(null);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const act = () => useCase.execute({ doctorId: 'D1', commandId: 'cmd-busy' });

    await expect(act()).rejects.toMatchObject({
      code: 'COMMAND_IN_PROGRESS',
      recoverable: true,
    } as Partial<RecoverableInfraError>);
  });

  it('rechaza finalizacion cuando no hay consultorio asociado', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const act = () => useCase.execute({ doctorId: 'D1', commandId: 'cmd-3' });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza finalizacion cuando no hay atencion activa', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const act = () => useCase.execute({ doctorId: 'D1', commandId: 'cmd-4' });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId o commandId son vacios', async () => {
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const act = () => useCase.execute({ doctorId: '   ', commandId: '   ' });

    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});