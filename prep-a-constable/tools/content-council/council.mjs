// ============================================================================
// council.mjs — 3-stage source-grounded verification council.
//
//   Stage 1  Each model INDEPENDENTLY checks every item against the source.
//   Stage 2  Items where models DISAGREE go to a peer-review round (each model
//            sees the others' anonymised verdicts and reconsiders).
//   Stage 3  The chairman makes the final call on disputed items and writes an
//            executive summary of the real problems (CONTRADICTED items).
//
// The model-query function is injected so the whole flow is unit-testable with
// no network (see test-council.mjs).
// ============================================================================

import { queryModel as realQueryModel, extractJson } from "./openrouter.mjs";
import { COUNCIL_MODELS, CHAIRMAN_MODEL, BATCH_SIZE } from "./config.mjs";

export const VERDICTS = ["SUPPORTED", "CONTRADICTED", "NOT_IN_SOURCE"];
const normVerdict = (v) => {
  const u = String(v || "").toUpperCase().replace(/[^A-Z_]/g, "");
  return VERDICTS.includes(u) ? u : "UNVERIFIED";
};

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// ---- Prompts ---------------------------------------------------------------

const RULE = `You are a meticulous UK police-law CONTENT VERIFIER for a study app.
You are given a SOURCE TEXT and CONTENT ITEMS extracted from the app.
Judge ONLY whether each item is faithful to the SOURCE TEXT.
CRITICAL RULES:
- Use ONLY the source text. Do NOT use outside knowledge.
- Do NOT rewrite, improve, or invent any content. You only judge fidelity.
- "CONTRADICTED" means the source says something DIFFERENT (wrong section number,
  penalty, points, mode of trial, stated answer, or wording). This is what matters most.
- "NOT_IN_SOURCE" means the source neither supports nor contradicts it.
- "SUPPORTED" means the source clearly backs the item.`;

export function verificationMessages(source, items) {
  const itemsJson = JSON.stringify(items.map((i) => ({ id: i.id, text: i.text })), null, 0);
  return [{
    role: "user",
    content: `${RULE}

Return STRICT JSON only: an array of objects
{"id": "<item id>", "verdict": "SUPPORTED|CONTRADICTED|NOT_IN_SOURCE", "source_quote": "<short exact quote from the source that decides it, or empty>", "note": "<one short sentence>"}

SOURCE TEXT:
"""
${source}
"""

ITEMS:
${itemsJson}`,
  }];
}

export function peerReviewMessages(source, item, anonVerdicts) {
  const shown = anonVerdicts.map((v, i) => `Reviewer ${i + 1}: ${v.verdict} — ${v.note || ""}`).join("\n");
  return [{
    role: "user",
    content: `${RULE}

The reviewers disagreed about ONE item. Re-judge it yourself against the source and give your FINAL verdict.

ITEM (${item.id}):
${item.text}

OTHER REVIEWERS (anonymised):
${shown}

SOURCE TEXT:
"""
${source}
"""

Return STRICT JSON only: {"id": "${item.id}", "verdict": "SUPPORTED|CONTRADICTED|NOT_IN_SOURCE", "source_quote": "<quote or empty>", "note": "<one sentence>"}`,
  }];
}

export function chairmanMessages(source, disputed) {
  const body = disputed.map((d) => {
    const verds = d.allVerdicts.map((v, i) => `  reviewer ${i + 1}: ${v.verdict}${v.note ? " — " + v.note : ""}`).join("\n");
    return `ITEM ${d.item.id}:\n${d.item.text}\nVERDICTS:\n${verds}`;
  }).join("\n\n---\n\n");
  return [{
    role: "user",
    content: `${RULE}

You are the CHAIRMAN. For each DISPUTED item below, make the final verdict grounded ONLY in the source, then write a brief executive summary highlighting any CONTRADICTED items (the real problems).

${body}

SOURCE TEXT:
"""
${source}
"""

Return STRICT JSON only:
{"final": [{"id": "...", "verdict": "SUPPORTED|CONTRADICTED|NOT_IN_SOURCE", "note": "<one sentence>"}], "summary": "<3-6 sentence executive summary>"}`,
  }];
}

// ---- Orchestration ---------------------------------------------------------

