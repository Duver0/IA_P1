import type { ConsultorioRealtimeEvent } from "@/domain/ConsultorioRealtimeEvent";

interface RawConsultorioRealtimeEvent {
  consultorioId: string;
  medicoId?: string | null;
  estado: string;
  patientId?: string | null;
  timestamp: number;
}

const VALID_STATES = new Set([
  "SinMedico",
  "ConMedicoDisponible",
  "EnAtencion",
  "ConMedicoNoDisponible",
]);

export function toConsultorioRealtimeEvent(
  raw: RawConsultorioRealtimeEvent,
): ConsultorioRealtimeEvent {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid consultorio realtime payload");
  }

  if (!raw.consultorioId || typeof raw.consultorioId !== "string") {
    throw new Error("consultorioId is required");
  }

  if (!VALID_STATES.has(raw.estado)) {
    throw new Error("Invalid consultorio state");
  }

  if (
    raw.medicoId !== undefined &&
    raw.medicoId !== null &&
    typeof raw.medicoId !== "string"
  ) {
    throw new Error("Invalid medicoId");
  }

  return {
    consultorioId: raw.consultorioId,
    ...(raw.medicoId !== undefined ? { medicoId: raw.medicoId } : {}),
    estado: raw.estado as ConsultorioRealtimeEvent["estado"],
    patientId: raw.patientId ?? null,
    timestamp: raw.timestamp,
  };
}