// ============================================================================
// auth.js — sign-in flows (Apple, Google, email magic link), anonymous-first,
// sign-out, and account deletion (via the edge function).
//
// Design choices (from backend doc §4):
//  * Anonymous-first: users can study immediately; when they later sign in,
//    their local blob is pushed and merged so nothing is lost.
//  * Sign in with Apple is REQUIRED on iOS when Google sign-in is offered.
//  * Email uses magic link (passwordless) — no passwords to store or leak.
// ============================================================================

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, SUPABASE_URL_PUBLIC } from './supabaseClient';
import { clearLocal } from './persistence';

WebBrowser.maybeCompleteAuthSession();

// The deep link the OAuth/magic-link flow returns to. Must be registered in
// app.json under `scheme` and in the Supabase Auth "Redirect URLs" allow-list.
const redirectTo = Linking.createURL('/auth-callback');

// ---- Anonymous-first -------------------------------------------------------

// Start (or resume) an anonymous session so the app is usable with no sign-up.
// Safe to call on every launch; if a session already exists it is a no-op.
export async function ensureAnonymousSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return null; // offline first-run → app still works purely locally
  return data.session;
}

// ---- Apple -----------------------------------------------------------------

export async function signInWithApple() {
  // Native Apple sheet → identity token → exchange with Supabase.
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  return data.session;
}

export function isAppleAuthAvailable() {
  // Apple sign-in only exists on iOS 13+.
  return Platform.OS === 'ios';
}

// ---- Google ----------------------------------------------------------------

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  // Open the returned URL in an in-app browser and wait for the deep-link back.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  // Supabase encodes the session in the callback URL fragment; exchange it.
  const params = new URL(result.url).hash.substring(1);
  const access_token = new URLSearchParams(params).get('access_token');
  const refresh_token = new URLSearchParams(params).get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('Google sign-in did not return a session.');
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionErr) throw sessionErr;
  return sessionData.session;
}

// ---- Email (magic link) ----------------------------------------------------

// Sends a one-tap sign-in link. No password. Returns nothing on success; the
// user completes sign-in by tapping the link, which deep-links back into the app.
export async function sendEmailMagicLink(email) {
  const clean = (email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    throw new Error('Enter a valid email address.');
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return true;
}

// Call this when the app is opened via the magic-link / OAuth deep link, to
// finalise the session from the URL.
export async function completeSessionFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash ? parsed.hash.substring(1) : '';
    const qs = new URLSearchParams(hash || parsed.search.substring(1));
    const access_token = qs.get('access_token');
    const refresh_token = qs.get('refresh_token');
    if (!access_token || !refresh_token) return null;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return null;
    return data.session;
  } catch (e) {
    return null;
  }
}

// ---- Sign out --------------------------------------------------------------

export async function signOut() {
  await supabase.auth.signOut();
  // Deliberately NOT clearing local cache here: signing out shouldn't wipe a
  // guest's local progress. Only account DELETION wipes local (below).
}

// ---- Account deletion (App Store requirement) ------------------------------
// Calls the edge function with the user's JWT. The function deletes the auth
// user with the service-role key; ON DELETE CASCADE removes the state row.
export async function deleteAccount() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const res = await fetch(`${SUPABASE_URL_PUBLIC}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Account deletion failed.');
      throw new Error(msg || 'Account deletion failed.');
    }
    await supabase.auth.signOut();
  }

  await clearLocal(); // wipe on-device cache
  return true;
}

// ---- Session helpers -------------------------------------------------------

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session || null;
}

// Subscribe to auth changes (sign-in on another screen, token refresh, etc.).
export function onAuthChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
