import type { Metadata } from "next";
import Link from "next/link";
import {
  MATCH_WINDOW_SECONDS,
  REFUND_PROMISE_SECONDS,
  TRANSCRIPT_RETENTION_MONTHS,
  formatMoney,
  pricePence,
} from "@project-ta/shared";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Common questions about Project TA — pricing, safety, DBS checks, refunds, tutors and how matching works.",
};

interface QA { q: string; a: React.ReactNode }

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: "The basics",
    items: [
      {
        q: "What actually is Project TA?",
        a: <>On-demand tutoring. You post a question, every qualified tutor gets notified, and the first one to accept works through it with you in chat and on a shared whiteboard. No booking, no scheduled lesson, no commitment.</>,
      },
      {
        q: "How long does it take to get a tutor?",
        a: <>Usually under a minute on a weekday evening. If nobody accepts in {REFUND_PROMISE_SECONDS} seconds we say so, and if the question is still unclaimed after {MATCH_WINDOW_SECONDS / 60} minutes your credit is refunded automatically. Cover is thinnest very late at night.</>,
      },
      {
        q: "What subjects do you cover?",
        a: <>Maths, Physics, Chemistry and Biology, at GCSE and A-level. We would rather be genuinely good at four subjects than thin across twenty. More will follow once cover in these is reliable.</>,
      },
      {
        q: "Do I need to book?",
        a: <>No. That is the entire point. If you want a regular weekly lesson with the same tutor, a platform like MyTutor or Sherpa does that better than we do — we are for the moment you are stuck.</>,
      },
      {
        q: "Can I choose my tutor?",
        a: <>Not for the first session — whoever is qualified and fastest takes it. You can browse <Link href="/tutors">tutor profiles</Link> to see who is on the platform, and after a good session you can ask for that tutor again.</>,
      },
    ],
  },
  {
    title: "Money",
    items: [
      {
        q: "How much does it cost?",
        a: <>{formatMoney(pricePence(15))} for 15 minutes, {formatMoney(pricePence(30))} for 30. That is {formatMoney(Math.round((pricePence(15) / 15) * 60))} an hour — cheaper than every UK platform we compared ourselves to. Credit packs bring it down further. Full detail on the <Link href="/pricing">pricing page</Link>.</>,
      },
      {
        q: "Is there a subscription?",
        a: <>No. Nothing auto-renews and there is nothing to cancel. You buy credit and spend it when you need it.</>,
      },
      {
        q: "What if no tutor takes my question?",
        a: <>Your credit goes straight back to your balance, automatically. You never pay for a question nobody answered.</>,
      },
      {
        q: "What if the session was bad?",
        a: <>Tell us within 7 days on the <Link href="/complaints">complaints page</Link> and we refund the credit while we look into it. We can read the transcript, so it is usually a quick decision.</>,
      },
      {
        q: "Does credit expire?",
        a: <>No. It is yours until you spend it. You can get unused credit refunded to your card within 14 days of buying it.</>,
      },
      {
        q: "Can a parent pay?",
        a: <>Yes, and we would prefer it. A parent account holds the payment method and tops up credit; the student spends it. Under-16 accounts must be linked to a parent or guardian.</>,
      },
    ],
  },
  {
    title: "Safety",
    items: [
      {
        q: "Who are the tutors?",
        a: <>Undergraduates at UK universities, most of whom sat these exams within the last three years. Every one has an enhanced DBS check with a barred-list check before they can see a single question.</>,
      },
      {
        q: "Are sessions recorded?",
        a: <>Yes — always, and it cannot be turned off. Chat and whiteboard are kept for {TRANSCRIPT_RETENTION_MONTHS} months. You can read your own; a linked parent can read their child&rsquo;s; our safeguarding team reads them on report and samples at random. Details in the <Link href="/privacy">privacy policy</Link>.</>,
      },
      {
        q: "Is there video?",
        a: <>No, deliberately. Text and a whiteboard only. Nobody should have to show their face or their bedroom to ask about integration by parts, and text is far easier to review if something goes wrong.</>,
      },
      {
        q: "Can a tutor contact me outside the app?",
        a: <>No. Phone numbers, emails, social handles and links are stripped out of messages automatically before they are delivered. If anyone tries, press <strong>Report</strong> — it is in the session header.</>,
      },
      {
        q: "What does the tutor see about me?",
        a: <>Your first name and initial, your year group, your level, your exam board and your question. Not your surname, email, school or location.</>,
      },
      {
        q: "Something happened. What do I do?",
        a: <>Press <strong>Report</strong> in the session, or use the <Link href="/complaints?category=safeguarding">safeguarding form</Link>. The tutor is suspended within an hour while we read the transcript, and our Designated Safeguarding Lead contacts you within 24 hours. You will not be in trouble and you will not lose your credit. If a child is in immediate danger, call 999.</>,
      },
    ],
  },
  {
    title: "About this prototype",
    items: [
      {
        q: "Is this the real thing?",
        a: <>Not yet. This is a working prototype: the matching, chat, whiteboard, timer, safeguarding filter and refund logic are all real code. Payments are mocked — no card is charged, and no card details are collected or stored anywhere.</>,
      },
      {
        q: "How do I try it properly?",
        a: <>Open <Link href="/login">the sign-in page</Link> in two browser windows. Sign in as a student in one and a tutor in the other, ask a question, and watch it appear on the tutor&rsquo;s board with the fee on it. Accept, and both windows land in the same session.</>,
      },
      {
        q: "Where is the competitor research?",
        a: <>On the <Link href="/research">research page</Link> — a full write-up of the on-demand tutoring market, what the competitors do, what they charge, which ones died and why.</>,
      },
    ],
  },
];

export default function FaqsPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <h1>Frequently asked questions</h1>
      <p className="muted" style={{ fontSize: 18 }}>
        If your question is not here, the <Link href="/complaints">complaints and
        contact page</Link> reaches a real person. Thinking about tutoring with us? See
        the <Link href="/become-a-tutor">tutor page</Link> for pay, requirements and
        how it works.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} style={{ marginTop: 38 }}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <details key={item.q} className="faq">
              <summary>{item.q}</summary>
              <div className="faq-body"><p>{item.a}</p></div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
