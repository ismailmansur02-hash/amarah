export default function ProgressBar({
  percent,
  colorClass = "bg-emerald-500",
}: {
  percent: number;
  colorClass?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${p}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600">{p}%</span>
    </div>
  );
}
