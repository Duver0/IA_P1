import { AssignDoctorToConsultorioUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { DoctorRecord, IDoctorRepository } from '../../src/domain/ports/IDoctorRepository';
import { IProcessedMedicalCommandRepository } from '../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../src/domain/ports/IUnitOfWork';

const buildDoctorRepository = (): jest.Mocked<IDoctorRepository> => ({
  findById: jest.fn<Promise<DoctorRecord | null>, [string, TransactionContext?]>().mockResolvedValue(null),
  findByConsultorioId: jest
    .fn<Promise<DoctorRecord | null>, [string, TransactionContext?]>()
    .mockResolvedValue(null),
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
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
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
  });

  it('retorna resultado idempotente cuando el comando ya fue procesado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();

    const sessionProcesada = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(sessionProcesada);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-dup' });

    // Assert
    expect(result).toBe(sessionProcesada);
    expect(doctorRepository.findById).not.toHaveBeenCalled();
    expect(consultorioSessionRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza la asociacion cuando el medico no existe', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    doctorRepository.findById.mockResolvedValue(null);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D404', consultorioId: 'C1', commandId: 'cmd-2' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctor o consultorio o commandId son vacios', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
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
    doctorRepository.findById.mockResolvedValue({ ...doctorDisponible, disponible: false });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1', commandId: 'cmd-3' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});
