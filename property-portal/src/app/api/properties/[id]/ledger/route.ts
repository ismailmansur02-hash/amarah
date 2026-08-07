import { NextRequest, NextResponse } from "next/server";
import { sql, one, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/**
 * Manager adds a month to the accounting ledger, or marks a scheduled owner
 * payout as paid. Fee and payout auto-calculate when left blank.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();

  const entryId = num(form, "entry_id");
  if (entryId !== null) {
    const entry = await one<{ id: number; month: string; owner_payout: number }>(
      sql`SELECT id, month, owner_payout FROM ledger_entries
          WHERE id = ${entryId} AND property_id = ${property.id}`
    );
    if (!entry) return jsonError("Entry not found", 404);

    await sql`UPDATE ledger_entries SET payout_status = 'paid' WHERE id = ${entry.id}`;
    await logActivity(
      property.id,
      session.uid,
      "Owner payout sent",
      `${entry.month} statement — payout $${entry.owner_payout.toFixed(2)}`
    );
    return NextResponse.json({ ok: true });
  }

  const month = str(form, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return jsonError("Month must be in YYYY-MM format");

  const exists = await one(
    sql`SELECT id FROM ledger_entries WHERE property_id = ${property.id} AND month = ${month}`
  );
  if (exists) return jsonError("An entry for that month already exists");

  const rent = num(form, "rent_collected") ?? 0;
  const otherIncome = num(form, "other_income") ?? 0;
  const expenses = num(form, "expenses") ?? 0;

  let fee = num(form, "management_fee");
  if (fee === null) {
    fee =
      property.management_fee_type === "percent"
        ? Math.round(rent * (property.management_fee_value / 100) * 100) / 100
        : property.management_fee_value;
  }
  const payout = num(form, "owner_payout") ?? rent + otherIncome - expenses - fee;
  // Management fees are generally a deductible operating expense for the
  // owner; default the deduction to fee + expenses, editable per month.
  const taxDeductible = num(form, "tax_deductible") ?? Math.round((fee + expenses) * 100) / 100;

  await sql`
    INSERT INTO ledger_entries (property_id, month, rent_collected, other_income, expenses,
      expense_notes, management_fee, tax_deductible, tax_notes, owner_payout, payout_date, payout_status)
    VALUES (${property.id}, ${month}, ${rent}, ${otherIncome}, ${expenses},
            ${str(form, "expense_notes")}, ${fee}, ${taxDeductible}, ${str(form, "tax_notes")},
            ${payout}, ${str(form, "payout_date") || null}::date, 'scheduled')`;

  await logActivity(
    property.id,
    session.uid,
    "Monthly statement added",
    `${month}: rent $${rent.toFixed(2)}, fee $${fee.toFixed(2)}, owner payout $${payout.toFixed(2)}`
  );
  return NextResponse.json({ ok: true });
}
