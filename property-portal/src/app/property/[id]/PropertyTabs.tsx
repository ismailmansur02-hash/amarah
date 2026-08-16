"use client";

import { useState, useEffect } from "react";
import { PropertyRow } from "@/lib/access";
import {
  ActivityRow, ChecklistStepRow, DocumentRow, LeaseRow, LedgerRow,
  MaintenanceRow, RenovationTaskRow, TenantRow,
} from "@/lib/types";
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

/**
 * Tab switching happens in the browser.
 *
 * Every tab renders from data the page already loaded, so changing tab costs
 * nothing — no request, no re-query. Previously each tab was a link to a fresh
 * server render, which re-ran every query for the property before showing
 * anything; over a transatlantic hop to the database that was a visible wait
 * on each press.
 *
 * The URL still tracks the tab (via replaceState, which does not navigate) so
 * reloading or sharing the address lands on the same tab.
 */
export default function PropertyTabs({
  property,
  isManager,
  client,
  docs,
  steps,
  tasks,
  tenants,
  leases,
  ledger,
  requests,
  activity,
  initialTab,
}: {
  property: PropertyRow;
  isManager: boolean;
  client: { name: string; username: string; email: string };
  docs: DocumentRow[];
  steps: ChecklistStepRow[];
  tasks: RenovationTaskRow[];
  tenants: TenantRow[];
  leases: LeaseRow[];
  ledger: LedgerRow[];
  requests: MaintenanceRow[];
  activity: ActivityRow[];
  initialTab: string;
}) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  const docsBySection = (section: string) => docs.filter((d) => d.section === section);

  return (
    <>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-px text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              t.key === tab
                ? "rounded-t-md border border-b-white border-slate-200 bg-white px-3 py-2 font-medium text-slate-900"
                : "rounded-t-md px-3 py-2 text-slate-500 hover:text-slate-800"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
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
    </>
  );
}
