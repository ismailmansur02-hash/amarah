// ============================================================================
// SHARED LOGIC — pure functions, no JSX and no platform APIs. Imported by BOTH
// the web app (app/) and the React Native app (native/). Moved VERBATIM from
// app/prep-a-constable.jsx so scoring, spaced repetition, the speech matcher
// and the training-countdown maths cannot diverge between platforms.
// ============================================================================

import { TOPICS, QUESTIONS, TOR_STATUTE_KEY } from "./content/index.js";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Returns the question's options shuffled into a random order and re-lettered A-D,
// plus the NEW correctOptionId after shuffling. Cached per question id so the order
// is stable while the user is looking at that question (doesn't reshuffle on re-render),
// but differs each fresh session. This removes position bias (correct answer was
// disproportionately "B") and length bias from giving away the answer.

const _shuffledOptCache = {};

const getShuffledOptions = (q) => {
  if (_shuffledOptCache[q.id]) return _shuffledOptCache[q.id];
  const letters = ["A", "B", "C", "D", "E", "F"];
  const correctText = (q.options.find((o) => o.id === q.correctOptionId) || {}).text;
  const shuffledRaw = shuffle(q.options);
  let newCorrectId = q.correctOptionId;
  const options = shuffledRaw.map((opt, i) => {
    const id = letters[i];
    if (opt.text === correctText) newCorrectId = id;
    return { id, text: opt.text };
  });
  const result = { options, correctOptionId: newCorrectId };
  _shuffledOptCache[q.id] = result;
  return result;
};

const pickQuestions = ({ topicIds, count }) => {
  let pool = QUESTIONS;
  if (topicIds && topicIds.length > 0) pool = pool.filter((q) => topicIds.includes(q.topicId));
  return shuffle(pool).slice(0, Math.min(count, pool.length));
};

// ---- Spaced-repetition + weak-spots selectors (read from state.answered) ----

// Questions due for review right now: previously-seen questions whose dueAt has passed,
// soonest-due first. Capped so a session is never overwhelming.

const getReviewQueue = (state, cap = 20) => {
  const now = new Date();
  const due = QUESTIONS
    .map((q) => ({ q, rec: state.answered[q.id] }))
    .filter(({ rec }) => rec && rec.box != null && isQuestionDue(rec, now))
    .sort((a, b) => new Date(a.rec.dueAt || 0) - new Date(b.rec.dueAt || 0));
  return due.slice(0, cap).map(({ q }) => q.id);
};

// Per-topic mastery: % of that topic's questions whose last answer was correct.
// Returns [{ topic, total, seen, mastered, mastery (0–1), accuracy (0–1|null) }] for all topics.

const getTopicMastery = (state) => {
  return TOPICS.map((t) => {
    const qs = QUESTIONS.filter((q) => q.topicId === t.id);
    let seen = 0, mastered = 0, correct = 0, attempts = 0;
    for (const q of qs) {
      const rec = state.answered[q.id];
      if (!rec || !rec.totalCount) continue;
      seen += 1;
      if (rec.lastCorrect) mastered += 1;
      correct += rec.correctCount || 0;
      attempts += rec.totalCount || 0;
    }
    return {
      topic: t,
      total: qs.length,
      seen,
      mastered,
      mastery: qs.length ? mastered / qs.length : 0,
      accuracy: attempts ? correct / attempts : null,
    };
  });
};

// The three weakest topics the user has actually engaged with (seen ≥ 3),
// ordered weakest-first by mastery. Falls back to least-seen topics if nothing qualifies.

const getWeakSpots = (state, n = 3) => {
  const all = getTopicMastery(state);
  const engaged = all.filter((m) => m.seen >= 3);
  const ranked = (engaged.length ? engaged : all.filter((m) => m.seen > 0))
    .sort((a, b) => a.mastery - b.mastery);
  return ranked.slice(0, n);
};

