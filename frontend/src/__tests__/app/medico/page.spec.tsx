import React from "react";
import MedicoPage from "@/app/medico/page";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockGetSearchParam = jest.fn();
const mockAssignConsultorio = jest.fn().mockResolvedValue({ status: "accepted", message: "ok" });
const mockSetDisponibilidad = jest.fn().mockResolvedValue({ status: "accepted", message: "ok" });
const mockFinalizeAttention = jest.fn().mockResolvedValue({ status: "accepted", message: "ok" });
const mockReleaseConsultorio = jest.fn().mockResolvedValue({ status: "accepted", message: "ok" });
const mockGetConsultorioState = jest.fn();
const mockRefreshState = jest.fn().mockResolvedValue({
  consultorioId: "C1",
  estado: "ConMedicoDisponible",
  patientId: null,
  timestamp: Date.now(),
});

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

jest.mock("@/components/AuthGuard/AuthGuard", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/useConsultorioRealtime", () => ({
  useConsultorioRealtime: jest.fn(),
}));

jest.mock("@/providers/DependencyProvider", () => ({
  useDeps: jest.fn(),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/infrastructure/adapters/HttpMedicalCommandAdapter", () => ({
  HttpMedicalCommandAdapter: jest.fn().mockImplementation(() => ({
    assignConsultorio: mockAssignConsultorio,
    setDisponibilidad: mockSetDisponibilidad,
    finalizeAttention: mockFinalizeAttention,
    releaseConsultorio: mockReleaseConsultorio,
    getConsultorioState: mockGetConsultorioState,
  })),
}));

import { useDeps } from "@/providers/DependencyProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useConsultorioRealtime } from "@/hooks/useConsultorioRealtime";

const mockUseDeps = useDeps as jest.MockedFunction<typeof useDeps>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseConsultorioRealtime = useConsultorioRealtime as jest.MockedFunction<
  typeof useConsultorioRealtime
>;

