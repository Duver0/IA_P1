import type { User, UserRole } from "@/domain/User";
import type { AuthResult } from "@/domain/AuthCredentials";

const AUTH_MESSAGE_TRANSLATIONS: Record<string, string> = {
  "Email already in use": "El correo ya está registrado.",
  "email already in use": "El correo ya está registrado.",
};

export function translateAuthMessage(message: string): string {
  return AUTH_MESSAGE_TRANSLATIONS[message] ?? message;
}

interface BackendUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface BackendAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  usuario?: BackendUser;
}

const ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  empleado: "employee",
  medico: "medico",
};

export function toUser(raw: BackendUser): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.nombre,
    role: ROLE_MAP[raw.rol] ?? "employee",
  };
}

export function toAuthResult(raw: BackendAuthResponse): AuthResult {
  return {
    success: raw.success,
    message: translateAuthMessage(raw.message),
    token: raw.token,
    user: raw.usuario ? toUser(raw.usuario) : undefined,
  };
}
