import { SetDoctorAvailabilityUseCase } from '../../../src/application/use-cases/set-doctor-availability.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../../src/domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository, DoctorRecord } from '../../../src/domain/ports/IDoctorRepository';
import { IEventPublisher } from '../../../src/domain/ports/IEventPublisher';
import { IProcessedMedicalCommandRepository } from '../../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../../src/domain/ports/IUnitOfWork';
import { AssignPatientToConsultorioUseCase } from '../../../src/application/use-cases/assign-patient-to-consultorio.use-case';

const buildDoctorRepository = (): jest.Mocked<IDoctorRepository> => ({
  findById: jest.fn<Promise<DoctorRecord | null>, [string, TransactionContext?]>().mockResolvedValue(null),
  findByConsultorioId: jest
    .fn<Promise<DoctorRecord | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
  provisionDoctorFromUser: jest
    .fn<Promise<{ doctor: DoctorRecord; created: boolean }>, [
      { userId: string; nombre: string; email: string },
      TransactionContext?,
    ]>()
    .mockResolvedValue({
      doctor: {
        id: 'doctor-provisioned',
        nombre: 'Dr. Provisionado',
        email: 'provisionado@eps.com',
        consultorioId: null,
        disponible: true,
      },
      created: true,
    }),
  assignConsultorio: jest
    .fn<Promise<void>, [string, string, TransactionContext?]>()
    .mockResolvedValue(undefined),
  releaseConsultorio: jest.fn<Promise<void>, [string, TransactionContext?]>().mockResolvedValue(undefined),
  setDisponibilidad: jest
    .fn<Promise<void>, [string, boolean, TransactionContext?]>()
    .mockResolvedValue(undefined),
});

const buildConsultorioSessionRepository = (): jest.Mocked<IConsultorioSessionRepository> => ({
  findByConsultorioId: jest
    .fn<Promise<ConsultorioSession | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
  findByMedicoId: jest
    .fn<Promise<ConsultorioSession | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
  save: jest
    .fn<Promise<ConsultorioSession>, [ConsultorioSession, TransactionContext?]>()
    .mockImplementation(async session => session),
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

describe('SetDoctorAvailabilityUseCase (Application)', () => {
  it('marca no disponible cuando el medico tiene consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: false, commandId: 'cmd-1' });

    // Assert
    expect(result.estado).toBe('ConMedicoNoDisponible');
    expect(doctorRepository.setDisponibilidad).toHaveBeenCalledWith('D1', false, expect.any(Object));
    expect(processedCommandRepository.complete).toHaveBeenCalledWith(
      'cmd-1',
      expect.any(ConsultorioSession),
      expect.any(Object),
    );
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'ConMedicoNoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('retorna resultado idempotente cuando commandId ya fue completado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const sessionCompletada = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();

    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(sessionCompletada);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: false, commandId: 'dup-cmd' });

    // Assert
    expect(result).toBe(sessionCompletada);
    expect(consultorioSessionRepository.findByMedicoId).not.toHaveBeenCalled();
    expect(doctorRepository.setDisponibilidad).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('difiere no disponibilidad cuando hay atencion activa', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: false, commandId: 'cmd-2' });

    // Assert
    expect(result.estado).toBe('EnAtencion');
    expect(result.noDisponibleDiferido).toBe(true);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'EnAtencion',
        patientId: '10203040',
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('dispara intento de asignación cuando el medico queda disponible', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'DoctorBecameAvailable',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: true, commandId: 'cmd-4' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'ConMedicoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
  });

  it('rechaza cuando doctorId o commandId son vacios', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: '   ', disponible: true, commandId: '  ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando el medico no tiene consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const eventPublisher = buildEventPublisher();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      eventPublisher,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', disponible: false, commandId: 'cmd-3' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});
