// ============================================================================
// loadtest.mjs — light concurrency check for the sync pattern (backend doc §13).
//
// Simulates N users each doing the launch cycle (read row → upsert row) against
// a STAGING Supabase project. Confirms Supabase handles realistic concurrent
// sync traffic with low latency and no errors before launch.
//
// Usage (against a throwaway/staging project only):
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/loadtest.mjs 500
//
// NOTE: This inserts rows using anonymous sessions. Run only on a staging
// project you can wipe. Never point it at production.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const N = parseInt(process.argv[2] || '500', 10);

if (!URL || !ANON) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY env vars (use a STAGING project).');
  process.exit(1);
}

async function oneUserCycle(i) {
  const supabase = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const started = Date.now();
  // Anonymous sign-in must be enabled on the staging project for this to work.
  const { data: signIn, error: signErr } = await supabase.auth.signInAnonymously();
  if (signErr) return { ok: false, ms: Date.now() - started, stage: 'auth', err: signErr.message };

  const uid = signIn.user.id;
  const blob = { schemaVersion: 4, answered: { ['q' + i]: { correctCount: 1, totalCount: 1 } } };

  // read (row won't exist yet)
  const { error: readErr } = await supabase
    .from('user_state').select('state').eq('user_id', uid).maybeSingle();
  if (readErr) return { ok: false, ms: Date.now() - started, stage: 'read', err: readErr.message };

  // upsert
  const { error: upErr } = await supabase.from('user_state').upsert({
    user_id: uid, state: blob, schema_version: 4, updated_at: new Date().toISOString(),
  });
  if (upErr) return { ok: false, ms: Date.now() - started, stage: 'upsert', err: upErr.message };

  return { ok: true, ms: Date.now() - started };
}

const results = await Promise.all(Array.from({ length: N }, (_, i) => oneUserCycle(i)));
const oks = results.filter((r) => r.ok);
const times = oks.map((r) => r.ms).sort((a, b) => a - b);
const p = (q) => times[Math.floor(times.length * q)] || 0;

console.log(`Concurrent users:  ${N}`);
console.log(`Succeeded:         ${oks.length}`);
console.log(`Failed:            ${results.length - oks.length}`);
if (times.length) {
  console.log(`Latency p50/p95:   ${p(0.5)}ms / ${p(0.95)}ms`);
  console.log(`Latency max:       ${times[times.length - 1]}ms`);
}
const fails = results.filter((r) => !r.ok).slice(0, 5);
if (fails.length) console.log('First failures:', fails);
console.log(
  oks.length === N && p(0.95) < 1000
    ? '\nPASS — all cycles succeeded with sub-second p95.'
    : '\nREVIEW — failures or high latency; consider raising the Supabase plan.'
);
