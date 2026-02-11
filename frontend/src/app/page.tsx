"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnosWebSocket } from "@/hooks/useTurnosWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Pantalla principal de turnos — Tiempo real via WebSocket
 * ⚕️ HUMAN CHECK - Migrado de polling a WebSocket
 * Optimizaciones visuales de 'develop' integradas
 */
export default function TurnosPantalla() {
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
   * Detecta nuevo turno o cambio de estado → reproduce sonido
   */
  useEffect(() => {
    // Primer render → solo guarda snapshot
    if (lastCountRef.current === null) {
      lastCountRef.current = turnos.length;
      return;
    }

    if (turnos.length > lastCountRef.current) {
      if (audioService.isEnabled()) {
        audioService.play();
      }

      // Toast visual elegante (de develop)
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = turnos.length;
  }, [turnos]);

  // Separar turnos por estado para mejor visualización
  const turnosLlamados = turnos.filter(t => t.estado === "llamado");
  const turnosEspera = turnos.filter(t => t.estado === "espera");
  const turnosAtendidos = turnos.filter(t => t.estado === "atendido");

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Turnos habilitados</h1>

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

      {/* Turnos llamados (con consultorio asignado) */}
      {turnosLlamados.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>📢 Llamados</h2>
          <ul className={styles.list}>
            {turnosLlamados.map((t) => (
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

      {/* Turnos en espera */}
      {turnosEspera.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>⏳ En espera</h2>
          <ul className={styles.list}>
            {turnosEspera.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span>Sin consultorio</span>
                <span className={styles.badge}>
                  {t.priority === "alta" ? "🔴" : t.priority === "media" ? "🟡" : "🟢"} {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Turnos atendidos */}
      {turnosAtendidos.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>✅ Atendidos</h2>
          <ul className={styles.list}>
            {turnosAtendidos.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.atendido}`}>
                <span className={styles.nombre}>{t.nombre}</span>
                <span>Consultorio {t.consultorio}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {turnos.length === 0 && !error && (
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
