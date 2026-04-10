import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/providers/AuthProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { mockAuthService } from "@/__tests__/mocks/factories";

describe("useAuth hook", () => {
  it("throws a descriptive error when used outside AuthProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow("AuthProvider is required");

    consoleError.mockRestore();
  });

  it("returns all expected context keys when used inside AuthProvider", async () => {
    const service = mockAuthService();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider authService={service}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("signIn");
    expect(result.current).toHaveProperty("signUp");
    expect(result.current).toHaveProperty("signOut");
    expect(result.current).toHaveProperty("isAuthenticated");
    expect(result.current).toHaveProperty("hasRole");
  });

  it("signIn and signUp are callable functions", async () => {
    const service = mockAuthService();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider authService={service}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.signOut).toBe("function");
    expect(typeof result.current.hasRole).toBe("function");
  });
});
