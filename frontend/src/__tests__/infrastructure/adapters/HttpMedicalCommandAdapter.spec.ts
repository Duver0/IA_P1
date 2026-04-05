/**
 * @jest-environment jsdom
 */
import { HttpMedicalCommandAdapter } from "@/infrastructure/adapters/HttpMedicalCommandAdapter";
import * as cookieUtils from "@/infrastructure/cookies/cookieUtils";

jest.mock("@/infrastructure/cookies/cookieUtils");

const mockedGetCookie = cookieUtils.getAuthCookie as jest.MockedFunction<typeof cookieUtils.getAuthCookie>;
const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

describe("HttpMedicalCommandAdapter", () => {
  const BASE = "http://localhost:3000";
  let adapter: HttpMedicalCommandAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new HttpMedicalCommandAdapter(BASE);
    mockedGetCookie.mockReturnValue("jwt-token");
  });

  it("assignConsultorio sends POST command and returns default accepted message", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await adapter.assignConsultorio("C1");

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/medicos/consultorio/asignar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      body: JSON.stringify({ consultorioId: "C1" }),
    });
    expect(result).toEqual({ status: "accepted", message: "Comando aceptado" });
  });

  it("setDisponibilidad returns backend message when available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Actualizado" }),
    } as Response);

    const result = await adapter.setDisponibilidad(false);

    expect(result).toEqual({ status: "accepted", message: "Actualizado" });
  });

  it("startAttention sends patient payload to backend", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Inicio aceptado" }),
    } as Response);

    const result = await adapter.startAttention({
      pacienteNombre: "Ana",
      pacienteDocumento: "10203040",
    });

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/medicos/atencion/iniciar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      body: JSON.stringify({
        pacienteNombre: "Ana",
        pacienteDocumento: "10203040",
      }),
    });
    expect(result).toEqual({ status: "accepted", message: "Inicio aceptado" });
  });

  it("finalizeAttention and releaseConsultorio send POST without body payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "OK" }),
    } as Response);

    await adapter.finalizeAttention();
    await adapter.releaseConsultorio();

    expect(mockFetch).toHaveBeenNthCalledWith(1, `${BASE}/medicos/atencion/finalizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      body: undefined,
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, `${BASE}/medicos/consultorio/liberar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      body: undefined,
    });
  });

  it("throws when there is no auth cookie in command endpoints", async () => {
    mockedGetCookie.mockReturnValue(null);

    await expect(adapter.assignConsultorio("C1")).rejects.toThrow("Sesion no valida. Inicia sesion nuevamente.");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws backend error message when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Comando invalido" }),
    } as Response);

    await expect(adapter.setDisponibilidad(true)).rejects.toThrow("Comando invalido");
  });

  it("throws fallback HTTP status when response is not ok and body is not parseable", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response);

    await expect(adapter.finalizeAttention()).rejects.toThrow("Error HTTP 503");
  });

  it("getConsultorioState returns parsed state and encodes consultorioId", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        consultorioId: "C 1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: 10,
      }),
    } as Response);

    const result = await adapter.getConsultorioState("C 1");

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/medicos/consultorio/estado/C%201`, {
      method: "GET",
      headers: {
        Authorization: "Bearer jwt-token",
      },
    });
    expect(result).toEqual({
      consultorioId: "C 1",
      medicoId: "DOC-1",
      estado: "EnAtencion",
      patientId: "123",
      timestamp: 10,
    });
  });

  it("getConsultorioState throws when there is no token", async () => {
    mockedGetCookie.mockReturnValue(null);

    await expect(adapter.getConsultorioState("C1")).rejects.toThrow("Sesion no valida. Inicia sesion nuevamente.");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getConsultorioState throws when response is not ok or payload is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "x" }),
    } as Response);

    await expect(adapter.getConsultorioState("C1")).rejects.toThrow(
      "No fue posible consultar el estado inicial del consultorio C1",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("broken json");
      },
    } as unknown as Response);

    await expect(adapter.getConsultorioState("C2")).rejects.toThrow(
      "No fue posible consultar el estado inicial del consultorio C2",
    );
  });
});
