-- Subscription tracker — Supabase schema.
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is idempotent.
--
-- It expects the roles Supabase creates (anon, authenticated, service_role) and
-- the auth schema. To try it on a plain Postgres, stub auth.users, auth.uid(),
-- the supabase_realtime publication, and those three roles first.
--
-- Model: a "household" owns the data. Everyone in the household sees and edits
-- the same subscriptions. Row-level security is what actually enforces that, so
-- the anon key in the browser can only ever reach your own household's rows.

-- ---------------------------------------------------------------- tables

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our subscriptions',
  -- Short code the second person types in to join. Not a secret worth
  -- protecting long-term, but it is random and rotatable.
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Ids on the child tables are client-generated text rather than uuid, so data
-- created offline keeps its id when it is uploaded, and the seeded category
-- ids stay readable. Uniqueness only has to hold within a household.
create table if not exists public.categories (
  household_id uuid not null references public.households(id) on delete cascade,
  id           text not null,
  name         text not null,
  color        text not null default '#64748b',
  created_at   timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists public.accounts (
  household_id uuid not null references public.households(id) on delete cascade,
  id           text not null,
  name         text not null,
  last4        text not null default '',
  created_at   timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists public.subscriptions (
  household_id                uuid not null references public.households(id) on delete cascade,
  id                          text not null,
  company                     text not null,
  -- Deliberately not foreign keys: a composite FK here would fight the
  -- household cascade on delete, and the app already blocks removing a
  -- category or account that is still in use.
  category_id                 text,
  account_id                  text,
  plan                        text not null default '',
  amount                      numeric(12, 2) not null default 0,
  currency                    text not null default 'USD',
  frequency                   text not null default 'monthly',
  start_date                  date not null,
  billing_anchor              date not null,
  payments_carried            integer not null default 0,
  status                      text not null default 'active',
  paused_on                   date,
  pause_cycle_days_remaining  integer,
  resume_reminder             date,
  canceled_on                 date,
  term_type                   text not null default 'ongoing',
  total_payments              integer,
  notes                       text not null default '',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  primary key (household_id, id)
);

-- ---------------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- membership

-- SECURITY DEFINER on purpose: policies on household_members cannot themselves
-- query household_members without recursing, so the check runs outside RLS.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Creating a household and joining it must happen together, or RLS would lock
-- the creator out of the row they just made.
create or replace function public.create_household(p_name text default 'Our subscriptions')
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  insert into public.households (name) values (coalesce(nullif(trim(p_name), ''), 'Our subscriptions'))
  returning * into h;

  insert into public.household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'owner');

  -- Starter categories, matching the app's local defaults.
  insert into public.categories (household_id, id, name, color) values
    (h.id, 'streaming', 'Streaming',            '#e0455f'),
    (h.id, 'music',     'Music Production',     '#8b5cf6'),
    (h.id, 'meals',     'Meal Delivery',        '#f59e0b'),
    (h.id, 'health',    'Health & Supplements', '#10b981'),
    (h.id, 'software',  'Software & Tools',     '#3b82f6'),
    (h.id, 'fitness',   'Fitness',              '#ec4899'),
    (h.id, 'other',     'Other',                '#64748b');

  return h;
end;
$$;

-- Joining needs to read a household the caller cannot yet see, so this also
-- runs as definer. It only ever exposes the row matching an exact code.
create or replace function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into h from public.households
  where invite_code = lower(trim(p_code));

  if not found then
    raise exception 'No household found for that invite code';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return h;
end;
$$;

-- Lets the app show "shared with" without granting a view over auth.users.
create or replace function public.household_member_emails(hid uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id, u.email::text, m.role, m.joined_at
  from public.household_members m
  join auth.users u on u.id = m.user_id
  where m.household_id = hid
    and public.is_household_member(hid);
$$;

create or replace function public.rotate_invite_code(hid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if not public.is_household_member(hid) then
    raise exception 'Not a member of that household';
  end if;

  code := encode(gen_random_bytes(4), 'hex');
  update public.households set invite_code = code where id = hid;
  return code;
end;
$$;

-- ---------------------------------------------------------------- keepalive

-- A deliberate target for the scheduled keep-alive ping
-- (.github/workflows/keepalive.yml). Free-tier projects pause after roughly a
-- week without activity, and a paused project can't sign anyone in. The ping
-- has to reach Postgres to count, so this gives it something real to execute
-- rather than relying on an endpoint that errors before it gets there.
--
-- SECURITY INVOKER: it touches no tables, so it needs no elevated rights, and
-- it stays out of the SECURITY DEFINER advisories.
create or replace function public.keepalive()
returns timestamptz
language sql
security invoker
stable
set search_path = public
as $$ select now() $$;

comment on function public.keepalive() is
  'Returns now(). Called by the scheduled keep-alive workflow so the project does not auto-pause.';

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- privileges

-- Every function above is SECURITY DEFINER, so it runs with the owner's rights
-- and bypasses RLS by design. Each guards itself, but none has a legitimate
-- caller who isn't signed in — so drop the implicit PUBLIC grant and hand
-- EXECUTE only to the roles that need it. Without this, Supabase's own linter
-- flags them as anonymously callable (lint 0028).
--
-- `authenticated` must keep EXECUTE on is_household_member: RLS policy
-- expressions are evaluated as the querying role, so revoking it there makes
-- every policy check error out instead of simply returning no rows.

revoke execute on function public.is_household_member(uuid)      from public, anon;
revoke execute on function public.create_household(text)         from public, anon;
revoke execute on function public.join_household(text)           from public, anon;
revoke execute on function public.household_member_emails(uuid)  from public, anon;
revoke execute on function public.rotate_invite_code(uuid)       from public, anon;

grant execute on function public.is_household_member(uuid)       to authenticated, service_role;
grant execute on function public.create_household(text)          to authenticated, service_role;
grant execute on function public.join_household(text)            to authenticated, service_role;
grant execute on function public.household_member_emails(uuid)   to authenticated, service_role;
grant execute on function public.rotate_invite_code(uuid)        to authenticated, service_role;

-- Only ever fires from the trigger; never reachable over the API.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.categories        enable row level security;
alter table public.accounts          enable row level security;
alter table public.subscriptions     enable row level security;

drop policy if exists households_read   on public.households;
drop policy if exists households_update on public.households;
create policy households_read on public.households
  for select using (public.is_household_member(id));
create policy households_update on public.households
  for update using (public.is_household_member(id))
  with check (public.is_household_member(id));

drop policy if exists members_read  on public.household_members;
drop policy if exists members_leave on public.household_members;
create policy members_read on public.household_members
  for select using (public.is_household_member(household_id));
-- You can remove yourself; removing someone else is not exposed to the client.
create policy members_leave on public.household_members
  for delete using (user_id = auth.uid());

-- The three data tables share one rule: full access within your household.
drop policy if exists categories_all on public.categories;
create policy categories_all on public.categories
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists accounts_all on public.accounts;
create policy accounts_all on public.accounts
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists subscriptions_all on public.subscriptions;
create policy subscriptions_all on public.subscriptions
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ---------------------------------------------------------------- realtime

-- Pushes changes to the other person's phone without a refresh.
do $$
begin
  alter publication supabase_realtime add table public.subscriptions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then null;
end $$;
