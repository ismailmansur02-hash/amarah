import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str } from "@/lib/api";

/** Manager adds a tenant to the property file. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const name = str(form, "name");
  if (!name) return jsonError("Tenant name is required");

  db.prepare("INSERT INTO tenants (property_id, name, email, phone, notes) VALUES (?,?,?,?,?)")
    .run(property.id, name, str(form, "email"), str(form, "phone"), str(form, "notes"));
  logActivity(property.id, session.uid, "Tenant added", name);
  return NextResponse.json({ ok: true });
}
