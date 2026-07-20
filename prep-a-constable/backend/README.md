# Prep a Constable — Backend & Integration Code

This folder contains the **real, working code** for everything that can be built outside a live app project: the database schema, authentication, cloud sync, payments, and account deletion. It implements the design in `prep-a-constable-BACKEND.md` exactly.

It does **not** and cannot include: the React Native port itself, your Supabase/RevenueCat/App Store/Play accounts, or the store submission — those need your identity, keys, and a Mac with Xcode. Where those are required, this README tells you the precise step.

---

## What's in here

```
backend/
├── supabase/
│   ├── migrations/0001_init.sql          the entire database (one table + RLS + trigger)
│   └── functions/delete-account/index.ts  edge function for App-Store-required deletion
├── src/lib/
│   ├── stateContract.js / .cjs           GENERATED verbatim from the app (the sync contract)
│   ├── supabaseClient.js                 Supabase client (reads env, uses AsyncStorage)
│   ├── persistence.js                    local cache + cloud pull/merge/push (debounced)
│   ├── auth.js                           Apple, Google, email magic-link, anon-first, delete
│   └── purchases.js                      RevenueCat: entitlements, paywall, restore
├── scripts/
│   ├── extract-contract.js               regenerate the contract from the app (prevents drift)
│   ├── test-contract.cjs                 27 tests incl. the two-device round-trip
│   └── loadtest.mjs                      concurrency check against a staging project
├── .env.example                          copy to .env, fill from your dashboards
└── package.json
```

## Verify it right now (no accounts needed)

```
cd backend
node scripts/test-contract.cjs      # → 27 passed, 0 failed
```

That proves the sync/merge logic — the part that protects users' progress across devices — is correct.

---

## Setup order

### 1. Supabase project
- Create a project at supabase.com.
- SQL editor → paste and run `supabase/migrations/0001_init.sql`. That's the whole schema.
- Authentication → Providers: enable **Email** (magic link), **Apple**, **Google**. Add your app's deep-link redirect URL (e.g. `prepaconstable://auth-callback`) to the allow-list.
- Deploy the deletion function: `supabase functions deploy delete-account`.
- Copy your **Project URL** and **anon public key** into `.env`.

### 2. RevenueCat
- Create an app in RevenueCat; connect App Store Connect and Play Console.
- Create one auto-renewing subscription (£10.99/month, with a free-trial intro offer) in both stores, and the matching products + a `pro` **entitlement** in RevenueCat.
- Copy the **public** iOS and Android SDK keys into `.env`.

### 3. Keep the contract in sync
Whenever you change `DEFAULT_STATE`, `loadStateFromRaw`, `mergeState`, or the sanitisers in the app, regenerate the contract so the sync layer matches:
```
node scripts/extract-contract.js ../prep-a-constable.jsx
node scripts/test-contract.cjs
```

---

## Wiring into the app (in the Expo build)

The app already has the two hooks this plugs into. Today they are:

```js
// bootstrap (App component, ~line 10202)
useEffect(() => {
  loadState().then((s) => { dispatch({ type: "init", state: s }); setLoading(false); });
}, []);

// persist on every change (~line 10208)
useEffect(() => { if (state) persistState(state); }, [state]);
```

Replace the local-only persistence with the synced versions:

```js
import { loadLocal, saveLocal, syncCycle, makeDebouncedPush } from './src/lib/persistence';
import { ensureAnonymousSession, onAuthChange } from './src/lib/auth';
import { configurePurchases } from './src/lib/purchases';

const debouncedPush = makeDebouncedPush(3000);

// bootstrap
useEffect(() => {
  (async () => {
    await ensureAnonymousSession();            // usable immediately, no sign-up wall
    const local = await loadLocal();           // instant render from device cache
    dispatch({ type: "init", state: local });
    setLoading(false);
    const merged = await syncCycle(local);     // pull cloud → merge → save → push
    dispatch({ type: "init", state: merged });
    const session = await ensureAnonymousSession();
    await configurePurchases(session?.user?.id);
  })();
}, []);

// persist + push on every change
useEffect(() => {
  if (!state) return;
  saveLocal(state);          // local cache (as today)
  debouncedPush(state);      // coalesced cloud upload
}, [state]);

// re-sync when the user signs in on another provider / another device
useEffect(() => onAuthChange(async (session) => {
  await configurePurchases(session?.user?.id);
  const merged = await syncCycle();
  dispatch({ type: "init", state: merged });
}), []);
```

Gate premium features behind the entitlement:

```js
import { isPro, getOffering, purchasePackage, restorePurchases } from './src/lib/purchases';
// const pro = await isPro();  → show paywall when !pro
```

Wire the existing **Profile → Delete account** button to the real deletion:

```js
import { deleteAccount } from './src/lib/auth';
// onConfirmDelete = async () => { await deleteAccount(); dispatch({ type: "deleteAccount" }); }
```

Finally, flip the release gate in the app: `const DEMO_MODE = false;` (currently `true`).

---

## What is proven vs what needs a device

**Proven here (ran and passed):**
- SQL schema is valid and self-contained (one table, RLS on all four verbs, timestamp trigger).
- The sync contract is byte-identical to the app (generated by script, not hand-copied).
- 27 automated tests pass, including prototype-pollution defence, type-confusion defence, size caps, and the full **two-device merge round-trip with no progress lost**.

**Needs your accounts + a Mac to verify (cannot be done from code alone):**
- Real Apple/Google sign-in on a device (needs the developer accounts + native build).
- A sandbox subscription purchase and restore (needs store products configured).
- The deletion edge function against real auth (needs the deployed function).
- The load test (needs a staging Supabase project): `SUPABASE_URL=… SUPABASE_ANON_KEY=… node scripts/loadtest.mjs 500`.

These are integration checkpoints from the launch plan (§Phase 2), not code I can execute here.
