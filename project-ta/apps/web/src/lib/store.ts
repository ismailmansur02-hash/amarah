import type {
  Complaint,
  HelpRequest,
  Message,
  Stroke,
  TutorApplication,
  TutorSession,
  User,
  Wallet,
} from "@project-ta/shared";
import { seedRequests, seedUsers, seedWallets } from "./seed";

/**
 * Persistence.
 *
 * On Netlify this uses Netlify Blobs, so the prototype is genuinely multi-user —
 * two people on two devices see each other's messages. Locally (and if Blobs is
 * unavailable for any reason) it falls back to an in-process map so `npm run dev`
 * needs no configuration at all.
 *
 * Collections are stored as separate documents, and per-session collections are
 * keyed by session id, so two people typing in different sessions never contend
 * on the same document. Swapping this file for Postgres/Supabase later is the
 * only change the rest of the app would need.
 */

type Json = unknown;

interface Backend {
  kind: "blobs" | "memory";
  get(key: string): Promise<Json | null>;
  set(key: string, value: Json): Promise<void>;
}

const memory = new Map<string, string>();

const memoryBackend: Backend = {
  kind: "memory",
  async get(key) {
    const raw = memory.get(key);
    return raw ? JSON.parse(raw) : null;
  },
  async set(key, value) {
    memory.set(key, JSON.stringify(value));
  },
};

let backendPromise: Promise<Backend> | null = null;

async function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async (): Promise<Backend> => {
      try {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore({ name: "project-ta", consistency: "strong" });
        // Prove it actually works before committing to it.
        await store.get("__healthcheck");
        return {
          kind: "blobs",
          async get(key) {
            return (await store.get(key, { type: "json" })) ?? null;
          },
          async set(key, value) {
            await store.setJSON(key, value);
          },
        };
      } catch {
        return memoryBackend;
      }
    })();
  }
  return backendPromise;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const backend = await getBackend();
  const value = (await backend.get(key)) as T | null;
  return value ?? fallback;
}

async function write<T>(key: string, value: T): Promise<void> {
  const backend = await getBackend();
  await backend.set(key, value);
}

export async function backendKind(): Promise<"blobs" | "memory"> {
  return (await getBackend()).kind;
}

/* ------------------------------------------------------------------ users */

export async function getUsers(): Promise<User[]> {
  const stored = await read<User[] | null>("users", null);
  if (stored && stored.length) return stored;
  await write("users", seedUsers);
  return seedUsers;
}

export async function getUser(id: string): Promise<User | undefined> {
  return (await getUsers()).find((u) => u.id === id);
}

export async function saveUser(user: User): Promise<void> {
  const users = await getUsers();
  const i = users.findIndex((u) => u.id === user.id);
  if (i >= 0) users[i] = user;
  else users.push(user);
  await write("users", users);
}

export async function getTutors(): Promise<User[]> {
  return (await getUsers()).filter((u) => u.role === "tutor");
}

/* --------------------------------------------------------------- requests */

export async function getRequests(): Promise<HelpRequest[]> {
  const stored = await read<HelpRequest[] | null>("requests", null);
  if (stored) return stored;
  const seeded = seedRequests();
  await write("requests", seeded);
  return seeded;
}

export async function saveRequest(request: HelpRequest): Promise<void> {
  const all = await getRequests();
  const i = all.findIndex((r) => r.id === request.id);
  if (i >= 0) all[i] = request;
  else all.unshift(request);
  await write("requests", all.slice(0, 300));
}

export async function getRequest(id: string): Promise<HelpRequest | undefined> {
  return (await getRequests()).find((r) => r.id === id);
}

/** Expires anything past its match window. Called on every read of the board. */
export async function sweepExpired(): Promise<HelpRequest[]> {
  let all = await getRequests();
  const now = Date.now();
  let changed = false;
  for (const r of all) {
    if (r.status === "pending" && r.expiresAt <= now) {
      r.status = "expired";
      changed = true;
      // Demo questions are not real spend, so there is nothing to give back.
      if (!r.id.startsWith("req_seed_")) await refundRequest(r);
    }
  }

  // DEMO ONLY: keep two example questions on the board so someone opening the
  // tutor view for the first time sees the notification feed working rather than
  // an empty state. Delete this block the moment there are real students.
  const hasPending = all.some((r) => r.status === "pending" && r.expiresAt > now);
  if (!hasPending) {
    all = [...seedRequests(), ...all.filter((r) => !r.id.startsWith("req_seed_"))];
    changed = true;
  }

  if (changed) await write("requests", all);
  return all;
}

/* --------------------------------------------------------------- sessions */

export async function getSessions(): Promise<TutorSession[]> {
  return read<TutorSession[]>("sessions", []);
}

export async function saveSession(session: TutorSession): Promise<void> {
  const all = await getSessions();
  const i = all.findIndex((s) => s.id === session.id);
  if (i >= 0) all[i] = session;
  else all.unshift(session);
  await write("sessions", all.slice(0, 300));
}

export async function getSession(id: string): Promise<TutorSession | undefined> {
  return (await getSessions()).find((s) => s.id === id);
}

/* --------------------------------------------------------------- messages */

export async function getMessages(sessionId: string): Promise<Message[]> {
  return read<Message[]>(`messages/${sessionId}`, []);
}

export async function addMessage(message: Message): Promise<void> {
  const all = await getMessages(message.sessionId);
  all.push(message);
  await write(`messages/${message.sessionId}`, all);
}

/* ---------------------------------------------------------------- strokes */

export async function getStrokes(sessionId: string): Promise<Stroke[]> {
  return read<Stroke[]>(`strokes/${sessionId}`, []);
}

export async function addStrokes(sessionId: string, strokes: Stroke[]): Promise<void> {
  const all = await getStrokes(sessionId);
  all.push(...strokes);
  await write(`strokes/${sessionId}`, all);
}

export async function clearStrokes(sessionId: string): Promise<void> {
  await write(`strokes/${sessionId}`, []);
}

/* ---------------------------------------------------------------- wallets */

export async function getWallet(userId: string): Promise<Wallet> {
  const wallets = await read<Record<string, Wallet> | null>("wallets", null);
  if (wallets?.[userId]) return wallets[userId];
  const seeded = seedWallets();
  if (!wallets) await write("wallets", seeded);
  return (
    seeded[userId] ?? { userId, balancePence: 0, transactions: [] }
  );
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  const wallets = (await read<Record<string, Wallet>>("wallets", {})) ?? {};
  wallets[wallet.userId] = wallet;
  await write("wallets", wallets);
}

async function refundRequest(request: HelpRequest): Promise<void> {
  const wallet = await getWallet(request.studentId);
  wallet.balancePence += request.pricePence;
  wallet.transactions.unshift({
    id: `txn_${request.id}_refund`,
    userId: request.studentId,
    kind: "refund",
    amountPence: request.pricePence,
    note: `Refund — no tutor picked up "${request.topic}" in time`,
    createdAt: Date.now(),
  });
  await saveWallet(wallet);
}

export { refundRequest };

/* ------------------------------------------------------------- complaints */

export async function getComplaints(): Promise<Complaint[]> {
  return read<Complaint[]>("complaints", []);
}

export async function addComplaint(complaint: Complaint): Promise<void> {
  const all = await getComplaints();
  all.unshift(complaint);
  await write("complaints", all.slice(0, 200));
}

/* ----------------------------------------------------------- applications */

export async function addApplication(application: TutorApplication): Promise<void> {
  const all = await read<TutorApplication[]>("applications", []);
  all.unshift(application);
  await write("applications", all.slice(0, 200));
}
