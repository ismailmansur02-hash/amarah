"use client";

import type { Photo } from "@/lib/photos";
import Scene, { type SceneVariant } from "./Scene";

/**
 * A photograph if there is one, the drawn scene if there is not.
 *
 * The browser is handed every width that exists and told how much of the
 * screen the picture will occupy, so a phone downloads the 640 and a desktop
 * the 2400 — "highest quality" meaning the best file for that screen, not the
 * biggest file for everyone. AVIF first, WebP for anything that cannot read
 * it.
 *
 * The blurred placeholder sits underneath, so the space is never empty and
 * the page never jumps once the real thing arrives.
 */
export default function Photo({
  photo,
  alt,
  scene = "dusk",
  sizes = "100vw",
  priority = false,
  className = "",
}: {
  photo: Photo | null;
  alt: string;
  /** Which drawn scene stands in until this slot has a photograph. */
  scene?: SceneVariant;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!photo) return <Scene variant={scene} className={`h-full w-full object-cover ${className}`} />;

  const srcset = (ext: "avif" | "webp") =>
    photo.widths.map((w) => `/photos/${photo.slot}-${w}.${ext} ${w}w`).join(", ");

  const fallbackWidth = photo.widths[photo.widths.length - 1] ?? 1600;

  return (
    <picture>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
      <img
        src={`/photos/${photo.slot}-${fallbackWidth}.webp`}
        alt={alt}
        width={photo.width}
        height={photo.height}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`h-full w-full object-cover ${className}`}
        style={{
          backgroundImage: `url(${photo.placeholder})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </picture>
  );
}
