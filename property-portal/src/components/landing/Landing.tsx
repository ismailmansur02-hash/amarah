"use client";

import Link from "next/link";
import { useRef } from "react";
import { BRAND } from "@/lib/brand";
import type { Photo as PhotoData } from "@/lib/photos";
import { Lines, useScrollProgress, useViewportProgress } from "./motion";
import Photo from "./Photo";
import FileStack from "./FileStack";
import ScrollChecklist from "./ScrollChecklist";

export type LandingPhotos = {
  hero: PhotoData | null;
  interior: PhotoData | null;
  aerial: PhotoData | null;
};

/**
 * The house, then the words.
 *
 * The picture is held still while the page moves over it — the background
 * drifts at a fraction of the scroll speed, so the hero feels like a window
 * onto somewhere rather than a banner being scrolled past.
 */
function Hero({ photo }: { photo: PhotoData | null }) {
  const p = useViewportProgress();

  return (
    <section className="relative h-[100svh] overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(0, ${p * 18}%, 0) scale(${1 + p * 0.08})`,
        }}
      >
        <Photo
          photo={photo}
          priority
          alt="A managed property at dusk"
          sizes="100vw"
          className="scale-105"
        />
      </div>

      {/* Type needs a floor to stand on. Dark at the bottom, lighter at the
          top, so the wordmark reads without flattening the picture. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,10,15,0.46) 0%, rgba(6,10,15,0.12) 32%, rgba(6,10,15,0.52) 74%, rgba(6,10,15,0.82) 100%)",
        }}
      />

      <div className="absolute inset-0 flex items-end">
        <div
          className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-24"
          style={{ transform: `translateY(${p * -60}px)`, opacity: 1 - Math.min(1, p * 1.5) }}
        >
          <p className="eyebrow text-white/70">Siesta Key, Florida</p>

          <h1 className="display mt-5 text-[clamp(2.75rem,9vw,7rem)] text-white">
            <span className="line-mask line-in">
              <span className="line-inner" style={{ transitionDelay: "60ms" }}>
                {BRAND.mark} {BRAND.rest}
              </span>
            </span>
          </h1>

          <div className="mt-7 max-w-lg">
            <Lines
              className="text-[clamp(1.0625rem,2vw,1.375rem)] leading-[1.5] text-white/80"
              delay={300}
              lines={[
                "Property management, kept as a file",
                "your owner can open at any hour.",
              ]}
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white px-7 py-3 text-[15px] font-medium text-[var(--ink)] transition-colors duration-300 hover:bg-white/90"
            >
              Sign in
            </Link>
            <Link
              href="/install"
              className="rounded-full border border-white/35 px-7 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-white/10"
            >
              Install the app ›
            </Link>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.25em] text-white/55 transition-opacity duration-500"
        style={{ opacity: 1 - Math.min(1, p * 4) }}
      >
        Scroll
      </div>
    </section>
  );
}

/**
 * A photograph that widens as you pass it.
 *
 * It starts held in from the edges and opens to full bleed, which gives the
 * scroll something to do besides move text upward. The caption arrives with
 * it.
 */
function Band({
  photo,
  alt,
  scene,
  eyebrow,
  lines,
  body,
  tall = false,
}: {
  photo: PhotoData | null;
  alt: string;
  scene: "dusk" | "morning" | "water";
  eyebrow: string;
  lines: React.ReactNode[];
  body?: string;
  tall?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref);

  // 0 → held in by 7% a side and well rounded; 1 → full width, square corners.
  const t = Math.min(1, Math.max(0, (p - 0.1) * 1.9));
  const inset = 7 * (1 - t);
  const radius = 28 * (1 - t);

  return (
    <section ref={ref} className="bg-[var(--paper)] py-20 sm:py-28">
      <div
        className="relative overflow-hidden will-change-[margin,border-radius]"
        style={{
          marginInline: `${inset}%`,
          borderRadius: `${radius}px`,
          height: tall ? "min(78vh, 720px)" : "min(62vh, 560px)",
        }}
      >
        <Photo photo={photo} alt={alt} scene={scene} sizes="100vw" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(6,10,15,0.72) 0%, rgba(6,10,15,0.18) 46%, rgba(6,10,15,0) 72%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow text-white/65">{eyebrow}</p>
            <Lines
              className="display mt-4 max-w-2xl text-[clamp(1.75rem,4.5vw,3.25rem)] text-white"
              lines={lines}
            />
            {body && (
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">{body}</p>
            )}
          </div>
        </div>
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
    <section ref={ref} className="hairline border-t py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <Lines
          className="display max-w-3xl text-[clamp(2rem,5.5vw,4rem)]"
          lines={[
            "When they're paid.",
            <span key="b" className="text-[var(--ink-3)]">
              What it cost. What they can deduct.
            </span>,
          ]}
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-black/[0.07] sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.k} className="bg-[var(--surface)] p-8 sm:p-10">
              <div className="label">{c.k}</div>
              <div className="num mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none">
                {c.prefix}
                {Math.round(c.v * t).toLocaleString("en-US")}
                {c.suffix}
              </div>
              <div className="mt-2 text-[13px] text-[var(--ink-3)]">{c.s}</div>
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

export default function Landing({ photos }: { photos: LandingPhotos }) {
  return (
    <div className="marketing">
      <Hero photo={photos.hero} />

      <section className="hairline border-t bg-[var(--paper)] py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-6">
          <Lines
            className="display max-w-3xl text-[clamp(2rem,5.5vw,4rem)]"
            lines={[
              "One property.",
              <span key="b" className="text-[var(--ink-3)]">
                One file. Six sections.
              </span>,
            ]}
          />
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-[var(--ink-2)]">
            The deed, the permits, the renovation, the lease, the accounting and every request —
            filed as the work happens, not assembled at the end of the month.
          </p>
        </div>
      </section>

      <section className="hairline border-t">
        <FileStack />
      </section>

      <Band
        photo={photos.interior}
        alt="Inside a property being prepared to let"
        scene="morning"
        eyebrow="Rent ready"
        lines={["From takeover", <span key="b" className="text-white/60">to rent ready.</span>]}
        body="Fourteen legal steps, marked off one at a time, with the date each one was cleared."
      />

      <ScrollChecklist />

      <OwnerNumbers />

      <Band
        photo={photos.aerial}
        alt="The coastline where the managed properties sit"
        scene="water"
        eyebrow="For the owner"
        lines={["Theirs, and only theirs."]}
        body="Each owner signs in and sees their own property. Nothing of anyone else's is shared."
        tall
      />

      <section className="hairline border-t py-28 sm:py-40">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Lines
            className="display text-[clamp(2.25rem,7vw,5rem)]"
            lines={[
              "It lives on",
              <span key="b" className="text-[var(--ink-3)]">
                their phone.
              </span>,
            ]}
          />
          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-[var(--ink-2)]">
            No app store. They open the link, add it to the home screen, and it behaves like any
            other app.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn px-7 py-3">
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

      <footer className="hairline border-t py-12">
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
