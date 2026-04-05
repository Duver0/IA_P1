"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsultorioRealtimeEvent } from "@/domain/ConsultorioRealtimeEvent";
import type { Ticket } from "@/domain/Ticket";
import type { RealTimeProvider } from "@/domain/ports/RealTimeProvider";

interface UseConsultorioRealtimeOptions {
  realTime: RealTimeProvider;
  consultorioId: string;
  loadInitialState: (consultorioId: string) => Promise<ConsultorioRealtimeEvent>;
}

interface UseConsultorioRealtimeResult {
  consultorio: ConsultorioRealtimeEvent | null;
  patientName: string | null;
  currentTicket?: Ticket | null;
  error: string | null;
  connected: boolean;
  refreshState: (version?: number) => Promise<ConsultorioRealtimeEvent | null>;
}

const resolveCurrentCalledTicket = (
  tickets: Ticket[],
  currentConsultorio: ConsultorioRealtimeEvent | null,
): Ticket | null => {
  if (!currentConsultorio) {
    return null;
  }

  if (currentConsultorio.patientId) {
    const byDocument = tickets.find(
      (ticket) =>
        String(ticket.documentId) === currentConsultorio.patientId &&
        ticket.office === currentConsultorio.consultorioId &&
        ticket.status === "called",
    );

    if (byDocument) {
      return byDocument;
    }
  }

  return (
    tickets.find(
      (ticket) =>
        ticket.status === "called" &&
        ticket.office === currentConsultorio.consultorioId,
    ) ?? null
  );
};

const resolvePatientName = (
  tickets: Ticket[],
  currentConsultorio: ConsultorioRealtimeEvent | null,
): string | null => {
  const currentTicket = resolveCurrentCalledTicket(tickets, currentConsultorio);
  return currentTicket?.name ?? null;
};

export function useConsultorioRealtime({
  realTime,
  consultorioId,
  loadInitialState,
}: UseConsultorioRealtimeOptions): UseConsultorioRealtimeResult {
  const [consultorio, setConsultorio] =
    useState<ConsultorioRealtimeEvent | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const consultorioRef = useRef<ConsultorioRealtimeEvent | null>(null);
  const ticketsRef = useRef<Ticket[]>([]);
  const requestVersionRef = useRef(0);

  const refreshState = useCallback(
    async (version = requestVersionRef.current): Promise<ConsultorioRealtimeEvent | null> => {
      const latest = await loadInitialState(consultorioId);

      if (version !== requestVersionRef.current) {
        return null;
      }

      consultorioRef.current = latest;
      setConsultorio(latest);
      setCurrentTicket(resolveCurrentCalledTicket(ticketsRef.current, latest));
      setPatientName(
        resolvePatientName(ticketsRef.current, latest),
      );
      setError(null);

      return latest;
    },
    [consultorioId, loadInitialState],
  );

  useEffect(() => {
    let active = true;
    requestVersionRef.current += 1;
    const version = requestVersionRef.current;

    ticketsRef.current = [];
    consultorioRef.current = null;
    setConsultorio(null);
    setCurrentTicket(null);
    setPatientName(null);

    const bootstrap = async () => {
      try {
        await refreshState(version);
      } catch (err: unknown) {
        if (active && version === requestVersionRef.current) {
          const message = err instanceof Error ? err.message : "No fue posible cargar el estado inicial";
          setError(message);
        }
      }

      if (!active || version !== requestVersionRef.current) {
        return;
      }

      realTime.connect({
        onSnapshot: (tickets) => {
          ticketsRef.current = tickets;
          setCurrentTicket(
            resolveCurrentCalledTicket(ticketsRef.current, consultorioRef.current),
          );
          setPatientName(
            resolvePatientName(ticketsRef.current, consultorioRef.current),
          );
        },
        onTicketUpdate: (ticket) => {
          const withoutUpdated = ticketsRef.current.filter((item) => item.id !== ticket.id);
          ticketsRef.current = [...withoutUpdated, ticket];
          setCurrentTicket(
            resolveCurrentCalledTicket(ticketsRef.current, consultorioRef.current),
          );
          setPatientName(
            resolvePatientName(ticketsRef.current, consultorioRef.current),
          );
        },
        onConsultorioUpdated: (event) => {
          if (event.consultorioId === consultorioId) {
            consultorioRef.current = event;
            setConsultorio(event);
            setCurrentTicket(
              resolveCurrentCalledTicket(ticketsRef.current, event),
            );
            setPatientName(
              resolvePatientName(ticketsRef.current, event),
            );
            setError(null);
          }
        },
        onPatientAssigned: (event) => {
          if (event.consultorioId === consultorioId) {
            consultorioRef.current = event;
            setConsultorio(event);
            setCurrentTicket(
              resolveCurrentCalledTicket(ticketsRef.current, event),
            );
            setPatientName(
              resolvePatientName(ticketsRef.current, event),
            );
            setError(null);
          }
        },
        onAttentionFinished: (event) => {
          if (event.consultorioId === consultorioId) {
            consultorioRef.current = event;
            setConsultorio(event);
            setCurrentTicket(
              resolveCurrentCalledTicket(ticketsRef.current, event),
            );
            setPatientName(
              resolvePatientName(ticketsRef.current, event),
            );
            setError(null);
          }
        },
        onConnect: () => {
          setConnected(true);
          setError(null);
        },
        onDisconnect: () => setConnected(false),
        onError: (message) => {
          setConnected(false);
          setError(message);
        },
      });
    };

    void bootstrap();

    return () => {
      active = false;
      realTime.disconnect();
    };
  }, [consultorioId, realTime, refreshState]);

  return {
    consultorio,
    patientName,
    currentTicket,
    error,
    connected,
    refreshState,
  };
}