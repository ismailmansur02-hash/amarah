import { PropertyRow } from "@/lib/access";
import { DocumentRow, RenovationTaskRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";
import DocSection from "@/components/DocSection";
import Disclosure from "@/components/Disclosure";

const inputCls = "input input-sm";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const TASK_DOTS: Record<string, string> = {
  pending: "#86868b",
  in_progress: "#c98a00",
  done: "#0a6c4a",
};

const TASK_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

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
    <div className="space-y-10">
      <section className="card p-6 sm:p-7">
        <h2 className="display-sm text-xl">Scope of work</h2>
        {property.renovation_scope ? (
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-2)]">
            {property.renovation_scope}
          </p>
        ) : (
          <p className="mt-3 text-[14px] text-[var(--ink-3)]">No renovation scope defined.</p>
        )}
        {isManager && (
          <Disclosure label="Edit scope" className="mt-5">
            <ApiForm
              action={`/api/properties/${property.id}`}
              submitLabel="Save scope"
              className="mt-3"
              resetOnSuccess={false}
            >
              <textarea
                name="renovation_scope"
                rows={4}
                defaultValue={property.renovation_scope}
                className="input"
              />
            </ApiForm>
          </Disclosure>
        )}
      </section>

      <section>
        <h2 className="display-sm text-xl">Work completed</h2>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-[12rem] max-w-sm flex-1">
            <ProgressBar
              percent={tasks.length ? (100 * done) / tasks.length : 0}
              tone="#c2410c"
            />
          </div>
          <span className="num text-[13px] text-[var(--ink-3)]">
            {done} of {tasks.length} tasks · {money(estTotal)} estimated · {money(actTotal)} actual
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="card-flat mt-6 px-5 py-8 text-center text-[14px] text-[var(--ink-3)]">
            No tasks yet.
          </p>
        ) : (
          /* Rows, not a table: on a phone a five-column table forces sideways
             scrolling, and this list gets read on phones. */
          <ul className="rows card mt-6 overflow-hidden">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">{t.description}</p>
                  )}
                  <p className="num mt-1.5 text-[13px] text-[var(--ink-3)]">
                    {money(t.cost_estimate)} estimated
                    {t.cost_actual != null && ` · ${money(t.cost_actual)} actual`}
                    {t.completed_at && ` · done ${fmtDate(t.completed_at)}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {isManager ? (
                    <InlineSelect
                      action={`/api/properties/${property.id}/renovation`}
                      name="status"
                      value={t.status}
                      payload={{ task_id: String(t.id) }}
                      options={STATUS_OPTIONS}
                    />
                  ) : (
                    <span className="pill">
                      <span
                        className="dot"
                        style={{ background: TASK_DOTS[t.status] ?? "var(--ink-3)" }}
                      />
                      {TASK_LABELS[t.status] ?? t.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {isManager && (
          <Disclosure label="Add a task" className="mt-4">
            <ApiForm
              action={`/api/properties/${property.id}/renovation`}
              submitLabel="Add task"
              className="card-flat mt-3 p-5"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="title" required placeholder="Task" className={inputCls} />
                <input name="description" placeholder="Description" className={inputCls} />
                <input
                  name="cost_estimate"
                  type="number"
                  step="0.01"
                  placeholder="Cost estimate ($)"
                  className={inputCls}
                />
              </div>
            </ApiForm>
          </Disclosure>
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
