-- ============================================================================
-- Prep a Constable — does the app actually help people?
--
-- Answers that question from data you already hold, WITHOUT looking at any
-- individual. Everything here returns aggregates only.
--
-- Three safeguards are built in, and they are the reason this is a small,
-- defensible piece of processing rather than a new privacy problem:
--
--   1. AGGREGATE ONLY. No function here returns a user_id, an email, a name,
--      or any row that belongs to one person.
--   2. MINIMUM COHORT. Every figure returns NULL unless at least MIN_COHORT
--      people are in it, so a number can never be traced back to one user.
--   3. OPT-OUT RESPECTED. Rows where profile.statsOptOut is true are excluded
--      before anything is counted. That is the right to object under Article 21
--      of the UK General Data Protection Regulation, honoured in the query
--      itself rather than by a promise.
--
-- Lawful basis: legitimate interests. See docs/LEGITIMATE-INTERESTS-ASSESSMENT.md.
--
-- ⚠ Run these from the Supabase SQL editor or with the service role. They are
--   deliberately NOT exposed to the app — no signed-in user can call them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The cohort: everyone who has not opted out and has actually used the app.
-- ----------------------------------------------------------------------------
create or replace view public.stats_cohort as
  select
    user_id,
    state,
    coalesce((state -> 'profile' ->> 'statsOptOut')::boolean, false) as opted_out
  from public.user_state
  where coalesce((state -> 'profile' ->> 'statsOptOut')::boolean, false) = false
    and jsonb_typeof(state -> 'answered') = 'object'
    and (select count(*) from jsonb_object_keys(state -> 'answered')) >= 20;

comment on view public.stats_cohort is
  'Internal. Users who have not objected and have answered at least 20 questions. '
  'Never expose to the client — it carries user_id so the aggregates below can '
  'count distinct people.';

revoke all on public.stats_cohort from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. Headline: is accuracy improving, and are people passing?
--
--    "correctCount / totalCount" per question is already stored per user, so
--    lifetime accuracy needs no new collection at all.
-- ----------------------------------------------------------------------------
create or replace function public.app_effectiveness(min_cohort integer default 20)
returns table (
  people                  integer,
  median_questions_answered integer,
  mean_accuracy_pct       numeric,
  people_with_real_result integer,
  real_exam_pass_rate_pct numeric,
  mean_real_exam_pct      numeric
)
language sql
security definer
set search_path = 'public'
as $$
  with per_user as (
    select
      c.user_id,
      (select count(*) from jsonb_object_keys(c.state -> 'answered')) as answered_n,
      (
        select case when sum((v ->> 'totalCount')::numeric) > 0
               then 100.0 * sum((v ->> 'correctCount')::numeric)
                          / sum((v ->> 'totalCount')::numeric) end
        from jsonb_each(c.state -> 'answered') as e(k, v)
      ) as accuracy_pct,
      (
        select avg((r ->> 'scorePct')::numeric)
        from jsonb_array_elements(coalesce(c.state -> 'realExams', '[]'::jsonb)) as r
      ) as mean_real_pct,
      (
        select bool_or((r ->> 'scorePct')::numeric >= 60)
        from jsonb_array_elements(coalesce(c.state -> 'realExams', '[]'::jsonb)) as r
      ) as passed_a_real_exam
    from public.stats_cohort c
  ),
  n as (select count(*)::integer as people from per_user)
  select
    n.people,
    -- Every figure is suppressed below the minimum cohort size.
    case when n.people >= min_cohort then
      (select percentile_cont(0.5) within group (order by answered_n)::integer from per_user) end,
    case when n.people >= min_cohort then
      (select round(avg(accuracy_pct), 1) from per_user where accuracy_pct is not null) end,
    case when n.people >= min_cohort then
      (select count(*)::integer from per_user where passed_a_real_exam is not null) end,
    case when (select count(*) from per_user where passed_a_real_exam is not null) >= min_cohort then
      (select round(100.0 * count(*) filter (where passed_a_real_exam) / nullif(count(*), 0), 1)
       from per_user where passed_a_real_exam is not null) end,
    case when (select count(*) from per_user where mean_real_pct is not null) >= min_cohort then
      (select round(avg(mean_real_pct), 1) from per_user where mean_real_pct is not null) end
  from n;
