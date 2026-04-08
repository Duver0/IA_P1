"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User, UserRole } from "@/domain/User";
import type { AuthCredentials, SignUpData } from "@/domain/AuthCredentials";
import type { AuthService } from "@/domain/ports/AuthService";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: AuthCredentials) => Promise<boolean>;
  signUp: (data: SignUpData) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function mapError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return message || "Ocurrió un error inesperado. Intente nuevamente.";
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider is required");
  return ctx;
}

interface AuthProviderProps {
  children: ReactNode;
  authService: AuthService;
}

export function AuthProvider({ children, authService }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService.getSession().then((sessionUser) => {
      if (sessionUser) {
        setUser(sessionUser);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, [authService]);

  const signIn = useCallback(
    async (credentials: AuthCredentials): Promise<boolean> => {
      setError(null);
      setLoading(true);
      try {
        const result = await authService.signIn(credentials);
        if (result.success && result.user) {
          setUser(result.user);
          return true;
        }
        setError(result.message);
        return false;
      } catch (err: unknown) {
        setError(mapError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authService]
  );

  const signUp = useCallback(
    async (data: SignUpData): Promise<boolean> => {
      setError(null);
      setLoading(true);
      try {
        const result = await authService.signUp(data);
        if (result.success) {
          return true;
        }
        setError(result.message);
        return false;
      } catch (err: unknown) {
        setError(mapError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authService]
  );

  const signOut = useCallback(async (): Promise<void> => {
    await authService.signOut();
    setUser(null);
    setError(null);
  }, [authService]);

  const isAuthenticated = user !== null;

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  const value: AuthState = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
