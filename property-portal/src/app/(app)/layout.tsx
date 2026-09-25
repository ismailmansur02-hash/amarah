import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import LogoutButton from "@/components/LogoutButton";

/**
 * Chrome for the signed-in half of the site.
 *
 * Everything under here needs a session anyway, so reading the cookie costs
 * nothing extra — and keeping it out of the root layout is what lets the
 * public pages be static.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      {/*
       * The bar stays with you and lets the page pass underneath it, frosted.
       * It reads as a layer of the same page rather than a separate dark
       * chrome bolted on top.
       */}
      <header
        className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_80%,transparent)] backdrop-blur-xl backdrop-saturate-150"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <Link
            href={session.role === "manager" ? "/dashboard" : "/my"}
            className="whitespace-nowrap text-[17px] font-semibold tracking-tight"
          >
            {BRAND.mark} <span className="text-[var(--ink-3)]">{BRAND.rest}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/account"
              className="flex items-center gap-2 whitespace-nowrap text-[14px] text-[var(--ink-2)] transition-colors duration-200 hover:text-[var(--ink)]"
            >
              <span className="hidden sm:inline">{session.name}</span>
              <span className="pill">{session.role}</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">{children}</main>
    </>
  );
}
