export interface DoctorRecord {
  id: string;
  nombre: string;
  email: string;
  consultorioId: string | null;
  disponible: boolean;
}

export interface IDoctorRepository {
  findById(doctorId: string): Promise<DoctorRecord | null>;
  findByConsultorioId(consultorioId: string): Promise<DoctorRecord | null>;
  assignConsultorio(doctorId: string, consultorioId: string): Promise<void>;
  releaseConsultorio(doctorId: string): Promise<void>;
  setDisponibilidad(doctorId: string, disponible: boolean): Promise<void>;
}