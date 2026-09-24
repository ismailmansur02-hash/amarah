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

/**
 * One colour per status, shown as a small dot on an otherwise neutral pill.
 *
 * Five differently tinted pills on one screen is noise and reads as a
 * template; five identical pills with a coloured dot each reads as a legend,
 * and keeps the colour budget for things that actually need attention.
 */
export const STATUS_DOTS: Record<string, string> = {
  onboarding: "#86868b",
  rent_ready_prep: "#c98a00",
  renovation: "#c2410c",
  listed: "#1d5fbf",
  occupied: "#0a6c4a",
};

export function feeLabel(type: string, value: number): string {
  return type === "percent" ? `${value}% of collected rent` : money(value) + " / month";
}
