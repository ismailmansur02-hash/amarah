// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
// Content moved VERBATIM from app/prep-a-constable.jsx — never retyped.
// ============================================================================

const SCHEMA_VERSION = 4;

// Set to false before App Store / Play Store submission to hide the demo sign-in banner.
// (In the Expo build the buttons call real Supabase auth; this flag only controls the notice.)
// SECURITY / RELEASE GATE: DEMO_MODE bypasses real authentication (fakeSignIn).
// It MUST be set to false before store submission — real Apple/Google/email auth
// via Supabase replaces fakeSignIn (see prep-a-constable-BACKEND.md §Auth).

const STORAGE_KEY = "pc:state:v4";

// The complete shape of persisted user state. Anything not here is content, not state.

const DEFAULT_STATE = () => ({
  schemaVersion: SCHEMA_VERSION,
  auth: null,        // { provider: "apple"|"google"|"email"|"guest", email, displayName, signedInAt } | null
  profile: { firstName: "", surname: "", rank: "PC", examDate: null, nextExam: "AP1", trainingStart: null, trainingEnd: null },
  answered: {},      // { [questionId]: { correctCount, totalCount, lastCorrect, lastSeen, flagged, box, dueAt } }
  attempts: [],      // [{ id, level, score, total, dateISO, ... }]  newest first
  lessonsRead: {},   // { [lessonId]: true }
  streak: { current: 0, longest: 0, lastStudyDay: null, todayCount: 0, dailyGoal: 10 }, // habit loop
  realExams: [],     // [{ id, ap, scorePct, dateISO }] — the officer's REAL assessment results, newest first
  updatedAt: null,   // ISO timestamp of last local mutation (used by sync)
});

// ---- Spaced repetition (Leitner box system) ----
// box 0 = brand new / just wrong; higher box = longer interval. Wrong answer → back to box 1.
// Intervals in days per box. Box 0 means "due now".

const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

// Copy a { key: record } map keeping only safe keys and plain-object/boolean values.
// Prevents prototype pollution ("__proto__" as a key) and unbounded growth.

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

// Merge two state blobs (e.g. local + cloud) so progress can only GROW, never vanish.
// This is the cross-device conflict rule:
//   • answered: per-question max of counts; flagged = either; keep most-recent lastSeen.
//   • attempts: union by id, newest first, capped.
//   • lessonsRead: union (once read, always read).
//   • profile / scalar settings: most-recently-updated wins (by updatedAt).

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

function reducer(state, action) {
  if (action.type === "init") return action.state;
  if (!state) return state;

  const stamp = (next) => ({ ...next, updatedAt: new Date().toISOString() });

  // Record a REAL assessment result the officer sat (not an in-app mock).
  if (action.type === "recordRealExam") {
    const entry = {
      id: `re-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      ap: action.ap,
      scorePct: Math.max(0, Math.min(100, Math.round(action.scorePct))),
      dateISO: action.dateISO || new Date().toISOString(),
    };
    const realExams = [entry, ...(state.realExams || [])].slice(0, 50);
    return stamp({ ...state, realExams });
  }
  if (action.type === "deleteRealExam") {
    return stamp({ ...state, realExams: (state.realExams || []).filter((r) => r.id !== action.id) });
  }

  // Advance the daily streak when the user studies. Called from recordAnswer.
  const bumpStreak = (streak) => {
    const today = dayKey();
    const s = { ...(streak || { current: 0, longest: 0, lastStudyDay: null, todayCount: 0, dailyGoal: 10 }) };
    if (s.lastStudyDay === today) {
      s.todayCount = (s.todayCount || 0) + 1;
      return s;
    }
    // New day of study.
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    s.current = s.lastStudyDay === yesterday ? (s.current || 0) + 1 : 1; // continued vs reset
    s.longest = Math.max(s.longest || 0, s.current);
    s.lastStudyDay = today;
    s.todayCount = 1;
    return s;
  };

  switch (action.type) {
    case "recordAnswer": {
      const prev = state.answered[action.questionId] || { correctCount: 0, totalCount: 0, flagged: false, box: 0 };
      // SRS update: correct → advance a box; wrong → back to box 1.
      const prevBox = prev.box == null ? 0 : prev.box;
      const nextBox = action.isCorrect ? prevBox + 1 : 1;
      const dueAt = addDaysISO(new Date().toISOString(), srsIntervalDays(nextBox));
      return stamp({
        ...state,
        streak: bumpStreak(state.streak),
        answered: {
          ...state.answered,
          [action.questionId]: {
            ...prev,
            correctCount: prev.correctCount + (action.isCorrect ? 1 : 0),
            totalCount: prev.totalCount + 1,
            lastCorrect: action.isCorrect,
            lastSeen: new Date().toISOString(),
            box: nextBox,
            dueAt,
          },
        },
      });
    }
    case "toggleFlag": {
      const prev = state.answered[action.questionId] || { correctCount: 0, totalCount: 0, flagged: false };
      return stamp({ ...state, answered: { ...state.answered, [action.questionId]: { ...prev, flagged: !prev.flagged } } });
    }
    case "saveAttempt": return stamp({ ...state, attempts: [action.attempt, ...state.attempts].slice(0, 50) });
    case "setExamDate": return stamp({ ...state, profile: { ...state.profile, examDate: action.date } });
    case "setNextExam": return stamp({ ...state, profile: { ...state.profile, nextExam: action.level } });
    case "setTrainingDates": return stamp({ ...state, profile: { ...state.profile, trainingStart: action.start, trainingEnd: action.end } });
    case "setFirstName": return stamp({ ...state, profile: { ...state.profile, firstName: action.firstName } });
    case "setSurname": return stamp({ ...state, profile: { ...state.profile, surname: action.surname } });
    case "setRank": return stamp({ ...state, profile: { ...state.profile, rank: action.rank } });
    case "markLessonRead": return stamp({ ...state, lessonsRead: { ...(state.lessonsRead || {}), [action.lessonId]: true } });
    case "setDailyGoal": return stamp({ ...state, streak: { ...state.streak, dailyGoal: action.goal } });
    case "signIn": return stamp({ ...state, auth: { ...action.auth, signedInAt: new Date().toISOString() } });
    case "signOut": return stamp({ ...state, auth: null });
    case "deleteAccount": {
      // Full wipe: clears all local state and signs out. In production this is preceded
      // by the Supabase auth.admin.deleteUser() call (see backend doc) which cascades the
      // user_state row via `on delete cascade`. Locally we reset to a clean slate.
      return DEFAULT_STATE();
    }
    case "reset": return DEFAULT_STATE();
    default: return state;
  }
}

// ============================================================
// TOKENS
// ============================================================

export { SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, dayKey, DANGEROUS_KEYS, isPlainObject, sanitizeRecordMap, loadStateFromRaw, mergeState, reducer };
