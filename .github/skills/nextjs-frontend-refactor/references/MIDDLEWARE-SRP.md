# Phase 4 — Middleware Decomposition (SRP)

## Principle

A middleware file should be a **thin orchestrator** that delegates to specialized
modules. It should NOT contain business logic, rate-limiting algorithms, or
security header definitions inline.

> **Next.js convention:** The middleware file MUST be named `middleware.ts` and
> live at `src/middleware.ts` (or project root). Names like `proxi.ts` are NOT
> detected automatically by Next.js.

---

## Current Problem: `proxi.ts`

The file `src/proxi.ts` has **3 unrelated responsibilities** in ~93 lines:

| Responsibility                        | Lines | Should Be                    |
| ------------------------------------- | ----- | ---------------------------- |
| Rate Limiting (in-memory IP tracking) | 17-47 | `src/lib/rateLimiter.ts`     |
| HTTP Method blocking                  | 52-58 | Inline (simple enough)       |
| Security Headers (CSP, XSS, etc.)     | 65-85 | `src/lib/securityHeaders.ts` |

---

## 4.1 — Extract Rate Limiter

### Create `src/lib/rateLimiter.ts`

```typescript
const WINDOW_MS = 10_000; // 10 seconds
const MAX_REQUESTS = 25;

interface RateLimitEntry {
  count: number;
  time: number;
}

const store = new Map<string, RateLimitEntry>();

function cleanExpiredEntries(now: number): void {
  for (const [ip, data] of store.entries()) {
    if (now - data.time > WINDOW_MS * 3) {
      store.delete(ip);
    }
  }
}

/**
 * Returns true if the request should be BLOCKED (rate limit exceeded).
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanExpiredEntries(now);

  const entry = store.get(ip);

  if (entry && now - entry.time < WINDOW_MS) {
    entry.count++;
    return entry.count > MAX_REQUESTS;
  }

  store.set(ip, { count: 1, time: now });
  return false;
}
```

**Design decisions:**

- Function name `isRateLimited` makes the boolean semantics clear
- Config constants at top, easily swappable for env vars
- `cleanExpiredEntries` prevents memory leak
- Single responsibility: **only** rate limiting

---

## 4.2 — Extract Security Headers

### Create `src/lib/securityHeaders.ts`

```typescript
import { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

/**
 * Applies security headers to a NextResponse.
 */
export function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES.join("; "));
}
```

**Design decisions:**

- Headers as a declarative config object (easy to audit)
- CSP directives as an array (easy to read and modify)
- Single function `applySecurityHeaders` with no return value
- Changing CSP or adding a header does NOT touch the rate limiter

---

## 4.3 — Simplified `middleware.ts`

### After Decomposition

```typescript
// src/middleware.ts (renamed from proxi.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRateLimited } from "@/lib/rateLimiter";
import { applySecurityHeaders } from "@/lib/securityHeaders";

const ALLOWED_METHODS = ["GET", "POST", "OPTIONS"];

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  const ip = getClientIP(req);

  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  if (!ALLOWED_METHODS.includes(req.method)) {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 },
    );
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: "/:path*",
};
```

**Result:** ~25 lines. Each line reads like pseudocode. The middleware is now a
**composition root** that delegates to focused modules.

---

## Verification

```bash
# File must be named correctly
ls src/middleware.ts  # must exist
ls src/proxi.ts      # must NOT exist

# No inline rate limit logic in middleware
grep -n "new Map\|cleanStore\|WINDOW" src/middleware.ts
# Expected: 0 results

# No inline security headers in middleware
grep -n "X-Frame\|CSP\|nosniff" src/middleware.ts
# Expected: 0 results

# Build must pass
npm run build
```
