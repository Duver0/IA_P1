import { TransactionContext } from './IUnitOfWork';

export interface DoctorRecord {
  id: string;
  nombre: string;
  email: string;
  consultorioId: string | null;
  disponible: boolean;
}

export interface IDoctorRepository {
  findById(doctorId: string, tx?: TransactionContext): Promise<DoctorRecord | null>;
  findByConsultorioId(consultorioId: string, tx?: TransactionContext): Promise<DoctorRecord | null>;
  assignConsultorio(doctorId: string, consultorioId: string, tx?: TransactionContext): Promise<void>;
  releaseConsultorio(doctorId: string, tx?: TransactionContext): Promise<void>;
  setDisponibilidad(doctorId: string, disponible: boolean, tx?: TransactionContext): Promise<void>;
}