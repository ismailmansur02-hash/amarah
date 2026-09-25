import { Bar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <div>
        <Bar className="h-9 w-48" />
        <Bar className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="card grid gap-px overflow-hidden bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--surface)] p-6">
            <Bar className="h-3 w-24" />
            <Bar className="mt-4 h-6 w-20" />
            <Bar className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>
      <div>
        <Bar className="h-6 w-28" />
        <div className="card mt-4 p-5">
          <Bar className="h-4 w-1/2" />
          <Bar className="mt-5 h-4 w-2/3" />
          <Bar className="mt-5 h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}
