import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { PropertyRow } from "@/lib/access";
import { UserRow, LedgerRow } from "@/lib/types";
import { money, fmtDate, STATUS_LABELS, STATUS_COLORS, feeLabel } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="text-sm text-slate-500">Every property file, client login, and payout in one place.</p>
      </div>

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
              {properties.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No properties yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Add a property</h2>
          <ApiForm
            action="/api/properties"
            submitLabel="Create property file"
            className="mt-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="client_id" required className={inputCls} defaultValue="">
                <option value="" disabled>Owner (client)…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                ))}
              </select>
              <input name="name" required placeholder="Property name" className={inputCls} />
              <input name="address" required placeholder="Street address" className={`${inputCls} sm:col-span-2`} />
              <input name="city" placeholder="City" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input name="state" placeholder="State" className={inputCls} />
                <input name="zip" placeholder="ZIP" className={inputCls} />
              </div>
              <label className="text-xs text-slate-500 sm:col-span-2">
                Takeover date
                <input name="takeover_date" type="date" required className={`${inputCls} mt-1 block w-full`} />
              </label>
              <select name="management_fee_type" className={inputCls} defaultValue="percent">
                <option value="percent">Fee: % of collected rent</option>
                <option value="flat">Fee: flat $/month</option>
              </select>
              <input name="management_fee_value" type="number" step="0.1" placeholder="Fee value (e.g. 8)" className={inputCls} />
              <textarea name="renovation_scope" placeholder="Renovation scope of work (optional)" rows={2} className={`${inputCls} sm:col-span-2`} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              The rent-ready legal checklist is created automatically for every new property.
            </p>
          </ApiForm>
        </section>

        <section>
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
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                      No client logins yet — create one below.
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
            <p className="mb-2 text-xs text-slate-500">
              Create a pre-made login and hand the username &amp; password to your client. They will
              only see their own properties.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Full name" className={inputCls} />
              <input name="email" type="email" placeholder="Email (optional)" className={inputCls} />
              <input name="username" required placeholder="Username" className={inputCls} />
              <input name="password" required placeholder="Password (min 8 chars)" className={inputCls} />
            </div>
          </ApiForm>
        </section>
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
