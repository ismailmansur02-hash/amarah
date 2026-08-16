import { Bar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Bar className="h-4 w-36" />
        <Bar className="mt-3 h-7 w-64 max-w-full" />
        <Bar className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {["w-20", "w-28", "w-16", "w-24", "w-32", "w-30", "w-26"].map((w, i) => (
          <Bar key={i} className={`h-8 ${w}`} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
      </div>
      <Bar className="h-40" />
    </div>
  );
}
