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

## Launch checklist state (2026-07-03)
Done and verified live:
- Real auth (email+password, auto-confirm trigger) + silent anonymous
  identities for voting (`ensureIdentity`).
- Admin is passphrase-free for the owner: `admin_list_applications`,
  `admin_set_application_status`, `verify_critic`, `verify_writer`,
  `publish_curation`, `publish_article`, `delete_article` all authorize on
  EITHER `auth.jwt()->>'email' = hello@pivottraining.us` (sent via
  `sbUserHeaders`) OR the legacy passphrase. Client uses `_adminSecretQuiet()`
  (no prompt). Curate ⇄ Applications cross-linked (`📥 Applications` in the
  curate tools, `← Curate` in the inbox). SECURITY: dropped the broad
  `contrib_media_read` SELECT policy on `storage.objects` — the public
  `contributor-media` bucket still serves object URLs but can no longer be
  listed/enumerated. app_secrets is RLS-locked (0 rows to anon).
- Vote integrity phases 1+2: votes/comments require `user_id = auth.uid()`,
  one vote per identity, forged ids rejected, legacy null rows claimable.
- Vote integrity phase 3 (2026-07-03): `votes` re-keyed on IDENTITY. It was
  the last table still keyed on `(film_slug, device_id)` with a tangled
  two-generation policy set split across `{anon}`/`{public}` roles. Silent
  anonymous identities run as Postgres role `authenticated`, so the `{anon}`
  policies never applied to real voters, and the shared device row 403'd every
  upsert the moment a voter's identity changed (guest→real account, or a
  rotated anon identity) — the "every vote says can't save" bug. Fix: unique
  key is now `(film_slug, user_id)`, client upserts
  `on_conflict=film_slug,user_id` (an upsert only ever touches the caller's
  OWN row); `device_id` reverted `uuid`→`text` (nullable, metadata only —
  stops 400s on non-uuid fallback ids); one clean `{public}` policy set
  mirroring `person_votes`/`excitement_votes` (read-all, insert/update gated
  on `user_id=auth.uid()`, owner delete). All 105 rows preserved; forge +
  guest→signin re-vote verified in RLS. NOTE: `person_votes` still carries the
  same latent device-keyed 403 (harmless so far) — re-key it the same way if
  it ever surfaces.
- Invisible CAPTCHA wired client-side (`captchaToken`/`withCaptcha`) and
  enforced server-side (Turnstile site key in `TURNSTILE_KEY`; Supabase
  Attack Protection CAPTCHA ON — tokenless auth = `captcha_failed`).
- Privacy Policy + Terms at `#/legal/privacy` / `#/legal/terms`; footer links.
- `hello@itswellseasoned.com` forwards to owner Gmail via ImprovMX
  (MX/SPF records live on Vercel DNS).
- Analytics: first-party `events` table via `track()`; film/actor/actress
  leaderboards; showtimes; share cards; critic pipeline
  (`verify_critic` RPC, `kitchen_scores` view).
- Home shelves rotate per visit (`seededShuffle`/`HOME_SEED`, one seed per
  page load; sorted/canon shelves keep their order). Browse grid fixed 4-col
  (`.grid-cards`, steps 4→3→2). Tubi shelf shows 18.
- Coming Soon (`renderSoon`, `COMING_SOON` array): every upcoming film is
  clickable to a detail page (`renderSoonDetail`, routed via `cs-*` ids
  through `renderFilm`). "Let's Go / Meh" excitement vote shows ONLY on
  films with a trailer. Backed by `excitement_votes` table +
  `excitement_scores` view — RLS mirrors `person_votes` phase-2 exactly
  (all-roles read, insert/update require `user_id=auth.uid()`, owner delete);
  client fns `excitementVote`/`syncExcitement`/`loadAllExcitement`. Verified:
  forged user_id + bad stance rejected.
- Transfer (2025, dir. Paul D. Hannah, TMDB 1557378) added to catalog on
  Tubi with real pinned poster in `WS_POSTERS`; no fake score/votes.
