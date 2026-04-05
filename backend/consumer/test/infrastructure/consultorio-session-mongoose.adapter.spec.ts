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

  it('aplica sesion mongo al buscar por medico cuando hay transaccion', async () => {
    const sessionRef = { id: 'tx-medico' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ medicoId: 'D2' })),
    };
    query.session.mockReturnValue(query);
    mockModel.findOne.mockReturnValue(query);

    const result = await adapter.findByMedicoId('D2', { kind: 'mongo', value: sessionRef } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.medicoId).toBe('D2');
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

  it('retorna siguiente consultorio disponible ordenado por updatedAt y consultorioId', async () => {
    const sortMock = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ consultorioId: 'C1' })),
    });
    mockModel.findOne.mockReturnValue({ sort: sortMock });

    const result = await adapter.findNextAvailable();

    expect(sortMock).toHaveBeenCalledWith({ updatedAt: 1, consultorioId: 1 });
    expect(result?.consultorioId).toBe('C1');
  });

  it('retorna null cuando no hay consultorios disponibles', async () => {
    const sortMock = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockModel.findOne.mockReturnValue({ sort: sortMock });

    const result = await adapter.findNextAvailable();

    expect(result).toBeNull();
  });

  it('aplica sesion transaccional al buscar siguiente disponible', async () => {
    const sessionRef = { id: 'tx-next' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ consultorioId: 'C4' })),
    };
    query.session.mockReturnValue(query);
    const sortMock = jest.fn().mockReturnValue(query);
    mockModel.findOne.mockReturnValue({ sort: sortMock });

    const result = await adapter.findNextAvailable({ kind: 'mongo', value: sessionRef } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.consultorioId).toBe('C4');
  });

  it('aplica sesion mongo en consultas cuando tx.kind es mongo', async () => {
    const sessionRef = { id: 'session-1' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ consultorioId: 'C9' })),
    };
    query.session.mockReturnValue(query);
    mockModel.findOne.mockReturnValue(query);

    const result = await adapter.findByConsultorioId('C9', {
      kind: 'mongo',
      value: sessionRef,
    } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.consultorioId).toBe('C9');
  });

  it('no aplica sesion cuando tx.kind no es mongo', async () => {
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ consultorioId: 'C3' })),
    };
    query.session.mockReturnValue(query);
    mockModel.findOne.mockReturnValue(query);

    const result = await adapter.findByConsultorioId('C3', {
      kind: 'memory',
      value: {},
    } as never);

    expect(query.session).not.toHaveBeenCalled();
    expect(result?.consultorioId).toBe('C3');
  });

  it('reserva consultorio solo si sigue disponible', async () => {
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(
        buildSessionDoc({
          estado: 'ConMedicoDisponible',
        }),
      ),
    });

    const result = await adapter.reserveIfAvailable('C1');

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { consultorioId: 'C1', estado: 'ConMedicoDisponible' },
      {
        $set: {
          estado: 'ConMedicoDisponible',
        },
      },
      { returnDocument: 'after' },
    );
    expect(result?.estado).toBe('ConMedicoDisponible');
  });

  it('retorna null si reserveIfAvailable no actualiza por conflicto', async () => {
    mockModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const result = await adapter.reserveIfAvailable('C1');

    expect(result).toBeNull();
  });

  it('incluye session en reserveIfAvailable cuando hay tx mongo', async () => {
    const sessionRef = { id: 'tx-attention' };
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ estado: 'ConMedicoDisponible' })),
    });

    await adapter.reserveIfAvailable('C1', { kind: 'mongo', value: sessionRef } as never);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { consultorioId: 'C1', estado: 'ConMedicoDisponible' },
      {
        $set: {
          estado: 'ConMedicoDisponible',
        },
      },
      {
        returnDocument: 'after',
        session: sessionRef,
      },
    );
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

  it('incluye session en save cuando hay tx mongo', async () => {
    const sessionRef = { id: 'tx-save' };
    const session = ConsultorioSession.crearSinMedico('C7').asignarMedico('D7');
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildSessionDoc({ consultorioId: 'C7', medicoId: 'D7' })),
    });

    await adapter.save(session, { kind: 'mongo', value: sessionRef } as never);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { consultorioId: 'C7' },
      {
        consultorioId: 'C7',
        medicoId: 'D7',
        estado: 'ConMedicoDisponible',
        pacienteEnAtencion: null,
        noDisponibleDiferido: false,
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
        session: sessionRef,
      },
    );
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