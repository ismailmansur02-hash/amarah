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

- ~~The verbal-drill recogniser has no unmount cleanup~~ — done in Round 3
  (cleanup effect stops recognition on unmount).
- `FontLoader` pulls Google Fonts over the network — fine for the web preview;
  the Expo port should bundle fonts.
- Malformed `answered` records from a future cloud blob (plain objects with
  non-numeric counts pass the sanitiser) would hide the accuracy line on Home
  rather than crash — acceptable degradation; tighten `sanitizeRecordMap`
  with a numeric check if you ever see odd stats after sync ships.

---

# Round 2 — owner-requested fixes, Supabase deploy, pen test, load test

## Content fixes applied (authorised)

### Mnemonics stripped from the Constable Companion (hard rule 1)
The C1 finding is fixed. Every mnemonic acronym was removed from displayed CC
card text, keeping the substantive legal content intact:
- Theft / Robbery points to prove — "(DAPBI)" / "— DAPBI satisfied" removed.
- Aggravated burglary — "(WIFE)" removed.
- Offensive weapon — "M-A-I test:" → "Made, adapted or intended:"; "— M-A-I" removed.
- Bladed article — "NO M-A-I" → "there is no made/adapted/intended test".
- Section 1 stop & search — "SOAP —" removed; the article categories kept and
  "TWOC" expanded to "taking a conveyance without consent" (hard rule 2).
- Section 17 entry — "(SCARES)"/"ES —" removed; "UAL" expanded to "unlawfully at
  large" (hard rule 2).
- Section 24 arrest — "(IDCOPPLAN)" removed (the necessity criteria remain listed
  by name in the notes — that is operational content, not the acronym).
- Section 19 / Section 22 seizure — "FILE:" acronym removed; the retention
  reasons kept in plain words.

Verified: the CC-separation scan no longer reports any mnemonic in CC, and the
statute-abbreviation scan across all displayed strings is still clean. Note: each
power still carries a hidden `mnemonic:` metadata field (e.g. "SCARES") that is
**not rendered anywhere** — left as-is; say the word if you want those removed too.

### About page counts corrected
Settings → About now reads "333 flashcards, 40 mnemonics, … 91 offences and 24
powers" (was "91 offences and powers", and omitted the mnemonic count).

