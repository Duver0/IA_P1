# Phase 3 — Dependency Inversion in Hooks (DIP)

## Principle

> **"High-level modules should not depend on low-level modules.
> Both should depend on abstractions."** — Robert C. Martin

In React: **hooks and components** are high-level modules. **Repositories,
Socket clients, HTTP clients** are low-level modules. The hook should depend
on an **interface**, and receive the concrete implementation via parameter
injection.

---

## Pattern: Interface + Injection in React Hooks

### Generic Pattern

```typescript
// 1. Define the interface (port)
interface DataRepository {
  getItems(): Promise<Item[]>;
  createItem(data: CreateDTO): Promise<Response>;
}

// 2. Hook depends on interface, receives implementation
function useItems(repository: DataRepository) {
  // uses repository.getItems(), repository.createItem()
}

// 3. Page/component injects the concrete implementation
const repo = new HttpDataRepository();
const { items } = useItems(repo);
```

---

## 3.1 — Inyectar Repositorio en `useRegistroTurno`

### Antes (Viola DIP)

```typescript
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";

export function useRegistroTurno() {
  const repositoryRef = useRef<HttpTurnoRepository | null>(null);
  if (!repositoryRef.current) {
    repositoryRef.current = new HttpTurnoRepository(); // ❌ Concrete
  }
}
```

**Problemas:**

- Imposible hacer test unitario sin mockear módulos completos
- Imposible intercambiar implementación (mock, cache, otro adapter)
- La interfaz `TurnoRepository` existe pero nadie la usa

### Después (DIP Correcto)

```typescript
import type { TurnoRepository } from "@/repositories/TurnoRepository";

export function useRegistroTurno(repository: TurnoRepository) {
  const repositoryRef = useRef<TurnoRepository>(repository);
  // Usa repositoryRef.current.crearTurno(data)
}
```

**Ventajas:**

- Testeable con mock: `useRegistroTurno(mockRepo)`
- Intercambiable sin modificar el hook
- La interfaz `TurnoRepository` ahora tiene consumidores reales

### Actualizar Consumidores

```typescript
// En RegistroTurnoForm.tsx o donde se use el hook
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";

const repository = useMemo(() => new HttpTurnoRepository(), []);
const { registrar, loading, success, error } = useRegistroTurno(repository);
```

---

## 3.2 — Extraer Error Message Mapping

### Antes

```typescript
// Dentro de useRegistroTurno.ts, líneas 78-98
switch (message) {
  case "TIMEOUT":
    userMessage = "El servidor tardó demasiado. Intente nuevamente.";
    break;
  case "RATE_LIMIT":
    userMessage = "Demasiadas solicitudes. Espere unos segundos.";
    break;
  // ...más cases
}
```

### Después

```typescript
// src/lib/errorMessages.ts — NUEVO
const ERROR_MESSAGES: Record<string, string> = {
  TIMEOUT: "El servidor tardó demasiado. Intente nuevamente.",
  RATE_LIMIT: "Demasiadas solicitudes. Espere unos segundos.",
  HTTP_ERROR: "Error del servidor. Intente más tarde.",
  SERVER_ERROR: "Error del servidor. Intente más tarde.",
  CIRCUIT_OPEN: "Servidor temporalmente no disponible. Reintentando...",
};

const DEFAULT_MESSAGE = "No se pudo registrar el turno.";

export function mapErrorToUserMessage(technicalError: string): string {
  return ERROR_MESSAGES[technicalError] ?? DEFAULT_MESSAGE;
}
```

```typescript
// En useRegistroTurno.ts — SIMPLIFICADO
import { mapErrorToUserMessage } from "@/lib/errorMessages";

} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
  safeSet(setError, mapErrorToUserMessage(message));
}
```

**Ventajas:**

- SRP: el hook no sabe nada de mensajes de usuario
- OCP: agregar un nuevo error = agregar una entrada al Record, sin tocar el hook
- Reutilizable por otros hooks o componentes

---

## 3.3 — Abstraer WebSocket con `RealTimeConnection`

### Antes (Acoplamiento a Socket.IO)

```typescript
import { io, Socket } from "socket.io-client";

const socket = io(`${env.WS_URL}/ws/turnos`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});
```

### Después (Abstraído)

**Paso 1 — Definir interfaz:**

```typescript
// src/services/SocketFactory.ts
export interface RealTimeConnection {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}

export interface RealTimeConnectionFactory {
  create(namespace: string): RealTimeConnection;
}
```

**Paso 2 — Implementación Socket.IO:**

```typescript
// src/services/SocketIOConnectionFactory.ts
import { io } from "socket.io-client";
import type {
  RealTimeConnection,
  RealTimeConnectionFactory,
} from "./SocketFactory";
import { env } from "@/config/env";

const DEFAULT_CONFIG = {
  transports: ["websocket"] as string[],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
};

export class SocketIOConnectionFactory implements RealTimeConnectionFactory {
  create(namespace: string): RealTimeConnection {
    return io(`${env.WS_URL}${namespace}`, DEFAULT_CONFIG);
  }
}
```

**Paso 3 — Hook inyectable:**

```typescript
// src/hooks/useTurnosWebSocket.ts
import type { RealTimeConnectionFactory } from "@/services/SocketFactory";

export function useTurnosWebSocket(factory: RealTimeConnectionFactory) {
  useEffect(() => {
    const socket = factory.create("/ws/turnos");

    socket.on("connect", () => {
      /* ... */
    });
    socket.on("TURNOS_SNAPSHOT", (payload) => {
      /* ... */
    });
    socket.on("TURNO_ACTUALIZADO", (payload) => {
      /* ... */
    });

    return () => socket.disconnect();
  }, [factory]);
}
```

**Ventajas:**

- Migrar a SSE, WebSocket nativo, o Firebase = nueva implementación de `RealTimeConnectionFactory`
- El hook no importa `socket.io-client` directamente
- Testeable con mock de `RealTimeConnection`

---

## Testing con DIP

### Antes (Sin DIP — Requiere module mocking)

```typescript
// ❌ Requiere jest.mock() o vitest.mock() para interceptar imports
jest.mock("@/repositories/HttpTurnoRepository");
const { result } = renderHook(() => useRegistroTurno());
```

### Después (Con DIP — Mock limpio)

```typescript
// ✅ Mock directo, sin hack de módulos
const mockRepo: TurnoRepository = {
  obtenerTurnos: vi.fn().mockResolvedValue([]),
  crearTurno: vi.fn().mockResolvedValue({ message: "OK" }),
};

const { result } = renderHook(() => useRegistroTurno(mockRepo));
```

---

## Regla de Oro

> **Si ves `new ConcreteClass()` dentro de un hook o componente, es una
> violación DIP.** La instanciación debe ocurrir en el punto de composición
> (el componente que consume el hook, o un Provider/factory).
