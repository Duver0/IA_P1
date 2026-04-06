import { IUserRecord, IUserRepository } from '../../domain/ports/IUserRepository';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';


export class InMemoryUserRepository implements IUserRepository {
  private readonly usersByEmail = new Map<string, IUserRecord>();
  private sequence = 1;

  async findByEmail(email: string): Promise<IUserRecord | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async create(
    params: { email: string; passwordHash: string; nombre: string; rol: string },
    _tx?: TransactionContext,
  ): Promise<IUserRecord> {
    const user: IUserRecord = {
      id: String(this.sequence++),
      email: params.email,
      passwordHash: params.passwordHash,
      nombre: params.nombre,
      rol: params.rol,
      isActive: true,
    };

    this.usersByEmail.set(params.email, user);
    return user;
  }
}