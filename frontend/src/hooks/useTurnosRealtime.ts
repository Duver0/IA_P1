"use client";

// 🛡️ HUMAN CHECK:
// La IA no limpiaba el setInterval generando memory leak.
// Se agregó cleanup en useEffect para evitar múltiples polling
// y consumo innecesario de recursos.


import { useEffect, useRef, useState } from "react";
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";
import { env } from "@/config/env";
import { Turno } from "@/repositories/domain/Turno";

const repository = new HttpTurnoRepository();

export function useTurnosRealtime() {
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchTurnos = async () => {
        try {
            const data = await repository.obtenerTurnos();
            setTurnos(data);
            setError(null);
        } catch (err) {
            setError("No se pudo actualizar la cola");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTurnos();

        intervalRef.current = setInterval(fetchTurnos, env.POLLING_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return { turnos, loading, error };
}
