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
 * Reachable without a session: the landing page, login, the login API, the
 * install guide, and the health probe the host calls before traffic is routed.
 * The landing page itself sends anyone already signed in to their dashboard.
 */
const PUBLIC_PATHS = ["/", "/login", "/api/login", "/install", "/api/health"];

/**
 * Pages a signed-in person should not be looking at, and where they go
 * instead. Handled here rather than in the pages themselves: a page that
 * reads the session cookie cannot be statically rendered, and these two are
 * the first thing anybody loads.
 */
const REDIRECT_WHEN_SIGNED_IN = ["/", "/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  let role: string | undefined;
  if (token) {
    // Resolved outside the try so a misconfigured secret surfaces as a real
    // error instead of being swallowed into a silent redirect loop.
    const key = getSecret();
    try {
      const { payload } = await jwtVerify(token, key);
      valid = true;
      role = typeof payload.role === "string" ? payload.role : undefined;
    } catch {
      valid = false;
    }
  }

  if (REDIRECT_WHEN_SIGNED_IN.includes(pathname)) {
    if (!valid) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = role === "manager" ? "/dashboard" : "/my";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

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
  // from the login screen, and the landing page's photographs must be too —
  // they sit on a page anyone can see, so sending them to /login leaves the
  // hero showing nothing but its placeholder.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|photos/).*)",
  ],
};
