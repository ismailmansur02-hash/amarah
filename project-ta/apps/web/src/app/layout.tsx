import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "Project TA — a real tutor, in about a minute",
    template: "%s · Project TA",
  },
  description:
    "Stuck on a GCSE or A-level question? Ask, and a DBS-checked undergraduate tutor picks it up in about a minute. Chat and a shared whiteboard, from £6 for 15 minutes.",
  applicationName: "Project TA",
  openGraph: {
    title: "Project TA — a real tutor, in about a minute",
    description:
      "On-demand GCSE and A-level help from DBS-checked undergraduate tutors. Chat and a shared whiteboard, from £6 for 15 minutes.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#157347",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
