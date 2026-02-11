"use client";

import { useTurnosRealtime } from "@/hooks/useTurnosRealtime";
import styles from "./TurnosBoard.module.css";

export default function TurnosBoard() {
    const { turnos, loading, error } = useTurnosRealtime();

    if (loading) return <div className={styles.center}>Cargando turnos...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!turnos.length)
        return <div className={styles.center}>No hay turnos habilitados</div>;

    return (
        <div className={styles.board}>
            {turnos.map((t) => (
                <div key={t.id} className={styles.card}>
                    <h2>{t.nombre}</h2>
                    <p>Consultorio: {t.consultorio}</p>
                </div>
            ))}
        </div>
    );
}
