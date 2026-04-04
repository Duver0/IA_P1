import { toDomainTicket, toBackendCreateDTO } from "@/infrastructure/mappers/ticketMapper";

describe("ticketMapper — Anti-Corruption Layer", () => {
  describe("toDomainTicket", () => {
    it("maps Spanish backend fields to English domain model", () => {
      const raw = {
        id: "abc-123",
        nombre: "Carlos Pérez",
        cedula: 12345678,
        consultorio: "A3",
        timestamp: 1700000000000,
        estado: "espera",
      };

      const ticket = toDomainTicket(raw);

      expect(ticket).toEqual({
        id: "abc-123",
        name: "Carlos Pérez",
        documentId: 12345678,
        office: "A3",
        timestamp: 1700000000000,
        status: "waiting",
      });
    });

    it('maps "llamado" to "called"', () => {
      const raw = {
        id: "1",
        nombre: "Ana",
        cedula: 111,
        consultorio: "B1",
        timestamp: 0,
        estado: "llamado",
      };

      expect(toDomainTicket(raw).status).toBe("called");
    });

    it('maps "atendido" to "served"', () => {
      const raw = {
        id: "2",
        nombre: "Luis",
        cedula: 222,
        consultorio: "C2",
        timestamp: 0,
        estado: "atendido",
      };

      expect(toDomainTicket(raw).status).toBe("served");
    });

    it('defaults to "waiting" for unknown estado values', () => {
      const raw = {
        id: "3",
        nombre: "Test",
        cedula: 333,
        consultorio: null,
        timestamp: 0,
        estado: "unknown-state",
      };

      expect(toDomainTicket(raw).status).toBe("waiting");
    });

    it("preserves null consultorio as null office", () => {
      const raw = {
        id: "4",
        nombre: "Test",
        cedula: 444,
        consultorio: null,
        timestamp: 0,
        estado: "espera",
      };

      expect(toDomainTicket(raw).office).toBeNull();
    });

    it("maps medicoNombre to doctorName when present", () => {
      const raw = {
        id: "5",
        nombre: "Nora",
        cedula: 555,
        consultorio: "A1",
        medicoNombre: "Dra. Andrea Gil",
        timestamp: 0,
        estado: "llamado",
      };

      expect(toDomainTicket(raw).doctorName).toBe("Dra. Andrea Gil");
    });

    it("maps finAtencionAt to consultationEndedAt when present", () => {
      const raw = {
        id: "6",
        nombre: "Juan",
        cedula: 666,
        consultorio: "B2",
        timestamp: 1000,
        finAtencionAt: 2500,
        estado: "atendido",
      };

      expect(toDomainTicket(raw).consultationEndedAt).toBe(2500);
    });
  });

  describe("toBackendCreateDTO", () => {
    it("maps English domain DTO to Spanish backend DTO", () => {
      const dto = { name: "María López", documentId: 98765432 };

      const backendDTO = toBackendCreateDTO(dto);

      expect(backendDTO).toEqual({
        nombre: "María López",
        cedula: 98765432,
      });
    });

    it("preserves exact values without mutation", () => {
      const dto = { name: "Test", documentId: 0 };
      const result = toBackendCreateDTO(dto);

      expect(result.nombre).toBe("Test");
      expect(result.cedula).toBe(0);
    });
  });
});
