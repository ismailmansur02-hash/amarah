"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** True once the browser has been asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * How far the element has travelled through the viewport, 0 to 1.
 *
 * Read inside a rAF-throttled scroll handler rather than on every event, so
 * scroll-linked motion stays smooth on a phone. Scroll-linked — the animation
 * follows the finger rather than playing on a timer once triggered — is most
 * of what makes a page feel like it is responding to you.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      if (distance <= 0) {
        // Shorter than the viewport: track it across the whole screen instead.
        const span = window.innerHeight + rect.height;
        setProgress(Math.min(1, Math.max(0, (window.innerHeight - rect.top) / span)));
        return;
      }
      setProgress(Math.min(1, Math.max(0, -rect.top / distance)));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);

  return progress;
}

/**
 * How far the page has scrolled from the very top, 0 to 1 over one viewport.
 *
 * The hero sits at the top of the document, so useScrollProgress is wrong for
 * it: that measures an element travelling *into* view, and reports roughly
 * half way for something already at the top. This measures from the document
 * top instead, which is what "as you begin to scroll" means for a hero.
 */
export function useViewportProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setProgress(Math.min(1, Math.max(0, window.scrollY / window.innerHeight)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/** Fires once when the element first comes into view. */
export function useInView(ref: RefObject<HTMLElement | null>, threshold = 0.2): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return seen;
}

/** Headline that arrives one line at a time, each line rising under its own mask. */
export function Lines({
  lines,
  className = "",
  delay = 0,
}: {
  lines: React.ReactNode[];
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const shown = useInView(ref, 0.3);

  return (
    <h2 ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`line-mask ${shown ? "line-in" : ""}`}>
          <span
            className="line-inner"
            style={{ transitionDelay: `${delay + i * 90}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </h2>
  );
}
