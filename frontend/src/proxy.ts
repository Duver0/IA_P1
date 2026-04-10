import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_METHODS = new Set(["GET", "POST", "OPTIONS"]);



function applySecurityHeaders(res: NextResponse): void {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";
  const wsProtocolUrl = wsUrl.replace(/^http/, "ws");
  const isDev = process.env.NODE_ENV === "development";

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      `connect-src 'self' ${wsUrl} ${wsProtocolUrl}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
}

export function proxy(req: NextRequest) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 }
    );
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds).*)"],
};
