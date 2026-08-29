import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { subjectById, type User } from "@project-ta/shared";
import { getTutors } from "@/lib/store";

export const metadata: Metadata = { title: "Our tutors" };
export const dynamic = "force-dynamic";

export default async function TutorsPage() {
  const tutors: User[] = await getTutors();

  return (
    <div className="wrap section-tight">
      <h1>Our tutors</h1>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        Undergraduates at UK universities who sat these exams recently — most within the
        last three years. Every one is enhanced DBS-checked before they can see a single
        question.
      </p>

      <div className="grid grid-3" style={{ marginTop: 28 }}>
        {tutors.map((t) => (
          <Link key={t.id} href={`/tutors/${t.id}`} className="card card-hover" style={{ color: "inherit" }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Avatar name={t.name} color={t.avatarColor} size="lg" />
              <div>
                <h3 className="tight" style={{ fontSize: 18 }}>{t.displayName}</h3>
                <p className="muted tight" style={{ fontSize: 13.5 }}>
                  {t.degree}
                  <br />
                  {t.university}
                </p>
              </div>
            </div>

            <div className="job-meta">
              {t.subjects?.map((s) => (
                <span key={s} className="badge badge-neutral">
                  {subjectById(s)?.name ?? s}
                </span>
              ))}
            </div>

            <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
              {t.bio && t.bio.length > 120 ? `${t.bio.slice(0, 120)}…` : t.bio}
            </p>

            <div className="row-between" style={{ marginTop: 14 }}>
              <span className="badge">★ {t.rating} ({t.ratingCount})</span>
              <span className="badge">
                <span className={`dot ${t.isOnline ? "dot-online" : "dot-offline"}`} />
                {t.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h3>You do not pick your tutor</h3>
        <p className="muted tight">
          These profiles are here so you know who is on the other end, but the whole point
          of Project TA is that you do not have to browse and book. Ask your question and
          whoever is free, qualified for your exam board and fastest to accept takes it —
          usually inside a minute. If one of them was particularly good, you can ask for
          them again next time.
        </p>
      </div>
    </div>
  );
}
