"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useDeps } from "@/providers/DependencyProvider";
import styles from "@/styles/SignUpForm.module.css";

type SignUpRole = "employee" | "medico";

export const WEAK_PASSWORD_MSG =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";
export const ROLE_REQUIRED_MSG = "Selecciona el tipo de usuario para continuar.";

export const SUCCESS_SIGNUP_MSG = "¡Cuenta creada exitosamente! Inicia sesión para continuar.";
export const SIGNUP_SUCCESS_KEY = "signup_success";

const STRONG_PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignUpRole | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const { signUp, loading, error } = useAuth();
  const { sanitizer } = useDeps();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const sanitizedName = sanitizer.sanitize(name);
    const sanitizedEmail = sanitizer.sanitize(email);
    const trimmedPassword = password.trim();
    if (!sanitizedName || !sanitizedEmail || !trimmedPassword) return;

    if (!role) {
      setFormError(ROLE_REQUIRED_MSG);
      return;
    }

    if (!STRONG_PASSWORD_RE.test(trimmedPassword)) {
      setFormError(WEAK_PASSWORD_MSG);
      return;
    }

    const ok = await signUp({
      name: sanitizedName,
      email: sanitizedEmail,
      password: trimmedPassword,
      role,
    });
    if (ok) {
      sessionStorage.setItem(SIGNUP_SUCCESS_KEY, SUCCESS_SIGNUP_MSG);
      router.push("/signin");
    }
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Crear cuenta</h2>
        {(formError || error) && <p role="alert" className={styles.error}>{formError ?? error}</p>}
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />
        <select
          aria-label="Tipo de usuario"
          value={role}
          onChange={(e) => setRole(e.target.value as SignUpRole | "")}
          className={styles.select}
        >
          <option value="">Selecciona tipo de usuario</option>
          <option value="employee">Empleado</option>
          <option value="medico">Médico</option>
        </select>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? "Registrando..." : "Registrarse"}
        </button>
        <p className={styles.footer}>
          ¿Ya tienes cuenta? <Link href="/signin">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
