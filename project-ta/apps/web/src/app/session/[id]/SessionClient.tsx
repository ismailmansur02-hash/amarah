"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  formatMoney,
  subjectById,
  type Role,
  type TutorSession,
} from "@project-ta/shared";
import ChatPanel from "@/components/ChatPanel";
import Whiteboard from "@/components/Whiteboard";
import RateSession from "@/components/RateSession";
import { apiFetch } from "@/lib/api";

interface Party {
  id: string;
  displayName: string;
  avatarColor: string;
  university?: string;
  rating?: number;
  yearGroup?: string;
}

interface Payload {
  session: TutorSession;
  student: Party | null;
  tutor: Party | null;
  me: { id: string; role: Role };
  serverTime: number;
}

function mmss(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Payload>(`/api/sessions/${sessionId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the session");
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Poll the session itself so both sides see an extension or an end promptly.
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function endSession() {
    if (!confirm("End the session now?")) return;
    setBusy(true);
    try { await apiFetch(`/api/sessions/${sessionId}/end`, { method: "POST" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not end the session"); }
    finally { setBusy(false); }
  }

  async function extend(minutes: number) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/${sessionId}/extend`, {
        method: "POST",
        body: JSON.stringify({ minutes }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add time");
    } finally { setBusy(false); }
  }

  if (error && !data) {
    return (
      <div className="wrap wrap-narrow section">
        <div className="notice notice-danger">{error}</div>
        <Link href="/" className="btn btn-ghost">Back to home</Link>
      </div>
    );
  }
  if (!data) return <div className="wrap section"><p className="muted pulse">Loading session…</p></div>;

  const { session, me } = data;
  const isTutor = me.role === "tutor";
  const other = isTutor ? data.student : data.tutor;
  const ended = session.status !== "active";
  const remaining = session.endsAt - now;
  const overdue = remaining <= 0;

  const timerClass = ended || overdue
    ? "timer urgent"
    : remaining < 120_000
      ? "timer warning"
      : "timer";

  return (
    <div className="wrap">
      <div className="row-between" style={{ paddingTop: 16, gap: 14 }}>
        <div>
          <span className="badge badge-neutral">{subjectById(session.subject)?.name ?? session.subject}</span>{" "}
          <h1 style={{ fontSize: 22, margin: "8px 0 2px" }}>{session.topic}</h1>
          <p className="muted tight" style={{ fontSize: 14 }}>
            with {other?.displayName ?? "your tutor"}
            {isTutor
              ? ` · you earn ${formatMoney(session.tutorPayoutPence)}`
              : other?.university
                ? ` · ${other.university}`
                : ""}
          </p>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className={timerClass}>
            {ended ? "Ended" : overdue ? "Time's up" : mmss(remaining)}
          </span>
          {!ended && !isTutor && (
            <>
              <button className="btn btn-sm btn-quiet" onClick={() => extend(15)} disabled={busy}>
                +15 min
              </button>
              <button className="btn btn-sm btn-quiet" onClick={() => extend(30)} disabled={busy}>
                +30 min
              </button>
            </>
          )}
          {!ended && (
            <button className="btn btn-sm btn-ghost" onClick={endSession} disabled={busy}>
              End session
            </button>
          )}
          <Link
            className="btn btn-sm btn-ghost"
            href={`/complaints?category=safeguarding&session=${session.id}`}
            title="Report a problem with this session"
          >
            Report
          </Link>
        </div>
      </div>

      {error && <div className="notice notice-danger" style={{ marginTop: 12 }}>{error}</div>}

      {overdue && !ended && (
        <div className="notice notice-warn" style={{ marginTop: 12 }}>
          <strong>Your paid time is up.</strong> You can keep talking, but add more time
          if you want the tutor to stay — they only get paid for time you have bought.
        </div>
      )}

      <div className="chat-shell">
        <ChatPanel
          sessionId={sessionId}
          myId={me.id}
          disabled={ended}
          otherName={other?.displayName ?? "Tutor"}
          otherColor={other?.avatarColor ?? "#157347"}
        />
        <Whiteboard sessionId={sessionId} disabled={ended} />
      </div>

      {ended && !isTutor && !session.rating && (
        <RateSession sessionId={sessionId} onDone={load} />
      )}

      {ended && (
        <div className="card" style={{ marginBottom: 40 }}>
          <h3>Session finished</h3>
          <p className="muted tight">
            The transcript and whiteboard above stay in your account
            {isTutor ? "." : " — treat them as revision notes you have already paid for."}
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Link href={isTutor ? "/tutor" : "/ask"} className="btn">
              {isTutor ? "Back to the question board" : "Ask another question"}
            </Link>
            {isTutor && <Link href="/tutor/earnings" className="btn btn-ghost">See earnings</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
