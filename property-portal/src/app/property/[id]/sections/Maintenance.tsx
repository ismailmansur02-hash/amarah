import { PropertyRow } from "@/lib/access";
import { DocumentRow, MaintenanceRow } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";
import ApiForm from "@/components/ApiForm";
import InlineSelect from "@/components/InlineSelect";
import DocSection from "@/components/DocSection";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
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
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Maintenance & management requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isManager
            ? "Track work orders and management tasks. Owners can also submit requests from their portal."
            : "See work on your property, and submit a request to your property manager below."}
        </p>

        <div className="mt-3 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {r.title}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[r.priority]}`}>
                      {r.priority}
                    </span>
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {r.category}
                    </span>
                  </p>
                  {r.description && <p className="mt-1 text-sm text-slate-500">{r.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    Opened {fmtDate(r.created_at)}
                    {r.resolved_at ? ` · resolved ${fmtDate(r.resolved_at)}` : ""}
                    {r.cost != null ? ` · cost ${money(r.cost)}` : ""}
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "in_progress"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_OPTIONS.find((o) => o.value === r.status)?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
              No requests yet.
            </p>
          )}
        </div>

        <ApiForm
          action={`/api/properties/${property.id}/maintenance`}
          submitLabel={isManager ? "Open request" : "Submit request to manager"}
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          <p className="mb-2 text-sm font-medium text-slate-700">New request</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="title" required placeholder="Title" className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <select name="category" className={inputCls} defaultValue="maintenance">
                <option value="maintenance">Maintenance</option>
                <option value="management">Management</option>
              </select>
              <select name="priority" className={inputCls} defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea name="description" rows={2} placeholder="Describe the issue or request" className={`${inputCls} sm:col-span-2`} />
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
