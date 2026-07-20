// ============================================================================
// content-council — configuration
//
// A "council" of independent LLMs that VERIFIES the app's extracted content
// against Mr Mansur's supplied source document. It never writes or improves
// legal content — it only judges fidelity to the source and flags mismatches
// for human review. (Inspired by karpathy/llm-council, adapted from
// answer-generation to source-grounded verification.)
// ============================================================================

// OpenRouter model identifiers. Use several *different* providers so one model's
// blind spot is caught by the others — that cross-check is the whole point.
export const COUNCIL_MODELS = [
  "openai/gpt-5.1",
  "google/gemini-3-pro-preview",
  "anthropic/claude-sonnet-4.5",
  "x-ai/grok-4",
];

// The chairman consolidates disputed verdicts and writes the executive summary.
export const CHAIRMAN_MODEL = "google/gemini-3-pro-preview";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Read from the environment; never hard-code a key. See README.
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// How many content items to send per model call (keeps prompts a sane size).
export const BATCH_SIZE = Number(process.env.COUNCIL_BATCH || 12);

// Per-request timeout (ms).
export const REQUEST_TIMEOUT_MS = Number(process.env.COUNCIL_TIMEOUT || 120000);
