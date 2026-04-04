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
    const ticket = buildTicket({ status: "called", office: "A1" });
    setupMocks({ tickets: [ticket] });

    render(<TicketsScreen />);

    expect(screen.getByText("📢 Called")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${ticket.name}\\s*-\\s*Consultorio A1`, "i"))
    ).toBeInTheDocument();
  });

  it("renders waiting tickets section", () => {
    const ticket = buildTicket({ status: "waiting" });
    setupMocks({ tickets: [ticket] });

    render(<TicketsScreen />);

    expect(screen.getByText("⏳ Waiting")).toBeInTheDocument();
    expect(screen.getByText(ticket.name)).toBeInTheDocument();
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

  it("calls notify when ticket count increases after initialization", () => {
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
    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    const t2 = buildTicket({ status: "waiting" });
    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1, t2],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    expect(notify).toHaveBeenCalledWith("🔔 Nuevo turno llamado");
  });

  it("does not call notify when ticket count stays the same after initialization", () => {
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

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    mockUseTicketsWebSocket.mockReturnValue({
      tickets: [t1],
      connected: false,
      error: null,
    });
    rerender(<TicketsScreen />);

    expect(notify).not.toHaveBeenCalled();
  });
});
