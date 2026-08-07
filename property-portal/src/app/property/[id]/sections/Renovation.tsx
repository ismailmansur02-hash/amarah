import { PropertyRow } from "@/lib/access";
import { DocumentRow, RenovationTaskRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export default function Renovation({
  property,
  isManager,
  tasks,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  tasks: RenovationTaskRow[];
  docs: DocumentRow[];
}) {
  const done = tasks.filter((t) => t.status === "done").length;
  const estTotal = tasks.reduce((s, t) => s + (t.cost_estimate ?? 0), 0);
  const actTotal = tasks.reduce((s, t) => s + (t.cost_actual ?? 0), 0);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Scope of work</h2>
        {property.renovation_scope ? (
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{property.renovation_scope}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No renovation scope defined.</p>
        )}
        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">Edit scope</summary>
            <ApiForm
              action={`/api/properties/${property.id}`}
              submitLabel="Save scope"
              className="mt-2"
              resetOnSuccess={false}
            >
              <textarea
                name="renovation_scope"
                rows={4}
                defaultValue={property.renovation_scope}
                className={`${inputCls} w-full`}
              />
            </ApiForm>
          </details>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Work completed</h2>
          <span className="text-xs text-slate-400">
            {done} of {tasks.length} tasks · est. {money(estTotal)} / actual {money(actTotal)}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={tasks.length ? (100 * done) / tasks.length : 0} colorClass="bg-orange-500" />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Task</th>
                <th className="px-4 py-2.5">Estimate</th>
                <th className="px-4 py-2.5">Actual</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{t.title}</p>
                    {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                  </td>
                  <td className="px-4 py-2.5">{money(t.cost_estimate)}</td>
                  <td className="px-4 py-2.5">{money(t.cost_actual)}</td>
                  <td className="px-4 py-2.5">
                    {isManager ? (
                      <InlineSelect
                        action={`/api/properties/${property.id}/renovation`}
                        name="status"
                        value={t.status}
                        payload={{ task_id: String(t.id) }}
                        options={STATUS_OPTIONS}
                      />
                    ) : (
                      <StatusBadge status={t.status} />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.completed_at)}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No tasks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">+ Add a task</summary>
            <ApiForm
              action={`/api/properties/${property.id}/renovation`}
              submitLabel="Add task"
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="title" required placeholder="Task" className={inputCls} />
                <input name="description" placeholder="Description" className={inputCls} />
                <input name="cost_estimate" type="number" step="0.01" placeholder="Cost estimate ($)" className={inputCls} />
              </div>
            </ApiForm>
          </details>
        )}
      </section>

      <DocSection
        propertyId={property.id}
        section="renovation"
        docs={docs}
        isManager={isManager}
        heading="Renovation documents (bids, permits, invoices…)"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    in_progress: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In progress",
    done: "Done",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
