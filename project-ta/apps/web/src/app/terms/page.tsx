import type { Metadata } from "next";
import Link from "next/link";
import { MATCH_WINDOW_SECONDS, formatMoney, pricePence } from "@project-ta/shared";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <div className="wrap wrap-mid section-tight prose">
      <h1>Terms of use</h1>
      <p className="muted">Last updated: 28 August 2026 · Version 1.0</p>

      <div className="notice notice-warn">
        <strong>Template, not legal advice.</strong> These terms describe how the product
        actually works and are a sensible starting point, but they have not been reviewed
        by a solicitor. Get them checked before you take real money.
      </div>

      <h2>1. Who can use Project TA</h2>
      <ul>
        <li>Students aged 13 or over. If you are under 16 you need a parent or guardian to set up and hold the account with you.</li>
        <li>Tutors must be 18 or over, enrolled at or graduated from a UK university, and must pass an enhanced DBS check with a barred-list check.</li>
        <li>One account per person. Do not share your account.</li>
      </ul>

      <h2>2. What we are</h2>
      <p>
        We are a platform that connects students with independent tutors. Tutors are
        self-employed and are not our employees. We vet them, we monitor sessions, and we
        remove them if they break the rules — but they are responsible for the teaching
        they give.
      </p>

      <h2>3. Credit, payments and refunds</h2>
      <ul>
        <li>You buy credit up front. Credit does not expire and is not transferable.</li>
        <li>A session costs {formatMoney(pricePence(15))} for 15 minutes. Your credit is <strong>held</strong> when you ask, and only spent when a tutor accepts.</li>
        <li>If no tutor accepts within {MATCH_WINDOW_SECONDS / 60} minutes, your credit is returned automatically.</li>
        <li>You can cancel a question for a full refund at any time before a tutor accepts.</li>
        <li>If a session goes wrong, tell us within 7 days via the <Link href="/complaints">complaints page</Link>. We refund the credit while we investigate.</li>
        <li>Unused credit can be refunded to your original payment method within 14 days of purchase. After that it stays as credit.</li>
        <li>Tutors are paid weekly, per session, at the rate shown to them before they accept it.</li>
      </ul>

      <h2>4. Academic honesty</h2>
      <p>
        Tutors will help you understand your work. They will not do it for you. We do not
        allow, and tutors must refuse:
      </p>
      <ul>
        <li>completing coursework, NEAs, EPQs or any assessed work;</li>
        <li>sitting or assisting in an online test or exam;</li>
        <li>writing an essay or a piece of work you will submit as your own.</li>
      </ul>
      <p>
        Asking for this may get your account closed, and we may tell your school or exam
        board if we are required to.
      </p>

      <h2>5. Behaviour</h2>
      <p>You must not:</p>
      <ul>
        <li>share or ask for contact details, or try to move a session off the platform;</li>
        <li>arrange to meet;</li>
        <li>harass, bully, threaten or abuse anyone;</li>
        <li>send sexual, violent or otherwise inappropriate content;</li>
        <li>record, screenshot or share a session in order to expose or embarrass someone;</li>
        <li>pretend to be someone you are not, or use someone else&rsquo;s account.</li>
      </ul>
      <p>
        We record sessions and we act on what we see. Serious breaches result in
        immediate removal and, where a child may be at risk, a referral to the police or
        social services.
      </p>

      <h2>6. Session recording</h2>
      <p>
        By using Project TA you agree that your chat messages and whiteboard drawings are
        recorded and retained, and may be reviewed by our safeguarding team. This is a
        condition of using the service and it cannot be switched off. See the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>7. Availability</h2>
      <p>
        We do not guarantee a tutor will be available at any given moment. Cover is best
        on weekday evenings. If nobody accepts, you are not charged.
      </p>

      <h2>8. Our liability</h2>
      <p>
        We provide the platform with reasonable care and skill. We are not liable for the
        academic outcome of any session, for exam results, or for anything a tutor says
        that turns out to be wrong. Nothing here limits our liability for death or
        personal injury caused by negligence, for fraud, or for anything else that cannot
        be limited by law. If you are a consumer, your statutory rights under the Consumer
        Rights Act 2015 are unaffected.
      </p>

      <h2>9. Closing your account</h2>
      <p>
        You can close your account at any time. We may suspend or close an account that
        breaks these terms, and we will tell you why unless doing so would put a child at
        risk or prejudice an investigation.
      </p>

      <h2>10. Complaints</h2>
      <p>
        Use the <Link href="/complaints">complaints page</Link>. We respond to
        safeguarding reports within 24 hours and everything else within 3 working days.
      </p>

      <h2>11. Law</h2>
      <p>
        These terms are governed by the law of England and Wales, and the courts of
        England and Wales have jurisdiction.
      </p>
    </div>
  );
}
