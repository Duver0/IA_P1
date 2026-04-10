import React from "react";
import { render, screen } from "@testing-library/react";
import Navbar from "@/components/Navbar/Navbar";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/styles/Navbar.module.css", () => ({
  navbar: "navbar",
  logo: "logo",
  links: "links",
  link: "link",
  linkActive: "linkActive",
}));

import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function setupAuth(
  isAuthenticated: boolean,
  role: "employee" | "medico" | "admin" = "employee"
) {
  mockUseAuth.mockReturnValue({
    user: isAuthenticated ? { id: "1", email: "u@u.com", name: "User", role } : null,
    loading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    isAuthenticated,
    hasRole: jest.fn((targetRole: string) => isAuthenticated && targetRole === role),
  });
}

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  it("renders all navigation items", () => {
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Turnos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Historial" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registro" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultorios" })).toBeInTheDocument();
  });

  it("renders logo text", () => {
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByText(/Sistema de/i)).toBeInTheDocument();
  });

  it("logo is a link that navigates to /", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    render(<Navbar />);

    const logoLink = screen.getByRole("link", { name: /sistema de turnos/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders correct href for each nav item", () => {
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/register");
    expect(hrefs).toContain("/consultorios");
  });

  it("applies active class to the link matching current pathname", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    render(<Navbar />);

    const historyLink = screen.getByRole("link", { name: "Historial" });
    expect(historyLink.className).toBe("linkActive");
  });

  it("applies inactive class to links not matching current pathname", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    render(<Navbar />);

    const turnosLink = screen.getByRole("link", { name: "Turnos" });
    expect(turnosLink.className).toBe("link");
  });

  it("does not render navigation links when user is not authenticated", () => {
    setupAuth(false);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.queryByRole("link", { name: "Turnos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Historial" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Registro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Consultorios" })).not.toBeInTheDocument();
  });

  it("renders navigation links when user is authenticated", () => {
    setupAuth(true);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Turnos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Historial" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registro" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultorios" })).toBeInTheDocument();
  });

  it("renders Consultorio link when authenticated user has medico role", () => {
    setupAuth(true, "medico");
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Consultorio" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Consultorios" })).not.toBeInTheDocument();
  });

  it("renders SignOutButton when user is authenticated", () => {
    setupAuth(true);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByRole("button", { name: /cerrar sesión|sign out|logout/i })).toBeInTheDocument();
  });

  it("does not render SignOutButton when user is not authenticated", () => {
    setupAuth(false);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.queryByRole("button", { name: /cerrar sesión|sign out|logout/i })).not.toBeInTheDocument();
  });

  it("renders Iniciar sesión link when user is not authenticated", () => {
    setupAuth(false);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    const link = screen.getByRole("link", { name: /iniciar sesión/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/signin");
  });

  it("does not render Iniciar sesión link when user is authenticated", () => {
    setupAuth(true);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.queryByRole("link", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });
});
