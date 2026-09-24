/**
 * Turns full-size photographs into what a browser should actually download.
 *
 * Drop originals into photos-src/ named after the slot they fill — hero.jpg,
 * interior.jpg, aerial.jpg — at the largest size you have, straight off the
 * camera is ideal. Then:
 *
 *     node scripts/prepare-photos.mjs
 *
 * Each one becomes a set of widths in AVIF and WebP under public/photos, and
 * the landing page starts using it automatically. Nothing else to edit.
 *
 * Why not ship the original: a 4K photograph is several megabytes, and a
 * phone on a hotel wifi would download every pixel of it to show a picture
 * 390 points wide. These derivatives let the browser pick the smallest file
 * that still looks perfect on its screen, which is what "high quality"
 * actually means in a page people wait for.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "photos-src";
const OUT = "public/photos";

/** The widths a browser may choose between, smallest first. */
const WIDTHS = [640, 1024, 1600, 2400, 3840];

/** Slots the landing page knows about. Anything else is ignored. */
const SLOTS = new Set(["hero", "interior", "aerial"]);

async function main() {
  await mkdir(OUT, { recursive: true });

  let sources;
  try {
    sources = await readdir(SRC);
  } catch {
    console.log(`No ${SRC}/ directory — nothing to do.`);
    return;
  }

  const usable = sources.filter((f) => SLOTS.has(path.parse(f).name.toLowerCase()));
  if (usable.length === 0) {
    console.log(`No photographs found in ${SRC}/. Expected one of: ${[...SLOTS].join(", ")}.`);
    return;
  }

  for (const file of usable) {
    const slot = path.parse(file).name.toLowerCase();
    const input = path.join(SRC, file);
    const image = sharp(input, { limitInputPixels: false });
    const { width = 0, height = 0 } = await image.metadata();

    console.log(`\n${file} — ${width}x${height}`);

    for (const w of WIDTHS) {
      // Never upscale: a 2000px original should not be blown up to 3840 and
      // pretend to be sharper than it is.
      if (w > width) continue;

      for (const [format, options] of [
        ["avif", { quality: 58, effort: 6 }],
        ["webp", { quality: 80 }],
      ]) {
        const out = path.join(OUT, `${slot}-${w}.${format}`);
        await sharp(input, { limitInputPixels: false })
          .resize({ width: w, withoutEnlargement: true })
          .toFormat(format, options)
          .toFile(out);
        const { size } = await sharp(out).metadata().then(async () => {
          const { stat } = await import("node:fs/promises");
          return stat(out);
        });
        console.log(`  ${path.basename(out).padEnd(22)} ${(size / 1024).toFixed(0)} KB`);
      }
    }

    // A tiny blurred version, inlined by the page as the placeholder behind
    // the real photograph so the layout never flashes empty.
    const blur = await sharp(input, { limitInputPixels: false })
      .resize({ width: 24 })
      .blur(1.2)
      .webp({ quality: 40 })
      .toBuffer();

    await writeFile(
      path.join(OUT, `${slot}.json`),
      JSON.stringify(
        {
          slot,
          width,
          height,
          aspectRatio: +(width / height).toFixed(4),
          widths: WIDTHS.filter((w) => w <= width),
          placeholder: `data:image/webp;base64,${blur.toString("base64")}`,
        },
        null,
        2
      ) + "\n"
    );
    console.log(`  ${slot}.json written`);
  }

  console.log("\nDone. Commit public/photos and redeploy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