const formatTime = (s) => {
  if (s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const daysUntil = (d) => {
  if (!d) return null;
  const t = new Date(d), n = new Date();
  t.setHours(0, 0, 0, 0); n.setHours(0, 0, 0, 0);
  return Math.round((t - n) / 86400000);
};

const formatDateLong = (d) => d ? new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;

// ---- Training-school countdown ---------------------------------------------
// Given the officer's own training start and end dates, work out where they are:
// which week/day they're in, how much is left, and how far through they are.
// Everything is derived from the two dates the user enters — no assumptions are
// made about how long any particular training programme runs.

const trainingProgress = (startISO, endISO, now = new Date()) => {
  if (!startISO || !endISO) return null;
  const DAY = 86400000;
  const midnight = (d) => { const x = new Date(d); if (isNaN(x)) return null; x.setHours(0, 0, 0, 0); return x; };
  const start = midnight(startISO), end = midnight(endISO), today = midnight(now);
  if (!start || !end || !today) return null;
  const totalDays = Math.round((end - start) / DAY);
  if (totalDays <= 0) return null;                      // end must be after start
  const elapsedRaw = Math.round((today - start) / DAY);
  const elapsed = Math.max(0, Math.min(elapsedRaw, totalDays));
  const daysLeft = Math.max(0, totalDays - elapsed);
  return {
    totalDays,
    totalWeeks: Math.ceil(totalDays / 7),
    elapsed,
    daysLeft,
    weeksLeft: Math.ceil(daysLeft / 7),
    weekIndex: Math.floor(elapsed / 7) + 1,             // day 0 = week 1
    dayInWeek: (elapsed % 7) + 1,                       // 1–7
    weeksDone: Math.floor(elapsed / 7),
    pct: Math.max(0, Math.min(1, elapsed / totalDays)),
    notStarted: elapsedRaw < 0,
    daysUntilStart: Math.max(0, -elapsedRaw),
    finished: elapsedRaw >= totalDays,
  };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const uuid = () => "id-" + Math.random().toString(36).slice(2, 11) + "-" + Date.now().toString(36);

// ============================================================
// VERBAL DRILLS — reference scripts + strict word matcher
// ============================================================

const normaliseSpeech = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Strict word-by-word comparison against an ordered reference script.
// Returns the reference tokens each marked hit/missed, plus a score.
// Uses a forward pointer over the spoken tokens so word order matters but
// extra filler words spoken in between don't break the match.

const matchScript = (referenceScript, spoken) => {
  const refTokens = normaliseSpeech(referenceScript).split(" ").filter(Boolean);
  const spokenTokens = normaliseSpeech(spoken).split(" ").filter(Boolean);
  const result = [];
  let p = 0;
  for (const ref of refTokens) {
    let found = false;
    // search forward from current pointer for this reference word
    for (let i = p; i < spokenTokens.length; i++) {
      if (spokenTokens[i] === ref) { found = true; p = i + 1; break; }
    }
    result.push({ word: ref, hit: found });
  }
  const hits = result.filter((r) => r.hit).length;
  return { tokens: result, hits, total: refTokens.length, pct: refTokens.length ? Math.round((hits / refTokens.length) * 100) : 0 };
};

// Keyword-presence matcher (for checklist-style drills like GOWISELY):
// each key word just needs to appear somewhere in the spoken text, order-independent.

const matchKeywords = (referenceScript, spoken) => {
  const refTokens = normaliseSpeech(referenceScript).split(" ").filter(Boolean);
  const spokenSet = new Set(normaliseSpeech(spoken).split(" ").filter(Boolean));
  const result = refTokens.map((word) => ({ word, hit: spokenSet.has(word) }));
  const hits = result.filter((r) => r.hit).length;
  return { tokens: result, hits, total: refTokens.length, pct: refTokens.length ? Math.round((hits / refTokens.length) * 100) : 0 };
};

// Component matcher for checklist drills like GOWISELY. Each component has a
// LABEL (shown to the user) and a list of ACCEPTED phrases/synonyms. A component
// counts as delivered if ANY of its accepted phrases appears in the spoken text.
// Multi-word phrases (e.g. "warrant card", "detained for the search") are matched
// against the normalised spoken string; single words against the token set. This
// stops the drill wrongly failing an officer who covered an element in different
// words (e.g. "ID" for identity, "nick" for station, "power" for legal power).

const matchComponents = (components, spoken) => {
  const spokenNorm = normaliseSpeech(spoken);
  const spokenSet = new Set(spokenNorm.split(" ").filter(Boolean));
  const containsPhrase = (phrase) => {
    const p = normaliseSpeech(phrase);
    if (!p) return false;
    if (p.includes(" ")) return (" " + spokenNorm + " ").includes(" " + p + " ");
    return spokenSet.has(p);
  };
  const tokens = components.map((c) => ({
    word: c.label,
    hit: c.accept.some(containsPhrase),
  }));
  const hits = tokens.filter((t) => t.hit).length;
  return { tokens, hits, total: components.length, pct: components.length ? Math.round((hits / components.length) * 100) : 0 };
};

// ============================================================
// STORAGE
// ============================================================

// ============================================================
// PERSISTENCE — migration-safe & sync-ready
//
// Design contract (identical local + cloud):
//  • All user data is ONE versioned JSON blob (no relational schema → no migrations, ever).
//  • SCHEMA_VERSION bumps when the shape changes; loadState() fills defaults additively.
//  • mergeState() is the conflict-resolution rule used by cloud sync (progress only grows).
//  • Immutable CONTENT (topics, questions, lessons, offences, powers) is NEVER stored here —
//    it ships in the app bundle and is versioned with each release.
// ============================================================

const DEMO_MODE = true;

const SRS_INTERVALS = [0, 1, 3, 7, 16, 35]; // days; box index clamps to last

const srsIntervalDays = (box) => SRS_INTERVALS[Math.min(box, SRS_INTERVALS.length - 1)];

const addDaysISO = (iso, days) => {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
// Local calendar day key (YYYY-MM-DD) for streak logic.

const isQuestionDue = (rec, now = new Date()) => {
  if (!rec || rec.box == null) return false; // never-seen handled separately
  if (!rec.dueAt) return true;
  return new Date(rec.dueAt) <= now;
};

// Defensive loader: deep-merges saved blob over defaults so old saves never crash.
// This IS the "migration" — purely additive, cannot throw on missing/renamed fields.
// ---- SECURITY: input sanitisation for stored / synced state blobs ----
// The state blob is parsed from storage (and, in production, from cloud sync).
// Treat it as UNTRUSTED: reject prototype-polluting keys, enforce types, cap sizes.

function mnemonicRow(it) {
  if (it && typeof it === "object") return { l: it.l || "", m: it.m || "" };
  const s = typeof it === "string" ? it : "";
  // "A – MEANING…" / "A - MEANING…" → letter + meaning. The leading token is
  // capped at 3 characters so a dash later in the sentence can't be mistaken
  // for the separator.
  const m = s.match(/^\s*([^\s–—-]{1,3})\s*[–—-]\s*(.+)$/);
  return m ? { l: m[1], m: m[2] } : { l: "", m: s };
}

function torActsFor(statute) {
  if (!statute) return [];
  const letters = (statute.match(/\(([A-Za-z])\)/g) || [])
    .map((m) => m.slice(1, -1).toUpperCase());
  const seen = [];
  letters.forEach((l) => {
    const entry = TOR_STATUTE_KEY.find((k) => k.letter === l);
    if (entry && !seen.includes(entry.act)) seen.push(entry.act);
  });
  return seen;
}

export { shuffle, _shuffledOptCache, getShuffledOptions, pickQuestions, getReviewQueue, getTopicMastery, getWeakSpots, formatTime, daysUntil, formatDateLong, trainingProgress, plural, uuid, normaliseSpeech, matchScript, matchKeywords, matchComponents, DEMO_MODE, SRS_INTERVALS, srsIntervalDays, addDaysISO, isQuestionDue, mnemonicRow, torActsFor };
