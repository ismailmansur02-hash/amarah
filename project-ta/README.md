# Project TA

On-demand tutoring for UK GCSE and A-level students. A student posts a question,
every qualified tutor is notified with **the fee, the topic and the duration on the
notification**, and the first to accept works through it with them in chat and on a
shared whiteboard.

Green-themed, text-first, built for under-18s — which means safeguarding is a
feature of the product, not a page in the footer.

---

## What's here

```
project-ta/
├── apps/
│   ├── web/          Next.js 15 app — the full product and the API
│   └── mobile/       Expo app — same API, no second backend
├── packages/
│   └── shared/       Types, pricing, curriculum, matching, safeguarding filter
└── docs/
    ├── COMPETITOR-RESEARCH.md    Market research that shaped the product
    ├── PRODUCT-SPEC.md           Full spec: flows, data model, roadmap
    └── Project-TA-Competitor-Research.pdf
```

`packages/shared` is the single source of truth for anything both apps must agree
on. Pricing lives in exactly one file, so the web app, the mobile app and the
server can never disagree about what a session costs.

## Running it

```bash
npm install          # from this directory
npm run dev          # web app on http://localhost:3000
npm test             # 32 tests over the safeguarding filter, pricing and matching
npm run typecheck    # strict TypeScript across the web app
```

Mobile:

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000 npx expo start
```

## Trying the real flow

The interesting part is watching a question travel from a student to a tutor.

1. Open `/login` in **two browser windows** (one normal, one private).
2. Sign in as **Aisha Rahman** (student) in one, **Priya Shah** (tutor) in the other.
3. As Aisha, go to `/ask` and post an A-level Maths question.
4. Watch it appear on Priya's board at `/tutor` — with `£4.00` on the card.
5. Accept it. Both windows land in the same session: shared chat, shared whiteboard,
   a live countdown.
6. Try sending `text me on 07700 900123` — the safeguarding filter strips it.

## What is real and what is not

**Real:** matching and eligibility rules, the notification board, first-to-accept
race handling, chat, the collaborative whiteboard, the session timer and paid
extensions, credit holds and automatic refunds, the safeguarding filter, ratings,
complaints intake, tutor applications.

**Mocked:** payments. No card details are collected, transmitted or stored
anywhere — the card form on `/pay` is decorative and its values never leave the
browser. Sign-in is a persona picker rather than real authentication.

**Not built yet:** real auth with parental consent, Stripe Checkout and Connect,
DBS integration, push notifications on iOS, the parent transcript viewer, the admin
safeguarding console. See `docs/PRODUCT-SPEC.md` for the order to build them in.

## Architecture notes

- **No websocket server.** Chat, the whiteboard and the notification board poll a
  small HTTP API. That keeps the whole thing deployable to serverless hosting with
  nothing to run, and swapping in a socket later touches three files.
- **Persistence** is Netlify Blobs in production and an in-process map locally, behind
  one interface in `apps/web/src/lib/store.ts`. Moving to Postgres or Supabase means
  rewriting that file and nothing else.
- **The safeguarding filter runs on the server**, before a message is stored, so it
  cannot be bypassed by a modified client. It has its own test suite; treat those
  tests as load-bearing.
- **Money is in pence, as integers**, everywhere. No floats.

## Deploying

`netlify.toml` at the repository root points Netlify at this directory. Node 22.
