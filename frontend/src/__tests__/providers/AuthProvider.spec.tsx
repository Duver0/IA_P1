import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { buildUser, mockAuthService } from "@/__tests__/mocks/factories";

function wrapper(service: ReturnType<typeof mockAuthService>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider authService={service}>{children}</AuthProvider>;
  };
}

describe("AuthProvider", () => {
  it("throws when useAuth is called outside the provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow("AuthProvider is required");

    consoleError.mockRestore();
  });

  it("starts with loading true before getSession resolves", async () => {
    const service = mockAuthService();

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
  });

  it("initializes with user null and isAuthenticated false when no session exists", async () => {
    const service = mockAuthService();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {});

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("calls getSession on mount to restore existing session", async () => {
    const service = mockAuthService();

    renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {});

    expect(service.getSession).toHaveBeenCalledTimes(1);
  });

  it("sets user from getSession when an active session exists on mount", async () => {
    const user = buildUser({ role: "admin" });
    const service = mockAuthService();
    service.getSession.mockResolvedValue(user);

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {});

    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("signIn: updates user and sets isAuthenticated true on success", async () => {
    const user = buildUser();
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "test@test.com", password: "pass123" });
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("signIn: returns true on success", async () => {
    const user = buildUser();
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(returned).toBe(true);
  });

  it("signIn: sets error and returns false on failure", async () => {
    const service = mockAuthService({ success: false, message: "Credenciales inválidas" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signIn({ email: "a@a.com", password: "wrong" });
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe("Credenciales inválidas");
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("signUp: returns true and does NOT set user (user must sign in separately)", async () => {
    const user = buildUser({ role: "employee" });
    const service = mockAuthService(
      { success: true, message: "OK" },
      { success: true, message: "Cuenta creada", user, token: "jwt" }
    );

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signUp({ name: "Ana", email: "ana@test.com", password: "pass123", role: "employee" });
    });

    expect(returned).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("signUp: sets error on failure", async () => {
    const service = mockAuthService(
      { success: true, message: "OK" },
      { success: false, message: "El correo ya existe" }
    );

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signUp({ name: "Ana", email: "dup@test.com", password: "pass", role: "employee" });
    });

    expect(result.current.error).toBe("El correo ya existe");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("signOut: clears user and sets isAuthenticated false", async () => {
    const user = buildUser();
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "a@a.com", password: "pass" });
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("signOut: calls authService.signOut", async () => {
    const service = mockAuthService();

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signOut();
    });

    expect(service.signOut).toHaveBeenCalledTimes(1);
  });

  it("hasRole: returns true when the user has the given role", async () => {
    const user = buildUser({ role: "admin" });
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(result.current.hasRole("admin")).toBe(true);
    expect(result.current.hasRole("employee")).toBe(false);
  });

  it("hasRole: returns true for medico role after successful signIn", async () => {
    const user = buildUser({ role: "medico" });
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "medico@eps.com", password: "pass" });
    });

    expect(result.current.hasRole("medico")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
  });

  it("hasRole: returns true after session restore from getSession", async () => {
    const restoredUser = buildUser({ role: "employee" });
    const service = mockAuthService();
    service.getSession.mockResolvedValue(restoredUser);

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {});

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasRole("employee")).toBe(true);
    expect(result.current.hasRole("medico")).toBe(false);
  });

  it("hasRole: returns false when there is no authenticated user", async () => {
    const service = mockAuthService();

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {});

    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasRole("employee")).toBe(false);
  });

  it("isAuthenticated: is true after successful signIn", async () => {
    const user = buildUser();
    const service = mockAuthService({ success: true, message: "OK", user, token: "jwt" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("signIn: sets error and returns false when authService throws an Error", async () => {
    const service = mockAuthService();
    service.signIn.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe("Network error");
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("signIn: sets fallback error message when authService throws a non-Error", async () => {
    const service = mockAuthService();
    service.signIn.mockRejectedValueOnce("unexpected");

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe("Ocurrió un error inesperado. Intente nuevamente.");
  });

  it("signUp: sets error and returns false when authService throws an Error", async () => {
    const service = mockAuthService();
    service.signUp.mockRejectedValueOnce(new Error("Connection refused"));

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signUp({ name: "Ana", email: "ana@test.com", password: "pass", role: "employee" });
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe("Connection refused");
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("signUp: sets fallback error message when authService throws a non-Error", async () => {
    const service = mockAuthService();
    service.signUp.mockRejectedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.signUp({ name: "Ana", email: "ana@test.com", password: "pass", role: "employee" });
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe("Ocurrió un error inesperado. Intente nuevamente.");
  });

  it("clears previous error on new signIn attempt", async () => {
    const user = buildUser();
    const service = mockAuthService({ success: false, message: "Error" });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(service) });

    await act(async () => {
      await result.current.signIn({ email: "a@a.com", password: "wrong" });
    });
    expect(result.current.error).not.toBeNull();

    service.signIn.mockResolvedValueOnce({ success: true, message: "OK", user, token: "jwt" });

    await act(async () => {
      await result.current.signIn({ email: "a@a.com", password: "pass" });
    });

    expect(result.current.error).toBeNull();
  });
});
