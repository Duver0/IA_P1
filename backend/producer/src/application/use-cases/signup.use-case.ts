import { IUserRepository } from '../../domain/ports/IUserRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { randomUUID } from 'crypto';
import { ITokenService, UsuarioResponse } from './login.use-case';
import { UserCreatedEventPayload, USER_CREATED_EVENT } from '../../domain/events/user-created.event';
import { IOutboxRepository } from '../../domain/ports/IOutboxRepository';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';


export interface SignupCredentials {
  email: string;
  password: string;
  nombre: string;
  rol: string;
}


export interface SignupResult {
  token: string;
  usuario: UsuarioResponse;
}


export interface SignupDependencies {
  userRepository: IUserRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
  outboxRepository: IOutboxRepository;
  unitOfWork: IUnitOfWork;
}


export class SignupUseCase {
  constructor(private readonly deps: SignupDependencies) {}


  async execute(credentials: SignupCredentials): Promise<SignupResult> {
    const normalizedEmail = this.normalizeEmail(credentials.email);
    const existing = await this.deps.userRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw new Error('Email already in use');
    }

    const passwordHash = await this.deps.passwordHasher.hash(credentials.password);
    const user = await this.deps.unitOfWork.execute(async tx => {
      const createdUser = await this.deps.userRepository.create(
        {
          email: normalizedEmail,
          passwordHash,
          nombre: credentials.nombre,
          rol: credentials.rol,
        },
        tx,
      );


      if (createdUser.rol === 'medico') {
        const eventId = randomUUID();
        const occurredAt = new Date().toISOString();
        const eventPayload: UserCreatedEventPayload = {
          commandId: eventId,
          eventVersion: 1,
          userId: createdUser.id,
          email: createdUser.email,
          nombre: createdUser.nombre,
          rol: 'medico',
          occurredAt,
          source: 'producer.auth.signup',
        };

        await this.deps.outboxRepository.insert(
          {
            eventId,
            type: USER_CREATED_EVENT,
            aggregateType: 'usuario',
            aggregateId: createdUser.id,
            payload: eventPayload,
            createdAt: new Date(occurredAt),
          },
          tx,
        );
      }

      return createdUser;
    });

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