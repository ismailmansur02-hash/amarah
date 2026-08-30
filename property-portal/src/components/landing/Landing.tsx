import Link from "next/link";
import { BRAND } from "@/lib/brand";
import Reveal from "./Reveal";
import ScrollChecklist from "./ScrollChecklist";

const FILES = [
  { n: "01", title: "Property", body: "Deed, insurance, tax records, ownership — the things you need and can never find." },
  { n: "02", title: "Legal", body: "Licences, permits, disclosures, certificate of occupancy. Filed, dated, in one place." },
  { n: "03", title: "Renovation", body: "The scope of work, every task, estimated against actual cost, and how far along it is." },
  { n: "04", title: "Tenants & Lease", body: "Who lives there, on what terms, until when, and the signed lease behind it." },
  { n: "05", title: "Accounting & Tax", body: "Month by month: rent, expenses, the fee, what's deductible, and what you're paid." },
  { n: "06", title: "Maintenance", body: "Every request and work order, with what it cost and when it was resolved." },
];

export default function Landing() {
  return (
    <div className="marketing min-h-screen bg-[#05070d] text-white">
      {/* ---------------- Hero ---------------- */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora absolute -left-1/4 top-[-20%] h-[70vh] w-[70vh] rounded-full bg-emerald-500/25 blur-[120px]" />
          <div className="aurora-slow absolute -right-1/4 bottom-[-20%] h-[70vh] w-[70vh] rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute inset-0 grid-lines opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05070d]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
          <div className="rise" style={{ animationDelay: "80ms" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Property management
            </span>
          </div>

          <h1
            className="rise mt-8 text-[clamp(2.75rem,9vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.03em]"
            style={{ animationDelay: "160ms" }}
          >
            {BRAND.mark}{" "}
            <span className="bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
              {BRAND.rest}
            </span>
          </h1>

          <p
            className="rise mt-8 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl"
            style={{ animationDelay: "260ms" }}
          >
            Every property is a file. Every file holds everything — the deed, the legal work, the
            renovation, the lease, the money. Your owners see theirs, and only theirs, the moment
            anything changes.
          </p>

          <div className="rise mt-12 flex flex-wrap gap-4" style={{ animationDelay: "360ms" }}>
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Sign in
            </Link>
            <Link
              href="/install"
              className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Install the app
            </Link>
          </div>

          <div
            className="rise mt-20 grid max-w-2xl grid-cols-3 gap-8 border-t border-white/10 pt-8"
            style={{ animationDelay: "460ms" }}
          >
            {[
              ["6", "files per property"],
              ["14", "rent-ready steps"],
              ["1", "owner sees only theirs"],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="text-3xl font-semibold tabular-nums sm:text-4xl">{stat}</div>
                <div className="mt-1 text-xs leading-snug text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- The six files ---------------- */}
      <section className="relative border-t border-white/5 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
              The property file
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Six files.
              <span className="text-slate-500"> One property. Nothing loose.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FILES.map((f, i) => (
              <Reveal key={f.n} delay={i * 70}>
                <div className="glass group h-full rounded-2xl p-6 transition duration-500 hover:border-white/20 hover:bg-white/[0.07]">
                  <div className="font-mono text-xs text-emerald-400/80">{f.n}</div>
                  <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Scroll-driven checklist ---------------- */}
      <section className="relative border-t border-white/5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora-slow absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        </div>
        <ScrollChecklist />
      </section>

      {/* ---------------- What the owner sees ---------------- */}
      <section className="relative border-t border-white/5 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
              For the owner
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              When they're paid.
              <span className="text-slate-500"> What it cost. What they can deduct.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { k: "Next payment", v: "$1,702.00", s: "scheduled 5 Aug", accent: true },
              { k: "Management fee", v: "8%", s: "of collected rent" },
              { k: "Tax deductions YTD", v: "$947.00", s: "fees & deductible expenses" },
            ].map((c, i) => (
              <Reveal key={c.k} delay={i * 90}>
                <div
                  className={`h-full rounded-2xl p-7 transition duration-500 ${
                    c.accent
                      ? "border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-transparent"
                      : "glass"
                  }`}
                >
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{c.k}</div>
                  <div className="mt-3 text-4xl font-semibold tabular-nums">{c.v}</div>
                  <div className="mt-2 text-sm text-slate-500">{c.s}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <p className="mt-12 max-w-xl text-lg leading-relaxed text-slate-400">
              Each owner signs in and sees their property. Not a summary, not a monthly PDF — the
              live file, the same one their manager is working in.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Close ---------------- */}
      <section className="relative overflow-hidden border-t border-white/5 py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora absolute left-1/2 top-0 h-[50vh] w-[80vh] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              It lives on their phone.
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              No app store. Your owner opens the link, adds it to their home screen, and it behaves
              like any other app.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Sign in
              </Link>
              <Link
                href="/install"
                className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold transition hover:bg-white/5"
              >
                How to install
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-500">
          <span>
            {BRAND.mark} <span className="text-slate-600">{BRAND.rest}</span>
          </span>
          <span>Owners see only their own property.</span>
        </div>
      </footer>
    </div>
  );
}
