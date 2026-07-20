// ============================================================================
// delete-account edge function
//
// Deletes the calling user's account. The service-role key required to delete
// an auth user must NEVER ship in the app, so this runs server-side. Deleting
// the auth user cascades (ON DELETE CASCADE) to remove their user_state row.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
//          to deployed functions by the platform; no manual secret needed.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Identify the caller from their JWT (never trust a user id sent in the body).
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token);

  if (userErr || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Delete the auth user → user_state row removed automatically via cascade.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return json({ error: delErr.message }, 500);
  }

  return json({ deleted: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
