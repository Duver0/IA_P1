import type { Ticket, TicketStatus } from "@/domain/Ticket";
import type { CreateTicketDTO } from "@/domain/CreateTicket";

interface BackendTicket {
  id: string;
  nombre: string;
  cedula: number;
  consultorio: string | null;
  medicoNombre?: string | null;
  finAtencionAt?: number | null;
  timestamp: number;
  estado: string;
}

const STATUS_MAP: Record<string, TicketStatus> = {
  espera: "waiting",
  llamado: "called",
  atendido: "served",
};

export function toDomainTicket(raw: BackendTicket): Ticket {
  const doctorName =
    typeof raw.medicoNombre === "string" && raw.medicoNombre.trim().length > 0
      ? raw.medicoNombre.trim()
      : null;
  const consultationEndedAt =
    typeof raw.finAtencionAt === "number" ? raw.finAtencionAt : null;

  return {
    id: raw.id,
    name: raw.nombre,
    documentId: raw.cedula,
    office: raw.consultorio,
    ...(doctorName ? { doctorName } : {}),
    ...(consultationEndedAt !== null ? { consultationEndedAt } : {}),
    timestamp: raw.timestamp,
    status: STATUS_MAP[raw.estado] ?? "waiting",
  };
}

export function toBackendCreateDTO(dto: CreateTicketDTO) {
  return {
    nombre: dto.name,
    cedula: dto.documentId,
  };
}
