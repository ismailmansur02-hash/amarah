import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPropertiesForSession } from "@/lib/access";
import { LedgerRow } from "@/lib/types";
import { money, fmtDate, STATUS_LABELS, STATUS_COLORS, feeLabel } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";

export default async function ClientHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "manager") redirect("/dashboard");

  const properties = listPropertiesForSession(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session.name}</h1>
        <p className="text-sm text-slate-500">
          Your properties, payouts, and records — everything your manager files is visible here.
        </p>
      </div>

      {properties.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          No properties are linked to your account yet. Contact your property manager.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {properties.map((p) => {
          const nextPayout = db
            .prepare(
              `SELECT * FROM ledger_entries WHERE property_id = ? AND payout_status = 'scheduled'
               ORDER BY payout_date LIMIT 1`
            )
            .get(p.id) as LedgerRow | undefined;
          const taxYtd = db
            .prepare(
              `SELECT COALESCE(SUM(tax_deductible), 0) AS t FROM ledger_entries
               WHERE property_id = ? AND month LIKE ?`
            )
            .get(p.id, `${new Date().getFullYear()}-%`) as { t: number };
          const prog = db
            .prepare(
              "SELECT COUNT(*) AS total, COALESCE(SUM(completed),0) AS done FROM checklist_steps WHERE property_id = ?"
            )
            .get(p.id) as { total: number; done: number };

          return (
            <Link
              key={p.id}
              href={`/property/${p.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-slate-500">
                    {p.address}, {p.city} {p.state} {p.zip}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                  {STATUS_LABELS[p.status]}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-emerald-700">Next payment</dt>
                  <dd className="mt-0.5 font-semibold text-emerald-900">
                    {nextPayout ? `${money(nextPayout.owner_payout)} · ${fmtDate(nextPayout.payout_date)}` : "None scheduled"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Management fee</dt>
                  <dd className="mt-0.5 font-semibold">{feeLabel(p.management_fee_type, p.management_fee_value)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax deductions YTD</dt>
                  <dd className="mt-0.5 font-semibold">{money(taxYtd.t)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Takeover date</dt>
                  <dd className="mt-0.5 font-semibold">{fmtDate(p.takeover_date)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Rent-ready progress</p>
                <ProgressBar percent={prog.total ? (100 * prog.done) / prog.total : 0} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
