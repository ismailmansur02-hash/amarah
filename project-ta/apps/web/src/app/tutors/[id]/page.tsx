import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { formatMoney, pricePence, subjectById } from "@project-ta/shared";
import { getUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const tutor = await getUser(id);
  return { title: tutor ? `${tutor.displayName} — tutor` : "Tutor" };
}

export default async function TutorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutor = await getUser(id);
  if (!tutor || tutor.role !== "tutor") notFound();

  return (
    <div className="wrap wrap-mid section-tight">
      <Link href="/tutors" className="muted" style={{ fontSize: 14 }}>← All tutors</Link>

      <div className="card card-pad-lg" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 20, alignItems: "flex-start" }}>
          <Avatar name={tutor.name} color={tutor.avatarColor} size="lg" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 28, marginBottom: 4 }}>{tutor.displayName}</h1>
            <p className="muted tight">{tutor.degree} · {tutor.studyYear} · {tutor.university}</p>
            <div className="job-meta" style={{ marginTop: 12 }}>
              <span className="badge">★ {tutor.rating} ({tutor.ratingCount} ratings)</span>
              <span className="badge">{tutor.sessionsCompleted} sessions</span>
              <span className="badge">
                <span className={`dot ${tutor.isOnline ? "dot-online" : "dot-offline"}`} />
                {tutor.isOnline ? "Online now" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <hr />
        <p style={{ fontSize: 16.5 }}>{tutor.bio}</p>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>Teaches</h3>
          <div className="job-meta">
            {tutor.subjects?.map((s) => (
              <span key={s} className="badge badge-neutral">{subjectById(s)?.name ?? s}</span>
            ))}
          </div>
          <p className="label" style={{ marginTop: 16 }}>Levels</p>
          <div className="job-meta">
            {tutor.levels?.map((l) => <span key={l} className="badge badge-neutral">{l}</span>)}
          </div>
          <p className="label" style={{ marginTop: 16 }}>Exam boards they sat</p>
          <div className="job-meta">
            {tutor.examBoards?.map((b) => <span key={b} className="badge">{b}</span>)}
          </div>
        </div>

        <div className="card">
          <h3>Checks and quality</h3>
          <div className="table-scroll" style={{ margin: 0 }}>
            <table>
              <tbody>
                <tr>
                  <td>Enhanced DBS</td>
                  <td style={{ textAlign: "right" }}>
                    <span className="badge">
                      {tutor.dbsStatus === "verified" ? "Verified" : tutor.dbsStatus}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Understanding score</td>
                  <td style={{ textAlign: "right" }}><strong>{tutor.understandingScore}%</strong></td>
                </tr>
                <tr>
                  <td>Typical response</td>
                  <td style={{ textAlign: "right" }}>{tutor.responseSeconds}s</td>
                </tr>
                <tr>
                  <td>Sessions completed</td>
                  <td style={{ textAlign: "right" }}>{tutor.sessionsCompleted}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hint">
            The understanding score is how often students said their tutor helped them
            understand the topic rather than just handing over the answer. It matters more
            to us than the star rating.
          </p>
        </div>
      </div>

      <div className="card card-pad-lg center" style={{ marginTop: 20 }}>
        <h3>Need help with {tutor.subjects?.map((s) => subjectById(s)?.name).filter(Boolean).join(" or ")}?</h3>
        <p className="muted">
          Ask your question and {tutor.displayName} will be one of the tutors notified —
          along with everyone else qualified for your exam board. {formatMoney(pricePence(15))}
          {" "}for 15 minutes.
        </p>
        <Link href="/ask" className="btn btn-lg">Ask a question</Link>
      </div>
    </div>
  );
}
