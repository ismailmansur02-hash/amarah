// ============================================================================
// test-contract.cjs — proves the state contract + sync merge behave correctly.
// Run: node scripts/test-contract.cjs
// ============================================================================

const {
  SCHEMA_VERSION,
  DEFAULT_STATE,
  loadStateFromRaw,
  mergeState,
  isPlainObject,
  sanitizeRecordMap,
} = require('../src/lib/stateContract.cjs');

let pass = 0,
  fail = 0;
const t = (name, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL: ' + name);
  }
};

// ---- Contract basics -------------------------------------------------------
t('SCHEMA_VERSION is 4', SCHEMA_VERSION === 4);
t('DEFAULT_STATE is a factory returning fresh objects', DEFAULT_STATE() !== DEFAULT_STATE());
t('default has all top-level keys', (() => {
  const s = DEFAULT_STATE();
  return (
    'auth' in s && 'profile' in s && 'answered' in s && 'attempts' in s &&
    'lessonsRead' in s && 'streak' in s && 'realExams' in s
  );
})());

// ---- loadStateFromRaw: defensive ------------------------------------------
t('load null → default', loadStateFromRaw(null).streak.dailyGoal === 10);
t('load "" → default', loadStateFromRaw('').schemaVersion === 4);
t('load corrupt JSON → no throw', (() => {
  try { loadStateFromRaw('{{{nope'); return true; } catch { return false; }
})());
t('load array → default (not spread)', (() => {
  const s = loadStateFromRaw('[1,2,3]');
  return s.schemaVersion === 4 && !('0' in s.answered);
})());
t('load future schema version → still opens', (() => {
  const s = loadStateFromRaw(JSON.stringify({ schemaVersion: 99, answered: {} }));
  return s.schemaVersion === 4; // loader normalises to current
})());
t('load accepts object OR string', (() => {
  const obj = { schemaVersion: 4, streak: { dailyGoal: 5 } };
  return loadStateFromRaw(obj).streak.dailyGoal === 5 &&
         loadStateFromRaw(JSON.stringify(obj)).streak.dailyGoal === 5;
})());

// ---- Security: prototype pollution & type confusion ------------------------
t('__proto__ key stripped from answered', (() => {
  const evil = JSON.stringify({ answered: JSON.parse('{"__proto__":{"x":1},"q1":{"correctCount":1,"totalCount":1}}') });
  const s = loadStateFromRaw(evil);
  return !Object.keys(s.answered).includes('__proto__') && ({}).x === undefined;
})());
t('string auth rejected → null', loadStateFromRaw(JSON.stringify({ auth: 'hax' })).auth === null);
t('auth without provider rejected', loadStateFromRaw(JSON.stringify({ auth: { foo: 1 } })).auth === null);
t('valid auth kept', (() => {
  const s = loadStateFromRaw(JSON.stringify({ auth: { provider: 'apple', displayName: 'X' } }));
  return s.auth && s.auth.provider === 'apple';
})());
t('answered capped at 5000', (() => {
  const big = {}; for (let i = 0; i < 10000; i++) big['q' + i] = { correctCount: 1 };
  return Object.keys(loadStateFromRaw(JSON.stringify({ answered: big })).answered).length <= 5000;
})());
t('attempts capped at 100', (() => {
  const arr = Array.from({ length: 400 }, (_, i) => ({ id: i }));
  return loadStateFromRaw(JSON.stringify({ attempts: arr })).attempts.length <= 100;
})());
t('realExams capped at 50 & filtered', (() => {
  const arr = ['junk', 5, null, ...Array.from({ length: 200 }, (_, i) => ({ id: 'e' + i }))];
  const s = loadStateFromRaw(JSON.stringify({ realExams: arr }));
  return s.realExams.length <= 50 && s.realExams.every(isPlainObject);
})());
t('lessonsRead only true values kept', (() => {
  const s = loadStateFromRaw(JSON.stringify({ lessonsRead: { a: true, b: 'yes', c: 1 } }));
  return s.lessonsRead.a === true && !('b' in s.lessonsRead) && !('c' in s.lessonsRead);
})());

