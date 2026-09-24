// ============================================================================
// cloud.js — native cloud sync, the counterpart to preview/cloud.js on web.
//
// Same Supabase project, same user_state table, same magic-link flow. The
// differences are platform-level only: the session persists in AsyncStorage
// instead of localStorage, and the magic link returns through the app's
// deep-link scheme (prepaconstable://) rather than a browser URL.
//
// The merge rules are NOT reimplemented — configure() takes the app's own
// mergeState/loadStateFromRaw, exactly as the web adapter does, so a blob
// written by the phone and one written by the browser merge identically.
//
// KEY SAFETY: the key below is the Supabase ANON/publishable key. It is meant
// to ship in client code — Row Level Security gates every row, and a user can
// only ever read or write their own. The SERVICE ROLE key is not here.
// ============================================================================

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uqekeszdgeumwjdbompd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZWtlc3pkZ2V1bXdqZGJvbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDQ3MzYsImV4cCI6MjA5OTI4MDczNn0.82_4k-fjfzbBXLXJB-wmZCGBAW3nEcAD-F2-c762Elk';

const TABLE = 'user_state';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // A phone has no address bar; the callback arrives as a deep link, which
    // completeFromUrl() below feeds back in explicitly.
    detectSessionInUrl: false,
  },
});

let contract = null;

export function configure(c) { contract = c || null; }

async function currentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session || null;
  } catch (e) {
    return null;
  }
}

export async function getSession() { return currentSession(); }

// Sends the one-tap sign-in link. No password is created or stored.
export async function sendMagicLink(email) {
  const clean = (email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    throw new Error('Enter a valid email address.');
  }
  const redirectTo = Linking.createURL('/auth-callback');
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw new Error(error.message || 'Could not send the sign-in link.');
  return true;
}

// Called when the app is opened by the emailed link.
export async function completeFromUrl(url) {
  try {
    const parsed = Linking.parse(url);
    const qp = parsed.queryParams || {};
    const frag = (url.split('#')[1] || '');
    const fragParams = Object.fromEntries(new URLSearchParams(frag));
    const access_token = qp.access_token || fragParams.access_token;
    const refresh_token = qp.refresh_token || fragParams.refresh_token;
    if (!access_token || !refresh_token) return null;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return null;
    return data.session;
  } catch (e) {
    return null;
  }
}

export function onAuthChange(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => cb(session || null));
  return () => { try { subscription.unsubscribe(); } catch (e) {} };
}

export async function signOut() {
  try { await supabase.auth.signOut(); } catch (e) { /* never block the UI */ }
  // Deliberately does NOT clear local progress: signing out should not destroy
  // work that has already been synced up.
}

// ---- State sync -------------------------------------------------------------

export async function pull(local) {
  try {
    if (!contract) return local;
    const session = await currentSession();
    if (!session) return local;
    const { data, error } = await supabase
      .from(TABLE).select('state').eq('user_id', session.user.id).maybeSingle();
    if (error || !data || data.state == null) return local;
    const raw = typeof data.state === 'string' ? data.state : JSON.stringify(data.state);
    return contract.mergeState(local, contract.loadStateFromRaw(raw));
  } catch (e) {
    return local;
  }
}

export async function push(state) {
  try {
    if (!state) return false;
    const session = await currentSession();
    if (!session) return false;
    const { error } = await supabase.from(TABLE).upsert(
      {
        user_id: session.user.id,
        state,
        schema_version: (contract && contract.SCHEMA_VERSION) || 4,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    return !error;
  } catch (e) {
    return false;
  }
}

// Account deletion — an App Store requirement wherever accounts exist.
// Calls the JWT-verified edge function; ON DELETE CASCADE removes the state row.
export async function deleteAccount() {
  const session = await currentSession();
  if (!session) return false;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => 'Account deletion failed.'));
  await supabase.auth.signOut();
  return true;
}
