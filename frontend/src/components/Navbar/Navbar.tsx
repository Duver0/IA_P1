"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import SignOutButton from "@/components/SignOutButton/SignOutButton";
import styles from "@/styles/Navbar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Turnos" },
  { href: "/dashboard", label: "Historial" },
  { href: "/register", label: "Registro" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, hasRole } = useAuth();
  const canAccessConsultoriosOps = hasRole("admin") || hasRole("employee");

  const navItems = [
    ...NAV_ITEMS,
    ...(canAccessConsultoriosOps
      ? [{ href: "/consultorios", label: "Consultorios" }]
      : []),
    ...(hasRole("medico") ? [{ href: "/medico", label: "Consultorio" }] : []),
  ];

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        Sistema de <span>Turnos</span>
      </Link>
      {isAuthenticated ? (
        <div className={styles.links}>
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? styles.linkActive : styles.link}
            >
              {label}
            </Link>
          ))}
          <SignOutButton />
        </div>
      ) : (
        <div className={styles.links}>
          <Link href="/signin" className={styles.link}>
            Iniciar sesión
          </Link>
        </div>
      )}
    </nav>
  );
}
