"use client";

import { useEffect, useRef, useState } from "react";
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";
import { Turno } from "@/domain/Turno";
import { env } from "@/config/env";

const repository = new HttpTurnoRepository();

/**
 * 🛡️ HUMAN CHECK:
 * - Evita múltiples loops
 * - Evita setState después de unmount
 * - Evita flicker comparando datos
 * - Preparado para migrar a SSE/WebSocket
 */

export function useTurnosRealtime() {
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [error, setError] = useState<string | null>(null);

    const activeRef = useRef(true);
    const lastSnapshotRef = useRef<string>("");

    useEffect(() => {
        activeRef.current = true;

        const loop = async () => {
            try {
                const data = await repository.obtenerTurnos();

                const snapshot = JSON.stringify(data);

                // Evita re-render si no cambió nada
                if (snapshot !== lastSnapshotRef.current) {
                    lastSnapshotRef.current = snapshot;
                    if (activeRef.current) setTurnos(data);
                }
            } catch {
                if (activeRef.current) {
                    setError("Error cargando turnos");
                }
            }

            if (activeRef.current) {
                setTimeout(loop, env.POLLING_INTERVAL);
            }
        };

        loop();

        return () => {
            activeRef.current = false;
        };
    }, []);

    return { turnos, error };
}
