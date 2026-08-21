# The Little Shop of Gratitude

The landing page for The Little Shop of Gratitude Ltd — mindful gifts and
heartfelt tokens. Rebuilt from `little-shop-of-gratitude.html`: same design,
same words, now split into separate files with the logo as one external image.

Plain HTML, CSS and JavaScript. No framework, no build step.

```
little-shop-of-gratitude/
├── public/
│   ├── index.html               the page
│   ├── thank-you.html           after a deposit is paid
│   ├── 404.html
│   ├── og-source.html           the design behind the share picture
│   └── assets/
│       ├── css/styles.css       all styling, palette at the top
│       ├── css/fonts.css        Cormorant Garamond + Jost, served locally
│       ├── fonts/               the font files
│       ├── img/wreath.png       ← the logo, referenced everywhere
│       ├── img/favicon.svg      the wreath again, on cream
│       ├── img/og.png           the share picture
│       └── js/script.js         reveals, panels, forms, deposit
└── netlify/functions/
    └── deposit.mts              creates the Stripe deposit payment
```

## Client constraints — do not break these

From the handoff, listed as non-negotiable:

1. **The title font is Palatino Linotype, regular.** It is a system font on Mac
   and Windows, so there is no file to load. `--wordmark` in `styles.css` keeps
   Palatino, Book Antiqua and Georgia as fallbacks.
2. **The wreath is the button for every action** — Explore, Menu, Say Hello,
   Send, and now Book. Every one is a `.logo-btn` containing the wreath image.
   New actions should follow the same pattern.
3. **The wreath also sits faintly behind the page content** — behind the About
   section at 5% and behind the panels at 7%.
4. **The sage-green scrolling design stays as it is** — full-screen hero,
   scroll-triggered reveals, generous whitespace.

The palette is exactly as it was, at the top of `styles.css`:

```css
--sage: #b5bc8a;  --sage-dark: #8a9060;  --sage-light: #d4d9b5;
--cream: #f5f0e8; --ink: #2a2a22;        --ink-light: #4a4a3a;
--gold: #c9a96e;
```

## The logo

`public/assets/img/wreath.png` is the original artwork, lifted straight out of
the old single-file page. It was a 231 KB RGBA image; because the drawing is
pure greyscale it now stores as greyscale + alpha at **99 KB**, pixel for pixel
identical (every alpha value matches).

It appears in nine places — the hero centre, six buttons, and two watermarks —
and every one of them points at that single file. To change the logo, replace
that file and nothing else.

If a traced SVG is ever made, swap it in the same way: the only reference that
needs its extension changed is `--wreath` in `styles.css`, plus the `src` on the
button images and the `href` on the hero `<image>`.

## Still open with the client

- **The booking email domain.** Rendered as
  `greetings@thelittleshopofgratitude.com`, as the original page had it, but the
  handoff flags the ending as unconfirmed. Change `SETTINGS.emailDomain` at the
  top of `script.js` and it updates everywhere it appears.
- **Product photography** — the three offering cards are still text and an emoji.
- **The deposit amount, and whether it is taken online.** See below.

## Taking the deposit online

Built and tested, and switched off until two environment variables exist, so no
amount is ever shown or charged until someone confirms it.

In Netlify: **Site configuration → Environment variables**

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | from Stripe → Developers → API keys. `sk_test_…` to try it, `sk_live_…` for real money. Mark it **secret**. |
| `DEPOSIT_PENCE` | the deposit in pence — `2000` is £20 |

Redeploy and the booking form gains a "Pay Deposit" wreath button. Until then it
says the deposit will be confirmed by email, which is what the approved copy
promises anyway.

Test with Stripe's card `4242 4242 4242 4242`, any future expiry, any CVC.

The amount is read from the environment on the server for every payment, so it
cannot be altered from a browser. Amounts under £1 or over £1,000 are refused as
a guard against a mistyped variable.

## The two forms

Say Hello and Book a session both go to **Netlify Forms** — no server and no
email account needed. Messages appear under **Forms** in the Netlify dashboard.
For an email each time: Forms → Settings → Form notifications.

## What changed from the single-file version

The handoff's suggested next steps, and where they landed:

- **Logo extracted** from nine embedded base64 copies to one external file. The
  page went from about **1.05 MB to 44 KB** of HTML, CSS and JS, plus the 99 KB
  logo.
- **Split** into `index.html`, `styles.css` and `script.js`.
- **Fonts** are served from this site and preloaded, with `font-display: swap`.
  That also removes the last third-party request.
- **Both forms are wired** to Netlify Forms rather than an `alert()`.
- **Booking added**, using the wreath button, with the payment flow above.
- **The fragile menu animation is gone.** The old `max-height: 3200px` cap would
  have clipped once the copy grew past it; rows now animate from `0fr` to `1fr`,
  which fits any height.
- **Accessibility**: every wreath button has an `aria-label` (their `alt` is
  empty, as before), both panels are `role="dialog"` with `aria-modal`, focus
  moves in, is trapped while open and returns on close, Escape and the browser
  back button both close, form fields have real labels behind the placeholders,
  and every animation stops under `prefers-reduced-motion`.
- **Meta description, Open Graph tags, JSON-LD and a favicon** built from the
  wreath.
- **The hero curved text was re-checked** at 320, 375 and 430 px. The wreath
  clears the word GRATITUDE at all three and nothing scrolls sideways. The arc
  geometry is unchanged from the original (`topArc` r=165; `bottomArc` r=152
  at y=268).

## How this was checked against the original

The rebuilt page and the original file were rendered side by side and their text
compared field by field — eyebrow, both arcs, tagline, every section label,
title and body, all card copy, the menu blocks, the quote, the footer and the
panel. **Twenty-three of twenty-four fields are identical**; the twenty-fourth is
the added "Book a Session" button. Heading alignment was compared the same way.

`site.test.mjs` and `deposit.test.mts` in the scratchpad cover the constraints,
the copy, the panels, the forms, the payment guards and the narrow-width arc.

## One accessibility point to raise

The sage-dark section labels on cream sit at **2.97:1**, below the WCAG AA
minimum of 4.5:1 for normal text. It is the client's own brand colour, so it has
been left alone. If they are open to it, darkening `--sage-dark` to about
`#6f7449` for text would fix it without changing the look much.

## Working on it locally

```bash
cd little-shop-of-gratitude/public
python3 -m http.server 8130
# http://127.0.0.1:8130
```

The page uses an ES module, so opening `index.html` straight off the disk will
not work — it needs to be served. For the deposit function too, run
`netlify dev` from the repo root (`npm i -g netlify-cli`).

## Re-making the share picture

`public/og-source.html` is the design behind `assets/img/og.png`. Screenshot it
at 1200×630 and save over the PNG.
