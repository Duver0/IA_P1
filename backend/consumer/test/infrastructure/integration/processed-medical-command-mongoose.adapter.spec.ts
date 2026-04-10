import { ConsultorioSession } from '../../../src/domain/entities/consultorio-session.entity';
import { ProcessedMedicalCommandMongooseAdapter } from '../../../src/infrastructure/adapters/processed-medical-command-mongoose.adapter';

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

  it('tryStart usa sesion mongo y acepta resultado en arreglo', async () => {
    const sessionRef = { id: 'tx-1' };
    mockModel.create.mockResolvedValue([{ id: 'doc-1' }]);

    const started = await adapter.tryStart(
      'cmd-session',
      'asociar_medico_consultorio',
      { kind: 'mongo', value: sessionRef } as never,
    );

    expect(started).toBe(true);
    expect(mockModel.create).toHaveBeenCalledWith(
      [
        {
          commandId: 'cmd-session',
          operation: 'asociar_medico_consultorio',
          status: 'processing',
          sessionSnapshot: null,
        },
      ],
      { session: sessionRef },
    );
  });

  it('tryStart propaga errores no asociados a llave duplicada', async () => {
    mockModel.create.mockRejectedValue(new Error('mongo unavailable'));

    await expect(adapter.tryStart('cmd-err', 'asociar_medico_consultorio')).rejects.toThrow('mongo unavailable');
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

  it('findCompletedSession aplica sesion y mapea paciente cuando existe snapshot', async () => {
    const sessionRef = { id: 'tx-1' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue({
        commandId: 'cmd-2',
        status: 'completed',
        sessionSnapshot: {
          consultorioId: 'C2',
          medicoId: 'D2',
          estado: 'EnAtencion',
          pacienteEnAtencion: { nombre: 'Ana', documento: '1020' },
          noDisponibleDiferido: false,
        },
      }),
    };
    query.session.mockReturnValue(query);
    mockModel.findOne.mockReturnValue(query);

    const result = await adapter.findCompletedSession('cmd-2', {
      kind: 'mongo',
      value: sessionRef,
    } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.pacienteEnAtencion).toEqual({ nombre: 'Ana', documento: '1020' });
  });
});
