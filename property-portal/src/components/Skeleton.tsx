/**
 * Placeholder shapes shown while a page loads.
 *
 * The point is responsiveness, not decoration: a tap should change the screen
 * immediately, even when the data behind it still has to travel to the
 * database and back.
 */
export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function Card({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <Bar className="h-3 w-24" />
      <Bar className="mt-3 h-6 w-20" />
      <Bar className="mt-2 h-3 w-16" />
    </div>
  );
}

export function StatRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card />
      <Card />
      <Card />
      <Card />
    </div>
  );
}
