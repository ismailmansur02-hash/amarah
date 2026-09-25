import { Bar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Bar className="h-4 w-28" />
        <Bar className="mt-5 h-9 w-64 max-w-full" />
        <Bar className="mt-3 h-4 w-80 max-w-full" />
      </div>

      {/* Mirrors the segmented control, so the tabs do not jump when they
          arrive. */}
      <div className="flex gap-2 overflow-hidden rounded-full border border-[var(--line)] p-1">
        {["w-20", "w-24", "w-16", "w-28", "w-32", "w-32", "w-28"].map((w, i) => (
          <Bar key={i} className={`h-7 shrink-0 ${w}`} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Bar className="h-32 rounded-[var(--r)]" />
        <Bar className="h-32 rounded-[var(--r)]" />
      </div>
      <Bar className="h-48 rounded-[var(--r)]" />
    </div>
  );
}
