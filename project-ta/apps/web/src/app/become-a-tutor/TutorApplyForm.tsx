"use client";

import { useState } from "react";
import { EXAM_BOARDS, LEVELS, SUBJECTS, type ExamBoard, type Level } from "@project-ta/shared";
import { apiFetch } from "@/lib/api";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function TutorApplyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [aLevelResults, setALevelResults] = useState("");
  const [motivation, setMotivation] = useState("");
  const [hasDbs, setHasDbs] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          name, email, university, degree, studyYear,
          subjects, levels, examBoards, aLevelResults, motivation, hasDbs,
        }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card card-pad-lg card-accent">
        <h3>Application received</h3>
        <p>
          Thanks. We screen applications weekly and will email <strong>{email}</strong>{" "}
          either way.
        </p>
        <p className="muted tight">
          If we take it forward, the next step is the enhanced DBS check — we arrange and
          pay for it, and it takes two to eight weeks. You will not be able to see any
          questions until it clears.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-pad-lg">
      {error && <div className="notice notice-danger">{error}</div>}

      <div className="row" style={{ gap: 16 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="an">Full name</label>
          <input id="an" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="ae">Email</label>
          <input id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ gap: 16 }}>
        <div className="field" style={{ flex: 2, minWidth: 220 }}>
          <label htmlFor="au">University</label>
          <input id="au" type="text" value={university}
            onChange={(e) => setUniversity(e.target.value)} placeholder="University of…" />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="ad">Course</label>
          <input id="ad" type="text" value={degree}
            onChange={(e) => setDegree(e.target.value)} placeholder="BSc Mathematics" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor="ay">Year</label>
          <input id="ay" type="text" value={studyYear}
            onChange={(e) => setStudyYear(e.target.value)} placeholder="Year 2" />
        </div>
      </div>

      <div className="field">
        <span className="label">Subjects you want to teach</span>
        <div className="pill-group">
          {SUBJECTS.map((s) => (
            <button key={s.id} type="button" className="pill"
              aria-pressed={subjects.includes(s.id)}
              onClick={() => setSubjects(toggle(subjects, s.id))}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Levels</span>
        <div className="pill-group">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="pill"
              aria-pressed={levels.includes(l)}
              onClick={() => setLevels(toggle(levels, l))}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Exam boards you sat yourself</span>
        <div className="pill-group">
          {EXAM_BOARDS.filter((b) => b !== "Not sure").map((b) => (
            <button key={b} type="button" className="pill"
              aria-pressed={examBoards.includes(b)}
              onClick={() => setExamBoards(toggle(examBoards, b))}>
              {b}
            </button>
          ))}
        </div>
        <p className="hint">
          We route questions to tutors who sat the student&rsquo;s board. It is one of the
          few things nobody else does.
        </p>
      </div>

      <div className="field">
        <label htmlFor="ar">Your A-level results (or equivalent)</label>
        <input id="ar" type="text" value={aLevelResults}
          onChange={(e) => setALevelResults(e.target.value)}
          placeholder="e.g. Maths A*, Further Maths A, Physics A — Edexcel, 2024" />
        <p className="hint">We will ask to see certificates if we take your application forward.</p>
      </div>

      <div className="field">
        <label htmlFor="am">
          Tell us about a time you explained something difficult to someone
        </label>
        <textarea id="am" value={motivation} onChange={(e) => setMotivation(e.target.value)}
          placeholder="What was it, who were you explaining it to, and how did you get them there? This is the part we actually read."
          style={{ minHeight: 130 }} />
        <p className="hint">{motivation.length} characters — at least 40, please.</p>
      </div>

      <label className="checkline">
        <input type="checkbox" checked={hasDbs} onChange={(e) => setHasDbs(e.target.checked)} />
        <span>I already have a current enhanced DBS certificate on the update service</span>
      </label>

      <label className="checkline">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          I have read the safeguarding rules, I understand every session is recorded, and I
          understand I cannot start until an enhanced DBS check clears.
        </span>
      </label>

      <button className="btn btn-lg" onClick={submit} disabled={busy || !agreed}>
        {busy ? "Sending…" : "Send application"}
      </button>
    </div>
  );
}
