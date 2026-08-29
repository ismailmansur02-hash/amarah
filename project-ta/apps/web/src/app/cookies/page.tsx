import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cookie policy" };

export default function CookiesPage() {
  return (
    <div className="wrap wrap-mid section-tight prose">
      <h1>Cookie policy</h1>
      <p className="muted">Last updated: 28 August 2026</p>

      <p style={{ fontSize: 18 }}>
        We use one cookie. It keeps you signed in. That is the entire policy, but here
        are the details.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Name</th><th>Purpose</th><th>Type</th><th>Expires</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>pta_uid</code></td>
              <td>Remembers which account you are signed in as</td>
              <td>Strictly necessary</td>
              <td>30 days</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>What we do not use</h2>
      <ul>
        <li>No advertising cookies.</li>
        <li>No third-party trackers, pixels or social widgets.</li>
        <li>No analytics that identify you personally.</li>
        <li>No cross-site tracking of any kind.</li>
      </ul>
      <p>
        Because the only cookie we set is strictly necessary to provide a service you
        have asked for, we are not required to ask your permission for it under the
        Privacy and Electronic Communications Regulations — which is also why you are not
        looking at a cookie banner right now.
      </p>

      <h2>Turning it off</h2>
      <p>
        You can block cookies in your browser settings. You will not be able to stay
        signed in, so you will not be able to have a session.
      </p>

      <p className="muted">
        More detail in the <Link href="/privacy">privacy policy</Link>.
      </p>
    </div>
  );
}
