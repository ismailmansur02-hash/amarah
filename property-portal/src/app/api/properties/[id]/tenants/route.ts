import { NextRequest, NextResponse } from "next/server";
import { sql, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str } from "@/lib/api";

/** Manager adds a tenant to the property file. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const name = str(form, "name");
  if (!name) return jsonError("Tenant name is required");

  await sql`INSERT INTO tenants (property_id, name, email, phone, notes)
            VALUES (${property.id}, ${name}, ${str(form, "email")},
                    ${str(form, "phone")}, ${str(form, "notes")})`;
  await logActivity(property.id, session.uid, "Tenant added", name);
  return NextResponse.json({ ok: true });
}
