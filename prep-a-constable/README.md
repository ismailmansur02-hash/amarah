# Prep a Constable — project workspace

Open this folder with Claude Code and it will read `CLAUDE.md` automatically —
that file carries every project rule (content integrity, CC separation,
validation commands, the deployed Supabase details, release gates).

Layout:
- `app/prep-a-constable.jsx` — the entire app (single-file React prototype)
- `backend/` — Supabase + RevenueCat integration package (tests: `node backend/scripts/test-contract.cjs`)
- `preview/` — web preview build (see CLAUDE.md for the build command)
- `docs/` — backend spec, content gaps, launch status

Claude Code docs: https://docs.claude.com/en/docs/claude-code/overview
