import { toUser, toAuthResult, translateAuthMessage } from "@/infrastructure/mappers/authMapper";

describe("authMapper — Anti-Corruption Layer", () => {
  describe("toUser", () => {
    it("maps Spanish backend fields to English domain User model", () => {
      const raw = {
        id: "user-123",
        email: "carlos@example.com",
        nombre: "Carlos Pérez",
        rol: "admin",
      };

      const user = toUser(raw);

      expect(user).toEqual({
        id: "user-123",
        email: "carlos@example.com",
        name: "Carlos Pérez",
        role: "admin",
      });
    });

    it('maps rol "empleado" to role "employee"', () => {
      const raw = {
        id: "user-2",
        email: "ana@example.com",
        nombre: "Ana López",
        rol: "empleado",
      };

      expect(toUser(raw).role).toBe("employee");
    });

    it('maps rol "admin" to role "admin"', () => {
      const raw = {
        id: "user-3",
        email: "admin@example.com",
        nombre: "Admin User",
        rol: "admin",
      };

      expect(toUser(raw).role).toBe("admin");
    });

    it('maps rol "medico" to role "medico"', () => {
      const raw = {
        id: "user-5",
        email: "medico@example.com",
        nombre: "Dra. House",
        rol: "medico",
      };

      expect(toUser(raw).role).toBe("medico");
    });

    it('defaults to "employee" for an unknown rol value', () => {
      const raw = {
        id: "user-4",
        email: "unknown@example.com",
        nombre: "Unknown Role",
        rol: "superuser",
      };

      expect(toUser(raw).role).toBe("employee");
    });

    it("preserves id and email without transformation", () => {
      const raw = {
        id: "uuid-abc-123",
        email: "test@domain.com",
        nombre: "Test",
        rol: "empleado",
      };

      const user = toUser(raw);

      expect(user.id).toBe("uuid-abc-123");
      expect(user.email).toBe("test@domain.com");
    });
  });

  describe("toAuthResult", () => {
    it("maps successful backend response to AuthResult", () => {
      const raw = {
        success: true,
        message: "Autenticación exitosa",
        token: "jwt-token-abc",
        usuario: {
          id: "user-1",
          email: "user@example.com",
          nombre: "User Name",
          rol: "admin",
        },
      };

      const result = toAuthResult(raw);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Autenticación exitosa");
      expect(result.token).toBe("jwt-token-abc");
      expect(result.user).toEqual({
        id: "user-1",
        email: "user@example.com",
        name: "User Name",
        role: "admin",
      });
    });

    it("maps failed backend response without user or token", () => {
      const raw = {
        success: false,
        message: "Credenciales inválidas",
      };

      const result = toAuthResult(raw);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Credenciales inválidas");
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it("maps user to undefined when usuario is absent in response", () => {
      const raw = {
        success: true,
        message: "OK",
        token: "jwt-token",
      };

      const result = toAuthResult(raw);

      expect(result.user).toBeUndefined();
    });
  });

  describe("translateAuthMessage", () => {
    it("[Validate] translates 'Email already in use' to Spanish", () => {
      expect(translateAuthMessage("Email already in use")).toBe("El correo ya está registrado.");
    });

    it("[Validate] translates lowercase variant to Spanish", () => {
      expect(translateAuthMessage("email already in use")).toBe("El correo ya está registrado.");
    });

    it("passes through messages that have no translation", () => {
      expect(translateAuthMessage("Credenciales inválidas")).toBe("Credenciales inválidas");
    });

    it("passes through empty string", () => {
      expect(translateAuthMessage("")).toBe("");
    });
  });
});
