import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { getPropertyForSession } from "@/lib/access";
import {
  ActivityRow, ChecklistStepRow, DocumentRow, LeaseRow, LedgerRow,
  MaintenanceRow, RenovationTaskRow, TenantRow,
} from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, fmtDate } from "@/lib/format";
import PropertyTabs from "./PropertyTabs";


const TAB_KEYS = ["overview", "info", "legal", "renovation", "tenants", "accounting", "maintenance"];

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) notFound();

  const property = await getPropertyForSession(propertyId, session);
  if (!property) notFound();

  const isManager = session.role === "manager";
  const initialTab = TAB_KEYS.includes(tabParam ?? "") ? (tabParam as string) : "overview";

  // Loaded once for the whole file; the tabs then switch without touching the
  // server. Issued together so they cost one round trip to the database
  // rather than one each.
  const [client, docs, steps, tasks, tenants, leases, ledger, requests, activity] =
    await Promise.all([
      one<{ name: string; username: string; email: string }>(
        sql`SELECT name, username, email FROM portal_users WHERE id = ${property.client_id}`
      ),
      sql<DocumentRow>`SELECT * FROM documents WHERE property_id = ${property.id} ORDER BY uploaded_at DESC`,
      sql<ChecklistStepRow>`SELECT * FROM checklist_steps WHERE property_id = ${property.id} ORDER BY position`,
      sql<RenovationTaskRow>`SELECT * FROM renovation_tasks WHERE property_id = ${property.id} ORDER BY created_at`,
      sql<TenantRow>`SELECT * FROM tenants WHERE property_id = ${property.id} ORDER BY created_at`,
      sql<LeaseRow>`SELECT * FROM leases WHERE property_id = ${property.id} ORDER BY start_date DESC`,
      sql<LedgerRow>`SELECT * FROM ledger_entries WHERE property_id = ${property.id} ORDER BY month`,
      sql<MaintenanceRow>`SELECT * FROM maintenance_requests WHERE property_id = ${property.id} ORDER BY created_at DESC`,
      sql<ActivityRow>`
        SELECT a.*, u.name AS actor_name FROM activity_log a
        LEFT JOIN portal_users u ON u.id = a.actor_id
        WHERE a.property_id = ${property.id} ORDER BY a.created_at DESC`,
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={isManager ? "/dashboard" : "/my"}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to {isManager ? "dashboard" : "my properties"}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <p className="text-sm text-slate-500">
              {property.address}, {property.city} {property.state} {property.zip}
              {" · "}Owner: {client?.name}
              {" · "}Takeover {fmtDate(property.takeover_date)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[property.status]}`}>
            {STATUS_LABELS[property.status]}
          </span>
        </div>
      </div>

      <PropertyTabs
        property={property}
        isManager={isManager}
        client={client!}
        docs={docs}
        steps={steps}
        tasks={tasks}
        tenants={tenants}
        leases={leases}
        ledger={ledger}
        requests={requests}
        activity={activity}
        initialTab={initialTab}
      />
    </div>
  );
}
