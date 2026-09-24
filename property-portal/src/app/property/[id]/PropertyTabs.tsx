"use client";

import { useState, useEffect, useRef } from "react";
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
  { key: "overview", n: "", label: "Overview" },
  { key: "info", n: "1", label: "Property" },
  { key: "legal", n: "2", label: "Legal" },
  { key: "renovation", n: "3", label: "Renovation" },
  { key: "tenants", n: "4", label: "Tenants & Lease" },
  { key: "accounting", n: "5", label: "Accounting & Tax" },
  { key: "maintenance", n: "6", label: "Maintenance" },
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
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());

    // On a phone the strip scrolls sideways, so the tab you just chose — or
    // the one restored from the address — has to be brought into view itself.
    const active = stripRef.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [tab]);

  const docsBySection = (section: string) => docs.filter((d) => d.section === section);

  return (
    <>
      {/*
       * A segmented control rather than folder tabs. It stays with you as you
       * read down a long file, and on a phone it scrolls sideways instead of
       * wrapping into three ragged rows.
       */}
      <div
        ref={stripRef}
        className="no-scrollbar sticky top-[calc(env(safe-area-inset-top)+3.6rem)] z-30 -mx-5 overflow-x-auto px-5 py-2"
      >
        <nav
          role="tablist"
          aria-label="Property file sections"
          className="inline-flex gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_75%,transparent)] p-1 backdrop-blur-xl"
        >
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] transition-all duration-300 ease-[var(--ease-quick)] ${
                  on
                    ? "bg-[var(--surface)] font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_-8px_rgba(0,0,0,0.3)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                }`}
              >
                {t.n && (
                  <span className={`num mr-1.5 ${on ? "text-[var(--ink-3)]" : "text-[var(--ink-3)]"}`}>
                    {t.n}
                  </span>
                )}
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Keyed on the tab, so each panel fades in rather than snapping. */}
      <div key={tab} className="fade-in mt-8">
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
