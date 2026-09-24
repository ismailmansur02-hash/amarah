import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import InstallGuide from "@/components/InstallGuide";

export const metadata: Metadata = {
  title: `Install the app — ${BRAND.name}`,
  description: "Add the E, Management portal to your phone, tablet, or computer.",
};

export default function InstallPage() {
  return (
    <div className="marketing mx-auto max-w-2xl px-6 pb-28 pt-16">
      <Link href="/" className="text-[17px] font-semibold tracking-tight">
        {BRAND.mark} <span className="text-[var(--ink-3)]">{BRAND.rest}</span>
      </Link>

      <h1 className="display mt-10 text-[clamp(2rem,6vw,3.25rem)]">
        It lives on
        <br />
        <span className="text-[var(--ink-3)]">your phone.</span>
      </h1>
      <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[var(--ink-2)]">
        Install the portal on your device to check your properties, payouts and documents any time.
        No app store needed.
      </p>

      <InstallGuide />

      <div className="card mt-12 p-6 sm:p-7">
        <h2 className="display-sm text-lg">Signing in</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
          Your property manager gives you a username and password. Once you sign in, you will only
          ever see your own properties — nothing belonging to any other client is shared with you.
        </p>
        <Link href="/login" className="btn mt-6">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
