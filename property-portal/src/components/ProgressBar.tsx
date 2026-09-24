/**
 * How far along something is.
 *
 * The fill animates to its width on arrival rather than being drawn already
 * full, so progress reads as movement — which is the one thing a progress bar
 * is for. The track is a hairline-weight rail, not a heavy grey slab.
 */
export default function ProgressBar({
  percent,
  tone = "var(--accent)",
}: {
  percent: number;
  tone?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className="grow-x h-full rounded-full"
          style={{ width: `${p}%`, background: tone }}
        />
      </div>
      <span className="num w-9 shrink-0 text-right text-[13px] font-medium text-[var(--ink-2)]">
        {p}%
      </span>
    </div>
  );
}
