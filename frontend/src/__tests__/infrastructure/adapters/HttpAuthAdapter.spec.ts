
import { HttpAuthAdapter } from "@/infrastructure/adapters/HttpAuthAdapter";
import type { AuthCredentials, SignUpData, AuthResult } from "@/domain/AuthCredentials";
import type { User } from "@/domain/User";
import * as httpClient from "@/infrastructure/http/httpClient";
import * as cookieUtils from "@/infrastructure/cookies/cookieUtils";

jest.mock("@/infrastructure/http/httpClient");
jest.mock("@/infrastructure/cookies/cookieUtils");

const mockedHttpPost = httpClient.httpPost as jest.MockedFunction<typeof httpClient.httpPost>;
const mockedSetCookie = cookieUtils.setAuthCookie as jest.MockedFunction<typeof cookieUtils.setAuthCookie>;
const mockedGetCookie = cookieUtils.getAuthCookie as jest.MockedFunction<typeof cookieUtils.getAuthCookie>;
const mockedRemoveCookie = cookieUtils.removeAuthCookie as jest.MockedFunction<typeof cookieUtils.removeAuthCookie>;

const SIGN_IN_GENERIC_ERROR_MESSAGE =
  "error al iniciar sesion valida correo o contraseña e intenta de nuevo";


const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

