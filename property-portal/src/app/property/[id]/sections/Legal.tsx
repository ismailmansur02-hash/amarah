"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyRow } from "@/lib/access";
import { ChecklistStepRow, DocumentRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

export default function Legal({
  property,
  isManager,
  steps: serverSteps,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  steps: ChecklistStepRow[];
  docs: DocumentRow[];
}) {
  const router = useRouter();

  /*
   * Ticking a step updates the box, the completion date, the count and the
   * progress bar immediately, then saves in the background. This is the action
   * a manager repeats most, and waiting for a round trip to the database
   * before the tick appears made it feel broken.
   *
   * The server stays the source of truth: its data replaces this as soon as it
   * arrives, and a failed save puts the step back and says so.
   */
  const [steps, setSteps] = useState(serverSteps);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSteps(serverSteps), [serverSteps]);

  const done = steps.filter((s) => s.completed).length;

  async function toggle(step: ChecklistStepRow, completed: boolean) {
    const previous = steps;
    setSteps((current) =>
      current.map((s) =>
        s.id === step.id
          ? { ...s, completed, completed_at: completed ? new Date().toISOString() : null }
          : s
      )
    );
    setError(null);

    const body = new FormData();
    body.set("step_id", String(step.id));
    body.set("completed", completed ? "1" : "0");

    try {
      const res = await fetch(`/api/properties/${property.id}/checklist`, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setSteps(previous);
      setError("That change could not be saved. Check your connection and try again.");
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Rent-ready legal process</h2>
          <span className="text-xs text-slate-400">
            {done} of {steps.length} steps complete
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          The legal process to get this property rent ready, broken into steps and marked off one by
          one. Requirements vary by city and state — steps can be added per property.
        </p>
        <div className="mt-3">
          <ProgressBar percent={steps.length ? (100 * done) / steps.length : 0} />
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

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
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-emerald-600"
                    checked={s.completed}
                    onChange={(e) => toggle(s, e.target.checked)}
                    aria-label={s.title}
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
            <summary className="cursor-pointer text-sm font-medium text-sky-700">Add a step</summary>
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
