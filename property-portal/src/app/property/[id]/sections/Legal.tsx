import { PropertyRow } from "@/lib/access";
import { ChecklistStepRow, DocumentRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import ToggleBox from "@/components/ToggleBox";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

export default function Legal({
  property,
  isManager,
  steps,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  steps: ChecklistStepRow[];
  docs: DocumentRow[];
}) {
  const done = steps.filter((s) => s.completed).length;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Rent-ready legal process</h2>
          <span className="text-xs text-slate-400">{done} of {steps.length} steps complete</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          The legal process to get this property rent ready, broken into steps and marked off one by
          one. Requirements vary by city and state — steps can be added per property.
        </p>
        <div className="mt-3"><ProgressBar percent={steps.length ? (100 * done) / steps.length : 0} /></div>

        <ol className="mt-4 space-y-2">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                s.completed ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="pt-0.5">
                {isManager ? (
                  <ToggleBox
                    action={`/api/properties/${property.id}/checklist`}
                    checked={!!s.completed}
                    payload={{ step_id: String(s.id) }}
                  />
                ) : (
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                      s.completed
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${s.completed ? "text-emerald-900" : "text-slate-800"}`}>
                  {s.position}. {s.title}
                </p>
                {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                {s.completed_at && (
                  <p className="text-xs text-emerald-600">Completed {fmtDate(s.completed_at)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {isManager && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-sky-700">+ Add a step</summary>
            <ApiForm
              action={`/api/properties/${property.id}/checklist`}
              submitLabel="Add step"
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="title" required placeholder="Step title" className={inputCls} />
                <input name="description" placeholder="Description (optional)" className={inputCls} />
              </div>
            </ApiForm>
          </details>
        )}
      </section>

      <DocSection
        propertyId={property.id}
        section="legal"
        docs={docs}
        isManager={isManager}
        heading="Legal documents (licenses, permits, disclosures…)"
      />
    </div>
  );
}
