-- ============================================================
-- Well Seasoned — let people sign in without the confirmation email
-- ------------------------------------------------------------
-- WHY: Supabase's built-in confirmation email is rate-limited and
-- unreliable, so new users often never receive the "confirm your
-- email" link and then can't sign in. This script removes that
-- dependency by auto-confirming accounts.
--
-- IMPORTANT: You cannot send email from SQL. Actual delivery is a
-- dashboard setting. You have two clean paths:
--   (A) Fastest, no email at all: Dashboard → Authentication →
--       Providers → Email → turn OFF "Confirm email". Sign-in is
--       then instant. (This script does the same thing via SQL if
--       you'd rather not touch the toggle.)
--   (B) Real confirmation emails: Dashboard → Project Settings →
--       Authentication → SMTP → plug in a provider (Resend,
--       SendGrid, Postmark, AWS SES…). Keep "Confirm email" ON.
--
-- TRADEOFF of this script: it SKIPS email verification — someone can
-- register with an address they don't own. Fine for a pre-launch /
-- community site; for production, prefer path (B) above.
--
-- RUN IN: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).
-- ============================================================

-- 1) Unblock everyone who already signed up but never got the email.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 2) Auto-confirm every future sign-up, so the email link isn't required.
create or replace function public.ws_auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists ws_auto_confirm on auth.users;
create trigger ws_auto_confirm
  before insert on auth.users
  for each row execute function public.ws_auto_confirm_user();

-- 3) (Optional) Check who has signed up.
-- select email, created_at, email_confirmed_at, last_sign_in_at
-- from auth.users
-- order by created_at desc
-- limit 50;

-- ------------------------------------------------------------
-- TO UNDO auto-confirm later (e.g. after you set up real SMTP):
--   drop trigger if exists ws_auto_confirm on auth.users;
--   drop function if exists public.ws_auto_confirm_user();
-- ...then re-enable "Confirm email" in the dashboard.
-- ============================================================
