"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Turno } from "@/domain/Turno";
import { env } from "@/config/env";

/**
 * Hook de tiempo real con WebSocket (Socket.IO).
 *
 * Características:
 * - Recibe snapshot inicial al conectar (TURNOS_SNAPSHOT)
 * - Actualiza turnos individualmente (TURNO_ACTUALIZADO)
 * - Reconexión automática vía Socket.IO
 * - Cleanup al desmontar (no memory leaks)
 * - Indicador de estado de conexión
 *
 * ⚕️ HUMAN CHECK - Reemplaza al hook de polling useTurnosRealtime
 */
export function useTurnosWebSocket() {
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    const socketRef = useRef<Socket | null>(null);

    /**
     * Actualiza un turno individual en el array o lo agrega si no existe
     */
    const updateTurno = useCallback((turnoActualizado: Turno) => {
        setTurnos(prev => {
            const index = prev.findIndex(t => t.id === turnoActualizado.id);
            if (index >= 0) {
                // Reemplazar turno existente
                const updated = [...prev];
                updated[index] = turnoActualizado;
                return updated;
            }
            // Agregar nuevo turno
            return [...prev, turnoActualizado];
        });
    }, []);

    useEffect(() => {
        // ⚕️ HUMAN CHECK - Conexión WebSocket
        // El namespace /ws/turnos debe coincidir con el gateway del Producer
        const socket = io(`${env.WS_URL}/ws/turnos`, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[WS] Conectado al servidor");
            setConnected(true);
            setError(null);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[WS] Desconectado: ${reason}`);
            setConnected(false);
        });

        socket.on("connect_error", (err: Error | any) => {
            console.error("[WS] Error de conexión:", err?.message || err);
            setError("Error de conexión con el servidor");
            setConnected(false);
        });

        // Snapshot inicial — todos los turnos al conectar / reconectar
        socket.on("TURNOS_SNAPSHOT", (payload: { type: string; data: Turno[] }) => {
            console.log(`[WS] Snapshot recibido: ${payload.data.length} turnos`);
            setTurnos(payload.data);
            setError(null);
        });

        // Actualización individual de un turno
        socket.on("TURNO_ACTUALIZADO", (payload: { type: string; data: Turno }) => {
            console.log(`[WS] Turno actualizado: ${payload.data.nombre} → ${payload.data.estado}`);
            updateTurno(payload.data);
        });

        // Cleanup al desmontar
        return () => {
            console.log("[WS] Cleanup — desconectando");
            socket.disconnect();
            socketRef.current = null;
        };
    }, [updateTurno]);

    return { turnos, error, connected };
}
