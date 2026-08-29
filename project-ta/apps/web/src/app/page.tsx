import Link from "next/link";
import { CREDIT_PACKS, formatMoney, pricePence } from "@project-ta/shared";
import JobCardDemo from "@/components/JobCardDemo";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">GCSE &amp; A-level · UK</span>
            <h1>Stuck on a question? Get a real tutor in about a minute.</h1>
            <p className="hero-lede">
              No booking, no scheduled lesson, no waiting until Tuesday. Ask, and a
              DBS-checked undergraduate who sat your exam board picks it up — chat and a
              shared whiteboard, {formatMoney(pricePence(15))} for 15 minutes.
            </p>
            <div className="row">
              <Link href="/ask" className="btn btn-lg">Ask a question</Link>
              <Link href="/how-it-works" className="btn btn-lg btn-ghost">See how it works</Link>
            </div>
            <p className="hint" style={{ marginTop: 18 }}>
              Not matched within 60 seconds? Your credit goes straight back.
            </p>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 10 }}>
              What every tutor sees the second you ask
            </p>
            <JobCardDemo />
            <p className="hint">
              The topic, level and exam board — up front, before they accept.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="wrap grid grid-3">
          <div className="stat">
            <div className="stat-value">~60s</div>
            <div className="stat-label">Typical time to match</div>
          </div>
          <div className="stat">
            <div className="stat-value">{formatMoney(pricePence(15))}</div>
            <div className="stat-label">For 15 minutes</div>
          </div>
          <div className="stat">
            <div className="stat-value">100%</div>
            <div className="stat-label">Tutors DBS-checked</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="center">Why not just ask an AI?</h2>
          <p className="center muted" style={{ maxWidth: "62ch", margin: "0 auto 40px" }}>
            You can, and for &ldquo;what&rsquo;s the answer to Q7&rdquo; you probably should.
            Project TA is for the other thing — when you have read the answer three times and
            still do not get it.
          </p>

          <div className="grid grid-3">
            <div className="card card-hover">
              <h3>We won&rsquo;t just give you the answer</h3>
              <p className="muted tight">
                Every tutor is rated on whether they helped you <em>understand</em> it, not
                whether they solved it fastest. It is the score that decides who gets sent
                questions first.
              </p>
            </div>
            <div className="card card-hover">
              <h3>They sat your exam board</h3>
              <p className="muted tight">
                AQA, Edexcel, OCR and WJEC all differ, and your tutor picked the same one —
                usually within the last two or three years. No other on-demand platform
                routes on exam board.
              </p>
            </div>
            <div className="card card-hover">
              <h3>A human is accountable</h3>
              <p className="muted tight">
                Named, DBS-checked, rated, and reachable if something goes wrong. Every
                session is recorded and reviewable. A chatbot cannot offer you any of that.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap grid grid-2" style={{ gap: 48, alignItems: "center" }}>
          <div>
            <span className="eyebrow">Built for under-18s</span>
            <h2>Safety isn&rsquo;t a policy page here. It&rsquo;s the product.</h2>
            <p className="muted">
              Most of our students are 15 to 18, so we built the app on the assumption that
              a parent will want to check it — and that a regulator might.
            </p>
            <ul className="stack" style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Every tutor is enhanced DBS-checked</strong> before they can see a single question.</li>
              <li><strong>Phone numbers, socials and links are blocked</strong> automatically in chat. Nobody moves the conversation off-platform.</li>
              <li><strong>Every session is recorded</strong> and a linked parent can read the whole transcript.</li>
              <li><strong>A report button inside every session</strong>, answered by a named safeguarding lead within 24 hours.</li>
              <li><strong>Text-first, camera off.</strong> No video means nobody has to show their face or their bedroom.</li>
            </ul>
            <Link href="/safeguarding" className="btn btn-ghost" style={{ marginTop: 12 }}>
              Read our safeguarding approach
            </Link>
          </div>
          <div className="card card-pad-lg">
            <h3>For parents</h3>
            <p className="muted">
              You top up the credit, your child spends it, and you can read every transcript.
              No subscription, nothing that auto-renews, and no way for a tutor to contact
              your child outside the app.
            </p>
            <hr />
            <h4>What a session costs</h4>
            <div className="table-scroll">
              <table>
                <tbody>
                  <tr><td>15 minutes</td><td><strong>{formatMoney(pricePence(15))}</strong></td></tr>
                  <tr><td>30 minutes</td><td><strong>{formatMoney(pricePence(30))}</strong></td></tr>
                </tbody>
              </table>
            </div>
            <Link href="/pricing" className="btn btn-block">See pricing</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap wrap-mid">
          <h2 className="center">How it works</h2>
          <div className="steps" style={{ marginTop: 32 }}>
            <div className="step">
              <span className="step-num" />
              <div>
                <h3>Ask</h3>
                <p className="muted tight">
                  Subject, level, exam board, topic — and a photo of the question if it is
                  easier. Takes about twenty seconds.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num" />
              <div>
                <h3>Every matching tutor gets pinged</h3>
                <p className="muted tight">
                  Only tutors approved for your subject, level and exam board. They see the
                  fee, the topic and the duration before they accept. First to take it wins.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num" />
              <div>
                <h3>Work through it together</h3>
                <p className="muted tight">
                  Chat plus a shared whiteboard you both draw on. Buy more time mid-session
                  if you need it.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num" />
              <div>
                <h3>Keep it</h3>
                <p className="muted tight">
                  The transcript and the whiteboard are saved to your account, so the £6
                  buys you a revision note, not fifteen minutes that vanish.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--line)" }}>
        <div className="wrap">
          <div className="row-between" style={{ marginBottom: 26 }}>
            <div>
              <h2 className="tight">Simple credit, no subscription</h2>
              <p className="muted tight">Buy credit, spend it when you are stuck. It does not expire.</p>
            </div>
            <Link href="/pricing" className="btn btn-ghost">Full pricing</Link>
          </div>
          <div className="grid grid-3">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className={`card card-hover${pack.badge === "Most popular" ? " card-accent" : ""}`}>
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <h3 className="tight">{pack.name}</h3>
                  {pack.badge && <span className="badge">{pack.badge}</span>}
                </div>
                <div className="stat-value" style={{ textAlign: "left", fontSize: 32 }}>
                  {formatMoney(pack.pricePence)}
                </div>
                <p className="muted" style={{ fontSize: 14.5 }}>{pack.blurb}</p>
                <Link href="/pay" className="btn btn-block btn-quiet">Choose</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap wrap-mid center">
          <span className="eyebrow">For undergraduates</span>
          <h2>Tutor between lectures, on your own schedule.</h2>
          <p className="muted" style={{ maxWidth: "58ch", margin: "0 auto 24px" }}>
            Paid per session, no minimum commitment and no scheduled lessons to keep. Go
            online when you have a free half hour; take the questions you fancy.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/become-a-tutor" className="btn btn-lg">Apply to tutor</Link>
            <Link href="/tutor" className="btn btn-lg btn-ghost">See the question board</Link>
          </div>
        </div>
      </section>
    </>
  );
}
