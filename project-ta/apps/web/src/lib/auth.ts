import { cookies, headers } from "next/headers";
import type { User } from "@project-ta/shared";
import { getUser } from "./store";

/**
 * Demo authentication.
 *
 * Payments are mocked in this build and so is sign-in: you pick a persona on
 * /login and it goes in a cookie. Real auth (email + password, parental consent
 * for under-16s, and age assurance proportionate to risk under the ICO
 * Children's Code) is the first thing to build after this prototype.
 *
 * The web app uses an httpOnly cookie. React Native has no dependable shared
 * cookie jar, so the mobile app sends the same identifier as a header instead
 * and both land here. In the real product both become a signed bearer token.
 */

export const SESSION_COOKIE = "pta_uid";
export const SESSION_HEADER = "x-pta-user";

export async function currentUser(): Promise<User | null> {
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  const id = jar.get(SESSION_COOKIE)?.value ?? hdrs.get(SESSION_HEADER) ?? null;
  if (!id) return null;
  return (await getUser(id)) ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}
