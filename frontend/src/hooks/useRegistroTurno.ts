"use client";

import { useState, useRef, useEffect } from "react";
import { CrearTurnoDTO } from "@/domain/CrearTurno";
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";

/**
 * Hook para registrar turnos.
 *
 * Características:
 * - Evita doble submit
 * - Evita setState después de unmount
 * - Manejo de errores tipificados
 * - Reset de estado antes de cada request
 * - Repository singleton (no recrea instancia)
 * - Sin memory leaks
 * - Compatible con Circuit Breaker
 */
export function useRegistroTurno() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Control de vida del hook
     */
    const isMountedRef = useRef(true);

    /**
     * Evita múltiples submits simultáneos
     */
    const inFlightRef = useRef(false);

    /**
     * Repository singleton
     */
    const repositoryRef = useRef<HttpTurnoRepository | null>(null);

    if (!repositoryRef.current) {
        repositoryRef.current = new HttpTurnoRepository();
    }

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Safe state update (evita setState after unmount)
     */
    const safeSet = <T,>(setter: (v: T) => void, value: T) => {
        if (isMountedRef.current) setter(value);
    };

    const registrar = async (data: CrearTurnoDTO) => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;

        safeSet(setLoading, true);
        safeSet(setSuccess, null);
        safeSet(setError, null);

        try {
            const res = await repositoryRef.current!.crearTurno(data);

            safeSet(
                setSuccess,
                res.message ?? "Turno registrado correctamente"
            );
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "UNKNOWN_ERROR";

            let userMessage = "No se pudo registrar el turno.";

            switch (message) {
                case "TIMEOUT":
                    userMessage =
                        "El servidor tardó demasiado. Intente nuevamente.";
                    break;

                case "RATE_LIMIT":
                    userMessage =
                        "Demasiadas solicitudes. Espere unos segundos.";
                    break;

                case "HTTP_ERROR":
                case "SERVER_ERROR":
                    userMessage =
                        "Error del servidor. Intente más tarde.";
                    break;

                case "CIRCUIT_OPEN":
                    userMessage =
                        "Servidor temporalmente no disponible. Reintentando...";
                    break;
            }

            safeSet(setError, userMessage);
        } finally {
            safeSet(setLoading, false);
            inFlightRef.current = false;
        }
    };

    return { registrar, loading, success, error };
}
