"use client";

import { useState } from "react";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";
import styles from "./AppointmentRegistrationForm.module.css";
import { sanitizeText } from "@/security/sanitize";

/**
 * 🛡️ HUMAN CHECK:
 * HTTP logic is separated from the component.
 * The component only handles UI + sanitization.
 * Follows Single Responsibility Principle.
 */

export default function AppointmentRegistrationForm() {
    const [name, setName] = useState("");
    const [idCard, setIdCard] = useState("");

    const { register, loading, success, error } = useAppointmentRegistration();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const safeName = sanitizeText(name);
        const safeIdCard = sanitizeText(idCard);

        const validIdCard = parseInt(safeIdCard, 10);
        if (!safeName || isNaN(validIdCard)) return;

        // Keep Spanish keys for backend compatibility
        await register({ nombre: safeName, cedula: validIdCard });
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Registro de Turnos</h2>

            <input
                type="text"
                placeholder="Nombre Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
            />

            <input
                type="text"
                placeholder="ID Card"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                className={styles.input}
            />

            <button disabled={loading} className={styles.button}>
                {loading ? "Enviando..." : "Registrar Turno"}
            </button>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
}
