import ApiForm from "./ApiForm";
import { DocumentRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

/** Document list for one section of the property file, with manager upload form. */
export default function DocSection({
  propertyId,
  section,
  docs,
  isManager,
  heading = "Documents",
}: {
  propertyId: number;
  section: string;
  docs: DocumentRow[];
  isManager: boolean;
  heading?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{heading}</h3>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No documents filed yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {d.title}
                  {d.doc_type && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {d.doc_type}
                    </span>
                  )}
                </p>
                {d.notes && <p className="mt-0.5 text-xs text-slate-500">{d.notes}</p>}
                <p className="mt-0.5 text-xs text-slate-400">Filed {fmtDate(d.uploaded_at)}</p>
              </div>
              {d.blob_key && (
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="shrink-0 text-sm font-medium text-sky-700 hover:underline"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {isManager && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-sky-700">
            + File a document
          </summary>
          <ApiForm
            action={`/api/properties/${propertyId}/documents`}
            submitLabel="File document"
            className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <input type="hidden" name="section" value={section} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="title" required placeholder="Title (e.g. Warranty Deed)" className={inputCls} />
              <input name="doc_type" placeholder="Type (Deed, Insurance, …)" className={inputCls} />
              <input name="notes" placeholder="Notes" className={`${inputCls} sm:col-span-2`} />
              <input name="file" type="file" className={`${inputCls} sm:col-span-2`} />
            </div>
          </ApiForm>
        </details>
      )}
    </div>
  );
}
