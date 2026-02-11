import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;

    return "unknown";
}

/**
 * RATE LIMIT (in-memory simple)
 */
const WINDOW = 10_000; // 10s
const MAX = 25;

const store = new Map<string, { count: number; time: number }>();

function cleanStore(now: number) {
    for (const [ip, data] of store.entries()) {
        if (now - data.time > WINDOW * 3) {
            store.delete(ip); // evita memory leak
        }
    }
}

export function middleware(req: NextRequest) {
    const now = Date.now();
    cleanStore(now);

    const ip = getClientIP(req);
    const entry = store.get(ip);

    if (entry && now - entry.time < WINDOW) {
        entry.count++;
        if (entry.count > MAX) {
            return NextResponse.json(
                { message: "Too many requests" },
                { status: 429 }
            );
        }
    } else {
        store.set(ip, { count: 1, time: now });
    }

    /**
     * Bloqueo de métodos peligrosos
     */
    const allowed = ["GET", "POST", "OPTIONS"];
    if (!allowed.includes(req.method)) {
        return NextResponse.json(
            { message: "Method not allowed" },
            { status: 405 }
        );
    }

    const res = NextResponse.next();

    /**
     * HEADERS DE SEGURIDAD
     */
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("X-XSS-Protection", "1; mode=block");

    /**
     * CSP compatible con Next (dev + prod)
     */
    res.headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join("; ")
    );

    return res;
}

export const config = {
    matcher: "/:path*",
};
