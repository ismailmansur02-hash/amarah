import { Bar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div>
        <Bar className="h-3 w-32" />
        <Bar className="mt-4 h-9 w-56" />
        <Bar className="mt-4 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6 sm:p-7">
            <Bar className="h-6 w-44" />
            <Bar className="mt-2 h-3 w-56 max-w-full" />
            <Bar className="mt-8 h-3 w-24" />
            <Bar className="mt-3 h-8 w-32" />
            <div className="mt-8 grid grid-cols-3 gap-4">
              <Bar className="h-10" />
              <Bar className="h-10" />
              <Bar className="h-10" />
            </div>
            <Bar className="mt-7 h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
