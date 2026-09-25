"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyRow } from "@/lib/access";
import { ChecklistStepRow, DocumentRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import ApiForm from "@/components/ApiForm";
import DocSection from "@/components/DocSection";

const inputCls = "input input-sm";

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
        <h2 className="display-sm text-xl">Rent-ready legal process</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-2)]">
          The legal process to get this property rent ready, broken into steps and marked off one by
          one. Requirements vary by city and state — steps can be added per property.
        </p>

        <div className="mt-5 flex items-center gap-5">
          <div className="max-w-sm flex-1">
            <ProgressBar percent={steps.length ? (100 * done) / steps.length : 0} />
          </div>
          <span className="num text-[13px] text-[var(--ink-3)]">
            {done} of {steps.length} complete
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-[var(--r-sm)] border border-[var(--bad)]/25 bg-[var(--bad)]/[0.04] px-4 py-3 text-[14px] text-[var(--bad)]">
            {error}
          </p>
        )}

        {/*
         * One continuous list separated by hairlines. Boxing each step and
         * tinting the finished ones green turned a 14-step checklist into a
         * wall of colour; a completed step now simply steps back in weight,
         * the way a crossed-off line does on paper.
         */}
        <ol className="rows card mt-6 overflow-hidden">
          {steps.map((s) => (
            <li key={s.id} className="flex items-start gap-4 px-5 py-4">
              <div className="pt-0.5">
                {isManager ? (
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                    checked={s.completed}
                    onChange={(e) => toggle(s, e.target.checked)}
                    aria-label={s.title}
                  />
                ) : (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold transition-colors duration-300"
                    style={
                      s.completed
                        ? { background: "var(--accent)", color: "#fff" }
                        : { border: "1px solid var(--line)", color: "transparent" }
                    }
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[15px] transition-colors duration-300 ${
                    s.completed ? "text-[var(--ink-3)]" : "font-medium"
                  }`}
                >
                  <span className="num mr-1.5 text-[var(--ink-3)]">{s.position}</span>
                  {/* The number stays upright; only the step itself is struck
                      off, the way it would be on paper. */}
                  <span className={s.completed ? "line-through" : undefined}>{s.title}</span>
                </p>
                {s.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    {s.description}
                  </p>
                )}
                {s.completed_at && (
                  <p className="mt-1 text-[13px]" style={{ color: "var(--accent)" }}>
                    Completed {fmtDate(s.completed_at)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {isManager && (
          <details className="group mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-[var(--ink-2)] transition-colors duration-200 hover:text-[var(--ink)]">
              <span className="transition-transform duration-300 ease-[var(--ease)] group-open:rotate-45">
                +
              </span>
              Add a step
            </summary>
            <ApiForm
              action={`/api/properties/${property.id}/checklist`}
              submitLabel="Add step"
              className="card-flat mt-3 p-5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="title" required placeholder="Step title" className={inputCls} />
                <input
                  name="description"
                  placeholder="Description (optional)"
                  className={inputCls}
                />
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
