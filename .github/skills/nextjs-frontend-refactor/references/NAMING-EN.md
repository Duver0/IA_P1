# Phase 0 — English Naming Standardization

## Principle

> **"Code is read 10x more than it is written. Use a single, universal language
> for identifiers."** — Clean Code, Ch. 2

All variable names, function names, component names, type names, interface
methods, file names, and directory names MUST be in **English**. This applies
to the entire codebase — not just new code, but existing code during refactoring.

> [!IMPORTANT]
> **UI strings** (labels, messages displayed to the user) stay in Spanish or use
> an i18n system. This rule applies ONLY to **code identifiers**.

---

## Complete Renaming Map

### Domain Models

| Current (Spanish)    | Target (English)       | File                                              |
| -------------------- | ---------------------- | ------------------------------------------------- |
| `Turno`              | `Ticket`               | `domain/Turno.ts` → `domain/Ticket.ts`            |
| `TurnoEstado`        | `TicketStatus`         | `domain/Turno.ts` → `domain/Ticket.ts`            |
| `TurnoPriority`      | `TicketPriority`       | (already English, keep)                           |
| `"espera"`           | `"waiting"`            | Enum value in `TicketStatus`                      |
| `"llamado"`          | `"called"`             | Enum value in `TicketStatus`                      |
| `"atendido"`         | `"served"`             | Enum value in `TicketStatus`                      |
| `"alta"`             | `"high"`               | Enum value in `TicketPriority`                    |
| `"media"`            | `"medium"`             | Enum value in `TicketPriority`                    |
| `"baja"`             | `"low"`                | Enum value in `TicketPriority`                    |
| `nombre`             | `name`                 | Property in `Ticket`                              |
| `cedula`             | `documentId`           | Property in `Ticket`                              |
| `consultorio`        | `office`               | Property in `Ticket`                              |
| `estado`             | `status`               | Property in `Ticket`                              |
| `CrearTurnoDTO`      | `CreateTicketDTO`      | `domain/CrearTurno.ts` → `domain/CreateTicket.ts` |
| `CrearTurnoResponse` | `CreateTicketResponse` | `domain/CrearTurno.ts` → `domain/CreateTicket.ts` |

### Files & Directories

| Current Path                              | Target Path                                |
| ----------------------------------------- | ------------------------------------------ |
| `src/domain/Turno.ts`                     | `src/domain/Ticket.ts`                     |
| `src/domain/CrearTurno.ts`                | `src/domain/CreateTicket.ts`               |
| `src/hooks/useRegistroTurno.ts`           | `src/hooks/useRegisterTicket.ts`           |
| `src/hooks/useTurnosWebSocket.ts`         | `src/hooks/useTicketsWebSocket.ts`         |
| `src/repositories/TurnoRepository.ts`     | `src/repositories/TicketRepository.ts`     |
| `src/repositories/HttpTurnoRepository.ts` | `src/repositories/HttpTicketRepository.ts` |
| `src/components/RegistroTurnoForm/`       | `src/components/RegisterTicketForm/`       |
| `src/app/registro/page.tsx`               | `src/app/register/page.tsx`                |

### Interfaces & Classes

| Current               | Target                 | Location         |
| --------------------- | ---------------------- | ---------------- |
| `TurnoRepository`     | `TicketRepository`     | `repositories/`  |
| `HttpTurnoRepository` | `HttpTicketRepository` | `repositories/`  |
| `obtenerTurnos()`     | `getTickets()`         | Interface method |
| `crearTurno()`        | `createTicket()`       | Interface method |
| `RegistroTurnoForm`   | `RegisterTicketForm`   | `components/`    |

### Hooks

| Current                | Target                |
| ---------------------- | --------------------- |
| `useRegistroTurno`     | `useRegisterTicket`   |
| `useTurnosWebSocket`   | `useTicketsWebSocket` |
| `useAudioNotification` | (already English ✅)  |
| `useNewItemToast`      | (already English ✅)  |

### Local Variables & Functions

