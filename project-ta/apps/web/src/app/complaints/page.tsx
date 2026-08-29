import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ComplaintForm from "./ComplaintForm";

export const metadata: Metadata = {
  title: "Complaints & reporting",
  description: "Report a safeguarding concern, a problem with a tutor, a payment issue or a bug. Safeguarding reports answered within 24 hours.",
};

export default function ComplaintsPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <h1>Complaints &amp; reporting</h1>
      <p className="muted" style={{ fontSize: 18, maxWidth: "62ch" }}>
        Tell us what went wrong. Safeguarding concerns are read by our Designated
        Safeguarding Lead and answered within 24 hours; everything else within 3 working
        days.
      </p>

      <div className="notice notice-danger">
        <strong>If a child is in immediate danger, call 999.</strong> For urgent
        non-emergency child protection advice, the NSPCC helpline is 0808 800 5000
        (24 hours). You do not have to use this form first.
      </div>

      <Suspense fallback={<p className="muted pulse">Loading the form…</p>}>
        <ComplaintForm />
      </Suspense>

      <h2 style={{ marginTop: 44 }}>How we handle complaints</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Type</th><th>First response</th><th>Resolved by</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Safeguarding</strong></td>
              <td>1 hour (tutor suspended), 24 hours (DSL contact)</td>
              <td>3 working days, plus any referral</td>
            </tr>
            <tr><td>Tutor quality</td><td>3 working days</td><td>10 working days</td></tr>
            <tr><td>Payment or refund</td><td>3 working days</td><td>10 working days</td></tr>
            <tr><td>Technical</td><td>3 working days</td><td>Varies</td></tr>
          </tbody>
        </table>
      </div>

      <h3>If you are not happy with our answer</h3>
      <ol>
        <li>Reply to us and ask for it to be escalated. A different person reviews it.</li>
        <li>For a data protection complaint, the Information Commissioner&rsquo;s Office: ico.org.uk, 0303 123 1113.</li>
        <li>For a child protection concern you feel we mishandled, the NSPCC on 0808 800 5000, or your local authority designated officer.</li>
        <li>For a payment dispute, your card provider&rsquo;s chargeback process remains available to you.</li>
      </ol>

      <p className="muted" style={{ marginTop: 28 }}>
        See also our <Link href="/safeguarding">safeguarding approach</Link> and{" "}
        <Link href="/terms">terms of use</Link>.
      </p>
    </div>
  );
}
