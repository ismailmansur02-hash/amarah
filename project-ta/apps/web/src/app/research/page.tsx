import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Competitor research",
  description: "Our research into the on-demand tutoring market — what competitors charge, what they pay tutors, and which ones went out of business.",
};

const FINDINGS = [
  {
    heading: "Our exact model has been built before — and it died",
    body: "Yup was on-demand, chat-based, whiteboard-driven maths tutoring for school students. It raised approximately £18.5m and ceased operations in February 2025. The most frequently cited cause is tutor pay of roughly £8 an hour, a rate that cannot retain numerate graduates. It is why we publish our tutor rate, and why it is two thirds of the fee.",
  },
  {
    heading: "The mechanic itself works at scale",
    body: "Snapask reached about 3.2m students and 350,000 tutors across eight Asian markets on precisely this loop — photograph a question, every qualified tutor is alerted, the fastest to respond (often under five seconds) takes it. It raised approximately £44.7m. It sold subscriptions rather than single sessions, which is why our credit packs exist.",
  },
  {
    heading: "Selling answers is a dead business",
    body: "Chegg's market capitalisation fell from approximately £11.6bn in February 2021 to approximately £90m, with a 31% year-on-year subscriber decline and a 45% headcount reduction in October 2025, because free AI assistants do the same job instantly. Any product whose value is 'here is the answer' now competes with a free substitute.",
  },
  {
    heading: "So the product has to be the opposite of an answer engine",
    body: "What a chatbot cannot sell is a named, vetted, accountable human who is rated on whether you understood. That is why the understanding score exists, why it is weighted in matching, and why it is the metric we lead with.",
  },
  {
    heading: "Take rates in this market are wide and mostly hidden",
    body: "Wyzant takes a flat 25%. Preply takes 33% falling to 18–22%. Varsity Tutors bills students roughly £51–75 an hour and pays tutors £9–16 — a take rate approaching 70%. None of them show a tutor the fee before they commit. Ours is a flat 33%, published, on every session.",
  },
  {
    heading: "In the UK, safeguarding is the real barrier to entry",
    body: "Private tutoring sits in a gap in the Safeguarding Vulnerable Groups Act 2006, and Superprof, First Tutors and TutorExtra still only recommend DBS checks. MyTutor, Tutorful and GoStudent require them. With the NSPCC, the NEU and the Children's Commissioner all pushing for mandatory checks, plus the Online Safety Act and the ICO Children's Code, building safeguarding in properly is both the cost of entry and the thing a solo developer cannot copy in a weekend.",
  },
];

export default function ResearchPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <span className="eyebrow">August 2026</span>
      <h1>Competitor &amp; market research</h1>
      <p className="muted" style={{ fontSize: 18, maxWidth: "62ch" }}>
        Before writing any code we looked at every on-demand and marketplace tutoring
        service we could find — what they do, what they charge, what they pay tutors, and
        in several cases why they no longer exist. Six findings shaped this product.
      </p>

      <p className="hint" style={{ marginTop: 18 }}>
        Every figure is in pounds sterling. Where a source reported in another
        currency it has been converted at &pound;1 &asymp; $1.27 and is marked as
        approximate.
      </p>

      <div className="row" style={{ margin: "24px 0 40px" }}>
        <a href="/Project-TA-Competitor-Research.pdf" className="btn btn-lg" download>
          Download the full report (PDF)
        </a>
        <a href="/competitor-research.html" className="btn btn-lg btn-ghost">
          Read it in the browser
        </a>
      </div>

      {FINDINGS.map((f, i) => (
        <div key={f.heading} className="card card-accent" style={{ marginBottom: 18 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <span className="stat-value" style={{ fontSize: 26, minWidth: 34 }}>{i + 1}</span>
            <div>
              <h3 style={{ marginBottom: 6 }}>{f.heading}</h3>
              <p className="muted tight">{f.body}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="card card-pad-lg" style={{ marginTop: 30 }}>
        <h2 className="tight">What the report also covers</h2>
        <ul className="stack" style={{ paddingLeft: 20, marginTop: 12 }}>
          <li>Deep dives on Snapask, Yup, UPchieve, Tutor.com, TutorMe, Skooli, Paper, Varsity Tutors, Wyzant, Preply, MyTutor, Tutorful, Sherpa, GoStudent, Third Space Learning and the AI homework apps.</li>
          <li>A feature matrix across thirteen platforms.</li>
          <li>Published pricing and tutor take rates side by side.</li>
          <li>The UK regulatory position — DBS, the ICO Children&rsquo;s Code, the Online Safety Act 2023.</li>
          <li>Unit economics on a £6 session, and why credit packs matter.</li>
          <li>A cold-start plan, and the risks that would kill this business.</li>
        </ul>
      </div>

      <p className="muted" style={{ marginTop: 28 }}>
        See how the research turned into product decisions on the{" "}
        <Link href="/how-it-works">how it works</Link> and{" "}
        <Link href="/pricing">pricing</Link> pages.
      </p>
    </div>
  );
}