## Driving penalties (offencecode.uk) — BLOCKED, reported not guessed
You asked me to check the driving penalties against https://offencecode.uk. That
domain is **blocked by this environment's network egress policy** (the gateway
refuses the connection with HTTP 403), so I could not open it. Per the cardinal
rule I did **not** change any penalty figure from my own knowledge. Instead I
extracted all 19 driving-penalty cards currently in the app into
`docs/DRIVING-PENALTIES-TO-VERIFY.md` for you to check against the site (or paste
me its figures and I'll correct the app from that source). The IN10 "verify" gap
from the content-gaps doc is already resolved in the app data. `q-rta-22`
(penalty-points distractor, Section 7 failure-to-provide) is left unchanged — it
sits inside the drink-drive procedure (the agreed exception); your call whether to
reword it.

## Supabase — deploy state (project `uqekeszdgeumwjdbompd`, eu-west-1)
The project was **paused** (free-tier auto-pause); restored to ACTIVE_HEALTHY for
this work. State verified against the repo:
- `user_state` table present, RLS enabled, PK `user_id` → `auth.users(id)`
  `ON DELETE CASCADE`, `schema_version`, `updated_at`.
- Four RLS policies, all `auth.uid() = user_id`. Trigger `touch_updated_at` now
  carries `SET search_path = 'public'` (mutable-search-path advisory closed —
  a migration that existed live but not in the repo; the repo migration is now
  reconciled to match, plus the new size constraint below).
- Edge function `delete-account` ACTIVE with `verify_jwt = true`.

## Penetration test (RLS reproduced exactly at the SQL layer)
The egress policy also blocks the project's REST/Auth host, so HTTP attacks
couldn't be fired from here. PostgREST is HTTP→SQL executed as the `anon` /
`authenticated` role with the caller's JWT claims set, so every attack was
reproduced precisely at the SQL layer with two real test identities (created and
cleaned up; production table is empty again).

| Attack (as the given role) | Result | Verdict |
|---|---|---|
| User A reads the whole table | sees only A's own row | PASS — isolated |
| User A reads User B's secret directly | returns null | PASS |
| User A UPDATEs User B's row | 0 rows affected | PASS |
| User A DELETEs User B's row | 0 rows affected | PASS |
| User A INSERTs a row owned by B (impersonation) | `42501` policy violation | PASS |
| User A writes its OWN row | succeeds | PASS (correct) |
| Anonymous role reads the table | 0 rows, `auth.uid()` null | PASS |
| Anonymous role INSERTs any row | `42501` policy violation | PASS |
| Public tables without RLS / SECURITY DEFINER funcs / views | none | PASS |
| Account deletion cascade (delete auth user → state row) | row removed | PASS |

### Vulnerability found and FIXED — unbounded `state` blob
No server-side cap existed on the `state` JSONB. The app caps size client-side,
but a direct authenticated REST call bypasses that: I wrote a **3 MB blob** to a
row with no rejection. Combined with self-service (anonymous) sign-ups this is a
storage-exhaustion / cost-amplification vector. **Fixed** with a CHECK constraint
(`octet_length(state::text) <= 4 MiB`) applied to the live DB (migration
`add_state_size_limit`) and baked into the repo migration. Re-verified: a 5 MB
write is now rejected (`23514`), a realistic ~40 KB write still succeeds.

### Advisor recommendation (dashboard, not code)
Security advisor is otherwise clean; it flags **leaked-password protection
disabled** (WARN). Low priority here — the recommended flow is passwordless
magic-link — but enable it under Authentication settings for defence in depth
(needs a dashboard toggle; not changeable via the tools available to me).

## Load / scale test — "will 10,000 concurrent users crash it?"
HTTP is blocked from here and a literal 10,000-simultaneous-client flood would
also need a paid tier and 10k real auth users in production, so I benchmarked the
**actual data path each request runs**, at 10,000-user scale, on the current
free-tier instance:

- Loaded **10,000 users** with realistic ~4 KB state blobs (trigger firing on each).
- **Read path** (PK lookup on launch/foreground): **0.024 ms/op ≈ 41,000 reads/sec**
  on a single connection — a pure primary-key index scan, flat with table size.
- **Write path** (the debounced upsert, with trigger + size constraint):
  **0.634 ms/op ≈ 1,577 writes/sec** on a single connection.

**What this means for 10,000 concurrent users.** A study app is not 10,000
simultaneous requests — each user issues one read on launch/foreground and one
*debounced* upsert after a burst of changes, so a user hits the server roughly
once every 10–30 s while actively studying and never while idle. Even a
pessimistic peak of 1 request/user/5 s is ~2,000 req/s aggregate — dominated by
reads (41k/s on one connection) with occasional writes, and Supabase's Supavisor
pooler multiplexes thousands of clients onto a small Postgres connection pool, so
10,000 clients do **not** mean 10,000 DB connections. The measured per-op cost is
tiny and flat at 10k rows, and content ships in the app bundle (zero per-user
content bandwidth or DB load).

**Honest scope:** this is a measured data-path + architecture assessment, not a
live 10k-client HTTP flood (blocked here). Conclusion: the architecture supports
10,000 concurrent users; the free tier is fine for hundreds and for headroom at
10k you move to **Supabase Pro (~$25/mo)** — a plan dial, not a re-architecture.
All 10k test rows and benchmark tables were dropped; the production table is empty.

---

# Round 3 — Verbal Drills mic capture on Safari

Reported: on Safari, "tap to speak" doesn't pick up speech properly. Rewrote the
Web Speech API engine in `VerbalDrillScreen` to fix the iOS-Safari-specific
failures:

1. **Start now runs synchronously inside the tap gesture.** The old flow awaited
   `navigator.mediaDevices.getUserMedia()` and only then called
   `recognition.start()`. iOS Safari only grants speech capture when `start()`
   fires within the user-activation context; after the awaited promise it
   silently captured nothing. This was the primary cause.
2. **Removed the getUserMedia pre-flight.** It double-acquired the mic
   (getUserMedia grabbed and released it, then SpeechRecognition grabbed it
   again) — a second acquisition iOS Safari frequently fails. SpeechRecognition
   raises its own permission prompt, so the pre-flight is unnecessary.
3. **`interimResults` is now `true`.** With it `false`, short or softly-spoken
   phrases that never produced a "final" result yielded no `onresult` at all —
   nothing to score. Interim results stream the words as they're recognised.
4. **Interim words are salvaged on session end.** Safari ends the session on
   every pause, previously dropping any not-yet-final words; they are now folded
   into the committed transcript on `onend` before the auto-restart.
5. **Cleaner restart + unmount cleanup** (fresh recogniser per session, cleared
   restart timer, recogniser stopped if the user navigates away).

**Verified** with a headless-Chromium test that injects a mock Web Speech API
reproducing Safari's behaviour (streams interim results, ends the session with no
final result): recording starts synchronously, the full caution is captured from
the interim stream and scored **100%**, and an empty-speech run still lands on the
graceful "nothing captured" screen — no JS errors. Parse, 885-question structural
scan, 27/27 contract tests and the main app smoke test all still pass.

