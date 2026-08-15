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
import Overview from "./sections/Overview";
import PropertyInfo from "./sections/PropertyInfo";
import Legal from "./sections/Legal";
import Renovation from "./sections/Renovation";
import TenantsLease from "./sections/TenantsLease";
import Accounting from "./sections/Accounting";
import Maintenance from "./sections/Maintenance";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "info", label: "1 · Property Info" },
  { key: "legal", label: "2 · Legal" },
  { key: "renovation", label: "3 · Renovation" },
  { key: "tenants", label: "4 · Tenants & Lease" },
  { key: "accounting", label: "5 · Accounting & Tax" },
  { key: "maintenance", label: "6 · Maintenance" },
];

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
  const tab = TABS.some((t) => t.key === tabParam) ? (tabParam as string) : "overview";

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

  const docsBySection = (section: string) => docs.filter((d) => d.section === section);

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

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-px text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/property/${property.id}?tab=${t.key}`}
            className={
              t.key === tab
                ? "rounded-t-md border border-b-white border-slate-200 bg-white px-3 py-2 font-medium text-slate-900"
                : "rounded-t-md px-3 py-2 text-slate-500 hover:text-slate-800"
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <Overview
          property={property}
          isManager={isManager}
          steps={steps}
          tasks={tasks}
          ledger={ledger}
          activity={activity}
          requests={requests}
        />
      )}
      {tab === "info" && (
        <PropertyInfo property={property} client={client!} isManager={isManager} docs={docsBySection("property")} />
      )}
      {tab === "legal" && (
        <Legal property={property} isManager={isManager} steps={steps} docs={docsBySection("legal")} />
      )}
      {tab === "renovation" && (
        <Renovation property={property} isManager={isManager} tasks={tasks} docs={docsBySection("renovation")} />
      )}
      {tab === "tenants" && (
        <TenantsLease property={property} isManager={isManager} tenants={tenants} leases={leases} docs={docsBySection("lease")} />
      )}
      {tab === "accounting" && (
        <Accounting property={property} isManager={isManager} ledger={ledger} docs={docsBySection("accounting")} />
      )}
      {tab === "maintenance" && (
        <Maintenance property={property} isManager={isManager} requests={requests} docs={docsBySection("maintenance")} />
      )}
    </div>
  );
}
