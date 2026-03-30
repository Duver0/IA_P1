---
name: nextjs-frontend-refactor
description: >
  Specialized skill for refactoring Next.js frontends applying SOLID principles,
  Clean Code, and React best practices. Triggers on: frontend refactoring,
  React hooks SRP, DIP in React, component decomposition, middleware separation,
  extract custom hook, dead code removal, dependency injection React, Circuit Breaker
  extraction, WebSocket abstraction, audio service abstraction, error message mapping,
  Next.js middleware cleanup. Use when refactoring pages, hooks, services, or
  infrastructure code in a Next.js 16 application.
---

# Next.js Frontend Refactoring Skill

Refactoring patterns for Next.js applications applying **SOLID**, **Clean Code**,
and **React-specific best practices**. Focused on eliminating technical debt in
hooks, pages, services, and middleware.

> **Context:** This skill was built from the analysis in
> `docs/DEBT_REPORT_FRONT.MD` and `docs/PLAN_FRONT.MD`. It codifies the exact
> patterns needed to fix the violations found there and prevents regressions.

---

## When to Apply

| Apply When                                                         | Skip When                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| Hook has > 2 responsibilities                                      | Hook is a thin wrapper around one call                  |
| Two+ files share > 50% identical code                              | Logic is genuinely different despite surface similarity |
| Hook/component instantiates a concrete class                       | Dependencies are already injected via props/context     |
| Middleware file mixes rate-limit + security + method validation    | File has a single, focused responsibility               |
| Infrastructure code (Socket.IO, fetch, Audio) is directly in hooks | Infrastructure is behind an injectable abstraction      |
| Dead code / unused hooks / mock endpoints exist                    | All imports are actively used                           |
| Error mapping is inline inside a hook                              | Error mapping is already extracted and reusable         |
| Code identifiers (variables, functions, types) are in Spanish      | All identifiers are already in English                  |

---

## Core Principles (SOLID for React/Next.js)

### SRP — Single Responsibility Principle

> **"A React hook, component, or utility should have one and only one reason to change."**

| Anti-Pattern                                                       | Fix                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Page component manages audio, toast, filtering, AND rendering      | Extract each concern into a dedicated hook           |
| Hook manages state + concurrency + error mapping + instantiation   | Split into focused hooks + utility functions         |
| Middleware handles rate-limit + security headers + method guard    | One file per concern, compose in a thin orchestrator |
| httpClient embeds CircuitBreaker + Retry + Timeout in one function | Extract CircuitBreaker to its own module             |

**Decision tree — "Does this belong here?"**

```
Is it pure UI rendering?
├─ YES → component (page.tsx, component.tsx)
├─ Is it reactive state + side-effects?
│  ├─ YES → custom hook (useXxx.ts)
│  └─ Is it a reusable pure function?
│     ├─ YES → utility (src/lib/*.ts)
│     └─ Is it infrastructure I/O?
│        ├─ YES → service / adapter (src/services/*.ts)
│        └─ Is it a domain concept?
│           └─ YES → domain model (src/domain/*.ts)
```

### DIP — Dependency Inversion Principle

> **"Hooks and components depend on abstractions (interfaces), never on concrete implementations."**

| Anti-Pattern                                             | Fix                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `import { HttpTurnoRepository }` in a hook               | `import { TurnoRepository }` (interface) + inject via param |
| `import { io } from 'socket.io-client'` in a hook        | Create `RealTimeConnection` interface + injectable factory  |
| `import { audioService }` (singleton instance) in a page | Create `SoundNotifier` interface + inject via param/context |
| `process.env.NEXT_PUBLIC_*` read directly in components  | Centralize in `env.ts`, make injectable for tests           |

**Injection strategies in React (ordered by preference):**

| Strategy                | When                                    | Example                                         |
| ----------------------- | --------------------------------------- | ----------------------------------------------- |
| **Parameter injection** | Hooks with 1-2 dependencies             | `useRegistroTurno(repo: TurnoRepository)`       |
| **Props injection**     | Components with external dependencies   | `<Form repository={httpRepo} />`                |
| **React Context**       | Shared across a subtree, rarely changes | `TurnoRepositoryProvider` wrapping app          |
| **Factory function**    | Infrastructure creation with config     | `createTurnosSocket(wsUrl): RealTimeConnection` |

### OCP — Open/Closed Principle

> **"New behavior via new implementations, not modifying existing code."**

