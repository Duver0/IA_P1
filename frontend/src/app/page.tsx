"use client";

import { useEffect, useRef } from "react";
import { useTicketsWebSocket } from "@/hooks/useTicketsWebSocket";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useDeps } from "@/providers/DependencyProvider";
import styles from "@/styles/page.module.css";

export default function TicketsScreen() {
  const { realTime, audio } = useDeps();
  const { tickets, error, connected } = useTicketsWebSocket(realTime);
  const { audioEnabled, showToast, toastMessage, notify } =
    useAudioNotification(audio);

  const lastCountRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      lastCountRef.current = tickets.length;
      if (tickets.length > 0) {
        initializedRef.current = true;
      }
      return;
    }

    if (tickets.length > lastCountRef.current) {
      notify("🔔 Nuevo turno llamado");
    }

    lastCountRef.current = tickets.length;
  }, [tickets, notify]);

  const calledTickets = tickets.filter((t) => t.status === "called");
  const waitingTickets = tickets.filter((t) => t.status === "waiting");

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
          <h2 className={styles.sectionTitle}>📢 Called</h2>
          <ul className={styles.list}>
            {calledTickets.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.highlight}`}>
                <span className={styles.name}>
                  {`${t.name} - Consultorio ${t.office ?? "N/A"}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {waitingTickets.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>⏳ Waiting</h2>
          <ul className={styles.list}>
            {waitingTickets.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.name}>{t.name}</span>
                <span>Sin consultorio</span>
              </li>
            ))}
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
