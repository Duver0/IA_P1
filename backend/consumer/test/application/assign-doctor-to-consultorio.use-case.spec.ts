import { AssignDoctorToConsultorioUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { RecoverableInfraError } from '../../src/application/errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { DoctorRecord, IDoctorRepository } from '../../src/domain/ports/IDoctorRepository';
import { IProcessedMedicalCommandRepository } from '../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../src/domain/ports/IUnitOfWork';
import { AssignPatientToConsultorioUseCase } from '../../src/application/use-cases/assign-patient-to-consultorio.use-case';

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

describe('AssignDoctorToConsultorioUseCase (Application)', () => {
  const doctorDisponible: DoctorRecord = {
    id: 'D1',
    nombre: 'Dra. Paula',
    email: 'paula@eps.com',
    consultorioId: null,
    disponible: true,
  };

  it('asocia un medico disponible a consultorio libre con transaccion e idempotencia', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'DoctorBecameAvailable',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-1' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(result.medicoId).toBe('D1');
    expect(unitOfWork.execute).toHaveBeenCalledTimes(1);
    expect(processedCommandRepository.tryStart).toHaveBeenCalledWith(
      'cmd-1',
      'asociar_medico_consultorio',
      expect.any(Object),
    );
    expect(doctorRepository.assignConsultorio).toHaveBeenCalledWith('D1', 'C1', expect.any(Object));
    expect(processedCommandRepository.complete).toHaveBeenCalledWith(
      'cmd-1',
      expect.any(ConsultorioSession),
      expect.any(Object),
    );
    expect(consultorioSessionRepository.save).toHaveBeenCalledTimes(1);
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
  });

  it('retorna resultado idempotente cuando el comando ya fue procesado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'DoctorBecameAvailable',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };

    const sessionProcesada = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(sessionProcesada);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-dup' });

    // Assert
    expect(result).toBe(sessionProcesada);
    expect(doctorRepository.findById).not.toHaveBeenCalled();
    expect(consultorioSessionRepository.save).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
  });

  it('solicita reintento cuando el commandId ya está en progreso y no hay resultado previo', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(null);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-busy' });

    // Assert
    await expect(act()).rejects.toMatchObject({
      code: 'COMMAND_IN_PROGRESS',
      recoverable: true,
    } as Partial<RecoverableInfraError>);
    expect(doctorRepository.findById).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('solicita reintento cuando el medico aun no ha sido provisionado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    doctorRepository.findById.mockResolvedValue(null);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D404', consultorioId: 'C1', commandId: 'cmd-2' });

    // Assert
    await expect(act()).rejects.toMatchObject({
      code: 'DOCTOR_NOT_PROVISIONED_YET',
      recoverable: true,
    } as Partial<RecoverableInfraError>);
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza cuando doctor o consultorio o commandId son vacios', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: ' ', consultorioId: 'C1', commandId: ' ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza la asociacion cuando el medico no esta disponible', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    doctorRepository.findById.mockResolvedValue({
      ...doctorDisponible,
      disponible: false,
      consultorioId: 'C9',
    });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-3' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
    expect(doctorRepository.setDisponibilidad).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza la asociacion cuando el medico ya tiene otro consultorio', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    doctorRepository.findById.mockResolvedValue({
      ...doctorDisponible,
      disponible: true,
      consultorioId: 'C9',
    });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-occupied-by-doctor' });

    // Assert
    await expect(act()).rejects.toThrow('El médico ya tiene consultorio asociado');
    expect(doctorRepository.findByConsultorioId).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza la vinculacion cuando el consultorio ya está ocupado por otro médico', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    doctorRepository.findById.mockResolvedValue(doctorDisponible);
    doctorRepository.findByConsultorioId.mockResolvedValue({
      ...doctorDisponible,
      id: 'D2',
      consultorioId: 'C1',
    });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-consultorio-busy' });

    // Assert
    await expect(act()).rejects.toThrow('El consultorio ya está ocupado');
    expect(consultorioSessionRepository.save).not.toHaveBeenCalled();
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('recupera disponibilidad legada cuando el medico no tiene consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'DoctorBecameAvailable',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    doctorRepository.findById.mockResolvedValue({ ...doctorDisponible, disponible: false, consultorioId: null });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-4' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(doctorRepository.setDisponibilidad).toHaveBeenCalledWith('D1', true, expect.any(Object));
    expect(doctorRepository.assignConsultorio).toHaveBeenCalledWith('D1', 'C1', expect.any(Object));
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
  });

  it('no falla la asociacion cuando el intento de asignacion posterior falla', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockRejectedValue(new Error('assignment pipeline unavailable')),
    };
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-5' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
    expect(processedCommandRepository.complete).toHaveBeenCalledWith(
      'cmd-5',
      expect.any(ConsultorioSession),
      expect.any(Object),
    );
  });

  it('reutiliza sesion existente del consultorio en lugar de crear una nueva', async () => {
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'DoctorBecameAvailable',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    doctorRepository.findById.mockResolvedValue(doctorDisponible);
    consultorioSessionRepository.findByConsultorioId.mockResolvedValue(
      ConsultorioSession.crearSinMedico('C1'),
    );

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-existing' });

    expect(result.consultorioId).toBe('C1');
    expect(consultorioSessionRepository.findByConsultorioId).toHaveBeenCalledWith('C1', expect.any(Object));
    expect(consultorioSessionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('tolera error no tipado en asignacion posterior y conserva resultado de asociacion', async () => {
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockRejectedValue('unknown failure'),
    };
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-string-error' });

    expect(result.estado).toBe('ConMedicoDisponible');
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('DoctorBecameAvailable');
  });
});
