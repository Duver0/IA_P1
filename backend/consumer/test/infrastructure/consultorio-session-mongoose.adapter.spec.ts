import { ConsultorioSessionMongooseAdapter } from '../../src/infrastructure/adapters/consultorio-session-mongoose.adapter';
import { ConsultorioSession } from '../../src/domain/entities/consultorio-session.entity';

const buildSessionDoc = (overrides = {}) => ({
  consultorioId: 'C1',
  medicoId: 'D1',
  estado: 'ConMedicoDisponible',
  pacienteEnAtencion: null,
  noDisponibleDiferido: false,
  ...overrides,
});

describe('ConsultorioSessionMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  let adapter: ConsultorioSessionMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ConsultorioSessionMongooseAdapter(mockModel as any);
  });

  it('retorna sesion por consultorio cuando existe', async () => {
    // Arrange
    const doc = buildSessionDoc();
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.findByConsultorioId('C1');

    // Assert
    expect(result).toBeInstanceOf(ConsultorioSession);
    expect(result?.consultorioId).toBe('C1');
    expect(result?.estado).toBe('ConMedicoDisponible');
  });

  it('retorna null cuando no existe sesion por consultorio', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const result = await adapter.findByConsultorioId('C99');

    // Assert
    expect(result).toBeNull();
  });

  it('retorna sesion por medico cuando existe', async () => {
    // Arrange
    const doc = buildSessionDoc({ estado: 'EnAtencion' });
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.findByMedicoId('D1');

    // Assert
    expect(result?.medicoId).toBe('D1');
    expect(result?.estado).toBe('EnAtencion');
  });

  it('retorna null cuando no existe sesion por medico', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const result = await adapter.findByMedicoId('D404');

    // Assert
    expect(result).toBeNull();
  });

  it('persiste sesion con upsert y retorna entidad de dominio', async () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    const persistedDoc = buildSessionDoc({
      consultorioId: 'C1',
      medicoId: 'D1',
      estado: 'ConMedicoDisponible',
    });

    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(persistedDoc),
    });

    // Act
    const result = await adapter.save(session);

    // Assert
    expect(result).toBeInstanceOf(ConsultorioSession);
    expect(result.consultorioId).toBe('C1');
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { consultorioId: 'C1' },
      {
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoDisponible',
        pacienteEnAtencion: null,
        noDisponibleDiferido: false,
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  });

  it('mapea paciente en atencion cuando el documento lo incluye', async () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    const persistedDoc = buildSessionDoc({
      estado: 'EnAtencion',
      pacienteEnAtencion: { nombre: 'Ana', documento: '10203040' },
    });

    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(persistedDoc),
    });

    // Act
    const result = await adapter.save(session);

    // Assert
    expect(result.estado).toBe('EnAtencion');
    expect(result.pacienteEnAtencion).toEqual({ nombre: 'Ana', documento: '10203040' });
  });

  it('lanza error cuando no puede persistir sesion', async () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const act = () => adapter.save(session);

    // Assert
    await expect(act()).rejects.toThrow('No fue posible persistir la sesion de consultorio');
  });
});