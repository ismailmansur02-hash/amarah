import { PropertyRow } from "@/lib/access";
import { DocumentRow } from "@/lib/types";
import { fmtDate, feeLabel, STATUS_LABELS } from "@/lib/format";
import DocSection from "@/components/DocSection";

export default function PropertyInfo({
  property,
  client,
  isManager,
  docs,
}: {
  property: PropertyRow;
  client: { name: string; username: string; email: string };
  isManager: boolean;
  docs: DocumentRow[];
}) {
  const facts: [string, string][] = [
    ["Address", `${property.address}, ${property.city} ${property.state} ${property.zip}`],
    ["Owner", `${client.name}${client.email ? ` (${client.email})` : ""}`],
    ["Takeover date", fmtDate(property.takeover_date)],
    ["Status", STATUS_LABELS[property.status]],
    ["Management fee", feeLabel(property.management_fee_type, property.management_fee_value)],
  ];
  if (isManager) facts.splice(2, 0, ["Owner login", client.username]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Property information</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        {property.notes && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{property.notes}</div>
        )}
      </section>

      <DocSection
        propertyId={property.id}
        section="property"
        docs={docs}
        isManager={isManager}
        heading="Property documents (deed, insurance, tax records…)"
      />
    </div>
  );
}
