import { DoctorMongooseAdapter } from '../../src/infrastructure/adapters/doctor-mongoose.adapter';

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
});