import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServedDashboard from "@/app/dashboard/page";
import {
  buildTicket,
  mockRealTimeProvider,
  mockAudioNotifier,
  mockTicketWriter,
  mockTicketReader,
  mockSanitizer,
  mockAuthService,
} from "@/__tests__/mocks/factories";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/providers/DependencyProvider", () => ({
  useDeps: jest.fn(),
}));

jest.mock("@/hooks/useTicketsWebSocket", () => ({
  useTicketsWebSocket: jest.fn(),
}));

jest.mock("@/hooks/useAudioNotification", () => ({
  useAudioNotification: jest.fn(),
}));

import { useDeps } from "@/providers/DependencyProvider";
import { useTicketsWebSocket } from "@/hooks/useTicketsWebSocket";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useAuth } from "@/providers/AuthProvider";

const mockUseDeps = useDeps as jest.MockedFunction<typeof useDeps>;
const mockUseTicketsWebSocket = useTicketsWebSocket as jest.MockedFunction<
  typeof useTicketsWebSocket
>;
const mockUseAudioNotification = useAudioNotification as jest.MockedFunction<
  typeof useAudioNotification
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const formatAsUiTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function setupMocks(options: {
  tickets?: ReturnType<typeof buildTicket>[];
  connected?: boolean;
  error?: string | null;
  audioEnabled?: boolean;
  showToast?: boolean;
  toastMessage?: string;
}) {
  mockUseDeps.mockReturnValue({
    ticketWriter: mockTicketWriter(),
    ticketReader: mockTicketReader(),
    realTime: mockRealTimeProvider(),
    audio: mockAudioNotifier(),
    sanitizer: mockSanitizer(),
    authService: mockAuthService(),
  });

  mockUseTicketsWebSocket.mockReturnValue({
    tickets: options.tickets ?? [],
    connected: options.connected ?? false,
    error: options.error ?? null,
  });

  mockUseAudioNotification.mockReturnValue({
    audioEnabled: options.audioEnabled ?? false,
    showToast: options.showToast ?? false,
    toastMessage: options.toastMessage ?? "",
    notify: jest.fn(),
  });
}

