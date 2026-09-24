import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, one, ensureBootstrapManager, isConnectionFailure } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { jsonError, str } from "@/lib/api";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: "manager" | "client";
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = str(form, "username").toLowerCase();
  const password = str(form, "password");
  if (!username || !password) return jsonError("Username and password are required");

  let user: UserRow | undefined;
  try {
    // Serverless has no startup hook, so the first manager account is created
    // here on the first login attempt against an empty database.
    await ensureBootstrapManager();

    user = await one<UserRow>(
      sql`SELECT id, username, password_hash, name, role FROM portal_users WHERE username = ${username}`
    );
  } catch (err) {
    // An unreachable database is not a wrong password and not a generic
    // server error, and saying so is the difference between "try again in a
    // minute" and someone retyping a password that was right all along.
    if (isConnectionFailure(err)) {
      return NextResponse.json(
        { error: "The database is waking up", code: "database_asleep" },
        { status: 503 }
      );
    }
    throw err;
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return jsonError("Invalid credentials", 401);
  }

  const token = await createSessionToken({
    uid: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
  });

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
