-- ============================================================
-- Well Seasoned — backend schema (Supabase / Postgres)
-- ------------------------------------------------------------
-- Run once in the Supabase SQL Editor for your project
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS / CREATE OR
-- REPLACE and guards existing objects, so it will not clobber a
-- votes table you already created.
--
-- What it gives you:
--   votes          one row per (film, device), for/against
--   vote_counts    live aggregate that feeds The Table score
--   comments       The Table reads (replaces the old fake seeds)
--   film_curation  move titles between shelves, feature/hide,
--                  mark classics, set a Kitchen score  ← "move things around"
--   waitlist       membership sign-ups
--   signups        lightweight email capture (footer + post-vote nudge)
--   RPCs           publish_curation() (admin), report_comment()
-- ============================================================

grant usage on schema public to anon, authenticated;

-- ========================================================
-- VOTES  (The Table)
-- ========================================================
create table if not exists public.votes (
  film_slug  text not null,
  device_id  text,                          -- metadata only (client-supplied), NOT the key
  stance     text not null check (stance in ('for','against')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ONE VOTE PER IDENTITY PER FILM. The conflict key is (film_slug, user_id), NOT
-- device, so an upsert only ever touches the caller's own row. Keying on device
-- used to 403 every write the moment a voter's identity changed (guest -> real
-- account, or a rotated anonymous identity), because the shared device row was
-- owned by a prior identity that current auth.uid() couldn't update. Mirrors
-- person_votes / excitement_votes.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.votes'::regclass
      and conname = 'votes_film_user_uniq'
  ) then
    alter table public.votes add constraint votes_film_user_uniq unique (film_slug, user_id);
  end if;
end $$;

create index if not exists votes_film_idx on public.votes (film_slug);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists votes_touch on public.votes;
create trigger votes_touch before update on public.votes
  for each row execute function public.touch_updated_at();

alter table public.votes enable row level security;

-- Identity-keyed, forge-proof, all roles ({public} covers anon AND the
-- authenticated role that even silent anonymous identities run as). Anyone
-- reads tallies; you may only insert/update/delete a row that carries your own
-- auth.uid(). A forged user_id is rejected by RLS (verified).
drop policy if exists votes_read   on public.votes;
drop policy if exists votes_write  on public.votes;   -- legacy {anon} generation
drop policy if exists votes_change on public.votes;    -- legacy {anon} generation
drop policy if exists votes_insert on public.votes;
drop policy if exists votes_update on public.votes;
drop policy if exists votes_delete on public.votes;
create policy votes_read   on public.votes for select to public using (true);
create policy votes_insert on public.votes for insert to public
  with check (stance in ('for','against') and user_id = auth.uid());
create policy votes_update on public.votes for update to public
  using (user_id = auth.uid())
  with check (stance in ('for','against') and user_id = auth.uid());
create policy votes_delete on public.votes for delete to public
  using (user_id = auth.uid());

grant select, insert, update, delete on public.votes to anon, authenticated;

-- Live aggregate that the app reads to build The Table score.
create or replace view public.vote_counts as
  select film_slug,
         count(*) filter (where stance = 'for')     as for_count,
         count(*) filter (where stance = 'against')  as against_count
  from public.votes
  group by film_slug;

grant select on public.vote_counts to anon, authenticated;

-- ========================================================
-- COMMENTS  (The Table reads)
-- ========================================================
create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  film_slug  text not null,
  name       text,
  stance     text check (stance in ('for','against')),
  body       text not null check (char_length(body) between 1 and 2000),
  device_id  text,
  reported   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_film_idx on public.comments (film_slug, created_at desc);

alter table public.comments enable row level security;
drop policy if exists comments_read   on public.comments;
drop policy if exists comments_insert on public.comments;
-- Only unreported comments are publicly visible.
create policy comments_read   on public.comments for select using (reported = false);
create policy comments_insert on public.comments for insert
  with check (char_length(body) between 1 and 2000);

grant select, insert on public.comments to anon, authenticated;

