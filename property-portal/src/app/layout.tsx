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
    statusBarStyle: "black-translucent",
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
          <header className="bg-slate-900 text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
              <Link
                href={session.role === "manager" ? "/dashboard" : "/my"}
                className="whitespace-nowrap text-base font-semibold tracking-tight sm:text-lg"
              >
                {BRAND.mark} <span className="text-slate-400">{BRAND.rest}</span>
              </Link>
              <div className="flex items-center gap-2 text-sm sm:gap-4">
                <Link href="/account" className="whitespace-nowrap text-slate-300 hover:text-white">
                  <span className="hidden sm:inline">{session.name}</span>
                  <span className="rounded bg-slate-700 px-2 py-0.5 text-xs uppercase tracking-wide sm:ml-2">
                    {session.role}
                  </span>
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>
        )}
        {/* Signed-in pages sit in a readable column. The marketing and sign-in
            pages run full-bleed and set their own layout. */}
        {session ? (
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        ) : (
          <main>{children}</main>
        )}
        <InstallPrompt />
      </body>
    </html>
  );
}