const majority = (verdicts) => {
  const counts = {};
  for (const v of verdicts) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "UNVERIFIED";
};

export async function runCouncil({
  source,
  items,
  models = COUNCIL_MODELS,
  chairmanModel = CHAIRMAN_MODEL,
  queryModel = realQueryModel,
  batchSize = BATCH_SIZE,
  onProgress = () => {},
} = {}) {
  if (!source || !source.trim()) throw new Error("Empty source text.");
  if (!items || !items.length) throw new Error("No items to verify.");

  // ---- Stage 1: independent verification ----
  const perModel = {};            // model -> { id -> {verdict, source_quote, note} }
  for (const m of models) perModel[m] = {};
  const batches = chunk(items, batchSize);
  for (let b = 0; b < batches.length; b++) {
    onProgress(`Stage 1: verifying batch ${b + 1}/${batches.length} across ${models.length} models`);
    const msgs = verificationMessages(source, batches[b]);
    const raws = await Promise.all(models.map((m) => queryModel(m, msgs)));
    models.forEach((m, i) => {
      const parsed = extractJson(raws[i]) || [];
      for (const row of Array.isArray(parsed) ? parsed : []) {
        if (row && row.id) perModel[m][row.id] = {
          verdict: normVerdict(row.verdict),
          source_quote: row.source_quote || "",
          note: row.note || "",
        };
      }
    });
  }

  // ---- Consensus / dispute detection ----
  const respondingModels = models.filter((m) => Object.keys(perModel[m]).length > 0);
  const disputed = [];
  const consensus = {};           // id -> {verdict, quote, note, byModel}
  for (const it of items) {
    const byModel = {};
    const verdicts = [];
    for (const m of respondingModels) {
      const r = perModel[m][it.id];
      if (r) { byModel[m] = r; verdicts.push(r.verdict); }
    }
    const uniq = [...new Set(verdicts)];
    if (verdicts.length === 0) {
      consensus[it.id] = { verdict: "UNVERIFIED", quote: "", note: "No model returned a verdict.", byModel };
    } else if (uniq.length === 1) {
      const q = Object.values(byModel).find((r) => r.source_quote)?.source_quote || "";
      const n = Object.values(byModel).find((r) => r.note)?.note || "";
      consensus[it.id] = { verdict: uniq[0], quote: q, note: n, byModel };
    } else {
      disputed.push({
        item: it,
        allVerdicts: respondingModels.map((m) => byModel[m]).filter(Boolean),
        byModel,
      });
    }
  }

  // ---- Stage 2: peer review of disputed items ----
  for (const d of disputed) {
    onProgress(`Stage 2: peer review of disputed item ${d.item.id}`);
    const anon = d.allVerdicts;
    const raws = await Promise.all(respondingModels.map((m) => queryModel(m, peerReviewMessages(source, d.item, anon))));
    d.peerVerdicts = raws.map((r) => {
      const p = extractJson(r);
      return p ? { verdict: normVerdict(p.verdict), source_quote: p.source_quote || "", note: p.note || "" } : null;
    }).filter(Boolean);
  }

  // ---- Stage 3: chairman ----
  let summary = "";
  const chairFinal = {};          // id -> {verdict, note}
  if (disputed.length) {
    onProgress(`Stage 3: chairman consolidating ${disputed.length} disputed item(s)`);
    const withPeer = disputed.map((d) => ({
      item: d.item,
      allVerdicts: [...d.allVerdicts, ...(d.peerVerdicts || [])],
    }));
    const raw = await queryModel(chairmanModel, chairmanMessages(source, withPeer));
    const parsed = extractJson(raw) || {};
    summary = parsed.summary || "";
    for (const row of Array.isArray(parsed.final) ? parsed.final : []) {
      if (row && row.id) chairFinal[row.id] = { verdict: normVerdict(row.verdict), note: row.note || "" };
    }
  }

  // ---- Final findings ----
  const findings = items.map((it) => {
    if (consensus[it.id]) {
      const c = consensus[it.id];
      return { id: it.id, type: it.type, topicId: it.topicId, verdict: c.verdict,
        quote: c.quote, note: c.note, byModel: c.byModel, disputed: false };
    }
    const d = disputed.find((x) => x.item.id === it.id);
    const all = [...d.allVerdicts, ...(d.peerVerdicts || [])];
    const chair = chairFinal[it.id];
    const finalVerdict = chair?.verdict && chair.verdict !== "UNVERIFIED"
      ? chair.verdict
      : majority(all.map((v) => v.verdict));
    const quote = all.find((v) => v.source_quote)?.source_quote || "";
    return { id: it.id, type: it.type, topicId: it.topicId, verdict: finalVerdict,
      quote, note: chair?.note || all.find((v) => v.note)?.note || "",
      byModel: d.byModel, disputed: true };
  });

  return { findings, consensus, disputed, perModel, respondingModels, summary,
    models, chairmanModel, itemCount: items.length };
}

