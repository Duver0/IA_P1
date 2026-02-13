"use client";

import { useState, useRef, useEffect } from "react";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { HttpAppointmentRepository } from "@/repositories/HttpAppointmentRepository";

/**
 * Hook for registering appointments.
 *
 * Features:
 * - Prevents double submit
 * - Prevents setState after unmount
 * - Typed error handling
 * - State reset before each request
 * - Repository singleton (no recreation)
 * - No memory leaks
 * - Circuit Breaker compatible
 */
export function useAppointmentRegistration() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Hook lifecycle control
     */
    const isMountedRef = useRef(true);

    /**
     * Prevents multiple simultaneous submits
     */
    const inFlightRef = useRef(false);

    /**
     * Repository singleton
     */
    const repositoryRef = useRef<HttpAppointmentRepository | null>(null);

    if (!repositoryRef.current) {
        repositoryRef.current = new HttpAppointmentRepository();
    }

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Safe state update (prevents setState after unmount)
     */
    const safeSet = <T,>(setter: (v: T) => void, value: T) => {
        if (isMountedRef.current) setter(value);
    };

    const register = async (data: CreateAppointmentDTO) => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;

        safeSet(setLoading, true);
        safeSet(setSuccess, null);
        safeSet(setError, null);

        try {
            const res = await repositoryRef.current!.createAppointment(data);

            safeSet(
                setSuccess,
                res.message ?? "Appointment registered successfully"
            );
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "UNKNOWN_ERROR";

            let userMessage = "Could not register the appointment.";

            switch (message) {
                case "TIMEOUT":
                    userMessage =
                        "The server took too long. Please try again.";
                    break;

                case "RATE_LIMIT":
                    userMessage =
                        "Too many requests. Please wait a few seconds.";
                    break;

                case "HTTP_ERROR":
                case "SERVER_ERROR":
                    userMessage =
                        "Server error. Please try later.";
                    break;

                case "CIRCUIT_OPEN":
                    userMessage =
                        "Server temporarily unavailable. Retrying...";
                    break;
            }

            safeSet(setError, userMessage);
        } finally {
            safeSet(setLoading, false);
            inFlightRef.current = false;
        }
    };

    return { register, loading, success, error };
}
