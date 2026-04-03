import { ReleaseConsultorioUseCase } from '../../src/application/use-cases/release-consultorio.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository, DoctorRecord } from '../../src/domain/ports/IDoctorRepository';
import { IProcessedMedicalCommandRepository } from '../../src/domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork, TransactionContext } from '../../src/domain/ports/IUnitOfWork';

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

describe('ReleaseConsultorioUseCase (Application)', () => {
  it('abandona consultorio y libera relacion del medico dentro de transaccion', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', commandId: 'cmd-1' });

    // Assert
    expect(result.estado).toBe('SinMedico');
    expect(doctorRepository.releaseConsultorio).toHaveBeenCalledWith('D1', expect.any(Object));
    expect(processedCommandRepository.complete).toHaveBeenCalledWith(
      'cmd-1',
      expect.any(ConsultorioSession),
      expect.any(Object),
    );
  });

  it('retorna resultado idempotente cuando commandId ya fue completado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const resultPrevia = ConsultorioSession.crearSinMedico('C1');

    processedCommandRepository.tryStart.mockResolvedValue(false);
    processedCommandRepository.findCompletedSession.mockResolvedValue(resultPrevia);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', commandId: 'dup-cmd' });

    // Assert
    expect(result).toBe(resultPrevia);
    expect(consultorioSessionRepository.findByMedicoId).not.toHaveBeenCalled();
    expect(doctorRepository.releaseConsultorio).not.toHaveBeenCalled();
  });

  it('rechaza abandono cuando no hay consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', commandId: 'cmd-2' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza abandono cuando hay atencion activa', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', commandId: 'cmd-3' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId o commandId son vacios', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const processedCommandRepository = buildProcessedCommandRepository();
    const unitOfWork = buildUnitOfWork();
    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
      processedCommandRepository,
      unitOfWork,
    );

    // Act
    const act = () => useCase.execute({ doctorId: '   ', commandId: '   ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});
