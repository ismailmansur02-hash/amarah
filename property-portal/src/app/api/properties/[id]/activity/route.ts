import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str } from "@/lib/api";

/** Manager records a manual accomplishment in the property's activity checklist. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const action = str(form, "action");
  if (!action) return jsonError("A description is required");

  logActivity(property.id, session.uid, action, str(form, "detail"));
  return NextResponse.json({ ok: true });
}
