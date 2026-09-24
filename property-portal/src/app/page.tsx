import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPhoto } from "@/lib/photos";
import Landing from "@/components/landing/Landing";

export default async function Home() {
  const session = await getSession();

  // Anyone already signed in goes straight to their work; the landing page is
  // for the owner arriving at the link for the first time.
  if (session) redirect(session.role === "manager" ? "/dashboard" : "/my");

  // Read on the server so adding a photograph needs no code change — the page
  // picks it up on the next deploy, and draws its own scene until then.
  return (
    <Landing
      photos={{
        hero: getPhoto("hero"),
        interior: getPhoto("interior"),
        aerial: getPhoto("aerial"),
      }}
    />
  );
}
