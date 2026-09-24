/**
 * Placeholder shapes shown while a page loads.
 *
 * The point is responsiveness, not decoration: a tap should change the screen
 * immediately, even when the data behind it still has to travel to the
 * database and back. They are deliberately faint — a loading state that
 * pulses hard just draws the eye to the waiting.
 */
export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-black/[0.06] ${className}`} />;
}

export function Card({ className = "" }: { className?: string }) {
  return (
    <div className={`card-flat p-5 ${className}`}>
      <Bar className="h-3 w-24" />
      <Bar className="mt-4 h-6 w-20" />
      <Bar className="mt-2.5 h-3 w-16" />
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
