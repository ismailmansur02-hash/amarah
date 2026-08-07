import { NextRequest, NextResponse } from "next/server";
import { sql, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/format";

/** Manager updates property status, fee, scope, or notes. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();

  const status = str(form, "status");
  if (status) {
    if (!(status in STATUS_LABELS)) return jsonError("Invalid status");
    if (status !== property.status) {
      await sql`UPDATE properties SET status = ${status} WHERE id = ${property.id}`;
      await logActivity(
        property.id,
        session.uid,
        "Status changed",
        `${STATUS_LABELS[property.status]} → ${STATUS_LABELS[status]}`
      );
    }
    return NextResponse.json({ ok: true });
  }

  const scope = form.get("renovation_scope");
  if (typeof scope === "string") {
    await sql`UPDATE properties SET renovation_scope = ${scope.trim()} WHERE id = ${property.id}`;
    await logActivity(property.id, session.uid, "Renovation scope updated");
    return NextResponse.json({ ok: true });
  }

  const feeValue = num(form, "management_fee_value");
  const feeType = str(form, "management_fee_type");
  if (feeValue !== null && (feeType === "percent" || feeType === "flat")) {
    await sql`UPDATE properties SET management_fee_type = ${feeType},
                management_fee_value = ${feeValue} WHERE id = ${property.id}`;
    await logActivity(
      property.id,
      session.uid,
      "Management fee updated",
      feeType === "percent" ? `${feeValue}% of collected rent` : `$${feeValue}/month flat`
    );
    return NextResponse.json({ ok: true });
  }

  const notes = form.get("notes");
  if (typeof notes === "string") {
    await sql`UPDATE properties SET notes = ${notes.trim()} WHERE id = ${property.id}`;
    return NextResponse.json({ ok: true });
  }

  return jsonError("Nothing to update");
}
