import { getPhoto } from "@/lib/photos";
import Landing from "@/components/landing/Landing";

/*
 * Static. Anyone already signed in is sent to their own screens by
 * middleware, at the edge, so this page reads no cookie and needs no
 * function — it is HTML on the CDN, which is what the first page a new owner
 * opens should be.
 *
 * The photographs are read from disk at build, so that costs nothing at
 * request time either.
 */
export default function Home() {
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
