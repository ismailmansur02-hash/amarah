"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatMoney,
  secondsRemaining,
  subjectById,
  tutorHourlyPence,
  type TutorSession,
  type User,
} from "@project-ta/shared";
import JobCard, { type Job } from "@/components/JobCard";
import { apiFetch } from "@/lib/api";

const POLL_MS = 2000;

export default function TutorBoardClient() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: User | null } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tick, setTick] = useState(Date.now());
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notifyOn, setNotifyOn] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifyOn(Notification.permission === "granted");
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/board", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: Job[] };
      const list = data.jobs ?? [];
      setJobs(list);

      // Fire a real OS notification for anything we have not shown before.
      for (const job of list) {
        if (seenRef.current.has(job.id)) continue;
        seenRef.current.add(job.id);
        if (notifyOn && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`${formatMoney(job.tutorPayoutPence)} · ${job.topic}`, {
            body: `${subjectById(job.subject)?.name ?? job.subject} ${job.level} · ${job.examBoard} · ${job.durationMins} min`,
            tag: job.id,
          });
        }
      }
    } catch {
      /* dropped poll */
    }
  }, [notifyOn]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifyOn(result === "granted");
  }

  async function accept(id: string) {
    setAccepting(id);
    setError("");
    try {
      const { session } = await apiFetch<{ session: TutorSession }>(
        `/api/requests/${id}/accept`,
        { method: "POST" },
      );
      router.push(`/session/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept");
      setAccepting(null);
      poll();
    }
  }

  if (me === null) return <p className="muted pulse">Loading…</p>;

  if (!me.user) {
    return (
      <>
        <h1>Question board</h1>
        <div className="notice notice-brand">
          Sign in as a tutor to see live questions.{" "}
          <Link href="/login">Pick an account →</Link>
        </div>
      </>
    );
  }

  if (me.user.role !== "tutor") {
    return (
      <>
        <h1>Question board</h1>
        <div className="notice notice-brand">
          This is the tutor view. You are signed in as a student — you probably want{" "}
          <Link href="/ask">to ask a question</Link> instead, or{" "}
          <Link href="/login">switch to a tutor account</Link> to see this side of it.
        </div>
      </>
    );
  }

  const tutor = me.user;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="tight">Question board</h1>
          <p className="muted tight">
            Live questions matching your subjects, levels and exam boards. First to
            accept gets it.
          </p>
        </div>
        <div className="row">
          <span className="badge">
            <span className={`dot ${tutor.isOnline ? "dot-online" : "dot-offline"}`} />
            {tutor.isOnline ? "Online" : "Offline"}
          </span>
          {!notifyOn && (
            <button className="btn btn-sm btn-quiet" onClick={enableNotifications}>
              Turn on notifications
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <div className="card card-flat stat">
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-label">Questions waiting</div>
        </div>
        <div className="card card-flat stat">
          <div className="stat-value">{formatMoney(tutorHourlyPence(15))}</div>
          <div className="stat-label">Your hourly rate</div>
        </div>
        <div className="card card-flat stat">
          <div className="stat-value">{tutor.sessionsCompleted ?? 0}</div>
          <div className="stat-label">Sessions completed</div>
        </div>
        <div className="card card-flat stat">
          <div className="stat-value">{tutor.understandingScore ?? "—"}%</div>
          <div className="stat-label">Understanding score</div>
        </div>
      </div>

      {error && <div className="notice notice-danger">{error}</div>}

      {jobs.length === 0 ? (
        <div className="card card-pad-lg center">
          <p style={{ fontSize: 34, margin: 0 }} aria-hidden="true">◔</p>
          <h3>Nothing waiting right now</h3>
          <p className="muted" style={{ maxWidth: "46ch", margin: "0 auto 16px" }}>
            New questions appear here the moment a student asks. Weekday evenings
            between 7pm and 10pm are the busiest.
          </p>
          <p className="hint">
            Want to see it work? Open <Link href="/login">/login</Link> in another window,
            sign in as a student and ask a {tutor.subjects?.map((s) => subjectById(s)?.name).filter(Boolean).join(" or ")} question.
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              subjectName={subjectById(job.subject)?.name}
              secondsLeft={secondsRemaining(job.expiresAt, tick)}
              busy={accepting === job.id}
              onAccept={() => accept(job.id)}
            />
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 28 }}>
        <h3>Why the fee is on the card</h3>
        <p className="muted tight">
          You should know what a job pays before you commit to it. Every question here
          shows your share, the topic and the time, up front — no platform we looked at
          does that, and one that paid its tutors badly and hid it went out of business
          doing so. Your share is two thirds of what the student pays, always.
        </p>
      </div>
    </>
  );
}
