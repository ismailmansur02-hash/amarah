"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TAKE_RATE,
  formatMoney,
  subjectById,
  tutorHourlyPence,
  type TutorSession,
} from "@project-ta/shared";

interface Row extends TutorSession {
  studentName: string;
}

interface Payload {
  sessions: Row[];
  earnedPence: number;
  minutes: number;
}

export default function EarningsClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tutor/sessions", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load earnings");
        return d as Payload;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <>
        <h1>Earnings</h1>
        <div className="notice notice-brand">
          {error} — <Link href="/login">sign in as a tutor</Link> to see this page.
        </div>
      </>
    );
  }
  if (!data) return <p className="muted pulse">Loading…</p>;

  const completed = data.sessions.filter((s) => s.status === "completed");

  return (
    <>
      <h1>Earnings</h1>
      <p className="muted">
        Paid per session, not per month. In the live product this is a weekly Stripe
        Connect payout; in this prototype the numbers are real but the money is not.
      </p>

      <div className="grid grid-3" style={{ margin: "24px 0 32px" }}>
        <div className="card stat">
          <div className="stat-value">{formatMoney(data.earnedPence)}</div>
          <div className="stat-label">Earned</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{completed.length}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{formatMoney(tutorHourlyPence(15))}</div>
          <div className="stat-label">Effective hourly</div>
        </div>
      </div>

      {completed.length === 0 ? (
        <div className="card card-pad-lg center">
          <h3>No completed sessions yet</h3>
          <p className="muted">Accept a question from the board and it will show up here.</p>
          <Link href="/tutor" className="btn">Go to the question board</Link>
        </div>
      ) : (
        <div className="card card-flat" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Student</th>
                  <th>Length</th>
                  <th>Rating</th>
                  <th style={{ textAlign: "right" }}>You earned</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.topic}</strong>
                      <div className="faint" style={{ fontSize: 13 }}>
                        {subjectById(s.subject)?.name ?? s.subject}
                      </div>
                    </td>
                    <td>{s.studentName}</td>
                    <td>{Math.round((s.endsAt - s.startedAt) / 60_000)} min</td>
                    <td>{s.rating ? "★".repeat(s.rating) : <span className="faint">—</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{formatMoney(s.tutorPayoutPence)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 28 }}>
        <h3>How the split works</h3>
        <p className="muted tight">
          You keep <strong>{Math.round((1 - TAKE_RATE) * 100)}%</strong> of what the
          student pays. The remaining {Math.round(TAKE_RATE * 100)}% covers card
          processing, DBS checks, safeguarding review and running the platform. It does
          not change with volume, it is not tiered, and it is the same number on every
          session — which is more than most platforms will tell you.
        </p>
      </div>
    </>
  );
}
