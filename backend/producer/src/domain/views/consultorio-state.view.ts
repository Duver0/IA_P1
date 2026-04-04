export type ConsultorioEstado =
  | 'SinMedico'
  | 'ConMedicoDisponible'
  | 'EnAtencion'
  | 'ConMedicoNoDisponible';

export interface ConsultorioStateView {
  consultorioId: string;
  medicoId?: string | null;
  estado: ConsultorioEstado;
  patientId: string | null;
  timestamp: number;
}