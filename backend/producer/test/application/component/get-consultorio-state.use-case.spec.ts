import { GetConsultorioStateUseCase } from '../../../src/application/use-cases/get-consultorio-state.use-case';
import { IConsultorioStateReader } from '../../../src/domain/ports/IConsultorioStateReader';

describe('GetConsultorioStateUseCase (Application)', () => {
  const consultorioStateReader: jest.Mocked<IConsultorioStateReader> = {
    findByConsultorioId: jest.fn(),
  };

  let useCase: GetConsultorioStateUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetConsultorioStateUseCase(consultorioStateReader);
  });

  it('retorna el estado persistido cuando existe', async () => {
    // Arrange
    consultorioStateReader.findByConsultorioId.mockResolvedValue({
      consultorioId: 'C3',
      estado: 'EnAtencion',
      patientId: '12345',
      timestamp: 1700000000000,
    });

    // Act
    const result = await useCase.execute('C3');

    // Assert
    expect(consultorioStateReader.findByConsultorioId).toHaveBeenCalledWith('C3');
    expect(result).toEqual({
      consultorioId: 'C3',
      estado: 'EnAtencion',
      patientId: '12345',
      timestamp: 1700000000000,
    });
  });

  it('retorna estado por defecto SinMedico cuando no existe snapshot', async () => {
    // Arrange
    consultorioStateReader.findByConsultorioId.mockResolvedValue(null);

    // Act
    const result = await useCase.execute('C9');

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        consultorioId: 'C9',
        estado: 'SinMedico',
        patientId: null,
      }),
    );
    expect(typeof result.timestamp).toBe('number');
  });

  it('propaga error cuando falla el lector de estado', async () => {
    // Arrange
    consultorioStateReader.findByConsultorioId.mockRejectedValue(new Error('mongo unavailable'));

    // Act
    const act = () => useCase.execute('C1');

    // Assert
    await expect(act()).rejects.toThrow('mongo unavailable');
    expect(consultorioStateReader.findByConsultorioId).toHaveBeenCalledWith('C1');
  });
});
