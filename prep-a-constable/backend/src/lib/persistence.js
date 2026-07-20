// ============================================================================
// persistence.js — local cache + cloud sync.
//
// This is the ONLY module that knows sync exists. The reducer, screens, and
// content are untouched. It uses the shared, verbatim contract functions so
// the merge rule is identical on every device.
//
// Flow (from backend doc §5):
//   launch (signed in):  load local → render → (bg) pull+merge → save+push
//   on change:           update local immediately → debounced push
//   on foreground:       re-run pull+merge+push
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  loadStateFromRaw,
  mergeState,
} from './stateContract';

const TABLE = 'user_state';

// ---- Local cache -----------------------------------------------------------

export async function loadLocal() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return loadStateFromRaw(raw); // defensive: handles null / corrupt / old-version
  } catch (e) {
    // If device storage is unreadable, start from a clean default rather than crash.
    return loadStateFromRaw(null);
  }
}

export async function saveLocal(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    // Out of space or storage error — surface false so callers can decide, but never throw.
    return false;
  }
}

export async function clearLocal() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* best-effort */
  }
}

// ---- Cloud pull + merge ----------------------------------------------------

async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session || null;
}

// Pull the cloud row and merge it into `local`. Returns the merged state (or
// `local` unchanged if signed out / offline / no row yet). Never throws.
export async function pullAndMerge(local) {
  try {
    const session = await getSession();
    if (!session) return local; // not signed in → local only

    const { data, error } = await supabase
      .from(TABLE)
      .select('state')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data || data.state == null) return local;

    const cloud = loadStateFromRaw(data.state); // defensive on cloud copy too
    return mergeState(local, cloud); // grow-only; progress can never shrink
  } catch (e) {
    return local; // offline or transient error → keep local, retry next sync
  }
}

// ---- Cloud push (debounced) ------------------------------------------------

export async function pushCloud(state) {
  try {
    const session = await getSession();
    if (!session) return false; // signed out → nothing to push

    const { error } = await supabase.from(TABLE).upsert(
      {
        user_id: session.user.id,
        state,
        schema_version: SCHEMA_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    return !error;
  } catch (e) {
    return false; // offline → will re-push on next change / foreground
  }
}

// Debounce wrapper: coalesces rapid changes into one upload a few seconds
// after the last change, so answering ten questions quickly = one push.
export function makeDebouncedPush(delayMs = 3000) {
  let timer = null;
  let latest = null;

  const flush = async () => {
    timer = null;
    const toSend = latest;
    latest = null;
    if (toSend) await pushCloud(toSend);
  };

  const schedule = (state) => {
    latest = state;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };

  // Force an immediate send (e.g. on app background, before the OS suspends us).
  schedule.flushNow = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await flush();
  };

  return schedule;
}

// ---- Full launch / foreground sync cycle -----------------------------------
// load local → merge cloud → persist locally → push merged up.
// Returns the state the app should render.
export async function syncCycle(currentLocal) {
  const base = currentLocal || (await loadLocal());
  const merged = await pullAndMerge(base);

  // Only rewrite local + push if the merge actually changed anything.
  const changed = JSON.stringify(merged) !== JSON.stringify(base);
  if (changed) await saveLocal(merged);

  // Always push so the cloud has this device's latest (cheap, idempotent upsert).
  await pushCloud(merged);

  return merged;
}