- July 4 freedom spotlight (`#freedomSection` at the top of home, `isJuly4()`
  date gate, `FREEDOM_FILMS`/`paintFreedom`, `.freedom` CSS): live only on
  July 4 (visitor local time, 12am–12am July 5), auto-hides otherwise. Six real
  catalog films on the fight against injustice / for freedom — Birth of a Nation
  (2016 Nat Turner rebellion, the only slavery-era title, owner's call), Selma,
  Judas and the Black Messiah, Malcolm X, 13th, The Hate U Give. To change the
  picks edit `FREEDOM_FILMS`; recurs every July 4. Header shows the
  **African-American flag** (David Hammons, red/black stripes + green canton
  with black stars) as inline SVG (`.aa-flag`); section accent is red/black/green.
- Featured spotlight carousel on the home page (`FEATURED` array →
  `paintFeatured`/`featSlideHTML`/`featGo`/`featSet`, auto-rotates, pinned
  backdrops for cinematic art, `.feat-car` CSS). Editorial pick of
  genuinely-current, prominently-Black titles (lead and/or creator suffices —
  owner's bar). Currently: Man of War (2026 film, LaMonica Garrett, dir.
  William Kaufman, real Apple TV deep link via per-film `f.watch` override),
  Survival of the Thickest (Netflix, S3 dropped 2026-07-02), All the Queen's
  Men (BET+, S5 dropped 2026-06-10). All real TMDB art/data, `k/t:null`,
  `votes:0`, no reviews — nothing fake.
- Search typeahead (`searchSuggest`/`searchKey`/`pickSuggest`, `#searchSuggest`
  dropdown): as you spell, prompts title matches (starts-with ranked first,
  then contains, then dir/cast), poster thumb + year·dir, arrow/enter to open,
  Enter-with-nothing runs the full Browse search. Desktop header only (search
  is hidden on mobile).
- Per-film where-to-watch deep links: optional `f.watch` map ({provider:url})
  overrides the generic provider-search `watchUrl()` when a title has a
  verified direct link (used for Man of War → Apple TV, since TMDB's
  watch/providers feed is empty for day-one VOD releases).
- Contributor sign-up portal in the footer (`.join-portal`, two lanes → The
  Kitchen for critics / The Word for writers). Both open a rich profile form
  (`openContribute(role)` → `doApply(role)`; `openApplyKitchen` kept as an
  alias): name/byline, email, **profile photo upload**, bio, outlet/beat,
  social media, work/site link. Photos upload to the public Supabase Storage
  bucket `contributor-media` (image-only, 5MB cap; insert policy `to
  authenticated` so silent-anon identities can upload, public read) via
  `contribPickAvatar`. Applications land in `critic_applications` with a
  `role` column (`critic`|`writer`) plus `bio`/`avatar_url`/`socials` columns —
  one editorial inbox, human review, nothing bought.
- Admin applications inbox at `#/inbox` (`renderInbox`/`inboxLoad`/
  `inboxCardHTML`/`inboxSetStatus`/`inboxSeat`, footer "Applications" admin
  link). Owner-only UI. The admin RPCs (`admin_list_applications`,
  `admin_set_application_status`, `verify_critic`) now authorize on EITHER the
  owner's login (`auth.jwt()->>'email' = hello@pivottraining.us`, sent via
  `sbUserHeaders`) OR the legacy passphrase — so the owner reviews/seats with
  no passphrase prompt. Applicant `work_url`/`socials` render through
  `linkifyList` (splits on comma, prepends `https://` to bare domains) so a
  link like `youtube.com/@x` no longer 404s as a relative path.
- Contributor agreements: a shared 3-step onboarding popup (`openTerms(kind)`/
  `paintTerms`/`termsGo`/`acceptTerms`, `TERMS`={critic,writer}, `CRITIC_STEPS`
  + `WRITER_STEPS`, `.ct-*` CSS) covering the job, the ethics they agree to, and
  what the role is NOT. Shown automatically to a seated critic OR approved
  writer who hasn't accepted (`loadMyProfile` reads `critic_agreed_at`/
  `writer_agreed_at`; critic gates `submitCriticReview`). Acceptance via
  SECURITY DEFINER RPCs `accept_critic_terms()` / `accept_writer_terms()`.
  Writers now have full parity: `profiles.is_writer`, approve/remove via
  `verify_writer(p_secret,p_email,p_on)` (owner-login or passphrase, copies
  bio/avatar like `verify_critic`). Inbox actions per lane: critic
  Seat/Remove critic (`inboxSeat`/`inboxRemove` → `verify_critic`), writer
  Approve/Remove writer (`inboxApproveWriter`/`inboxRemoveWriter` →
  `verify_writer`).
