import { UserMongooseAdapter } from '../../src/infrastructure/adapters/user-mongoose.adapter';

const buildUserDoc = (overrides = {}) => ({
  _id: 'user-1',
  email: 'medico@eps.com',
  passwordHash: 'hashed-password',
  nombre: 'Dra. Paula',
  rol: 'medico',
  isActive: true,
  ...overrides,
});

describe('UserMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  let adapter: UserMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new UserMongooseAdapter(mockModel as any);
  });

  it('retorna usuario por email cuando existe', async () => {
    // Arrange
    const doc = buildUserDoc();
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    // Act
    const result = await adapter.findByEmail('medico@eps.com');

    // Assert
    expect(result).toEqual({
      id: 'user-1',
      email: 'medico@eps.com',
      passwordHash: 'hashed-password',
      nombre: 'Dra. Paula',
      rol: 'medico',
      isActive: true,
    });
    expect(mockModel.findOne).toHaveBeenCalledWith({ email: 'medico@eps.com' });
  });

  it('retorna null cuando no existe usuario por email', async () => {
    // Arrange
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Act
    const result = await adapter.findByEmail('missing@eps.com');

    // Assert
    expect(result).toBeNull();
  });

  it('crea y retorna el usuario persistido', async () => {
    // Arrange
    const doc = buildUserDoc({ email: 'new@eps.com', rol: 'empleado' });
    mockModel.create.mockResolvedValue(doc);

    // Act
    const result = await adapter.create({
      email: 'new@eps.com',
      passwordHash: 'hash-1',
      nombre: 'Usuario Nuevo',
      rol: 'empleado',
    });

    // Assert
    expect(mockModel.create).toHaveBeenCalledWith({
      email: 'new@eps.com',
      passwordHash: 'hash-1',
      nombre: 'Usuario Nuevo',
      rol: 'empleado',
      isActive: true,
    });
    expect(result.email).toBe('new@eps.com');
    expect(result.rol).toBe('empleado');
  });

  it('traduce duplicado de email a error de negocio esperado', async () => {
    // Arrange
    mockModel.create.mockRejectedValue({
      code: 11000,
      keyPattern: { email: 1 },
    });

    // Act
    const act = () =>
      adapter.create({
        email: 'dup@eps.com',
        passwordHash: 'hash-2',
        nombre: 'Duplicado',
        rol: 'empleado',
      });

    // Assert
    await expect(act()).rejects.toThrow('Email already in use');
  });
});