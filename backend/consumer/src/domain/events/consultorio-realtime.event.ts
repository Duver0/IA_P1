import { ConsultorioEstado, ConsultorioSession } from '../entities/consultorio-session.entity';

export interface ConsultorioRealtimeEventPayload {
  consultorioId: string;
  medicoId: string | null;
  estado: ConsultorioEstado;
  patientId: string | null;
  timestamp: number;
}

export function buildConsultorioRealtimePayload(
  session: ConsultorioSession,
): ConsultorioRealtimeEventPayload {
  return {
    consultorioId: session.consultorioId,
    medicoId: session.medicoId,
    estado: session.estado,
    patientId: session.pacienteEnAtencion?.documento ?? null,
    timestamp: Date.now(),
  };
}