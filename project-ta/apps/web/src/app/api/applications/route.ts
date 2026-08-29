import { newId, type ExamBoard, type Level, type TutorApplication } from "@project-ta/shared";
import { fail, ok } from "@/lib/api";
import { addApplication } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json()) as Partial<TutorApplication> & { subjects?: string[] };

  if (!b.name?.trim()) return fail("We need your name");
  if (!b.email?.includes("@")) return fail("We need a valid email address");
  if (!b.university?.trim()) return fail("Which university are you at?");
  if (!b.subjects?.length) return fail("Pick at least one subject");
  if (!b.motivation?.trim() || b.motivation.trim().length < 40) {
    return fail("Tell us a bit more about why you'd be good at this (at least 40 characters)");
  }

  const application: TutorApplication = {
    id: newId("app"),
    name: b.name.trim().slice(0, 120),
    email: b.email.trim().slice(0, 200),
    university: b.university.trim().slice(0, 160),
    degree: (b.degree ?? "").trim().slice(0, 160),
    studyYear: (b.studyYear ?? "").trim().slice(0, 40),
    subjects: b.subjects.slice(0, 8),
    levels: (b.levels ?? []) as Level[],
    examBoards: (b.examBoards ?? []) as ExamBoard[],
    aLevelResults: (b.aLevelResults ?? "").trim().slice(0, 400),
    motivation: b.motivation.trim().slice(0, 2000),
    hasDbs: Boolean(b.hasDbs),
    createdAt: Date.now(),
    status: "received",
  };

  await addApplication(application);
  return ok({ application: { id: application.id, status: application.status } });
}
