"use client";

// 🛡️ HUMAN CHECK:
// La IA no reiniciaba estados previos causando UI inconsistente.
// Se agregó reset de success/error antes del request.
// Además se agregó:
// - Manejo específico de errores (timeout, rate limit, http)
// - Protección contra múltiples submits
// - Control de desmontaje para evitar memory leaks

import { useState, useRef, useEffect } from "react";
import { CrearTurnoDTO } from "@/domain/CrearTurno";
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";

const repository = new HttpTurnoRepository();

export function useRegistroTurno() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isMounted = useRef(true);
    const inFlight = useRef(false);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const registrar = async (data: CrearTurnoDTO) => {
        if (inFlight.current) return; // 🛡️ evita doble submit

        inFlight.current = true;

        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            const res = await repository.crearTurno(data);

            if (!isMounted.current) return;

            setSuccess(res.message ?? "Turno registrado correctamente");
        } catch (err: any) {
            if (!isMounted.current) return;

            if (err.message === "TIMEOUT") {
                setError("El servidor tardó demasiado. Intente nuevamente.");
            } else if (err.message === "RATE_LIMIT") {
                setError("Demasiadas solicitudes. Espere unos segundos.");
            } else if (err.message === "HTTP_ERROR") {
                setError("Error del servidor. Intente más tarde.");
            } else {
                setError("No se pudo registrar el turno.");
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
            inFlight.current = false;
        }
    };

    return { registrar, loading, success, error };
}
