# Well Seasoned — project state & operating notes

Film & TV rating site built for Black culture. Dual score: **The Kitchen**
(verified critics) + **The Table** (community vote); the seal lands only when
both agree. Founding principle: **nothing fake** — no fabricated scores,
reviews, or votes, ever.

## Stack
- `index.html` — the entire app (single file, inline CSS + ES5 JS, no build).
  Hash-routed SPA (`#/view/arg`). Deployed on Vercel; pushes to
  `claude/new-session-9aa459` (the default branch) auto-deploy to
  https://itswellseasoned.com.
- `api/showtimes.js` — Vercel serverless SerpApi proxy (env `SERPAPI_KEY`).
- Supabase project `iherwgeuxwpapjreoofq` — Postgres + RLS + GoTrue auth.
  `backend/schema.sql` documents the schema (live changes went in as MCP
  migrations; keep the file in parity). Publishable key in the client is
  public by design; RLS is the enforcement layer.
- TMDB for posters/backdrops/cast/now-playing.
- Cloudflare Turnstile (invisible) on all GoTrue calls; Supabase Attack
  Protection CAPTCHA is ON — tokenless auth calls fail with `captcha_failed`.

## Launch checklist state (2026-07-02)
Done and verified live:
- Real auth (email+password, auto-confirm trigger) + silent anonymous
  identities for voting (`ensureIdentity`).
- Vote integrity phases 1+2: votes/comments require `user_id = auth.uid()`,
  one vote per identity, forged ids rejected, legacy null rows claimable.
- Invisible CAPTCHA wired client-side (`captchaToken`/`withCaptcha`) and
  enforced server-side.
- Privacy Policy + Terms at `#/legal/privacy` / `#/legal/terms`; footer links.
- `hello@itswellseasoned.com` forwards to owner Gmail via ImprovMX
  (MX/SPF records live on Vercel DNS).
- Analytics: first-party `events` table via `track()`; film/actor/actress
  leaderboards; showtimes; share cards; critic pipeline
  (`verify_critic` RPC, `kitchen_scores` view).

In progress:
- **Resend SMTP** for password-reset delivery. Client reset flow is already
  built (`forgotPassword` → `/recover` → `checkRecoveryHash`). Waiting on
  owner: create resend.com account, add domain, relay the DNS records
  (DKIM values are account-specific), add them in Vercel DNS, paste API key
  into Supabase → Auth → SMTP (host `smtp.resend.com`, port 465, user
  `resend`, sender `hello@itswellseasoned.com`). Then send a live test
  reset email end-to-end.

Open/backlog:
- Prerender/OG for crawlers (per-film share previews server-side).
- Data hygiene: a handful of pre-integrity test votes may remain.
- Vercel Web Analytics dashboard toggle (owner action).

## Risk tiers for this repo
Stop and confirm with the owner first:
- Supabase migrations touching RLS/policies on votes, comments, profiles
  (a bad policy silently breaks ALL voting — it happened once via a
  read-policy scoped to `{anon}` only; fixed by `read_policies_all_roles`).
- Auth-flow changes (signup/signin/anonymous identity/captcha).
- Legal copy (`#/legal/*`), DNS records, anything spending money.
Proceed-then-report: UI/content changes, film-page rendering, styling,
docs. Every push deploys production — verify locally (headless Chromium,
`NODE_PATH=/opt/node22/lib/node_modules`, executable
`/opt/pw-browsers/chromium`) before pushing.

## Conventions
- ES5 only in `index.html` (no arrow functions, template literals, let/const).
- Match the existing comment voice; comments explain constraints, not diffs.
- Test-harness gotcha: with Playwright routes, register the catch-all
  `**/rest/v1/**` FIRST and specific routes LAST (last registered wins).
- Git: develop on `claude/new-session-9aa459` only.
