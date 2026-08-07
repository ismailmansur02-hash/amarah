import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "portal_session";

let cachedSecret: Uint8Array | null = null;

/** Lazy for the same reason as lib/auth.ts: `next build` must not trip it. */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !fromEnv) {
    throw new Error(
      "SESSION_SECRET must be set in production. Generate one with: openssl rand -base64 32"
    );
  }
  cachedSecret = new TextEncoder().encode(
    fromEnv || "dev-only-secret-change-me-in-production-0123456789"
  );
  return cachedSecret;
}

/**
 * Reachable without a session: login, the login API, the install guide, and
 * the health probe the host calls before traffic is routed.
 */
const PUBLIC_PATHS = ["/login", "/api/login", "/install", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  if (token) {
    // Resolved outside the try so a misconfigured secret surfaces as a real
    // error instead of being swallowed into a silent redirect loop.
    const key = getSecret();
    try {
      await jwtVerify(token, key);
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // PWA assets must stay publicly reachable or the app cannot be installed
  // from the login screen.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/).*)",
  ],
};
