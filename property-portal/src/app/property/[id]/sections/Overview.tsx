import { PropertyRow } from "@/lib/access";
import {
  ActivityRow, ChecklistStepRow, LedgerRow, MaintenanceRow, RenovationTaskRow,
} from "@/lib/types";
import { money, fmtDate, feeLabel, STATUS_LABELS } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Next owner payment</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">
            {nextPayout ? money(nextPayout.owner_payout) : "—"}
          </p>
          <p className="text-xs text-emerald-700">
            {nextPayout ? `scheduled ${fmtDate(nextPayout.payout_date)}` : "no payout scheduled"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Management fee</p>
          <p className="mt-1 text-xl font-semibold">{feeLabel(property.management_fee_type, property.management_fee_value)}</p>
          <p className="text-xs text-slate-400">{money(feesYtd)} paid this year</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax deductions YTD</p>
          <p className="mt-1 text-xl font-semibold">{money(taxYtd)}</p>
          <p className="text-xs text-slate-400">fees & deductible expenses</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open requests</p>
          <p className="mt-1 text-xl font-semibold">{openRequests}</p>
          <p className="text-xs text-slate-400">maintenance & management</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold">Rent-ready legal checklist</p>
          <p className="mb-2 text-xs text-slate-400">{stepsDone} of {steps.length} steps complete</p>
          <ProgressBar percent={steps.length ? (100 * stepsDone) / steps.length : 0} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold">Renovation</p>
          <p className="mb-2 text-xs text-slate-400">{tasksDone} of {tasks.length} tasks complete</p>
          <ProgressBar percent={tasks.length ? (100 * tasksDone) / tasks.length : 0} colorClass="bg-orange-500" />
        </div>
      </div>

      {isManager && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-medium text-slate-600">Property status:</span>
          <InlineSelect
            action={`/api/properties/${property.id}`}
            name="status"
            value={property.status}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <span className="text-xs text-slate-400">Status changes are logged to the activity checklist.</span>
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Activity checklist since takeover</h2>
          <span className="text-xs text-slate-400">
            everything accomplished from {fmtDate(property.takeover_date)} to today
          </span>
        </div>

        {isManager && (
          <ApiForm
            action={`/api/properties/${property.id}/activity`}
            submitLabel="Log accomplishment"
            className="mt-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="action" required placeholder="What was accomplished (e.g. Passed city inspection)" className={inputCls} />
              <input name="detail" placeholder="Detail (optional)" className={inputCls} />
            </div>
          </ApiForm>
        )}

        <ol className="mt-4 space-y-0 border-l-2 border-slate-200 pl-5">
          {activity.map((a) => (
            <li key={a.id} className="relative pb-5">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              <p className="text-sm font-medium text-slate-800">{a.action}</p>
              {a.detail && <p className="text-sm text-slate-500">{a.detail}</p>}
              <p className="text-xs text-slate-400">
                {fmtDate(a.created_at)}{a.actor_name ? ` · ${a.actor_name}` : ""}
              </p>
            </li>
          ))}
          {activity.length === 0 && <li className="text-sm text-slate-400">Nothing logged yet.</li>}
        </ol>
      </section>
    </div>
  );
}
