import { TransactionContext } from './IUnitOfWork';

// Representa un usuario persistido con los campos que el frontend espera.
// El front recibe { id, email, nombre, rol } vía authMapper (ACL español→inglés).
export interface IUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  rol: string;
  isActive: boolean;
}

// Puerto para desacoplar lógica de persistencia de usuarios.
export interface IUserRepository {
  findByEmail(email: string): Promise<IUserRecord | null>;
  create(
    params: { email: string; passwordHash: string; nombre: string; rol: string },
    tx?: TransactionContext,
  ): Promise<IUserRecord>;
}