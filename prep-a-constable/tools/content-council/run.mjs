#!/usr/bin/env node
// ============================================================================
// run.mjs — CLI. Verify the app's content against a source document.
//
//   OPENROUTER_API_KEY=sk-or-... node run.mjs --source ./theft-act.txt --type offence
//
// Flags:
//   --source <file>   (required) Mr Mansur's source document (plain text)
//   --type <t>        question | offence | power | all   (default: all)
//   --topic <id>      only questions for this topic id (e.g. theft-act-1968)
//   --out <file>      report path (default: ./content-council-report.md)
//   --app <file>      app source (default: ../../app/prep-a-constable.jsx)
//   --limit <n>       cap number of items (handy for a cheap first run)
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { loadAppData, buildClaims } from "./extract-items.mjs";
import { runCouncil, buildReport } from "./council.mjs";
import { OPENROUTER_API_KEY, COUNCIL_MODELS } from "./config.mjs";

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const sourceFile = arg("source");
const type = arg("type", "all");
const topic = arg("topic", null);
const outFile = arg("out", "content-council-report.md");
const appFile = arg("app", null);
const limit = arg("limit", null);

if (!sourceFile) {
  console.error("Missing --source <file>. See tools/content-council/README.md.");
  process.exit(2);
}
if (!fs.existsSync(sourceFile)) { console.error(`Source not found: ${sourceFile}`); process.exit(2); }
if (!OPENROUTER_API_KEY) {
  console.error([
    "OPENROUTER_API_KEY is not set.",
    "Get a key at https://openrouter.ai/ and run:",
    "  OPENROUTER_API_KEY=sk-or-... node run.mjs --source <file>",
    "To try the orchestration with NO key/network, run the offline test:",
    "  node test-council.mjs",
  ].join("\n"));
  process.exit(2);
}

const source = fs.readFileSync(sourceFile, "utf8");
console.error(`Loading app content…`);
const D = await loadAppData(appFile || undefined);
let items = buildClaims(D, { type, topic });
if (limit) items = items.slice(0, Number(limit));
console.error(`Verifying ${items.length} item(s) [type=${type}${topic ? `, topic=${topic}` : ""}] against ${path.basename(sourceFile)} with ${COUNCIL_MODELS.length} models…`);

const result = await runCouncil({ source, items, onProgress: (m) => console.error("  " + m) });
const report = buildReport(result, { sourceName: path.basename(sourceFile) });
fs.writeFileSync(outFile, report);
fs.writeFileSync(outFile.replace(/\.md$/, "") + ".json", JSON.stringify(result.findings, null, 2));

const c = {};
for (const f of result.findings) c[f.verdict] = (c[f.verdict] || 0) + 1;
console.error(`\nDone. ${JSON.stringify(c)}`);
console.error(`Report:   ${outFile}`);
console.error(`Findings: ${outFile.replace(/\.md$/, "")}.json`);
if (c.CONTRADICTED) console.error(`\n⚠  ${c.CONTRADICTED} CONTRADICTED item(s) — review these first.`);