- Seat/approve gives the owner an immediate confirmation modal (`seatedConfirm`)
  with an "✉️ Email them the news" button (`notifyContributor` → a pre-filled
  `mailto:` in the owner's mail app — automated email awaits Resend SMTP). The
  contributor's own onboarding popup still appears in THEIR browser on next
  sign-in. Agreement popup font sizes bumped up for readability.
- Shareable apply links: in-app `#/apply/critic`/`#/apply/writer` (`#/apply` →
  critic) open the application form over home (`render` special-cases `apply` →
  `openContribute`). For SHARING, `applyLink()` returns the server route
  `/apply/<role>` (`api/apply.js` + `vercel.json` rewrite) which serves its own
  OG/Twitter preview ("Want to be a critic?" / "Want to write for the culture?")
  then bounces humans to `#/apply/<role>` — same pattern as `/f/<slug>`. Helpers
  `applyLink`/`copyApplyLink`/`shareApplyLink`.
  Footer portal cards have a "Share link ↗" (native share/copy); the admin
  inbox has a "Recruit beyond the site" row with Copy Kitchen/Word link
  buttons. So recruiting isn't only internally driven. Reads every application via
  SECURITY DEFINER RPC `admin_list_applications(p_secret)` (bypasses the
  own-row RLS only for a verified admin); `admin_set_application_status(
  p_secret,p_id,p_status)` shortlists/passes; critic "Seat" reuses
  `verify_critic` (flips `profiles.is_critic`). Cards show photo/bio/socials/
  work, lane badge, and status.
- Admin access is OWNER-ONLY (`isOwner()` → `app.signedIn` &&
  `app.email`==`OWNER_EMAIL` = `hello@pivottraining.us`, case/space-insensitive).
  The old `#/admin` device-flag unlock is retired; `refreshAdminUI()` (called
  from `renderAuthSlot`, so it follows login/logout) hides the footer admin
  links, and `renderCuratePage`/`renderInbox`/`openArticleEditor` refuse unless
  `isOwner()`. Backend writes stay double-locked by the admin passphrase. To
  change the owner, edit `OWNER_EMAIL`. Footer contributor portal also has a
  "Critic & writer sign in" link for already-seated contributors.
- Seated-critic bylines: `profiles` gained `avatar_url`/`bio` (public via the
  existing `profiles_critics_public` policy). `verify_critic` now copies the
  applicant's photo + bio from their latest `critic_applications` row onto the
  profile when seating (coalesce — never wipes). `loadKitchenReviews` selects
  `profiles(name,critic_outlet,avatar_url,bio)`; the film-page review card
  renders the photo (initial-letter fallback) + bio as a real byline. No fake
  data — only shows once a real critic is seated and posts.

- The Group Chat (community rooms) — PROTOTYPE. Per-show discussion boards for
  cult titles. Views `#/rooms` (index) + `#/room/<slug>` (`renderRooms`/
  `roomCardHTML`/`renderRoom`/`loadRoomPosts`/`roomPostHTML`/`postRoom`/
  `delRoomPost`, `ROOMS` list, `.room-*` CSS). Nav link "Group Chat". Backed by
  `room_posts` (Supabase, free tier — no new cost) + `room_counts` view. Same
  integrity model as votes/comments: read-all, insert only as `user_id =
  auth.uid()` (forged rejected — verified), owner delete. Posting rides
  `ensureIdentityThen`/`sbVoteHeaders` (silent-anon ok). Rooms start empty
  ("be the first") — nothing seeded/fake. To change the lineup edit `ROOMS`.
  Nav-listed; say the word to unlist for a soft launch.

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
- More real Tubi Black-culture titles to deepen the shelf (verify each vs
  TMDB — nothing fake).

## Monetization direction (decided 2026-07-03)
Owner rule: truest-to-brand, **no non-Black advertising**. That rules out
ad networks. Pursue, in order: (1) Membership — community-funded, zero ads,
uses the existing `#/join` page; needs Stripe (NOT authorized in this
session — hand the owner the key/setup steps). (2) Black-aligned brand
sponsorships — clearly-labeled "presented by" shelves. (3) Aggregate,
anonymized audience-sentiment data product for studios/distributors (the
real moat; privacy-safe, B2B, no consumer ads). Wishlist = My Plate +
streaming deep-links out; Trakt sync is the only real cross-device path
(later).

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
- After changing the FILMS catalog, regenerate crawler share data:
  `node scripts/build-films-json.cjs` (zero-dep; adds missing films to
  `api/films.json` + backfills posters, so every title has a `/f/<id>` preview).
- ES5 only in `index.html` (no arrow functions, template literals, let/const).
- Match the existing comment voice; comments explain constraints, not diffs.
- Test-harness gotcha: with Playwright routes, register the catch-all
  `**/rest/v1/**` FIRST and specific routes LAST (last registered wins).
- Git: develop on `claude/new-session-9aa459` only. The owner also edits
  from another machine (commits show as "Add files via upload"), so ALWAYS
  `git fetch origin claude/new-session-9aa459` and check you're not behind
  BEFORE editing or pushing — otherwise you clobber their work (or hit a
  non-fast-forward). Re-check right before every push.
