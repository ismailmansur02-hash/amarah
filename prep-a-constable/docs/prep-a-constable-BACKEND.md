# Prep a Constable — Backend & Sync Architecture

This document is the build spec for accounts, cloud sync, and payments. It is written so you (or a developer you hire) can wire the backend without making any design decisions — every decision is already made here, and they all match the persistence contract already built into the app.

The guiding principle: **one versioned JSON blob per user, never a relational schema for user data.** That is what makes migrations impossible and sync simple.

---

## 1. The big picture

```
   ┌─────────────┐      sign in       ┌──────────────────┐
   │  iPhone app │ ─────────────────► │                  │
   │  (Expo RN)  │ ◄───────────────── │     Supabase     │
   └─────────────┘   pull / push      │  • Auth          │
                                       │  • Postgres      │
   ┌─────────────┐                     │  • Row Level     │
   │  iPad app   │ ◄──── same user ───►│    Security      │
   │  (Expo RN)  │      same data      │  • RevenueCat    │
   └─────────────┘                     │    webhook (opt) │
                                       └──────────────────┘
```

- **Content** (topics, questions, lessons, offences, powers) ships inside the app bundle. It is never in the database, so it never migrates. New content = new app release.
- **User state** (progress, flags, attempts, profile) is one JSON blob per user, stored in one Postgres row. It syncs across devices.
- **Auth** is handled by Supabase (Apple, Google, email).
- **Payments** are handled by RevenueCat over Apple In-App Purchase + Google Play Billing (NOT Apple Pay / Google Pay — see §7).

---

## 2. Why this never has migration errors

A migration error happens when the *shape* of stored data changes and old rows no longer fit the new columns. We avoid the entire category of problem:

1. **No per-field columns for user data.** The whole state is a single `JSONB` column. Postgres does not care what is inside it. Adding a field to the app's state next year requires **zero** database changes.
2. **A single `schema_version` integer** rides inside the blob. The app's defensive loader (`loadStateFromRaw`, already built) fills in defaults additively for any missing field. Old blobs open in new app versions without error.
3. **The merge function** (`mergeState`, already built) only ever grows progress. No destructive writes.

The only SQL you will ever run again is creating the one table below. After that, the schema is frozen forever.

---

## 3. The database — one table

Run this once in the Supabase SQL editor.

```sql
-- One row per user. The entire app state lives in `state` (JSONB).
create table public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema_version int not null default 4,
  updated_at timestamptz not null default now()
);

-- Row Level Security: a user can only ever see and write THEIR OWN row.
alter table public.user_state enable row level security;

create policy "own row - select"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "own row - insert"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "own row - update"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

That is the entire backend schema. There is deliberately nothing else.

Notes:
- `on delete cascade` means if a user deletes their account, their state row is removed automatically (helps with App Store data-deletion requirements).
- Row Level Security is **essential** — without it, any signed-in user could read anyone's data. The three policies lock every row to its owner.
- `state` defaults to an empty object so a brand-new user's first read does not error.

---

## 4. Auth (Apple + Google + email)

Supabase Auth handles all three. In the Supabase dashboard, under **Authentication → Providers**:

1. **Email** — enable. Decide: magic-link (passwordless, simplest) or email+password. Magic-link avoids storing passwords and reduces support load; recommended.
2. **Apple** — enable. You will need an Apple Developer account, a Services ID, and a key. **Sign in with Apple is mandatory** on iOS if you offer any other social login (Google), so this is not optional.
3. **Google** — enable. You will need OAuth credentials from Google Cloud Console.

In the Expo app, use `@supabase/supabase-js` plus `expo-auth-session` (or the native Apple/Google sign-in modules) to drive the flow. Supabase returns a session with a `user.id` (a UUID) — that UUID is the key for everything.

**Anonymous-first option (recommended for conversion):** let people use the app immediately without an account, storing state locally. When they sign in, push their local blob up and merge with whatever is in the cloud (using `mergeState`). This means a new user is never blocked by a sign-up wall, and they never lose the work they did before signing in. Supabase supports anonymous sign-in that can later be "upgraded" to a real identity.

---

## 5. The sync logic

The app already has the two functions this depends on: `loadStateFromRaw` (defensive load) and `mergeState` (grow-only merge). The sync layer is thin.

### On app launch (signed in)
```
1. localState  = load from device (AsyncStorage)   // instant, app is usable immediately
2. render app with localState
3. in background:
     cloudRow = select state from user_state where user_id = me
     if cloudRow exists:
        merged = mergeState(localState, cloudRow.state)
     else:
        merged = localState
     if merged != localState:  save merged to device + re-render
     push merged to cloud (upsert)   // see below
