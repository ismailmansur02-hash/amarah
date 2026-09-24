"use client";

import { useEffect, useRef, useState } from "react";
import { RENT_READY_TEMPLATE } from "@/lib/rentReadyTemplate";
import { useScrollProgress, prefersReducedMotion } from "./motion";

const ROW = 44;

/**
 * The fourteen rent-ready steps, ticked off by scroll.
 *
 * The one black section on the page. Light, light, black, light is an old
 * editorial trick — the change of ground does more for pace than any amount
 * of decoration, and it marks this as the moment worth stopping on.
 *
 * The list is taller than a phone screen, so rather than overflow it slides to
 * keep the step being ticked in view.
 */
export default function ScrollChecklist() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(trackRef);
  const [visibleRows, setVisibleRows] = useState(8);
  const total = RENT_READY_TEMPLATE.length;

  useEffect(() => {
    const measure = () => {
      const available = window.innerHeight - (window.innerWidth < 1024 ? 380 : 260);
      setVisibleRows(Math.max(4, Math.min(total, Math.floor(available / ROW))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [total]);

  // Finish a little early so the last step is readable before it leaves.
  const done = prefersReducedMotion()
    ? total
    : Math.round(Math.min(1, progress * 1.15) * total);
  const percent = Math.round((done / total) * 100);
  const offset = Math.max(0, Math.min(done - visibleRows + 2, total - visibleRows)) * ROW;

  return (
    <div ref={trackRef} className="relative h-[340vh] bg-[#0b0b0d] text-white">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/40">
                Rent ready
              </p>
              <h2 className="display mt-5 text-[clamp(2.25rem,6vw,4.5rem)]">
                Fourteen steps.
                <br />
                <span className="text-white/40">Nothing missed.</span>
              </h2>
              <p className="mt-6 hidden max-w-sm text-lg leading-relaxed text-white/50 lg:block">
                The legal path from takeover to rented. Your owner watches it happen, step by step,
                without asking.
              </p>

              <div className="mt-8 flex items-baseline gap-4">
                <span className="text-5xl font-semibold tabular-nums tracking-tight sm:text-7xl">
                  {percent}%
                </span>
                <span className="text-sm text-white/40">
                  {done} of {total}
                </span>
              </div>
              <div className="mt-5 h-px w-full max-w-sm bg-white/15">
                <div
                  className="h-px bg-white transition-[width] duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="relative overflow-hidden" style={{ height: visibleRows * ROW }}>
              <ol
                className="transition-transform duration-500"
                style={{ transform: `translateY(-${offset}px)`, transitionTimingFunction: "var(--ease)" }}
              >
                {RENT_READY_TEMPLATE.map((step, i) => {
                  const complete = i < done;
                  return (
                    <li
                      key={step.title}
                      style={{ height: ROW }}
                      className="flex items-center gap-4 border-b border-white/[0.07]"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-all duration-500 ${
                          complete ? "bg-white text-black" : "border border-white/20 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`truncate text-[15px] transition-colors duration-500 ${
                          complete ? "text-white" : "text-white/35"
                        }`}
                      >
                        {step.title}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b0b0d] to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
