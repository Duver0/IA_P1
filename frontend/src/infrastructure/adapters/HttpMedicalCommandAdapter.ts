import type {
  ConsultorioStateResponse,
  MedicalCommandResult,
  MedicalCommandService,
} from "@/domain/ports/MedicalCommandService";
import { getAuthCookie } from "@/infrastructure/cookies/cookieUtils";

export class HttpMedicalCommandAdapter implements MedicalCommandService {
  constructor(private readonly baseUrl: string) {}

  async assignConsultorio(consultorioId: string): Promise<MedicalCommandResult> {
    return this.send("/medicos/consultorio/asignar", "POST", { consultorioId });
  }

  async setDisponibilidad(disponible: boolean): Promise<MedicalCommandResult> {
    return this.send("/medicos/disponibilidad", "PATCH", { disponible });
  }

  async startAttention(input: {
    pacienteNombre: string;
    pacienteDocumento: string;
  }): Promise<MedicalCommandResult> {
    return this.send("/medicos/atencion/iniciar", "POST", input);
  }

  async finalizeAttention(): Promise<MedicalCommandResult> {
    return this.send("/medicos/atencion/finalizar", "POST");
  }

  async releaseConsultorio(): Promise<MedicalCommandResult> {
    return this.send("/medicos/consultorio/liberar", "POST");
  }

  async releaseConsultorioByConsultorioId(
    consultorioId: string,
  ): Promise<MedicalCommandResult> {
    return this.send(
      `/consultorios/${encodeURIComponent(consultorioId)}/liberar`,
      "POST",
    );
  }

  async getConsultorioState(consultorioId: string): Promise<ConsultorioStateResponse> {
    const token = getAuthCookie();
    if (!token) {
      throw new Error("Sesion no valida. Inicia sesion nuevamente.");
    }

    const response = await fetch(
      `${this.baseUrl}/medicos/consultorio/estado/${encodeURIComponent(consultorioId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const raw = (await response.json().catch(() => null)) as ConsultorioStateResponse | null;

    if (!response.ok || !raw) {
      throw new Error(`No fue posible consultar el estado inicial del consultorio ${consultorioId}`);
    }

    return raw;
  }

  async getConsultorioStateForOps(
    consultorioId: string,
  ): Promise<ConsultorioStateResponse> {
    const token = getAuthCookie();
    if (!token) {
      throw new Error("Sesion no valida. Inicia sesion nuevamente.");
    }

    const response = await fetch(
      `${this.baseUrl}/consultorios/${encodeURIComponent(consultorioId)}/estado`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const raw = (await response.json().catch(() => null)) as
      | ConsultorioStateResponse
      | null;

    if (!response.ok || !raw) {
      throw new Error(`No fue posible consultar el estado operativo del consultorio ${consultorioId}`);
    }

    return raw;
  }

  private async send(
    path: string,
    method: "POST" | "PATCH",
    body?: unknown,
  ): Promise<MedicalCommandResult> {
    const token = getAuthCookie();
    if (!token) {
      throw new Error("Sesion no valida. Inicia sesion nuevamente.");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await response.json().catch(() => null) as
      | { message?: string; status?: string }
      | null;

    if (!response.ok) {
      throw new Error(raw?.message ?? `Error HTTP ${response.status}`);
    }

    return {
      status: "accepted",
      message: raw?.message ?? "Comando aceptado",
    };
  }
}