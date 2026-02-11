"use client";

import { useState } from "react";
import { useRegistroTurno } from "@/hooks/useRegistroTurno";
import styles from "./RegistroTurnoForm.module.css";
import { sanitizeText } from "@/security/sanitize";

/**
 * 🛡️ HUMAN CHECK:
 * Se separó la lógica HTTP del componente.
 * El componente solo maneja UI + sanitización.
 * Cumple principio de responsabilidad única.
 */

export default function RegistroTurnoForm() {
    const [nombre, setNombre] = useState("");
    const [cedula, setCedula] = useState("");

    const { registrar, loading, success, error } = useRegistroTurno();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nombreSeguro = sanitizeText(nombre);
        const cedulaSegura = sanitizeText(cedula);

        if (!nombreSeguro || !cedulaSegura) return;

        await registrar({ nombre: nombreSeguro, cedula: cedulaSegura });
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Registro de Paciente</h2>

            <input
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={styles.input}
            />

            <input
                type="text"
                placeholder="Cédula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className={styles.input}
            />

            <button disabled={loading} className={styles.button}>
                {loading ? "Enviando..." : "Registrar turno"}
            </button>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
}
