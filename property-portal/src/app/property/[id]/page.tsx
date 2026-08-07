import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
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

  const property = getPropertyForSession(propertyId, session);
  if (!property) notFound();

  const isManager = session.role === "manager";
  const tab = TABS.some((t) => t.key === tabParam) ? (tabParam as string) : "overview";

  const client = db
    .prepare("SELECT name, username, email FROM users WHERE id = ?")
    .get(property.client_id) as { name: string; username: string; email: string | null };

  const docs = db
    .prepare("SELECT * FROM documents WHERE property_id = ? ORDER BY uploaded_at DESC")
    .all(property.id) as DocumentRow[];
  const docsBySection = (section: string) => docs.filter((d) => d.section === section);

  const steps = db
    .prepare("SELECT * FROM checklist_steps WHERE property_id = ? ORDER BY position")
    .all(property.id) as ChecklistStepRow[];
  const tasks = db
    .prepare("SELECT * FROM renovation_tasks WHERE property_id = ? ORDER BY created_at")
    .all(property.id) as RenovationTaskRow[];
  const tenants = db
    .prepare("SELECT * FROM tenants WHERE property_id = ? ORDER BY created_at")
    .all(property.id) as TenantRow[];
  const leases = db
    .prepare("SELECT * FROM leases WHERE property_id = ? ORDER BY start_date DESC")
    .all(property.id) as LeaseRow[];
  const ledger = db
    .prepare("SELECT * FROM ledger_entries WHERE property_id = ? ORDER BY month")
    .all(property.id) as LedgerRow[];
  const requests = db
    .prepare("SELECT * FROM maintenance_requests WHERE property_id = ? ORDER BY created_at DESC")
    .all(property.id) as MaintenanceRow[];
  const activity = db
    .prepare(
      `SELECT a.*, u.name AS actor_name FROM activity_log a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.property_id = ? ORDER BY a.created_at DESC`
    )
    .all(property.id) as ActivityRow[];

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
              {" · "}Owner: {client.name}
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
        <PropertyInfo property={property} client={client} isManager={isManager} docs={docsBySection("property")} />
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
