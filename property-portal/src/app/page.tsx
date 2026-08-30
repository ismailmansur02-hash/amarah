import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Landing from "@/components/landing/Landing";

export default async function Home() {
  const session = await getSession();

  // Anyone already signed in goes straight to their work; the landing page is
  // for the owner arriving at the link for the first time.
  if (session) redirect(session.role === "manager" ? "/dashboard" : "/my");

  return <Landing />;
}
