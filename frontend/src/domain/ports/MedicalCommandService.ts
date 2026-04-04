export interface MedicalCommandResult {
  status: "accepted";
  message: string;
}

export interface ConsultorioStateResponse {
  consultorioId: string;
  medicoId?: string | null;
  estado: "SinMedico" | "ConMedicoDisponible" | "EnAtencion" | "ConMedicoNoDisponible";
  patientId: string | null;
  timestamp: number;
}

export interface MedicalCommandService {
  assignConsultorio(consultorioId: string): Promise<MedicalCommandResult>;
  setDisponibilidad(disponible: boolean): Promise<MedicalCommandResult>;
  finalizeAttention(): Promise<MedicalCommandResult>;
  releaseConsultorio(): Promise<MedicalCommandResult>;
  getConsultorioState(consultorioId: string): Promise<ConsultorioStateResponse>;
}