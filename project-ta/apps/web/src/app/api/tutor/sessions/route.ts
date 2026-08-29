import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getSessions, getUsers } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role !== "tutor") return fail("Tutor accounts only", 403);

  const users = await getUsers();
  const mine = (await getSessions())
    .filter((s) => s.tutorId === user.id)
    .map((s) => ({
      ...s,
      studentName: users.find((u) => u.id === s.studentId)?.displayName ?? "Student",
      studentId: undefined,
    }));

  const earnedPence = mine
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.tutorPayoutPence, 0);

  const minutes = mine
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + Math.round((s.endsAt - s.startedAt) / 60_000), 0);

  return ok({ sessions: mine, earnedPence, minutes });
}
