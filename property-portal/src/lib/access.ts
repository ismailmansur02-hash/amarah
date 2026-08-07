import { db } from "./db";
import { Session } from "./auth";

export type PropertyRow = {
  id: number;
  client_id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  takeover_date: string;
  status: string;
  management_fee_type: "percent" | "flat";
  management_fee_value: number;
  renovation_scope: string;
  notes: string;
  created_at: string;
};

/** Returns the property only if this session is allowed to see it. */
export function getPropertyForSession(propertyId: number, session: Session): PropertyRow | null {
  const property = db
    .prepare("SELECT * FROM properties WHERE id = ?")
    .get(propertyId) as PropertyRow | undefined;
  if (!property) return null;
  if (session.role !== "manager" && property.client_id !== session.uid) return null;
  return property;
}

export function listPropertiesForSession(session: Session): PropertyRow[] {
  if (session.role === "manager") {
    return db.prepare("SELECT * FROM properties ORDER BY name").all() as PropertyRow[];
  }
  return db
    .prepare("SELECT * FROM properties WHERE client_id = ? ORDER BY name")
    .all(session.uid) as PropertyRow[];
}
