// ============================================================================
// stateContract — GENERATED from prep-a-constable.jsx by scripts/extract-contract.js
// DO NOT EDIT BY HAND. Edit the app, then re-run the script.
// ============================================================================

const SCHEMA_VERSION = 4;

const STORAGE_KEY = "pc:state:v4";

const DEFAULT_STATE = () => ({
  schemaVersion: SCHEMA_VERSION,
  auth: null,        // { provider: "apple"|"google"|"email"|"guest", email, displayName, signedInAt } | null
  profile: { firstName: "", surname: "", rank: "PC", examDate: null, nextExam: "AP1" },
  answered: {},      // { [questionId]: { correctCount, totalCount, lastCorrect, lastSeen, flagged, box, dueAt } }
  attempts: [],      // [{ id, level, score, total, dateISO, ... }]  newest first
  lessonsRead: {},   // { [lessonId]: true }
  streak: { current: 0, longest: 0, lastStudyDay: null, todayCount: 0, dailyGoal: 10 }, // habit loop
  realExams: [],     // [{ id, ap, scorePct, dateISO }] — the officer's REAL assessment results, newest first
  updatedAt: null,   // ISO timestamp of last local mutation (used by sync)
});

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

const sanitizeRecordMap = (src, { maxEntries = 5000, valueCheck = isPlainObject } = {}) => {
  const out = {};
  if (!isPlainObject(src)) return out;
  let n = 0;
  for (const key of Object.keys(src)) {
    if (n >= maxEntries) break;
    if (DANGEROUS_KEYS.has(key)) continue;
    if (typeof key !== "string" || key.length > 64) continue;
    const v = src[key];
    if (!valueCheck(v)) continue;
    out[key] = v;
    n++;
  }
  return out;
};

const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

function loadStateFromRaw(raw) {
  let saved = {};
  try { saved = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {}; }
  catch (e) { saved = {}; }
  if (!isPlainObject(saved)) saved = {};

  const base = DEFAULT_STATE();

  // Backward-compat shims for pre-v4 saves (flat fields → nested profile).
  const legacyProfile = {};
  if (saved.firstName !== undefined) legacyProfile.firstName = saved.firstName;
  if (saved.name !== undefined && saved.firstName === undefined) legacyProfile.firstName = saved.name;
  if (saved.surname !== undefined) legacyProfile.surname = saved.surname;
  if (saved.rank !== undefined) legacyProfile.rank = saved.rank;
  if (saved.examDate !== undefined) legacyProfile.examDate = saved.examDate;
  if (saved.nextExam !== undefined) legacyProfile.nextExam = saved.nextExam;

  // Auth must be a plain object with a string provider — anything else is treated
  // as signed-out. Prevents a corrupt/poisoned blob from crash-looping the app
  // at boot (e.g. auth: "junk" would previously pass the truthiness gate).
  const auth = (isPlainObject(saved.auth) && typeof saved.auth.provider === "string")
    ? saved.auth
    : null;

  // NOTE: we deliberately do NOT spread `...saved` — unknown/unexpected keys from
  // a tampered blob must not ride along into app state.
  return {
    schemaVersion: SCHEMA_VERSION,
    auth,
    profile: { ...base.profile, ...legacyProfile, ...(isPlainObject(saved.profile) ? saved.profile : {}) },
    answered: sanitizeRecordMap(saved.answered),
    attempts: Array.isArray(saved.attempts) ? saved.attempts.filter(isPlainObject).slice(0, 100) : [],
    realExams: Array.isArray(saved.realExams) ? saved.realExams.filter(isPlainObject).slice(0, 50) : [],
    lessonsRead: sanitizeRecordMap(saved.lessonsRead, { valueCheck: (v) => v === true }),
    streak: { ...base.streak, ...(isPlainObject(saved.streak) ? saved.streak : {}) },
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : null,
  };
}

function mergeState(a, b) {
  if (!a) return b;
  if (!b) return a;

  // SECURITY: both sides may originate from storage/cloud — sanitise before use
  // so a "__proto__" key can never reach the computed assignment below.
  const answered = sanitizeRecordMap(a.answered);
  const bAnswered = sanitizeRecordMap(b.answered);
  for (const [qid, bv] of Object.entries(bAnswered)) {
    const av = answered[qid];
    if (!av) { answered[qid] = bv; continue; }
    const aSeen = av.lastSeen || "";
    const bSeen = bv.lastSeen || "";
    const newer = bSeen > aSeen ? bv : av;
    answered[qid] = {
      correctCount: Math.max(av.correctCount || 0, bv.correctCount || 0),
      totalCount: Math.max(av.totalCount || 0, bv.totalCount || 0),
      flagged: !!(av.flagged || bv.flagged),
      lastCorrect: newer.lastCorrect,
      lastSeen: bSeen > aSeen ? bSeen : aSeen,
      // SRS: take the most-recently-reviewed record's schedule (it reflects the latest grading)
      box: newer.box != null ? newer.box : (av.box != null ? av.box : bv.box),
      dueAt: newer.dueAt || av.dueAt || bv.dueAt,
    };
  }

  const byId = {};
  for (const at of [...(a.attempts || []), ...(b.attempts || [])]) {
    if (at && at.id != null) byId[at.id] = at;
  }
  const attempts = Object.values(byId)
    .sort((x, y) => (y.dateISO || "").localeCompare(x.dateISO || ""))
    .slice(0, 50);

  // Real exam results merge the same grow-only way: union by id across devices.
  const reById = {};
  for (const re of [...(Array.isArray(a.realExams) ? a.realExams : []), ...(Array.isArray(b.realExams) ? b.realExams : [])]) {
    if (isPlainObject(re) && re.id != null) reById[re.id] = re;
  }
  const realExams = Object.values(reById)
    .sort((x, y) => (y.dateISO || "").localeCompare(x.dateISO || ""))
    .slice(0, 50);

  const lessonsRead = {
    ...sanitizeRecordMap(a.lessonsRead, { valueCheck: (v) => v === true }),
    ...sanitizeRecordMap(b.lessonsRead, { valueCheck: (v) => v === true }),
  };

  const aUpd = a.updatedAt || "";
  const bUpd = b.updatedAt || "";
  const ap = isPlainObject(a.profile) ? a.profile : {};
  const bp = isPlainObject(b.profile) ? b.profile : {};
  const profile = bUpd > aUpd ? { ...ap, ...bp } : { ...bp, ...ap };

  // Streak: take the better of each device; today's count is the max seen today.
  const as = a.streak || {}, bs = b.streak || {};
  const newerStreak = (as.lastStudyDay || "") >= (bs.lastStudyDay || "") ? as : bs;
  const streak = {
    current: Math.max(as.current || 0, bs.current || 0),
    longest: Math.max(as.longest || 0, bs.longest || 0),
    lastStudyDay: (as.lastStudyDay || "") >= (bs.lastStudyDay || "") ? as.lastStudyDay : bs.lastStudyDay,
    todayCount: newerStreak.todayCount || 0,
    dailyGoal: newerStreak.dailyGoal || 10,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    auth: a.auth || b.auth || null,
    profile,
    answered,
    attempts,
    lessonsRead,
    streak,
    realExams,
    updatedAt: bUpd > aUpd ? bUpd : aUpd,
  };
}

module.exports = {
  SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, isPlainObject,
  sanitizeRecordMap, dayKey, loadStateFromRaw, mergeState,
};
