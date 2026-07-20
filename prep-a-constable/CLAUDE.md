# Prep a Constable — Project Instructions

Commercial iOS/Android revision app for Metropolitan Police PCEP recruits (AP1–AP4
assessments). Owner: Mr Mansur (serving PC). Planned model: £10.99/month subscription.
Current form: single-file React prototype (`app/prep-a-constable.jsx`, ~10k lines)
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
node backend/scripts/extract-contract.js app/prep-a-constable.jsx
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
- `DEMO_MODE = true` is a RELEASE GATE — must be `false` before store submission,
  replaced by real Supabase auth (see `backend/src/lib/auth.js`).

## Deployed infrastructure (live)

- Supabase project `uqekeszdgeumwjdbompd` (org MET, eu-west-1):
  `user_state` table with RLS on all four verbs + cascade delete; security
  advisor clean; edge function `delete-account` ACTIVE (JWT-verified).
- Client keys in `backend/.env` (publishable — safe in the client).
- Still manual in the dashboard: enable Apple/Google/Email auth providers and
  the deep-link redirect URL; RevenueCat products not yet created.

## Web preview build

```bash
cd preview && npm i react@18 react-dom@18 esbuild && \
npx esbuild entry.jsx --bundle --loader:.jsx=jsx --minify \
  --define:process.env.NODE_ENV='"production"' --outfile=dist/bundle.js && cp index.html dist/
# deploy dist/ to Netlify site "prep-a-constable-preview" (drag-drop or CLI)
```

`preview/entry.jsx` imports `../app/prep-a-constable.jsx` — never fork the app file.

## Style

- UK English, Met terminology.
- Terse task execution: Mr Mansur gives short instructions and expects the work
  done and verified, with honest reporting of anything that could not be done.
- Verification-first: claims of "done" are backed by checks actually run.