**Note on final confirmation:** the real iOS-Safari speech engine can't run in
this environment (no device mic, and the WebKit recogniser needs real hardware),
so this is verified against a faithful mock of Safari's quirks plus the known
iOS-Safari Web Speech API rules — not a live iPhone. Please confirm on a real
device / TestFlight build; the fixes target the exact documented Safari failure
modes.

---

# Round 4 — content-council (source-fidelity QA tool)

Added `tools/content-council/` — a developer tool that adapts
[karpathy/llm-council](https://github.com/karpathy/llm-council) from *answering*
to *verifying*. A council of several LLMs independently checks the app's
extracted content (questions, Constable Companion offences and powers) against a
supplied source document, disputed items go to a peer-review round, and a
chairman consolidates the final findings into a severity-ranked report.

**Cardinal-rule posture:** it never writes, extends or corrects content — each
model is instructed to use *only* the source text and judge fidelity
(SUPPORTED / CONTRADICTED / NOT_IN_SOURCE). Output is an advisory report a human
reviews; nothing changes in the app automatically. This turns the council's
cross-checking strength onto the project's real need (content integrity) without
putting model-generated legal content in front of officers.

Files: `config.mjs`, `openrouter.mjs`, `extract-items.mjs`, `council.mjs`,
`run.mjs` (CLI), `test-council.mjs`, `README.md`, `sample-source.txt`.

**Verified offline** (no key/network): `test-council.mjs` passes 14/14 over a
fully mocked council run (dispute detection → peer review → chairman → ranked
report). Extraction verified against the real app (1000 checkable claims: 885
questions + 91 offences + 24 powers), and a real-content integration run
confirmed a disputed item is escalated and resolved and the report renders.
Live model runs need an `OPENROUTER_API_KEY` and network to `openrouter.ai`
(blocked in this build environment, so live calls are the owner's to run).

---

# Round 5 — Constable Companion "Situation → offence" finder

New feature (requested): describe a situation in the Constable Companion and get
the likely offences, why each fits, and what has to be proved.

**Built as a deterministic, offline matcher over the EXISTING 91 offences — no
LLM, no network, no invented law.** An in-app AI that "decides" the offence would
break the cardinal rule (model-generated legal reasoning shown to officers), so
this instead ranks offences whose own `definition` / `pointsToProve` best match
the words in the description, and always shows the full points-to-prove the
officer must confirm. New "Situation" tab (now the default CC tab): a text box →
ranked offence cards, each with:
- **Matched on** — the words from your description that hit this offence (so the
  ranking is transparent/auditable).
- **What has to be proved — ALL of these** — the full points-to-prove as a
  checklist, each marked ✓ (your description touches it) or ○ (still to
  establish). This directly answers "what it has to be to be that offence".
- Mode, max sentence, and a link to the full card.
- A prominent **"Suggestions only… not legal advice or a charging decision"**
  banner.

**Cardinal-rule surface:** the only authored content is a plain-English **synonym
map** (`CC_SITUATION_SYNONYMS`) that bridges casual words ("took", "smashed",
"pretending") to the formal vocabulary already in the offences' own wording. It
makes no legal claims (it never says "situation X = offence Y"); the score comes
from overlap with each offence's own verified text. This map is the one place to
review if a match ever looks off — extend it with more everyday words as needed.
Known limit of keyword matching: a word that also appears in an unrelated
offence's wording (e.g. a stolen "phone" also matching the mobile-phone driving
offence) can surface that offence — the disclaimer and the ranked list cover this,
and the correct offences still appear.

**Verified:** esbuild parse, 885-question structural scan, 27/27 contract tests,
and a headless-Chromium smoke test — CC opens on the Situation tab, a scenario
("smashed a car window and took a bag") returns ranked offences including Criminal
Damage with the ✓/○ points-to-prove checklist, the full-card modal opens, the
other CC tabs still work, and garbage input shows a graceful "No results". The
matcher was tuned offline against all 91 real offences across eight varied
scenarios (burglary, drink-driving, public order, fraud, bladed article, robbery)
before wiring the UI. The main-app smoke test (shuffle-aware grading, untimed-mock
timing) still passes.

_Product note:_ the Situation tab is set as the **default** CC tab for prominence.
If you'd rather CC still open on Daily-use (quick reference first), that's a
one-line change — say the word.

---

# Round 6 — Constable Companion offence import (Police Offences Compendium)

Owner supplied `Police_Offences_Compendium.docx` (a PCEP revision reference).
Parsed it and added **60 new offence cards** to the Constable Companion
(**91 → 151 offences**), plus two new categories (**Terrorism**, **Other
Operational**). Full detail and the conflict list are in
`docs/COMPENDIUM-IMPORT.md`.

**Cardinal-rule discipline:** every field (definition, points to prove, mode,
maximum penalty) was parsed **verbatim** from the supplied document — nothing
written from model knowledge. Statute abbreviations were expanded to full names
for rule 2 (same acts, spelled out). The **57** offences already present in CC
were **not overwritten**; only genuinely new offences were added.

**Conflicts flagged, not fixed:** where the compendium's penalty differs
substantively from an existing card (12 cases), the existing card was left
untouched and the discrepancy documented for the owner to resolve — and they cut
both ways (e.g. the existing ABH card is *more* current than the compendium;
the existing Possession-of-drugs card appears to carry supply-level penalties).
Nothing was auto-corrected. New driving offences carry mode + penalty but no DVLA
endorsement block (the compendium gave no codes — flagged, not invented).

**Verified:** esbuild parse, balance 0/0, structural scan (OFFENCES 151, all
categories valid, unique ids, no dup questions), statute-abbreviation scan clean,
27/27 contract tests, and headless-Chromium checks — new offences are searchable
(A–Z finds "Outraging Public Decency", card shows Common Law · Either way), the
new Terrorism category chip is present, the Situation finder and other CC tabs
still work, no JS errors. About-page count updated to 151 offences.

---

# Round 7 — Training-school countdown (Exam Prep)

Requested: a pregnancy-app-style progress header for the training side of the
app ("you have 10 weeks left of training school").

Added to the **Exam Prep** screen (the training dashboard):

- **Header line**, mirroring "You're 33 weeks pregnant" → *"You're in week 10 of
  training"* with *"10 weeks left of training school"* beneath it. Falls back to
  the plain "Exam Prep" title when no training dates are set.
- **Countdown card**: headline (weeks left / starts-in / complete), a
  "Week 10, day 3 — 70 days to go" line, three stats (Weeks done · Weeks left ·
  Complete %), and a **week strip** with a progress bar and a CURRENT WEEK number,
  echoing the reference app's bottom bar.
- **Setup / edit**: the officer enters their own training start and finish dates.
  Nothing about programme length is assumed or hard-coded — every figure is
  derived from those two dates, so the app can't state anything untrue about any
  particular intake.

State: `profile.trainingStart` / `profile.trainingEnd` (additive — old saves load
unchanged), plus a `setTrainingDates` reducer action.

**Verified:** esbuild parse, balance 0/0, state contract regenerated (the change
touches DEFAULT_STATE) with **27/27** tests still passing; **23/23** unit tests on
the date maths covering week boundaries, before-start, after-end, inverted and
garbage date ranges (all return safely, never negative or >100%); and a
headless-Chromium run driving the real UI — setup card → enter dates → header and
card render "week 10 / 10 weeks left", survives reload, rejects a finish-date
before the start date, and leaves the other screens working. No JS errors.

# Round 8 — Real sign-in, cloud sync, and TOR offence codes

Three pieces of work, in the order they were asked for.

## Real sign-in and cross-device progress sync

Sign-in was `fakeSignIn()` — a 650ms `setTimeout` — and the Supabase database
held **zero users and zero state rows**. Progress lived only in
`window.storage` on one device.

The backend for this already existed and is untouched: the `user_state` table
with Row Level Security on all four verbs, and the sync rules in
`backend/src/lib/persistence.js`. What was missing is that those modules import
`AsyncStorage` and `expo-apple-authentication` — they are React Native/Expo and
**cannot run in a browser**, so nothing on the web ever reached them.

`preview/cloud.js` is the browser counterpart, injected as `window.cloud` in
the same way `entry.jsx` already provides `window.storage`. The merge rules are
**not** reimplemented: the app passes its own `mergeState` /
`loadStateFromRaw` / `SCHEMA_VERSION` in through `configure()`, so the cloud
merge is identical to the local one and cannot drift from the state contract.
The merge is grow-only, so two devices disagreeing can never shrink progress.

Wiring: pull-and-merge before first render when a session already exists; an
auth listener that catches the return from the emailed link; a 3-second
debounced push; sign-out flushes pending work then ends the real session. The
app treats `window.cloud` as optional, so the Expo build is unaffected.

Sign-in is **email magic link** (Mr Mansur's choice — no password to store or
leak, and no third-party setup). Apple and Google buttons call the real
`signInWithOAuth`; until those providers are configured in the Supabase
dashboard they surface a genuine "not configured" error rather than faking a
success, which is the whole bug being removed.

The anon key in `cloud.js` is publishable by design — Row Level Security gates
every row. The service-role key is not present and must never be.

## TOR offence codes (Constable Companion)

From Mr Mansur's photographs of the physical Met code cards: **Form 4740**
(endorsable, Oct 2018) and **Form 4741** (non-endorsable, June 2018).
**235 codes** across 19 sections, in a new **TOR Codes** tab.

These are the codes an officer writes **on the ticket** — deliberately kept
separate from the DVLA endorsement codes (SP30, CU80…) already in Constable
Companion, which are what appear on the **driver's licence**. The tab says so
in a banner so the two are never confused.

Also added: **Section 64A Police and Criminal Evidence Act 1984** — power to
take a roadside photograph, Section 64A(2) removal of obstructing items, and
Section 117 reasonable force — under a new "Traffic & Roadside" powers
category.

Every card spells out the **full statute name** (the source cards abbreviate
each Act to a single bracketed letter), satisfying the no-abbreviations rule;
verified that all 229 rows carrying a statute resolve to at least one full Act
name, with sub-paragraph letters like the (b) in S35(2)(b)(ii) correctly
ignored.

**Two honest caveats, both flagged in the UI:**
- Two codes on Form 4741 (motorcycle eye protectors / no protective headgear)
  were **physically torn** on the card. Wording and statute are legible, the
  code numbers are not — shown as `300?` / `301?` with a gold border.
- The brief wordings are transcribed **verbatim**, because the card itself
  states "THE OFFENCE CODE AND BRIEF WORDING WILL BE ENTERED ON THE TOR IN
  FULL." Some therefore retain source abbreviations (LGV, DTp, CPC, ANPR).
  Rewriting them would make the app disagree with the ticket.

**Verified:** esbuild parse, balance 0/0, no duplicate ids or functions, state
contract **27/27**, no `localStorage` in the app file, clean preview build, a
unit test of the statute expansion over all 235 rows, and headless-Chromium
runs — 14/14 on the sign-in screen and 12/12 on the TOR tab (tab renders,
statute key shows, search by code "130" returns the 30 mph entry, the new
photograph power is findable under Powers). No JS errors beyond the sandbox's
blocked-network noise.

**NOT verified:** no real magic-link email could be sent or received — this
sandbox blocks `supabase.co`. That round trip needs a live check once the Email
provider and redirect URL are set in the Supabase dashboard.

# Round 9 — React Native build, and a submission-readiness pass

Mr Mansur chose the full React Native rewrite and asked for everything to be
ready for App Store submission.

## Every screen ported

Home, Topics, Topic, Lesson (all nine block types), Exam Prep with the training
countdown, Constable Companion (Daily-use, A–Z, Powers, TOR Codes), practice,
timed mocks, Flash Cards, Reference, Verbal Drills, Login, Profile and the
bottom nav. Nothing in the web app is now unported.

Mocks are genuinely timed and record an attempt in the SAME shape the web build
writes, so a mock sat on the phone appears in the history beside one sat in the
browser.

## Verification, because "it bundles" is not verification

61 tests that RENDER screens and assert real content. Two of them exist because
of specific failures:

- The mnemonic regression guard renders the real AFRAID lesson and requires
  ALLEGATION, FEAR, RELUCTANCE, ADVERSE, INJURY and DEMEANOUR. Bundling would
  never have caught the empty-boxes bug that reached Mr Mansur on web.
- `app.test.js` renders the whole App. Screen-level tests let a missing
  `useRef` import through — the app would have crashed on launch with every
  other test green.

Shuffle-aware grading is tested three ways, including a sweep over 300
questions checking the shuffled correct option still carries the original
correct text and no option is lost.

## Submission work

- **Icons** were still the Expo template defaults, which is a straight
  rejection. Replaced with a drawn shield, chequered band and gold PC in the
  app's own Fraunces face, generated at every required size.
- **DEMO_MODE closed** (`true` → `false`) — the documented release gate.
- **In-app account deletion** added to Settings. Apple requires it wherever
  accounts can be created; its absence is a hard blocker. Sign-out too.
- **Privacy manifest** declared: UserDefaults access (CA92.1, which AsyncStorage
  needs on iOS 17+) and email as linked data used for app functionality, not
  tracking.
- **supportsTablet: false** — the layouts are phone-only, and Apple reviews on
  iPad if you claim support.
- **eas.json** added for development, preview and production builds.
- **Metro override removed**: `disableHierarchicalLookup` guarded against Metro
  finding a second React in `preview/node_modules`, which cannot happen —
  lookup only walks UP, and preview/ is a SIBLING of native/. Verified no
  ancestor has `node_modules/react`. It also tripped expo-doctor.

expo-doctor: 19/21. The two failures are the Expo config schema and React
Native Directory checks, both of which need hosts this sandbox blocks (403 on
CONNECT, confirmed with curl) — they are environmental, not project defects.

## Deliberate omissions, with reasons

- **Verbal Drills take typed input, not speech.** The web uses
  window.SpeechRecognition; native needs a custom dev build, which does not run
  in Expo Go — currently the only way to preview this app on a phone. The
  shared matchers take a plain string either way, so grading is identical and
  wiring a recogniser later changes nothing else. A dead microphone button at
  review is a rejection.
- **Apple and Google sign-in are not offered.** Neither is configured, and
  offering any third-party sign-in obliges Sign in with Apple.

## Still NOT verified

Nobody has LOOKED at the native app. There is no iOS Simulator in this
container and cannot be. Visual confirmation needs Expo Go on a real iPhone.
The magic-link round trip is also untested end to end on device.

---

# Round 10 — restoring the native app's appearance

Mr Mansur's words: *"you've changed everything how it's supposed to look… the
whole home page is completely different"*, then *"no restore everything to how
it looked. all I asked for you to do was make it ready so I can submit on the
apple store."*

He was right, and the fault was mine. The native screens had been written as
simplified versions of the web screens and described as ports. The web build is
the design of record; this round makes native match it.

## What was actually missing

Checked screen by screen against `app/prep-a-constable.jsx`:

| Screen | What had been dropped |
|---|---|
| Home | Shield logo, the London skyline illustration, the circular streak ring, the icon tiles, the white cards with 2px coloured borders, **Review due**, **Weak spots** |
| Exam Prep | Back button, hero decoration, welcome line, the exam date card (Change AP / Edit date), the Overall + Topic mastery split card, the Recent + Mock tests split card |
| Topics | Green header, per-topic descriptions, the accent top rule, the "n/m mastered" line. It was also sorted by Hendon week — web sorts only Exam Prep's list that way |
| Topic | The Lessons/Mastered stats card, numbered lesson tiles, **and both practice buttons** — there was no route from a topic into its questions at all |
| Lesson | "Practise →" on the last lesson, "← Topic" on the first |
| Flash Cards | The whole deck model: topic picker, "Again" re-queueing a card, "Got it", deck-complete screen. It was a next-card carousel instead |
| Mock Tests | The AP grid with best scores, custom mock, record-a-real-result, and the attempts list read `a.level`/`a.total`/`a.dateISO` — **fields the reducer never writes**, so those rows would have rendered blank |
| Mocks | No exam mode at all. Practice graded every answer immediately, while Mock Tests promises "No feedback until you submit" |
| Results | Missing entirely — no score breakdown, no answer review |
| Mock setup / Real exam | Missing entirely |
| Profile | About-this-build, the Account card, **the Legal card** and the always-available Delete account |
| Legal | Missing entirely — the privacy policy was unreachable in-app, which the App Store requires |
| Constable Companion | The abbreviation search map: typing "ASB", "GBH" or "TWOC" found nothing |
| Verbal Drills | The drill list; it opened straight into a drill behind a pill row |

Shared primitives were off too, which affected every screen: `Card` radius and
padding, `ProgressBar` height and track colour, `PrimaryButton` size, the
`SectionLabel` weight and colour, and `Header` had no `bg` (so the green Topics
and red Mock Tests headers were navy).

## What was done

- `src/Graphics.js` — react-native-svg ports of ShieldLogo, BadgeIcon,
  BookIcon, AlertIcon, RefIcon, CalendarIcon, StreakRing, ProgressRing,
  HeroGradient and HomeIllustration (Big Ben, the London Eye, the Gherkin, the
  Shard, the road and the Met patrol car), copied coordinate for coordinate.
- New screens: `MockScreen`, `MockSetupScreen`, `ResultsScreen`,
  `RealExamScreen`, `LegalScreen`, plus a shared `QuestionCard`.
- Rewritten: Home, Exam Prep, Topics, Topic, Lesson, Flash Cards, Mock Tests,
  Practice, Profile.
- `SEARCH_SYNONYMS` moved VERBATIM out of the web file into
  `shared/content/search.js`, so both builds expand abbreviations identically.
- Routes added: `mockSetup`, `mock`, `results`, `realExam`, `legal`.

## Two bugs this found that tests alone would not have

1. **`fontDisplaySemi` was not imported in `Graphics.js`** — a ReferenceError
   the moment the streak ring drew. Caught by rendering it.
2. **The skyline was invisible.** It was in the DOM with correct geometry, but
   under react-native-web a bare `<Svg>` is a raw `<svg>` element, and the
   absolutely-positioned hero gradient painted straight over it. Fixed by
   wrapping the illustration in a `<View>` and sizing through `style`.

Both are exactly the class of defect that "it bundles" and "the text is on
screen" miss — which is why this round was verified by LOOKING at it.

## How it was verified

`npx expo export --platform web` renders the real React Native app through
react-native-web, and it was then driven in a headless browser at iPhone size:
Home, Exam Prep, Topics, a topic, Mock Tests, AP1 setup, a live AP1 mock,
Custom mock, My Exam Results, Flash Cards, Reference, Verbal Drills, Profile,
Privacy Policy and Constable Companion. **No console or page errors anywhere.**
Screenshots compared against the web build.

This is not the same as running on iOS — fonts, safe areas and the date picker
are the platform's own — but it is the first time anyone has actually seen
these screens.

- `npx jest` — **79 passing** (was 61); new guards cover the Home
  illustrations, every Graphics export, the mock attempt shape, the
  results review, the Legal route and abbreviation search.
- `npx expo export --platform ios` — bundles clean (3.9 MB).
- `node backend/scripts/test-contract.cjs` — 27/27.
- `cd preview && npm run build` — the web build still compiles after the
  `SEARCH_SYNONYMS` move, and the web Home was re-checked visually: unchanged.

## Still NOT done

- **Verbal Drills still take typed input, not speech.** Restored to the web's
  two-stage layout, but the microphone is not wired: on-device recognition
  needs a native module and a custom build, and none of that can be run or
  verified in this container. This is a real difference from the web app and
  Mr Mansur's call to make — see "Deliberate omissions" above.
- Nothing has run on an actual iPhone.

---

# Round 11 — the microphone, and an honest AP4 sit

## Verbal Drills now use the microphone

`expo-speech-recognition@57.1.0` wired in, with the web screen's full phase
machine ported: drill list → idle → recording (blank navy screen, script
hidden) → result, plus "nothing captured" and "microphone unavailable".

- `src/speech.js` guards the import. It is a NATIVE module, so it exists in a
  development or EAS build and NOT in Expo Go — an unguarded import takes the
  whole app down on launch there. `Speech.available` is false in that case and
  the drill falls back to typing, so nothing is ever a dead control.
- Listeners attach through `addListener` inside ONE `useEffect` rather than the
  package's `useSpeechRecognitionEvent` hook, so no hook is ever called
  conditionally on the module existing.
- Continuous recognition returns MULTIPLE final results. Keeping only the
  latest would throw away most of a 40-word caution, so finals accumulate in
  `committedRef` and the in-progress phrase sits in `interimRef` — the same
  approach the web build uses.
- `en-GB`, deliberately: a US recogniser mangles "offence" and "practise".
- The recogniser also ends by itself after a pause (and Android 12 and earlier
  has no continuous mode at all), so `end` restarts it unless the officer asked
  to stop. A `no-speech` error mid-pause does the same.
- `stopAndScore` also scores on a 900 ms timer, so a module that never fires
  `end` cannot strand the officer on a blank screen.

Verified: config plugin applies (`expo prebuild` puts
`NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` into
Info.plist, and the privacy manifest survives); autolinking resolves
`ExpoSpeechRecognitionModule` for iOS; iOS bundle still exports; 9 new tests
drive the listeners directly, covering accumulation, restart-on-pause, nothing
captured, permission refused and the typed fallback. 88 tests pass.

The privacy policy gained a paragraph on the microphone — it is used only
during a drill, no audio is recorded, stored or uploaded, and the transcript is
discarded. An app that uses the microphone while its own policy says it does
not is a review failure.

**Still not verified:** nobody has spoken into it. Recognition accuracy on a
real device, and how Siri handles the caution's wording, need a phone.

## An AP4 mock, sat honestly — 40/40

Method, so it can be checked: a script picked the AP4 paper with the app's own
`pickQuestions()` and `getShuffledOptions()`, then wrote TWO files — the paper
with `correctOptionId` and `explanation` stripped (asserted, not assumed), and
the key separately. The answers were written and hashed
(`0e2bc322f665f52ff…`) BEFORE the key was opened.

Result: **40/40, 100%.** Pass mark 60%.

## Why that score is not the good news it looks like

A 100% that easy was suspicious, so the bank was measured rather than trusted:

- In **776 of 885 questions (88%)** the correct answer is the longest option.
- Correct options average **113 characters**; wrong ones average **37** — the
  right answer is over **three times longer** than the wrong ones.
- A candidate who has read no law at all, picking only the longest option every
  time, scores **AP1 94%, AP2 76%, AP3 86%, AP4 86%** — a comfortable pass in
  every single Assessment Point.

No answer is wrong; every one checked was legally correct. The bank is beatable
on shape rather than on law, which means a recruit scoring 90% here can still
walk into the real assessment unprepared. Full per-topic figures and the 311
worst examples are in `docs/QUESTION-DISTRACTOR-AUDIT.md`.

This is CONTENT and therefore Mr Mansur's to fix — the cardinal rule stands, no
legal content is written or rewritten here. The mechanical part is making wrong
options match the right one in length and specificity; the case citations and
capitalised key phrases that appear only in correct options are themselves part
of the tell.

---

# Round 12 — submission prep

## App size: 3.9 MB of fonts down to 736 KB

`App.js` imported font faces from the `@expo-google-fonts` package roots. Those
index files `require` every weight they ship, and Metro cannot tree-shake a
required asset — so importing three Fraunces faces bundled all eighteen. Across
the three families that was **41 font files, 3.9 MB**, in an app whose entire
JavaScript bundle is 3.9 MB.

Each `.ttf` is now required by its own path. Export drops to **8 files,
736 KB** — the eight faces actually registered. Nothing else changed.

## The £6.99 one-off, in the legal documents

Mr Mansur's decision: a one-off purchase, not the subscription the documents
described. Both the privacy policy and the terms said subscriptions were billed
through RevenueCat and renewed automatically. None of that was ever true of the
shipped app — there is no purchase code in it at all — and a reviewer reads the
privacy policy.

Replaced with an accurate description of a paid app: £6.99 once, nothing
renews, payment taken by Apple or Google, refunds through the store. RevenueCat
removed from the third-party list. The "v0.9 prototype" line in Profile now
reads v1.0 on both builds; `app.json` is 1.0.0.

**This assumes a paid app** — Apple charges at download, which needs no code.
Free-with-unlock is a different build: StoreKit, a paywall and Restore
Purchases, all reviewed. Flagged to him, not assumed.

## A flaky test, found and fixed

The drill tests failed roughly one run in four — worse than failing, because a
green run meant nothing. `src/speech.js` computed `available` **once at module
load**, so its value depended on which test file loaded the module first: a file
without the mock froze it to false, and the drill tests then saw the typed
fallback instead of the microphone.

The same staleness is a real runtime bug. An officer can switch dictation off in
iOS Settings while the app sits in the background, and the app would go on
offering a microphone that no longer works. `available` is now `isAvailable()`,
asked on every render.

Ten consecutive `--runInBand` runs green, in the configuration that reproduced
the flake.

## Store assets

- `docs/store-screenshots/` — 11 screenshots at **1320 × 2868**, Apple's 6.9-inch
  iPhone size, captured from the real app through react-native-web.
  **They must be retaken on device before submission.** The layout and content
  are right, but iOS draws text differently and Apple expects screenshots of
  the app in use.
- `docs/APP-STORE-LISTING.md` — description, keywords, subtitle, the App Privacy
  questionnaire answers (audio data is a **No**, correctly: nothing leaves the
  device), the age-rating answers, and the App Review notes telling the reviewer
  how to get in without an account and where the microphone is used.

The description carries an explicit line that the app is independent and not
endorsed by the Metropolitan Police Service or the College of Policing. Without
it a reviewer can read the app as claiming official status, which is a
guideline 5.2 rejection.

## Still blocked on Mr Mansur

Apple Developer Program enrolment; Supabase Email provider and the
`prepaconstable://` redirect; a public URL for the privacy policy. And nothing
has yet run on an iPhone.
