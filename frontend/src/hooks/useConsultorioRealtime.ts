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

const resolvePatientName = (
  tickets: Ticket[],
  currentConsultorio: ConsultorioRealtimeEvent | null,
): string | null => {
  if (!currentConsultorio?.patientId) {
    return null;
  }

  const byDocument = tickets.find(
    (ticket) =>
      String(ticket.documentId) === currentConsultorio.patientId &&
      ticket.office === currentConsultorio.consultorioId,
  );

  if (byDocument) {
    return byDocument.name;
  }

  const byOffice = tickets.find(
    (ticket) =>
      ticket.status === "called" &&
      ticket.office === currentConsultorio.consultorioId,
  );

  return byOffice?.name ?? null;
};

export function useConsultorioRealtime({
  realTime,
  consultorioId,
  loadInitialState,
}: UseConsultorioRealtimeOptions) {
  const [consultorio, setConsultorio] =
    useState<ConsultorioRealtimeEvent | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
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
          setPatientName(
            resolvePatientName(ticketsRef.current, consultorioRef.current),
          );
        },
        onTicketUpdate: (ticket) => {
          const withoutUpdated = ticketsRef.current.filter((item) => item.id !== ticket.id);
          ticketsRef.current = [...withoutUpdated, ticket];
          setPatientName(
            resolvePatientName(ticketsRef.current, consultorioRef.current),
          );
        },
        onConsultorioUpdated: (event) => {
          if (event.consultorioId === consultorioId) {
            consultorioRef.current = event;
            setConsultorio(event);
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
    error,
    connected,
    refreshState,
  };
}