$$;

comment on function public.app_effectiveness(integer) is
  'Aggregate only. Returns NULL for any figure whose cohort is below min_cohort.';

revoke all on function public.app_effectiveness(integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Improvement: are people getting better at their mocks over time?
--
--    Compares each person's FIRST saved mock against their BEST, then averages
--    the change. One row out, never per person.
-- ----------------------------------------------------------------------------
create or replace function public.app_improvement(min_cohort integer default 20)
returns table (
  people_with_two_or_more_mocks integer,
  mean_first_mock_pct           numeric,
  mean_best_mock_pct            numeric,
  mean_improvement_points       numeric
)
language sql
security definer
set search_path = 'public'
as $$
  with per_user as (
    select
      c.user_id,
      (select count(*) from jsonb_array_elements(coalesce(c.state -> 'attempts', '[]'::jsonb))) as n_mocks,
      -- attempts are stored newest-first, so the LAST element is the earliest.
      (
        select 100.0 * (a ->> 'score')::numeric
        from jsonb_array_elements(coalesce(c.state -> 'attempts', '[]'::jsonb))
             with ordinality as t(a, ord)
        order by ord desc limit 1
      ) as first_pct,
      (
        select max(100.0 * (a ->> 'score')::numeric)
        from jsonb_array_elements(coalesce(c.state -> 'attempts', '[]'::jsonb)) as a
      ) as best_pct
    from public.stats_cohort c
  ),
  eligible as (select * from per_user where n_mocks >= 2 and first_pct is not null),
  n as (select count(*)::integer as people from eligible)
  select
    n.people,
    case when n.people >= min_cohort then (select round(avg(first_pct), 1) from eligible) end,
    case when n.people >= min_cohort then (select round(avg(best_pct), 1) from eligible) end,
    case when n.people >= min_cohort then (select round(avg(best_pct - first_pct), 1) from eligible) end
  from n;
$$;

revoke all on function public.app_improvement(integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Where people struggle — which topics need better content.
--
--    This one is as much a content tool as a metric: a topic everyone fails is
--    usually a teaching problem, not a cohort of weak candidates.
-- ----------------------------------------------------------------------------
create or replace function public.app_topic_difficulty(min_cohort integer default 20)
returns table (
  topic_id      text,
  people        integer,
  mean_accuracy_pct numeric
)
language sql
security definer
set search_path = 'public'
as $$
  with answers as (
    select c.user_id,
           split_part(e.k, '-', 2) as topic_hint,
           (e.v ->> 'correctCount')::numeric as correct,
           (e.v ->> 'totalCount')::numeric   as total
    from public.stats_cohort c,
         jsonb_each(c.state -> 'answered') as e(k, v)
  ),
  per_topic as (
    select topic_hint,
           count(distinct user_id)::integer as people,
           case when sum(total) > 0 then round(100.0 * sum(correct) / sum(total), 1) end as acc
    from answers
    where total > 0
    group by topic_hint
  )
  select topic_hint, people, acc
  from per_topic
  where people >= min_cohort          -- suppress small topics entirely
  order by acc asc nulls last;
$$;

revoke all on function public.app_topic_difficulty(integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- How to use it
--
--   select * from public.app_effectiveness();
--   select * from public.app_improvement();
--   select * from public.app_topic_difficulty();
--
-- Early on every figure will come back NULL, because the cohort is below 20.
-- That is the safeguard working, not a bug. `people` still tells you how many
-- you have, so you know when the numbers will start appearing.
-- ----------------------------------------------------------------------------
