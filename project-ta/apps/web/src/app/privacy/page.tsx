import type { Metadata } from "next";
import Link from "next/link";
import { TRANSCRIPT_RETENTION_MONTHS } from "@project-ta/shared";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Project TA collects, uses and protects your personal data, including children's data under UK GDPR and the ICO Children's Code.",
};

export default function PrivacyPage() {
  return (
    <div className="wrap wrap-mid section-tight prose">
      <h1>Privacy policy</h1>
      <p className="muted">Last updated: 28 August 2026 · Version 1.0</p>

      <div className="notice notice-warn">
        <strong>Template, not legal advice.</strong> This policy is written to reflect
        how the product actually behaves, and it is structured around UK GDPR, the ICO
        Age Appropriate Design Code and the Online Safety Act 2023. It has not been
        reviewed by a solicitor. Have it checked, and complete a Data Protection Impact
        Assessment, before you process a single real child&rsquo;s data.
      </div>

      <h2>1. Who we are</h2>
      <p>
        Project TA (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides on-demand tutoring to
        students in the United Kingdom. We are the <strong>data controller</strong> for
        the personal data described here.
      </p>
      <ul>
        <li><strong>Data protection contact:</strong> privacy@projectta.example</li>
        <li><strong>Designated Safeguarding Lead:</strong> safeguarding@projectta.example</li>
        <li><strong>ICO registration:</strong> to be completed before launch</li>
      </ul>

      <h2>2. Our approach to children&rsquo;s data</h2>
      <p>
        Most of our students are under 18. We designed this service on the assumption
        that a child will use it, which under the ICO&rsquo;s Children&rsquo;s Code means:
      </p>
      <ul>
        <li><strong>High privacy by default.</strong> Nothing is public. Profiles are not indexed or searchable outside the app.</li>
        <li><strong>Data minimisation.</strong> We do not ask for a home address, a school name, a date of birth beyond an age band, or a phone number.</li>
        <li><strong>No profiling for advertising.</strong> We do not run ads, we do not sell data, and we do not build advertising profiles. Ever.</li>
        <li><strong>No nudge techniques.</strong> No streaks, no guilt notifications, nothing designed to make a child spend more than they meant to.</li>
        <li><strong>Age assurance proportionate to risk.</strong> Students declare an age band at sign-up; under-16 accounts require a linked parent or guardian who provides consent and holds the payment method.</li>
        <li><strong>A Data Protection Impact Assessment</strong> is completed and reviewed annually, as the Children&rsquo;s Code requires.</li>
      </ul>

      <h2>3. What we collect</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Data</th><th>Why</th><th>Lawful basis</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Name, email, age band, year group, exam board</td>
              <td>To run your account and match you to the right tutor</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Parent/guardian name and email (under-16 accounts)</td>
              <td>Consent, payment and transcript access</td>
              <td>Consent / legal obligation</td>
            </tr>
            <tr>
              <td>Your questions, chat messages and whiteboard drawings</td>
              <td>To deliver the session, and to keep a safeguarding record</td>
              <td>Contract / legitimate interests (child safety)</td>
            </tr>
            <tr>
              <td>Photos of questions you upload</td>
              <td>So your tutor can see the problem</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Credit balance and transaction history</td>
              <td>Billing and refunds</td>
              <td>Contract / legal obligation</td>
            </tr>
            <tr>
              <td>Tutor DBS certificate number and status, university and results</td>
              <td>Vetting tutors who work unsupervised with under-18s</td>
              <td>Legal obligation / substantial public interest (safeguarding)</td>
            </tr>
            <tr>
              <td>Device and log data (IP, browser, timestamps)</td>
              <td>Security, fraud and abuse prevention</td>
              <td>Legitimate interests</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>We do not collect card details.</strong> Payments in the live service are
        handled by our payment provider; card numbers never reach our servers. In this
        prototype no payment data is collected at all.
      </p>

      <h2>4. Session recording — please read this bit</h2>
      <p>
        <strong>Every chat message and every whiteboard drawing in a session is
        recorded and kept.</strong> This is not optional and it is not something you can
        turn off. It exists because adults and children are talking to each other, and a
        record is the single most effective safeguarding control we have.
      </p>
      <ul>
        <li>Both people are told at the start of every session that it is recorded.</li>
        <li>A student can read their own transcripts at any time.</li>
        <li>A linked parent or guardian can read their child&rsquo;s transcripts.</li>
        <li>Our safeguarding team reads transcripts when a report is made, and samples sessions at random for quality and safety.</li>
        <li>Transcripts are retained for <strong>{TRANSCRIPT_RETENTION_MONTHS} months</strong>, then deleted, unless they form part of an open safeguarding case.</li>
      </ul>

      <h2>5. The message filter</h2>
      <p>
        Chat messages are automatically scanned before they are delivered, and phone
        numbers, email addresses, social handles, links and off-platform payment
        references are removed. This is done to stop anyone moving a conversation with a
        child off a monitored platform. It runs on our servers, and it can occasionally
        redact something innocent — if it does, rephrase and send again.
      </p>

      <h2>6. Who we share data with</h2>
      <ul>
        <li><strong>Your tutor</strong> sees your first name and initial, year group, level, exam board and your question. They do not see your surname, email, or anything else.</li>
        <li><strong>Your parent or guardian</strong>, if your account is linked to one, can see your sessions and transcripts.</li>
        <li><strong>Our processors</strong> — hosting, payment processing, email delivery, DBS checking — under written contracts, and only what they need.</li>
        <li><strong>The police, the NSPCC, a local authority designated officer or a child&rsquo;s school</strong>, where we believe a child is at risk of harm. We will do this without your consent and, where it is safe and appropriate, without telling the person concerned first.</li>
      </ul>
      <p>We do not sell personal data, and we never will.</p>

      <h2>7. How long we keep things</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Data</th><th>Kept for</th></tr></thead>
          <tbody>
            <tr><td>Account details</td><td>While your account is open, then 12 months</td></tr>
            <tr><td>Session transcripts and whiteboards</td><td>{TRANSCRIPT_RETENTION_MONTHS} months</td></tr>
            <tr><td>Uploaded question photos</td><td>12 months</td></tr>
            <tr><td>Payment and transaction records</td><td>6 years (UK tax law)</td></tr>
            <tr><td>Safeguarding records</td><td>Up to 25 years, per statutory safeguarding guidance</td></tr>
            <tr><td>Complaints</td><td>3 years</td></tr>
          </tbody>
        </table>
      </div>

      <h2>8. Your rights</h2>
      <p>Under UK GDPR you can ask us to:</p>
      <ul>
        <li>give you a copy of your data (a subject access request);</li>
        <li>correct anything that is wrong;</li>
        <li>delete your data, where we are not required to keep it;</li>
        <li>restrict or object to how we use it;</li>
        <li>port it to another service.</li>
      </ul>
      <p>
        <strong>Children have these rights too, and can exercise them themselves.</strong>{" "}
        Email privacy@projectta.example and we will respond within one month. If you are
        unhappy with our response you can complain to the Information Commissioner&rsquo;s
        Office at ico.org.uk or on 0303 123 1113.
      </p>
      <p>
        We cannot delete a session transcript on request while it is within the
        safeguarding retention period, because keeping it is how we protect other
        children. We will tell you plainly if this applies to you.
      </p>

      <h2>9. Security</h2>
      <ul>
        <li>Everything is served over HTTPS.</li>
        <li>Access to transcripts is limited to the people in the session, a linked guardian, and named safeguarding staff.</li>
        <li>Staff access to personal data is logged.</li>
        <li>We will notify the ICO within 72 hours of any breach that meets the threshold, and tell you directly if it is likely to affect you.</li>
      </ul>

      <h2>10. Where your data lives</h2>
      <p>
        Data is stored in the UK or the EEA. Where a processor is outside that area, we
        rely on UK adequacy regulations or the International Data Transfer Addendum.
      </p>

      <h2>11. Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in. No advertising or analytics
        cookies. See the <Link href="/cookies">cookie policy</Link>.
      </p>

      <h2>12. Changes</h2>
      <p>
        If we change this policy in a way that materially affects you, we will tell you
        in the app and by email before it takes effect — and we will explain it in
        language a 13-year-old can follow, not just in the formal text above.
      </p>

      <hr />
      <p className="muted">
        Questions? <Link href="/complaints">Contact us</Link> or email
        privacy@projectta.example.
      </p>
    </div>
  );
}
