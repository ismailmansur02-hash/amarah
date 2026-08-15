import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, one } from "@/lib/db";
import { requireApiSession, isResponse, jsonError, str } from "@/lib/api";

/** Manager creates a pre-made client login to hand to the owner. */
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const form = await req.formData();
  const username = str(form, "username").toLowerCase();
  const password = str(form, "password");
  const name = str(form, "name");
  const email = str(form, "email");

  if (!username || !password || !name) {
    return jsonError("Username, password, and name are required");
  }
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return jsonError("Username must be 3–32 characters: letters, numbers, dot, dash, underscore");
  }
  if (password.length < 8) return jsonError("Password must be at least 8 characters");

  const exists = await one(sql`SELECT id FROM portal_users WHERE username = ${username}`);
  if (exists) return jsonError("That username is already taken");

  const created = await one<{ id: number }>(sql`
    INSERT INTO portal_users (username, password_hash, name, email, role)
    VALUES (${username}, ${bcrypt.hashSync(password, 10)}, ${name}, ${email}, 'client')
    RETURNING id`);

  return NextResponse.json({ ok: true, id: created!.id });
}
