import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { PropertyRow } from "@/lib/access";
import { UserRow, LedgerRow } from "@/lib/types";
import { money, fmtDate, feeLabel } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import Field from "@/components/Field";
import GettingStarted from "@/components/GettingStarted";
import StatusPill from "@/components/StatusPill";

const inputCls = "input";

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "manager") redirect("/my");

  const [properties, clients, checklistTotals, openRequests, scheduledPayouts, rentRoll] =
    await Promise.all([
      sql<PropertyRow & { client_name: string }>`
        SELECT p.*, u.name AS client_name FROM properties p
        JOIN portal_users u ON u.id = p.client_id ORDER BY p.name`,
      sql<UserRow>`
        SELECT id, username, name, email, role, created_at FROM portal_users
        WHERE role = 'client' ORDER BY name`,
      sql<{ property_id: number; total: number; done: number }>`
        SELECT property_id, COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE completed)::int AS done
        FROM checklist_steps GROUP BY property_id`,
      one<{ n: number }>(sql`
        SELECT COUNT(*)::int AS n FROM maintenance_requests WHERE status <> 'resolved'`),
      sql<LedgerRow & { property_name: string }>`
        SELECT l.*, p.name AS property_name FROM ledger_entries l
        JOIN properties p ON p.id = l.property_id
        WHERE l.payout_status = 'scheduled' ORDER BY l.payout_date NULLS LAST`,
      one<{ total: number }>(sql`
        SELECT COALESCE(SUM(monthly_rent), 0) AS total FROM leases WHERE status = 'active'`),
    ]);

  const progressByProperty = new Map(checklistTotals.map((r) => [r.property_id, r]));
  const occupied = properties.filter((p) => p.status === "occupied").length;
  const hasClients = clients.length > 0;

  /* ---- Add a property ---- */
  const propertySection = (
    <section key="property" id="add-property">
      <h2 className="display-sm text-xl">Add a property</h2>

      {!hasClients ? (
        // A property must belong to an owner, so with no client logins there is
        // nothing to attach it to. Say so instead of showing an empty dropdown.
        <div className="card mt-4 p-6">
          <p className="text-[15px] font-medium">Create a client login first</p>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-[var(--ink-2)]">
            Every property belongs to an owner, so there has to be a client login to attach it to.
            Create one under <strong className="font-medium text-[var(--ink)]">Client logins</strong>,
            then come back here — the owner will appear in the list.
          </p>
          <a href="#client-logins" className="btn btn-sm mt-5">
            Go to client logins
          </a>
        </div>
      ) : (
        <ApiForm
          action="/api/properties"
          submitLabel="Create property file"
          className="card mt-4 p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Owner (client)" className="sm:col-span-2">
              <select name="client_id" required className={inputCls} defaultValue="">
                <option value="" disabled>
                  Choose the owner…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.username})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Property name" hint="What you'll call it, e.g. Maple Avenue Duplex">
              <input name="name" required placeholder="Maple Avenue Duplex" className={inputCls} />
            </Field>
            <Field label="Takeover date" hint="When you took over management">
              <input name="takeover_date" type="date" required className={inputCls} />
            </Field>

            <Field label="Street address" className="sm:col-span-2">
              <input name="address" required placeholder="128 Maple Avenue" className={inputCls} />
            </Field>

            <Field label="City">
              <input name="city" placeholder="Springfield" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="State">
                <input name="state" placeholder="IL" className={inputCls} />
              </Field>
              <Field label="ZIP">
                <input name="zip" placeholder="62704" className={inputCls} />
              </Field>
            </div>

            <Field label="How you charge">
              <select name="management_fee_type" className={inputCls} defaultValue="percent">
                <option value="percent">% of collected rent</option>
                <option value="flat">Flat $ per month</option>
              </select>
            </Field>
            <Field label="Fee amount" hint="e.g. 8 for 8%, or 150 for $150/month">
              <input
                name="management_fee_value"
                type="number"
                step="0.1"
                min="0"
                required
                defaultValue="8"
                className={inputCls}
              />
            </Field>

            <Field label="Renovation scope of work (optional)" className="sm:col-span-2">
              <textarea
                name="renovation_scope"
                rows={2}
                placeholder="Repaint interior, refinish floors, replace kitchen counters…"
                className={inputCls}
              />
            </Field>
          </div>
          <p className="mt-4 text-[13px] text-[var(--ink-3)]">
            The 14-step rent-ready legal checklist is created automatically for every new property.
          </p>
        </ApiForm>
      )}
    </section>
  );

  /* ---- Client logins ---- */
  const clientSection = (
    <section key="clients" id="client-logins">
      <h2 className="display-sm text-xl">Client logins</h2>

      {hasClients ? (
        <ul className="rows card-flat mt-4 overflow-hidden">
          {clients.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium">{c.name}</p>
                <p className="text-[13px] text-[var(--ink-3)]">
                  <span className="font-mono">{c.username}</span>
                  {c.email && ` · ${c.email}`}
                </p>
              </div>
              <ApiForm
                action={`/api/users/${c.id}/password`}
                submitLabel="Set"
                buttonClassName="btn-quiet btn-sm"
                className="flex shrink-0 items-center gap-2"
                footerClassName="flex items-center gap-2"
              >
                <input
                  name="password"
                  type="text"
                  required
                  minLength={8}
                  placeholder="New password"
                  aria-label={`New password for ${c.name}`}
                  className="input input-sm w-40"
                />
              </ApiForm>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-flat mt-4 px-5 py-8 text-center text-[14px] text-[var(--ink-3)]">
          No client logins yet — create the first one below.
        </p>
      )}

      <ApiForm action="/api/clients" submitLabel="Create client login" className="card mt-4 p-6">
        <p className="mb-5 max-w-prose text-[13px] leading-relaxed text-[var(--ink-2)]">
          You choose the username and password, then hand them to your client. They will only ever
          see their own properties.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client's full name">
            <input name="name" required placeholder="John Smith" className={inputCls} />
          </Field>
          <Field label="Email (optional)">
            <input name="email" type="email" placeholder="john@example.com" className={inputCls} />
          </Field>
          <Field label="Username you're giving them" hint="Letters, numbers, dot, dash, underscore">
            <input name="username" required placeholder="jsmith" className={inputCls} />
          </Field>
          <Field label="Password you're giving them" hint="At least 8 characters">
            <input name="password" required minLength={8} placeholder="Choose a password" className={inputCls} />
          </Field>
        </div>
      </ApiForm>
    </section>
  );

  return (
    <div className="space-y-12">
      <div className="rise">
        <h1 className="display text-[clamp(2rem,5vw,2.75rem)]">Dashboard</h1>
        <p className="mt-2 text-[15px] text-[var(--ink-2)]">
          Every property file, client login, and payout in one place.
        </p>
      </div>

      {(!hasClients || properties.length === 0) && (
        <div className="rise rise-1">
          <GettingStarted hasClients={hasClients} hasProperties={properties.length > 0} />
        </div>
      )}

      {/* The four numbers share one card divided by hairlines, rather than
          floating as four separate boxes. Related figures should look related. */}
      <div className="rise rise-1 card grid gap-px overflow-hidden bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Properties" value={String(properties.length)} sub={`${occupied} occupied`} />
        <Stat label="Monthly rent roll" value={money(rentRoll?.total ?? 0)} sub="active leases" />
        <Stat
          label="Open requests"
          value={String(openRequests?.n ?? 0)}
          sub="maintenance & management"
        />
        <Stat
          label="Payouts scheduled"
          value={String(scheduledPayouts.length)}
          sub={
            scheduledPayouts[0]
              ? `next ${fmtDate(scheduledPayouts[0].payout_date)} · ${money(scheduledPayouts[0].owner_payout)}`
              : "none pending"
          }
        />
      </div>

      {properties.length > 0 && (
        <section className="rise rise-2">
          <h2 className="display-sm text-xl">Properties</h2>

          {/* A list of pressable rows rather than a data table. A table forces
              a horizontal scrollbar on a phone, which is where most of these
              get opened. */}
          <ul className="rows card mt-4 overflow-hidden">
            {properties.map((p) => {
              const prog = progressByProperty.get(p.id);
              const pct = prog && prog.total > 0 ? (100 * prog.done) / prog.total : 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/property/${p.id}`}
                    className="block px-5 py-5 transition-colors duration-200 hover:bg-black/[0.02]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-[17px] font-medium tracking-tight">{p.name}</p>
                        <p className="mt-0.5 text-[13px] text-[var(--ink-3)]">
                          {p.address}, {p.city} {p.state} · {p.client_name}
                        </p>
                      </div>
                      <StatusPill status={p.status} />
                    </div>

                    <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="max-w-sm">
                        <ProgressBar percent={pct} />
                      </div>
                      <p className="text-[13px] text-[var(--ink-3)] sm:text-right">
                        {feeLabel(p.management_fee_type, p.management_fee_value)} · since{" "}
                        {fmtDate(p.takeover_date)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* With no clients yet, the login form is the thing to do first, so it
          leads. Once set up, adding properties is the commoner action. */}
      <div className="rise rise-3 grid gap-12 lg:grid-cols-2 lg:gap-10">
        {hasClients ? [propertySection, clientSection] : [clientSection, propertySection]}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--surface)] p-6">
      <p className="label">{label}</p>
      <p className="num mt-3 text-[1.75rem] font-semibold leading-none">{value}</p>
      <p className="mt-2 text-[13px] text-[var(--ink-3)]">{sub}</p>
    </div>
  );
}
