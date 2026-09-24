/**
 * Labelled form field. Placeholders alone disappear the moment you start
 * typing, which on a phone leaves you guessing what a box was for — so every
 * field carries a visible label.
 */
export default function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--ink-2)]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-[var(--ink-3)]">{hint}</span>}
    </label>
  );
}
