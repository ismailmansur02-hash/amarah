"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User, Wallet } from "@project-ta/shared";
import { formatMoney } from "@project-ta/shared";
import Avatar from "./Avatar";

interface Me {
  user: User | null;
  wallet: Wallet | null;
}

export default function SiteHeader() {
  const [me, setMe] = useState<Me>({ user: null, wallet: null });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Me) => { if (!cancelled) setMe(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  const user = me.user;
  const isTutor = user?.role === "tutor";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ user: null, wallet: null });
    router.push("/");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link href={href} className={pathname === href ? "active" : undefined}>
      {label}
    </Link>
  );

  return (
    <>
      <div className="demo-bar">
        <div className="wrap">
          <span>
            <strong>Prototype.</strong> Payments are mocked — no card is ever charged.
          </span>
          <Link href="/login">Switch account →</Link>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="logo">
            <span className="logo-mark">TA</span>
            <span>Project TA</span>
          </Link>

          <nav className="nav nav-desktop">
            {isTutor ? (
              <>
                {link("/tutor", "Question board")}
                {link("/tutor/earnings", "Earnings")}
              </>
            ) : (
              <>
                {link("/ask", "Ask a question")}
                {link("/tutors", "Our tutors")}
              </>
            )}
            {link("/how-it-works", "How it works")}
            {link("/pricing", "Pricing")}
            {link("/safeguarding", "Safety")}
            {link("/faqs", "FAQs")}
          </nav>

          <span className="spacer" />

          {user ? (
            <div className="row" style={{ gap: 10 }}>
              {me.wallet && (
                <Link href="/pay" className="badge" title="Your credit balance">
                  {formatMoney(me.wallet.balancePence)} credit
                </Link>
              )}
              <Avatar name={user.name} color={user.avatarColor} size="sm" />
              <button className="btn btn-sm btn-quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <Link href="/login" className="btn btn-sm btn-quiet">Sign in</Link>
              <Link href="/ask" className="btn btn-sm">Ask a question</Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
