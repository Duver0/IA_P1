import { StartMedicalAttentionUseCase } from '../../src/application/use-cases/start-medical-attention.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';

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

describe('StartMedicalAttentionUseCase (Application)', () => {
  it('inicia atencion cuando el consultorio esta disponible', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new StartMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const result = await useCase.execute({
      doctorId: 'D1',
      pacienteNombre: 'Ana',
      pacienteDocumento: '10203040',
    });

    // Assert
    expect(result.estado).toBe('EnAtencion');
    expect(result.pacienteEnAtencion).toEqual({ nombre: 'Ana', documento: '10203040' });
  });

  it('rechaza inicio cuando el medico no tiene consultorio asociado', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new StartMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () =>
      useCase.execute({
        doctorId: 'D1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
      });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza inicio cuando el consultorio no esta disponible', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1').marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new StartMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () =>
      useCase.execute({
        doctorId: 'D1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
      });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId es vacio', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const useCase = new StartMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () =>
      useCase.execute({
        doctorId: '   ',
        pacienteNombre: 'Ana',
        pacienteDocumento: '10203040',
      });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});