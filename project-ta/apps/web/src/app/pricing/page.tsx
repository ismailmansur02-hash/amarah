import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PACKS, DURATION_OPTIONS, TAKE_RATE, formatMoney, pricePence, tutorHourlyPence, tutorPayoutPence } from "@project-ta/shared";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <h1>Pricing</h1>
      <p className="muted" style={{ fontSize: 18, maxWidth: "60ch" }}>
        You buy credit and spend it when you are stuck. No subscription, no minimum, and
        credit does not expire.
      </p>

      <h2 style={{ marginTop: 36 }}>Sessions</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Length</th>
              <th>You pay</th>
              <th>Per hour</th>
              <th>Tutor receives</th>
            </tr>
          </thead>
          <tbody>
            {DURATION_OPTIONS.map((d) => (
              <tr key={d}>
                <td><strong>{d} minutes</strong></td>
                <td>{formatMoney(pricePence(d))}</td>
                <td className="muted">{formatMoney(Math.round((pricePence(d) / d) * 60))}</td>
                <td>{formatMoney(tutorPayoutPence(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 36 }}>Credit packs</h2>
      <div className="grid grid-3">
        {CREDIT_PACKS.map((p) => (
          <div key={p.id} className={`card card-hover${p.badge === "Most popular" ? " card-accent" : ""}`}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <h3 className="tight">{p.name}</h3>
              {p.badge && <span className="badge">{p.badge}</span>}
            </div>
            <div className="stat-value" style={{ textAlign: "left", fontSize: 34 }}>
              {formatMoney(p.pricePence)}
            </div>
            {p.creditPence > p.pricePence && (
              <p className="badge">{formatMoney(p.creditPence)} of credit</p>
            )}
            <p className="muted" style={{ fontSize: 14.5, marginTop: 10 }}>{p.blurb}</p>
            <Link href="/pay" className="btn btn-block btn-quiet">Buy credit</Link>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 44 }}>How we compare</h2>
      <p className="muted">
        Published rates from UK and US platforms, converted where needed. Everyone below
        does something slightly different — most require you to book ahead.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Roughly per hour</th>
              <th>Instant?</th>
              <th>Tutor&rsquo;s share</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "var(--g-50)" }}>
              <td><strong>Project TA</strong></td>
              <td><strong>{formatMoney(Math.round((pricePence(15) / 15) * 60))}</strong></td>
              <td>Yes</td>
              <td><strong>{Math.round((1 - TAKE_RATE) * 100)}%</strong></td>
            </tr>
            <tr><td>Sherpa (UK)</td><td>from £20</td><td>No — booked</td><td>Not published</td></tr>
            <tr><td>MyTutor (UK)</td><td>£25–£60</td><td>No — booked</td><td>Not published</td></tr>
            <tr><td>Tutor.com</td><td>£22–£31</td><td>Yes</td><td>Low</td></tr>
            <tr><td>Skooli</td><td>~£38 (per-minute)</td><td>Yes</td><td>Not published</td></tr>
            <tr><td>Wyzant</td><td>£19–£46</td><td>No — booked</td><td>75%</td></tr>
            <tr><td>Preply</td><td>£8–£31</td><td>No — booked</td><td>67–82%</td></tr>
            <tr><td>Varsity Tutors</td><td>£50–£73</td><td>Yes</td><td>~30%</td></tr>
          </tbody>
        </table>
      </div>
      <p className="hint">
        Figures gathered August 2026 from each platform&rsquo;s public pricing and from
        published tutor-pay reporting. Full workings are in our{" "}
        <Link href="/research">competitor research</Link>.
      </p>

      <div className="card card-pad-lg" style={{ marginTop: 36 }}>
        <h3>Why we publish what tutors earn</h3>
        <p className="muted tight">
          The best-funded platform in this space bills students around £50 an hour and
          pays tutors around £15. We think that is why so many of their tutors are
          mediocre and why the model keeps collapsing. Our tutors keep{" "}
          {Math.round((1 - TAKE_RATE) * 100)}% — {formatMoney(tutorHourlyPence(15))} an
          hour — and every one of them can see that number before they accept a job.
        </p>
      </div>

      <div className="row" style={{ marginTop: 28 }}>
        <Link href="/pay" className="btn btn-lg">Buy credit</Link>
        <Link href="/faqs" className="btn btn-lg btn-ghost">Read the FAQs</Link>
      </div>
    </div>
  );
}
