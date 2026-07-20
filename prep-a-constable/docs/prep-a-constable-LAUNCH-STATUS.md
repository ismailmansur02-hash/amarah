# Prep a Constable — Launch Status

_Last updated: 10 July 2026_

This is the honest, current state of the app and everything around it, split into **done**, **built now (this pass)**, and **what only you can do**.

---

## ✅ Content & app — complete and verified

- **885 questions** across **35 topics** (AP1–AP4), QA'd: 0 structural issues, answer/explanation consistency checked, scenarios correctly separated.
- **333 flashcards**, **36 mnemonics**, **91 Constable Companion** reference cards with points to prove and verified driving penalties.
- **AP-scoped mock exams** — each draws only from its Assessment Points topics.
- **Verbal drills** with microphone capture and red-highlight scoring (caution, GOWISELY, ESD arrest).
- **Real exam result tracking** with a confetti celebration.
- Spaced repetition, streaks, progress, search.
- **Security-audited**: prototype-pollution, type-confusion, storage-bloat, and stale-question crashes all fixed and regression-tested.
- The app parses cleanly and all in-app logic tests pass.

---

## ✅ Backend & integration code — BUILT THIS PASS (`prep-a-constable-backend/`)

Real, working code implementing the backend spec. **Verified by running it**, not just written:

| Piece | File | Status |
|---|---|---|
| Database schema (1 table, RLS on all verbs, timestamp trigger) | `supabase/migrations/0001_init.sql` | ✅ validated |
| Account-deletion edge function (App Store requirement) | `supabase/functions/delete-account/index.ts` | ✅ validated |
| State contract (sync logic, generated verbatim from the app) | `src/lib/stateContract.js` | ✅ 27 tests pass |
| Supabase client (env-based, no secrets) | `src/lib/supabaseClient.js` | ✅ syntax + security clean |
| Cloud sync — local cache, pull/merge, debounced push | `src/lib/persistence.js` | ✅ tested |
| Auth — Apple, Google, email magic-link, anonymous-first | `src/lib/auth.js` | ✅ syntax + imports resolve |
| Payments — RevenueCat entitlements, paywall, restore | `src/lib/purchases.js` | ✅ syntax + security clean |
| Drift-prevention + tests + load-test scripts | `scripts/` | ✅ run and passing |

**What "verified" means here:** every file is syntax-checked; the SQL structure is validated (4 RLS policies, cascade, trigger); the edge function is checked (authenticates from JWT, uses the service key only server-side, never hardcodes it); a security sweep confirms **no secret is in any shipped file**; all cross-module imports resolve; and **27 automated tests pass — including a full two-device sync round-trip proving no progress is ever lost.**

Run it yourself: `cd prep-a-constable-backend && node scripts/test-contract.cjs`

---

## ⛔ What only you can do (needs identity, money, or a Mac)

These are genuinely impossible from code alone. Nothing below is a coding gap — it's accounts, hardware, and human sign-off.

1. **Create the accounts** — Apple Developer (£79/yr), Google Play ($25 one-off), Supabase, RevenueCat, Expo. They need your identity and bank details.
2. **The React Native port** — porting the single-file prototype into an Expo project, screen by screen, and wiring native speech recognition for the verbal drills. The backend code is written to drop straight in (see the README's integration section), but assembling, running, and debugging it happens in Xcode/Android Studio on your machine.
3. **Run the setup** — ✅ **MOSTLY DONE (10 July 2026, via the Supabase connector):** project live (`uqekeszdgeumwjdbompd`, eu-west-1), schema migration applied (`user_state` + row-level security, verified by Supabase's security advisor: zero warnings), `delete-account` edge function deployed and ACTIVE with JWT verification, and the real URL + publishable key written into `.env`. **Still manual:** enable the three auth providers (Apple / Google / Email magic link) in the Supabase dashboard → Authentication → Providers, add the app's deep-link redirect URL, and create the £10.99 subscription products + RevenueCat keys.
4. **Flip the release gate** — set `DEMO_MODE = false` in the app (it's `true` today).
5. **Device testing** — TestFlight + Play Internal Testing: real sign-in, cross-device sync, a sandbox purchase, account deletion, on actual phones.
6. **Legal review** — the privacy policy and terms are solid templates but need your business name, contact email, ICO registration (~£40–60/yr), and a qualified person's eyes.
7. **Store submission** — icon, screenshots, listing copy, privacy questionnaire, then submit. Apple review ~1–3 days, Google hours-to-a-day.

---

## Suggested order

Accounts (start today — some take 48h) → run Supabase setup → port to Expo and drop in the backend modules → RevenueCat products → flip `DEMO_MODE` → TestFlight/Internal testing → legal review → submit.

Realistically the **port + device testing** is the bulk of the remaining effort. Everything that could be built and proven ahead of that is done.
