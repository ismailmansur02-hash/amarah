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
      <section className="card p-6 sm:p-7">
        <h2 className="display-sm text-xl">Property information</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="label">{label}</dt>
              <dd className="mt-1 text-[15px]">{value}</dd>
            </div>
          ))}
        </dl>
        {property.notes && (
          <p className="mt-7 border-t border-[var(--line-2)] pt-5 text-[14px] leading-relaxed text-[var(--ink-2)]">
            {property.notes}
          </p>
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
