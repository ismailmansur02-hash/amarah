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
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {BRAND.mark} <span className="text-slate-400">{BRAND.rest}</span>
      </h1>
      <p className="mt-1 text-slate-600">
        Install the app on your device to check your properties, payouts, and documents any time —
        no app store needed.
      </p>

      <InstallGuide />

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Signing in
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your property manager gives you a username and password. Once you sign in, you will only
          ever see your own properties — nothing belonging to any other client is shared with you.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