-- Flagging goes through an RPC so anon can only flip `reported`, nothing else.
create or replace function public.report_comment(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.comments set reported = true where id = p_id;
$$;
revoke all on function public.report_comment(bigint) from public;
grant execute on function public.report_comment(bigint) to anon, authenticated;

-- ========================================================
-- FILM CURATION  ← "move things around"
-- ========================================================
-- The catalog content still lives in index.html; this table only holds the
-- editorial overrides the app merges on top: which shelf a title sits on,
-- whether it's featured on home, hidden, a "Grandma's Recipe" classic, its
-- display order, and an optional Kitchen score.
create table if not exists public.film_curation (
  slug          text primary key,
  scope         text check (scope in ('ours','all')),
  featured      boolean,
  hidden        boolean,
  classic       boolean,
  sort_order    int,
  kitchen_score int check (kitchen_score between 0 and 100),
  updated_at    timestamptz not null default now()
);

alter table public.film_curation enable row level security;
drop policy if exists curation_read on public.film_curation;
-- Everyone reads curation; nobody writes it directly (writes go through the
-- admin RPC below, so the site can't be re-curated by random visitors).
create policy curation_read on public.film_curation for select using (true);
grant select on public.film_curation to anon, authenticated;

-- ========================================================
-- ADMIN SECRET + publish RPC
-- ========================================================
create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);
-- Seed the curation admin passphrase. CHANGE THIS VALUE, then keep it private.
insert into public.app_secrets (key, value)
values ('curation_admin', 'CHANGE-ME-to-a-long-random-secret')
on conflict (key) do nothing;

alter table public.app_secrets enable row level security;
-- No policies + no grants  => totally invisible to anon/authenticated.
-- Only SECURITY DEFINER functions (below) and the service role can read it.

-- Upsert a batch of curation rows. Anyone can call it, but it no-ops unless
-- the caller passes the matching admin passphrase.
create or replace function public.publish_curation(p_secret text, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare expected text; n int := 0; item jsonb;
begin
  select value into expected from public.app_secrets where key = 'curation_admin';
  if expected is null or p_secret is distinct from expected then
    raise exception 'unauthorized';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    insert into public.film_curation as fc
      (slug, scope, featured, hidden, classic, sort_order, kitchen_score, updated_at)
    values (
      item->>'slug',
      nullif(item->>'scope','')::text,
      (item->>'featured')::boolean,
      (item->>'hidden')::boolean,
      (item->>'classic')::boolean,
      nullif(item->>'sort_order','')::int,
      nullif(item->>'kitchen_score','')::int,
      now())
    on conflict (slug) do update set
      scope         = excluded.scope,
      featured      = excluded.featured,
      hidden        = excluded.hidden,
      classic       = excluded.classic,
      sort_order    = excluded.sort_order,
      kitchen_score = excluded.kitchen_score,
      updated_at    = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.publish_curation(text, jsonb) from public;
grant execute on function public.publish_curation(text, jsonb) to anon, authenticated;

-- ========================================================
-- WAITLIST  (membership sign-ups)
-- ========================================================
create table if not exists public.waitlist (
  id         bigint generated always as identity primary key,
  email      text not null,
  plan       text,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass
      and conname = 'waitlist_email_uniq'
  ) then
    alter table public.waitlist add constraint waitlist_email_uniq unique (email);
  end if;
end $$;

alter table public.waitlist enable row level security;
drop policy if exists waitlist_insert on public.waitlist;
-- Anon can add themselves; nobody can read the list back (private).
create policy waitlist_insert on public.waitlist for insert
  with check (position('@' in email) > 1);
grant insert on public.waitlist to anon, authenticated;

-- ========================================================
-- SIGNUPS  (lightweight "just take my email" capture — separate from real
-- account signup via auth/v1/signup. Footer form + a once-ever post-first-vote
-- nudge write here. No SELECT policy at all, so anon/authenticated can never
-- read the list back — insert-only, only postgres/service_role can read.
-- Applied live as a migration 2026-07-05.)
-- ========================================================
create table if not exists public.signups (
  email      text primary key,
  source     text,
  created_at timestamptz not null default now()
);

alter table public.signups enable row level security;
drop policy if exists signups_insert on public.signups;
create policy signups_insert on public.signups for insert
  with check (position('@' in email) > 1);
grant insert on public.signups to anon, authenticated;

-- identity columns need sequence usage for anon inserts via PostgREST
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================
-- OPTIONAL — stronger vote integrity via Supabase anonymous auth.
-- After enabling Authentication → Anonymous sign-ins, run this to tie
-- each vote to an auth user instead of a spoofable device id:
--
--   alter table public.votes add column if not exists user_id uuid default auth.uid();
--   drop policy if exists votes_insert on public.votes;
--   drop policy if exists votes_update on public.votes;
--   create policy votes_insert on public.votes for insert
--     with check (auth.uid() is not null and user_id = auth.uid() and stance in ('for','against'));
--   create policy votes_update on public.votes for update
--     using (user_id = auth.uid()) with check (stance in ('for','against'));
-- ============================================================

-- ============================================================
-- CRITIC PIPELINE — real verified critics ARE the Kitchen
-- (applied to the live project as migrations critic_pipeline +
--  fix_verify_critic_rowcount; kept here for parity)
-- ============================================================
alter table public.profiles add column if not exists is_critic boolean not null default false;
alter table public.profiles add column if not exists critic_outlet text;
alter table public.profiles add column if not exists critic_bio text;

drop policy if exists profiles_critics_public on public.profiles;
create policy profiles_critics_public on public.profiles for select using (is_critic = true);
grant select on public.profiles to anon;

create table if not exists public.critic_reviews (
  id         bigint generated always as identity primary key,
  film_slug  text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  score      int not null check (score between 0 and 100),
  body       text check (body is null or char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (film_slug, user_id)
);
create index if not exists critic_reviews_film_idx on public.critic_reviews (film_slug, created_at desc);

drop trigger if exists critic_reviews_touch on public.critic_reviews;
create trigger critic_reviews_touch before update on public.critic_reviews
  for each row execute function public.touch_updated_at();

alter table public.critic_reviews enable row level security;
drop policy if exists cr_read   on public.critic_reviews;
drop policy if exists cr_insert on public.critic_reviews;
drop policy if exists cr_update on public.critic_reviews;
create policy cr_read on public.critic_reviews for select
  using (exists (select 1 from public.profiles p where p.id = user_id and p.is_critic));
create policy cr_insert on public.critic_reviews for insert
  with check (auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_critic));
create policy cr_update on public.critic_reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.critic_reviews to anon, authenticated;
grant insert, update on public.critic_reviews to authenticated;

create or replace view public.kitchen_scores
with (security_invoker = true) as
  select film_slug, round(avg(score))::int as k, count(*)::int as critics
  from public.critic_reviews
  group by film_slug;
grant select on public.kitchen_scores to anon, authenticated;

create or replace function public.verify_critic(p_secret text, p_email text, p_outlet text default null, p_on boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
declare expected text; n int;
begin
  select value into expected from public.app_secrets where key = 'curation_admin';
  if expected is null or p_secret is distinct from expected then
    raise exception 'unauthorized';
  end if;
  update public.profiles
    set is_critic = p_on, critic_outlet = coalesce(p_outlet, critic_outlet)
    where lower(email) = lower(p_email);
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.verify_critic(text, text, text, boolean) from public;
grant execute on function public.verify_critic(text, text, text, boolean) to anon, authenticated;

-- ============================================================
-- BACKEND HARDENING (2026-07-04) — applied live as migrations
-- harden_debate_votes_phase2, room_posts_hide_reported_server_side,
-- pin_touch_vote_search_path; kept here for parity.
-- ============================================================
-- debate_votes joins the phase-2 model: writes only as yourself (the
-- legacy "user_id IS NULL" allowance was never used — zero null rows),
-- and one vote per identity per matchup is enforced server-side (the
-- client's localStorage guard clears too easily).
drop policy if exists debate_votes_insert on public.debate_votes;
drop policy if exists debate_votes_update_own on public.debate_votes;
create policy debate_votes_insert on public.debate_votes
  for insert to public with check (user_id = auth.uid());
create policy debate_votes_update_own on public.debate_votes
  for update to public using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy debate_votes_delete_own on public.debate_votes
  for delete to public using (user_id = auth.uid());
create unique index if not exists debate_votes_one_per_identity
  on public.debate_votes (debate_id, user_id);

-- Flagged room posts are hidden at the policy layer, not just by the
-- client filter (mirrors comments_read).
drop policy if exists room_read on public.room_posts;
create policy room_read on public.room_posts
  for select to public using (reported = false);

-- Pin the trigger function's search_path (linter 0011).
alter function public.touch_vote() set search_path = public;

-- ========================================================
-- PLATE ITEMS  (My Plate — synced per signed-in account)
-- applied live as migration create_plate_items (2026-07-05)
-- ========================================================
-- PRIVATE per-user data, unlike votes/comments/room_posts (public tallies
-- readable by all). Only the owning identity may read/insert/delete its own
-- rows, granted to `authenticated` only — no `anon` grant, since a wishlist
-- has no legitimate anon-role read/write (unlike a public vote tally).
-- localStorage (app.plate) stays the always-available local cache/source of
-- truth for rendering; this table is additive persistence so a real account
-- can pick the list back up on another device. Verified live: identity A can
-- insert/select/delete only its own rows; identity B cannot see or delete A's
-- row, and a forged insert (B inserting with A's user_id) is rejected by RLS.
create table if not exists public.plate_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  film_slug  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, film_slug)
);

alter table public.plate_items enable row level security;

drop policy if exists plate_items_select on public.plate_items;
drop policy if exists plate_items_insert on public.plate_items;
drop policy if exists plate_items_delete on public.plate_items;

create policy plate_items_select on public.plate_items for select
  to authenticated using (user_id = auth.uid());
create policy plate_items_insert on public.plate_items for insert
  to authenticated with check (user_id = auth.uid());
create policy plate_items_delete on public.plate_items for delete
  to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.plate_items to authenticated;

-- ========================================================
-- MY WATCH  (private "seen it" toggle + personal 1-5 star rating)
-- applied live as migration create_my_watch (2026-07-05)
-- ========================================================
-- STRICTLY PRIVATE per-user history — Letterboxd-style, NOT a new public
-- score. Never read by tableScore()/kitchen_scores/votes and must never
-- influence them ("nothing fake" — public Kitchen/Table numbers stay
-- editorially clean). Only the owning identity may read/insert/update/delete
-- its own rows, granted to `authenticated` only. touch_updated_at() is the
-- same shared trigger function used elsewhere in this schema. Verified live:
-- identity A can insert/select/update/delete only its own rows; identity B
-- sees zero of A's rows and an update targeting A's row affects zero rows;
-- a forged insert (B inserting with A's user_id) is rejected by RLS; upserting
-- the same (user_id, film_slug) twice updates the single row in place (the
-- primary key guarantees no duplicate).
create table if not exists public.my_watch (
  user_id    uuid not null references auth.users(id) on delete cascade,
  film_slug  text not null,
  seen       boolean not null default true,
  rating     int check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, film_slug)
);

alter table public.my_watch enable row level security;

drop trigger if exists my_watch_touch on public.my_watch;
create trigger my_watch_touch before update on public.my_watch
  for each row execute function public.touch_updated_at();

drop policy if exists my_watch_select on public.my_watch;
drop policy if exists my_watch_insert on public.my_watch;
drop policy if exists my_watch_update on public.my_watch;
drop policy if exists my_watch_delete on public.my_watch;

create policy my_watch_select on public.my_watch for select
  to authenticated using (user_id = auth.uid());
create policy my_watch_insert on public.my_watch for insert
  to authenticated with check (user_id = auth.uid());
create policy my_watch_update on public.my_watch for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy my_watch_delete on public.my_watch for delete
  to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.my_watch to authenticated;

-- ========================================================
-- NOTIFICATIONS  (in-app bell — replies + application status)
-- applied live as migration create_notifications (2026-07-06)
-- ========================================================
-- No insert policy exists for anon/authenticated at all — every row is
-- written through notify_user(), a SECURITY DEFINER RPC, so a client can
-- write a notification into someone ELSE's feed (e.g. "your critic seat was
-- removed") but can never insert directly, including into its own feed.
-- Only the owning identity may select/update (mark-read) its own rows.
-- Verified live: notify_user(A -> B) lands exactly one row visible only to
-- B; a direct client INSERT is rejected by RLS (no policy permits it); A's
-- SELECT/UPDATE against B's row sees/affects zero rows; B's own SELECT and
-- mark-read UPDATE both succeed.
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  body       text,
  film_slug  text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;

create policy notifications_select on public.notifications for select
  to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.notifications to authenticated;

create or replace function public.notify_user(p_user_id uuid, p_kind text, p_body text, p_film_slug text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, kind, body, film_slug)
  values (p_user_id, p_kind, p_body, p_film_slug);
end $$;
revoke all on function public.notify_user(uuid, text, text, text) from public;
grant execute on function public.notify_user(uuid, text, text, text) to authenticated;
