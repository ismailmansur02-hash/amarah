import { PropertyRow } from "@/lib/access";
import { DocumentRow, LeaseRow, TenantRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

export default function TenantsLease({
  property,
  isManager,
  tenants,
  leases,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  tenants: TenantRow[];
  leases: LeaseRow[];
  docs: DocumentRow[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Tenants</h2>
        {tenants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No tenants on file.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {tenants.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-800">{t.name}</p>
                <p className="text-sm text-slate-500">{t.email || "no email"} · {t.phone || "no phone"}</p>
                {t.notes && <p className="mt-1 text-xs text-slate-400">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">+ Add tenant</summary>
            <ApiForm
              action={`/api/properties/${property.id}/tenants`}
              submitLabel="Add tenant"
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="name" required placeholder="Full name" className={inputCls} />
                <input name="email" type="email" placeholder="Email" className={inputCls} />
                <input name="phone" placeholder="Phone" className={inputCls} />
                <input name="notes" placeholder="Notes" className={inputCls} />
              </div>
            </ApiForm>
          </details>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Lease</h2>
        {leases.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No lease recorded.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {leases.map((l) => (
              <div
                key={l.id}
                className={`rounded-xl border p-4 ${
                  l.status === "active" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {money(l.monthly_rent)}/month
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                      {l.status}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Deposit {money(l.deposit)} · Rent due day {l.due_day} of the month
                </p>
                {l.notes && <p className="mt-1 text-xs text-slate-400">{l.notes}</p>}
              </div>
            ))}
          </div>
        )}
        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">+ Record a lease</summary>
            <ApiForm
              action={`/api/properties/${property.id}/lease`}
              submitLabel="Record lease"
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  Start date
                  <input name="start_date" type="date" required className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  End date
                  <input name="end_date" type="date" required className={`${inputCls} mt-1 block w-full`} />
                </label>
                <label className="text-xs text-slate-500">
                  Monthly rent ($)
                  <input name="monthly_rent" type="number" step="0.01" required className={`${inputCls} mt-1 block w-full`} />
                </label>
                <input name="deposit" type="number" step="0.01" placeholder="Deposit ($)" className={inputCls} />
                <input name="due_day" type="number" min="1" max="28" placeholder="Rent due day (1–28)" className={inputCls} />
                <input name="notes" placeholder="Notes" className={inputCls} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Recording a new lease marks any previously active lease as ended.</p>
            </ApiForm>
          </details>
        )}
      </section>

      <DocSection
        propertyId={property.id}
        section="lease"
        docs={docs}
        isManager={isManager}
        heading="Lease documents (signed lease, move-in report…)"
      />
    </div>
  );
}
