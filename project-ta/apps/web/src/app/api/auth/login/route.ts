import { SESSION_COOKIE } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return fail("Pick an account to sign in as");
  const user = await getUser(userId);
  if (!user) return fail("No such account", 404);

  const res = ok({ user });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
