"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  REFUND_PROMISE_SECONDS,
  formatMoney,
  subjectById,
  type HelpRequest,
  type User,
} from "@project-ta/shared";
import Avatar from "@/components/Avatar";
import { apiFetch } from "@/lib/api";

interface Payload {
  request: HelpRequest;
  tutor: User | null;
  serverTime: number;
}

export default function WaitingClient({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const d = await apiFetch<Payload>(`/api/requests/${requestId}`);
      setData(d);
      if (d.request.sessionId && d.request.status === "active") {
        router.push(`/session/${d.request.sessionId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lost connection");
    }
  }, [requestId, router]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.round((Date.now() - startedRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  async function cancel() {
    try {
      await apiFetch(`/api/requests/${requestId}/cancel`, { method: "POST" });
      router.push("/ask");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    }
  }

  if (error && !data) return <div className="notice notice-danger">{error}</div>;
  if (!data) return <p className="muted pulse">Loading…</p>;

  const { request } = data;
  const subject = subjectById(request.subject)?.name ?? request.subject;

  if (request.status === "expired" || request.status === "cancelled") {
    return (
      <>
        <h1>{request.status === "expired" ? "Nobody was free" : "Cancelled"}</h1>
        <div className="notice notice-brand">
          <strong>{formatMoney(request.pricePence)} has gone back to your balance.</strong>{" "}
          You are never charged for a question a tutor did not pick up.
        </div>
        <p className="muted">
          Tutor cover is thinnest late at night and best between 7pm and 10pm on weekdays.
        </p>
        <div className="row">
          <Link href="/ask" className="btn">Try again</Link>
          <Link href="/tutors" className="btn btn-ghost">Browse tutors</Link>
        </div>
      </>
    );
  }

  if (request.status === "active" || request.status === "completed") {
    return (
      <>
        <h1>Matched</h1>
        {data.tutor && (
          <div className="card row" style={{ gap: 16 }}>
            <Avatar name={data.tutor.name} color={data.tutor.avatarColor} size="lg" />
            <div>
              <h3 className="tight">{data.tutor.displayName}</h3>
              <p className="muted tight">{data.tutor.degree} · {data.tutor.university}</p>
            </div>
          </div>
        )}
        {request.sessionId && (
          <Link href={`/session/${request.sessionId}`} className="btn btn-lg" style={{ marginTop: 20 }}>
            Open the session
          </Link>
        )}
      </>
    );
  }

  const pastPromise = elapsed > REFUND_PROMISE_SECONDS;

  return (
    <>
      <div className="center" style={{ padding: "24px 0 8px" }}>
        <div className="spin" style={{ fontSize: 44, lineHeight: 1 }} aria-hidden="true">◐</div>
        <h1 style={{ marginTop: 20 }}>Finding you a tutor…</h1>
        <p className="muted">
          Every {subject} tutor who sat {request.examBoard} has just been notified.
        </p>
        <p className="timer" style={{ display: "inline-block", marginTop: 8 }}>
          {elapsed}s
        </p>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="row-between">
          <div>
            <span className="badge badge-neutral">{subject}</span>{" "}
            <span className="badge badge-neutral">{request.level}</span>{" "}
            <span className="badge">{request.examBoard}</span>
            <h3 style={{ marginTop: 12, marginBottom: 4 }}>{request.topic}</h3>
            <p className="muted tight" style={{ fontSize: 14.5 }}>
              {request.durationMins} minutes · {formatMoney(request.pricePence)} held
            </p>
          </div>
        </div>
        <hr />
        <p className="muted tight" style={{ fontSize: 14.5 }}>{request.detail}</p>
      </div>

      <div className={`notice ${pastPromise ? "notice-warn" : "notice-brand"}`} style={{ marginTop: 20 }}>
        {pastPromise
          ? "Taking longer than usual. If nobody accepts before the window closes, your credit is refunded automatically — you do not have to do anything."
          : `If nobody accepts within ${REFUND_PROMISE_SECONDS} seconds, your credit goes straight back.`}
      </div>

      <button className="btn btn-ghost" onClick={cancel}>Cancel and refund</button>

      <p className="hint" style={{ marginTop: 28 }}>
        Testing this? Open <Link href="/login">/login</Link> in another window, sign in as a
        tutor, and this question will be sitting on their board.
      </p>
    </>
  );
}
