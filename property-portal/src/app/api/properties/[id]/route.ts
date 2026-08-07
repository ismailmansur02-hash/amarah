import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/format";

/** Manager updates property status, fee, scope, or notes. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();

  const status = str(form, "status");
  if (status) {
    if (!(status in STATUS_LABELS)) return jsonError("Invalid status");
    if (status !== property.status) {
      db.prepare("UPDATE properties SET status = ? WHERE id = ?").run(status, property.id);
      logActivity(property.id, session.uid, "Status changed", `${STATUS_LABELS[property.status]} → ${STATUS_LABELS[status]}`);
    }
    return NextResponse.json({ ok: true });
  }

  const scope = form.get("renovation_scope");
  if (typeof scope === "string") {
    db.prepare("UPDATE properties SET renovation_scope = ? WHERE id = ?").run(scope.trim(), property.id);
    logActivity(property.id, session.uid, "Renovation scope updated");
    return NextResponse.json({ ok: true });
  }

  const feeValue = num(form, "management_fee_value");
  const feeType = str(form, "management_fee_type");
  if (feeValue !== null && (feeType === "percent" || feeType === "flat")) {
    db.prepare("UPDATE properties SET management_fee_type = ?, management_fee_value = ? WHERE id = ?")
      .run(feeType, feeValue, property.id);
    logActivity(property.id, session.uid, "Management fee updated",
      feeType === "percent" ? `${feeValue}% of collected rent` : `$${feeValue}/month flat`);
    return NextResponse.json({ ok: true });
  }

  const notes = form.get("notes");
  if (typeof notes === "string") {
    db.prepare("UPDATE properties SET notes = ? WHERE id = ?").run(notes.trim(), property.id);
    return NextResponse.json({ ok: true });
  }

  return jsonError("Nothing to update");
}