describe("HttpAuthAdapter", () => {
  const BASE = "http://localhost:3000";
  let adapter: HttpAuthAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new HttpAuthAdapter(BASE);
  });


  describe("signIn", () => {
    it("calls POST /auth/signIn, stores cookie, and maps response", async () => {

      const backendResponse = {
        success: true,
        message: "Login exitoso",
        token: "jwt-token",
        usuario: { id: "u1", email: "admin@eps.com", nombre: "Admin", rol: "admin" },
      };
      mockedHttpPost.mockResolvedValue(backendResponse);
      const credentials: AuthCredentials = { email: "admin@eps.com", password: "secret" };


      const result: AuthResult = await adapter.signIn(credentials);


      expect(mockedHttpPost).toHaveBeenCalledWith(
        `${BASE}/auth/signIn`,
        { email: "admin@eps.com", password: "secret" },
      );
      expect(mockedSetCookie).toHaveBeenCalledWith("jwt-token");
      expect(result).toEqual({
        success: true,
        message: "Login exitoso",
        token: "jwt-token",
        user: { id: "u1", email: "admin@eps.com", name: "Admin", role: "admin" },
      });
    });

    it("returns failure and does not set cookie when backend returns success: false", async () => {

      const backendResponse = { success: false, message: "Invalid credentials" };
      mockedHttpPost.mockResolvedValue(backendResponse);


      const result = await adapter.signIn({ email: "bad@eps.com", password: "wrong" });


      expect(result.success).toBe(false);
      expect(result.message).toBe(SIGN_IN_GENERIC_ERROR_MESSAGE);
      expect(mockedSetCookie).not.toHaveBeenCalled();
    });

    it("returns failure when httpPost throws", async () => {

      mockedHttpPost.mockRejectedValue(new Error("TIMEOUT"));


      const result = await adapter.signIn({ email: "a@b.com", password: "x" });


      expect(result.success).toBe(false);
      expect(result.message).toBe(SIGN_IN_GENERIC_ERROR_MESSAGE);
    });

    it("returns fallback message when httpPost throws a non-Error on signIn", async () => {
      mockedHttpPost.mockRejectedValue(null);
      const result = await adapter.signIn({ email: "a@b.com", password: "x" });
      expect(result.success).toBe(false);
      expect(result.message).toBe(SIGN_IN_GENERIC_ERROR_MESSAGE);
    });

    it("does not set cookie when backend is successful but returns no token", async () => {
      mockedHttpPost.mockResolvedValue({ success: true, message: "OK" });
      await adapter.signIn({ email: "a@b.com", password: "x" });
      expect(mockedSetCookie).not.toHaveBeenCalled();
    });
  });


  describe("signUp", () => {
    it("translates name→nombre, role→rol and calls POST /auth/signUp", async () => {

      const backendResponse = {
        success: true,
        message: "Registro exitoso",
        token: "new-token",
        usuario: { id: "u2", email: "nurse@eps.com", nombre: "Enfermera", rol: "empleado" },
      };
      mockedHttpPost.mockResolvedValue(backendResponse);
      const signUpData: SignUpData = { email: "nurse@eps.com", password: "secret", name: "Enfermera", role: "employee" };


      const result: AuthResult = await adapter.signUp(signUpData);


      expect(mockedHttpPost).toHaveBeenCalledWith(
        `${BASE}/auth/signUp`,
        { email: "nurse@eps.com", password: "secret", nombre: "Enfermera", rol: "empleado" },
      );
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: "u2", email: "nurse@eps.com", name: "Enfermera", role: "employee" });
    });

    it("does not store cookie on signup (user redirects to signin)", async () => {

      const backendResponse = {
        success: true,
        message: "Registro exitoso",
        token: "new-token",
        usuario: { id: "u2", email: "nurse@eps.com", nombre: "Enfermera", rol: "empleado" },
      };
      mockedHttpPost.mockResolvedValue(backendResponse);


      await adapter.signUp({ email: "nurse@eps.com", password: "secret", name: "Enfermera", role: "employee" });


      expect(mockedSetCookie).not.toHaveBeenCalled();
    });

    it("maps medico role to backend rol medico on signup", async () => {
      mockedHttpPost.mockResolvedValue({ success: true, message: "OK" });

      await adapter.signUp({
        email: "medico@eps.com",
        password: "secret",
        name: "Dr. Med",
        role: "medico",
      });

      expect(mockedHttpPost).toHaveBeenCalledWith(
        `${BASE}/auth/signUp`,
        {
          email: "medico@eps.com",
          password: "secret",
          nombre: "Dr. Med",
          rol: "medico",
        },
      );
    });

    it("[Validate] returns failure with Spanish message when backend returns 'Email already in use'", async () => {
      mockedHttpPost.mockResolvedValue({ success: false, message: "Email already in use" });

      const result = await adapter.signUp({ email: "dup@eps.com", password: "s", name: "X", role: "employee" });

      expect(result.success).toBe(false);
      expect(result.message).toBe("El correo ya está registrado.");
    });

    it("returns failure with error message when httpPost throws an Error", async () => {
      mockedHttpPost.mockRejectedValue(new Error("Network timeout"));
      const result = await adapter.signUp({ email: "a@b.com", password: "x", name: "Y", role: "employee" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Network timeout");
    });

    it("returns fallback message when httpPost throws a non-Error", async () => {
      mockedHttpPost.mockRejectedValue("string error");

      const result = await adapter.signUp({ email: "a@b.com", password: "x", name: "Y", role: "employee" });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Error en registro");
    });

    it("falls back to 'empleado' when role is not in the map", async () => {
      mockedHttpPost.mockResolvedValue({ success: true, message: "OK" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await adapter.signUp({ email: "a@b.com", password: "x", name: "Y", role: "unknown" as any });
      expect(mockedHttpPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ rol: "empleado" }),
      );
    });
  });


  describe("signOut", () => {
    it("calls POST /auth/signOut and removes the cookie", async () => {
      mockedHttpPost.mockResolvedValue({ success: true, message: "Sesión cerrada" });

      await adapter.signOut();

      expect(mockedHttpPost).toHaveBeenCalledWith(`${BASE}/auth/signOut`, {});
      expect(mockedRemoveCookie).toHaveBeenCalled();
    });

    it("removes cookie even when the backend call fails", async () => {
      mockedHttpPost.mockRejectedValue(new Error("TIMEOUT"));

      await adapter.signOut();

      expect(mockedRemoveCookie).toHaveBeenCalled();
    });
  });


  describe("getSession", () => {
    it("returns user when cookie exists and GET /auth/me succeeds", async () => {
      mockedGetCookie.mockReturnValue("valid-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "u1", email: "admin@eps.com", nombre: "Admin", rol: "admin" }),
      } as Response);

      const user: User | null = await adapter.getSession();

      expect(mockFetch).toHaveBeenCalledWith(`${BASE}/auth/me`, {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
        cache: "no-store",
      });
      expect(user).toEqual({ id: "u1", email: "admin@eps.com", name: "Admin", role: "admin" });
    });

    it("returns null when no cookie is present", async () => {
      mockedGetCookie.mockReturnValue(null);

      const user = await adapter.getSession();

      expect(user).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null and removes cookie when GET /auth/me fails", async () => {
      mockedGetCookie.mockReturnValue("expired-token");
      mockFetch.mockResolvedValue({ ok: false, status: 401 } as Response);

      const user = await adapter.getSession();

      expect(user).toBeNull();
      expect(mockedRemoveCookie).toHaveBeenCalled();
    });

    it("returns null and removes cookie when fetch throws", async () => {
      mockedGetCookie.mockReturnValue("valid-token");
      mockFetch.mockRejectedValue(new Error("Network error"));

      const user = await adapter.getSession();

      expect(user).toBeNull();
      expect(mockedRemoveCookie).toHaveBeenCalled();
    });
  });
});
