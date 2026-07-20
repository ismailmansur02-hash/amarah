// ============================================================================
// extract-items.mjs — pull "checkable claims" out of the app bundle.
//
// The app's content lives as module-level consts inside the single JSX file.
// We compile it with esbuild (React stubbed), read the data arrays, and turn
// each content record into a compact claim the council can verify against a
// source document. No content is altered — this is read-only.
// ============================================================================

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// tools/content-council -> ../../app/prep-a-constable.jsx
const DEFAULT_APP = path.resolve(here, "..", "..", "app", "prep-a-constable.jsx");

// Compile the app and return its data arrays.
export async function loadAppData(appPath = DEFAULT_APP) {
  if (!fs.existsSync(appPath)) throw new Error(`App source not found: ${appPath}`);
  const src = fs.readFileSync(appPath, "utf8");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "council-"));
  const stub = path.join(tmp, "react.js");
  fs.writeFileSync(stub, `
    const noop = () => {};
    const mod = { useState:(v)=>[typeof v==='function'?v():v,noop], useEffect:noop,
      useReducer:(r,i,init)=>[init?init(i):i,noop], useRef:(v)=>({current:v}),
      useMemo:(f)=>f(), useCallback:(f)=>f, createElement:(...a)=>({__el:a}), Fragment:'F' };
    mod.default = mod; module.exports = mod;`);
  const inFile = path.join(tmp, "app.jsx");
  const outFile = path.join(tmp, "app.cjs");
  fs.writeFileSync(inFile, src + `
export const __DATA = { TOPICS, EXAM_CONFIGS, QUESTIONS, FLASHCARDS, MNEMONICS, KEY_CASES, LESSONS, OFFENCE_CATEGORIES, OFFENCES, POWER_CATEGORIES, POWERS, VERBAL_DRILLS };`);
  execFileSync("npx", ["--yes", "esbuild", inFile, "--loader:.jsx=jsx", "--bundle",
    "--format=cjs", "--platform=node", `--alias:react=${stub}`, `--outfile=${outFile}`],
    { stdio: ["ignore", "ignore", "inherit"] });
  const mod = await import(pathToFileURL(outFile));
  const D = (mod.default && mod.default.__DATA) || mod.__DATA;
  fs.rmSync(tmp, { recursive: true, force: true });
  return D;
}

// Turn app records into { id, type, topicId, text } claims. `text` is a compact,
// human-readable statement of everything factual the item asserts.
export function buildClaims(D, { type = "all", topic = null } = {}) {
  const claims = [];
  const wantQ = type === "all" || type === "question";
  const wantO = type === "all" || type === "offence";
  const wantP = type === "all" || type === "power";

  if (wantQ) {
    for (const q of D.QUESTIONS) {
      if (topic && q.topicId !== topic) continue;
      const correct = (q.options.find((o) => o.id === q.correctOptionId) || {}).text || "";
      const lines = [
        `QUESTION (${q.section}).`,
        q.scenario ? `Scenario: ${q.scenario}` : null,
        `Stem: ${q.stem}`,
        `Stated correct answer: ${correct}`,
        `Explanation given: ${q.explanation}`,
      ].filter(Boolean);
      claims.push({ id: q.id, type: "question", topicId: q.topicId, text: lines.join("\n") });
    }
  }
  if (wantO) {
    for (const o of D.OFFENCES) {
      const e = o.endorsement;
      const lines = [
        `OFFENCE: ${o.title} — ${o.section} ${o.act}.`,
        o.definition ? `Definition: ${o.definition}` : null,
        Array.isArray(o.pointsToProve) ? `Points to prove: ${o.pointsToProve.join("; ")}` : null,
        `Mode of trial: ${o.mode}. Maximum sentence: ${o.sentence}.`,
        e ? `Endorsement code ${e.code}, points ${e.points}, fine/disposal: ${e.fine}.` : null,
        o.notes ? `Notes: ${o.notes}` : null,
      ].filter(Boolean);
      claims.push({ id: o.id, type: "offence", topicId: null, text: lines.join("\n") });
    }
  }
  if (wantP) {
    for (const p of D.POWERS) {
      const lines = [
        `POWER: ${p.title} — ${p.section} ${p.act}.`,
        p.grounds ? `Grounds: ${p.grounds}` : null,
        p.where ? `Where it applies: ${p.where}` : null,
        p.notes ? `Notes: ${p.notes}` : null,
      ].filter(Boolean);
      claims.push({ id: p.id, type: "power", topicId: null, text: lines.join("\n") });
    }
  }
  return claims;
}
