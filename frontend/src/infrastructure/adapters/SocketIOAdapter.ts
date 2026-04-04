import { io, Socket } from "socket.io-client";
import type { RealTimeProvider, RealTimeCallbacks } from "@/domain/ports/RealTimeProvider";
import { toDomainTicket } from "@/infrastructure/mappers/ticketMapper";
import { toConsultorioRealtimeEvent } from "@/infrastructure/mappers/consultorioRealtimeMapper";

type EventWrapper<T> = { type?: string; data?: T };

function unwrapPayload<T>(payload: EventWrapper<T> | T): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as EventWrapper<T>) &&
    (payload as EventWrapper<T>).data !== undefined
  ) {
    return (payload as EventWrapper<T>).data as T;
  }

  return payload as T;
}

export class SocketIOAdapter implements RealTimeProvider {
  private socket: Socket | null = null;

  constructor(private readonly wsUrl: string) {}

  connect(callbacks: RealTimeCallbacks): void {
    this.socket = io(`${this.wsUrl}/ws/turnos`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on("connect", () => callbacks.onConnect());

    this.socket.on("disconnect", () => callbacks.onDisconnect());

    this.socket.on("connect_error", () => {
      callbacks.onError("Error de conexión con el servidor");
    });

    this.socket.on(
      "TURNOS_SNAPSHOT",
      (payload: { type: string; data: unknown[] }) => {
        callbacks.onSnapshot(payload.data.map((raw) => toDomainTicket(raw as Parameters<typeof toDomainTicket>[0])));
      }
    );

    this.socket.on(
      "TURNO_ACTUALIZADO",
      (payload: { type: string; data: unknown }) => {
        callbacks.onTicketUpdate(toDomainTicket(payload.data as Parameters<typeof toDomainTicket>[0]));
      }
    );

    this.socket.on("consultorio_updated", (payload: unknown) => {
      const eventData = unwrapPayload(payload as EventWrapper<unknown> | unknown);
      callbacks.onConsultorioUpdated?.(
        toConsultorioRealtimeEvent(eventData as Parameters<typeof toConsultorioRealtimeEvent>[0]),
      );
    });

    this.socket.on("patient_assigned", (payload: unknown) => {
      const eventData = unwrapPayload(payload as EventWrapper<unknown> | unknown);
      callbacks.onPatientAssigned?.(
        toConsultorioRealtimeEvent(eventData as Parameters<typeof toConsultorioRealtimeEvent>[0]),
      );
    });

    this.socket.on("attention_finished", (payload: unknown) => {
      const eventData = unwrapPayload(payload as EventWrapper<unknown> | unknown);
      callbacks.onAttentionFinished?.(
        toConsultorioRealtimeEvent(eventData as Parameters<typeof toConsultorioRealtimeEvent>[0]),
      );
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