// ---- Report ----------------------------------------------------------------

const SEVERITY = { CONTRADICTED: 0, UNVERIFIED: 1, NOT_IN_SOURCE: 2, SUPPORTED: 3 };

export function buildReport(result, meta = {}) {
  const { findings, summary, models, chairmanModel, respondingModels, disputed, itemCount } = result;
  const counts = {};
  for (const f of findings) counts[f.verdict] = (counts[f.verdict] || 0) + 1;
  const byVerdict = (v) => findings.filter((f) => f.verdict === v)
    .sort((a, b) => a.id.localeCompare(b.id));

  const L = [];
  L.push(`# Content-Council verification report`);
  L.push("");
  L.push(`- Source: \`${meta.sourceName || "(unknown)"}\``);
  L.push(`- Items checked: **${itemCount}**  ·  disputed & escalated: **${disputed.length}**`);
  L.push(`- Council: ${models.join(", ")}`);
  L.push(`- Chairman: ${chairmanModel}`);
  L.push(`- Models that responded: ${respondingModels.length}/${models.length}`);
  L.push(`- Generated: ${new Date().toISOString()}`);
  L.push("");
  L.push(`**Tally** — ` + VERDICTS.concat(["UNVERIFIED"]).map((v) => `${v}: ${counts[v] || 0}`).join("  ·  "));
  L.push("");
  L.push(`> This report is advisory. It judges only whether the app's content is faithful to the`);
  L.push(`> supplied source — it never rewrites content. A human reviews every finding. **CONTRADICTED**`);
  L.push(`> items are the real red flags; **NOT_IN_SOURCE** usually just means this source doesn't cover that item.`);
  L.push("");
  if (summary) { L.push(`## Chairman's summary`); L.push(""); L.push(summary); L.push(""); }

  const renderFinding = (f) => {
    const who = Object.entries(f.byModel || {}).map(([m, r]) => `${m.split("/").pop()}=${r.verdict}`).join(", ");
    L.push(`### \`${f.id}\` (${f.type})${f.disputed ? " — was disputed" : ""}`);
    if (f.note) L.push(`- ${f.note}`);
    if (f.quote) L.push(`- Source says: “${f.quote}”`);
    if (who) L.push(`- Per model: ${who}`);
    L.push("");
  };

  L.push(`## CONTRADICTED — review these first (${counts.CONTRADICTED || 0})`);
  L.push("");
  if (!(counts.CONTRADICTED)) L.push("_None — no item contradicted the source._\n");
  else byVerdict("CONTRADICTED").forEach(renderFinding);

  if (counts.UNVERIFIED) {
    L.push(`## UNVERIFIED — models failed to return a verdict (${counts.UNVERIFIED})`);
    L.push("");
    byVerdict("UNVERIFIED").forEach(renderFinding);
  }

  L.push(`## NOT_IN_SOURCE — not covered by this source (${counts.NOT_IN_SOURCE || 0})`);
  L.push("");
  L.push(byVerdict("NOT_IN_SOURCE").map((f) => `- \`${f.id}\` (${f.type})`).join("\n") || "_None._");
  L.push("");
  L.push(`## SUPPORTED — faithful to the source (${counts.SUPPORTED || 0})`);
  L.push("");
  L.push(byVerdict("SUPPORTED").map((f) => `- \`${f.id}\` (${f.type})`).join("\n") || "_None._");
  L.push("");
  return L.join("\n");
}
