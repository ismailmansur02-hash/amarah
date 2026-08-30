"use client";

import { useEffect, useRef, useState } from "react";
import { RENT_READY_TEMPLATE } from "@/lib/rentReadyTemplate";

const ROW = 44; // fixed row height, so the list can be shifted by exact amounts

/**
 * The scroll-driven moment.
 *
 * The panel sticks while a tall spacer scrolls past it, and the rent-ready
 * steps tick off in time with that scroll — so the page demonstrates the
 * product rather than describing it.
 *
 * The list is taller than the space available on a phone, so rather than
 * letting it overflow it slides to keep the step being completed in view.
 * Progress is read in a rAF-throttled scroll handler so it stays smooth, and
 * with reduced motion requested the finished state is shown immediately.
 */
export default function ScrollChecklist() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(0);
  const [visibleRows, setVisibleRows] = useState(8);
  const total = RENT_READY_TEMPLATE.length;

  useEffect(() => {
    const measure = () => {
      // Leave room for the heading, the percentage and the install banner.
      const available = window.innerHeight - (window.innerWidth < 1024 ? 400 : 240);
      setVisibleRows(Math.max(4, Math.min(total, Math.floor(available / ROW))));
    };
    measure();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(total);
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = trackRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      // Finish a little early so the last step is readable before it leaves.
      setDone(Math.round(Math.min(1, progress * 1.15) * total));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [total]);

  const percent = Math.round((done / total) * 100);
  // Slide the list so the step currently being ticked stays on screen.
  const offset = Math.max(0, Math.min(done - visibleRows + 2, total - visibleRows)) * ROW;

  return (
    <div ref={trackRef} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pb-28 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400 sm:text-sm">
                Rent ready
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Fourteen steps.
                <br />
                <span className="text-slate-400">Nothing missed.</span>
              </h2>
              <p className="mt-4 hidden max-w-md text-lg leading-relaxed text-slate-400 lg:block">
                The legal path from takeover to rented, broken into steps and marked off one by one.
                Your owner watches it happen — no chasing, no wondering.
              </p>

              <div className="mt-5 flex items-baseline gap-3 lg:mt-8">
                <span className="text-4xl font-semibold tabular-nums text-white sm:text-6xl">
                  {percent}%
                </span>
                <span className="text-sm text-slate-500">
                  {done} of {total} complete
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div
              className="relative overflow-hidden"
              style={{ height: visibleRows * ROW }}
            >
              <ol
                className="transition-transform duration-500 ease-out"
                style={{ transform: `translateY(-${offset}px)` }}
              >
                {RENT_READY_TEMPLATE.map((step, i) => {
                  const complete = i < done;
                  const isNext = i === done;
                  return (
                    <li
                      key={step.title}
                      style={{ height: ROW }}
                      className={`flex items-center gap-3 rounded-xl px-3 transition-colors duration-500 ${
                        complete
                          ? "bg-emerald-500/10 text-white"
                          : isNext
                            ? "bg-white/5 text-slate-300"
                            : "text-slate-600"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500 ${
                          complete
                            ? "bg-emerald-400 text-slate-900"
                            : "border border-white/15 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="truncate text-sm">{step.title}</span>
                    </li>
                  );
                })}
              </ol>
              {/* Fade the cut edge rather than ending on a hard crop. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05070d] to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
