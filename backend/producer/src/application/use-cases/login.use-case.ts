import { IUserRepository } from '../../domain/ports/IUserRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';

// Datos necesarios para intentar el inicio de sesión.
export interface LoginCredentials {
  email: string;
  password: string;
  requiredRole?: string;
}

// Servicio que expone la generación de tokens firmados.
export interface ITokenService {
  generateToken(payload: Record<string, unknown>): string;
}

// Datos del usuario en la respuesta (español, para el ACL del front).
export interface UsuarioResponse {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

// Resultado del login: token + datos de usuario para el frontend.
export interface LoginResult {
  token: string;
  usuario: UsuarioResponse;
}

// Dependencias necesarias para ejecutar el flujo de login.
export interface LoginDependencies {
  userRepository: IUserRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
}

// Maneja la autenticación de usuarios validando credenciales y emitiendo tokens.
export class LoginUseCase {
  constructor(private readonly deps: LoginDependencies) {}

  // Ejecuta el flujo de login, retorna token + usuario completo.
  async execute(credentials: LoginCredentials): Promise<LoginResult> {
    const normalizedEmail = this.normalizeEmail(credentials.email);
    const user = await this.deps.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new Error('User not found');
    }

    const matches = await this.deps.passwordHasher.compare(credentials.password, user.passwordHash);

    if (!matches) {
      throw new Error('Invalid credentials');
    }

    if (credentials.requiredRole && user.rol !== credentials.requiredRole) {
      throw new Error('Invalid role for login');
    }

    const tokenPayload = { sub: user.id, email: user.email, nombre: user.nombre, rol: user.rol };
    const token = this.deps.tokenService.generateToken(tokenPayload);

    return {
      token,
      usuario: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}