- Adding a new `RealTimeConnection` (e.g., SSE) should NOT touch the hook.
- Adding a new error type should NOT modify the hook — only the `errorMessageMapper`.
- Adding new security headers should NOT touch the rate limiter.

### ISP — Interface Segregation Principle

> **"Interfaces should be small and focused."**

```typescript
// ✅ GOOD — Small, focused interfaces (English names)
interface TicketRepository {
  getTickets(): Promise<Ticket[]>;
  createTicket(data: CreateTicketDTO): Promise<CreateTicketResponse>;
}

interface SoundNotifier {
  init(src: string, volume?: number): void;
  unlock(): Promise<void>;
  play(): void;
  isEnabled(): boolean;
}

interface RealTimeConnection {
  on(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}
```

### LSP — Liskov Substitution Principle

> **"Any implementation of an interface must be a drop-in replacement."**

- `HttpTurnoRepository` and a hypothetical `MockTurnoRepository` must both satisfy `TurnoRepository` without breaking consumers.
- `SocketIOConnection` and `NativeWebSocketConnection` must both satisfy `RealTimeConnection`.

---

## Phased Execution Workflow

**Execute in order. Each phase is an independent PR.**

| Phase | Focus                                        | Risk   | Ref Doc                                             |
| ----- | -------------------------------------------- | ------ | --------------------------------------------------- |
| **0** | **Standardize all identifiers to English**   | Low    | [NAMING-EN.md](references/NAMING-EN.md)             |
| 1     | Delete dead code                             | 0      | [DEAD-CODE.md](references/DEAD-CODE.md)             |
| 2     | Extract duplicated audio/toast logic (SRP)   | Low    | [HOOK-EXTRACTION.md](references/HOOK-EXTRACTION.md) |
| 3     | Fix DIP in hooks (inject abstractions)       | Medium | [DIP-HOOKS.md](references/DIP-HOOKS.md)             |
| 4     | Decompose middleware (SRP)                   | Medium | [MIDDLEWARE-SRP.md](references/MIDDLEWARE-SRP.md)   |
| 5     | Extract CircuitBreaker from httpClient (SRP) | Low    | [HTTP-CLIENT-SRP.md](references/HTTP-CLIENT-SRP.md) |
| 6     | Abstract AudioService behind interface (DIP) | Low    | [AUDIO-DIP.md](references/AUDIO-DIP.md)             |

---

## Anti-Patterns Checklist

Run this checklist on **every** refactoring PR:

