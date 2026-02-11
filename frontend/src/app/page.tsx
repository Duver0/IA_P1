"use client";

import { useEffect, useRef } from "react";
import { useTurnosRealtime } from "@/hooks/useTurnosRealtime";
import styles from "./page.module.css";

export default function TurnosPantalla() {
  const { turnos, error } = useTurnosRealtime();
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (turnos.length > lastCountRef.current) {
      // 🔔 Aquí luego puedes reproducir sonido
      console.log("Nuevo turno detectado");
    }
    lastCountRef.current = turnos.length;
  }, [turnos]);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Turnos habilitados</h1>

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.list}>
        {turnos.map((t, i) => (
          <li
            key={i}
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
