import { getStore, getDeployStore, type Store } from "@netlify/blobs";
import path from "node:path";
import fs from "node:fs";

const STORE_NAME = "property-documents";

/**
 * Document storage.
 *
 * On Netlify this is Netlify Blobs — production deploys use the global store,
 * deploy previews their own deploy-scoped store, so preview testing can never
 * write into a client's real documents. Strong consistency is deliberate: a
 * manager uploads a document and the client may open it seconds later.
 *
 * Off Netlify (local development) it falls back to the filesystem so the app
 * runs without the Netlify environment.
 */
const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_DEV);
const LOCAL_DIR = path.join(process.cwd(), "data", "uploads");

function store(): Store {
  return process.env.CONTEXT === "production"
    ? getStore({ name: STORE_NAME, consistency: "strong" })
    : getDeployStore({ name: STORE_NAME, consistency: "strong" });
}

function localPath(key: string) {
  // Keys are generated server-side, but resolve and confine anyway.
  const resolved = path.resolve(LOCAL_DIR, key);
  if (!resolved.startsWith(path.resolve(LOCAL_DIR) + path.sep)) {
    throw new Error("Invalid document key");
  }
  return resolved;
}

export async function putDocument(key: string, data: Buffer, contentType: string): Promise<void> {
  if (onNetlify) {
    await store().set(key, new Blob([new Uint8Array(data)], { type: contentType }));
    return;
  }
  const target = localPath(key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}

export async function getDocument(key: string): Promise<Buffer | null> {
  if (onNetlify) {
    const blob = await store().get(key, { type: "arrayBuffer" });
    return blob ? Buffer.from(blob as ArrayBuffer) : null;
  }
  const target = localPath(key);
  return fs.existsSync(target) ? fs.readFileSync(target) : null;
}

export async function deleteDocument(key: string): Promise<void> {
  if (onNetlify) {
    await store().delete(key);
    return;
  }
  const target = localPath(key);
  if (fs.existsSync(target)) fs.rmSync(target);
}
