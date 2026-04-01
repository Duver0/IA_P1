import { ReleaseConsultorioUseCase } from '../../src/application/use-cases/release-consultorio.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository, DoctorRecord } from '../../src/domain/ports/IDoctorRepository';

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

describe('ReleaseConsultorioUseCase (Application)', () => {
  it('abandona consultorio y libera relacion del medico', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('SinMedico');
    expect(doctorRepository.releaseConsultorio).toHaveBeenCalledWith('D1');
  });

  it('abandona consultorio desde estado no disponible', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('SinMedico');
  });

  it('rechaza abandono cuando no hay consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza abandono cuando hay atencion activa', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId es vacio', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const useCase = new ReleaseConsultorioUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: '   ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});