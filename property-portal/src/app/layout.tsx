import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import LogoutButton from "@/components/LogoutButton";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    // The app is light, so the status bar wants dark text on the page's own
    // background rather than a dark bar sitting above it.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ServiceWorkerRegistrar />
        {session && (
          /*
           * The bar stays with you and lets the page pass underneath it,
           * frosted. It reads as a layer of the same page rather than a
           * separate dark chrome bolted on top.
           */
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
        )}
        {/* Signed-in pages sit in a readable column. The marketing and sign-in
            pages run full-bleed and set their own layout. */}
        {session ? (
          <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">{children}</main>
        ) : (
          <main>{children}</main>
        )}
        <InstallPrompt />
      </body>
    </html>
  );
}
