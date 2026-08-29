"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ComplaintCategory } from "@project-ta/shared";
import { apiFetch } from "@/lib/api";

const CATEGORIES: { id: ComplaintCategory; label: string; note: string }[] = [
  { id: "safeguarding", label: "Safeguarding concern", note: "Something a tutor or student said or did that worried you. Answered within 24 hours." },
  { id: "tutor-quality", label: "Tutor quality", note: "The teaching was poor, or they just gave the answer." },
  { id: "payment", label: "Payment or refund", note: "You were charged wrongly, or a refund has not arrived." },
  { id: "technical", label: "Technical problem", note: "The app broke, the whiteboard froze, messages did not send." },
  { id: "other", label: "Something else", note: "Anything that does not fit above." },
];

export default function ComplaintForm() {
  const params = useSearchParams();
  const [category, setCategory] = useState<ComplaintCategory>("other");
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ id: string; urgent: boolean; target: string } | null>(null);

  useEffect(() => {
    const c = params.get("category") as ComplaintCategory | null;
    if (c && CATEGORIES.some((x) => x.id === c)) setCategory(c);
    const s = params.get("session");
    if (s) setSessionId(s);
  }, [params]);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) { setName(d.user.name); setEmail(d.user.email); }
      })
      .catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch<{ complaint: { id: string; urgent: boolean }; responseTarget: string }>(
        "/api/complaints",
        {
          method: "POST",
          body: JSON.stringify({ category, detail, sessionId, name, email }),
        },
      );
      setSent({ id: res.complaint.id, urgent: res.complaint.urgent, target: res.responseTarget });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={`card card-pad-lg ${sent.urgent ? "card-accent" : ""}`}>
        <h2>Report received</h2>
        <p>
          Your reference is <code>{sent.id}</code>. We will reply to{" "}
          <strong>{email}</strong> within <strong>{sent.target}</strong>.
        </p>
        {sent.urgent && (
          <div className="notice notice-warn">
            <strong>This is being treated as a safeguarding report.</strong> The tutor
            involved has been suspended from accepting new questions while our Designated
            Safeguarding Lead reads the session transcript. Any credit for the session is
            refunded regardless of the outcome.
          </div>
        )}
        <p className="muted tight">
          If the situation is urgent and a child is at risk, do not wait for us — call
          999, or the NSPCC on 0808 800 5000.
        </p>
      </div>
    );
  }

  const active = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="card card-pad-lg">
      {error && <div className="notice notice-danger">{error}</div>}

      <div className="field">
        <span className="label">What is this about?</span>
        <div className="pill-group">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="pill"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {active && <p className="hint">{active.note}</p>}
      </div>

      {category === "safeguarding" && (
        <div className="notice notice-warn">
          Thank you for telling us. Please include what was said and roughly when. You do
          not need to be certain — we would much rather look at something that turns out
          to be nothing.
        </div>
      )}

      <div className="row" style={{ gap: 16 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="nm">Your name</label>
          <input id="nm" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="em">Email to reply to</label>
          <input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sid">Session reference (optional)</label>
        <input id="sid" type="text" value={sessionId} placeholder="ses_…"
          onChange={(e) => setSessionId(e.target.value)} />
        <p className="hint">If you came here from a session this is filled in for you.</p>
      </div>

      <div className="field">
        <label htmlFor="dt">What happened?</label>
        <textarea id="dt" value={detail} onChange={(e) => setDetail(e.target.value)}
          placeholder="Tell us as much as you can — what was said, when, and what you would like us to do."
          style={{ minHeight: 150 }} />
        <p className="hint">{detail.length}/4000</p>
      </div>

      <button className="btn btn-lg" onClick={submit} disabled={busy || detail.trim().length < 15}>
        {busy ? "Sending…" : "Send report"}
      </button>
    </div>
  );
}
