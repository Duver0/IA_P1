import { SetDoctorAvailabilityUseCase } from '../../src/application/use-cases/set-doctor-availability.use-case';
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

describe('SetDoctorAvailabilityUseCase (Application)', () => {
  it('marca no disponible cuando el medico tiene consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: false });

    // Assert
    expect(result.estado).toBe('ConMedicoNoDisponible');
    expect(doctorRepository.setDisponibilidad).toHaveBeenCalledWith('D1', false);
  });

  it('marca disponible cuando el consultorio esta no disponible', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: true });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(doctorRepository.setDisponibilidad).toHaveBeenCalledWith('D1', true);
  });

  it('difiere no disponibilidad cuando hay atencion activa', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1', disponible: false });

    // Assert
    expect(result.estado).toBe('EnAtencion');
    expect(result.noDisponibleDiferido).toBe(true);
  });

  it('rechaza cuando el medico no tiene consultorio asociado', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1', disponible: false });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId es vacio', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const consultorioSessionRepository = buildConsultorioSessionRepository();

    const useCase = new SetDoctorAvailabilityUseCase(
      doctorRepository,
      consultorioSessionRepository,
    );

    // Act
    const act = () => useCase.execute({ doctorId: '   ', disponible: true });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});