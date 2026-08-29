"use client";

import { formatMoney } from "@project-ta/shared";

export interface Job {
  id: string;
  subject: string;
  topic: string;
  level: string;
  examBoard: string;
  detail: string;
  durationMins: number;
  tutorPayoutPence: number;
  expiresAt: number;
  studentName?: string;
  studentYear?: string | null;
}

interface Props {
  job: Job;
  secondsLeft?: number;
  onAccept?: () => void;
  busy?: boolean;
  demo?: boolean;
  subjectName?: string;
}

/**
 * The tutor notification.
 *
 * The fee is the largest thing on the card and sits above everything else, on
 * purpose. Uber shows drivers the fare; no tutoring platform shows tutors theirs.
 */
export default function JobCard({
  job, secondsLeft, onAccept, busy, demo, subjectName,
}: Props) {
  const urgent = secondsLeft !== undefined && secondsLeft <= 30;

  return (
    <article className="job">
      <div className="job-fee">
        <span className="job-fee-amount">{formatMoney(job.tutorPayoutPence)}</span>
        <span className="job-fee-label">
          for {job.durationMins} min · {formatMoney(Math.round((job.tutorPayoutPence / job.durationMins) * 60))}/hr
        </span>
      </div>

      <div className="job-body">
        <div className="job-meta">
          <span className="badge badge-neutral">{subjectName ?? job.subject}</span>
          <span className="badge badge-neutral">{job.level}</span>
          <span className="badge">{job.examBoard}</span>
          {job.studentYear && <span className="badge badge-neutral">{job.studentYear}</span>}
        </div>

        <h3 className="job-topic">{job.topic}</h3>
        <p className="job-detail">
          {job.detail.length > 190 ? `${job.detail.slice(0, 190)}…` : job.detail}
        </p>

        <div className="job-actions">
          <button
            className="btn btn-sm"
            onClick={onAccept}
            disabled={busy || demo}
            aria-disabled={busy || demo}
          >
            {busy ? "Taking it…" : demo ? "Accept" : "Accept — start now"}
          </button>
          {secondsLeft !== undefined && (
            <span className={`job-timer${urgent ? " urgent" : ""}`}>
              {secondsLeft > 0 ? `${secondsLeft}s left` : "expired"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
