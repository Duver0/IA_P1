"use client";

import { useEffect, useRef, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Main Appointments Screen — Real-time via WebSocket
 * ⚕️ HUMAN CHECK - Migrated from polling to WebSocket
 * Integrated visual optimizations from 'develop'
 */
export default function AppointmentsScreen() {
  const { appointments, error, connected } = useAppointmentsWebSocket();

  const lastCountRef = useRef<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /**
   * Initializes audio and waits for user gesture
   */
  useEffect(() => {
    audioService.init("/sounds/ding.mp3", 0.6);

    const unlock = async () => {
      await audioService.unlock();
      setAudioEnabled(audioService.isEnabled());
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  /**
   * Detects new appointment or state change → plays sound
   */
  useEffect(() => {
    // First render → only save snapshot
    if (lastCountRef.current === null) {
      lastCountRef.current = appointments.length;
      return;
    }

    if (appointments.length > lastCountRef.current) {
      if (audioService.isEnabled()) {
        audioService.play();
      }

      // Elegant visual toast (from develop)
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = appointments.length;
  }, [appointments]);

  // Separate appointments by status for better visualization
  const calledAppointments = appointments.filter(t => t.estado === "llamado");
  const waitingAppointments = appointments.filter(t => t.estado === "espera");

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Turnos Habilitados</h1>

      {/* WebSocket Connection Indicator */}
      <p className={connected ? styles.connected : styles.disconnected}>
        {connected ? "🟢 Conectado en tiempo real" : "🔴 Desconectado — reconectando..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toca la pantalla para habilitar el sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Called appointments (assigned to a consultorio) */}
      {calledAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>📢 Called</h2>
          <ul className={styles.list}>
            {calledAppointments.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.highlight}`}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span>Consultorio {t.consultorio}</span>
                <span className={styles.badge}>
                  {t.priority === "alta" ? "🔴" : t.priority === "media" ? "🟡" : "🟢"} {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Waiting appointments */}
      {waitingAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>⏳ Waiting</h2>
          <ul className={styles.list}>
            {waitingAppointments.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span>Consultorio no asignado</span>
                <span className={styles.badge}>
                  {t.priority === "alta" ? "🔴" : t.priority === "media" ? "🟡" : "🟢"} {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {appointments.length === 0 && !error && (
        <p className={styles.empty}>No hay turnos registrados</p>
      )}

      {showToast && (
        <div className={styles.toast}>
          🔔 Nuevo turno llamado
        </div>
      )}
    </main>
  );
}
