import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, one } from "@/lib/db";
import { requireApiSession, isResponse, jsonError, str } from "@/lib/api";

/**
 * Change a password.
 *
 * - Changing your own password always requires the current one.
 * - A manager can reset a client's password without knowing it — this is the
 *   "my client lost their login" flow.
 * - Nobody can change another manager's password.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) return jsonError("Invalid user id", 400);

  const target = await one<{
    id: number;
    role: "manager" | "client";
    password_hash: string;
  }>(sql`SELECT id, role, password_hash FROM portal_users WHERE id = ${targetId}`);
  if (!target) return jsonError("User not found", 404);

  const isSelf = target.id === session.uid;
  const managerResettingClient = !isSelf && session.role === "manager" && target.role === "client";
  if (!isSelf && !managerResettingClient) return jsonError("Not allowed", 403);

  const form = await req.formData();
  const newPassword = str(form, "password");
  if (newPassword.length < 8) return jsonError("New password must be at least 8 characters");

  if (isSelf) {
    const current = str(form, "current_password");
    if (!current || !bcrypt.compareSync(current, target.password_hash)) {
      return jsonError("Current password is incorrect", 403);
    }
    if (bcrypt.compareSync(newPassword, target.password_hash)) {
      return jsonError("New password must be different from the current one");
    }
  }

  await sql`UPDATE portal_users SET password_hash = ${bcrypt.hashSync(newPassword, 10)} WHERE id = ${target.id}`;
  return NextResponse.json({ ok: true });
}
