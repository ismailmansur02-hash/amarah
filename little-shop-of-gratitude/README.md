# The Little Shop of Gratitude

The landing page for The Little Shop of Gratitude Ltd — mindful pottery and
gifts. Rebuilt from the project handoff document: same sage-green scrolling
design, now split into separate files with the logo as an external SVG.

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
│       ├── img/wreath.svg       ← the logo, referenced everywhere
│       ├── img/favicon.svg      the wreath again, with fixed colours
│       ├── img/og.png           the share picture
│       └── js/script.js         reveals, panels, forms, deposit
└── netlify/functions/
    └── deposit.mts              creates the Stripe deposit payment
```

## Client constraints — do not break these

From the handoff, listed as non-negotiable:

1. **The title font is Palatino Linotype, regular.** It is a system font on
   Mac and Windows, so there is no file to load. `--wordmark` in `styles.css`
   keeps Palatino, Book Antiqua and Georgia as fallbacks.
2. **The wreath is the button for every action** — Explore, Menu, Say Hello,
   Send, Book. Every one of them is a `.logo-btn` containing the wreath. New
   actions should follow the same pattern.
3. **The wreath also appears faintly behind the page content** (`.watermark`,
   in the About and Contact sections).
4. **The sage-green Apple-style scrolling design stays as it is** — full-screen
   hero, scroll-triggered reveals, generous whitespace.

The palette is exactly as specified, at the top of `styles.css`:

```css
--sage: #b5bc8a;  --sage-dark: #8a9060;  --sage-light: #d4d9b5;
--cream: #f5f0e8; --ink: #2a2a22;        --ink-light: #4a4a3a;
```

## Two things to check before this goes to the client

**The wreath is a stand-in.** The original artwork was a base64 PNG inside the
old single-file page, which was not included with the handoff. `wreath.svg` is
a drawn replacement in the same spirit — a hand-drawn floral ring. To put the
real one back, replace `public/assets/img/wreath.svg` and nothing else: every
button, the watermark and the favicon all read from that one file.

It is drawn with `currentColor` and applied as a CSS mask, so it takes the
colour of whatever it sits on — cream on the hero, sage-dark on the cards. A
traced SVG of the real wreath will work the same way as long as it uses
`currentColor` (or `fill="black"`, which the mask treats identically). A PNG
will also work, but only in one colour.

**Two pieces of wording are not from the approved copy**, because the handoff
did not include them:

| Where | What it says now |
|---|---|
| Hero tagline | "Mindful pottery and gifts, chosen with intention." |
| Quote section | The Melody Beattie line, given as "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow." |

Everything else — the brand story, the three product lines, the session
description, How to Book, and the Cancellation Notice — is verbatim from the
approved copy.

## Still open with the client

These are the handoff's open questions, still unanswered:

- **The booking email domain.** Currently rendered as
  `greetings@thelittleshopofgratitude.com`. Change `SETTINGS.emailDomain` at
  the top of `script.js` and it updates in every place it appears.
- **Product photography** — the three offering cards are text only.
- **The deposit amount, and whether it is taken online.** See below.

## Taking the deposit online

The payment flow is built and tested. It stays switched off until two
environment variables exist in Netlify, so no amount is ever shown or charged
until someone confirms it.

In Netlify: **Site configuration → Environment variables**

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | from Stripe → Developers → API keys. `sk_test_…` to try it, `sk_live_…` for real money. Mark it **secret**. |
| `DEPOSIT_PENCE` | the deposit in pence — `2000` is £20 |

Redeploy and the booking form gains a "Pay deposit" wreath button. Until then it
says the deposit will be confirmed by email, which is what the approved copy
promises anyway.

Test with Stripe's card `4242 4242 4242 4242`, any future expiry, any CVC.

The amount is read from the environment on the server for every payment, so it
cannot be altered from a browser.

## The two forms

Say Hello and Book a session both go to **Netlify Forms** — no server and no
email account needed. Messages appear under **Forms** in the Netlify dashboard.
For an email each time: Forms → Settings → Form notifications.

## What changed from the single-file version

The handoff's suggested next steps, and where they landed:

- **Logo extracted** from a base64 PNG to one external SVG. The page is now
  about 40 KB of HTML, CSS and JS instead of roughly 1.1 MB.
- **Split** into `index.html`, `styles.css` and `script.js`.
- **Fonts** are served from this site and preloaded, with `font-display: swap`.
  That also removes the last third-party request.
- **The contact form is wired** to Netlify Forms rather than an `alert()`.
- **Booking added**, using the wreath button, with the payment flow above.
- **The fragile menu animation is gone.** The old `max-height: 3200px` cap would
  have clipped if the copy grew; it now animates `grid-template-rows` from `0fr`
  to `1fr`, which fits any amount of content.
- **Accessibility**: every wreath button has an `aria-label`, both panels are
  `role="dialog"` with `aria-modal`, focus moves in and is trapped while open
  and returns to where it came from, Escape and the browser back button both
  close, and every animation stops under `prefers-reduced-motion`.
- **Meta description, Open Graph tags and a favicon** built from the wreath.
- **The hero curved text was re-checked** at 320, 375 and 430 px wide. The
  wreath twigs clear the word GRATITUDE at all of them, and nothing scrolls
  sideways.

## One accessibility point to raise

Two colour pairings from the brand palette fall below the WCAG AA minimum of
4.5:1 for normal text:

- sage-dark labels on cream — **2.97:1**
- cream text on the sage hero — **1.76:1**

Both are the client's own brand colours, so they have been left alone. If they
are open to it, darkening `--sage-dark` to about `#6f7449` for text would fix
the first without changing the look much. The footer was the one place with a
free choice — it uses `--ink` behind `--sage-light`, which reads at 9.9:1.

## Working on it locally

```bash
cd little-shop-of-gratitude/public
python3 -m http.server 8130
# http://127.0.0.1:8130
```

The page uses ES modules, so opening `index.html` straight off the disk will not
work — it needs to be served. For the deposit function too, run `netlify dev`
from the repo root (`npm i -g netlify-cli`).

## Re-making the share picture

`public/og-source.html` is the design behind `assets/img/og.png`. Screenshot it
at 1200×630 and save over the PNG.
