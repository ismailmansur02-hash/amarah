import { PropertyRow } from "@/lib/access";
import { DocumentRow, MaintenanceRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";
import DocSection from "@/components/DocSection";
import Field from "@/components/Field";

const inputCls = "input input-sm";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_DOTS: Record<string, string> = {
  open: "#86868b",
  in_progress: "#c98a00",
  resolved: "#0a6c4a",
};

/* Only urgency gets colour, and only when it is actually urgent. */
const PRIORITY_DOTS: Record<string, string> = {
  low: "#86868b",
  normal: "#86868b",
  high: "#c98a00",
  urgent: "#b3261e",
};

export default function Maintenance({
  property,
  isManager,
  requests,
  docs,
}: {
  property: PropertyRow;
  isManager: boolean;
  requests: MaintenanceRow[];
  docs: DocumentRow[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="display-sm text-xl">Maintenance & management requests</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-2)]">
          {isManager
            ? "Track work orders and management tasks. Owners can also submit requests from their portal."
            : "See work on your property, and submit a request to your property manager below."}
        </p>

        {requests.length === 0 ? (
          <p className="card-flat mt-5 px-5 py-8 text-center text-[14px] text-[var(--ink-3)]">
            No requests yet.
          </p>
        ) : (
          <ul className="rows card mt-5 overflow-hidden">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-medium">{r.title}</p>
                    <span className="pill">
                      <span
                        className="dot"
                        style={{ background: PRIORITY_DOTS[r.priority] ?? "var(--ink-3)" }}
                      />
                      {r.priority}
                    </span>
                    <span className="pill">{r.category}</span>
                  </div>
                  {r.description && (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink-2)]">
                      {r.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-[13px] text-[var(--ink-3)]">
                    Opened {fmtDate(r.created_at)}
                    {r.resolved_at ? ` · resolved ${fmtDate(r.resolved_at)}` : ""}
                    {r.cost != null ? ` · ${money(r.cost)}` : ""}
                  </p>
                </div>

                <div className="shrink-0">
                  {isManager ? (
                    <InlineSelect
                      action={`/api/properties/${property.id}/maintenance`}
                      name="status"
                      value={r.status}
                      payload={{ request_id: String(r.id) }}
                      options={STATUS_OPTIONS}
                    />
                  ) : (
                    <span className="pill">
                      <span
                        className="dot"
                        style={{ background: STATUS_DOTS[r.status] ?? "var(--ink-3)" }}
                      />
                      {STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <ApiForm
          action={`/api/properties/${property.id}/maintenance`}
          submitLabel={isManager ? "Open request" : "Send to my manager"}
          className="card mt-6 p-6"
        >
          <p className="text-[15px] font-medium">New request</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="What is it?" className="sm:col-span-2">
              <input
                name="title"
                required
                placeholder="e.g. Kitchen sink is leaking"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <select name="category" className={inputCls} defaultValue="maintenance">
                <option value="maintenance">Maintenance</option>
                <option value="management">Management</option>
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" className={inputCls} defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Details" className="sm:col-span-2">
              <textarea
                name="description"
                rows={3}
                placeholder="Describe the issue or request"
                className={inputCls}
              />
            </Field>
          </div>
        </ApiForm>
      </section>

      <DocSection
        propertyId={property.id}
        section="maintenance"
        docs={docs}
        isManager={isManager}
        heading="Maintenance documents (invoices, warranties, photos…)"
      />
    </div>
  );
}
