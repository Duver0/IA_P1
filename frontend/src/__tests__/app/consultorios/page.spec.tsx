import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConsultoriosOpsPage from "@/app/consultorios/page";
import type { RealTimeCallbacks } from "@/domain/ports/RealTimeProvider";

const mockPush = jest.fn();
const mockRealTimeConnect = jest.fn();
const mockRealTimeDisconnect = jest.fn();
let realtimeCallbacks: RealTimeCallbacks | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/providers/DependencyProvider", () => ({
  useDeps: jest.fn(),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "@/providers/AuthProvider";
import { useDeps } from "@/providers/DependencyProvider";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDeps = useDeps as jest.MockedFunction<typeof useDeps>;
const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

const getUrl = (input: RequestInfo | URL): string =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : typeof Request !== "undefined" && input instanceof Request
        ? input.url
        : String(input);

describe("ConsultoriosOpsPage", () => {
  const findEnabledReleaseButton = async (): Promise<HTMLButtonElement> => {
    await screen.findByText("Consultorio C1");

    const releaseButtons = await screen.findAllByRole("button", {
      name: "Liberar",
    });
    const enabledReleaseButton = releaseButtons.find(
      (button) => !button.hasAttribute("disabled"),
    );

    if (!enabledReleaseButton) {
      throw new Error("No se encontro un boton Liberar habilitado");
    }

    return enabledReleaseButton as HTMLButtonElement;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    document.cookie = "auth_token=jwt-token";
    realtimeCallbacks = null;

    mockRealTimeConnect.mockImplementation((callbacks: RealTimeCallbacks) => {
      realtimeCallbacks = callbacks;
      callbacks.onConnect();
    });
    mockRealTimeDisconnect.mockImplementation(() => {
      realtimeCallbacks = null;
    });

    mockUseDeps.mockReturnValue({
      ticketWriter: { createTicket: jest.fn() },
      ticketReader: { getTickets: jest.fn() },
      realTime: {
        connect: mockRealTimeConnect,
        disconnect: mockRealTimeDisconnect,
        isConnected: jest.fn().mockReturnValue(true),
      },
      audio: { init: jest.fn(), unlock: jest.fn(), play: jest.fn(), isEnabled: jest.fn() },
      sanitizer: { sanitize: jest.fn((value: string) => value) },
      authService: {
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
      },
    });

    mockUseAuth.mockReturnValue({
      user: { id: "EMP-1", email: "emp@example.com", name: "Empleado", role: "employee" },
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: true,
      hasRole: jest.fn((role) => role === "employee"),
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = getUrl(input);

      if (url.endsWith("/liberar")) {
        return {
          ok: true,
          json: async () => ({ message: "Comando en proceso: liberar consultorio" }),
        } as Response;
      }

      const match = url.match(/\/consultorios\/([^/]+)\/estado$/);
      if (match) {
        const consultorioId = decodeURIComponent(match[1]);
        return {
          ok: true,
          json: async () => ({
            consultorioId,
            medicoId: consultorioId === "C1" ? "DOC-1" : null,
            medicoNombre: consultorioId === "C1" ? "Dra. Catalina Suarez" : null,
            estado: consultorioId === "C1" ? "ConMedicoNoDisponible" : "SinMedico",
            patientId: null,
            timestamp: 1710000000,
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });
  });

  it("renderiza la ruta dedicada de gestion de consultorios", async () => {
    render(<ConsultoriosOpsPage />);

    expect(
      await screen.findByRole("heading", { name: "Gestion rapida de consultorios" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Consultorio C1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/actualizado:/i)).not.toBeInTheDocument();
    expect(screen.getByText("Medico: Dra. Catalina Suarez")).toBeInTheDocument();

    const releaseButtons = await screen.findAllByRole("button", {
      name: "Liberar",
    });
    expect(releaseButtons.length).toBeGreaterThan(0);
  });

  it("sincroniza cambios de consultorio por evento en tiempo real", async () => {
    let c1State = {
      consultorioId: "C1",
      medicoId: "DOC-1",
      medicoNombre: "Dra. Inicial",
      estado: "ConMedicoNoDisponible",
      patientId: null,
      timestamp: 1710000000,
    };

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = getUrl(input);

      if (url.endsWith("/liberar")) {
        return {
          ok: true,
          json: async () => ({ message: "Comando en proceso: liberar consultorio" }),
        } as Response;
      }

      const match = url.match(/\/consultorios\/([^/]+)\/estado$/);
      if (match) {
        const consultorioId = decodeURIComponent(match[1]);
        if (consultorioId === "C1") {
          return {
            ok: true,
            json: async () => c1State,
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            consultorioId,
            medicoId: null,
            medicoNombre: null,
            estado: "SinMedico",
            patientId: null,
            timestamp: 1710000000,
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    render(<ConsultoriosOpsPage />);

    expect(await screen.findByText("Estado: No disponible")).toBeInTheDocument();
    expect(screen.getByText("Medico: Dra. Inicial")).toBeInTheDocument();

    c1State = {
      ...c1State,
      medicoNombre: "Dr. Actualizado",
      estado: "ConMedicoDisponible",
      timestamp: 1710001000,
    };

    await act(async () => {
      realtimeCallbacks?.onConsultorioUpdated?.({
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: 1710001000,
      });
      await Promise.resolve();
    });

    expect(await screen.findByText("Estado: Disponible")).toBeInTheDocument();
    expect(screen.getByText("Medico: Dr. Actualizado")).toBeInTheDocument();
  });

  it("libera un consultorio desde la ruta operativa", async () => {
    render(<ConsultoriosOpsPage />);

    const releaseButton = await findEnabledReleaseButton();
    fireEvent.click(releaseButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/consultorios/C1/liberar"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(
      await screen.findByText("Comando en proceso: liberar consultorio"),
    ).toBeInTheDocument();
  });

  it("muestra mensaje idempotente al intentar liberar ocupados cuando no hay bloqueados", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = getUrl(input);
      const match = url.match(/\/consultorios\/([^/]+)\/estado$/);

      if (match) {
        const consultorioId = decodeURIComponent(match[1]);
        return {
          ok: true,
          json: async () => ({
            consultorioId,
            medicoId: null,
            estado: "SinMedico",
            patientId: null,
            timestamp: 1710000000,
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ message: "Comando en proceso: liberar consultorio" }),
      } as Response;
    });

    render(<ConsultoriosOpsPage />);

    const bulkReleaseButton = await screen.findByRole("button", {
      name: "Liberar ocupados",
    });

    await waitFor(() => {
      expect(bulkReleaseButton).not.toHaveAttribute("disabled");
    });

    fireEvent.click(bulkReleaseButton);

    expect(
      await screen.findByText("No hay consultorios ocupados para liberar."),
    ).toBeInTheDocument();
  });
});
