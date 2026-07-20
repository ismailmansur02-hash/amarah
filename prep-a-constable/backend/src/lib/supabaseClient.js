// ============================================================================
// supabaseClient.js — the single Supabase client for the app.
//
// Reads its URL + anon key from Expo public env vars so no secret is hardcoded.
// The ANON key is safe to ship in the app (it only permits what Row Level
// Security allows). The SERVICE ROLE key must NEVER appear in the app bundle —
// it lives only in the delete-account edge function as a server secret.
// ============================================================================

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly in development; never silently point at nothing.
  throw new Error(
    'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env (see .env.example).'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist the session on-device so users stay signed in between launches.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native has no URL bar, so there is no OAuth redirect to detect.
    detectSessionInUrl: false,
  },
});

// Re-exported for the delete-account fetch call in §8a of the backend doc.
export const SUPABASE_URL_PUBLIC = SUPABASE_URL;
