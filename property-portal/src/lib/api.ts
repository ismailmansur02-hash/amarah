import { NextResponse } from "next/server";
import { getSession, Session } from "./auth";
import { getPropertyForSession, PropertyRow } from "./access";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiSession(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Not authenticated", 401);
  return session;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

/** Resolves the property if the session may access it; otherwise a 404 response. */
export function resolveProperty(
  idParam: string,
  session: Session
): PropertyRow | NextResponse {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return jsonError("Invalid property id", 400);
  const property = getPropertyForSession(id, session);
  if (!property) return jsonError("Property not found", 404);
  return property;
}

export function str(form: FormData, key: string, fallback = ""): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

export function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
