export type UserRow = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "manager" | "client";
  created_at: string;
};

export type DocumentRow = {
  id: number;
  property_id: number;
  section: string;
  title: string;
  doc_type: string;
  notes: string;
  /** Key into the document blob store; null when only metadata was filed. */
  blob_key: string | null;
  original_name: string | null;
  content_type: string;
  uploaded_at: string;
};

export type ChecklistStepRow = {
  id: number;
  property_id: number;
  position: number;
  title: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
};

export type RenovationTaskRow = {
  id: number;
  property_id: number;
  title: string;
  description: string;
  cost_estimate: number | null;
  cost_actual: number | null;
  status: "pending" | "in_progress" | "done";
  completed_at: string | null;
};

export type TenantRow = {
  id: number;
  property_id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export type LeaseRow = {
  id: number;
  property_id: number;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  due_day: number;
  status: "pending" | "active" | "ended";
  notes: string;
};

export type LedgerRow = {
  id: number;
  property_id: number;
  month: string;
  rent_collected: number;
  other_income: number;
  expenses: number;
  expense_notes: string;
  management_fee: number;
  tax_deductible: number;
  tax_notes: string;
  owner_payout: number;
  payout_date: string | null;
  payout_status: "scheduled" | "paid";
};

export type MaintenanceRow = {
  id: number;
  property_id: number;
  title: string;
  description: string;
  category: "maintenance" | "management";
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
  cost: number | null;
  created_by: number | null;
  created_at: string;
  resolved_at: string | null;
};

export type ActivityRow = {
  id: number;
  property_id: number;
  actor_id: number | null;
  action: string;
  detail: string;
  created_at: string;
  actor_name?: string;
};
