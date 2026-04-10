import React from "react";
import { render, screen } from "@testing-library/react";
import TicketsScreen from "@/app/page";
import {
  buildTicket,
  mockRealTimeProvider,
  mockAudioNotifier,
  mockTicketWriter,
  mockTicketReader,
  mockSanitizer,
  mockAuthService,
} from "@/__tests__/mocks/factories";

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

const mockUseDeps = useDeps as jest.MockedFunction<typeof useDeps>;
const mockUseTicketsWebSocket = useTicketsWebSocket as jest.MockedFunction<
  typeof useTicketsWebSocket
>;
const mockUseAudioNotification = useAudioNotification as jest.MockedFunction<
  typeof useAudioNotification
>;

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

describe("TicketsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks({});
  });

  it("renders page heading", () => {
    render(<TicketsScreen />);

    expect(screen.getByText("Turnos Habilitados")).toBeInTheDocument();
  });

  it("shows disconnected indicator when not connected", () => {
    render(<TicketsScreen />);

    expect(
      screen.getByText(/Desconectado — reconectando\.\.\./i)
    ).toBeInTheDocument();
  });

  it("shows connected indicator when connected", () => {
    setupMocks({ connected: true });

    render(<TicketsScreen />);

    expect(
      screen.getByText(/Conectado en tiempo real/i)
    ).toBeInTheDocument();
  });

  it("shows audio hint when audio is disabled", () => {
    setupMocks({ audioEnabled: false });

    render(<TicketsScreen />);

    expect(
      screen.getByText(/Toca la pantalla para habilitar el sonido/i)
    ).toBeInTheDocument();
  });

  it("hides audio hint when audio is enabled", () => {
    setupMocks({ audioEnabled: true });

    render(<TicketsScreen />);

    expect(
      screen.queryByText(/Toca la pantalla para habilitar el sonido/i)
    ).not.toBeInTheDocument();
  });

  it("shows empty state when there are no tickets", () => {
    setupMocks({ tickets: [] });

    render(<TicketsScreen />);

    expect(
      screen.getByText("No hay turnos registrados")
    ).toBeInTheDocument();
  });

  it("renders error message when error is present", () => {
    setupMocks({ error: "Connection lost" });

    render(<TicketsScreen />);

    expect(screen.getByText("Connection lost")).toBeInTheDocument();
  });

  it("renders called tickets section", () => {
    const ticket = buildTicket({
      status: "called",
      office: "A1",
      doctorName: "Dra. Laura Rojas",
    });
    setupMocks({ tickets: [ticket] });

    render(<TicketsScreen />);

    expect(screen.getByText("En llamado")).toBeInTheDocument();
    expect(screen.getByText(ticket.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Orden de atención 1")).toBeInTheDocument();
    expect(screen.getByText(`Cédula ${ticket.documentId}`)).toBeInTheDocument();
    expect(screen.getByText("Consultorio A1")).toBeInTheDocument();
    expect(screen.getByText("Médico: Dra. Laura Rojas")).toBeInTheDocument();
  });

  it("renders waiting tickets section", () => {
    const ticket = buildTicket({ status: "waiting" });
    setupMocks({ tickets: [ticket] });

    render(<TicketsScreen />);

    expect(screen.getByText("En espera")).toBeInTheDocument();
    expect(screen.getByText(ticket.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Orden de atención 1")).toBeInTheDocument();
    expect(screen.getByText(`Cédula ${ticket.documentId}`)).toBeInTheDocument();
  });

  it("keeps queue numbering across called and waiting sections", () => {
    const calledTicket = buildTicket({
      status: "called",
      timestamp: 170000001,
      office: "B4",
      doctorName: "Dr. Camilo Ruiz",
    });
    const waitingTicket = buildTicket({
      status: "waiting",
      timestamp: 170000002,
    });
    setupMocks({ tickets: [calledTicket, waitingTicket] });

    render(<TicketsScreen />);

    expect(screen.getByLabelText("Orden de atención 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Orden de atención 2")).toBeInTheDocument();
  });

  it("shows two-word called patient names in stacked format", () => {
    const ticket = buildTicket({
      status: "called",
      name: "Laura Maria",
      office: "C1",
      doctorName: "Dr. Andres Perez",
    });
    setupMocks({ tickets: [ticket] });

    render(<TicketsScreen />);

    expect(screen.getByText(/Laura\s+Maria/)).toBeInTheDocument();
    expect(screen.getByText("Consultorio C1")).toBeInTheDocument();
    expect(screen.getByText("Médico: Dr. Andres Perez")).toBeInTheDocument();
  });

  it("truncates long waiting names with three dots", () => {
    const longName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const truncatedName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1...";
    const ticket = buildTicket({ status: "waiting", name: longName });
    setupMocks({ tickets: [ticket], connected: true, audioEnabled: true });

    render(<TicketsScreen />);

    expect(screen.getByText(truncatedName)).toBeInTheDocument();
    expect(screen.queryByText(longName)).not.toBeInTheDocument();
  });

  it("truncates long doctor names with three dots", () => {
    const longDoctorName = "DoctorConNombreMuyLargoParaVisualizacionCompleta";
    const ticket = buildTicket({
      status: "called",
      office: "A9",
      doctorName: longDoctorName,
    });
    setupMocks({ tickets: [ticket], connected: true, audioEnabled: true });

    render(<TicketsScreen />);

    expect(screen.getByText("Médico: DoctorConNombreMuyLargoParaVisu...")).toBeInTheDocument();
    expect(
      screen.queryByText(`Médico: ${longDoctorName}`)
    ).not.toBeInTheDocument();
  });

  it("renders toast when showToast is true", () => {
    setupMocks({ showToast: true, toastMessage: "🔔 Nuevo turno llamado" });

    render(<TicketsScreen />);

    expect(screen.getByText("🔔 Nuevo turno llamado")).toBeInTheDocument();
  });

  it("does not render toast when showToast is false", () => {
    setupMocks({ showToast: false });

    render(<TicketsScreen />);

    expect(
      screen.queryByText("🔔 Nuevo turno llamado")
    ).not.toBeInTheDocument();
  });

  it("calls notify when a ticket changes to called after initialization", () => {
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

    const { rerender } = render(<TicketsScreen />);

    const t1 = buildTicket({ status: "waiting" });
    const t1Called = {
      ...t1,
      status: "called" as const,
      office: "C2",
      doctorName: "Dr. Mateo Perez",
    };

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1Called],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    expect(notify).toHaveBeenCalledWith("🔔 Turno llamado a consultorio");
  });

  it("does not call notify when only waiting tickets increase", () => {
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

    const t1 = buildTicket({ status: "waiting" });

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [],
      connected: false,
      error: null,
    });

    const { rerender } = render(<TicketsScreen />);

    const t2 = buildTicket({ status: "waiting" });
    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1, t2],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    expect(notify).not.toHaveBeenCalled();
  });
});
