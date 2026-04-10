import type { Ticket } from "@/domain/Ticket";
import type { ConsultorioRealtimeEvent } from "@/domain/ConsultorioRealtimeEvent";

export type RealTimeCallbacks = {
  onSnapshot: (tickets: Ticket[]) => void;
  onTicketUpdate: (ticket: Ticket) => void;
  onConsultorioUpdated?: (event: ConsultorioRealtimeEvent) => void;
  onPatientAssigned?: (event: ConsultorioRealtimeEvent) => void;
  onAttentionFinished?: (event: ConsultorioRealtimeEvent) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (message: string) => void;
};

export interface RealTimeProvider {
  connect(callbacks: RealTimeCallbacks): void;
  disconnect(): void;
  isConnected(): boolean;
}
