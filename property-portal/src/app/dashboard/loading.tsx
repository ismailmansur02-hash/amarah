import { Bar, StatRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Bar className="h-7 w-56" />
        <Bar className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <StatRow />
      <div>
        <Bar className="h-5 w-28" />
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          <Bar className="h-4 w-full" />
          <Bar className="mt-4 h-4 w-5/6" />
          <Bar className="mt-4 h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}
