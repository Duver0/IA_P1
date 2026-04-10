import { DoctorMongooseAdapter } from '../../../src/infrastructure/adapters/doctor-mongoose.adapter';

const buildDoctorDoc = (overrides = {}) => ({
  _id: 'doctor-1',
  nombre: 'Dra. Paula',
  email: 'paula@eps.com',
  consultorioId: null,
  disponible: true,
  ...overrides,
});

describe('DoctorMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  let adapter: DoctorMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new DoctorMongooseAdapter(mockModel as any);
  });

  it('retorna doctor por id cuando existe', async () => {
    // Arrange
    const doc = buildDoctorDoc();
    mockModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.findById('doctor-1');

    // Assert
    expect(result).toEqual({
      id: 'doctor-1',
      nombre: 'Dra. Paula',
      email: 'paula@eps.com',
      consultorioId: null,
      disponible: true,
    });
  });

  it('retorna null cuando no encuentra doctor por id', async () => {
    // Arrange
    mockModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const result = await adapter.findById('missing');

    // Assert
    expect(result).toBeNull();
  });

  it('retorna doctor asociado al consultorio cuando existe', async () => {
    // Arrange
    const doc = buildDoctorDoc({ consultorioId: 'C1' });
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.findByConsultorioId('C1');

    // Assert
    expect(result?.consultorioId).toBe('C1');
  });

  it('aplica sesion mongo al buscar por consultorio', async () => {
    const sessionRef = { id: 'tx-c1' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildDoctorDoc({ consultorioId: 'C1' })),
    };
    query.session.mockReturnValue(query);
    mockModel.findOne.mockReturnValue(query);

    const result = await adapter.findByConsultorioId('C1', { kind: 'mongo', value: sessionRef } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.consultorioId).toBe('C1');
  });

  it('retorna null cuando no hay doctor asociado al consultorio', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const result = await adapter.findByConsultorioId('C404');

    // Assert
    expect(result).toBeNull();
  });

  it('aplica sesion mongo en findById cuando la transaccion es valida', async () => {
    const sessionRef = { id: 'tx-1' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildDoctorDoc()),
    };
    query.session.mockReturnValue(query);
    mockModel.findById.mockReturnValue(query);

    const result = await adapter.findById('doctor-1', { kind: 'mongo', value: sessionRef } as never);

    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result?.id).toBe('doctor-1');
  });

  it('asigna consultorio cuando update atomico modifica 1 registro', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    // Act
    await adapter.assignConsultorio('doctor-1', 'C1');

    // Assert
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1', consultorioId: null, disponible: true },
      { consultorioId: 'C1' },
    );
  });

  it('lanza error cuando falla asignacion atomica de consultorio', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    });

    // Act
    const act = () => adapter.assignConsultorio('doctor-1', 'C1');

    // Assert
    await expect(act()).rejects.toThrow('No fue posible asignar consultorio de forma atomica');
  });

  it('asigna consultorio usando sesion transaccional cuando hay tx mongo', async () => {
    const sessionRef = { id: 'tx-assign' };
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    await adapter.assignConsultorio('doctor-1', 'C1', { kind: 'mongo', value: sessionRef } as never);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1', consultorioId: null, disponible: true },
      { consultorioId: 'C1' },
      { session: sessionRef },
    );
  });

  it('libera consultorio cuando el medico existe', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    });

    // Act
    await adapter.releaseConsultorio('doctor-1');

    // Assert
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1' },
      { consultorioId: null },
    );
  });

  it('lanza error al liberar consultorio si el medico no existe', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
    });

    // Act
    const act = () => adapter.releaseConsultorio('missing');

    // Assert
    await expect(act()).rejects.toThrow('Medico no encontrado para liberar consultorio');
  });

  it('libera consultorio con sesion cuando hay transaccion mongo', async () => {
    const sessionRef = { id: 'tx-release' };
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    });

    await adapter.releaseConsultorio('doctor-1', { kind: 'mongo', value: sessionRef } as never);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1' },
      { consultorioId: null },
      { session: sessionRef },
    );
  });

  it('actualiza disponibilidad cuando el medico existe', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    });

    // Act
    await adapter.setDisponibilidad('doctor-1', false);

    // Assert
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1' },
      { disponible: false },
    );
  });

  it('provisiona doctor de forma idempotente para un userId nuevo', async () => {
    // Arrange
    const doc = buildDoctorDoc({ _id: 'doctor-99', email: 'nuevo@eps.com', nombre: 'Dr. Nuevo' });
    mockModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
    });
    mockModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.provisionDoctorFromUser({
      userId: 'doctor-99',
      email: 'nuevo@eps.com',
      nombre: 'Dr. Nuevo',
    });

    // Assert
    expect(result).toEqual({
      doctor: {
        id: 'doctor-99',
        nombre: 'Dr. Nuevo',
        email: 'nuevo@eps.com',
        consultorioId: null,
        disponible: true,
      },
      created: true,
    });
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-99' },
      {
        $setOnInsert: {
          _id: 'doctor-99',
          nombre: 'Dr. Nuevo',
          email: 'nuevo@eps.com',
          consultorioId: null,
          disponible: true,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  });

  it('retorna created=false cuando el doctor ya existia por redelivery', async () => {
    // Arrange
    const doc = buildDoctorDoc({ _id: 'doctor-1' });
    mockModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
    });
    mockModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.provisionDoctorFromUser({
      userId: 'doctor-1',
      email: 'paula@eps.com',
      nombre: 'Dra. Paula',
    });

    // Assert
    expect(result.created).toBe(false);
    expect(result.doctor.id).toBe('doctor-1');
  });

  it('provisiona con sesion transaccional cuando tx.kind es mongo', async () => {
    const sessionRef = { id: 'tx-1' };
    const query = {
      session: jest.fn(),
      exec: jest.fn().mockResolvedValue(buildDoctorDoc({ _id: 'doctor-1' })),
    };
    query.session.mockReturnValue(query);
    mockModel.updateOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ upsertedCount: 0 }) });
    mockModel.findById.mockReturnValueOnce(query);

    const result = await adapter.provisionDoctorFromUser(
      { userId: 'doctor-1', email: 'paula@eps.com', nombre: 'Dra. Paula' },
      { kind: 'mongo', value: sessionRef } as never,
    );

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1' },
      {
        $setOnInsert: {
          _id: 'doctor-1',
          nombre: 'Dra. Paula',
          email: 'paula@eps.com',
          consultorioId: null,
          disponible: true,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        session: sessionRef,
      },
    );
    expect(query.session).toHaveBeenCalledWith(sessionRef);
    expect(result.created).toBe(false);
  });

  it('lanza error no recuperable cuando no encuentra doctor tras provisionar', async () => {
    mockModel.updateOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ upsertedCount: 1 }) });
    mockModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

    const act = () =>
      adapter.provisionDoctorFromUser({
        userId: 'doctor-x',
        email: 'x@eps.com',
        nombre: 'Doctor X',
      });

    await expect(act()).rejects.toThrow('No fue posible recuperar el doctor provisionado');
  });

  it('propaga errores no duplicados durante provisionamiento', async () => {
    mockModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockRejectedValue(new Error('mongo down')),
    });

    const act = () =>
      adapter.provisionDoctorFromUser({
        userId: 'doctor-x',
        email: 'x@eps.com',
        nombre: 'Doctor X',
      });

    await expect(act()).rejects.toThrow('mongo down');
  });

  it('lanza error de dominio cuando existe conflicto de email en provision', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });

    // Act
    const act = () =>
      adapter.provisionDoctorFromUser({
        userId: 'doctor-2',
        email: 'paula@eps.com',
        nombre: 'Dr. Conflicto',
      });

    // Assert
    await expect(act()).rejects.toThrow('Ya existe un doctor con ese email');
  });

  it('lanza error al actualizar disponibilidad si el medico no existe', async () => {
    // Arrange
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
    });

    // Act
    const act = () => adapter.setDisponibilidad('missing', true);

    // Assert
    await expect(act()).rejects.toThrow('Medico no encontrado para actualizar disponibilidad');
  });

  it('actualiza disponibilidad con sesion cuando hay tx mongo', async () => {
    const sessionRef = { id: 'tx-availability' };
    mockModel.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    });

    await adapter.setDisponibilidad('doctor-1', true, { kind: 'mongo', value: sessionRef } as never);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: 'doctor-1' },
      { disponible: true },
      { session: sessionRef },
    );
  });
});