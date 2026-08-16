import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { PropertyRow } from "@/lib/access";
import { UserRow, LedgerRow } from "@/lib/types";
import { money, fmtDate, STATUS_LABELS, STATUS_COLORS, feeLabel } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import Field from "@/components/Field";
import GettingStarted from "@/components/GettingStarted";


const inputCls =
  "w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none";

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
      <h2 className="text-lg font-semibold">Add a property</h2>

      {!hasClients ? (
        // A property must belong to an owner, so with no client logins there is
        // nothing to attach it to. Say so instead of showing an empty dropdown.
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-900">Create a client login first</p>
          <p className="mt-1 text-sm text-amber-800">
            Every property belongs to an owner, so there has to be a client login to attach it to.
            Create one under <strong>Client logins</strong>, then come back here — the owner will
            appear in the list.
          </p>
          <a
            href="#client-logins"
            className="mt-3 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Go to client logins
          </a>
        </div>
      ) : (
        <ApiForm
          action="/api/properties"
          submitLabel="Create property file"
          className="mt-3 rounded-xl border border-slate-200 bg-white p-4"
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
          <p className="mt-2 text-xs text-slate-400">
            The 14-step rent-ready legal checklist is created automatically for every new property.
          </p>
        </ApiForm>
      )}
    </section>
  );

  /* ---- Client logins ---- */
  const clientSection = (
    <section key="clients" id="client-logins">
      <h2 className="text-lg font-semibold">Client logins</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Username</th>
              <th className="px-4 py-2.5">Reset password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5">
                  {c.name}
                  {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{c.username}</td>
                <td className="px-4 py-2.5">
                  <ApiForm
                    action={`/api/users/${c.id}/password`}
                    submitLabel="Set"
                    buttonClassName="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={8}
                      placeholder="New password"
                      aria-label={`New password for ${c.name}`}
                      className="w-36 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                    />
                  </ApiForm>
                </td>
              </tr>
            ))}
            {!hasClients && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No client logins yet — create the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ApiForm
        action="/api/clients"
        submitLabel="Create client login"
        className="mt-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <p className="mb-3 text-xs text-slate-500">
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="text-sm text-slate-500">
          Every property file, client login, and payout in one place.
        </p>
      </div>

      {(!hasClients || properties.length === 0) && (
        <GettingStarted hasClients={hasClients} hasProperties={properties.length > 0} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={String(properties.length)} sub={`${occupied} occupied`} />
        <StatCard label="Monthly rent roll" value={money(rentRoll?.total ?? 0)} sub="active leases" />
        <StatCard label="Open requests" value={String(openRequests?.n ?? 0)} sub="maintenance & management" />
        <StatCard
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
        <section>
          <h2 className="text-lg font-semibold">Properties</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rent-ready progress</th>
                  <th className="px-4 py-3">Mgmt fee</th>
                  <th className="px-4 py-3">Takeover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map((p) => {
                  const prog = progressByProperty.get(p.id);
                  const pct = prog && prog.total > 0 ? (100 * prog.done) / prog.total : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/property/${p.id}`} className="font-medium text-sky-700 hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {p.address}, {p.city} {p.state}
                        </p>
                      </td>
                      <td className="px-4 py-3">{p.client_name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="min-w-40 px-4 py-3"><ProgressBar percent={pct} /></td>
                      <td className="px-4 py-3 text-slate-600">
                        {feeLabel(p.management_fee_type, p.management_fee_value)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(p.takeover_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* With no clients yet, the login form is the thing to do first, so it
          leads. Once set up, adding properties is the commoner action. */}
      <div className="grid gap-8 lg:grid-cols-2">
        {hasClients ? [propertySection, clientSection] : [clientSection, propertySection]}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
