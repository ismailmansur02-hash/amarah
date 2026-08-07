import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/** Manager records a new lease; any previously active lease is marked ended. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const startDate = str(form, "start_date");
  const endDate = str(form, "end_date");
  const rent = num(form, "monthly_rent");
  if (!startDate || !endDate || rent === null) {
    return jsonError("Start date, end date, and monthly rent are required");
  }

  db.prepare("UPDATE leases SET status = 'ended' WHERE property_id = ? AND status = 'active'")
    .run(property.id);
  db.prepare(
    `INSERT INTO leases (property_id, start_date, end_date, monthly_rent, deposit, due_day, status, notes)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    property.id,
    startDate,
    endDate,
    rent,
    num(form, "deposit") ?? 0,
    num(form, "due_day") ?? 1,
    str(form, "status") === "pending" ? "pending" : "active",
    str(form, "notes")
  );
  logActivity(property.id, session.uid, "Lease recorded", `$${rent}/mo, ${startDate} to ${endDate}`);
  return NextResponse.json({ ok: true });
}
