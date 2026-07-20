# content-council — a source-fidelity checker for the app's content

A **developer/QA tool** (not shipped in the app). It runs a "council" of several
LLMs that independently check the app's extracted content — questions, Constable
Companion offences and powers — against **Mr Mansur's supplied source document**,
and flags anything that doesn't match. It is adapted from
[karpathy/llm-council](https://github.com/karpathy/llm-council): same idea
(several models + peer review + a chairman), but pointed at *verification* instead
of answering.

## Why this is safe under the cardinal rule

The cardinal rule is: **all legal content comes only from Mr Mansur's source
documents; never invent or "improve" it from model knowledge.** This tool does
**not** write, extend, or correct any content. It only answers, per item:

> *Does the supplied source text support this, contradict it, or not cover it?*

Every model is told to use **only** the source text, never outside knowledge, and
never to rewrite anything. The output is an advisory report a human reviews.
`CONTRADICTED` findings are the real red flags (a wrong section, penalty, points,
mode of trial, stated answer, or wording); `NOT_IN_SOURCE` usually just means this
particular source doesn't cover that item. Nothing changes in the app
automatically.

## How it works

1. **Stage 1 — independent check.** Each council model verifies every item
   against the source on its own.
2. **Stage 2 — peer review.** Items where the models *disagree* are re-judged:
   each model sees the others' anonymised verdicts and reconsiders.
3. **Stage 3 — chairman.** One model makes the final call on the disputed items
   and writes an executive summary of the contradictions.

Output: `content-council-report.md` (grouped by severity, CONTRADICTED first) and
`content-council-report.json` (machine-readable findings).

## Setup

Needs Node 18+ (uses native `fetch`) and, for live runs, an
[OpenRouter](https://openrouter.ai/) API key with credits.

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

Edit `config.mjs` to choose the council models and the chairman. Use several
*different* providers — the whole value is that one model's blind spot is caught
by the others.

## Usage

```bash
# Check the Constable Companion offence cards against a source document:
OPENROUTER_API_KEY=sk-or-... node run.mjs --source ./theft-act-source.txt --type offence

# Check just one topic's questions:
node run.mjs --source ./ap4-notes.txt --type question --topic vulnerability

# Everything (questions + offences + powers) — larger/pricier run:
node run.mjs --source ./source.txt --type all

# Cheap first pass — cap the item count:
node run.mjs --source ./source.txt --type offence --limit 10
```

Flags: `--source <file>` (required), `--type question|offence|power|all`,
`--topic <id>`, `--out <file>`, `--limit <n>`, `--app <path>`.

## Verify the tool itself (no key, no network)

```bash
node test-council.mjs      # 14 assertions over a fully mocked council run
```

This injects fake models so the whole 3-stage flow (dispute detection, peer
review, chairman consolidation, report ranking) is tested offline. Run it after
any change to the orchestration.

## Cost & environment notes

- Live runs call paid model APIs via OpenRouter. Cost scales with item count ×
  models × stages, so start with `--limit` and one `--type`. Verifying all 1000
  items across four models is a real spend — do it deliberately.
- Some sandboxes (including the one this was built in) block outbound access to
  `openrouter.ai`; live runs must be done where that host is reachable. The
  offline test above needs no network.
- `--type all` currently covers questions, Constable Companion offences, and
  powers. Lessons/flashcards can be added in `extract-items.mjs` the same way.
