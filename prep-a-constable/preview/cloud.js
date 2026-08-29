// ============================================================================
// cloud.js — web cloud-sync adapter (magic-link sign-in + state sync).
//
// This is the BROWSER counterpart to backend/src/lib/{supabaseClient,auth,
// persistence}.js, which are written for React Native/Expo (AsyncStorage,
// expo-apple-authentication) and cannot run here. The sync RULES are not
// duplicated: the app injects its own mergeState/loadStateFromRaw via
// configure(), so the merge behaves identically to the on-device path and
// cannot drift from the state contract.
//
// Exposed as window.cloud, mirroring how entry.jsx provides window.storage.
// The app treats it as OPTIONAL — with no window.cloud it stays local-only.
//
// KEY SAFETY: the key below is the Supabase ANON/publishable key. It is
// designed to be shipped in client code — it grants nothing on its own, and
// every row is gated by Row Level Security (user_state has RLS on with four
// policies; a user can only ever read or write their own row). The SERVICE
// ROLE key is NOT here and must never be — it exists only as a secret inside
// the delete-account edge function.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uqekeszdgeumwjdbompd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZWtlc3pkZ2V1bXdqZGJvbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDQ3MzYsImV4cCI6MjA5OTI4MDczNn0.82_4k-fjfzbBXLXJB-wmZCGBAW3nEcAD-F2-c762Elk";

const TABLE = "user_state";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The browser DOES have a URL bar, so the magic-link callback arrives as
    // query/hash params on this page. Let supabase-js consume it on load.
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// The app hands us its own contract functions so the merge rule is shared
// rather than reimplemented. Until configure() runs, pull() is a no-op.
let contract = null;

async function currentSession() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session || null;
  } catch (e) {
    return null;
  }
}

// Strip the magic-link tokens out of the address bar once consumed, so the
// officer isn't looking at a URL full of credentials and can't re-share it.
function cleanAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    const dirty = ["code", "access_token", "refresh_token", "token_type", "type", "expires_in", "expires_at", "error", "error_description"];
    let touched = false;
    dirty.forEach((k) => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        touched = true;
      }
    });
    if (url.hash && /access_token|error|code=/.test(url.hash)) {
      url.hash = "";
      touched = true;
    }
    if (touched) window.history.replaceState({}, document.title, url.toString());
  } catch (e) {
    /* cosmetic only — never block sign-in on this */
  }
}

window.cloud = {
  enabled: true,

  // Called once by the app with its OWN contract functions.
  configure(c) {
    contract = c || null;
  },

  // ---- Auth ---------------------------------------------------------------

  // Sends a one-tap sign-in link. No password is ever created or stored.
  async sendMagicLink(email) {
    const clean = (email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      throw new Error("Enter a valid email address.");
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(error.message || "Could not send the sign-in link.");
    return true;
  },

  async getSession() {
    return currentSession();
  },

  // Fires whenever a session appears or disappears — including when the
  // officer returns by tapping the emailed link.
  onAuthChange(cb) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) cleanAuthParamsFromUrl();
      cb(session || null);
    });
    return () => {
      try {
        subscription.unsubscribe();
      } catch (e) {
        /* already gone */
      }
    };
  },

  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      /* signing out must never hard-fail the UI */
    }
    // Deliberately NOT clearing local progress: signing out on a shared device
    // should not destroy work that has already been synced up.
  },

  // ---- State sync ---------------------------------------------------------

  // Pull this account's cloud row and merge it into `local`. Returns the
  // merged state, or `local` untouched when signed out/offline/no row yet.
  // Never throws — a sync failure must never cost the officer their session.
  async pull(local) {
    try {
      if (!contract) return local;
      const session = await currentSession();
      if (!session) return local;

      const { data, error } = await supabase
        .from(TABLE)
        .select("state")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !data || data.state == null) return local;

      // The column is jsonb, so this arrives parsed; loadStateFromRaw expects
      // the raw string form and re-validates it as untrusted input either way.
      const raw = typeof data.state === "string" ? data.state : JSON.stringify(data.state);
      const cloud = contract.loadStateFromRaw(raw);
      return contract.mergeState(local, cloud);
    } catch (e) {
      return local;
    }
  },

  // Upsert this device's state. Returns false rather than throwing when
  // offline, so the caller can simply try again on the next change.
  async push(state) {
    try {
      if (!state) return false;
      const session = await currentSession();
      if (!session) return false;

      const { error } = await supabase.from(TABLE).upsert(
        {
          user_id: session.user.id,
          state,
          // Column is NOT NULL, so never send null even if configure() is late.
          schema_version: (contract && contract.SCHEMA_VERSION) || 4,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      return !error;
    } catch (e) {
      return false;
    }
  },
};
