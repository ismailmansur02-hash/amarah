import { ok } from "@/lib/api";
import { getUsers } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The persona list for the prototype's /login page. It exists only because
 * sign-in is mocked; real authentication replaces this endpoint entirely.
 */
export async function GET() {
  const users = (await getUsers()).filter((u) => u.role !== "admin");
  return ok({ users });
}
