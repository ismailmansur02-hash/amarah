-- ============================================================================
-- Prep a Constable — retention job
--
-- The privacy notice states: accounts untouched for 24 months are emailed, and
-- deleted 30 days later if there is still no activity. A retention period you
-- publish but do not apply is worse than not publishing one — Article 5(1)(e)
-- of the UK General Data Protection Regulation (storage limitation) requires
-- personal data to be kept no longer than necessary, and Article 13(2)(a)
-- requires the published period to be the real one.
--
-- This file provides the mechanism. It is NOT applied automatically.
--
-- ⚠ READ BEFORE RUNNING
--   * It DELETES user accounts. Run it against a branch or with the dry-run
--     select first, and satisfy yourself the dates are what you expect.
--   * It requires the pg_cron and pg_net extensions, which are enabled per
--     project in the Supabase dashboard (Database → Extensions).
--   * The warning email is NOT sent by this file. Sending it needs an email
--     provider; until that exists, run the dry run manually and email people
--     yourself, or the notice's promise of a warning is not being kept.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Mark when we warned someone, so the 30-day grace period can be measured.
-- ----------------------------------------------------------------------------
alter table public.user_state
  add column if not exists inactivity_warned_at timestamptz;

comment on column public.user_state.inactivity_warned_at is
  'When the 24-month inactivity warning was sent. Null = not warned. Deletion '
  'happens 30 days after this, per the published privacy notice.';

-- ----------------------------------------------------------------------------
-- 2. DRY RUN — always look at this before enabling anything below.
-- ----------------------------------------------------------------------------
-- Accounts that have passed 24 months of inactivity and should be warned:
--
--   select user_id, updated_at
--   from public.user_state
--   where updated_at < now() - interval '24 months'
--     and inactivity_warned_at is null;
--
-- Accounts warned over 30 days ago with still no activity, due for deletion:
--
--   select user_id, updated_at, inactivity_warned_at
--   from public.user_state
--   where inactivity_warned_at is not null
--     and inactivity_warned_at < now() - interval '30 days'
--     and updated_at < inactivity_warned_at;

-- ----------------------------------------------------------------------------
-- 3. The deletion itself.
--
--    Deletes from auth.users; the user_state row follows via ON DELETE CASCADE,
--    exactly as in-app account deletion does. `security definer` is required to
--    touch the auth schema, and search_path is pinned so the function cannot be
--    hijacked through a malicious search_path.
-- ----------------------------------------------------------------------------
create or replace function public.delete_inactive_accounts()
returns integer
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  removed integer := 0;
begin
  -- Only ever touches accounts that were warned, whose grace period has
  -- expired, and which have had no activity since the warning.
  with doomed as (
    select user_id
    from public.user_state
    where inactivity_warned_at is not null
      and inactivity_warned_at < now() - interval '30 days'
      and updated_at < inactivity_warned_at
  )
  delete from auth.users u
  using doomed d
  where u.id = d.user_id;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.delete_inactive_accounts() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Schedule it — ONLY after the dry run looks right and warning emails are
--    actually being sent. Uncomment to enable.
-- ----------------------------------------------------------------------------
-- select cron.schedule(
--   'delete-inactive-accounts',
--   '0 3 * * 0',                              -- 03:00 every Sunday
--   $$ select public.delete_inactive_accounts(); $$
-- );
--
-- To stop it:  select cron.unschedule('delete-inactive-accounts');
