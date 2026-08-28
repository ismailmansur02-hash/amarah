# Prep a Constable

Revision and reference app for Metropolitan Police PCEP recruits (AP1–AP4
assessments).

Everything lives in **[prep-a-constable/](prep-a-constable/)**:

| Path | What it is |
|---|---|
| [prep-a-constable/app/](prep-a-constable/app/) | The app — a single-file React prototype |
| [prep-a-constable/backend/](prep-a-constable/backend/) | Supabase + RevenueCat integration package (auth, cloud sync, payments, account deletion) |
| [prep-a-constable/preview/](prep-a-constable/preview/) | Web preview build (deployed to Netlify) |
| [prep-a-constable/docs/](prep-a-constable/docs/) | Backend spec, content gaps, launch status, content imports |
| [prep-a-constable/tools/](prep-a-constable/tools/) | Developer QA tooling |
| [prep-a-constable/AUDIT.md](prep-a-constable/AUDIT.md) | Full audit log — every fix, test and finding |
| [prep-a-constable/CLAUDE.md](prep-a-constable/CLAUDE.md) | Project rules — read this first |

## What it contains

885 exam-style questions across 35 topics, 136 lessons, 333 flashcards,
40 mnemonics, AP-scoped mock exams, spaced repetition, verbal drills with speech
recognition, and a Constable Companion operational reference of 151 offences and
24 powers with points to prove.

## The cardinal rule

All legal and exam content comes **only** from source documents supplied by the
owner — never written or "corrected" from model knowledge. Gaps are flagged, not
filled. See [prep-a-constable/CLAUDE.md](prep-a-constable/CLAUDE.md).

## Web preview

```bash
cd prep-a-constable/preview
npm install && npm run build     # outputs dist/
```

Deployed automatically to Netlify from this branch (see `netlify.toml`).

> **Note:** this branch contains the Prep a Constable app only. An unrelated
> trading-bot project lives on a separate branch in this repository.
