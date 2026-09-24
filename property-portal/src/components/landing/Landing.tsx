"use client";

import Link from "next/link";
import { useRef } from "react";
import { BRAND } from "@/lib/brand";
import { Lines, useScrollProgress, useViewportProgress } from "./motion";
import FileStack from "./FileStack";
import ScrollChecklist from "./ScrollChecklist";

/** Hero type settles and drifts as you begin to scroll, rather than just sitting there. */
function Hero() {
  const p = useViewportProgress();

  return (
    <section className="relative flex min-h-[100svh] items-center">
      <div
        className="mx-auto w-full max-w-6xl px-6 py-28"
        style={{
          transform: `translateY(${p * -70}px)`,
          opacity: 1 - Math.min(1, p * 1.15),
        }}
      >
        <h1 className="display text-[clamp(3rem,11vw,9rem)]">
          <span className="line-mask line-in">
            <span className="line-inner" style={{ transitionDelay: "60ms" }}>
              {BRAND.mark}
            </span>
          </span>
          <span className="line-mask line-in">
            <span
              className="line-inner text-[var(--ink-3)]"
              style={{ transitionDelay: "150ms" }}
            >
              {BRAND.rest}
            </span>
          </span>
        </h1>

        <div className="mt-12 max-w-xl sm:mt-16">
          <Lines
            className="text-[clamp(1.125rem,2.2vw,1.5rem)] leading-[1.45] text-[var(--ink-2)]"
            delay={340}
            lines={[
              "Every property is a file.",
              "Your owner sees theirs, and only theirs,",
              "the moment anything changes.",
            ]}
          />
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="rounded-full bg-[var(--ink)] px-7 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-black"
          >
            Sign in
          </Link>
          <Link
            href="/install"
            className="rounded-full px-7 py-3 text-[15px] font-medium text-[var(--ink)] transition-colors duration-300 hover:bg-black/[0.04]"
          >
            Install the app ›
          </Link>
        </div>
      </div>

      {/* Quiet scroll cue — the page tells you it has more to give. */}
      <div
        className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.25em] text-[var(--ink-3)] transition-opacity duration-500"
        style={{ opacity: 1 - Math.min(1, p * 4) }}
      >
        Scroll
      </div>
    </section>
  );
}

/** The owner's three numbers, counted up as the section arrives. */
function OwnerNumbers() {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref);
  const t = Math.min(1, Math.max(0, (p - 0.18) * 2.4));

  const cards = [
    { k: "Next payment", v: 1702, prefix: "$", suffix: "", s: "scheduled 5 August" },
    { k: "Management fee", v: 8, prefix: "", suffix: "%", s: "of collected rent" },
    { k: "Tax deductions", v: 947, prefix: "$", suffix: "", s: "year to date" },
  ];

  return (
    <section ref={ref} className="border-t hairline py-28 sm:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Lines
          className="display max-w-3xl text-[clamp(2rem,5.5vw,4rem)]"
          lines={["When they're paid.", <span key="b" className="text-[var(--ink-3)]">What it cost. What they can deduct.</span>]}
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-black/[0.07] sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.k} className="bg-[var(--paper)] p-8 sm:p-10">
              <div className="text-[13px] text-[var(--ink-3)]">{c.k}</div>
              <div className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold tabular-nums tracking-tight">
                {c.prefix}
                {Math.round(c.v * t).toLocaleString("en-US")}
                {c.suffix}
              </div>
              <div className="mt-2 text-sm text-[var(--ink-3)]">{c.s}</div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-lg text-lg leading-relaxed text-[var(--ink-2)]">
          Not a monthly PDF. The live file — the same one their manager is working in.
        </p>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="marketing">
      <Hero />

      <section className="border-t hairline">
        <FileStack />
      </section>

      <ScrollChecklist />

      <OwnerNumbers />

      <section className="border-t hairline py-32 sm:py-48">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Lines
            className="display text-[clamp(2.25rem,7vw,5rem)]"
            lines={["It lives on", <span key="b" className="text-[var(--ink-3)]">their phone.</span>]}
          />
          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-[var(--ink-2)]">
            No app store. They open the link, add it to the home screen, and it behaves like any
            other app.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[var(--ink)] px-7 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-black"
            >
              Sign in
            </Link>
            <Link
              href="/install"
              className="rounded-full px-7 py-3 text-[15px] font-medium transition-colors duration-300 hover:bg-black/[0.04]"
            >
              How to install ›
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t hairline py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-[13px] text-[var(--ink-3)]">
          <span className="text-[var(--ink-2)]">
            {BRAND.mark} {BRAND.rest}
          </span>
          <span>Owners see only their own property.</span>
        </div>
      </footer>
    </div>
  );
}
