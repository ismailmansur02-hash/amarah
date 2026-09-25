# Prep a Constable — Project Instructions

Commercial iOS/Android revision app for Metropolitan Police PCEP recruits (AP1–AP4
assessments). Owner: Mr Mansur (serving PC). Planned model: £10.99/month subscription.
Current form: `shared/` (content + logic) consumed by a web build (`app/`, `preview/`)
and a React Native build (`native/`)
plus a deployed Supabase backend and an integration package in `backend/`.

## THE CARDINAL RULE — content integrity

**All legal and exam content comes ONLY from documents Mr Mansur supplies.**
Never write, extend, or "fix" legal content (offences, sections, penalties, wording,
questions, lessons, flashcards) from model knowledge. If content is needed that his
source documents don't cover, STOP and flag the gap to him instead — see
`docs/prep-a-constable-CONTENT-GAPS.md` for how gaps are tracked. This rule has
already caught real errors (e.g. a statute year wrong in his own notes). Accuracy
here is an officer-safety issue, not a style preference.

## Hard content rules

1. **Constable Companion (CC) is strictly separate from learning material.**
   CC = operational reference (offences, powers, points to prove, penalties).
   Mnemonics and any learning/study content must NEVER appear in CC. Mnemonics
   live only in the Reference screen. Driving penalties/points/fines are CC-only —
   never in quiz questions or lessons (the ESD drink-drive procedure is the agreed
   exception: it is AP3 learning content).
2. **No abbreviations in any displayed string.** Full statute names always
   ("Police and Criminal Evidence Act 1984", never "PACE"). System names
   (CRIS, CONNECT) are exempt. Hidden data (e.g. speech-matcher `accept` arrays)
   may contain abbreviations.
3. **Questions**: schema is `{ id, topicId, section, scenario|null, stem,
   options:[{id:"A".."D",text}], correctOptionId, explanation }` — one line per
   object. Every topic keeps ≥25 questions. Scenario-based questions put the
   situation in `scenario`, not the stem.
   **Wrong options must match the right one in length and specificity.** 88% of
   the current bank has the correct answer as the longest option, and a
   candidate picking only the longest option passes every AP (see
   `docs/QUESTION-DISTRACTOR-AUDIT.md`). Never write a question whose correct
   option is the detailed one and whose distractors are short dismissals — the
   case citations and capitalised phrases that appear only in correct answers
   are part of the tell. Re-run the audit script after adding questions.
