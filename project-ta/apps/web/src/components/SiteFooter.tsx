import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-col">
            <Link href="/" className="logo" style={{ marginBottom: 12 }}>
              <span className="logo-mark">TA</span>
              <span>Project TA</span>
            </Link>
            <p className="muted" style={{ maxWidth: "34ch", fontSize: 14 }}>
              On-demand GCSE and A-level help from DBS-checked undergraduate tutors.
              A real person, in about a minute.
            </p>
            <p className="badge" style={{ marginTop: 4 }}>Every tutor DBS-checked</p>
          </div>

          <div className="footer-col">
            <h5>Students</h5>
            <Link href="/ask">Ask a question</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/tutors">Our tutors</Link>
            <Link href="/pay">Credit &amp; payments</Link>
          </div>

          <div className="footer-col">
            <h5>Tutors</h5>
            <Link href="/become-a-tutor">Become a tutor</Link>
            <Link href="/tutor">Question board</Link>
            <Link href="/tutor/earnings">Earnings</Link>
          </div>

          <div className="footer-col">
            <h5>Safety &amp; legal</h5>
            <Link href="/safeguarding">Safeguarding</Link>
            <Link href="/complaints">Complaints</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/terms">Terms of use</Link>
            <Link href="/faqs">FAQs</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Project TA. A prototype — payments are mocked.</span>
          <span>
            Safeguarding concern?{" "}
            <Link href="/complaints?category=safeguarding">Report it</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
