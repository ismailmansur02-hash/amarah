# Prep a Constable — Full App Audit

Audit of the complete uploaded workspace, 20 July 2026: the app
(`app/prep-a-constable.jsx`, 10,379 lines), the backend integration package
(`backend/`), the Supabase migration and edge function, the docs, and the web
preview. Every fix below is a **code/formatting** change only — no legal or exam
content was written or altered from model knowledge, per the cardinal rule.

## What the app is

A single-file React prototype of a commercial iOS/Android revision app for
Metropolitan Police PCEP recruits (AP1–AP4 assessments): 885 questions across
35 topics, 136 lessons, 333 flashcards, 40 mnemonics, AP-scoped mock exams,
spaced repetition (Leitner boxes), streaks, verbal drills with speech
recognition (caution, GOWISELY, ESD arrest), a Constable Companion operational
reference (91 offences + 24 powers with points to prove), real-exam result
tracking, and a demo sign-in flow. Alongside it: a drop-in Supabase/RevenueCat
backend package (auth, grow-only cloud sync, payments, account deletion) with
the sync contract generated verbatim from the app.

## Fixed in this audit (all verified by running the app)

### F1. HIGH — practice feedback banner showed the wrong answer letter
`PracticeMode` graded against the shuffled `correctOptionId` (correct) but the
red "Correct answer: X" banner printed the **original** `q.correctOptionId`.
Whenever the shuffle moved the correct option — 3 times out of 4 — a wrong
answer showed a letter that contradicted the green-highlighted option on the
same screen. This is the exact regression class hard rule 4 exists for. Fixed
to use the shuffled id. **Verified in a headless-browser run: banner letter now
matches the on-screen green option.**

### F2. MEDIUM — untimed mocks recorded `timeSpentSecs: 0`
`MockMode`'s clock state only ticks when a countdown is running, so with the
time limit set to "Off" the attempt was saved with `timeSpentSecs: 0` and
`durationSecs: 0`. Time spent is now measured from the wall clock at submit.
**Verified in-browser: an untimed 10-question mock taking ~2s recorded
`timeSpentSecs: 2`.**

### F3. Rule 2 (no abbreviations in displayed strings) — three "PHA" instances
- `q-pha-24` stem: "Which pairing of PHA offences…" → full statute name.
- Constable Companion `harassment-pha` notes: "PHA Restraining Order" → "A
  Restraining Order under the Protection from Harassment Act 1997".
- Constable Companion `harassment-fear-violence` notes: "Higher tier of PHA
  harassment" → full statute name.

Formatting only — the full name is the one already used throughout the app. An
extended scan for statute abbreviations (PACE, MODA, OAPA, POCA, ASBCPA, CPIA,
RTA, SOA, PHA, YJCEA) across **every** displayed field — questions, options,
explanations, scenarios, flashcards, lessons, topic descriptions, offences,
powers, mnemonics, key cases — is now clean.

### F4. Cosmetic — duplicated dead line
`ResultsScreen` review had `if (!q) return null;` twice back-to-back. Removed
the duplicate.

## Flagged for Mr Mansur — content decisions, deliberately NOT changed

### C1. Mnemonics appear inside Constable Companion cards (hard rule 1)
Rule 1 says mnemonics must never appear in CC, but these CC cards embed them:

| CC card | Mnemonic in text |
|---|---|
| Theft (points to prove) | "(DAPBI)" |
| Robbery (points to prove) | "DAPBI satisfied" |
| Aggravated burglary (points to prove) | "(WIFE)" |
| Offensive weapon in public (notes + points to prove) | "M-A-I test", "M-A-I" |
| Bladed article in public (notes) | "NO M-A-I" |
| Section 1 stop & search (grounds) | "SOAP" expansion |
| Section 17 entry (grounds) | "SCARES" expansion |
| Section 24 arrest (grounds) | "(IDCOPPLAN)" |
| Section 19 / Section 22 seizure & retention (notes) | "FILE" expansion |