```

### On every state change (answering a question, flagging, etc.)
```
1. update local immediately (already happens via the reducer)
2. save to device (already happens)
3. debounced (e.g. 2–5 seconds after last change) push to cloud:
     upsert user_state (user_id, state, schema_version, updated_at = now())
```

### On app foreground / regaining connectivity
```
re-run the launch sync (pull → merge → push). Catches changes made on another device.
```

### The upsert (push)
```sql
insert into public.user_state (user_id, state, schema_version, updated_at)
values (:uid, :state, 4, now())
on conflict (user_id)
do update set state = excluded.state,
              schema_version = excluded.schema_version,
              updated_at = excluded.updated_at;
```

In `supabase-js` this is simply:
```js
await supabase.from('user_state').upsert({
  user_id: session.user.id,
  state: localState,
  schema_version: 4,
  updated_at: new Date().toISOString(),
});
```

### Why this is safe across two devices
`mergeState` (already built and unit-tested) guarantees:
- **answered**: per-question max of correct/total counts, flag = either side, newest `lastSeen` wins. Progress can only grow.
- **attempts**: union by `id`, newest first, capped at 50. No attempt is ever lost.
- **lessonsRead**: union — once read on any device, read everywhere.
- **profile / settings**: most-recently-updated wins (by `updatedAt`).

Worst case if two devices write at the exact same moment: last upload wins at the row level, but because each device merged the cloud copy in *before* pushing, no completed progress disappears — it re-merges on the next sync. For a study tracker this is the correct, reassuring behaviour ("I never lose my progress").

### Optional upgrade later: realtime
Supabase can push row changes to subscribed clients in realtime. Not needed for v1 (launch + foreground sync is plenty for a study app), but if you ever want live multi-device updates, subscribe to the `user_state` row and merge on change. No schema change required.

---

## 6. Wiring it into the existing app

The app's persistence functions are already shaped for this. To go from local-only to synced, you change only the persistence layer — **no UI, reducer, or content changes.**

Today (artifact / local):
```js
const loadState = async () => { /* reads window.storage */ };
const persistState = async (s) => { /* writes window.storage */ };
```

In the Expo build:
```js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'pc:state:v4';

// Local read/write (cache)
const loadLocal = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return loadStateFromRaw(raw);           // SAME defensive loader as the artifact
};
const saveLocal = async (s) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

// Cloud pull + merge
const pullAndMerge = async (local) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return local;             // not signed in → local only
  const { data, error } = await supabase
    .from('user_state').select('state').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return local;
  return mergeState(local, loadStateFromRaw(data.state));   // SAME merge as the artifact
};

