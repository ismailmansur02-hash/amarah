import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "portal_session";

const DEV_SECRET = "dev-only-secret-change-me-in-production-0123456789";

let cachedSecret: Uint8Array | null = null;

/**
 * Resolved on first use rather than at import time — `next build` runs with
 * NODE_ENV=production and would otherwise fail purely from loading this file.
 */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !fromEnv) {
    throw new Error(
      "SESSION_SECRET must be set in production. Without it, session cookies are " +
        "signed with a public development key and anyone could forge a login. " +
        "Generate one with: openssl rand -base64 32"
    );
  }
  cachedSecret = new TextEncoder().encode(fromEnv || DEV_SECRET);
  return cachedSecret;
}

export type Session = {
  uid: number;
  role: "manager" | "client";
  name: string;
  username: string;
};

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.uid !== "number" || typeof payload.role !== "string") return null;
    return {
      uid: payload.uid as number,
      role: payload.role as Session["role"],
      name: String(payload.name ?? ""),
      username: String(payload.username ?? ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}
