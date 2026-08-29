import { ok } from "@/lib/api";
import { getTutors } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ tutors: await getTutors() });
}
