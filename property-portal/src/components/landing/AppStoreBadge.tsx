import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * The App Store badge, before there is an App Store listing.
 *
 * It says the app is coming rather than claiming to be a download, and it
 * goes somewhere useful in the meantime — the install guide, where the portal
 * can already be added to a home screen today. A badge that says "Download"
 * and then does nothing reads as a broken site, which costs more trust than
 * the badge buys.
 *
 * Set BRAND.appStoreUrl when the listing exists and this becomes an ordinary
 * link to it, wording and all.
 */
export default function AppStoreBadge({
  tone = "dark",
  className = "",
}: {
  /** "light" for sitting on a photograph, "dark" for the paper sections. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const live = Boolean(BRAND.appStoreUrl);

  const styles =
    tone === "light"
      ? "border-white/35 bg-white/10 text-white hover:bg-white/15 backdrop-blur-sm"
      : "border-black/15 bg-[var(--ink)] text-white hover:bg-black";

  return (
    <Link
      href={BRAND.appStoreUrl ?? "/install"}
      className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-colors duration-300 ${styles} ${className}`}
    >
      {/* A plain app glyph. Deliberately not Apple's badge artwork — that is
          their trademark and comes with rules about how it may be drawn. */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 8v7m0 0 2.6-2.6M12 15l-2.6-2.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-left leading-tight">
        <span className="block text-[11px] opacity-70">
          {live ? "Download on the" : "Coming soon to the"}
        </span>
        <span className="block text-[15px] font-medium tracking-tight">App Store</span>
      </span>
    </Link>
  );
}
