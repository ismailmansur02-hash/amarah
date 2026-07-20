-- ============================================================================
-- Prep a Constable — initial schema
-- Run once in the Supabase SQL editor (or via `supabase db push`).
--
-- Design: ONE row per user. The entire app state is a single JSONB blob, so
-- the data shape can evolve in the app without any future migration. The only
-- SQL you ever run is this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The single user-state table
-- ----------------------------------------------------------------------------
create table if not exists public.user_state (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  state          jsonb not null default '{}'::jsonb,
  schema_version int   not null default 4,
  updated_at     timestamptz not null default now()
);

comment on table public.user_state is
  'One row per user. Entire app state lives in `state` (JSONB). No per-field columns by design.';

-- ----------------------------------------------------------------------------
-- 2. Keep updated_at honest at the database level
--    (the app also sets it, but a trigger guarantees it can never be stale
--     or spoofed to an older value on write).
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_state_touch on public.user_state;
create trigger trg_user_state_touch
  before insert or update on public.user_state
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security — a user can only ever see and write THEIR OWN row.
--    Without this, any signed-in user could read everyone's data.
-- ----------------------------------------------------------------------------
alter table public.user_state enable row level security;

-- Drop first so this migration is safely re-runnable.
drop policy if exists "own row - select" on public.user_state;
drop policy if exists "own row - insert" on public.user_state;
drop policy if exists "own row - update" on public.user_state;
drop policy if exists "own row - delete" on public.user_state;

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

create policy "own row - delete"
  on public.user_state for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Notes
--    * ON DELETE CASCADE: deleting the auth user removes their state row
--      automatically (satisfies App Store account-deletion requirements).
--    * `state` defaults to '{}' so a brand-new user's first read never errors.
--    * There is deliberately nothing else here. The schema is frozen after this.
-- ----------------------------------------------------------------------------
