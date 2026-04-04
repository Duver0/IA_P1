import SignInForm from "@/components/SignInForm/SignInForm";
import { SIGNUP_SUCCESS_KEY } from "@/components/SignUpForm/SignUpForm";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/providers/DependencyProvider", () => ({
  useDeps: jest.fn(),
}));

import { mockSanitizer } from "@/__tests__/mocks/factories";
import { useAuth } from "@/providers/AuthProvider";
import { useDeps } from "@/providers/DependencyProvider";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDeps = useDeps as jest.MockedFunction<typeof useDeps>;

function setupMocks(options: {
  signIn?: jest.Mock;
  loading?: boolean;
  error?: string | null;
  hasRole?: jest.Mock;
}) {
  const sanitizer = mockSanitizer();

  mockUseDeps.mockReturnValue({
    ticketWriter: { createTicket: jest.fn() },
    ticketReader: { getTickets: jest.fn() },
    realTime: { connect: jest.fn(), disconnect: jest.fn(), isConnected: jest.fn() },
    audio: { init: jest.fn(), unlock: jest.fn(), play: jest.fn(), isEnabled: jest.fn() },
    sanitizer,
    authService: { signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(), getSession: jest.fn() },
  });

  mockUseAuth.mockReturnValue({
    user: null,
    loading: options.loading ?? false,
    error: options.error ?? null,
    signIn: options.signIn ?? jest.fn().mockResolvedValue(true),
    signUp: jest.fn().mockResolvedValue(true),
    signOut: jest.fn(),
    isAuthenticated: false,
    hasRole: options.hasRole ?? jest.fn().mockReturnValue(false),
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    setupMocks({});
  });

  it("renders email and password inputs", () => {
    render(<SignInForm />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña|password/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<SignInForm />);

    expect(screen.getByRole("button", { name: /iniciar sesión|sign in/i })).toBeInTheDocument();
  });

  it("does not call signIn when email is empty", async () => {
    const signIn = jest.fn().mockResolvedValue(false);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signIn).not.toHaveBeenCalled();
    });
  });

  it("does not call signIn when password is empty", async () => {
    const signIn = jest.fn().mockResolvedValue(false);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "user@test.com" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signIn).not.toHaveBeenCalled();
    });
  });

  it("calls signIn with email and password on valid submission", async () => {
    const signIn = jest.fn().mockResolvedValue(true);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "secret123" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret123",
      });
    });
  });

  it("trims whitespace from email and password before calling signIn", async () => {
    const signIn = jest.fn().mockResolvedValue(true);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "  user@test.com  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "  secret123  " },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret123",
      });
    });
  });

  it("redirects non-medical users to /dashboard after successful signIn", async () => {
    const signIn = jest.fn().mockResolvedValue(true);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "secret123" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects medical users to /medico after successful signIn", async () => {
    const signIn = jest.fn().mockResolvedValue(true);
    const hasRole = jest.fn((role: string) => role === "medico");
    setupMocks({ signIn, hasRole });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "medico@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "secret123" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(hasRole).toHaveBeenCalledWith("medico");
      expect(mockPush).toHaveBeenCalledWith("/medico");
    });
  });

  it("does not redirect when signIn returns false", async () => {
    const signIn = jest.fn().mockResolvedValue(false);
    setupMocks({ signIn });

    render(<SignInForm />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "wrong" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("shows loading state on button while submitting", () => {
    setupMocks({ loading: true });

    render(<SignInForm />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows error message when signIn fails", () => {
    setupMocks({ error: "Credenciales inválidas" });

    render(<SignInForm />);

    expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
  });

  it("renders the form heading", () => {
    render(<SignInForm />);

    expect(screen.getByText("Iniciar sesión", { selector: "h2" })).toBeInTheDocument();
  });

  it("renders a registration link", () => {
    render(<SignInForm />);

    const link = screen.getByText("Regístrate");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/signup");
  });

  it("shows loading text on button while loading", () => {
    setupMocks({ loading: true });

    render(<SignInForm />);

    expect(screen.getByRole("button")).toHaveTextContent("Ingresando...");
  });

  it("[Validate] shows signup success toast when sessionStorage contains the message", () => {
    sessionStorage.setItem(SIGNUP_SUCCESS_KEY, "¡Cuenta creada exitosamente!");

    render(<SignInForm />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("¡Cuenta creada exitosamente!");
  });

  it("[Validate] removes signup success from sessionStorage after reading it", () => {
    sessionStorage.setItem(SIGNUP_SUCCESS_KEY, "¡Cuenta creada!");

    render(<SignInForm />);

    expect(sessionStorage.getItem(SIGNUP_SUCCESS_KEY)).toBeNull();
  });

  it("[Validate] does not show toast when sessionStorage has no signup message", () => {
    render(<SignInForm />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("[Validate] auto-dismisses toast after 4 seconds", () => {
    jest.useFakeTimers();
    sessionStorage.setItem(SIGNUP_SUCCESS_KEY, "¡Cuenta creada!");

    render(<SignInForm />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(4001); });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
