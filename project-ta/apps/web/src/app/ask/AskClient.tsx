"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DURATION_OPTIONS,
  EXAM_BOARDS,
  LEVELS,
  SUBJECTS,
  formatMoney,
  pricePence,
  topicsFor,
  type ExamBoard,
  type HelpRequest,
  type Level,
  type User,
  type Wallet,
} from "@project-ta/shared";
import { apiFetch } from "@/lib/api";

export default function AskClient() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: User | null; wallet: Wallet | null } | null>(null);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<Level>("A-level");
  const [examBoard, setExamBoard] = useState<ExamBoard>("AQA");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [duration, setDuration] = useState<number>(15);
  const [photo, setPhoto] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMe(d);
        if (d.user?.level) setLevel(d.user.level);
        if (d.user?.examBoards?.[0]) setExamBoard(d.user.examBoards[0]);
      })
      .catch(() => setMe({ user: null, wallet: null }));
  }, []);

  const finalTopic = topic === "__other" ? customTopic.trim() : topic;
  const price = pricePence(duration);
  const balance = me?.wallet?.balancePence ?? 0;
  const canAfford = balance >= price;
  const ready = Boolean(subject && finalTopic && detail.trim().length >= 10);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const { request } = await apiFetch<{ request: HelpRequest }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          subject, topic: finalTopic, level, examBoard,
          detail, durationMins: duration, photo: photo || undefined,
        }),
      });
      router.push(`/waiting/${request.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3_000_000) {
      setError("That photo is a bit big — try one under 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (me === null) return <p className="muted pulse">Loading…</p>;

  if (!me.user) {
    return (
      <>
        <h1>Ask a question</h1>
        <div className="notice notice-brand">
          You need an account first. This is a prototype, so pick one of the demo
          students on the <Link href="/login">sign-in page</Link>.
        </div>
      </>
    );
  }

  if (me.user.role === "tutor") {
    return (
      <>
        <h1>You&rsquo;re signed in as a tutor</h1>
        <p className="muted">
          Head to the <Link href="/tutor">question board</Link> to pick up work, or{" "}
          <Link href="/login">switch to a student account</Link> to try asking.
        </p>
      </>
    );
  }

  const topics = subject ? topicsFor(subject, level) : [];

  return (
    <>
      <h1>What are you stuck on?</h1>
      <p className="muted">
        The more specific you are, the faster the right tutor picks it up.
      </p>

      {error && <div className="notice notice-danger">{error}</div>}

      <div className="card card-pad-lg stack">
        <div>
          <span className="label">1. Subject</span>
          <div className="pill-group">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="pill"
                aria-pressed={subject === s.id}
                onClick={() => { setSubject(s.id); setTopic(""); }}
              >
                <span aria-hidden="true" style={{ marginRight: 6 }}>{s.icon}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">2. Level</span>
          <div className="pill-group">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="pill"
                aria-pressed={level === l}
                onClick={() => { setLevel(l); setTopic(""); }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">3. Exam board</span>
          <div className="pill-group">
            {EXAM_BOARDS.map((b) => (
              <button
                key={b}
                type="button"
                className="pill"
                aria-pressed={examBoard === b}
                onClick={() => setExamBoard(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="hint">
            We send your question to tutors who sat this board themselves. Pick
            &ldquo;Not sure&rdquo; and we&rsquo;ll widen the search.
          </p>
        </div>

        {subject && (
          <div className="field">
            <label htmlFor="topic">4. Topic</label>
            <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Choose a topic…</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="__other">Something else…</option>
            </select>
            {topic === "__other" && (
              <input
                type="text"
                placeholder="What's the topic?"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                style={{ marginTop: 10 }}
              />
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="detail">5. What exactly is confusing you?</label>
          <textarea
            id="detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="e.g. I can do the first bit but I don't understand why the sign flips when you take the log of both sides."
            maxLength={1200}
          />
          <p className="hint">
            Tutors see this before they accept, so a real sentence gets you a much
            faster match than &ldquo;help&rdquo;. {detail.length}/1200
          </p>
        </div>

        <div className="field">
          <label htmlFor="photo">6. Photo of the question (optional)</label>
          <input id="photo" type="file" accept="image/*" onChange={onPhoto} />
          {photo && (
            <div style={{ marginTop: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="The question you photographed"
                style={{ maxWidth: 260, borderRadius: 10, border: "1px solid var(--line)" }}
              />
              <button
                className="btn btn-sm btn-quiet"
                style={{ marginLeft: 12 }}
                onClick={() => setPhoto("")}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="label">7. How long do you need?</span>
          <div className="pill-group">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className="pill"
                aria-pressed={duration === d}
                onClick={() => setDuration(d)}
              >
                {d} min · {formatMoney(pricePence(d))}
              </button>
            ))}
          </div>
          <p className="hint">You can buy more time mid-session if you need it.</p>
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: 20 }}>
        <div className="row-between">
          <div>
            <h3 className="tight">{formatMoney(price)} for {duration} minutes</h3>
            <p className="muted tight" style={{ fontSize: 14.5 }}>
              Your credit: <strong>{formatMoney(balance)}</strong>
              {!canAfford && " — not enough for this session"}
            </p>
          </div>
          {canAfford ? (
            <button className="btn btn-lg" onClick={submit} disabled={!ready || busy}>
              {busy ? "Sending to tutors…" : "Ask now"}
            </button>
          ) : (
            <Link href="/pay" className="btn btn-lg">Top up credit</Link>
          )}
        </div>
        <hr />
        <p className="muted tight" style={{ fontSize: 14 }}>
          Your credit is held, not spent, until a tutor accepts. If nobody picks it
          up within 60 seconds it goes straight back to your balance.
        </p>
      </div>
    </>
  );
}
