# Phase 5 — HTTP Client Decomposition (SRP)

## Principle

Each resilience pattern (Circuit Breaker, Retry, Timeout) should be an
**independent, testable module**. Mixing them in a single 175-line function
makes it impossible to:

- Test the Circuit Breaker without mocking `fetch`
- Change retry strategy without risking the Circuit Breaker
- Reuse the Circuit Breaker with WebSocket or GraphQL

---

## 5.1 — Extract `CircuitBreaker` Class

### Create `src/lib/CircuitBreaker.ts`

```typescript
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private nextTry = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly cooldownMs = 10_000,
  ) {}

  canRequest(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextTry) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextTry = Date.now() + this.cooldownMs;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Registry of circuit breakers by host.
 * Prevents cascading failures to the same backend.
 */
const circuits = new Map<string, CircuitBreaker>();

export function getCircuitForUrl(url: string): CircuitBreaker {
  const host = new URL(url, "http://dummy").host;

  if (!circuits.has(host)) {
    circuits.set(host, new CircuitBreaker());
  }

  return circuits.get(host)!;
}
```

**Design decisions:**

- Methods renamed to `recordSuccess()`/`recordFailure()` — clearer intent
- Class is independently testable (no `fetch` dependency)
- Registry function `getCircuitForUrl` keeps per-host behavior
- Can be reused by WebSocket, GraphQL, or any I/O

---

## 5.2 — Simplified `httpClient.ts`

### After Extraction

```typescript
import { getCircuitForUrl } from "./CircuitBreaker";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function request<T>(
  url: string,
  options: RequestInit,
  retries = 2,
  timeout = 4000,
): Promise<T> {
  const circuit = getCircuitForUrl(url);

  if (!circuit.canRequest()) {
    throw new Error("CIRCUIT_OPEN");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) throw new Error("RATE_LIMIT");
        if (res.status >= 500) throw new Error("SERVER_ERROR");
        throw new Error("HTTP_ERROR");
      }

      const data: T = await res.json();
      circuit.recordSuccess();
      return data;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      const error = err instanceof Error ? err : new Error(String(err));

      if (error.name === "AbortError") {
        if (attempt === retries) {
          circuit.recordFailure();
          throw new Error("TIMEOUT");
        }
      } else if (error.message === "RATE_LIMIT") {
        throw error; // No retry for rate limit
      } else {
        if (attempt === retries) {
          circuit.recordFailure();
          throw error;
        }
      }

      // Exponential backoff
      await sleep(300 * Math.pow(2, attempt));
    }
  }

  throw new Error("UNEXPECTED_HTTP_ERROR");
}

export function httpGet<T>(url: string): Promise<T> {
  return request<T>(url, { method: "GET", cache: "no-store" });
}

export function httpPost<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

**Key changes:**

- `catch (err: any)` → `catch (err: unknown)` + type guard (**eliminates the shameful `any`**)
- Circuit Breaker imported from dedicated module
- File reduced from ~175 to ~70 lines
- Each concern is now independently testable

---

## Testing the CircuitBreaker (Independently)

```typescript
import { CircuitBreaker } from "@/lib/CircuitBreaker";

describe("CircuitBreaker", () => {
  it("should be CLOSED initially", () => {
    const cb = new CircuitBreaker(3, 5000);
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("should open after threshold failures", () => {
    const cb = new CircuitBreaker(3, 5000);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });

  it("should reset on success", () => {
    const cb = new CircuitBreaker(3, 5000);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });
});
```

No `fetch` mock needed. No HTTP calls. Pure state machine testing.

---

## Verification

```bash
# CircuitBreaker is no longer defined in httpClient
grep -n "class CircuitBreaker" src/lib/httpClient.ts
# Expected: 0 results

# CircuitBreaker exists in its own file
grep -n "class CircuitBreaker" src/lib/CircuitBreaker.ts
# Expected: 1 result

# No `catch (err: any)` anywhere
grep -rn "catch.*any" src/lib/
# Expected: 0 results

npm run build
```
