# Frontend — Ticket Management System

Frontend built with **Next.js 16 (App Router)** for real-time visualization and registration of medical tickets, with full authentication (signUp / signIn / signOut) and role-based route protection.

## Stack

| Technology | Usage |
|---|---|
| Next.js 16 | Framework (App Router) |
| React 19 | UI |
| TypeScript 5 | Static typing |
| Socket.IO Client | Real-time WebSocket |
| CSS Modules | Scoped styles |

## Architecture

The project follows **Hexagonal Architecture (Ports & Adapters)** with Dependency Injection via React Context.

```
src/
├── domain/                  ← Entities and ports (interfaces)
│   ├── Ticket.ts
│   ├── CreateTicket.ts
│   ├── User.ts              ← User entity + UserRole type
│   ├── AuthCredentials.ts   ← AuthCredentials, SignUpData, AuthResult DTOs
│   └── ports/
│       ├── TicketWriter.ts
│       ├── TicketReader.ts
│       ├── RealTimeProvider.ts
│       ├── AudioNotifier.ts
│       ├── InputSanitizer.ts
│       └── AuthService.ts   ← Authentication port (interface)
│
├── infrastructure/          ← Adapters (concrete implementations)
│   ├── adapters/
│   │   ├── HttpTicketAdapter.ts
│   │   ├── SocketIOAdapter.ts
│   │   ├── BrowserAudioAdapter.ts
│   │   ├── HtmlSanitizer.ts
│   │   ├── HttpAuthAdapter.ts   ← Active adapter: calls backend REST auth endpoints
│   │   └── NoopAuthAdapter.ts   ← Stub adapter for tests and contexts without auth
│   ├── http/
│   │   ├── CircuitBreaker.ts
│   │   └── httpClient.ts
│   ├── mappers/
│   │   ├── ticketMapper.ts
│   │   └── authMapper.ts        ← ACL: backend response → domain User/AuthResult
│   └── cookies/
│       └── cookieUtils.ts       ← set/get/remove auth token cookie
│
├── providers/               ← Dependency injection + auth context
│   ├── DependencyProvider.tsx       ← Includes AuthService in dependencies
│   ├── AuthProvider.tsx             ← Auth context (user, loading, error, actions)
│   └── ConnectedAuthProvider.tsx    ← Wires AuthService from DependencyProvider into AuthProvider
│
├── hooks/                   ← Use cases
│   ├── useCreateTicket.ts
│   ├── useTicketsWebSocket.ts
│   └── useAudioNotification.ts
│
├── components/              ← UI components
├── components/              ← UI components
│   ├── AppointmentRegistrationForm/
│   ├── CreateTicketForm/
│   ├── Navbar/              ← Conditionally rendered (authenticated users only)
│   ├── SignInForm/          ← Login form (email + password)
│   ├── SignUpForm/          ← Registration form (name + email + password)
│   ├── SignOutButton/       ← Logout button in Navbar
│   └── AuthGuard/           ← Route protection wrapper (redirects if not authenticated)
│
├── app/                     ← Pages (App Router)
│   ├── layout.tsx
│   ├── page.tsx             ← Public: tickets screen
│   ├── signin/page.tsx      ← Public: login page
│   ├── signup/page.tsx      ← Public: registration page
│   ├── register/page.tsx    ← Public: ticket registration form
│   └── dashboard/page.tsx   ← Protected (AuthGuard): served history
│
├── config/env.ts            ← Environment variables
├── proxy.ts                 ← Security headers + route protection middleware
└── styles/                  ← CSS Modules (including SignInForm, SignUpForm)
```

## Authentication

Authentication follows the same hexagonal pattern as the rest of the codebase — the UI depends on the `AuthService` port, never on a concrete adapter.

### Flow

```
/signup  →  SignUpForm  →  useAuth().signUp()  →  AuthProvider  →  AuthService port
/signin  →  SignInForm  →  useAuth().signIn()  →  AuthProvider  →  AuthService port
Navbar   →  SignOutButton  →  useAuth().signOut()
```

### Roles

| Role | How assigned | Access |
|---|---|---|
| `employee` | Selected on signup | Dashboard, Register |
| `medico` | Selected on signup or provisioned from backend | Medico, Dashboard |
| `admin` | Assigned directly in the database | Dashboard, Register |

The signup form allows selecting `employee` or `medico`. The `admin` role is still granted only at database level.

> **Current scope:** `/signup` remains public to allow staff self-registration (`employee` or `medico`).

### Route Protection

- **`AuthGuard` component** — protects both `dashboard` and `medico` pages.
- `/medico` requires role `medico`; authenticated users with other roles are redirected.
- `/register` is **public** — any visitor (authenticated or not) can submit a ticket. No login is required to use the queue.
- **`proxy.ts` middleware (current)** — applies security headers and HTTP method filtering only; it does **not** yet perform auth cookie validation or redirects. Edge-level auth checks are planned for a future iteration.

