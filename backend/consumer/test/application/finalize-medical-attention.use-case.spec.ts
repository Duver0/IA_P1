import { FinalizeMedicalAttentionUseCase } from '../../src/application/use-cases/finalize-medical-attention.use-case';
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

describe('FinalizeMedicalAttentionUseCase (Application)', () => {
  it('finaliza atencion y vuelve a ConMedicoDisponible si no hay diferido', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
  });

  it('finaliza atencion y pasa a ConMedicoNoDisponible cuando hay diferido', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' })
      .marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('ConMedicoNoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
  });

  it('rechaza finalizacion cuando no hay consultorio asociado', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new FinalizeMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza finalizacion cuando no hay atencion activa', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId es vacio', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const useCase = new FinalizeMedicalAttentionUseCase(consultorioSessionRepository);

    // Act
    const act = () => useCase.execute({ doctorId: '   ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});