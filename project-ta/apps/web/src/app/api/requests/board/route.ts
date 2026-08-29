import { rankTutors, type HelpRequest } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getUsers, sweepExpired } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The tutor notification board.
 *
 * Every eligible tutor sees every open request, with the fee, the topic and the
 * duration on the card itself. First to accept gets it — the mechanic Snapask
 * proved, with the pay transparency nobody else offers.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role !== "tutor") return fail("Tutor accounts only", 403);

  const all = await sweepExpired();
  const users = await getUsers();

  const open = all
    .filter((r) => r.status === "pending" && r.expiresAt > Date.now())
    .filter((r) => rankTutors([user], r).length > 0)
    .sort((a, b) => b.createdAt - a.createdAt);

  const jobs = open.map((r: HelpRequest) => {
    const student = users.find((u) => u.id === r.studentId);
    return {
      ...r,
      // Tutors only ever see a first name and initial, never the full identity.
      studentName: student?.displayName ?? "Student",
      studentYear: student?.yearGroup ?? null,
      studentId: undefined,
    };
  });

  return ok({ jobs, serverTime: Date.now() });
}
