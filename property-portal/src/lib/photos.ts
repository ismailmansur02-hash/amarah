import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Photographs the landing page will use if they are there.
 *
 * The page is built to be finished without them — it falls back to a drawn
 * dusk scene rather than a grey box — so the site is never waiting on a photo
 * shoot to look right. Add one with scripts/prepare-photos.mjs and it takes
 * over on the next deploy, with no code change.
 *
 * Read from disk at render rather than imported, so adding a photograph does
 * not mean editing a source file.
 */
export type Photo = {
  slot: string;
  width: number;
  height: number;
  aspectRatio: number;
  widths: number[];
  /** Tiny inlined blur shown under the real photograph while it loads. */
  placeholder: string;
};

export type PhotoSlot = "hero" | "interior" | "aerial";

export function getPhoto(slot: PhotoSlot): Photo | null {
  try {
    const file = path.join(process.cwd(), "public", "photos", `${slot}.json`);
    return JSON.parse(readFileSync(file, "utf8")) as Photo;
  } catch {
    // No photograph for this slot. The page draws its own.
    return null;
  }
}
