import { toConsultorioRealtimeEvent } from "@/infrastructure/mappers/consultorioRealtimeMapper";

describe("consultorioRealtimeMapper", () => {
  it("maps valid payload with medicoId and patientId", () => {
    const result = toConsultorioRealtimeEvent({
      consultorioId: "C1",
      medicoId: "DOC-1",
      estado: "EnAtencion",
      patientId: "123",
      timestamp: 5,
    });

    expect(result).toEqual({
      consultorioId: "C1",
      medicoId: "DOC-1",
      estado: "EnAtencion",
      patientId: "123",
      timestamp: 5,
    });
  });

  it("maps patientId as null when omitted", () => {
    const result = toConsultorioRealtimeEvent({
      consultorioId: "C1",
      estado: "ConMedicoDisponible",
      timestamp: 7,
    });

    expect(result.patientId).toBeNull();
    expect(result).not.toHaveProperty("medicoId");
  });

  it("preserves medicoId null when explicitly sent", () => {
    const result = toConsultorioRealtimeEvent({
      consultorioId: "C1",
      medicoId: null,
      estado: "SinMedico",
      patientId: null,
      timestamp: 8,
    });

    expect(result.medicoId).toBeNull();
  });

  it("throws when payload is invalid", () => {
    expect(() => toConsultorioRealtimeEvent(null as unknown as never)).toThrow(
      "Invalid consultorio realtime payload",
    );
  });

  it("throws when consultorioId is missing", () => {
    expect(() =>
      toConsultorioRealtimeEvent({
        consultorioId: "",
        estado: "SinMedico",
        timestamp: 1,
      }),
    ).toThrow("consultorioId is required");
  });

  it("throws when state is invalid", () => {
    expect(() =>
      toConsultorioRealtimeEvent({
        consultorioId: "C1",
        estado: "EstadoInvalido",
        timestamp: 1,
      }),
    ).toThrow("Invalid consultorio state");
  });

  it("throws when medicoId is not a string/null/undefined", () => {
    expect(() =>
      toConsultorioRealtimeEvent({
        consultorioId: "C1",
        medicoId: 10 as unknown as string,
        estado: "SinMedico",
        timestamp: 1,
      }),
    ).toThrow("Invalid medicoId");
  });
});