// ---- mergeState: grow-only cross-device ------------------------------------
t('merge takes max answered counts', (() => {
  const a = DEFAULT_STATE(); a.answered = { q1: { correctCount: 5, totalCount: 6, lastSeen: '2026-02-01' } };
  const b = DEFAULT_STATE(); b.answered = { q1: { correctCount: 2, totalCount: 9, lastSeen: '2026-01-01' }, q2: { correctCount: 1, totalCount: 1 } };
  const m = mergeState(a, b);
  return m.answered.q1.correctCount === 5 && m.answered.q1.totalCount === 9 && m.answered.q2.correctCount === 1;
})());
t('merge flag = either side true', (() => {
  const a = DEFAULT_STATE(); a.answered = { q1: { flagged: true, correctCount: 0, totalCount: 0 } };
  const b = DEFAULT_STATE(); b.answered = { q1: { flagged: false, correctCount: 0, totalCount: 0 } };
  return mergeState(a, b).answered.q1.flagged === true;
})());
t('merge streak keeps longest', (() => {
  const a = DEFAULT_STATE(); a.streak.longest = 12;
  const b = DEFAULT_STATE(); b.streak.longest = 4;
  return mergeState(a, b).streak.longest === 12;
})());
t('merge attempts union by id', (() => {
  const a = DEFAULT_STATE(); a.attempts = [{ id: 'x', dateISO: '2026-01-01' }];
  const b = DEFAULT_STATE(); b.attempts = [{ id: 'y', dateISO: '2026-06-01' }, { id: 'x', dateISO: '2026-01-01' }];
  const m = mergeState(a, b);
  return m.attempts.length === 2 && m.attempts[0].id === 'y'; // newest first
})());
t('merge realExams union by id, newest first', (() => {
  const a = DEFAULT_STATE(); a.realExams = [{ id: 'r1', ap: 'AP1', scorePct: 70, dateISO: '2026-01-01' }];
  const b = DEFAULT_STATE(); b.realExams = [{ id: 'r2', ap: 'AP2', scorePct: 80, dateISO: '2026-06-01' }, { id: 'r1', ap: 'AP1', scorePct: 70, dateISO: '2026-01-01' }];
  const m = mergeState(a, b);
  return m.realExams.length === 2 && m.realExams[0].id === 'r2';
})());
t('merge lessonsRead union', (() => {
  const a = DEFAULT_STATE(); a.lessonsRead = { l1: true };
  const b = DEFAULT_STATE(); b.lessonsRead = { l2: true };
  const m = mergeState(a, b);
  return m.lessonsRead.l1 === true && m.lessonsRead.l2 === true;
})());
t('merge null-safe both directions', (() => {
  return mergeState(null, DEFAULT_STATE()) !== null && mergeState(DEFAULT_STATE(), null) !== null;
})());
t('merge is grow-only (self-merge idempotent)', (() => {
  const a = DEFAULT_STATE();
  a.answered = { q1: { correctCount: 3, totalCount: 4, lastSeen: '2026-06-01' } };
  a.realExams = [{ id: 'r', ap: 'AP3', scorePct: 88, dateISO: '2026-06-01' }];
  const m = mergeState(a, a);
  return m.answered.q1.correctCount === 3 && m.realExams.length === 1;
})());

// ---- The real cross-device scenario ----------------------------------------
t('two devices: no progress lost after round-trip', (() => {
  // Device A answers q1 correctly; Device B answers q2 correctly, offline.
  const cloudStart = DEFAULT_STATE();

  const deviceA = mergeState(loadStateFromRaw(JSON.stringify(cloudStart)), DEFAULT_STATE());
  deviceA.answered = { q1: { correctCount: 1, totalCount: 1, lastSeen: '2026-06-01' } };

  const deviceB = mergeState(loadStateFromRaw(JSON.stringify(cloudStart)), DEFAULT_STATE());
  deviceB.answered = { q2: { correctCount: 1, totalCount: 1, lastSeen: '2026-06-01' } };

  // A pushes first (cloud = A). B pulls, merges, pushes (cloud = A+B).
  let cloud = deviceA;
  const bMerged = mergeState(deviceB, loadStateFromRaw(JSON.stringify(cloud)));
  cloud = bMerged;

  // A later re-syncs: pulls cloud, merges.
  const aResync = mergeState(deviceA, loadStateFromRaw(JSON.stringify(cloud)));

  return (
    cloud.answered.q1 && cloud.answered.q2 &&           // cloud has both
    aResync.answered.q1 && aResync.answered.q2          // A ends with both
  );
})());

// ---- sanitizeRecordMap direct ----------------------------------------------
t('sanitizeRecordMap drops long keys', (() => {
  const out = sanitizeRecordMap({ ['x'.repeat(100)]: { a: 1 }, ok: { a: 1 } });
  return !(('x'.repeat(100)) in out) && 'ok' in out;
})());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
