"use client";

import { useEffect, useRef, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Dashboard for attended appointments — Full history via WebSocket
 * Shows all appointments that have been attended with date and time
 */
export default function AttendedHistoryDashboard() {
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
   * Detects new attended appointment → plays sound
   */
  useEffect(() => {
    // First render → only save snapshot
    if (lastCountRef.current === null) {
      const attendedCount = appointments.filter(t => t.estado === "atendido").length;
      lastCountRef.current = attendedCount;
      return;
    }

    const attendedCount = appointments.filter(t => t.estado === "atendido").length;
    if (attendedCount > lastCountRef.current) {
      if (audioService.isEnabled()) {
        audioService.play();
      }

      // Elegant visual toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = attendedCount;
  }, [appointments]);

  // Filter only attended appointments and sort by timestamp descending
  const attendedAppointments = appointments
    .filter(t => t.estado === "atendido")
    .sort((a, b) => b.timestamp - a.timestamp);

  /**
   * Formats timestamp to readable time (HH:MM:SS)
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Historial de Turnos Atendidos</h1>

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

      {/* Attended appointments with time */}
      {attendedAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>✅ Atendidos ({attendedAppointments.length})</h2>
          <ul className={styles.list}>
            {attendedAppointments.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.atendido}`}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span className={styles.hora}>{formatTime(t.timestamp)}</span>
                <span>Consultorio {t.consultorio}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {attendedAppointments.length === 0 && !error && (
        <p className={styles.empty}>No hay turnos atendidos</p>
      )}

      {showToast && (
        <div className={styles.toast}>
          ✅ Turno completado
        </div>
      )}
    </main>
  );
}