4. **Grading is shuffle-aware.** Options are displayed shuffled via
   `getShuffledOptions(q)`; ALL grading and review displays must use the shuffled
   `correctOptionId`, never the original. (A bug here once marked correct answers
   wrong — don't reintroduce it.)
5. **AP mock exams are scoped strictly** to the topic lists in EXAM_CONFIGS
   (from Mr Mansur's Assessment Points Topics document). Nothing else.

## Validation — run after EVERY structural edit to the app

```bash
# Parse check (esbuild):
node -e "require('child_process').execSync('npx --yes esbuild app/prep-a-constable.jsx --loader:.jsx=jsx --outfile=/tmp/out.js', {stdio:'inherit'})"
# Balance + duplicates:
python3 - <<'EOF'
import re; c=open('app/prep-a-constable.jsx').read()
ids=re.findall(r'\{ id: "(q-[\w-]+)"',c); f=re.findall(r'^function (\w+)',c,re.M)
print('braces',c.count('{')-c.count('}'),'brackets',c.count('[')-c.count(']'))
print('dupe q:',[i for i in set(ids) if ids.count(i)>1] or 'none')
print('dupe fn:',[x for x in set(f) if f.count(x)>1] or 'none')
EOF
```

## State contract — prevent sync drift

The cloud-sync layer uses functions extracted VERBATIM from the app. If you change
`DEFAULT_STATE`, `loadStateFromRaw`, `mergeState`, or the sanitisers in the app:

```bash
node backend/scripts/extract-contract.js shared/state.js
node backend/scripts/test-contract.cjs        # must stay 27/27 passing
```

## Security invariants (already audited — keep them true)

- State blobs from storage/cloud are UNTRUSTED: `sanitizeRecordMap` strips
  `__proto__`/`constructor`/`prototype`, enforces plain objects, caps sizes.
- `auth` must be a plain object with string `provider` or treated as signed out.
- No `localStorage` in the app file (uses `window.storage`; the preview shim in
  `preview/entry.jsx` provides it in browsers).
- No secrets in the app or backend client code. The Supabase service-role key
  exists ONLY inside the deployed edge function.
- `DEMO_MODE` is now `false` (release gate closed). Both builds use real
  Supabase auth; the web falls back to the old fake sign-in ONLY when no
  `window.cloud` is injected.
- Apple and Google sign-in are deliberately NOT offered on native. Neither
  provider is configured, a dead button is a review rejection, and offering any
  third-party sign-in would oblige Sign in with Apple.
- `src/speech.js` guards the `expo-speech-recognition` import. It is a NATIVE
  module: it does NOT exist in Expo Go, and an unguarded import crashes the app
  on launch there. Keep the typed fallback — it is what makes the mic button
  safe to show. Availability is `isAvailable()`, asked on every render, never a
  module constant: dictation can be switched off in iOS Settings while the app
  is backgrounded, and freezing it at load also made the drill tests flaky.
- The app is a **one-off £6.99 paid app**. There is deliberately NO purchase
  code — Apple charges at download. `shared/content/legal.js` says exactly that;
  if the model ever changes to free-with-unlock, the policy, the terms AND a
  StoreKit paywall with Restore Purchases all have to change together. Email magic link only.
- In-app account deletion exists in native Settings. Apple REQUIRES it wherever
  accounts can be created — do not remove it.
- The Legal card on Profile (Privacy Policy, Terms of Service) and the screen it
  opens are a submission requirement, not decoration. The privacy policy must be
  reachable from inside the app.

## Deployed infrastructure (live)

- Supabase project `uqekeszdgeumwjdbompd` (org MET, eu-west-1):
  `user_state` table with RLS on all four verbs + cascade delete; a CHECK
  constraint caps `state` at 4 MiB (pen-test fix); trigger has a pinned
  `search_path`; edge function `delete-account` ACTIVE (JWT-verified).
  RLS isolation pen-tested at the SQL layer (cross-user read/write/impersonation
  all blocked). Advisor: enable leaked-password protection in the dashboard.
- Client keys in `backend/.env` (publishable — safe in the client).
- Still manual in the dashboard: enable Apple/Google/Email auth providers and
  the deep-link redirect URL; RevenueCat products not yet created.

## Repository layout — shared core, two front ends

```
shared/            NO JSX, no platform APIs. The single source of truth.
  content/         TOPICS, QUESTIONS, LESSONS, OFFENCES, POWERS, FLASHCARDS,
                   MNEMONICS, KEY_CASES, TOR_CODES, VERBAL_DRILLS, LEGAL_DOCS,
                   SEARCH_SYNONYMS (the Constable Companion abbreviation map —
                   "ASB", "GBH", "TWOC" must find the same cards on both builds)
  logic.js         shuffle, SRS, scoring, speech matcher, trainingProgress
  state.js         SCHEMA_VERSION, DEFAULT_STATE, sanitisers, mergeState, reducer
  theme.js         the colour palette (C)
app/               WEB UI only (react-dom). Imports everything else from shared/.
preview/           esbuild web bundle -> Netlify
native/            Expo / React Native app (iOS + Android)
```

**Never duplicate content into a platform folder.** Content and logic were moved
into `shared/` VERBATIM — if a question, offence or merge rule needs changing,
change it in `shared/` and BOTH builds get it. The app file is UI only now
(~3.8k lines, down from 12.1k).

## React Native build (`native/`)

```bash
cd native && npm install
npx expo export --platform ios     # proves it bundles; no Mac needed
npx expo start                     # scan the QR with Expo Go on a real iPhone
```

```bash
cd native && npx jest          # 79 render tests — MUST stay green
npx expo-doctor                # 19/21; the 2 failures are network-blocked here
```

**The web build in `app/` is the DESIGN OF RECORD.** Every native screen is a
port of its web counterpart — same sections, same order, same type scale and
colours. Writing a simpler native version of a screen and calling it a port is
the mistake that produced Round 10 in AUDIT.md; if a native screen needs to
change, change the web one first or not at all. `src/Graphics.js` holds the
react-native-svg ports of the web's inline SVG (shield, London skyline, streak
and progress rings, the nav icons).

There is **no iOS Simulator in this container** (Linux, no Xcode) and there
never will be. Mr Mansur has Xcode on his own Mac — `npm run ios` there is
`expo run:ios`, which prebuilds, pod-installs and launches on the simulator.
That is where iOS rendering gets confirmed; nothing in this container can.

Note the simulator has no real microphone, so the Verbal Drill mic is the one
feature it cannot verify — that still needs a physical iPhone.

The native app can also be looked at HERE, and should be, before claiming
anything about how it looks:

```bash
cd native && npx expo export --platform web --output-dir dist-web
# then rename dist-web/_expo -> dist-web/expo-static, make the "/assets/" and
# "/_expo/" paths in index.html and the js bundle relative, and serve it.
```

That renders the REAL React Native app through react-native-web at phone width.
It is not iOS — fonts, safe areas and the date picker are the platform's own —
but it catches what bundling and text assertions miss. It is how the invisible
skyline was found: a bare `<Svg>` is a raw `<svg>` under react-native-web, and
an absolutely-positioned sibling paints straight over it, so illustrations go in
a wrapping `<View>` and are sized through `style`.

The jest tests render screens for real, because "it bundles" would not have
caught the mnemonic bug that shipped on web. `__tests__/app.test.js` renders the
whole App: screen-level tests alone let a missing `useRef` import through, which
would have crashed on launch with every other test green.

`metro.config.js` is load-bearing: `watchFolders` adds `../shared` (outside the
project root, so Metro cannot see it otherwise) and `disableHierarchicalLookup`
stops Metro walking up and pulling a second React out of `preview/node_modules`.

Font faces are required by their own `.ttf` path in `App.js`, never imported
from the `@expo-google-fonts` package root. Those index files `require` every
weight they ship and Metro cannot tree-shake a required asset, so a root import
bundles all of them — it was 41 files and 3.9 MB before this was fixed, against
736 KB now. Keep it that way when adding a face.

## Web preview build

```bash
cd preview && npm install && npm run build
# deploy dist/ to Netlify site "prep-a-constable-preview" (drag-drop or CLI)
```

The `build` script carries `--alias:react=./node_modules/react`. That alias is
REQUIRED: `entry.jsx` imports `../app/prep-a-constable.jsx`, and esbuild resolves
that file's `react` import upward from `app/` — where it never finds
`preview/node_modules`. Without the alias a clean checkout fails with
"Could not resolve react" (this broke the first Netlify build config).

`netlify.toml` at the repo ROOT holds the build config (base
`prep-a-constable/preview`, publish `dist`).

**Deploys are NOT automatic — verified 29 Aug 2026.** The site's production
branch IS `claude/full-app-audit-rraf3e` (correct), but pushes do not start a
build: an empty commit pushed at 14:04Z produced no deploy after 5+ minutes,
and the previously published deploy reports `deploy_source: "api"` with
`has_source_zip: true` — an API source-zip upload, not a git build. The
GitHub→Netlify webhook is not firing. Until that is repaired, a push alone
changes NOTHING on the live site; someone must hit **Deploys → Trigger deploy**
in the dashboard. Do not tell Mr Mansur a push has gone live without checking
the site's current deploy id.

## Web cloud sync (`preview/cloud.js`)

`backend/src/lib/{supabaseClient,auth,persistence}.js` are Expo/React Native
(AsyncStorage, expo-apple-authentication) and CANNOT run in a browser.
`preview/cloud.js` is the web counterpart: magic-link sign-in plus state sync,
exposed as `window.cloud`, mirroring how `entry.jsx` provides `window.storage`.

The sync RULES are not duplicated — the app calls `window.cloud.configure()`
with its OWN `mergeState`/`loadStateFromRaw`/`SCHEMA_VERSION`, so the cloud
merge is byte-identical to the local one and cannot drift from the contract.
The app treats `window.cloud` as OPTIONAL; with it absent it stays local-only,
which is how the Expo build keeps working unchanged.

The anon key in `cloud.js` is publishable by design (RLS gates every row) —
that is not a leak. The SERVICE ROLE key must never appear there.

Requires in the Supabase dashboard: Email provider enabled, and the site URL in
Authentication → URL Configuration → Redirect URLs.

`preview/entry.jsx` imports `../app/prep-a-constable.jsx` — never fork the app file.

## Style

- UK English, Met terminology.
- Terse task execution: Mr Mansur gives short instructions and expects the work
  done and verified, with honest reporting of anything that could not be done.
- Verification-first: claims of "done" are backed by checks actually run.
