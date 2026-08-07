-- Initial schema for the E, Management property portal.
-- Netlify applies this automatically before a deploy is published.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('manager','client')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id                   SERIAL PRIMARY KEY,
  client_id            INTEGER NOT NULL REFERENCES users(id),
  name                 TEXT NOT NULL,
  address              TEXT NOT NULL,
  city                 TEXT NOT NULL DEFAULT '',
  state                TEXT NOT NULL DEFAULT '',
  zip                  TEXT NOT NULL DEFAULT '',
  takeover_date        DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'onboarding'
                         CHECK (status IN ('onboarding','rent_ready_prep','renovation','listed','occupied')),
  management_fee_type  TEXT NOT NULL DEFAULT 'percent' CHECK (management_fee_type IN ('percent','flat')),
  management_fee_value NUMERIC(12,2) NOT NULL DEFAULT 8,
  renovation_scope     TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS properties_client_id_idx ON properties(client_id);

CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  section       TEXT NOT NULL
                  CHECK (section IN ('property','legal','renovation','lease','accounting','maintenance')),
  title         TEXT NOT NULL,
  doc_type      TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  -- Key into the Netlify Blobs store, not a filesystem path.
  blob_key      TEXT,
  original_name TEXT,
  content_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS documents_property_id_idx ON documents(property_id);

CREATE TABLE IF NOT EXISTS checklist_steps (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS checklist_steps_property_id_idx ON checklist_steps(property_id);

CREATE TABLE IF NOT EXISTS renovation_tasks (
  id            SERIAL PRIMARY KEY,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  cost_estimate NUMERIC(12,2),
  cost_actual   NUMERIC(12,2),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS renovation_tasks_property_id_idx ON renovation_tasks(property_id);

CREATE TABLE IF NOT EXISTS tenants (
  id          SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tenants_property_id_idx ON tenants(property_id);

CREATE TABLE IF NOT EXISTS leases (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  monthly_rent NUMERIC(12,2) NOT NULL,
  deposit      NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_day      INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','ended')),
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS leases_property_id_idx ON leases(property_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,
  rent_collected  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_income    NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses        NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_notes   TEXT NOT NULL DEFAULT '',
  management_fee  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_deductible  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_notes       TEXT NOT NULL DEFAULT '',
  owner_payout    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_date     DATE,
  payout_status   TEXT NOT NULL DEFAULT 'scheduled' CHECK (payout_status IN ('scheduled','paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, month)
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id          SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'maintenance' CHECK (category IN ('maintenance','management')),
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  cost        NUMERIC(12,2),
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS maintenance_requests_property_id_idx ON maintenance_requests(property_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  actor_id    INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_log_property_id_idx ON activity_log(property_id, created_at DESC);
