import type { AuthService } from "@/domain/ports/AuthService";
import type { AuthCredentials, SignUpData, AuthResult } from "@/domain/AuthCredentials";
import type { User, UserRole } from "@/domain/User";
import { httpPost } from "@/infrastructure/http/httpClient";
import { toAuthResult, toUser } from "@/infrastructure/mappers/authMapper";
import { setAuthCookie, getAuthCookie, removeAuthCookie } from "@/infrastructure/cookies/cookieUtils";

// Mapa inverso: dominio inglés → backend español
const ROLE_TO_BACKEND: Record<UserRole, string> = {
  admin: "admin",
  employee: "empleado",
  medico: "medico",
};

interface BackendAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  usuario?: { id: string; email: string; nombre: string; rol: string };
}

interface BackendUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

const SIGN_IN_GENERIC_ERROR_MESSAGE =
  "error al iniciar sesion valida correo o contraseña e intenta de nuevo";

// Adaptador HTTP real que conecta con los endpoints del backend producer.
export class HttpAuthAdapter implements AuthService {
  constructor(private readonly baseUrl: string) {}

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const raw = await httpPost<BackendAuthResponse>(
        `${this.baseUrl}/auth/signIn`,
        { email: credentials.email, password: credentials.password },
      );

      const result = toAuthResult(raw);

      if (!result.success) {
        return {
          ...result,
          message: SIGN_IN_GENERIC_ERROR_MESSAGE,
        };
      }

      if (raw.success && raw.token) {
        setAuthCookie(raw.token);
      }

      return result;
    } catch (_err: unknown) {
      return { success: false, message: SIGN_IN_GENERIC_ERROR_MESSAGE };
    }
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const raw = await httpPost<BackendAuthResponse>(
        `${this.baseUrl}/auth/signUp`,
        {
          email: data.email,
          password: data.password,
          nombre: data.name,
          rol: ROLE_TO_BACKEND[data.role] ?? "empleado",
        },
      );
      // No se setea cookie en signup; el user se redirige a signIn.
      return toAuthResult(raw);
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Error en registro" };
    }
  }

  async signOut(): Promise<void> {
    try {
      await httpPost(`${this.baseUrl}/auth/signOut`, {});
    } catch {
      // Ignorar — la cookie se limpia igual
    }
    removeAuthCookie();
  }

  async getSession(): Promise<User | null> {
    const token = getAuthCookie();
    if (!token) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        removeAuthCookie();
        return null;
      }
      const raw: BackendUser = await res.json();
      return toUser(raw);
    } catch {
      removeAuthCookie();
      return null;
    }
  }
}