```
□ ALL identifiers (variables, functions, types, files) are in English
□ No hook imports a concrete class directly (grep for `new Xxx(`)
□ No hook has > 2 useEffect blocks
□ No page component has audio/toast/filtering logic inline
□ No file has > 150 lines (flag for decomposition)
□ No `catch (err: any)` — use `catch (err: unknown)` + type guard
□ No duplicated logic across files (> 10 lines identical = extract)
□ No dead imports or unused files
□ No hardcoded config values (URLs, delays) — use env or constants
□ Middleware is < 30 lines and only orchestrates
□ Every interface has at least one consumer
```

---

## Naming Conventions

> **Language rule:** ALL code identifiers MUST be in **English**. Only UI-facing
> strings (labels, messages) may be in Spanish or use i18n keys.
> See [NAMING-EN.md](references/NAMING-EN.md) for the complete renaming map.

| Type             | Convention                           | Example                             |
| ---------------- | ------------------------------------ | ----------------------------------- |
| Custom hook      | `use` + PascalCase noun (English)    | `useRegisterTicket`                 |
| Interface        | PascalCase noun (English)            | `TicketRepository`, `SoundNotifier` |
| Utility function | camelCase verb (English)             | `mapErrorToUserMessage`             |
| Factory function | `create` + PascalCase noun           | `createTicketsSocket`               |
| Domain model     | PascalCase noun (English)            | `Ticket`, `CreateTicketDTO`         |
| Component        | PascalCase noun (English)            | `RegisterTicketForm`                |
| Route dir        | lowercase (English)                  | `register/`, `dashboard/`           |
| Middleware file  | `middleware.ts` (Next.js convention) | `src/middleware.ts`                 |
| Constant/config  | UPPER_SNAKE_CASE                     | `RATE_LIMIT_WINDOW`                 |
| Error codes      | UPPER_SNAKE_CASE string literal      | `"CIRCUIT_OPEN"`, `"TIMEOUT"`       |

---

## Target Directory Structure (Post-Refactor)

```
src/
├── app/                           # Next.js App Router pages
│   ├── page.tsx                   # Pure presentation (uses hooks)
│   ├── dashboard/page.tsx         # Pure presentation (uses hooks)
│   ├── registro/page.tsx          # Registration page
│   └── layout.tsx                 # Root layout
├── components/                    # Reusable UI components
│   └── RegistroTurnoForm/
├── config/
│   └── env.ts                     # Environment config (centralized)
├── domain/                        # Domain models (no deps)
│   ├── Turno.ts
│   └── CrearTurno.ts
├── hooks/                         # Custom hooks (SRP, DIP)
│   ├── useAudioNotification.ts    # Audio lifecycle hook [NEW]
│   ├── useNewItemToast.ts         # Toast detection hook [NEW]
│   ├── useRegistroTurno.ts        # Turno registration (injected repo)
│   └── useTurnosWebSocket.ts      # WebSocket hook (injected connection)
├── lib/                           # Utilities & infrastructure
│   ├── CircuitBreaker.ts          # Standalone circuit breaker [NEW]
│   ├── errorMessages.ts           # Error code → user message mapper [NEW]
│   ├── formatters.ts              # Date/time formatting utils [NEW]
│   ├── httpClient.ts              # Simplified HTTP client
│   ├── rateLimiter.ts             # Rate limiting logic [NEW]
│   └── securityHeaders.ts         # Security headers applier [NEW]
├── middleware.ts                   # Thin orchestrator (renamed from proxi.ts)
├── repositories/                  # Ports + Adapters
│   ├── TurnoRepository.ts         # Interface (port)
│   └── HttpTurnoRepository.ts     # Concrete adapter
├── security/
│   └── sanitize.ts                # Input sanitization
├── services/                      # Service interfaces + implementations
│   ├── SoundNotifier.ts           # Audio interface [NEW]
│   ├── AudioService.ts            # implements SoundNotifier
│   └── SocketFactory.ts           # RealTimeConnection factory [NEW]
└── styles/
    ├── globals.css
    └── page.module.css
```

---

## Verification Protocol

After **each phase**, run:

```bash
# 1. Build must pass
npm run build

# 2. Lint must pass
npm run lint

# 3. No concrete repository imports in hooks
grep -rn "new HttpTurnoRepository\|import.*HttpTurnoRepository" src/hooks/
# Expected: 0 results

# 4. No dead code references
grep -rn "useTurnosRealtime" src/
# Expected: 0 results

grep -rn "api/mock" src/
# Expected: 0 results

# 5. Middleware file named correctly
ls src/middleware.ts
# Expected: file exists

# 6. No `catch (err: any)` anywhere
grep -rn "catch.*any" src/
# Expected: 0 results
```

---

## Reference Documents

| File                                                | Purpose                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- |
| [NAMING-EN.md](references/NAMING-EN.md)             | Phase 0: English naming standardization + complete rename map |
| [DEAD-CODE.md](references/DEAD-CODE.md)             | Phase 1: Identifying and removing dead code safely            |
| [HOOK-EXTRACTION.md](references/HOOK-EXTRACTION.md) | Phase 2: Extracting custom hooks from duplicated logic        |
| [DIP-HOOKS.md](references/DIP-HOOKS.md)             | Phase 3: Dependency injection patterns for React hooks        |
| [MIDDLEWARE-SRP.md](references/MIDDLEWARE-SRP.md)   | Phase 4: Decomposing monolithic middleware                    |
| [HTTP-CLIENT-SRP.md](references/HTTP-CLIENT-SRP.md) | Phase 5: Extracting CircuitBreaker and simplifying httpClient |
| [AUDIO-DIP.md](references/AUDIO-DIP.md)             | Phase 6: Abstracting AudioService behind an interface         |

---

## Sources

- [DEBT_REPORT_FRONT.MD](file:///docs/DEBT_REPORT_FRONT.MD) — Original hostile architecture audit
- [PLAN_FRONT.MD](file:///docs/PLAN_FRONT.MD) — 6-phase refactoring plan
- Robert C. Martin, _Clean Code_ (2008)
- Robert C. Martin, _Clean Architecture_ (2017)
- Kent C. Dodds, _Epic React — Advanced Patterns_
- React Docs — [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- Next.js Docs — [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
