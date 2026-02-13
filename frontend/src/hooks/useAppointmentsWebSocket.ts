"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";

/**
 * Real-time hook using WebSocket (Socket.IO).
 *
 * Features:
 * - Receives initial snapshot on connect (TURNOS_SNAPSHOT)
 * - Updates appointments individually (TURNO_ACTUALIZADO)
 * - Automatic reconnection via Socket.IO
 * - Cleanup on unmount (no memory leaks)
 * - Connection status indicator
 *
 * ⚕️ HUMAN CHECK - Replaces polling hook useAppointmentsRealtime
 */
export function useAppointmentsWebSocket() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    const socketRef = useRef<Socket | null>(null);

    /**
     * Updates an individual appointment in the array or adds it if it doesn't exist
     */
    const updateAppointment = useCallback((updatedAppointment: Appointment) => {
        setAppointments(prev => {
            const index = prev.findIndex(t => t.id === updatedAppointment.id);
            if (index >= 0) {
                // Replace existing appointment
                const updated = [...prev];
                updated[index] = updatedAppointment;
                return updated;
            }
            // Add new appointment
            return [...prev, updatedAppointment];
        });
    }, []);

    useEffect(() => {
        // ⚕️ HUMAN CHECK - WebSocket Connection
        // The /ws/turnos namespace must match the Producer gateway
        const socket = io(`${env.WS_URL}/ws/turnos`, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[WS] Connected to server");
            setConnected(true);
            setError(null);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[WS] Disconnected: ${reason}`);
            setConnected(false);
        });

        socket.on("connect_error", (err: Error | any) => {
            console.error("[WS] Connection error:", err?.message || err);
            setError("Connection error with the server");
            setConnected(false);
        });

        // Initial snapshot — all appointments on connect / reconnect
        socket.on("TURNOS_SNAPSHOT", (payload: { type: string; data: Appointment[] }) => {
            console.log(`[WS] Snapshot received: ${payload.data.length} appointments`);
            setAppointments(payload.data);
            setError(null);
        });

        // Individual appointment update
        socket.on("TURNO_ACTUALIZADO", (payload: { type: string; data: Appointment }) => {
            console.log(`[WS] Appointment updated: ${payload.data.nombre} → ${payload.data.estado}`);
            updateAppointment(payload.data);
        });

        // Cleanup on unmount
        return () => {
            console.log("[WS] Cleanup — disconnecting");
            socket.disconnect();
            socketRef.current = null;
        };
    }, [updateAppointment]);

    return { appointments, error, connected };
}