describe("ServedDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "1", email: "a@a.com", name: "Test", role: "admin" },
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: true,
      hasRole: jest.fn(() => true),
    });
    setupMocks({});
  });

  it("renders page heading", () => {
    render(<ServedDashboard />);

    expect(screen.getByRole("heading", { name: "Historial" })).toBeInTheDocument();
  });

  it("shows disconnected indicator when not connected", () => {
    render(<ServedDashboard />);

    expect(
      screen.getByText(/Desconectado — reconectando\.\.\./i)
    ).toBeInTheDocument();
  });

  it("shows connected indicator when connected", () => {
    setupMocks({ connected: true });

    render(<ServedDashboard />);

    expect(
      screen.getByText(/Conectado en tiempo real/i)
    ).toBeInTheDocument();
  });

  it("shows audio hint when audio is disabled", () => {
    render(<ServedDashboard />);

    expect(
      screen.getByText(/Toca la pantalla para habilitar el sonido/i)
    ).toBeInTheDocument();
  });

  it("shows empty state when there are no served tickets", () => {
    const waitingTicket = buildTicket({ status: "waiting" });
    setupMocks({ tickets: [waitingTicket] });

    render(<ServedDashboard />);

    expect(
      screen.getByText("No hay turnos atendidos")
    ).toBeInTheDocument();
  });

  it("renders error message when error is present", () => {
    setupMocks({ error: "Real-time error" });

    render(<ServedDashboard />);

    expect(screen.getByText("Real-time error")).toBeInTheDocument();
  });

  it("renders served tickets with name and office", () => {
    const consultationStart = new Date("2026-02-24T10:30:00").getTime();
    const consultationEnd = consultationStart + (12 * 60 + 30) * 1000;
    const ticket = buildTicket({
      status: "served",
      office: "B2",
      timestamp: consultationStart,
      consultationEndedAt: consultationEnd,
    });
    setupMocks({ tickets: [ticket] });

    render(<ServedDashboard />);

    expect(screen.getByText(ticket.name)).toBeInTheDocument();
    expect(screen.getByText("Consultorio B2")).toBeInTheDocument();
    expect(
      screen.getByText(`Inicio: ${formatAsUiTime(consultationStart)}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Fin: ${formatAsUiTime(consultationEnd)}`)
    ).toBeInTheDocument();
    expect(screen.getByText("Tiempo en consulta: 12m 30s")).toBeInTheDocument();
  });

  it("does not render waiting or called tickets", () => {
    const waiting = buildTicket({ status: "waiting" });
    const called = buildTicket({ status: "called" });
    setupMocks({ tickets: [waiting, called] });

    render(<ServedDashboard />);

    expect(screen.queryByText(waiting.name)).not.toBeInTheDocument();
    expect(screen.queryByText(called.name)).not.toBeInTheDocument();
  });

  it("shows served count in section heading", () => {
    const tickets = [
      buildTicket({ status: "served", office: "A1" }),
      buildTicket({ status: "served", office: "A2" }),
    ];
    setupMocks({ tickets });

    render(<ServedDashboard />);

    expect(screen.getByText(/Historial \(2\)/i)).toBeInTheDocument();
  });

  it("paginates served ticket history and allows page navigation", async () => {
    const user = userEvent.setup();
    const baseTime = new Date("2026-02-24T10:30:00").getTime();
    const tickets = Array.from({ length: 11 }, (_, index) =>
      buildTicket({
        status: "served",
        name: `Paciente ${index + 1}`,
        office: `C${(index % 5) + 1}`,
        timestamp: baseTime + index * 1000,
        consultationEndedAt: baseTime + index * 1000 + 2000,
      }),
    );

    setupMocks({ tickets });

    render(<ServedDashboard />);

    expect(screen.getByText("Pagina 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1-10 de 11")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
    expect(screen.getByText("Paciente 11")).toBeInTheDocument();
    expect(screen.queryByText("Paciente 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Pagina 2 de 2")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 11-11 de 11")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByText("Paciente 1")).toBeInTheDocument();
    expect(screen.queryByText("Paciente 11")).not.toBeInTheDocument();
  });

  it("renders toast when showToast is true", () => {
    setupMocks({ showToast: true, toastMessage: "✅ Turno completado" });

    render(<ServedDashboard />);

    expect(screen.getByText("✅ Turno completado")).toBeInTheDocument();
  });

  it("[Validate] redirects to /signin when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: false,
      hasRole: jest.fn(() => false),
    });

    render(<ServedDashboard />);

    expect(mockPush).toHaveBeenCalledWith("/signin");
  });

  it("[Validate] does not render content when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: false,
      hasRole: jest.fn(() => false),
    });

    render(<ServedDashboard />);

    expect(screen.queryByRole("heading", { name: "Historial" })).not.toBeInTheDocument();
  });

  it("calls notify when served ticket count increases after initialization", () => {
    const notify = jest.fn();

    mockUseDeps.mockReturnValue({
      ticketWriter: mockTicketWriter(),
      ticketReader: mockTicketReader(),
      realTime: mockRealTimeProvider(),
      audio: mockAudioNotifier(),
      sanitizer: mockSanitizer(),
      authService: mockAuthService(),
    });

    mockUseAudioNotification.mockReturnValue({
      audioEnabled: false,
      showToast: false,
      toastMessage: "",
      notify,
    });

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [],
      connected: false,
      error: null,
    });

    const { rerender } = render(<ServedDashboard />);

    const t1 = buildTicket({ status: "served", office: "A1" });
    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<ServedDashboard />);

    const t2 = buildTicket({ status: "served", office: "A2" });
    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1, t2],
      connected: false,
      error: null,
    });
    rerender(<ServedDashboard />);

    expect(notify).toHaveBeenCalledWith("✅ Turno completado");
  });

  it("does not call notify when served count does not increase after initialization", () => {
    const notify = jest.fn();

    mockUseDeps.mockReturnValue({
      ticketWriter: mockTicketWriter(),
      ticketReader: mockTicketReader(),
      realTime: mockRealTimeProvider(),
      audio: mockAudioNotifier(),
      sanitizer: mockSanitizer(),
      authService: mockAuthService(),
    });

    mockUseAudioNotification.mockReturnValue({
      audioEnabled: false,
      showToast: false,
      toastMessage: "",
      notify,
    });

    const t1 = buildTicket({ status: "served", office: "A1" });

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [],
      connected: false,
      error: null,
    });

    const { rerender } = render(<ServedDashboard />);

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<ServedDashboard />);

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<ServedDashboard />);

    expect(notify).not.toHaveBeenCalled();
  });
});