describe("MedicoPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "5";
    mockGetSearchParam.mockImplementation((key: string) =>
      key === "consultorioId" ? "C2" : null,
    );
    mockGetConsultorioState.mockImplementation(async (consultorioId: string) => ({
      consultorioId,
      medicoId: null,
      estado: "SinMedico",
      patientId: null,
      timestamp: Date.now(),
    }));

    mockUseDeps.mockReturnValue({
      ticketWriter: { createTicket: jest.fn() },
      ticketReader: { getTickets: jest.fn() },
      realTime: { connect: jest.fn(), disconnect: jest.fn(), isConnected: jest.fn() },
      audio: { init: jest.fn(), unlock: jest.fn(), play: jest.fn(), isEnabled: jest.fn() },
      sanitizer: { sanitize: jest.fn((input: string) => input.trim()) },
      authService: { signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(), getSession: jest.fn() },
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: "DOC-1",
        email: "medico@example.com",
        name: "Medico",
        role: "medico",
      },
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: true,
      hasRole: jest.fn().mockReturnValue(true),
    });

    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: "DOC-1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });
  });

  it("muestra estado protagonista junto con paciente y acciones", async () => {
    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pausar atencion/i })).toBeInTheDocument();
    });

    const accionPrincipal = screen.getByRole("button", { name: /pausar atencion/i });
    const estado = screen.getByText(/estado del consultorio/i);
    const paciente = screen.getByRole("heading", { name: /paciente actual/i });
    const estadoPrincipal = screen.getByRole("heading", {
      level: 2,
      name: /^disponible$/i,
    });

    expect(accionPrincipal).toBeInTheDocument();
    expect(estado).toBeInTheDocument();
    expect(paciente).toBeInTheDocument();
    expect(estadoPrincipal).toBeInTheDocument();
  });

  it("muestra selector enumerado de consultorios según la cantidad configurada", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "3";
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox", { name: /consultorio/i });
    expect(select).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/consultorio \(ej: c1\)/i)).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "C1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "C2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "C3" })).toBeInTheDocument();
  });

  it("filtra del selector los consultorios asignados a otros medicos", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "4";
    mockGetConsultorioState.mockImplementation(async (consultorioId: string) => {
      if (consultorioId === "C2") {
        return {
          consultorioId,
          medicoId: "DOC-2",
          estado: "ConMedicoDisponible",
          patientId: null,
          timestamp: Date.now(),
        };
      }

      if (consultorioId === "C3") {
        return {
          consultorioId,
          medicoId: "DOC-3",
          estado: "ConMedicoNoDisponible",
          patientId: null,
          timestamp: Date.now(),
        };
      }

      return {
        consultorioId,
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      };
    });
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "C1" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "C4" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("option", { name: "C2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "C3" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /consultorio/i })).toHaveValue("C1");
  });

  it("envía el consultorio seleccionado al asignar", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "4";
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: /consultorio/i }), {
      target: { value: "C4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /tomar consultorio/i }));

    await waitFor(() => {
      expect(mockAssignConsultorio).toHaveBeenCalledWith("C4");
    });
  });

  it("bloquea selección de otro consultorio cuando el médico ya tiene uno asignado", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "3";
    mockGetSearchParam.mockImplementation((key: string) =>
      key === "consultorioId" ? "C1" : null,
    );
    mockGetConsultorioState.mockImplementation(async (consultorioId: string) => {
      if (consultorioId === "C2") {
        return {
          consultorioId,
          medicoId: "DOC-1",
          estado: "ConMedicoDisponible",
          patientId: null,
          timestamp: Date.now(),
        };
      }

      return {
        consultorioId,
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      };
    });

    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C1");
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C2");
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C3");
    });

    expect(screen.queryByRole("combobox", { name: /consultorio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tomar consultorio/i })).not.toBeInTheDocument();
  });

  it("usa el primer consultorio cuando el query param no existe en la enumeración", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "2";
    mockGetSearchParam.mockReturnValue("C9");
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: /consultorio/i })).toHaveValue("C1");
  });

  it("si el consultorio está sin médico muestra solo asignación", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: null,
        estado: "SinMedico",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tomar consultorio/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /estoy disponible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pausar atencion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /finalizar atencion/i })).not.toBeInTheDocument();
    expect(mockSetDisponibilidad).not.toHaveBeenCalled();
  });

  it("si está ConMedicoDisponible muestra solo Pausar atencion", () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    expect(screen.queryByRole("combobox", { name: /consultorio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tomar consultorio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /estoy disponible/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pausar atencion/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /finalizar atencion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salir del consultorio/i })).not.toBeInTheDocument();
    expect(screen.getByText("Esperando paciente")).toBeInTheDocument();
    expect(screen.getByText("Sin documento registrado")).toBeInTheDocument();
  });

  it("si está EnAtencion muestra Pausar atencion y Finalizar atencion", () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Demo",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    expect(screen.queryByRole("button", { name: /estoy disponible/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pausar atencion/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finalizar atencion/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salir del consultorio/i })).not.toBeInTheDocument();
    expect(screen.getByText("Paciente actual")).toBeInTheDocument();
    expect(screen.getByText("Paciente Demo")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText(/atencion en curso/i)).toBeInTheDocument();
  });

  it("oculta nombre y documento real del paciente cuando no está en atención", () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: "Paciente Que No Debe Verse",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    expect(screen.getByText("Esperando paciente")).toBeInTheDocument();
    expect(screen.getByText("Sin documento registrado")).toBeInTheDocument();
    expect(screen.queryByText("Paciente Que No Debe Verse")).not.toBeInTheDocument();
  });

  it("muestra ayuda visual de pausa programada al pausar durante una atencion", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Demo",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    expect(screen.queryByText(/pausa programada:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pausar atencion/i }));

    await waitFor(() => {
      expect(mockSetDisponibilidad).toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      expect(
        screen
          .getAllByRole("status")
          .some((element) =>
            /pausa programada: al finalizar esta atencion no se asignaran mas pacientes/i.test(
              element.textContent ?? "",
            ),
          ),
      ).toBe(true);
    });
  });

  it("si está ConMedicoNoDisponible muestra solo Estoy disponible", () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    expect(screen.getByRole("button", { name: /estoy disponible/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salir del consultorio/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pausar atencion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /finalizar atencion/i })).not.toBeInTheDocument();
    expect(mockSetDisponibilidad).not.toHaveBeenCalled();
  });

  it("envía comando para salir del consultorio cuando la acción está disponible", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /salir del consultorio/i }));

    await waitFor(() => {
      expect(mockReleaseConsultorio).toHaveBeenCalledTimes(1);
      expect(mockRefreshState).toHaveBeenCalled();
    });
  });

  it("envía comando para finalizar atención cuando la acción está disponible", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Demo",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /finalizar atencion/i }));

    await waitFor(() => {
      expect(mockFinalizeAttention).toHaveBeenCalledTimes(1);
    });
  });

  it("envía comando para marcar disponible cuando el consultorio está pausado", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /estoy disponible/i }));

    await waitFor(() => {
      expect(mockSetDisponibilidad).toHaveBeenCalledWith(true);
    });
  });

  it("muestra estado de procesamiento mientras se ejecuta una acción", async () => {
    let resolveFinalize: ((value: { status: string; message: string }) => void) | null = null;
    const finalizePromise = new Promise<{ status: string; message: string }>((resolve) => {
      resolveFinalize = resolve;
    });
    mockFinalizeAttention.mockReturnValueOnce(finalizePromise);

    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Demo",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /finalizar atencion/i }));

    expect(screen.getByText(/procesando accion/i)).toBeInTheDocument();

    await act(async () => {
      resolveFinalize?.({ status: "accepted", message: "ok" });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/procesando accion/i)).not.toBeInTheDocument();
    });
  });

  it("muestra mensaje de error cuando falla una acción médica", async () => {
    mockFinalizeAttention.mockRejectedValueOnce(new Error("No fue posible finalizar"));

    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C1",
        medicoId: "DOC-1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Demo",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /finalizar atencion/i }));

    await waitFor(() => {
      expect(screen.getByText("No fue posible finalizar")).toBeInTheDocument();
    });
  });

  it("oculta la notificacion de comando despues de unos segundos", async () => {
    jest.useFakeTimers();

    try {
      mockReleaseConsultorio.mockResolvedValueOnce({
        status: "accepted",
        message: "Comando temporal",
      });

      mockUseConsultorioRealtime.mockReturnValue({
        consultorio: {
          consultorioId: "C1",
          medicoId: "DOC-1",
          estado: "ConMedicoNoDisponible",
          patientId: null,
          timestamp: Date.now(),
        },
        patientName: null,
        connected: true,
        error: null,
        refreshState: mockRefreshState,
      });

      render(<MedicoPage />);

      fireEvent.click(screen.getByRole("button", { name: /salir del consultorio/i }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Comando temporal")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByText("Comando temporal")).not.toBeInTheDocument();
    } finally {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    }
  });

  it("refresca consultorios disponibles al liberar aunque antes no hubiera selector", async () => {
    process.env.NEXT_PUBLIC_CONSULTORIOS_TOTAL = "3";
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C2",
        medicoId: "DOC-1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: Date.now(),
      },
      patientName: null,
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    fireEvent.click(screen.getByRole("button", { name: /salir del consultorio/i }));

    await waitFor(() => {
      expect(mockReleaseConsultorio).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C1");
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C2");
      expect(mockGetConsultorioState).toHaveBeenCalledWith("C3");
    });
  });

  it("oculta acciones de gestion cuando el consultorio pertenece a otro medico", async () => {
    mockUseConsultorioRealtime.mockReturnValue({
      consultorio: {
        consultorioId: "C3",
        medicoId: "DOC-2",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: Date.now(),
      },
      patientName: "Paciente Ajeno",
      connected: true,
      error: null,
      refreshState: mockRefreshState,
    });

    render(<MedicoPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: /consultorio/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /estoy disponible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pausar atencion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /finalizar atencion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salir del consultorio/i })).not.toBeInTheDocument();
    expect(screen.getByText(/lo esta usando otro medico/i)).toBeInTheDocument();
  });
});
