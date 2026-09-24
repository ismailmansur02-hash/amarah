"use client";

import { useRef } from "react";
import { useScrollProgress } from "./motion";

const FILES = [
  {
    n: "01",
    title: "Property",
    short: "Property",
    body: "The deed, the insurance, the tax records, who owns it.",
    items: ["Warranty deed", "Landlord insurance policy", "Property tax statement"],
  },
  {
    n: "02",
    title: "Legal",
    short: "Legal",
    body: "Everything that makes renting it lawful, filed and dated.",
    items: ["Rental registration", "Certificate of occupancy", "Lead paint disclosure"],
  },
  {
    n: "03",
    title: "Renovation",
    short: "Renovation",
    body: "The scope of work, task by task, estimated against actual.",
    items: ["Repaint interior · $2,650", "Refinish floors · $1,900", "Kitchen counters · $3,520"],
  },
  {
    n: "04",
    title: "Tenants & Lease",
    short: "Tenants",
    body: "Who lives there, on what terms, until when.",
    items: ["Signed lease agreement", "Move-in condition report", "$1,850 / month"],
  },
  {
    n: "05",
    title: "Accounting & Tax",
    short: "Accounting",
    body: "Month by month. Rent in, costs out, what's deductible.",
    items: ["April · payout $1,492.00", "May · payout $1,702.00", "June · payout $1,557.00"],
  },
  {
    n: "06",
    title: "Maintenance",
    short: "Maintenance",
    body: "Every request and work order, with what it cost.",
    items: ["Kitchen sink leak · resolved", "Quarterly inspection · open", "Gutter clearance · $145"],
  },
];

/**
 * The six files, advanced by scroll.
 *
 * A deck of cards pinned to the viewport: the front card lifts away as you
 * scroll and the next comes forward, with the heading changing to match. It is
 * scroll-linked rather than triggered, so it tracks the finger both ways.
 *
 * This is deliberately built in the DOM rather than as a video. It stays sharp
 * at any size, weighs nothing, is readable to a screen reader, and shows the
 * real contents of a real file rather than stock footage of a house.
 */
export default function FileStack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(trackRef);

  const active = progress * (FILES.length - 0.0001);
  const current = Math.min(FILES.length - 1, Math.floor(active));

  return (
    <div ref={trackRef} className="relative h-[420vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            {/* Left: the heading changes as the deck advances. */}
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
                The property file
              </p>

              <div className="relative mt-5 h-[3.5rem] sm:h-[5.5rem]">
                {FILES.map((f, i) => (
                  <h2
                    key={f.n}
                    className="display absolute inset-0 text-[clamp(2.25rem,6vw,4.5rem)] transition-all duration-500"
                    style={{
                      opacity: i === current ? 1 : 0,
                      transform: `translateY(${(i - current) * 26}px)`,
                    }}
                    aria-hidden={i !== current}
                  >
                    {f.short}
                  </h2>
                ))}
              </div>

              <div className="relative mt-5 h-16">
                {FILES.map((f, i) => (
                  <p
                    key={f.n}
                    className="absolute inset-0 max-w-sm text-lg leading-relaxed text-[var(--ink-2)] transition-opacity duration-500"
                    style={{ opacity: i === current ? 1 : 0 }}
                    aria-hidden={i !== current}
                  >
                    {f.body}
                  </p>
                ))}
              </div>

              {/* Progress rail — six ticks, filling as you go. */}
              <div className="mt-10 flex gap-1.5" aria-hidden>
                {FILES.map((f, i) => (
                  <span key={f.n} className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/10">
                    <span
                      className="block h-full rounded-full bg-[var(--ink)] transition-transform duration-300 ease-out"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, active - i))})`,
                        transformOrigin: "left",
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* Right: the deck itself. */}
            <div className="relative h-[24rem] sm:h-[26rem]">
              {FILES.map((f, i) => {
                const offset = i - active;
                const leaving = offset <= 0;
                // Cards behind stack downward and shrink; the front card lifts away.
                const y = leaving ? offset * 58 : Math.min(offset, 3) * 16;
                const scale = leaving ? 1 : 1 - Math.min(offset, 3) * 0.045;
                const opacity = offset < -1.1 ? 0 : offset > 3.2 ? 0 : 1;

                return (
                  <article
                    key={f.n}
                    className="absolute inset-x-0 top-0 rounded-[1.75rem] border border-black/[0.07] bg-white p-7 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.35)] sm:p-9"
                    style={{
                      transform: `translate3d(0, ${y}%, 0) scale(${scale})`,
                      opacity,
                      zIndex: FILES.length - i,
                      transition: "opacity .45s var(--ease)",
                    }}
                    aria-hidden={i !== current}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-xs tracking-widest text-[var(--ink-3)]">
                        {f.n}
                      </span>
                      <span className="text-xs text-[var(--ink-3)]">Maple Avenue Duplex</span>
                    </div>

                    <h3 className="display-sm mt-6 text-3xl">{f.title}</h3>

                    <ul className="mt-7 space-y-0">
                      {f.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center justify-between border-t border-black/[0.06] py-3.5 text-[15px] text-[var(--ink-2)]"
                        >
                          <span>{item}</span>
                          <span className="text-[var(--ink-3)]">›</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
