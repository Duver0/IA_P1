import SignUpPage from "@/app/signup/page";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

beforeEach(() => {
  mockUseDeps.mockReturnValue({
    ticketWriter: { createTicket: jest.fn() },
    ticketReader: { getTickets: jest.fn() },
    realTime: { connect: jest.fn(), disconnect: jest.fn(), isConnected: jest.fn() },
    audio: { init: jest.fn(), unlock: jest.fn(), play: jest.fn(), isEnabled: jest.fn() },
    sanitizer: mockSanitizer(),
    authService: { signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(), getSession: jest.fn() },
  });

  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    error: null,
    signIn: jest.fn().mockResolvedValue(false),
    signUp: jest.fn().mockResolvedValue(false),
    signOut: jest.fn(),
    isAuthenticated: false,
    hasRole: jest.fn().mockReturnValue(false),
  });
});

describe("SignUpPage", () => {
  it("renders the SignUpForm", () => {
    render(<SignUpPage />);

    expect(screen.getByPlaceholderText(/nombre|name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña|password/i)).toBeInTheDocument();
  });

  it("renders a role selector", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("combobox", { name: /tipo de usuario/i })).toBeInTheDocument();
  });

  it("renders the submit button from SignUpForm", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("button", { name: /registrarse|sign up/i })).toBeInTheDocument();
  });

  it("renders the form heading", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("heading", { name: /crear cuenta/i })).toBeInTheDocument();
  });
});
