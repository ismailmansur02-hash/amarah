/**
 * The "+ add something" affordance used throughout the property file.
 *
 * Kept in one place because it appears in six sections, and six slightly
 * different versions of the same control is the fastest way to make software
 * feel assembled rather than designed. The plus rotates into a cross when the
 * panel opens, so the control says what pressing it again will do.
 */
export default function Disclosure({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-[var(--ink-2)] transition-colors duration-200 hover:text-[var(--ink)]">
        <span className="text-[15px] leading-none transition-transform duration-300 ease-[var(--ease)] group-open:rotate-45">
          +
        </span>
        {label}
      </summary>
      {children}
    </details>
  );
}
