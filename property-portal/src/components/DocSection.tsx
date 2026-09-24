import ApiForm from "./ApiForm";
import { DocumentRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";

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
      <h3 className="text-[15px] font-semibold">{heading}</h3>

      {docs.length === 0 ? (
        <p className="mt-2 text-[14px] text-[var(--ink-3)]">No documents filed yet.</p>
      ) : (
        <ul className="rows card-flat mt-3 overflow-hidden">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                  {d.title}
                  {d.doc_type && <span className="pill">{d.doc_type}</span>}
                </p>
                {d.notes && <p className="mt-1 text-[13px] text-[var(--ink-2)]">{d.notes}</p>}
                <p className="mt-1 text-[13px] text-[var(--ink-3)]">
                  Filed {fmtDate(d.uploaded_at)}
                </p>
              </div>
              {d.blob_key && (
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="btn-quiet btn-sm shrink-0"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {isManager && (
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-[var(--ink-2)] transition-colors duration-200 hover:text-[var(--ink)]">
            <span className="transition-transform duration-300 ease-[var(--ease)] group-open:rotate-45">
              +
            </span>
            File a document
          </summary>
          <ApiForm
            action={`/api/properties/${propertyId}/documents`}
            submitLabel="File document"
            className="card-flat mt-3 p-5"
          >
            <input type="hidden" name="section" value={section} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="title"
                required
                placeholder="Title (e.g. Warranty Deed)"
                className="input input-sm"
              />
              <input
                name="doc_type"
                placeholder="Type (Deed, Insurance, …)"
                className="input input-sm"
              />
              <input name="notes" placeholder="Notes" className="input input-sm sm:col-span-2" />
              <input name="file" type="file" className="input input-sm sm:col-span-2" />
            </div>
          </ApiForm>
        </details>
      )}
    </div>
  );
}
