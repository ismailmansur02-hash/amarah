// ============================================================================
// openrouter.mjs — thin OpenRouter client (native fetch) + tolerant JSON parse.
//
// One real dependency: an OPENROUTER_API_KEY and network access to
// openrouter.ai. The orchestration in council.mjs takes the query function by
// injection, so it can be unit-tested with a fake model with no network at all
// (see test-council.mjs).
// ============================================================================

import { OPENROUTER_API_URL, OPENROUTER_API_KEY, REQUEST_TIMEOUT_MS } from "./config.mjs";

// Query a single model. Returns the assistant message string, or null on failure.
export async function queryModel(model, messages, { timeout = REQUEST_TIMEOUT_MS } = {}) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set (see tools/content-council/README.md).");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "prep-a-constable content-council",
      },
      body: JSON.stringify({
        model,
        messages,
        // Low temperature: we want deterministic verification, not creativity.
        temperature: 0,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`  [${model}] HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error(`  [${model}] request failed: ${e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Query many models concurrently. Returns { [model]: content|null }.
export async function queryModelsParallel(models, messages, opts) {
  const results = await Promise.all(
    models.map(async (m) => [m, await queryModel(m, messages, opts)])
  );
  return Object.fromEntries(results);
}

// Models wrap JSON in prose or ```json fences. Pull the first JSON array/object
// out of a string; returns null if nothing parses.
export function extractJson(text) {
  if (typeof text !== "string") return null;
  // Strip code fences.
  let t = text.replace(/```(?:json)?/gi, "```").trim();
  const fenced = t.match(/```([\s\S]*?)```/);
  if (fenced) t = fenced[1].trim();
  // Try the whole thing first.
  try { return JSON.parse(t); } catch { /* fall through */ }
  // Otherwise grab the outermost [...] or {...}.
  const first = Math.min(
    ...[t.indexOf("["), t.indexOf("{")].filter((i) => i >= 0).concat([Infinity])
  );
  const lastArr = t.lastIndexOf("]");
  const lastObj = t.lastIndexOf("}");
  const last = Math.max(lastArr, lastObj);
  if (first === Infinity || last <= first) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}
