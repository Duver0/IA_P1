"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useDeps } from "@/providers/DependencyProvider";
import { SIGNUP_SUCCESS_KEY } from "@/components/SignUpForm/SignUpForm";
import styles from "@/styles/SignInForm.module.css";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { signIn, loading, error, hasRole } = useAuth();
  const { sanitizer } = useDeps();
  const router = useRouter();

  useEffect(() => {
    const msg = sessionStorage.getItem(SIGNUP_SUCCESS_KEY);
    if (msg) {
      sessionStorage.removeItem(SIGNUP_SUCCESS_KEY);
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToast(msg);
      const id = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(id);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedEmail = sanitizer.sanitize(email);
    const trimmedPassword = password.trim();
    if (!sanitizedEmail || !trimmedPassword) return;

    const success = await signIn({ email: sanitizedEmail, password: trimmedPassword });
    if (success) {
      router.push(hasRole("medico") ? "/medico" : "/dashboard");
    }
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Iniciar sesión</h2>
        {toast && <p role="status" className={styles.success}>{toast}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
        <p className={styles.footer}>
          ¿No tienes cuenta? <Link href="/signup">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
