import { sql, one } from "./db";
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
export async function getPropertyForSession(
  propertyId: number,
  session: Session
): Promise<PropertyRow | null> {
  const property = await one<PropertyRow>(
    sql<PropertyRow>`SELECT * FROM properties WHERE id = ${propertyId}`
  );
  if (!property) return null;
  if (session.role !== "manager" && property.client_id !== session.uid) return null;
  return property;
}

export async function listPropertiesForSession(session: Session): Promise<PropertyRow[]> {
  if (session.role === "manager") {
    return sql<PropertyRow>`SELECT * FROM properties ORDER BY name`;
  }
  return sql<PropertyRow>`SELECT * FROM properties WHERE client_id = ${session.uid} ORDER BY name`;
}
