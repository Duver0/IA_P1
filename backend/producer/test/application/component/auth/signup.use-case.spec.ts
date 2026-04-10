import { IUserRecord, IUserRepository } from '../../../../src/domain/ports/IUserRepository';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { SignupCredentials, SignupDependencies, SignupUseCase, SignupResult } from '../../../../src/application/use-cases/signup.use-case';
import { ITokenService } from '../../../../src/application/use-cases/login.use-case';
import { IOutboxRepository } from '../../../../src/domain/ports/IOutboxRepository';
import { IUnitOfWork, TransactionContext } from '../../../../src/domain/ports/IUnitOfWork';
import { USER_CREATED_EVENT } from '../../../../src/domain/events/user-created.event';

// Asegura que el contrato de signup lanza los errores esperados antes de implementarlo.
describe('SignupUseCase (red tests)', () => {
  const credentials: SignupCredentials = { email: 'luis@example.com', password: 'secret', nombre: 'Luis', rol: 'empleado' };
  const hashedSecret = '$argon2id$hashed-secret';
  const createdUser: IUserRecord = {
    id: 'user-2',
    email: credentials.email,
    passwordHash: hashedSecret,
    nombre: 'Luis',
    rol: 'empleado',
    isActive: true,
  };

  let repository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;
  let outboxRepository: jest.Mocked<IOutboxRepository>;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let dependencies: SignupDependencies;
  const tx: TransactionContext = { kind: 'mongo', value: { sessionId: 'tx-1' } };

  beforeEach(() => {
    repository = { findByEmail: jest.fn(), create: jest.fn() } as jest.Mocked<IUserRepository>;
    passwordHasher = { hash: jest.fn(), compare: jest.fn() } as jest.Mocked<IPasswordHasher>;
    tokenService = { generateToken: jest.fn() } as jest.Mocked<ITokenService>;
    outboxRepository = {
      insert: jest.fn(),
      findPublishable: jest.fn(),
      claimForPublishing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
    } as jest.Mocked<IOutboxRepository>;
    unitOfWork = {
      execute: jest.fn(),
    } as jest.Mocked<IUnitOfWork>;
    unitOfWork.execute.mockImplementation(async work => work(tx));
    dependencies = { userRepository: repository, passwordHasher, tokenService, outboxRepository, unitOfWork };
  });

  it('should error when the email is already registered', async () => {
    repository.findByEmail.mockResolvedValue(createdUser);
    const useCase = new SignupUseCase(dependencies);

    await expect(useCase.execute(credentials)).rejects.toThrow('Email already in use');
    expect(repository.findByEmail).toHaveBeenCalledWith(credentials.email.toLowerCase());
    expect(unitOfWork.execute).not.toHaveBeenCalled();
    expect(outboxRepository.insert).not.toHaveBeenCalled();
  });

  it('should normalize email before validating uniqueness', async () => {
    repository.findByEmail.mockResolvedValue(createdUser);
    const useCase = new SignupUseCase(dependencies);

    await expect(
      useCase.execute({
        ...credentials,
        email: '  LUIS@EXAMPLE.COM  ',
      }),
    ).rejects.toThrow('Email already in use');

    expect(repository.findByEmail).toHaveBeenCalledWith('luis@example.com');
  });

  it('should return token + usuario on valid signup', async () => {
    repository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue(hashedSecret);
    repository.create.mockResolvedValue(createdUser);
    tokenService.generateToken.mockReturnValue('new-token');
    const useCase = new SignupUseCase(dependencies);

    const result: SignupResult = await useCase.execute(credentials);

    expect(result).toEqual({
      token: 'new-token',
      usuario: { id: createdUser.id, email: createdUser.email, nombre: createdUser.nombre, rol: createdUser.rol },
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith(credentials.password);
    expect(unitOfWork.execute).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(
      {
        email: credentials.email.toLowerCase(),
        passwordHash: hashedSecret,
        nombre: 'Luis',
        rol: 'empleado',
      },
      tx,
    );
    expect(tokenService.generateToken).toHaveBeenCalledWith({
      sub: createdUser.id,
      email: createdUser.email,
      nombre: createdUser.nombre,
      rol: createdUser.rol,
    });
    expect(outboxRepository.insert).not.toHaveBeenCalled();
  });

  it('should register user created event in outbox when rol is medico', async () => {
    // Arrange
    const medicoCredentials: SignupCredentials = {
      email: 'medico@example.com',
      password: 'secret',
      nombre: 'Dra. Paula',
      rol: 'medico',
    };
    const medicoUser: IUserRecord = {
      id: 'doctor-1',
      email: medicoCredentials.email,
      passwordHash: hashedSecret,
      nombre: medicoCredentials.nombre,
      rol: 'medico',
      isActive: true,
    };
    repository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue(hashedSecret);
    repository.create.mockResolvedValue(medicoUser);
    tokenService.generateToken.mockReturnValue('medico-token');

    const useCase = new SignupUseCase(dependencies);

    // Act
    await useCase.execute(medicoCredentials);

    // Assert
    expect(outboxRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: USER_CREATED_EVENT,
        aggregateType: 'usuario',
        aggregateId: 'doctor-1',
      }),
      tx,
    );

    const inserted = (outboxRepository.insert as jest.Mock).mock.calls[0]?.[0] as {
      eventId?: unknown;
      payload?: {
        commandId?: unknown;
        occurredAt?: unknown;
        userId?: unknown;
      };
    };
    expect(typeof inserted?.eventId).toBe('string');
    expect(inserted?.payload?.userId).toBe('doctor-1');
    expect(inserted?.payload?.commandId).toBe(inserted?.eventId);
    expect(typeof inserted?.payload?.occurredAt).toBe('string');
  });

  it('should fail signup when outbox insert fails inside transaction', async () => {
    // Arrange
    const medicoCredentials: SignupCredentials = {
      email: 'medico-fail@example.com',
      password: 'secret',
      nombre: 'Dr. Error',
      rol: 'medico',
    };
    const medicoUser: IUserRecord = {
      id: 'doctor-2',
      email: medicoCredentials.email,
      passwordHash: hashedSecret,
      nombre: medicoCredentials.nombre,
      rol: 'medico',
      isActive: true,
    };
    repository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue(hashedSecret);
    repository.create.mockResolvedValue(medicoUser);
    tokenService.generateToken.mockReturnValue('medico-token');
    outboxRepository.insert.mockRejectedValue(new Error('outbox down'));

    const useCase = new SignupUseCase(dependencies);

    // Act
    const act = () => useCase.execute(medicoCredentials);

    // Assert
    await expect(act()).rejects.toThrow('outbox down');
    expect(tokenService.generateToken).not.toHaveBeenCalled();
  });
});