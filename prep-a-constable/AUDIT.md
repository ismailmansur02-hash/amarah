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
