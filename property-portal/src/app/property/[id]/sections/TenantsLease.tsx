import { PropertyRow } from "@/lib/access";
import { DocumentRow, LeaseRow, TenantRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";
import Disclosure from "@/components/Disclosure";
import Field from "@/components/Field";

const inputCls = "input input-sm";

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
    <div className="space-y-10">
      <section>
        <h2 className="display-sm text-xl">Tenants</h2>
        {tenants.length === 0 ? (
          <p className="card-flat mt-4 px-5 py-8 text-center text-[14px] text-[var(--ink-3)]">
            No tenants on file.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {tenants.map((t) => (
              <div key={t.id} className="card p-5">
                <p className="text-[15px] font-medium">{t.name}</p>
                <p className="mt-1 text-[13px] text-[var(--ink-2)]">
                  {t.email || "no email"} · {t.phone || "no phone"}
                </p>
                {t.notes && <p className="mt-2 text-[13px] text-[var(--ink-3)]">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
        {isManager && (
          <Disclosure label="Add tenant" className="mt-4">
            <ApiForm
              action={`/api/properties/${property.id}/tenants`}
              submitLabel="Add tenant"
              className="card-flat mt-3 p-5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="name" required placeholder="Full name" className={inputCls} />
                <input name="email" type="email" placeholder="Email" className={inputCls} />
                <input name="phone" placeholder="Phone" className={inputCls} />
                <input name="notes" placeholder="Notes" className={inputCls} />
              </div>
            </ApiForm>
          </Disclosure>
        )}
      </section>

      <section>
        <h2 className="display-sm text-xl">Lease</h2>
        {leases.length === 0 ? (
          <p className="card-flat mt-4 px-5 py-8 text-center text-[14px] text-[var(--ink-3)]">
            No lease recorded.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {leases.map((l) => (
              /* The active lease is the one that matters; older ones are
                 history and step back rather than being tinted a colour. */
              <div
                key={l.id}
                className={l.status === "active" ? "card p-6" : "card-flat p-6 opacity-70"}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <p className="num text-[1.5rem] font-semibold leading-none">
                    {money(l.monthly_rent)}
                    <span className="text-[15px] font-normal text-[var(--ink-3)]"> / month</span>
                  </p>
                  <span className="pill">
                    <span
                      className="dot"
                      style={{ background: l.status === "active" ? "var(--accent)" : "#86868b" }}
                    />
                    {l.status}
                  </span>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-[var(--line-2)] pt-5 sm:grid-cols-4">
                  <div>
                    <dt className="text-[12px] text-[var(--ink-3)]">Term</dt>
                    <dd className="num mt-1 text-[14px] font-medium">
                      {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--ink-3)]">Deposit</dt>
                    <dd className="num mt-1 text-[14px] font-medium">{money(l.deposit)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--ink-3)]">Rent due</dt>
                    <dd className="num mt-1 text-[14px] font-medium">
                      day {l.due_day} of the month
                    </dd>
                  </div>
                </dl>

                {l.notes && (
                  <p className="mt-5 text-[13px] text-[var(--ink-3)]">{l.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {isManager && (
          <Disclosure label="Record a lease" className="mt-4">
            <ApiForm
              action={`/api/properties/${property.id}/lease`}
              submitLabel="Record lease"
              className="card-flat mt-3 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Start date">
                  <input name="start_date" type="date" required className={inputCls} />
                </Field>
                <Field label="End date">
                  <input name="end_date" type="date" required className={inputCls} />
                </Field>
                <Field label="Monthly rent ($)">
                  <input
                    name="monthly_rent"
                    type="number"
                    step="0.01"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Deposit ($)">
                  <input name="deposit" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="Rent due day" hint="1–28">
                  <input name="due_day" type="number" min="1" max="28" className={inputCls} />
                </Field>
                <Field label="Notes">
                  <input name="notes" className={inputCls} />
                </Field>
              </div>
              <p className="mt-4 text-[13px] text-[var(--ink-3)]">
                Recording a new lease marks any previously active lease as ended.
              </p>
            </ApiForm>
          </Disclosure>
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
