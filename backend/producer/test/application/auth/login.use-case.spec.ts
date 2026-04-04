import {
  LoginCredentials,
  LoginUseCase,
  LoginDependencies,
  LoginResult,
  ITokenService,
} from '../../../src/application/use-cases/login.use-case';
import { IUserRecord, IUserRepository } from '../../../src/domain/ports/IUserRepository';
import { IPasswordHasher } from '../../../src/application/ports/IPasswordHasher';

// Valida el contrato esperado para el caso de uso de login antes de implementarlo.
describe('LoginUseCase (red tests)', () => {
  const credentials: LoginCredentials = { email: 'luis@example.com', password: 'secret' };
  const storedUser: IUserRecord = {
    id: 'user-1',
    email: credentials.email,
    passwordHash: '$argon2id$secret',
    nombre: 'Luis',
    rol: 'empleado',
    isActive: true,
  };

  let repository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;
  let dependencies: LoginDependencies;

  beforeEach(() => {
    repository = { findByEmail: jest.fn(), create: jest.fn() } as jest.Mocked<IUserRepository>;
    passwordHasher = { hash: jest.fn(), compare: jest.fn() } as jest.Mocked<IPasswordHasher>;
    tokenService = { generateToken: jest.fn() } as jest.Mocked<ITokenService>;
    dependencies = { userRepository: repository, passwordHasher, tokenService };
  });

  it('should fail when the user is missing', async () => {
    repository.findByEmail.mockResolvedValue(null);
    const useCase = new LoginUseCase(dependencies);

    await expect(useCase.execute(credentials)).rejects.toThrow('User not found');
    expect(repository.findByEmail).toHaveBeenCalledWith(credentials.email.toLowerCase());
  });

  it('should normalize email before querying repository', async () => {
    repository.findByEmail.mockResolvedValue(null);
    const useCase = new LoginUseCase(dependencies);

    await expect(
      useCase.execute({
        email: '  LUIS@EXAMPLE.COM  ',
        password: credentials.password,
      }),
    ).rejects.toThrow('User not found');

    expect(repository.findByEmail).toHaveBeenCalledWith('luis@example.com');
  });

  it('should fail when the password does not match', async () => {
    repository.findByEmail.mockResolvedValue(storedUser);
    passwordHasher.compare.mockResolvedValue(false);
    const useCase = new LoginUseCase(dependencies);

    await expect(useCase.execute(credentials)).rejects.toThrow('Invalid credentials');
    expect(passwordHasher.compare).toHaveBeenCalledWith(credentials.password, storedUser.passwordHash);
  });

  it('should return a LoginResult with token and usuario when credentials are valid', async () => {
    repository.findByEmail.mockResolvedValue(storedUser);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.generateToken.mockReturnValue('valid-token');
    const useCase = new LoginUseCase(dependencies);

    const result: LoginResult = await useCase.execute(credentials);

    expect(result).toEqual({
      token: 'valid-token',
      usuario: { id: storedUser.id, email: storedUser.email, nombre: storedUser.nombre, rol: storedUser.rol },
    });
    expect(tokenService.generateToken).toHaveBeenCalledWith({
      sub: storedUser.id,
      email: storedUser.email,
      nombre: storedUser.nombre,
      rol: storedUser.rol,
    });
  });
});