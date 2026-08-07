import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty } from "@/lib/api";

/** CSV export of the month-by-month ledger (clients and managers). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const rows = db
    .prepare("SELECT * FROM ledger_entries WHERE property_id = ? ORDER BY month")
    .all(property.id) as Record<string, unknown>[];

  const headers = [
    "month", "rent_collected", "other_income", "expenses", "expense_notes",
    "management_fee", "tax_deductible", "tax_notes", "owner_payout", "payout_date", "payout_status",
  ];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-property-${property.id}.csv"`,
    },
  });
}
