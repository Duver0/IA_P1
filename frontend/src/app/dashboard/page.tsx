"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnosWebSocket } from "@/hooks/useTurnosWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Dashboard de turnos atendidos — Historial completo via WebSocket
 * Muestra todos los turnos que han sido atendidos con fecha y hora
 */
export default function DashboardAtendidos() {
  const { turnos, error, connected } = useTurnosWebSocket();

  const lastCountRef = useRef<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /**
   * Inicializa audio y espera gesto del usuario
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
   * Detecta nuevo turno atendido → reproduce sonido
   */
  useEffect(() => {
    // Primer render → solo guarda snapshot
    if (lastCountRef.current === null) {
      const atendidosCount = turnos.filter(t => t.estado === "atendido").length;
      lastCountRef.current = atendidosCount;
      return;
    }

    const atendidosCount = turnos.filter(t => t.estado === "atendido").length;
    if (atendidosCount > lastCountRef.current) {
      if (audioService.isEnabled()) {
        audioService.play();
      }

      // Toast visual elegante
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = atendidosCount;
  }, [turnos]);

  // Filtrar solo turnos atendidos y ordenar por fecha descendente
  const turnosAtendidos = turnos
    .filter(t => t.estado === "atendido")
    .sort((a, b) => b.timestamp - a.timestamp);

  /**
   * Formatea el timestamp a hora legible (HH:MM:SS)
   */
  const formatHora = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Historial de atendidos</h1>

      {/* Indicador de conexión WebSocket */}
      <p className={connected ? styles.connected : styles.disconnected}>
        {connected ? "🟢 Conectado en tiempo real" : "🔴 Desconectado — reconectando..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toque la pantalla para activar sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Turnos atendidos con hora */}
      {turnosAtendidos.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>✅ Atendidos ({turnosAtendidos.length})</h2>
          <ul className={styles.list}>
            {turnosAtendidos.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.atendido}`}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span className={styles.hora}>{formatHora(t.timestamp)}</span>
                <span>Consultorio {t.consultorio}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {turnosAtendidos.length === 0 && !error && (
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
