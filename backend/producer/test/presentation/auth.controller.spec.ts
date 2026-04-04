import { AuthController } from '../../src/presentation/auth.controller';
import { LoginUseCase } from '../../src/application/use-cases/login.use-case';
import { SignupUseCase } from '../../src/application/use-cases/signup.use-case';
import { GetAllTurnosUseCase } from '../../src/application/use-cases/get-all-turnos.use-case';

describe('AuthController (Presentation)', () => {
  const signupUseCase: Pick<SignupUseCase, 'execute'> = {
    execute: jest.fn(),
  };

  const loginUseCase: Pick<LoginUseCase, 'execute'> = {
    execute: jest.fn(),
  };

  const getAllTurnosUseCase: Pick<GetAllTurnosUseCase, 'execute'> = {
    execute: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(
      signupUseCase as SignupUseCase,
      loginUseCase as LoginUseCase,
      getAllTurnosUseCase as GetAllTurnosUseCase,
    );
  });

  it('delegates signUp and returns success with usuario', async () => {
    // Arrange
    const signupResult = {
      token: 'new-token',
      usuario: { id: 'user-1', email: 'admin@eps.com', nombre: 'Admin', rol: 'admin' },
    };
    (signupUseCase.execute as jest.Mock).mockResolvedValue(signupResult);
    const request = { email: 'admin@eps.com', password: 'secret', nombre: 'Admin', rol: 'admin' };

    // Act
    const result = await controller.signUp(request);

    // Assert
    expect(signupUseCase.execute).toHaveBeenCalledWith(request);
    expect(result).toEqual({
      success: true,
      message: 'Registro exitoso',
      token: 'new-token',
      usuario: signupResult.usuario,
    });
  });

  it('delegates signIn and returns success with token + usuario', async () => {
    // Arrange
    const loginResult = {
      token: 'signed-token',
      usuario: { id: 'user-1', email: 'admin@eps.com', nombre: 'Admin', rol: 'admin' },
    };
    (loginUseCase.execute as jest.Mock).mockResolvedValue(loginResult);
    const request = { email: 'admin@eps.com', password: 'secret' };

    // Act
    const result = await controller.signIn(request);

    // Assert
    expect(loginUseCase.execute).toHaveBeenCalledWith(request);
    expect(result).toEqual({
      success: true,
      message: 'Login exitoso',
      token: 'signed-token',
      usuario: loginResult.usuario,
    });
  });

  it('returns dashboard history from use case when already authenticated', async () => {
    // Arrange
    const history = [{ id: 't1', nombre: 'Paciente', cedula: 1, consultorio: null, estado: 'espera', priority: 'media', timestamp: 1 }];
    (getAllTurnosUseCase.execute as jest.Mock).mockResolvedValue(history);

    // Act
    const result = await controller.getDashboardHistory();

    // Assert
    expect(getAllTurnosUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(history);
  });

  it('signUp retorna 409 con contrato de error cuando el correo ya existe', async () => {
    // Arrange
    (signupUseCase.execute as jest.Mock).mockRejectedValue(new Error('Email already in use'));

    // Act + Assert
    await expect(
      controller.signUp({ email: 'test@test.com', password: 'pass', nombre: 'Test', rol: 'employee' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { success: false, message: 'Email already in use' },
    });
  });

  it('signUp retorna 409 cuando el error llega en español', async () => {
    // Arrange
    (signupUseCase.execute as jest.Mock).mockRejectedValue(new Error('Correo ya registrado'));

    // Act + Assert
    await expect(
      controller.signUp({ email: 'test@test.com', password: 'pass', nombre: 'Test', rol: 'employee' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { success: false, message: 'Correo ya registrado' },
    });
  });

  it('signUp retorna 500 con mensaje genérico cuando ocurre error no tipado', async () => {
    // Arrange
    (signupUseCase.execute as jest.Mock).mockRejectedValue('string error');

    // Act + Assert
    await expect(
      controller.signUp({ email: 'test@test.com', password: 'pass', nombre: 'Test', rol: 'employee' }),
    ).rejects.toMatchObject({
      status: 500,
      response: { success: false, message: 'Error en registro' },
    });
  });

  it('signIn retorna 401 cuando las credenciales son inválidas', async () => {
    // Arrange
    (loginUseCase.execute as jest.Mock).mockRejectedValue(new Error('Credenciales inválidas'));

    // Act + Assert
    await expect(
      controller.signIn({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: 401,
      response: { success: false, message: 'Credenciales inválidas' },
    });
  });

  it('signIn retorna 401 cuando el usuario no existe', async () => {
    // Arrange
    (loginUseCase.execute as jest.Mock).mockRejectedValue(new Error('Usuario no encontrado'));

    // Act + Assert
    await expect(
      controller.signIn({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: 401,
      response: { success: false, message: 'Usuario no encontrado' },
    });
  });

  it('signIn retorna 500 con mensaje genérico cuando ocurre error no tipado', async () => {
    // Arrange
    (loginUseCase.execute as jest.Mock).mockRejectedValue('string error');

    // Act + Assert
    await expect(
      controller.signIn({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: 500,
      response: { success: false, message: 'Error en login' },
    });
  });

  it('signOut returns success message', async () => {
    // Act
    const result = await controller.signOut();

    // Assert
    expect(result).toEqual({ success: true, message: 'Sesión cerrada' });
  });

  it('me retorna el usuario actual desde el payload del token', async () => {
    // Arrange
    const req = {
      authUser: {
        sub: 'user-1',
        email: 'admin@eps.com',
        nombre: 'Admin',
        rol: 'admin',
      },
    };

    // Act
    const result = await controller.me(req as never);

    // Assert
    expect(result).toEqual({
      id: 'user-1',
      email: 'admin@eps.com',
      nombre: 'Admin',
      rol: 'admin',
    });
  });
});