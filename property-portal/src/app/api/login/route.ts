import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { jsonError, str } from "@/lib/api";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = str(form, "username").toLowerCase();
  const password = str(form, "password");
  if (!username || !password) return jsonError("Username and password are required");

  const user = db
    .prepare("SELECT id, username, password_hash, name, role FROM users WHERE username = ?")
    .get(username) as
    | { id: number; username: string; password_hash: string; name: string; role: "manager" | "client" }
    | undefined;

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
