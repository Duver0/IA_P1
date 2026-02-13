"use client";

import { useEffect, useRef, useState } from "react";
import { HttpAppointmentRepository } from "@/repositories/HttpAppointmentRepository";
import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";

/**
 * Real-time hook using controlled polling.
 *
 * Features:
 * - Prevents parallel requests (uses recursive setTimeout, not setInterval)
 * - Cleans up timers on unmount (no memory leaks)
 * - Prevents setState after unmount
 * - Avoids re-render if data hasn't changed (snapshot diff)
 * - Repository singleton (no recreation)
 * - Prepared for future migration to SSE/WebSocket
 */
export function useAppointmentsRealtime() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState<string | null>(null);

    /**
     * Hook lifecycle control
     */
    const activeRef = useRef(true);

    /**
     * Snapshot of last state to avoid unnecessary renders
     */
    const lastSnapshotRef = useRef<string>("");

    /**
     * Polling timer (prevents zombie timers)
     */
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Repository singleton
     */
    const repositoryRef = useRef<HttpAppointmentRepository | null>(null);

    if (!repositoryRef.current) {
        repositoryRef.current = new HttpAppointmentRepository();
    }

    useEffect(() => {
        activeRef.current = true;

        const loop = async () => {
            try {
                const data = await repositoryRef.current!.getAppointments();

                const snapshot = JSON.stringify(data);

                /**
                 * Avoid re-render if no changes
                 */
                if (snapshot !== lastSnapshotRef.current) {
                    lastSnapshotRef.current = snapshot;

                    if (activeRef.current) {
                        setAppointments(data);
                        setError(null);
                    }
                }
            } catch {
                if (activeRef.current) {
                    setError("Error loading appointments");
                }
            }

            /**
             * Schedule next execution ONLY if still active
             */
            if (activeRef.current) {
                timerRef.current = setTimeout(loop, env.POLLING_INTERVAL);
            }
        };

        loop();

        /**
         * Safe cleanup on unmount
         */
        return () => {
            activeRef.current = false;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { appointments, error };
}
