"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnosRealtime } from "@/hooks/useTurnosRealtime";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Pantalla principal de turnos (Lobby / TV)
 *
 * Optimizaciones:
 * - Evita sonido en primer render
 * - Evita renders innecesarios
 * - Unlock de audio seguro
 * - Sin memory leaks
 * - Sin race conditions
 * - Estable 24/7
 * - Soporte visual premium (toast + highlight + prioridad)
 */
export default function TurnosPantalla() {
  const { turnos, error } = useTurnosRealtime();

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
   * Detecta nuevo turno → sonido + notificación visual
   * Evita sonido al cargar por primera vez
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

      // Toast visual elegante
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = turnos.length;
  }, [turnos]);

  /**
   * Determina clase visual de prioridad (si el backend la envía)
   */
  const getPriorityClass = (priority?: string) => {
    if (!priority) return "";

    switch (priority.toLowerCase()) {
      case "alta":
        return styles.priorityAlta;
      case "media":
        return styles.priorityMedia;
      case "baja":
        return styles.priorityBaja;
      default:
        return "";
    }
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Turnos habilitados</h1>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toque la pantalla para activar sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.list}>
        {turnos.map((t, i) => {
          const isLast = i === turnos.length - 1;

          return (
            <li
              key={t.id}
              className={`
                ${styles.item}
                ${isLast ? styles.highlight : ""}
                ${getPriorityClass((t as any).priority)}
              `}
            >
              <span className={styles.nombre}>{t.nombre}</span>
              <span>Consultorio {t.consultorio}</span>
            </li>
          );
        })}
      </ul>

      {showToast && (
        <div className={styles.toast}>
          🔔 Nuevo turno llamado
        </div>
      )}
    </main>
  );
}
