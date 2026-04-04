import SignUpForm, {
  ROLE_REQUIRED_MSG,
  SIGNUP_SUCCESS_KEY,
  SUCCESS_SIGNUP_MSG,
  WEAK_PASSWORD_MSG,
} from "@/components/SignUpForm/SignUpForm";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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
  signUp?: jest.Mock;
  loading?: boolean;
  error?: string | null;
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
    signIn: jest.fn().mockResolvedValue(false),
    signUp: options.signUp ?? jest.fn().mockResolvedValue(true),
    signOut: jest.fn(),
    isAuthenticated: false,
    hasRole: jest.fn().mockReturnValue(false),
  });
}

function selectRole(role: "employee" | "medico") {
  fireEvent.change(screen.getByRole("combobox", { name: /tipo de usuario/i }), {
    target: { value: role },
  });
}

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks({});
  });

  it("renders name, email and password inputs", () => {
    render(<SignUpForm />);

    expect(screen.getByPlaceholderText(/nombre|name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña|password/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /tipo de usuario/i })).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<SignUpForm />);

    expect(screen.getByRole("button", { name: /registrarse|sign up/i })).toBeInTheDocument();
  });

  it("does not call signUp when name is empty", async () => {
    const signUp = jest.fn().mockResolvedValue(false);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).not.toHaveBeenCalled();
    });
  });

  it("does not call signUp when email is empty", async () => {
    const signUp = jest.fn().mockResolvedValue(false);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "Ana" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).not.toHaveBeenCalled();
    });
  });

  it("does not call signUp when password is empty", async () => {
    const signUp = jest.fn().mockResolvedValue(false);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "ana@test.com" },
    });

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).not.toHaveBeenCalled();
    });
  });

  it("calls signUp with all form values on valid submission", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "Ana García" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "ana@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "Pass1234!" },
    });
    selectRole("employee");

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        name: "Ana García",
        email: "ana@test.com",
        password: "Pass1234!",
        role: "employee",
      });
    });
  });

  it("trims whitespace from inputs before calling signUp", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "  Ana García  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "  ana@test.com  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "  Pass1234!  " },
    });
    selectRole("employee");

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        name: "Ana García",
        email: "ana@test.com",
        password: "Pass1234!",
        role: "employee",
      });
    });
  });

  it("[Validar] stores success message in sessionStorage when signUp succeeds", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "ana@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), { target: { value: "Pass1234!" } });
    selectRole("employee");
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(sessionStorage.getItem(SIGNUP_SUCCESS_KEY)).toBe(SUCCESS_SIGNUP_MSG);
    });
  });

  it("redirects to /signIn after successful signUp", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "ana@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "Pass1234!" },
    });
    selectRole("employee");

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });
  });

  it("[Validate] does not redirect when signUp fails due to duplicate email", async () => {
    const signUp = jest.fn().mockResolvedValue(false);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "dup@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), {
      target: { value: "Pass1234!" },
    });
    selectRole("employee");

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("[Validate] shows error message when the email is already registered", () => {
    setupMocks({ error: "El correo ya está registrado" });

    render(<SignUpForm />);

    expect(screen.getByText("El correo ya está registrado")).toBeInTheDocument();
  });

  it("shows loading state on button while submitting", () => {
    setupMocks({ loading: true });

    render(<SignUpForm />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders the form heading", () => {
    render(<SignUpForm />);

    expect(screen.getByText("Crear cuenta", { selector: "h2" })).toBeInTheDocument();
  });

  it("renders a sign-in link", () => {
    render(<SignUpForm />);

    const link = screen.getByText("Inicia sesión");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/signin");
  });

  it("shows loading text on button while loading", () => {
    setupMocks({ loading: true });

    render(<SignUpForm />);

    expect(screen.getByRole("button")).toHaveTextContent("Registrando...");
  });

  it("shows a validation error when role is not selected", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "t@t.com" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), { target: { value: "Pass1234!" } });
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(ROLE_REQUIRED_MSG);
    });
  });

  it("sends selected employee role", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "t@t.com" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), { target: { value: "Pass1234!" } });
    selectRole("employee");
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ role: "employee" }));
    });
  });

  it("sends selected medico role", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    setupMocks({ signUp });

    render(<SignUpForm />);

    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), { target: { value: "Dr. Test" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "dr@t.com" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), { target: { value: "Pass1234!" } });
    selectRole("medico");
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ role: "medico" }));
    });
  });
});

describe("[Validate] contraseña fuerte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function fillAndSubmit(password: string, signUp = jest.fn()) {
    setupMocks({ signUp });
    render(<SignUpForm />);
    fireEvent.change(screen.getByPlaceholderText(/nombre|name/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "ana@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña|password/i), { target: { value: password } });
    selectRole("employee");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    return signUp;
  }

  it("[Validate] no llama signUp y muestra error cuando la contraseña no tiene mayúscula", async () => {
    const signUp = fillAndSubmit("pass1234!");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(WEAK_PASSWORD_MSG);
  });

  it("[Validate] no llama signUp y muestra error cuando la contraseña no tiene minúscula", async () => {
    const signUp = fillAndSubmit("PASS1234!");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(WEAK_PASSWORD_MSG);
  });

  it("[Validate] no llama signUp y muestra error cuando la contraseña no tiene número", async () => {
    const signUp = fillAndSubmit("Password!");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(WEAK_PASSWORD_MSG);
  });

  it("[Validate] no llama signUp y muestra error cuando la contraseña no tiene carácter especial", async () => {
    const signUp = fillAndSubmit("Password1");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(WEAK_PASSWORD_MSG);
  });

  it("[Validate] no llama signUp y muestra error cuando la contraseña tiene menos de 8 caracteres", async () => {
    const signUp = fillAndSubmit("Pa1!");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(WEAK_PASSWORD_MSG);
  });

  it("[Validate] llama signUp cuando la contraseña cumple todos los criterios de seguridad", async () => {
    const signUp = jest.fn().mockResolvedValue(true);
    fillAndSubmit("Pass1234!", signUp);
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
