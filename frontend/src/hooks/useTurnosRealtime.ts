"use client";

import { useEffect, useRef, useState } from "react";
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";
import { Turno } from "@/domain/Turno";
import { env } from "@/config/env";

/**
 * Hook realtime por polling controlado.
 *
 * Características:
 * - Evita requests paralelos (usa setTimeout recursivo, no setInterval)
 * - Limpia timers al desmontar (no memory leaks)
 * - Evita setState después de unmount
 * - Evita re-render si los datos no cambiaron (snapshot diff)
 * - Repository singleton (no recrea instancias)
 * - Preparado para migración futura a SSE/WebSocket
 */
export function useTurnosRealtime() {
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [error, setError] = useState<string | null>(null);

    /**
     * Control de vida del hook
     */
    const activeRef = useRef(true);

    /**
     * Snapshot del último estado para evitar renders innecesarios
     */
    const lastSnapshotRef = useRef<string>("");

    /**
     * Timer del polling (evita timers zombie)
     */
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Repository singleton (no recrear instancia en cada render)
     */
    const repositoryRef = useRef<HttpTurnoRepository | null>(null);

    if (!repositoryRef.current) {
        repositoryRef.current = new HttpTurnoRepository();
    }

    useEffect(() => {
        activeRef.current = true;

        const loop = async () => {
            try {
                const data = await repositoryRef.current!.obtenerTurnos();

                const snapshot = JSON.stringify(data);

                /**
                 * Evita re-render si no hubo cambios
                 */
                if (snapshot !== lastSnapshotRef.current) {
                    lastSnapshotRef.current = snapshot;

                    if (activeRef.current) {
                        setTurnos(data);
                        setError(null);
                    }
                }
            } catch {
                if (activeRef.current) {
                    setError("Error cargando turnos");
                }
            }

            /**
             * Agenda siguiente ejecución SOLO si sigue activo
             */
            if (activeRef.current) {
                timerRef.current = setTimeout(loop, env.POLLING_INTERVAL);
            }
        };

        loop();

        /**
         * Cleanup seguro al desmontar
         */
        return () => {
            activeRef.current = false;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { turnos, error };
}
