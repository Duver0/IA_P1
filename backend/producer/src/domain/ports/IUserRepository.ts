import { TransactionContext } from './IUnitOfWork';



export interface IUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  rol: string;
  isActive: boolean;
}


export interface IUserRepository {
  findByEmail(email: string): Promise<IUserRecord | null>;
  create(
    params: { email: string; passwordHash: string; nombre: string; rol: string },
    tx?: TransactionContext,
  ): Promise<IUserRecord>;
}