// Cloud push (debounced)
const pushCloud = async (s) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('user_state').upsert({
    user_id: session.user.id, state: s, schema_version: 4, updated_at: new Date().toISOString(),
  });
};
```

`loadStateFromRaw` and `mergeState` are copied verbatim from the artifact — they are the contract. Nothing else in the app needs to know sync exists.

---

## 7. Payments — read this carefully

**You cannot use Apple Pay or Google Pay for the subscription.** Those are for physical goods/services. For a digital subscription consumed inside the app, Apple and Google **require** their own billing:

- **Apple In-App Purchase (StoreKit)** on iOS
- **Google Play Billing** on Android

Trying to take card payments (Stripe, Apple Pay, Google Pay) for in-app digital subscriptions gets the app rejected or removed.

### Use RevenueCat
RevenueCat wraps both stores behind one SDK and dashboard. It handles receipts, entitlements, restore-purchases, free trials, and cross-platform revenue reporting. Free under a revenue threshold.

Setup:
1. Create products in **App Store Connect** and **Google Play Console**: one auto-renewing subscription, `£10.99/month`, with an introductory free trial (e.g. 7 days).
2. Create the matching products and an "entitlement" (e.g. `pro`) in RevenueCat.
3. In the app, install `react-native-purchases`, configure with your RevenueCat key, and gate premium features behind the `pro` entitlement.
4. Build a paywall (RevenueCat has a no-code paywall builder, or hand-roll one).
5. Identify the user to RevenueCat with the **same Supabase `user.id`** (`Purchases.logIn(userId)`), so the subscription follows the account across devices — exactly like the synced data.

### Commission (verify current rates before modelling revenue)
- **Apple**: 30% standard; **15% under the Small Business Program** (≤ ~$1M/yr proceeds) and 15% on a subscriber's renewals after the first year.
- **Google Play**: 15% on the first ~$1M/yr; 30% above; 15% for subscriptions broadly.

So £10.99/month nets roughly **£7.80–£9.30** depending on tier and year, before VAT. **Apply to Apple's Small Business Program and Google's equivalent** as soon as you have a developer account — it is the single biggest lever on your take.

> Rates and program rules change (EU Digital Markets Act, US Epic v. Apple rulings, etc.). Confirm the current figures on Apple Developer and Google Play Console before building your pricing model.

### Optional: server-side subscription truth
For v1 you can read entitlement straight from the RevenueCat SDK on the device. If you later want the backend to know who is subscribed (e.g. to protect premium content server-side), add a RevenueCat → Supabase webhook that writes subscription status to a small `subscriptions` table. Not required to launch.

---

## 8. Launch checklist (in order)

1. **Expo project** scaffolded; port the single-file artifact into screens/components.
2. **Persistence**: drop in `loadStateFromRaw` + `mergeState` (verbatim from the artifact), swap `window.storage` for AsyncStorage, add the Supabase pull/push from §6.
3. **Supabase project**: create it, run the §3 SQL, enable the three auth providers (§4).
4. **Auth UI**: sign-in screen with Apple, Google, email; anonymous-first flow.
5. **Sync**: launch sync + debounced push + foreground re-sync.
6. **RevenueCat**: products, entitlement, paywall; `logIn` with the Supabase user id.
7. **Apple/Google programs**: enrol in both Small Business Programs.
8. **Store assets**: icon, screenshots per device size, descriptions, keywords, support URL, **privacy policy URL**, **terms URL** (both required; privacy policy must cover Supabase, RevenueCat, and any analytics).
9. **Account deletion**: Apple requires an in-app way to delete the account. With `on delete cascade` this is one call to delete the auth user; the state row follows.
10. **Submit**: Apple review ~1–3 days; Google a few hours to a day.

---

## 8a. Account deletion — production implementation

Apple **requires** an in-app way to delete the account (not just sign out). The artifact already has the full UI: **Profile → Delete account → confirm → "Delete forever"**, which dispatches `deleteAccount` and wipes local state, returning the user to the sign-in screen.

In the Expo build, that same button must also delete the cloud record and the auth user. Because the `user_state` table uses `on delete cascade`, deleting the auth user automatically removes their data row — one operation.

Deleting an auth user requires the service-role key, which must **never** ship in the app. Do it in a Supabase Edge Function:

```ts
// supabase/functions/delete-account/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");          // the user's JWT
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  // Admin client (service-role key is a function secret, never in the app bundle)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Identify the caller from their JWT
  const { data: { user }, error } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // Delete the auth user → user_state row is removed automatically via ON DELETE CASCADE
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return new Response(delErr.message, { status: 500 });

  return new Response(JSON.stringify({ deleted: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

App side, wire it into the existing delete button:

```js
async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await supabase.auth.signOut();
  }
  await AsyncStorage.removeItem(STORAGE_KEY);   // wipe local cache
  dispatch({ type: "deleteAccount" });           // reset in-memory state → returns to login
}
```

Also delete the RevenueCat subscriber on account deletion if you want a fully clean removal (RevenueCat has a deletion API), though store-level subscription cancellation is still handled by the user in their Apple/Google account settings.

## 9. What is already done (in the artifact)

- ✅ Single versioned JSON blob (`SCHEMA_VERSION = 4`).
- ✅ `loadStateFromRaw` — defensive, additive loader (unit-tested against v1, v3, corrupt, and future-version saves).
- ✅ `mergeState` — grow-only cross-device merge (the conflict rule for §5).
- ✅ Reducer stamps `updatedAt` on every change (drives debounced push and profile last-write-wins).
- ✅ Content fully separated from state (topics/questions/lessons/offences/powers are bundle constants, never stored).

The artifact is the local-only version of exactly this design. The Expo build adds the Supabase layer on top without touching any of it.

---

# 10. Launch Execution Plan — from "complete" to live & scalable

This is the ordered plan to take the finished app to the App Store and Google Play, accept payments, support hundreds (and far more) of concurrent users, and update easily afterwards. Work top to bottom; each phase has a clear "done when" checkpoint.

## Phase 0 — Accounts & enrolment (≈1 week, mostly waiting)
You can't ship without these, and some take days to approve, so start them first.

1. **Apple Developer Program** — enrol at developer.apple.com. £79/year. Identity verification can take 24–48h.
2. **Google Play Developer account** — one-time $25. play.google.com/console.
3. **Expo account** — free. Sign up at expo.dev. This drives EAS Build (cloud compiling) and EAS Update (over-the-air updates).
4. **Supabase project** — create the project, run the §3 SQL, enable Apple/Google/email providers (§4).
5. **RevenueCat account** — free to start. Connect it to both App Store Connect and Play Console.

**Done when:** all five accounts exist and are verified.

## Phase 1 — Productionise the app (the Expo port)
1. Scaffold the Expo (React Native) project; port the screens from the prototype.
2. Swap persistence: `window.storage` → AsyncStorage/MMKV, keeping `loadStateFromRaw` + `mergeState` verbatim (§6).
3. Wire Supabase auth + sync (§4, §5).
4. Wire RevenueCat: products, `pro` entitlement, paywall; `Purchases.logIn(supabaseUserId)` (§7).
5. Wire native speech recognition for Verbal Drills (replaces the browser Web Speech API).
6. Set `DEMO_MODE = false`.
7. Build account-deletion to call the Edge Function (§8a).

**Done when:** a development build on your own device does everything — sign in, sync across two devices, take a sandbox payment, run a verbal drill.

## Phase 2 — Pre-launch testing
1. **TestFlight (iOS)** + **Play Internal Testing (Android)**: invite yourself and a handful of colleagues.
2. Test on real phones: sign-in on each provider, cross-device sync, sandbox subscription purchase + restore, account deletion, offline use.
3. Fix the issues that surface (there will be some — this is the point of testing).

**Done when:** 3–5 testers have used it on their own phones for a few days with no blocking bugs.

## Phase 3 — Store assets & compliance
1. **App icon** (1024×1024) and **screenshots** for each required device size.
2. **Listing copy**: name, subtitle, description, keywords.
3. **Privacy Policy URL** and **Terms URL** (host the reviewed documents on a simple web page).
4. **App Privacy questionnaire** (Apple) / **Data Safety form** (Google) — declare what you collect (account id, study data) and that it's not sold.
5. **Age rating**, **support URL**, **contact email**.
6. **ICO registration** (~£40–60/yr) — you're a data controller.
7. Legal documents reviewed by a qualified person (the one outstanding non-technical item).

**Done when:** both store listings are filled in and the legal/privacy items are real, not placeholder.

## Phase 4 — Submit & launch
1. `eas build --profile production` for both platforms.
2. `eas submit` to App Store Connect and Play Console.
3. Apple review: ~1–3 days. Google: hours to ~1 day.
4. Respond to any reviewer questions (common: they ask how to test the subscription — give them a sandbox account).
5. Release. Apply to **Apple Small Business Program** and Google's 15% tier immediately.

**Done when:** the app is downloadable by the public and a real subscription completes end-to-end.

---

# 11. Scaling — "hundreds of users simultaneously"

Good news: the architecture already handles this, and hundreds is trivial. Here's why, and where the real ceilings are.

- **Your servers:** there are none to manage. Supabase is managed Postgres; the app talks to it directly. Hundreds of concurrent users is comfortably inside even Supabase's **free tier**; the **Pro tier (~$25/mo)** handles many thousands. You scale by changing a plan, not by re-architecting.
- **Why it scales so easily:** each user reads/writes **one small JSON row, occasionally** (on launch, on focus, and a debounced push on change) — not constant chatter. This is an extremely light database pattern. Ten thousand users doing that is still a modest load.
- **Content delivery:** questions, lessons, offences, and powers ship **inside the app bundle**, so they cost you zero per-user bandwidth and zero database load. Every user already has the content on their phone.
- **Payments:** RevenueCat and the app stores handle all billing infrastructure and fraud — none of it touches your servers.
- **The realistic ceilings** (all far beyond hundreds): Supabase plan limits (raise the plan), EAS Build minutes (only matters for build frequency, not users), and Supabase Auth rate limits on sign-in bursts (fine unless you have a sudden viral spike). None require code changes — they're dashboard settings.

**Practical capacity:** on Supabase Pro you can serve thousands of daily active users before needing to think harder. You will have a real business long before you hit a scaling wall.

---

# 12. Updating easily after launch

There are two kinds of update, and most of yours are the easy kind.

### Content & JavaScript changes → instant, no store review (EAS Update)
Adding questions, fixing a definition, correcting a typo, tweaking a screen, changing colours — anything that's JavaScript/content — ships **over the air** with `eas update`. Users get it next time they open the app. **No resubmission, no review, same day.** This is the single biggest operational win of the Expo stack and it's why content fixes (your highest-frequency change, given law changes) are painless.

> This matters for your accuracy obligation: if a statute changes or you spot a wrong "points to prove," you push a corrected bundle the same day rather than waiting days for store review.

### Native changes → a normal store release (occasional)
Adding a new native capability (a new payment SDK, a new permission, upgrading the Expo SDK) requires a new `eas build` + `eas submit` and store review. You'll do this rarely — a few times a year at most.

### Backend changes → no app release at all
Because user data is one JSONB blob with a defensive loader and `schema_version`, you can evolve the data shape **without any migration and without forcing an app update**. Old app versions keep working; new fields default in. This is the whole reason the persistence was built this way.

### Recommended update workflow
1. Make the change; test in a development build.
2. For JS/content: `eas update --branch production` → live for users on next open.
3. For native: `eas build` → `eas submit` → store review → release.
4. Keep a `schema_version` discipline: only ever *add* fields to the state blob; never rename/remove destructively.

**Net:** correcting content or shipping UI tweaks is a same-day, no-review operation; full native releases are a few-times-a-year event; backend/data evolution needs no release at all.

---

# 13. Pre-launch load test & "will it break at 500 users?" audit

A common failure mode for quickly-built apps is going live without ever pushing them under load. This app avoids most of the classic traps *by architecture*, but the check below is still worth doing. Each item lists whether it applies to this app and what to do.

### The five classic break-points, assessed for this app

1. **No load testing before launch — APPLIES (do a light version).**
   You have no app server to overload, but you should still confirm Supabase handles realistic concurrent sync traffic before launch.
   - Write a small script that simulates ~500 users each doing the launch cycle: read their row, merge, upsert it back. Run them concurrently against your *staging* Supabase project.
   - Tools: a simple Node script using `supabase-js` in a loop with `Promise.all`, or a load tool like k6 / Artillery hitting the Supabase REST endpoint.
   - Watch: response times and error rate in the Supabase dashboard. If reads/writes stay fast and error-free at 500 concurrent, you're fine for launch. If not, raise the Supabase plan (it's a dial, not a rebuild).
   - **Done when:** 500 concurrent sync cycles complete with no errors and sub-second response times.

2. **Session data in server memory — DOES NOT APPLY.**
   State is a Postgres JSONB row + on-device storage. There is no server-memory session and no single instance to break. This is the single biggest vibe-coded-app killer and the architecture is immune to it by design.

3. **File uploads to the app server — DOES NOT APPLY.**
   The app uploads no files; it syncs one small JSON blob. There is no upload disk to fill. *If you ever add user images* (e.g. profile photos), use **Supabase Storage** (object storage) — never bundle them into the state blob or write them to an app server.

4. **Synchronous email in API routes — DOES NOT APPLY.**
   The only transactional email is magic-link sign-in, sent by **Supabase Auth** on its own infrastructure, asynchronously. You are not sending email from your own blocking API routes. *If you later add your own emails* (e.g. a weekly progress summary), send them via a Supabase Edge Function or a provider's async API, never inline in a request the user is waiting on.

5. **No queue for background tasks — DOES NOT APPLY.**
   The app has no background jobs to queue (no image processing, no batch generation). Adding a queue now would be over-engineering. *If you ever add heavy async work*, use Supabase Edge Functions or a managed queue — but you do not need this to launch or to scale to thousands of study users.

### Summary
Four of the five classic break-points are designed out of this app already; only basic load testing (item 1) is an action, and it's a confidence check rather than a fix. The reason is structural: a managed database (Supabase) plus a single-blob, content-in-bundle design has almost no moving parts to overload. Revisit this list only if you add file uploads, your own email sending, or heavy background processing — each has a one-line "right way" noted above.
