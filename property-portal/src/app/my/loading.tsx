import { Bar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Bar className="h-7 w-52" />
        <Bar className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <Bar className="h-5 w-44" />
            <Bar className="mt-2 h-4 w-56 max-w-full" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Bar className="h-16" />
              <Bar className="h-16" />
              <Bar className="h-16" />
              <Bar className="h-16" />
            </div>
            <Bar className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
