import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty } from "@/lib/api";
import { LedgerRow } from "@/lib/types";

/** CSV export of the month-by-month ledger (clients and managers). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const rows = await sql<LedgerRow>`
    SELECT * FROM ledger_entries WHERE property_id = ${property.id} ORDER BY month`;

  const headers = [
    "month", "rent_collected", "other_income", "expenses", "expense_notes",
    "management_fee", "tax_deductible", "tax_notes", "owner_payout", "payout_date", "payout_status",
  ] as const;

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape((r as unknown as Record<string, unknown>)[h])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-property-${property.id}.csv"`,
    },
  });
}
