"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnosRealtime } from "@/hooks/useTurnosRealtime";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Pantalla principal de turnos
 * UI pura → sin lógica de audio
 */

export default function TurnosPantalla() {
  const { turnos, error } = useTurnosRealtime();

  const lastCountRef = useRef(0);
  const [audioEnabled, setAudioEnabled] = useState(false);

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
   * Detecta nuevo turno → reproduce sonido
   */
  useEffect(() => {
    if (!audioService.isEnabled()) return;

    if (turnos.length > lastCountRef.current) {
      audioService.play();
    }

    lastCountRef.current = turnos.length;
  }, [turnos]);

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
        {turnos.map((t, i) => (
          <li
            key={t.id}
            className={`${styles.item} ${i === turnos.length - 1 ? styles.highlight : ""
              }`}
          >
            <span className={styles.nombre}>{t.nombre}</span>
            <span>Consultorio {t.consultorio}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
