import type { Metadata } from "next";
import { formatMoney, tutorHourlyPence, tutorPayoutPence, TAKE_RATE } from "@project-ta/shared";
import TutorApplyForm from "./TutorApplyForm";

export const metadata: Metadata = {
  title: "Become a tutor",
  description: "Tutor GCSE and A-level students between lectures. See what every question pays before you accept it.",
};

export default function BecomeATutorPage() {
  return (
    <>
      <section className="hero">
        <div className="wrap wrap-mid">
          <span className="eyebrow">For UK undergraduates</span>
          <h1>Know what you earn before you say yes.</h1>
          <p className="hero-lede">
            {formatMoney(tutorHourlyPence(15))} an hour, paid per session. No shifts, no
            scheduled lessons, no minimum hours. Go online between lectures, take the
            questions you fancy, ignore the rest.
          </p>
        </div>
      </section>

      <div className="wrap wrap-mid section-tight">
        <div className="grid grid-3" style={{ marginBottom: 36 }}>
          <div className="card stat">
            <div className="stat-value">{formatMoney(tutorPayoutPence(15))}</div>
            <div className="stat-label">Per 15-minute session</div>
          </div>
          <div className="card stat">
            <div className="stat-value">{Math.round((1 - TAKE_RATE) * 100)}%</div>
            <div className="stat-label">Of what the student pays</div>
          </div>
          <div className="card stat">
            <div className="stat-value">0</div>
            <div className="stat-label">Hours you must commit</div>
          </div>
        </div>

        <h2>What you need</h2>
        <ul className="stack" style={{ paddingLeft: 20 }}>
          <li><strong>To be at a UK university</strong> (or a recent graduate), 18 or over.</li>
          <li><strong>Strong results in what you want to teach</strong> — normally an A or A* at A-level in the subject, and we will ask to see it.</li>
          <li><strong>An enhanced DBS check.</strong> We pay for it and we arrange it. It takes two to eight weeks, and you cannot see a single question until it clears. There are no exceptions to this and we will not rush it.</li>
          <li><strong>To be the kind of person who explains things.</strong> We rate tutors on whether the student understood, not on how fast they produced an answer, and that score decides who gets sent questions first.</li>
        </ul>

        <h2>How it works once you are in</h2>
        <div className="steps" style={{ marginTop: 20 }}>
          <div className="step">
            <span className="step-num" />
            <div>
              <h3>Go online when you are free</h3>
              <p className="muted tight">A toggle, not a rota. Evenings between 7pm and 10pm are busiest.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num" />
            <div>
              <h3>Questions arrive with the fee on them</h3>
              <p className="muted tight">
                Your share, the topic, the level, the exam board and the length — all on
                the notification, before you commit to anything.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num" />
            <div>
              <h3>Accept the ones you want</h3>
              <p className="muted tight">First to accept gets it. No penalty for skipping.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num" />
            <div>
              <h3>Paid weekly</h3>
              <p className="muted tight">Straight to your bank account. No invoicing.</p>
            </div>
          </div>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: 32 }}>
          <h3>The rules, plainly</h3>
          <p className="muted tight">
            Our students are mostly under 18. Never ask for or give contact details, never
            suggest talking somewhere else, never arrange to meet, and never do a
            student&rsquo;s assessed work. Every session is recorded. If a student says
            something that worries you, end the session politely and report it — do not
            try to handle it yourself. Breaking these means removal, and where relevant a
            referral.
          </p>
        </div>

        <h2 style={{ marginTop: 44 }}>Tutor FAQs</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          <details className="faq">
            <summary>Why do you show the fee up front?</summary>
            <div className="faq-body">
              <p>
                Because you should know what a job pays before you commit to it, and
                because platforms that hide it are usually hiding something bad. One
                well-funded on-demand tutoring service paid around £8 an hour and went
                out of business; another bills students £51&ndash;75 an hour and pays
                tutors £9&ndash;16. We would rather publish our number.
              </p>
            </div>
          </details>
          <details className="faq">
            <summary>Do I need a DBS check?</summary>
            <div className="faq-body">
              <p>
                Yes, an enhanced one with a barred-list check, and we pay for it. It
                takes two to eight weeks. You cannot see any questions until it clears
                — no exceptions.
              </p>
            </div>
          </details>
          <details className="faq">
            <summary>Is there a minimum commitment?</summary>
            <div className="faq-body">
              <p>
                None. Go online when you are free, accept what you fancy, ignore the
                rest. No shifts, no scheduled lessons, no penalty for being unavailable.
              </p>
            </div>
          </details>
          <details className="faq">
            <summary>What is the understanding score?</summary>
            <div className="faq-body">
              <p>
                After every session the student is asked whether their tutor helped
                them understand the topic, separately from an overall star rating.
                That score is weighted heavily in who gets sent questions first. It is
                the metric the whole platform is built around.
              </p>
            </div>
          </details>
          <details className="faq">
            <summary>When do I get paid?</summary>
            <div className="faq-body">
              <p>
                Weekly, to your bank account. In this prototype the earnings are
                calculated but no money moves.
              </p>
            </div>
          </details>
        </div>

        <h2 style={{ marginTop: 44 }}>Apply</h2>
        <TutorApplyForm />
      </div>
    </>
  );
}