### Current Adapter

`HttpAuthAdapter` connects to the backend REST endpoints (`/auth/signIn`, `/auth/signUp`, `/auth/signOut`, `/auth/me`). `NoopAuthAdapter` is kept as a stub for testing and environments without an auth backend.

### Business Rule Validations

The following rules are enforced client-side with full `[Validar]` test coverage:

| Rule | Location | Error message |
|---|---|---|
| **Strong password** | `SignUpForm` (pre-submit) | "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial." |
| **Duplicate email** | `AuthProvider` → backend error passed through | "El correo ya está registrado." |
| **Duplicate active ticket** | `useCreateTicket` hook (pre-submit) | "Ya existe un turno activo para esta cédula." |
| **Protected routes** | `AuthGuard` component | Redirect to `/signin` |
| **Role-based redirect after signIn** | `SignInForm` | `medico -> /medico`, other roles -> `/dashboard` |

### SignUp Success Toast

After successful registration, a **4-second success toast** is displayed on the `/signin` page via `sessionStorage`. This survives the route transition so the user sees the confirmation even after being redirected.

### AuthContext Interface

```typescript
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: AuthCredentials) => Promise<boolean>;
  signUp: (data: SignUpData) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
}
```

## SOLID Principles

- **SRP:** Each hook, adapter, and component has a single responsibility
- **OCP:** New auth providers (Firebase, Auth0) are added by creating adapters without modifying hooks or components
- **LSP:** All adapters fulfill their port contracts (`NoopAuthAdapter` and future `HttpAuthAdapter` are interchangeable)
- **ISP:** `TicketWriter`/`TicketReader` segregated; `AuthService` only exposes the 4 needed methods
- **DIP:** Hooks and components depend on ports (abstractions), not concrete implementations

## HTTP Resilience

The `httpClient` includes:
- **Circuit Breaker** — Fail-fast when backend is down
- **Retry with exponential backoff** — Intelligent retries
- **Timeout with AbortController** — Protection against hanging requests

## Anti-Corruption Layer

Two mappers translate between the Spanish backend API contract and the English domain model:

- `ticketMapper.ts` — `nombre`, `cedula`, `estado` → `name`, `documentId`, `status`
- `authMapper.ts` — `nombre`, `rol`, `usuario` → `name`, `role`, `user` (also maps `"empleado"` → `"employee"`);
  includes `translateAuthMessage()` to convert known English backend error messages to Spanish (e.g. `"Email already in use"` → `"El correo ya está registrado."`)

## Campo Cédula — Validación

El campo **Cédula** del formulario de registro de turno acepta **únicamente valores numéricos**, ya que está diseñado exclusivamente para la **cédula de ciudadanía colombiana**, que es un identificador numérico de 6 a 10 dígitos emitido por la Registraduría Nacional del Estado Civil.

- ✅ Válido: `12345678`, `1023456789`
- ❌ Inválido: `abc`, `PE123456`, `12-34` (caracteres no numéricos)

Si se ingresan caracteres no numéricos, el campo muestra el mensaje de error:
> **"La cédula solo puede contener números"**

El botón **Registrar turno** permanece deshabilitado hasta que el formulario sea válido (nombre no vacío y cédula con solo dígitos).

## Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_CONSULTORIOS_TOTAL=5
NEXT_PUBLIC_AUTH_COOKIE_NAME=auth_token          # name of the session cookie (client-accessible)
NEXT_PUBLIC_AUTH_COOKIE_MAX_AGE=86400            # cookie lifetime in seconds (24h, client-accessible)
```

## Run

```bash
npm install
npm run dev
```

## Testing

Latest validated run (Jest): **316 tests** across **31 suites**, all passing.

### Test Commands

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

Tests mirror the hexagonal architecture of `src/` exactly:

```
src/__tests__/
├── infrastructure/
│   ├── adapters/    ← BrowserAudioAdapter, HtmlSanitizer, HttpTicketAdapter,
│   │                  SocketIOAdapter, NoopAuthAdapter
│   ├── http/        ← CircuitBreaker, httpClient
│   ├── mappers/     ← ticketMapper, authMapper
│   └── cookies/     ← cookieUtils
├── hooks/           ← useCreateTicket, useTicketsWebSocket, useAudioNotification, useAuth
├── providers/       ← DependencyProvider, AuthProvider, ConnectedAuthProvider
├── components/      ← CreateTicketForm, Navbar, SignInForm, SignUpForm,
│                      SignOutButton, AuthGuard
├── app/             ← page, dashboard/page, register/page, signin/page, signup/page
└── mocks/           ← factories.ts (shared mock builders including mockAuthService, buildUser)
```

All tests use fully isolated mock objects via `src/__tests__/mocks/factories.ts` — no real network calls, no real server required.

