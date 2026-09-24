import { PropertyRow } from "@/lib/access";
import {
  ActivityRow, ChecklistStepRow, LedgerRow, MaintenanceRow, RenovationTaskRow,
} from "@/lib/types";
import { money, fmtDate, feeLabel, STATUS_LABELS } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";

const inputCls = "input input-sm";

export default function Overview({
  property,
  isManager,
  steps,
  tasks,
  ledger,
  activity,
  requests,
}: {
  property: PropertyRow;
  isManager: boolean;
  steps: ChecklistStepRow[];
  tasks: RenovationTaskRow[];
  ledger: LedgerRow[];
  activity: ActivityRow[];
  requests: MaintenanceRow[];
}) {
  const stepsDone = steps.filter((s) => s.completed).length;
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const nextPayout = ledger
    .filter((l) => l.payout_status === "scheduled")
    .sort((a, b) => (a.payout_date || "").localeCompare(b.payout_date || ""))[0];
  const year = String(new Date().getFullYear());
  const ytd = ledger.filter((l) => l.month.startsWith(year));
  const feesYtd = ytd.reduce((s, l) => s + l.management_fee, 0);
  const taxYtd = ytd.reduce((s, l) => s + l.tax_deductible, 0);
  const openRequests = requests.filter((r) => r.status !== "resolved").length;

  return (
    <div className="space-y-8">
      {/* The payment leads at full size; the supporting figures share one card
          beside it. Everything the same size says nothing is important. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="card p-6">
          <p className="label">Next owner payment</p>
          <p className="num mt-3 text-[2.25rem] font-semibold leading-none">
            {nextPayout ? money(nextPayout.owner_payout) : "—"}
          </p>
          <p className="mt-2.5 text-[13px] text-[var(--ink-3)]">
            {nextPayout ? `scheduled ${fmtDate(nextPayout.payout_date)}` : "no payout scheduled"}
          </p>
        </div>

        <div className="card grid gap-px overflow-hidden bg-[var(--line)] sm:grid-cols-3">
          <Figure
            label="Management fee"
            value={feeLabel(property.management_fee_type, property.management_fee_value)}
            sub={`${money(feesYtd)} paid this year`}
          />
          <Figure
            label="Tax deductions YTD"
            value={money(taxYtd)}
            sub="fees & deductible expenses"
          />
          <Figure
            label="Open requests"
            value={String(openRequests)}
            sub="maintenance & management"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <p className="text-[15px] font-medium">Rent-ready legal checklist</p>
          <p className="mb-4 mt-1 text-[13px] text-[var(--ink-3)]">
            {stepsDone} of {steps.length} steps complete
          </p>
          <ProgressBar percent={steps.length ? (100 * stepsDone) / steps.length : 0} />
        </div>
        <div className="card p-6">
          <p className="text-[15px] font-medium">Renovation</p>
          <p className="mb-4 mt-1 text-[13px] text-[var(--ink-3)]">
            {tasksDone} of {tasks.length} tasks complete
          </p>
          <ProgressBar
            percent={tasks.length ? (100 * tasksDone) / tasks.length : 0}
            tone="#c2410c"
          />
        </div>
      </div>

      {isManager && (
        <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-5">
          <span className="text-[14px] font-medium">Property status</span>
          <InlineSelect
            action={`/api/properties/${property.id}`}
            name="status"
            value={property.status}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <span className="text-[13px] text-[var(--ink-3)]">
            Changes are logged to the activity checklist.
          </span>
        </div>
      )}

      <section>
        <h2 className="display-sm text-xl">Activity since takeover</h2>
        <p className="mt-1.5 text-[14px] text-[var(--ink-2)]">
          Everything accomplished from {fmtDate(property.takeover_date)} to today.
        </p>

        {isManager && (
          <ApiForm
            action={`/api/properties/${property.id}/activity`}
            submitLabel="Log accomplishment"
            className="card mt-5 p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="action"
                required
                placeholder="What was accomplished (e.g. Passed city inspection)"
                className={inputCls}
              />
              <input name="detail" placeholder="Detail (optional)" className={inputCls} />
            </div>
          </ApiForm>
        )}

        {/* A hairline timeline. The rule is one pixel and the markers are small
            — the entries are the content, not the decoration around them. */}
        <ol className="mt-7 border-l border-[var(--line)] pl-6">
          {activity.map((a) => (
            <li key={a.id} className="relative pb-7 last:pb-0">
              <span
                className="absolute -left-[26.5px] top-[7px] h-[9px] w-[9px] rounded-full ring-4 ring-[var(--paper)]"
                style={{ background: "var(--accent)" }}
              />
              <p className="text-[15px] font-medium">{a.action}</p>
              {a.detail && (
                <p className="mt-0.5 text-[14px] text-[var(--ink-2)]">{a.detail}</p>
              )}
              <p className="mt-1 text-[13px] text-[var(--ink-3)]">
                {fmtDate(a.created_at)}
                {a.actor_name ? ` · ${a.actor_name}` : ""}
              </p>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="text-[14px] text-[var(--ink-3)]">Nothing logged yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--surface)] p-6">
      <p className="label">{label}</p>
      <p className="num mt-3 text-balance text-[1.25rem] font-semibold leading-tight">{value}</p>
      <p className="mt-2 text-[13px] text-[var(--ink-3)]">{sub}</p>
    </div>
  );
}
