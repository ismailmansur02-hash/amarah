import { STATUS_LABELS, STATUS_DOTS } from "@/lib/format";

/** Where a property has got to, as a neutral pill with one coloured dot. */
export default function StatusPill({ status }: { status: string }) {
  return (
    <span className="pill">
      <span className="dot" style={{ background: STATUS_DOTS[status] ?? "var(--ink-3)" }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