These read as deliberate operational memory tags (Pocket-Sergeant style), and
removing them means rewording points-to-prove/grounds text — a content edit
only you can authorise. Decide: keep as-is (and relax rule 1's wording), or say
the word and they get stripped to plain wording.

### C2. Borderline: `q-rta-22` mentions "penalty points" in a distractor
Rule 1 says driving penalties/points are CC-only, with the ESD drink-drive
procedure as the agreed exception. `q-rta-22` (Section 7(6) failure to provide
an evidential specimen) uses "Three penalty points" as a wrong option and
discusses penalties in the correct answer. It sits inside the drink-drive
procedure area, so it plausibly falls under the agreed exception — confirming
that is your call. No other question or lesson contains driving
penalty/points/fine language ("5 points" hits in Theft Act material are
"points to prove", not penalty points).

### C3. Stale counts in docs and About copy (no change made)
- Docs say **36 mnemonics**; the app now has **40**.
- Settings → About says "reference library of 91 offences and powers"; actual
  is 91 offences **plus 24 powers** (115 cards).

## Verification runs (state after fixes)

| Check | Result |
|---|---|
| esbuild parse of the app | clean |
| Brace/bracket balance, duplicate question ids, duplicate functions | 0 / 0, none, none |
| Question schema (885 questions: unique ids, valid topic, options exactly A–D with 4 distinct non-empty texts, valid `correctOptionId`, explanation present, no extra keys, scenario string-or-null) | all pass |
| Every topic ≥ 25 questions (rule 3) | all 35 topics pass |
| AP mock pools cover exam sizes (rule 5) | AP1 150/20 · AP2 205/40 · AP3 380/40 · AP4 455/40 |
| EXAM_CONFIGS topic ids all valid | pass |
| Flashcards (333), lessons (136 over all 35 topics), offences (91), powers (24), categories, mnemonics (40) — ids unique, shapes valid | pass |
| Statute-abbreviation scan over all displayed strings | clean |
| State contract regenerated from the app (`extract-contract.js`) | byte-identical — no drift |
| Contract tests (`test-contract.cjs`) | **27/27 pass** |
| Web preview bundle (react 18, esbuild, minified) | builds, 1.34 MB |
| Headless-Chromium smoke test: boot → guest sign-in → topic → practice → wrong answer (F1 assert) → flashcards → Constable Companion → untimed custom mock submit (F2 assert) | **all pass, no JS errors** |

Preview-build note: `npx esbuild entry.jsx --bundle …` needs
`NODE_PATH=$PWD/node_modules` (from `preview/`) in a clean checkout, because
the app file sits outside `preview/` and esbuild resolves `react` upward from
`app/`. The CLAUDE.md build command works unchanged wherever a `node_modules`
exists at or above the workspace root.

## Security invariants — re-audited, all still true

- State blobs treated as untrusted: `sanitizeRecordMap` strips
  `__proto__`/`constructor`/`prototype`, enforces plain objects, caps sizes
  (5,000 answered / 100 attempts / 50 real exams); regression-tested in the
  27 contract tests including the prototype-pollution and two-device cases.
- `auth` requires a plain object with string `provider`, else signed out.
- No `localStorage` reference in the app file (the preview shim provides
  `window.storage`).
- No secrets anywhere in app or backend client code: `backend/.env` holds only
  the publishable URL/key (and stays untracked, matching the project's
  gitignore); the service-role key exists only inside the deployed edge
  function, which authenticates callers from their JWT.
- Migration: RLS enabled with all four per-user policies + `on delete cascade`
  + `updated_at` trigger, re-runnable.
- `DEMO_MODE = true` — still the correct value for the prototype; remains a
  release gate before store submission.

## Minor observations (no action needed now)

- The verbal-drill recogniser has no unmount cleanup, but no navigation is
  reachable while recording, so it cannot leak in practice. Worth a cleanup
  effect in the Expo port where OS-level navigation exists.
- `FontLoader` pulls Google Fonts over the network — fine for the web preview;
  the Expo port should bundle fonts.
- Malformed `answered` records from a future cloud blob (plain objects with
  non-numeric counts pass the sanitiser) would hide the accuracy line on Home
  rather than crash — acceptable degradation; tighten `sanitizeRecordMap`
  with a numeric check if you ever see odd stats after sync ships.
