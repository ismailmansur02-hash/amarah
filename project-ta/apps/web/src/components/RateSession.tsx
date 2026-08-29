"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Two questions, and the second one is the important one. Rating tutors on whether
 * the student understood — not on whether they answered fastest — is what stops the
 * platform drifting into being a slower, more expensive answer service.
 */
export default function RateSession({
  sessionId,
  onDone,
}: {
  sessionId: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [understanding, setUnderstanding] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/${sessionId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating, understandingRating: understanding, feedback }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your rating");
      setBusy(false);
    }
  }

  const stars = (value: number, set: (n: number) => void, label: string) => (
    <div className="field">
      <span className="label">{label}</span>
      <div className="pill-group">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="pill"
            aria-pressed={value === n}
            onClick={() => set(n)}
          >
            {"★".repeat(n)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
      <h3>How did that go?</h3>
      {error && <div className="notice notice-danger">{error}</div>}
      {stars(rating, setRating, "Overall, how was your tutor?")}
      {stars(
        understanding,
        setUnderstanding,
        "Did they help you understand it, rather than just giving you the answer?",
      )}
      <div className="field">
        <label htmlFor="fb">Anything else? (optional)</label>
        <textarea
          id="fb"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What worked, what didn't."
          style={{ minHeight: 80 }}
        />
      </div>
      <button className="btn" onClick={submit} disabled={!rating || busy}>
        {busy ? "Saving…" : "Submit rating"}
      </button>
    </div>
  );
}
