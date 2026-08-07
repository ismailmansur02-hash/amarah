export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") || iso.includes(" ") ? iso.replace(" ", "T") : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtMonth(yyyymm: string): string {
  const d = new Date(yyyymm + "-01T00:00:00");
  if (isNaN(d.getTime())) return yyyymm;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export const STATUS_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  rent_ready_prep: "Rent-Ready Prep",
  renovation: "Renovation",
  listed: "Listed",
  occupied: "Occupied",
};

export const STATUS_COLORS: Record<string, string> = {
  onboarding: "bg-slate-100 text-slate-700",
  rent_ready_prep: "bg-amber-100 text-amber-800",
  renovation: "bg-orange-100 text-orange-800",
  listed: "bg-sky-100 text-sky-800",
  occupied: "bg-emerald-100 text-emerald-800",
};

export function feeLabel(type: string, value: number): string {
  return type === "percent" ? `${value}% of collected rent` : money(value) + " / month";
}
