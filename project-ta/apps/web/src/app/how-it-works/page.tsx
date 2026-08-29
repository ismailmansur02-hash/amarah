import type { Metadata } from "next";
import Link from "next/link";
import { MATCH_WINDOW_SECONDS, REFUND_PROMISE_SECONDS, TAKE_RATE, formatMoney, pricePence, tutorHourlyPence, tutorPayoutPence } from "@project-ta/shared";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="wrap wrap-mid section-tight prose">
      <h1>How it works</h1>
      <p className="muted" style={{ fontSize: 18 }}>
        Project TA is deliberately not a booking site. There is no calendar, no
        scheduled lesson and nobody to interview. You ask, and someone qualified picks
        it up.
      </p>

      <h2>For students</h2>
      <ol>
        <li>
          <strong>Ask.</strong> Pick your subject, level, exam board and topic, then say
          what is actually confusing you. Photograph the question if that is quicker.
        </li>
        <li>
          <strong>We notify every matching tutor at once.</strong> Only tutors approved
          for your subject and level, ranked so the ones who sat your exam board and are
          online right now hear first.
        </li>
        <li>
          <strong>First to accept takes it.</strong> Usually inside a minute. If nobody
          accepts within {REFUND_PROMISE_SECONDS} seconds we tell you, and if the
          question is still unclaimed after {MATCH_WINDOW_SECONDS / 60} minutes your
          credit is refunded automatically.
        </li>
        <li>
          <strong>Work through it.</strong> Chat plus a whiteboard you both draw on.
          Add {formatMoney(pricePence(15))} of time whenever you want.
        </li>
        <li>
          <strong>Keep the notes.</strong> Transcript and whiteboard are saved to your
          account.
        </li>
      </ol>

      <h2>For tutors</h2>
      <ol>
        <li>
          <strong>Apply.</strong> You need to be at a UK university and able to show
          results in what you want to teach.
        </li>
        <li>
          <strong>Get DBS-checked.</strong> Enhanced DBS with a barred-list check. It
          takes two to eight weeks and we pay for it. You cannot see a single question
          until it clears.
        </li>
        <li>
          <strong>Go online when you are free.</strong> No shifts, no minimum hours,
          nothing scheduled.
        </li>
        <li>
          <strong>See what a question pays before you take it.</strong> The fee, the
          topic and the length are on the notification. Accept the ones you want.
        </li>
        <li>
          <strong>Get paid weekly.</strong> {formatMoney(tutorPayoutPence(15))} for a
          15-minute session — {formatMoney(tutorHourlyPence(15))} an hour.
        </li>
      </ol>

      <h2>Where the money goes</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>On a {formatMoney(pricePence(15))} 15-minute session</th><th style={{ textAlign: "right" }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Student pays</td><td style={{ textAlign: "right" }}>{formatMoney(pricePence(15))}</td></tr>
            <tr><td>Tutor receives</td><td style={{ textAlign: "right" }}><strong>{formatMoney(tutorPayoutPence(15))}</strong></td></tr>
            <tr><td>Project TA keeps ({Math.round(TAKE_RATE * 100)}%)</td><td style={{ textAlign: "right" }}>{formatMoney(pricePence(15) - tutorPayoutPence(15))}</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Our share covers card processing, DBS checks, safeguarding review, support and
        running the platform. It is the same {Math.round(TAKE_RATE * 100)}% on every
        session — it does not go up when you get busy, and we publish it because most
        platforms will not.
      </p>

      <h2>What we deliberately do not do</h2>
      <ul>
        <li>
          <strong>Video.</strong> Text and a whiteboard only. Nobody has to show their
          face or their bedroom, and a text transcript is far easier to review if
          something goes wrong.
        </li>
        <li>
          <strong>Scheduled lessons.</strong> Other platforms do weekly tutoring well.
          We do the 9pm-the-night-before-the-mock problem.
        </li>
        <li>
          <strong>Just giving you the answer.</strong> Tutors are rated on whether you
          understood it. That score decides who gets sent questions first.
        </li>
        <li>
          <strong>Contact outside the app.</strong> Phone numbers, socials and links are
          blocked in chat. It is a safeguarding rule, not a commercial one.
        </li>
      </ul>

      <div className="row" style={{ marginTop: 32 }}>
        <Link href="/ask" className="btn btn-lg">Ask a question</Link>
        <Link href="/become-a-tutor" className="btn btn-lg btn-ghost">Apply to tutor</Link>
      </div>
    </div>
  );
}
