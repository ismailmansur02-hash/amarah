/**
 * Light and water, drawn rather than photographed.
 *
 * This is what the page shows until real photographs of real managed
 * properties replace it. An earlier version drew the house itself, palms and
 * all, and it looked like clip art — a drawn building sits in the uncanny gap
 * between a photograph and a diagram and cheapens everything near it.
 *
 * So these depict nothing: graded light, a horizon, water, grain. They read
 * as atmosphere rather than as an illustration of somewhere, which is also
 * honest — none of this claims to be a property anybody manages.
 *
 * Three variants, because the page uses it three times and the same sky three
 * times reads as a mistake. Being vector, each is exactly as sharp on a 6K
 * display as on a phone, and weighs about two kilobytes.
 */
export type SceneVariant = "dusk" | "morning" | "water";

export default function Scene({
  variant = "dusk",
  className = "",
}: {
  variant?: SceneVariant;
  className?: string;
}) {
  const id = `sc-${variant}`;

  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id={`${id}-soft`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        {/* Photographs have grain. Without it large gradients band and read as
            synthetic — this is most of what sells them. */}
        <linearGradient id={`${id}-vig`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05080c" stopOpacity={variant === "dusk" ? 0.5 : 0.2} />
          <stop offset="38%" stopColor="#05080c" stopOpacity="0" />
          <stop offset="100%" stopColor="#05080c" stopOpacity={variant === "dusk" ? 0.5 : 0.28} />
        </linearGradient>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="11" />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        {variant === "dusk" && (
          <>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1119" />
              <stop offset="26%" stopColor="#16222f" />
              <stop offset="50%" stopColor="#2f3f4a" />
              <stop offset="68%" stopColor="#5d6157" />
              <stop offset="82%" stopColor="#9a8467" />
              <stop offset="92%" stopColor="#cf9a6b" />
              <stop offset="100%" stopColor="#edb583" />
            </linearGradient>
            <radialGradient id={`${id}-glow`} cx="0.68" cy="0.985" r="0.46">
              <stop offset="0%" stopColor="#ffd6a0" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#e9a468" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#e9a468" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c79468" />
              <stop offset="6%" stopColor="#5c5f5e" />
              <stop offset="26%" stopColor="#25313c" />
              <stop offset="62%" stopColor="#111a23" />
              <stop offset="100%" stopColor="#080c12" />
            </linearGradient>
          </>
        )}

        {variant === "morning" && (
          <>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fa8bd" />
              <stop offset="34%" stopColor="#b9c9d6" />
              <stop offset="66%" stopColor="#dcdcd6" />
              <stop offset="88%" stopColor="#f0e0cd" />
              <stop offset="100%" stopColor="#f6ead9" />
            </linearGradient>
            <radialGradient id={`${id}-glow`} cx="0.3" cy="0.92" r="0.44">
              <stop offset="0%" stopColor="#fff3df" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#ffe3bd" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ffe3bd" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dcd3c2" />
              <stop offset="10%" stopColor="#9fb0b6" />
              <stop offset="45%" stopColor="#6d868f" />
              <stop offset="100%" stopColor="#47606b" />
            </linearGradient>
          </>
        )}

        {variant === "water" && (
          <>
            {/* No horizon: this one is looking straight down at the shallows. */}
            <linearGradient id={`${id}-sky`} x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#e8dcc4" />
              <stop offset="16%" stopColor="#bcd3c9" />
              <stop offset="38%" stopColor="#6fb3ae" />
              <stop offset="62%" stopColor="#2f8b95" />
              <stop offset="84%" stopColor="#146b7d" />
              <stop offset="100%" stopColor="#0a4a5e" />
            </linearGradient>
            <radialGradient id={`${id}-glow`} cx="0.16" cy="0.1" r="0.6">
              <stop offset="0%" stopColor="#fbf3e2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbf3e2" stopOpacity="0" />
            </radialGradient>
          </>
        )}
      </defs>

      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />

      {variant !== "water" && (
        <>
          {/* Cloud strata: long, flat and blurred, the way cloud sits when you
              look along a horizon rather than up at it. */}
          <g filter={`url(#${id}-soft)`}>
            {variant === "dusk" ? (
              <>
                <ellipse cx="430" cy="470" rx="560" ry="20" fill="#0e1720" opacity="0.5" />
                <ellipse cx="1180" cy="512" rx="470" ry="16" fill="#101a24" opacity="0.45" />
                <ellipse cx="760" cy="556" rx="680" ry="14" fill="#2a2a2c" opacity="0.4" />
                <ellipse cx="1240" cy="596" rx="420" ry="11" fill="#6b5949" opacity="0.5" />
                <ellipse cx="520" cy="614" rx="380" ry="9" fill="#7d6247" opacity="0.4" />
              </>
            ) : (
              <>
                <ellipse cx="520" cy="300" rx="600" ry="26" fill="#ffffff" opacity="0.5" />
                <ellipse cx="1150" cy="366" rx="480" ry="18" fill="#ffffff" opacity="0.42" />
                <ellipse cx="700" cy="420" rx="620" ry="14" fill="#c9d6de" opacity="0.4" />
                <ellipse cx="1220" cy="452" rx="380" ry="10" fill="#e4d6c2" opacity="0.45" />
              </>
            )}
          </g>

          <rect width="1600" height="900" fill={`url(#${id}-glow)`} />

          {(() => {
            const y = variant === "dusk" ? 642 : 498;
            return (
              <>
                <rect y={y} width="1600" height={900 - y} fill={`url(#${id}-water)`} />
                {/* Slack highlights where the light catches the swell. */}
                <g
                  fill={variant === "dusk" ? "#ffd9ab" : "#ffffff"}
                  opacity={variant === "dusk" ? 0.14 : 0.2}
                >
                  <rect x="980" y={y + 34} width="190" height="2" rx="1" />
                  <rect x="1070" y={y + 62} width="130" height="2" rx="1" />
                  <rect x="900" y={y + 90} width="240" height="2" rx="1" />
                  <rect x="1020" y={y + 124} width="150" height="3" rx="1.5" />
                  <rect x="860" y={y + 164} width="300" height="3" rx="1.5" />
                  <rect x="700" y={y + 208} width="380" height="3" rx="1.5" />
                </g>
              </>
            );
          })()}
        </>
      )}

      {variant === "water" && (
        <>
          {/* Sandbars: pale shapes under the surface, softened by the water. */}
          <g filter={`url(#${id}-soft)`} opacity="0.85">
            <ellipse cx="300" cy="150" rx="420" ry="120" fill="#efe4cb" opacity="0.75" />
            <ellipse cx="740" cy="330" rx="460" ry="90" fill="#bcd8cc" opacity="0.5" />
            <ellipse cx="1320" cy="230" rx="300" ry="80" fill="#dcd0b6" opacity="0.35" />
            <ellipse cx="1080" cy="700" rx="520" ry="110" fill="#0a4a5e" opacity="0.4" />
          </g>
          {/* Surf lines following the bar. */}
          <g fill="#ffffff" opacity="0.32">
            <rect x="120" y="292" width="560" height="3" rx="1.5" />
            <rect x="240" y="330" width="420" height="2" rx="1" />
            <rect x="820" y="440" width="480" height="3" rx="1.5" />
            <rect x="900" y="476" width="330" height="2" rx="1" />
          </g>
          <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
        </>
      )}

      <rect width="1600" height="900" fill={`url(#${id}-vig)`} />
      <rect width="1600" height="900" filter={`url(#${id}-grain)`} opacity="0.06" />
    </svg>
  );
}
