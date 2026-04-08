"use client";

import { useEffect, useRef } from "react";
import { useTicketsWebSocket } from "@/hooks/useTicketsWebSocket";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useDeps } from "@/providers/DependencyProvider";
import styles from "@/styles/page.module.css";

const MAX_CALLED_PATIENT_NAME_CHARS = 42;
const MAX_WAITING_PATIENT_NAME_CHARS = 30;
const MAX_DOCTOR_NAME_CHARS = 34;

const truncateWithThreeDots = (value: string, maxChars: number): string => {
  const normalizedValue = value.trim();
  if (normalizedValue.length <= maxChars) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
};

const formatCalledPatientName = (fullName: string): string => {
  const truncatedName = truncateWithThreeDots(fullName, MAX_CALLED_PATIENT_NAME_CHARS);
  const words = truncatedName.split(/\s+/).filter(Boolean);

  if (words.length === 2) {
    return `${words[0]}\n${words[1]}`;
  }

  return truncatedName;
};

const formatDoctorName = (fullName: string): string =>
  truncateWithThreeDots(fullName, MAX_DOCTOR_NAME_CHARS);

const formatWaitingPatientName = (fullName: string): string =>
  truncateWithThreeDots(fullName, MAX_WAITING_PATIENT_NAME_CHARS);

const formatTicketDocument = (documentId: number): string =>
  `Cédula ${documentId}`;

export default function TicketsScreen() {
  const { realTime, audio } = useDeps();
  const { tickets, error, connected } = useTicketsWebSocket(realTime);
  const { audioEnabled, showToast, toastMessage, notify } =
    useAudioNotification(audio);

  const calledTicketIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const activeQueueTickets = tickets.filter(
    (ticket) => ticket.status === "called" || ticket.status === "waiting"
  );
  const queuePositionById = new Map(
    activeQueueTickets.map((ticket, index) => [ticket.id, index + 1])
  );
  const calledTickets = activeQueueTickets.filter(
    (ticket) => ticket.status === "called"
  );
  const waitingTickets = activeQueueTickets.filter(
    (ticket) => ticket.status === "waiting"
  );

  useEffect(() => {
    const currentCalledTicketIds = new Set(calledTickets.map((ticket) => ticket.id));

    if (!initializedRef.current) {
      calledTicketIdsRef.current = currentCalledTicketIds;
      initializedRef.current = true;
      return;
    }

    const hasNewCalledTicket = Array.from(currentCalledTicketIds).some(
      (ticketId) => !calledTicketIdsRef.current.has(ticketId)
    );

    if (hasNewCalledTicket) {
      notify("🔔 Turno llamado a consultorio");
    }

    calledTicketIdsRef.current = currentCalledTicketIds;
  }, [calledTickets, notify]);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Turnos Habilitados</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected
          ? "🟢 Conectado en tiempo real"
          : "🔴 Desconectado — reconectando..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toca la pantalla para habilitar el sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {calledTickets.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>En llamado</h2>
          <ul className={styles.list}>
            {calledTickets.map((t) => {
              const queuePosition =
                queuePositionById.get(t.id) ?? activeQueueTickets.length + 1;

              return (
                <li key={t.id} className={`${styles.item} ${styles.highlight}`}>
                  <span
                    className={styles.queuePosition}
                    aria-label={`Orden de atención ${queuePosition}`}
                  >
                    {queuePosition}
                  </span>
                  <div className={styles.calledContent}>
                    <div className={styles.calledPatientColumn}>
                      <span className={styles.calledPatientName}>
                        {formatCalledPatientName(t.name)}
                      </span>
                      <span className={styles.calledPatientDocument}>
                        {formatTicketDocument(t.documentId)}
                      </span>
                    </div>

                    <div className={styles.calledAssignmentColumn}>
                      <span className={styles.calledOffice}>{`Consultorio ${t.office ?? "N/A"}`}</span>
                      <span className={styles.calledDoctor}>
                        {t.doctorName
                          ? `Médico: ${formatDoctorName(t.doctorName)}`
                          : "Médico: pendiente por asignar"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {waitingTickets.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>En espera</h2>
          <ul className={styles.list}>
            {waitingTickets.map((t) => {
              const queuePosition =
                queuePositionById.get(t.id) ?? activeQueueTickets.length + 1;

              return (
                <li key={t.id} className={styles.item}>
                  <span
                    className={styles.queuePosition}
                    aria-label={`Orden de atención ${queuePosition}`}
                  >
                    {queuePosition}
                  </span>
                  <div className={styles.waitingContent}>
                    <span className={`${styles.name} ${styles.waitingPatientName}`}>
                      {formatWaitingPatientName(t.name)}
                    </span>
                    <span className={styles.waitingPatientDocument}>
                      {formatTicketDocument(t.documentId)}
                    </span>
                  </div>
                  <span className={styles.waitingOffice}>Sin consultorio</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {tickets.length === 0 && !error && (
        <p className={styles.empty}>No hay turnos registrados</p>
      )}

      {showToast && <div className={styles.toast}>{toastMessage}</div>}
    </main>
  );
}
