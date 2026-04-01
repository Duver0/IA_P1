import { AssignDoctorToConsultorioUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { DoctorRecord, IDoctorRepository } from '../../src/domain/ports/IDoctorRepository';

const buildDoctorRepository = (): jest.Mocked<IDoctorRepository> => ({
  findById: jest.fn<Promise<DoctorRecord | null>, [string]>().mockResolvedValue(null),
  findByConsultorioId: jest
    .fn<Promise<DoctorRecord | null>, [string]>()
    .mockResolvedValue(null),
  assignConsultorio: jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined),
  releaseConsultorio: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  setDisponibilidad: jest
    .fn<Promise<void>, [string, boolean]>()
    .mockResolvedValue(undefined),
});

const buildConsultorioSessionRepository = (): jest.Mocked<IConsultorioSessionRepository> => ({
  findByConsultorioId: jest
    .fn<Promise<ConsultorioSession | null>, [string]>()
    .mockResolvedValue(null),
  findByMedicoId: jest
    .fn<Promise<ConsultorioSession | null>, [string]>()
    .mockResolvedValue(null),
  save: jest
    .fn<Promise<ConsultorioSession>, [ConsultorioSession]>()
    .mockImplementation(async session => session),
});

describe('AssignDoctorToConsultorioUseCase (Application)', () => {
  const doctorDisponible: DoctorRecord = {
    id: 'D1',
    nombre: 'Dra. Paula',
    email: 'paula@eps.com',
    consultorioId: null,
    disponible: true,
  };

  it('asocia un médico disponible a consultorio libre', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(result.medicoId).toBe('D1');
    expect(doctorRepository.assignConsultorio).toHaveBeenCalledWith('D1', 'C1');
    expect(consultorioSessionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza la asociación cuando el médico no existe', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    doctorRepository.findById.mockResolvedValue(null);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D404', consultorioId: 'C1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza la asociación cuando el médico no está disponible', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    doctorRepository.findById.mockResolvedValue({ ...doctorDisponible, disponible: false });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza la asociación cuando el médico ya tiene consultorio', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    doctorRepository.findById.mockResolvedValue({ ...doctorDisponible, consultorioId: 'C9' });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza la asociación cuando el consultorio ya está ocupado por otro médico', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    doctorRepository.findById.mockResolvedValue(doctorDisponible);
    doctorRepository.findByConsultorioId.mockResolvedValue({
      ...doctorDisponible,
      id: 'D2',
    });

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', consultorioId: 'C1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('usa la sesión persistida cuando el consultorio ya existe en repositorio', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    doctorRepository.findById.mockResolvedValue(doctorDisponible);

    const sessionPersistida = ConsultorioSession.crearSinMedico('C1');
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    consultorioSessionRepository.findByConsultorioId.mockResolvedValue(sessionPersistida);

    const useCase = new AssignDoctorToConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', consultorioId: 'C1' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(consultorioSessionRepository.findByConsultorioId).toHaveBeenCalledWith('C1');
    expect(consultorioSessionRepository.save).toHaveBeenCalledTimes(1);
  });
});