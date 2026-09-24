import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { listPropertiesForSession } from "@/lib/access";
import { LedgerRow } from "@/lib/types";
import { money, fmtDate, feeLabel } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import StatusPill from "@/components/StatusPill";


export default async function ClientHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "manager") redirect("/dashboard");

  const properties = await listPropertiesForSession(session);
  const year = new Date().getFullYear();

  const cards = await Promise.all(
    properties.map(async (p) => {
      const [nextPayout, taxYtd, progress] = await Promise.all([
        one<LedgerRow>(sql<LedgerRow>`
          SELECT * FROM ledger_entries
          WHERE property_id = ${p.id} AND payout_status = 'scheduled'
          ORDER BY payout_date NULLS LAST LIMIT 1`),
        one<{ t: number }>(sql`
          SELECT COALESCE(SUM(tax_deductible), 0) AS t FROM ledger_entries
          WHERE property_id = ${p.id} AND month LIKE ${year + "-%"}`),
        one<{ total: number; done: number }>(sql`
          SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE completed)::int AS done
          FROM checklist_steps WHERE property_id = ${p.id}`),
      ]);
      return { p, nextPayout, taxYtd: taxYtd?.t ?? 0, progress };
    })
  );

  return (
    <div className="space-y-10">
      <div className="rise">
        <p className="eyebrow">Welcome back, {session.name.split(" ")[0]}</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,2.75rem)]">Your properties</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--ink-2)]">
          Payouts, documents and progress — everything your manager files is visible here, the
          moment it changes.
        </p>
      </div>

      {properties.length === 0 && (
        <p className="card rise rise-1 p-8 text-[15px] text-[var(--ink-2)]">
          No properties are linked to your account yet. Contact your property manager.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map(({ p, nextPayout, taxYtd, progress }, i) => (
          <Link
            key={p.id}
            href={`/property/${p.id}`}
            className={`card card-link rise block p-6 sm:p-7 ${
              i < 3 ? `rise-${i + 1}` : "rise-4"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="display-sm text-[1.375rem]">{p.name}</h2>
                <p className="mt-1 text-[13px] text-[var(--ink-3)]">
                  {p.address}, {p.city} {p.state} {p.zip}
                </p>
              </div>
              <StatusPill status={p.status} />
            </div>

            {/*
             * The next payment is the reason an owner opens this at all, so it
             * gets the size. The other three sit beneath it as plain figures —
             * four equally tinted boxes made everything look equally urgent.
             */}
            <div className="mt-7">
              <p className="label">Next payment</p>
              <p className="num mt-2 text-[2rem] font-semibold leading-none">
                {nextPayout ? money(nextPayout.owner_payout) : "—"}
              </p>
              <p className="mt-2 text-[13px] text-[var(--ink-3)]">
                {nextPayout ? `scheduled ${fmtDate(nextPayout.payout_date)}` : "none scheduled"}
              </p>
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-[var(--line-2)] pt-5">
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Management fee</dt>
                <dd className="num mt-1 text-[14px] font-medium">
                  {feeLabel(p.management_fee_type, p.management_fee_value)}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Deductions YTD</dt>
                <dd className="num mt-1 text-[14px] font-medium">{money(taxYtd)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Managed since</dt>
                <dd className="num mt-1 text-[14px] font-medium">{fmtDate(p.takeover_date)}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="label mb-2">Rent-ready progress</p>
              <ProgressBar
                percent={progress && progress.total ? (100 * progress.done) / progress.total : 0}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
