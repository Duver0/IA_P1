import { ConsultorioSession } from '../../src/domain/entities/consultorio-session.entity';
import { ProcessedMedicalCommandMongooseAdapter } from '../../src/infrastructure/adapters/processed-medical-command-mongoose.adapter';

describe('ProcessedMedicalCommandMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    create: jest.fn(),
    updateOne: jest.fn(),
    findOne: jest.fn(),
  };

  let adapter: ProcessedMedicalCommandMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ProcessedMedicalCommandMongooseAdapter(mockModel as never);
  });

  it('tryStart retorna true cuando reserva commandId nuevo', async () => {
    // Arrange
    mockModel.create.mockResolvedValue({ id: 'doc-1' });

    // Act
    const started = await adapter.tryStart('cmd-1', 'asociar_medico_consultorio');

    // Assert
    expect(started).toBe(true);
    expect(mockModel.create).toHaveBeenCalledWith({
      commandId: 'cmd-1',
      operation: 'asociar_medico_consultorio',
      status: 'processing',
      sessionSnapshot: null,
    });
  });

  it('tryStart retorna false cuando commandId ya existe', async () => {
    // Arrange
    mockModel.create.mockRejectedValue({ code: 11000 });

    // Act
    const started = await adapter.tryStart('cmd-dup', 'asociar_medico_consultorio');

    // Assert
    expect(started).toBe(false);
  });

  it('complete persiste snapshot de la sesion', async () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    mockModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });

    // Act
    await adapter.complete('cmd-1', session);

    // Assert
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { commandId: 'cmd-1', status: 'processing' },
      {
        status: 'completed',
        sessionSnapshot: {
          consultorioId: 'C1',
          medicoId: 'D1',
          estado: 'ConMedicoDisponible',
          pacienteEnAtencion: null,
          noDisponibleDiferido: false,
        },
      },
    );
  });

  it('findCompletedSession reconstruye la entidad cuando hay snapshot', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        commandId: 'cmd-1',
        status: 'completed',
        sessionSnapshot: {
          consultorioId: 'C1',
          medicoId: null,
          estado: 'SinMedico',
          pacienteEnAtencion: null,
          noDisponibleDiferido: false,
        },
      }),
    });

    // Act
    const result = await adapter.findCompletedSession('cmd-1');

    // Assert
    expect(result).toBeInstanceOf(ConsultorioSession);
    expect(result?.consultorioId).toBe('C1');
    expect(result?.estado).toBe('SinMedico');
  });

  it('findCompletedSession retorna null cuando no existe comando completado', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    // Act
    const result = await adapter.findCompletedSession('missing');

    // Assert
    expect(result).toBeNull();
  });
});
