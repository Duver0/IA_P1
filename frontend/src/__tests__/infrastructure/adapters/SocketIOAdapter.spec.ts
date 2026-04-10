const mockOn = jest.fn();
const mockDisconnect = jest.fn();
const mockConnected = jest.fn().mockReturnValue(false);

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: mockOn,
    disconnect: mockDisconnect,
    get connected() {
      return mockConnected();
    },
  })),
}));

jest.mock("@/infrastructure/mappers/ticketMapper", () => ({
  toDomainTicket: jest.fn((raw: unknown) => raw),
}));

jest.mock("@/infrastructure/mappers/consultorioRealtimeMapper", () => ({
  toConsultorioRealtimeEvent: jest.fn((raw: unknown) => raw),
}));

import { SocketIOAdapter } from "@/infrastructure/adapters/SocketIOAdapter";
import { io } from "socket.io-client";
import { toDomainTicket } from "@/infrastructure/mappers/ticketMapper";
import { toConsultorioRealtimeEvent } from "@/infrastructure/mappers/consultorioRealtimeMapper";
import type { RealTimeCallbacks } from "@/domain/ports/RealTimeProvider";

const mockedIo = io as jest.MockedFunction<typeof io>;

describe("SocketIOAdapter", () => {
  let adapter: SocketIOAdapter;
  let callbacks: jest.Mocked<RealTimeCallbacks>;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SocketIOAdapter("http://localhost:3000");
    callbacks = {
      onSnapshot: jest.fn(),
      onTicketUpdate: jest.fn(),
      onConsultorioUpdated: jest.fn(),
      onPatientAssigned: jest.fn(),
      onAttentionFinished: jest.fn(),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      onError: jest.fn(),
    };
  });

  it("connects to the correct namespace with websocket transport", () => {
    adapter.connect(callbacks);

    expect(mockedIo).toHaveBeenCalledWith(
      "http://localhost:3000/ws/turnos",
      expect.objectContaining({
        transports: ["websocket"],
        reconnection: true,
      })
    );
  });

  it("registers event handlers for all websocket events", () => {
    adapter.connect(callbacks);

    const registeredEvents = mockOn.mock.calls.map(
      ([event]: [string]) => event
    );
    expect(registeredEvents).toContain("connect");
    expect(registeredEvents).toContain("disconnect");
    expect(registeredEvents).toContain("connect_error");
    expect(registeredEvents).toContain("TURNOS_SNAPSHOT");
    expect(registeredEvents).toContain("TURNO_ACTUALIZADO");
    expect(registeredEvents).toContain("consultorio_updated");
    expect(registeredEvents).toContain("patient_assigned");
    expect(registeredEvents).toContain("attention_finished");
  });

  it("calls onConnect callback on connect event", () => {
    adapter.connect(callbacks);

    const connectHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "connect"
    )?.[1];
    connectHandler?.();

    expect(callbacks.onConnect).toHaveBeenCalledTimes(1);
  });

  it("calls onDisconnect callback on disconnect event", () => {
    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "disconnect"
    )?.[1];
    handler?.();

    expect(callbacks.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("calls onError on connect_error event", () => {
    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "connect_error"
    )?.[1];
    handler?.();

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Error de conexión con el servidor"
    );
  });

  it("maps TURNOS_SNAPSHOT data through toDomainTicket", () => {
    const mockedMapper = toDomainTicket as jest.MockedFunction<
      typeof toDomainTicket
    >;
    mockedMapper.mockImplementation(
      (raw) => raw as unknown as ReturnType<typeof toDomainTicket>
    );

    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "TURNOS_SNAPSHOT"
    )?.[1];

    const payload = {
      type: "TURNOS_SNAPSHOT",
      data: [{ id: "1" }, { id: "2" }],
    };
    handler?.(payload);

    expect(mockedMapper).toHaveBeenCalledTimes(2);
    expect(callbacks.onSnapshot).toHaveBeenCalledWith([
      { id: "1" },
      { id: "2" },
    ]);
  });

  it("maps TURNO_ACTUALIZADO data through toDomainTicket", () => {
    const mockedMapper = toDomainTicket as jest.MockedFunction<
      typeof toDomainTicket
    >;
    mockedMapper.mockImplementation(
      (raw) => raw as unknown as ReturnType<typeof toDomainTicket>
    );

    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "TURNO_ACTUALIZADO"
    )?.[1];

    handler?.({ type: "TURNO_ACTUALIZADO", data: { id: "x" } });

    expect(callbacks.onTicketUpdate).toHaveBeenCalledWith({ id: "x" });
  });

  it("maps consultorio_updated payload through toConsultorioRealtimeEvent", () => {
    const mockedMapper = toConsultorioRealtimeEvent as jest.MockedFunction<
      typeof toConsultorioRealtimeEvent
    >;
    mockedMapper.mockImplementation(
      (raw) => raw as unknown as ReturnType<typeof toConsultorioRealtimeEvent>
    );

    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "consultorio_updated"
    )?.[1];

    handler?.({ consultorioId: "C1", estado: "EnAtencion", patientId: "123", timestamp: 1 });

    expect(callbacks.onConsultorioUpdated).toHaveBeenCalledWith({
      consultorioId: "C1",
      estado: "EnAtencion",
      patientId: "123",
      timestamp: 1,
    });
  });

  it("maps patient_assigned payload through toConsultorioRealtimeEvent", () => {
    const mockedMapper = toConsultorioRealtimeEvent as jest.MockedFunction<
      typeof toConsultorioRealtimeEvent
    >;
    mockedMapper.mockImplementation(
      (raw) => raw as unknown as ReturnType<typeof toConsultorioRealtimeEvent>
    );

    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "patient_assigned"
    )?.[1];

    handler?.({ type: "patient_assigned", data: { consultorioId: "C2", estado: "EnAtencion", patientId: "456", timestamp: 2 } });

    expect(callbacks.onPatientAssigned).toHaveBeenCalledWith({
      consultorioId: "C2",
      estado: "EnAtencion",
      patientId: "456",
      timestamp: 2,
    });
  });

  it("maps attention_finished payload through toConsultorioRealtimeEvent", () => {
    const mockedMapper = toConsultorioRealtimeEvent as jest.MockedFunction<
      typeof toConsultorioRealtimeEvent
    >;
    mockedMapper.mockImplementation(
      (raw) => raw as unknown as ReturnType<typeof toConsultorioRealtimeEvent>
    );

    adapter.connect(callbacks);

    const handler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "attention_finished"
    )?.[1];

    handler?.({ consultorioId: "C3", estado: "ConMedicoDisponible", patientId: null, timestamp: 3 });

    expect(callbacks.onAttentionFinished).toHaveBeenCalledWith({
      consultorioId: "C3",
      estado: "ConMedicoDisponible",
      patientId: null,
      timestamp: 3,
    });
  });

  it("disconnect() calls socket.disconnect and nullifies", () => {
    adapter.connect(callbacks);
    adapter.disconnect();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("isConnected() returns socket.connected state", () => {
    adapter.connect(callbacks);

    mockConnected.mockReturnValue(false);
    expect(adapter.isConnected()).toBe(false);

    mockConnected.mockReturnValue(true);
    expect(adapter.isConnected()).toBe(true);
  });

  it("isConnected() returns false before connect()", () => {
    expect(adapter.isConnected()).toBe(false);
  });

  it("disconnect() is safe to call before connect() when socket is null", () => {
    expect(() => adapter.disconnect()).not.toThrow();
  });
});
