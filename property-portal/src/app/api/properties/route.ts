import { NextRequest, NextResponse } from "next/server";
import { db, createChecklistFromTemplate, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, jsonError, str, num } from "@/lib/api";

/** Manager creates a new property file for a client. */
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const form = await req.formData();
  const clientId = num(form, "client_id");
  const name = str(form, "name");
  const address = str(form, "address");
  const takeoverDate = str(form, "takeover_date");
  if (!clientId || !name || !address || !takeoverDate) {
    return jsonError("Client, name, address, and takeover date are required");
  }
  const client = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'client'")
    .get(clientId);
  if (!client) return jsonError("Unknown client");

  const feeType = str(form, "management_fee_type") === "flat" ? "flat" : "percent";
  const feeValue = num(form, "management_fee_value") ?? 8;

  const info = db
    .prepare(
      `INSERT INTO properties (client_id, name, address, city, state, zip, takeover_date,
        management_fee_type, management_fee_value, renovation_scope, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      clientId,
      name,
      address,
      str(form, "city"),
      str(form, "state"),
      str(form, "zip"),
      takeoverDate,
      feeType,
      feeValue,
      str(form, "renovation_scope"),
      str(form, "notes")
    );

  const propertyId = Number(info.lastInsertRowid);
  createChecklistFromTemplate(propertyId);
  logActivity(propertyId, session.uid, "Property onboarded", `Takeover date ${takeoverDate}; rent-ready checklist created`);

  return NextResponse.json({ ok: true, id: propertyId });
}
