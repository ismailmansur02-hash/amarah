import type { Metadata } from "next";
import Link from "next/link";
import { TRANSCRIPT_RETENTION_MONTHS } from "@project-ta/shared";

export const metadata: Metadata = {
  title: "Safeguarding",
  description: "How Project TA keeps under-18s safe: enhanced DBS checks, recorded sessions, blocked contact details and a named Designated Safeguarding Lead.",
};

export default function SafeguardingPage() {
  return (
    <div className="wrap wrap-mid section-tight prose">
      <h1>Safeguarding</h1>
      <p className="muted" style={{ fontSize: 18 }}>
        Most of our students are between 15 and 18. Every design decision in this app
        assumed that, and several of them cost us features we would otherwise have liked.
      </p>

      <div className="notice notice-danger">
        <strong>Worried about a child right now?</strong> If a child is in immediate
        danger call <strong>999</strong>. Otherwise contact the NSPCC helpline on{" "}
        <strong>0808 800 5000</strong>, or report it to us at{" "}
        <Link href="/complaints?category=safeguarding">our safeguarding form</Link> —
        we answer safeguarding reports within 24 hours.
      </div>

      <h2>The seven controls</h2>

      <h3>1. Every tutor is enhanced DBS-checked</h3>
      <p>
        An enhanced DBS check with a children&rsquo;s barred-list check, before they can
        see a single question. We pay for it. Private tutoring sits in an awkward gap in
        the Safeguarding Vulnerable Groups Act 2006 — a self-employed tutor is not
        automatically in &ldquo;regulated activity&rdquo; — and some UK platforms use that
        gap to make DBS optional. The NSPCC, the NEU, the Tutors&rsquo; Association and
        the Children&rsquo;s Commissioner for England have all said it should be
        mandatory. We agree, so we made it mandatory for ourselves.
      </p>

      <h3>2. Every session is recorded</h3>
      <p>
        Chat and whiteboard, kept for {TRANSCRIPT_RETENTION_MONTHS} months. Both people
        are told at the start. A student can read their own; a linked parent can read
        their child&rsquo;s; our safeguarding team reads them on report and samples them
        at random.
      </p>

      <h3>3. Contact details are blocked automatically</h3>
      <p>
        Phone numbers, email addresses, social handles, meeting links and off-platform
        payment references are stripped out of messages by a server-side filter. Nobody
        moves a conversation with a child somewhere we cannot see it. This also means
        neither side can be pressured into it.
      </p>

      <h3>4. No video, no camera</h3>
      <p>
        Text and a shared whiteboard only. A 15-year-old should not have to show their
        face or their bedroom to get help with a maths question, and text is far easier
        to review than video if something goes wrong.
      </p>

      <h3>5. Students are pseudonymous to tutors</h3>
      <p>
        A tutor sees a first name and an initial, a year group, a level and an exam
        board. Not a surname, not an email, not a school, not a location.
      </p>

      <h3>6. A report button inside every session</h3>
      <p>
        Not buried in a footer. It is in the session header, next to the timer, for both
        students and tutors, and it works during and after the session.
      </p>

      <h3>7. A named Designated Safeguarding Lead</h3>
      <p>
        A real person with safeguarding training and a monitored inbox, not a shared
        support queue. Safeguarding reports go straight to them and are triaged within
        24 hours.
      </p>

      <h2>What happens when you report something</h2>
      <ol>
        <li><strong>Within 1 hour.</strong> The tutor is suspended from accepting new questions while we look. We do this first and ask questions after.</li>
        <li><strong>Within 24 hours.</strong> The DSL reads the full transcript and contacts you.</li>
        <li><strong>Within 3 working days.</strong> We tell you the outcome, in writing.</li>
        <li><strong>Where a child may be at risk</strong> we refer to the local authority designated officer, the police, or the NSPCC — with or without consent, and we will not delay a referral to get one.</li>
        <li><strong>The session credit is refunded</strong> regardless of the outcome.</li>
      </ol>

      <h2>Rules for tutors</h2>
      <ul>
        <li>Never ask for or give out contact details, and never suggest moving off the platform.</li>
        <li>Never arrange to meet a student.</li>
        <li>Keep every conversation on the subject you were asked about.</li>
        <li>Never ask a student personal questions about their home, their school or their life.</li>
        <li>If a student discloses something worrying, do not investigate — end the session politely and report it immediately.</li>
        <li>Never do a student&rsquo;s coursework or assessed work for them.</li>
      </ul>
      <p>Breaking any of these means removal from the platform, and where relevant a referral.</p>

      <h2>Rules for students</h2>
      <ul>
        <li>Never share your phone number, socials, address or school. The filter will block it, but do not try.</li>
        <li>Never agree to talk to a tutor anywhere other than in the app.</li>
        <li>If anything a tutor says makes you uncomfortable, however small, press <strong>Report</strong>. You will not be in trouble and you will not lose your credit.</li>
      </ul>

      <h2>What we still need to do before launch</h2>
      <p className="muted">
        We would rather say this out loud than pretend the prototype is finished:
      </p>
      <ul>
        <li>Complete a Data Protection Impact Assessment and register with the ICO.</li>
        <li>Complete an Online Safety Act children&rsquo;s risk assessment — an app where users message each other is a user-to-user service with duties under the 2023 Act, and Ofcom and the ICO set out joint expectations on age assurance in March 2026.</li>
        <li>Appoint and train a named DSL, with a deputy.</li>
        <li>Get the DBS process running with a registered umbrella body.</li>
        <li>Have this policy and the privacy policy reviewed by an education-law solicitor.</li>
      </ul>

      <div className="row" style={{ marginTop: 32 }}>
        <Link href="/complaints?category=safeguarding" className="btn btn-lg">Report a concern</Link>
        <Link href="/privacy" className="btn btn-lg btn-ghost">Privacy policy</Link>
      </div>
    </div>
  );
}