| Current              | Target                | Files                                      |
| -------------------- | --------------------- | ------------------------------------------ |
| `nombre` (state)     | `name`                | `RegistroTurnoForm.tsx`                    |
| `cedula` (state)     | `documentId`          | `RegistroTurnoForm.tsx`                    |
| `nombreSeguro`       | `sanitizedName`       | `RegistroTurnoForm.tsx`                    |
| `cedulaSegura`       | `sanitizedDocumentId` | `RegistroTurnoForm.tsx`                    |
| `validCedula`        | `parsedDocumentId`    | `RegistroTurnoForm.tsx`                    |
| `registrar`          | `register`            | `useRegistroTurno.ts`                      |
| `turnos`             | `tickets`             | All hooks, pages                           |
| `turnosLlamados`     | `calledTickets`       | `page.tsx`                                 |
| `turnosEspera`       | `waitingTickets`      | `page.tsx`                                 |
| `turnosAtendidos`    | `servedTickets`       | `dashboard/page.tsx`                       |
| `formatHora`         | `formatTime`          | `dashboard/page.tsx` → `lib/formatters.ts` |
| `updateTurno`        | `updateTicket`        | `useTurnosWebSocket.ts`                    |
| `turnoActualizado`   | `updatedTicket`       | `useTurnosWebSocket.ts`                    |
| `TurnosPantalla`     | `TicketsScreen`       | `page.tsx` component name                  |
| `DashboardAtendidos` | `ServedDashboard`     | `dashboard/page.tsx` component name        |
| `RegistroPage`       | `RegisterPage`        | `registro/page.tsx` component name         |

### WebSocket Events (Backend Contract)

> [!WARNING]
> These event names are shared with the backend. Renaming them requires
> coordinated changes in both frontend and backend.

| Current             | Target             | Impact                          |
| ------------------- | ------------------ | ------------------------------- |
| `TURNOS_SNAPSHOT`   | `TICKETS_SNAPSHOT` | Backend gateway + frontend hook |
| `TURNO_ACTUALIZADO` | `TICKET_UPDATED`   | Backend gateway + frontend hook |

**If backend cannot be changed simultaneously**, keep the event string names
as-is and add a comment:

```typescript
// WS event names match backend contract — do not rename without backend sync
socket.on("TURNOS_SNAPSHOT", (payload) => { ... });
```

### CSS Class Names

| Current     | Target    |
| ----------- | --------- |
| `.nombre`   | `.name`   |
| `.hora`     | `.time`   |
| `.atendido` | `.served` |

---

## Execution Strategy

### Order of Renaming (Bottom-Up)

1. **Domain models first** — `Turno.ts`, `CrearTurno.ts` (everything depends on these)
2. **Repository interfaces** — `TurnoRepository.ts` (ports)
3. **Repository implementations** — `HttpTurnoRepository.ts`
4. **Hooks** — `useRegistroTurno.ts`, `useTurnosWebSocket.ts`
5. **Components** — `RegistroTurnoForm.tsx`
6. **Pages** — `page.tsx`, `dashboard/page.tsx`, `registro/page.tsx`
7. **CSS modules** — class name updates
8. **Route directories** — `registro/` → `register/`

### Using IDE Rename (Recommended)

Use TypeScript-aware rename (F2 in VS Code) for each identifier. This
propagates changes to all references automatically.

For file renames, use `git mv` to preserve history:

```bash
git mv src/domain/Turno.ts src/domain/Ticket.ts
git mv src/domain/CrearTurno.ts src/domain/CreateTicket.ts
git mv src/hooks/useRegistroTurno.ts src/hooks/useRegisterTicket.ts
git mv src/hooks/useTurnosWebSocket.ts src/hooks/useTicketsWebSocket.ts
git mv src/repositories/TurnoRepository.ts src/repositories/TicketRepository.ts
git mv src/repositories/HttpTurnoRepository.ts src/repositories/HttpTicketRepository.ts
git mv src/components/RegistroTurnoForm src/components/RegisterTicketForm
git mv src/app/registro src/app/register
```

---

## Verification

```bash
# No Spanish identifiers in code (excluding UI strings and comments)
# Check for common Spanish words used as identifiers
grep -rn --include='*.ts' --include='*.tsx' \
  'turno\|Turno\|registro\|Registro\|obtener\|crear\|Crear\|cedula\|nombre\b' \
  src/ \
  | grep -v '// ' \
  | grep -v '"' \
  | grep -v "'" \
  | grep -v 'import.*from'
# Expected: minimal results (only UI strings)

npm run build  # Must compile
npm run lint   # Must pass
```

---

## Rule for New Code

> **All new identifiers MUST be in English.** No exceptions. If a domain term is
> inherently Spanish (e.g., "cédula"), use the closest English equivalent
> (`documentId`) or a transliteration. UI-facing strings can remain in Spanish
> or use i18n keys.
