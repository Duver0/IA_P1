import { TransactionContext } from './IUnitOfWork';

export interface DoctorRecord {
  id: string;
  nombre: string;
  email: string;
  consultorioId: string | null;
  disponible: boolean;
}

export interface DoctorProvisioningData {
  userId: string;
  nombre: string;
  email: string;
}

export interface DoctorProvisioningResult {
  doctor: DoctorRecord;
  created: boolean;
}

export interface IDoctorRepository {
  findById(doctorId: string, tx?: TransactionContext): Promise<DoctorRecord | null>;
  findByConsultorioId(consultorioId: string, tx?: TransactionContext): Promise<DoctorRecord | null>;
  provisionDoctorFromUser(data: DoctorProvisioningData, tx?: TransactionContext): Promise<DoctorProvisioningResult>;
  assignConsultorio(doctorId: string, consultorioId: string, tx?: TransactionContext): Promise<void>;
  releaseConsultorio(doctorId: string, tx?: TransactionContext): Promise<void>;
  setDisponibilidad(doctorId: string, disponible: boolean, tx?: TransactionContext): Promise<void>;
}