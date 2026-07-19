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
- Home shelves rotate weekly, not per page load (2026-07-07: `HOME_SEED` was
  pure-random per load, meaning a reload mid-session could reshuffle under a
  returning visitor and different visitors saw different sets at the same
  moment; now derived from the ISO-ish week number so the pick holds steady
  for everyone all week, then rotates the following week). `seededShuffle`
  unchanged; sorted/canon shelves keep their order. Browse grid fixed 4-col
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
- Featured Table reads (2026-07-06): owner-curated standout comments, surfaced
  as a pull-quote on the film page (`#featQuoteBlock`, between the verdict
  scores and the synopsis) and pinned/badged first in the comment list
  (`.cmt.featured`, `.feat-tag`), plus a home shelf pulling featured reads
  across films ("What the culture's saying", `culTalkSection`/`loadCulTalk`/
  `culTalkCardHTML`). `comments` gained a `featured boolean` column (purely
  additive, no existing policy touched); toggled only via the owner-gated
  SECURITY DEFINER RPC `set_comment_featured` (owner login OR passphrase,
  same pattern as `verify_critic`), called from `toggleCommentFeatured()`.
  The ☆/★ toggle button in the comment list only renders for `isOwner()`;
  everyone else just sees the read-only "★ Featured" badge. Nothing
  auto-picked — a human chooses it, same bar as every other curation flag.
- The Group Chat (community rooms) — REMOVED from the site 2026-07-08 (owner
  request, swapped for "On The Couch"). Was per-show discussion boards for
  cult titles at `#/rooms`/`#/room/<slug>`; all client-side routing, markup,
  CSS, and JS (`renderRooms`/`roomCardHTML`/`renderRoom`/`loadRoomPosts`/
  `roomPostHTML`/`postRoom`/`delRoomPost`, `ROOMS` list, `.room-*` CSS) were
  deleted. `roomAgo()` survived the cut — it's also the notifications
  dropdown's relative-time formatter. The Supabase backend (`room_posts`
  table, `room_counts` view, `report_room_post` RPC, its RLS policies) was
  deliberately left alone — dropping a live table is a separate, much more
  destructive call than removing a nav tab, and nobody asked for that; it's
  just inert now. Old `#/rooms`/`#/room/<slug>` links fall back to home via
  `parseHash()`'s unknown-view handling — no broken page, just a redirect.
  To revive: the backend is still there, only the client half needs rebuilding.
- **On The Couch** (`#/couch`, `renderCouch()`) — replaced Group Chat in the
  nav. Every Black-led TV series in the catalog (`type==='tv' &&
  scopeMatch(f)`) in one shelf, with a platform filter chip row
  (`COUCH_WHERE`/`setCouchWhere`) built dynamically from whatever `where`
  values actually appear among the catalog's shows — never a hardcoded
  platform list that could drift from reality. Reuses `cardHTML`/
  `.grid-cards`/`.filters`/`.chip` — no new visual language, same as every
  other browse-style page. Defaults to "our" shows first (2026-07-08): uses
  the existing global `app.scope` toggle (already proven on Browse/Rankings,
  defaults to `'ours'`) rather than a page-local one, so it's one shared
  preference site-wide. `scopeToggleHTML()` now takes optional label/note
  params so Couch reads "Our Shows"/"All Shows" instead of Browse's "Our
  Films"/"All Films"; `setScope()` re-renders Couch when it's the active
  view. Right now every TV title in the catalog is tagged `scope:'ours'`, so
  the two buttons show the same count until a non-"ours" show is added — the
  toggle itself is live and verified (headless Chromium: `app.scope`
  actually filters `scopeMatch`, button `.on` state updates on click).
  Also fixed while verifying: the `#/advertise` page's "Request the media
  kit"/"Email us directly" buttons were silently dead — their `onclick`
  attributes were built with `JSON.stringify(t.name)`, which emits
  double-quoted strings inside an already-double-quoted `onclick="..."`
  attribute, truncating the attribute at the first embedded `"` and throwing
  a `SyntaxError` on click. Fixed by switching to the same escaped-single-
  quote convention used everywhere else in the file (`onclick="fn(\''+
  esc(x)+'\')"`, e.g. `setCouchWhere`).

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
- **Interviews section** (2026-07-09, owner: "score an interview to put on
  the site... scaffold an interview area eventually not now") — a new
  content type for real interviews with actors/actresses from upcoming
  Black-led TV shows or movies, displayed cleanly and on-brand (same visual
  bar as the rest of the site — see "Conventions" spotlight-UI note).
  Explicitly deferred by the owner — do NOT build UI yet. When it's time to
  scaffold: likely mirrors The Word's article pattern (`openArticleEditor`/
  `publish_article`, owner-only) rather than a new backend primitive —
  interviews are editorial content like articles, just video/quote-driven
  instead of prose. Needs real audio/video or transcript, real photo, real
  attribution — same "nothing fake" bar as reviews. Ask the owner for format
  (embedded video? transcript? both?) and the first real interview's media
  before building.

## Monetization direction (decided 2026-07-03)
Owner rule: truest-to-brand, **no non-Black advertising**. That rules out
ad networks. Pursue, in order: (1) Membership — community-funded, zero ads,
uses the existing `#/join` page; needs Stripe — owner explicitly authorized
building this on 2026-07-05. No real Stripe account/keys exist yet, so the
checkout path is built as a config-gated scaffold (safely returns "not
configured yet" until real `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` are set in
Vercel) — see the dedicated Stripe section below once built. (2) Black-aligned brand
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
- **Visual bar for "featured moment" UI** (set 2026-07-09 via the Emmy
  carousel, owner: "remember this level of style for the future"): when
  building a promotional/spotlight unit — banners, carousels, callouts for a
  real event/moment (awards, drops, etc.) — default to depth and energy, not
  a flat card. Reference example: `.emmy-car-*` (index.html). Concretely:
  dark "stage" background rather than a light panel-in-a-panel box (content
  sits directly on the page, no boxed-in-a-box framing); gold spotlight/glow
  motion (conic-gradient sweep, pulsing box-shadow glow, twinkle accents);
  a foil-framed/badged image treatment instead of a bare `<img>`; real
  progress feedback (story-style segmented fill) instead of static dots;
  one big, confident title instead of a small eyebrow + separate headline.
  Still CSS-only (`animation`/`transition`, no new deps), still respects
  `prefers-reduced-motion`, still no fabricated data — the energy is in the
  chrome, not in inventing numbers or reviews. Default to this level of
  polish for the next spotlight-style feature rather than shipping a plain
  version first and iterating up.
- Catalog at 1053 titles (2026-07-08): +10 more via a direct owner list — Good
  Burger, Good Burger 2, Don't Be a Menace to South Central While Drinking
  Your Juice in the Hood, Booty Call, The Brothers, Mr. Church, Pride (2007,
  the Jim Ellis swim-team film — not the 2014 UK LGBT film of the same name),
  The Best of Enemies, Cross, and Lioness. `Tyler Perry's Zatima` (the actual
  show behind the owner's "Fatima, also on Paramount") turned out to already
  be in the catalog, so it was skipped rather than duplicated. Note on
  `lioness`: Zoe Saldaña-led but not Black-directed/created (Taylor
  Sheridan/Paramount+) — included on the owner's explicit call, flagged as a
  closer-than-usual bar case same as `Ride or Die`.
- Catalog grown from 887 to 1043 titles (2026-07-08): 156 real, individually
  verified additions across dramas/thrillers, comedies/romance, TV series,
  documentaries, international/Nollywood/UK/Caribbean/African cinema (+ a
  couple of shorts), and sports films/docs + stand-up specials — sourced via
  parallel research agents (each cross-checked against the existing catalog
  and a real web source before inclusion), then deduped programmatically
  against the full existing title+year list before insertion (zero
  collisions). No fake data: `k`/`t` null, `votes:{for:0,against:0}`,
  `reviews:[]` on every new entry, same as always. `where` is a best-guess
  streaming home per title (falls back to `'Rent'` when unconfirmed — the
  generic provider-search chip, not a false claim of a specific service).
  Posters/backdrops are NOT baked in for these — they resolve the same way
  every other title does, via the live TMDB title+year lookup at render
  time (`hydrateFilmMedia`); only pin `WS_POSTERS` if the auto-match is ever
  wrong for one of them.
- After changing the FILMS catalog, regenerate crawler share data:
  `node scripts/build-films-json.cjs` (zero-dep; adds missing films to
  `api/films.json` + backfills posters, so every title has a `/f/<id>` preview).
- ES5 only in `index.html` (no arrow functions, template literals, let/const).
- Catalog identity is **title+year**, never title alone — remakes/series
  legitimately coexist (Shaft ’71/’00/’19, Roots ’77/’16, Color Purple
  ’85/’23, She’s Gotta Have It film/series). A title-only dedup once deleted
  seven real films and blanked The Vault via a dangling id in `VAULT`. Before
  removing any FILMS entry, grep the whole file for its quoted id — shelf
  arrays (VAULT/FEATURED/ROOMS/WATCH_250/FREEDOM_FILMS), debates, WS_POSTERS,
  WS_TRAILERS, and the ratings map all reference ids by string.
- Vote tallies are NEVER baked into FILMS (`votes:{for:0,against:0}` always).
  The server is the only source of truth: `loadAllBackendVotes` resets every
  film not present in `vote_counts` (a film absent from the view has zero
  votes), and persisted `app.tally` caches carry `tallyV:2` — older caches
  were poisoned by the fake-seed era and are dropped on load.
- Match the existing comment voice; comments explain constraints, not diffs.
- Test-harness gotcha: with Playwright routes, register the catch-all
  `**/rest/v1/**` FIRST and specific routes LAST (last registered wins).
- Git: develop on `claude/new-session-9aa459` only. The owner also edits
  from another machine (commits show as "Add files via upload"), so ALWAYS
  `git fetch origin claude/new-session-9aa459` and check you're not behind
  BEFORE editing or pushing — otherwise you clobber their work (or hit a
  non-fast-forward). Re-check right before every push.

## Stripe membership (scaffolded, not live)
Built 2026-07-05: `api/checkout.js` (zero-dep, matches the `api/showtimes.js`
config-gated pattern — POST, reads `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` from
env, calls Stripe's REST API directly over `fetch` with HTTP Basic auth
instead of adding the `stripe` npm package, since this repo has no
`package.json`/deps). Creates a **subscription**-mode Checkout Session
(assumption — "The Regular" is priced `/mo` in the UI; the owner may want
one-time billing instead, flagged in a code comment). Client: the "Become a
member" button on `#/join` (`startMembershipCheckout()`) POSTs to
`/api/checkout` and redirects to the returned Stripe URL on success. Without
real keys it 503s and the client shows "Membership is almost here — check
back soon" instead of a dead/broken button — verified in this sandboxed
headless run (no real Stripe account exists here).

Waiting on owner to go live:
1. Create a Stripe account (stripe.com).
2. In the Stripe dashboard, create a Product + a recurring Price for
   membership (confirm subscription vs. one-time pricing model first —
   see the assumption above).
3. Copy the secret key (`sk_live_...` or `sk_test_...` to start) and the
   Price id (`price_...`).
4. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in Vercel → Settings →
   Environment Variables.
5. Redeploy, then click "Become a member" on `#/join` end-to-end to confirm
   a real Checkout Session opens and completes.

## Fandango ticket unit (scaffolded, CJ_PID not set)
Built 2026-07-08: a persistent "Get tickets" block (`ticketBlockHTML(f)`,
index.html) now attaches directly to a film page's content — not just the
existing small "Showtimes" chip in the Where-to-watch row — for any title
currently in its theatrical window (`!f.noart && f.type!=='tv' &&
f.year>=<currentYear>`, same test `renderTheaters()` already uses). Never
shows on back-catalog or TV titles — a ticket CTA implying a nonexistent
theatrical run would violate "nothing fake." Label is deliberately its own
attribution line ("Powered by Fandango"), never blended into the button
copy, synopsis, or review voice — owner's explicit direction was to build
volume/relationship with Fandango honestly now, toward negotiating direct
terms (or owning ticketing outright) later, not to disguise it as editorial
content. Clicking "Get tickets" opens the existing `openShowtimes()` modal
unchanged (ZIP/city search → `/api/showtimes`, SerpApi-backed, honest empty
state when unconfigured).

`CJ_PID` (index.html, near `fandangoUrl`) is the CJ Affiliate publisher ID
that turns every outbound Fandango link into a commission-tracked deep link.
Unlike Stripe/SerpApi, this is NOT a secret — a CJ PID rides in the visible
outbound URL by design — so there's no server-side config-gating needed.
Waiting on owner:
1. Apply to / get approved for the CJ Affiliate program (Fandango's network).
2. Get the publisher ID (PID) from the CJ dashboard.
3. Paste it into `CJ_PID` in index.html.
4. Redeploy — every "Get tickets"/"Tickets on Fandango ↗" link site-wide
   becomes commission-tracked automatically, no other code changes.

## Advertise / rate card + media kit
Built 2026-07-08: `#/advertise` (`renderAdvertise()`, `ADVERTISE_TIERS`,
index.html) — a live rate-card page for prospective sponsors, footer-linked
only (not main nav, to stay non-ad-forward for the other 99% of visitors).
States the brand rule plainly ("We only work with Black-owned media and
brands. No exceptions, no ad networks, no cross-site tracking") — this in no
way contradicts the Privacy Policy's "no third-party advertising or
cross-site tracking cookies" line, since sponsorships here are
placement-based/relationship-based (a labeled "Presented by" tag, a tagged
carousel slot), never a third-party ad network or tracker. Pricing is
placement-based ($/week or $/month per shelf/slot), not CPM — the site
doesn't have big public traffic numbers yet, and the honest-metrics strip on
the page deliberately shows qualitative positioning (catalog size via live
`FILMS.length`, zero-ad-network stance) rather than inventing traffic
figures, matching the same "never bake in a number that isn't real" rule
already applied to vote tallies.

Four tiers (`ADVERTISE_TIERS`): Shelf Sponsor ("Presented By"), Featured
Carousel Slot (tags into the existing home `FEATURED` array — sponsored
slides must stay visually tagged and human-reviewed, never blended into
editorial voice), Newsletter Mention (marked "Coming soon" — no active
outbound send capability yet, don't sell what doesn't exist), and a bespoke
Custom/Data Partnership tier pointing at the long-term aggregate
audience-sentiment data product from the monetization plan above. Each tier
has two CTAs: "Request the media kit" (reuses the existing `signups` table
via `submitSignup(email,'advertise',cb)` — zero schema change) and a direct
`mailto:` inquiry (same no-backend-spam-surface pattern as
`notifyContributor`).

Downloadable one-pager: no separate document/PDF generator — a
"Download media kit ↓" button calls `window.print()` (native Save-as-PDF).
`@media print` CSS (scoped to `.advertise-print`) hides nav/tabbar/footer
and print-only chrome (`.adprint-hide`) so the printed output is just the
rate card. Single content source (`ADVERTISE_TIERS`) means the live page and
the printable version can never drift apart.

Shareable link: `/advertise` (`api/advertise.js`, mirrors `api/apply.js`)
serves its own OG/Twitter preview so a link the owner DMs to a prospective
sponsor doesn't show the generic homepage card, then bounces humans to
`#/advertise`.

## 2026 Emmy nominations banner (2026-07-08)
`EMMY_NOMS_2026`/`EMMY_SHOWS_2026` (index.html, `paintEmmyBanner()`) — a
prominent banner at the very top of the home page (above the hero copy)
listing every Black actor/director/writer nominated for the 78th Primetime
Emmy Awards (nominations announced 2026-07-08), plus the two Black-led
nominated series (Abbott Elementary — Outstanding Comedy Series; Paradise —
Outstanding Drama Series). Every nominee/category/show fact was
independently verified against the official Television Academy nominee
pages (televisionacademy.com), not just press aggregators, before
publishing — a second research pass specifically cross-checked all 11
original claims plus searched for anything missed (found 6 more: Zendaya,
Chase Infiniti, and 4 directing/writing nominees). Nominee names link to
`#/artist` (resolves via TMDB person search, same as cast links elsewhere);
show names link to a real catalog entry only where one exists (`abbott`,
`paradise`) — never a fake/dead link. `paradise` (Sterling K. Brown's Hulu
series, Black-led via its star/EP though creator Dan Fogelman is not Black
— same "closer bar" case as `lioness`) was added to the catalog specifically
so the banner could link to it. Auto-expires via `EMMY_EXPIRES` instead of
requiring a manual takedown — originally ~36h, extended 2026-07-09 to a full
7 days (`2026-07-16T23:59:59Z`) per owner request when the photo carousel
below was added.

**Nominee photo carousel** (2026-07-09): `#emmyCar`/`paintEmmyCarousel()` —
one medium (184×184) image per unique nominee/show, auto-advancing every 4s
(pauses on hover), same track pattern as the home `FEATURED` carousel
(`featSlideHTML`/`featPlay`) but sized as a small self-contained card instead
of a full-width banner. `emmyCarouselItems()` dedupes `EMMY_NOMS_2026` by
name (Colman Domingo's two nods collapse into one slide listing both
categories) and appends the two `EMMY_SHOWS_2026` entries. Show slides reuse
`servePoster()` (same poster the rest of the site shows — no separate art).
Person photos come from a live TMDB person search, cached to localStorage
(`EMMY_PHOTOS_KEY`/`loadEmmyPhotos`) — real photos only, no placeholder/stock
images, same "nothing fake" bar as every other real-photo feature. Fetched
once per unique name (`hydrateEmmyPhotosOnce`, guarded against overlap/
infinite-repaint) and the carousel silently repaints in place once photos
land — a slide with no resolved photo falls back to an emoji tile rather
than a broken image.

Restyled 2026-07-09 (owner: "so basic... needs pizzazz and depth and energy
like the award show") — a dark stage card with a rotating gold spotlight
sweep (`.emmy-car-wrap::after`, CSS `conic-gradient` + `emmySpin`), three
twinkling sparkle dots, a gold gradient-foil photo frame with a slow pulsing
glow (`emmyGlow`) and a circular trophy/TV badge pinned to its corner, a
shimmering gold-foil-text ribbon ("Nominee"/"Nominated series"), the
category rendered as a gold pill instead of plain text, and prev/next arrow
buttons. Dots were replaced with Instagram-Stories-style progress segments
(`emmySegHTML`/`.emmy-car-seg`) — the active segment fills over the real 4s
interval via a CSS `emmySegFill` animation, completed ones stay full, so the
bar always reflects true position instead of a static dot. All motion is CSS
(`animation`/`transition`), respects `prefers-reduced-motion`, and is purely
decorative — no new network calls or data.

Enlarged 2026-07-09 (owner: "remove the box of all the nominees and use that
space to enlarge the carousel") — deleted the plain text roster below the
carousel (`#emmyList`/`emmyNomRow`/`.emmy-row` grid) and the separate
"Nominated series" line (`#emmyShows`), since both were now redundant with
the carousel itself (every nominee and both shows already appear as slides).
`paintEmmyBanner()` simplified to just toggle the section and call
`paintEmmyCarousel()` — no more list-building. The freed vertical space went
into the carousel: card width is now `clamp(320px,46vw,460px)` (was a fixed
300px), the photo frame `clamp(200px,32vw,290px)` (was fixed 184px), name/
category/badge/arrows sized up to match.

Two more owner tweaks (2026-07-09): the `.emmy-banner` section itself lost
its light "panel" card background/border (`background:none;border:0`) so
only the dark carousel card reads as a box against the page, no lighter box
framing it. The photo frame went from a square `clamp(200px,32vw,290px)`
square to a taller portrait `clamp(190px,28vw,270px)` × `clamp(270px,42vw,
380px)` — closer to an actual headshot/poster aspect ratio, with matching
slide padding — per "elongate the nominee box." Also dropped Hiro Murai from
`EMMY_NOMS_2026` per owner request (now 15 carousel slides: 13 unique people
+ 2 shows).

Header simplified again (2026-07-09, owner: "keep 'The 2026 Emmy
Nominations' and remove Black excellence... make that font larger"): the
two-line eyebrow + headline (`.emmy-ey` "2026 Emmy Nominations" small-caps
tag + `.emmy-h` "Black excellence, nominated." headline) collapsed into one
line — `.emmy-h` now reads "🏆 The 2026 Emmy Nominations" directly, sized way
up (`clamp(30px,4.4vw,44px)`, was `clamp(20px,2.6vw,26px)`). `.emmy-ey` CSS
removed as dead (no longer referenced anywhere).

## Site-wide "spotlight" pass (2026-07-09)
Owner asked for a real design critique ("what's weak, where does it leak,
what lacks authority, what's boring/disconnected"), then to act on it
aggressively. Findings + fixes, applying the visual-bar convention above
beyond just the Emmy carousel:

- **Money pages lacked authority.** `#/join` and `#/advertise` both use the
  shared `.plan`/`.plans` card (`index.html`, "MEMBERSHIP / ADVERTISE
  PRICING" CSS block) — previously a flat `var(--panel)` cream card
  indistinguishable from any generic SaaS pricing table, on the two pages
  that most need to feel premium/trustworthy. Rebuilt as a dark stage card
  (same gradient/shadow language as `.plan.feature`/Emmy): `.plan.feature`
  (the "Most popular"/"Most visible" tier) gets the full treatment — scaled
  up, gold-foil border, rotating spotlight sweep (`emmySpin`, reused
  keyframe), a diagonal shimmering ribbon badge instead of a flat corner
  tag. All checkmark icons switched from a hardcoded `stroke="#875B07"` to
  `stroke="currentColor"` so `.plan li svg{color:#F4B733}` can theme them
  gold on the new dark background — one CSS change, no per-icon edits.
  `.btn-ghost` inside `.plan` gets its own light-on-dark override so it
  stays legible. Since `#/advertise`'s tiers share the same `.plan` markup
  (`advertiseTierHTML`), this fix landed on both money pages at once.
- **Two carousels, two different design languages.** The home `FEATURED`
  spotlight carousel (`.feat-car`) predated the Emmy carousel and looked
  like a different build sitting next to it. Brought it up to match: same
  rotating conic-gradient spotlight sweep on the card border, the `.feat-ey`
  eyebrow now uses the same shimmering gold-gradient-text treatment as the
  Emmy ribbon, and the plain `.feat-dot` dots were replaced with the same
  Instagram-Stories-style segmented progress bar pattern (`.feat-seg`,
  `featSegHTML()`) — the active segment now visibly fills over the real
  6.5s interval instead of just lighting up a static dot. `paintFeatured()`/
  `featApply()` updated accordingly; `.feat-dot`/`.feat-dots` CSS removed as
  dead.
- **Browsing itself didn't carry the site's identity.** The Kitchen/Table
  dual-verdict system only showed up in text and the small aura-ring badges
  under each card — the poster grid itself (`.grid-cards`, the site's most-
  used surface) looked like any generic film-site poster wall. `cardHTML()`
  now stamps each poster with its own Kitchen tier (`t-certified`/`t-well`/
  `t-light`/`t-pending`, from the existing `tier(f.k)` helper) and a hover
  glow keyed to that tier reusing the *exact* colors already used by
  `.cert-seal` (`.a-certified`/`.a-well`/`.a-light` — gold/paprika/green) —
  so hovering a card previews the same verdict language the seal uses, no
  new color vocabulary invented. A `pending` (unscored) film gets no color
  claim on hover — consistent with "nothing fake": no claiming a verdict
  that hasn't been earned yet.

**Home page layout rhythm** (2026-07-09, owner: "the layout of the site
feels boring" → chose "break the rhythm"). `renderHome()` paints 8-9 shelves
back to back, each identically structured (`shelf-head` + `.rail` of
136px-wide cards) — same visual unit repeated with only the heading text
changing, so the page read as one undifferentiated scroll no matter how
much color/motion the individual cards had. Fixed purely with markup
modifier classes + CSS (no change to `renderHome()`'s data logic — it still
just fills the same rail `id`s):
- `.shelf-band` — a tinted panel (same gradient-wash technique as
  `.freedom`, so card text never needs a contrast override) applied to 4
  shelves for a "different zone" landmark: `.shelf-band` plain cream (On
  the Small Screen), `.shelf-band-tubi` teal/purple (Free on Tubi),
  `.shelf-band-stage` warm paprika (Stand-up), `.shelf-band-vintage` warm
  sepia (Grandma's Recipes/Classics). The other shelves (Documentaries,
  Sports) stay plain — the point is alternation, not banding everything.
- `.rail-lg` (3 big cards instead of 4) on "New on the Stove" — right after
  the mosaic, a "this matters more" moment instead of the same card size
  as everything else.
- `.rail-sm` (6 small cards instead of 4) on "Short films" — a denser,
  quick-scan shelf that matches the content (shorts = quick).
Result, top to bottom: plain grid → big-tile rail → cream band → teal band
→ warm band → plain rail → dense rail → plain rail → sepia band. Verified
in headless Chromium (full-page screenshot) — zero console errors, all
existing `railBy()`/scroll-arrow behavior untouched since only the
container classes changed, not the rail mechanics.

**Richer band colors** (2026-07-09, owner: "the colors aren't rich enough
hard to see") — the first pass kept `.shelf-band` opacities very low
(.08–.14) specifically to avoid needing a text-contrast override; that made
them read as barely-there. Boosted background opacity ~2-3x (e.g. Tubi
`.14→.30`, Stand-up `.12→.28`, Grandma's `.14→.32`), deepened border-color
opacity, and added a solid 6px color accent bar down the left edge of every
`.shelf-band` (`::before`, gradient of the section's own theme color —
teal→purple for Tubi, `--paprika`→`--sumac` for Stand-up, `--gold`→
`--gold-deep` for Grandma's, neutral `--line-strong` for the plain band) so
each themed shelf reads as a clear, colorful zone at a glance instead of a
faint tint. Card text still needs no override — the panel backgrounds stay
light enough for the default dark ink at these opacities (checked visually,
not just numerically).

**Bug found and fixed right after** (2026-07-09, owner: "the color gradient
is pushing against the words on the page") — the `.shelf-band` padding
(`26px 26px 14px 32px`, added specifically to clear the new 6px left accent
bar) was silently losing to the base `section.shelf{padding:30px 0}` rule:
same property, and `section.shelf` (type+class, specificity 0-1-1) beats a
plain `.shelf-band` (class-only, 0-1-0) regardless of which is declared
later in the stylesheet. So the accent bar/gradient edge was rendering
flush against the shelf heading and card labels with zero clearance — e.g.
"Free on Tubi" visually crowded against the teal bar, "Season" nearly
touching it. Fixed by bumping the selector to `.shelf.shelf-band` (two
classes, specificity 0-2-0, which does outrank `section.shelf`) for both
the base rule and its `max-width:640px` override. Verified via
`getBoundingClientRect()` before/after (heading moved from x:73 → x:105,
clear of the bar) and screenshots at desktop + mobile widths.

**Emmy carousel backdrops** (2026-07-09, owner: "put some rich backdrop
behind the emmy nominated winners") — `emmyCarSlideHTML()` now sets a real
photographic backdrop behind each slide (dark scrim + `background-image`,
same technique `featSlideHTML` already uses), tied to the nominee's actual
project: a show slide uses its own `f.backdrop`; a person slide uses their
first credited nomination's show backdrop (`it.cats[0].filmId`). Nothing
invented — a nominee whose show isn't in the catalog (no `filmId`, e.g.
Zendaya/Euphoria) just keeps the plain dark stage background, no placeholder
image faked in. New `hydrateEmmyBackdropsOnce()` proactively calls the
existing `hydrateFilmMedia()` for every unique film the carousel references
— backdrops normally only resolve when a visitor opens that film's own
page, so without this the nominees tied to `abbott`/`paradise` would likely
never get a backdrop in a typical session. Same guarded-repaint pattern as
`hydrateEmmyPhotosOnce` (only re-fetches films still missing a backdrop, so
it can't loop). Verified in headless Chromium with mocked TMDB responses:
`hydrateFilmMedia` fires, `f.backdrop` populates, the resolved slides carry
the correct inline `background-image` — the fake test image itself renders
as a blank tile since it's a 1px stub, which is a test-fixture limitation,
not a code issue (production TMDB backdrops are real 1280px photos).

## Kids section + real age-approval ratings (2026-07-09)
Owner: "We need a more prominent kids section. Also a way to rate adult
movies kids can see. Kid approved- Teen Approved- Young Adult Approved."
Also: "conflate the tabs at the top its too busy" — addressed together
since adding a 10th flat nav link would've made the busy-nav complaint
worse.

- **`#/kids`** (`renderKids()`, index.html) — a real dedicated page (not
  buried inside the "Serve me something" modal's `kids` flavor anymore,
  though that predicate — `f.tags` has `Family` or `Animation` — is reused
  as-is, no new data invented). Same scope-toggle + type-chip + grid pattern
  as Couch/Browse (`scopeToggleHTML('Our Picks','All Picks',...)`,
  `KIDS_TYPE`/`setKidsType`). Linked in the top nav, the footer link row,
  and `refreshScopeToggles()`/`setScope()` wired the same way Couch is.
- **Top nav decluttered**: was 9 flat links (Home/Browse/Rankings/In
  Theaters/Coming Soon/The Word/On The Couch/The Vault/Join). Now 5 direct
  links (Home/Browse/**Kids**/Rankings/Join) + a **"More ▾"** dropdown
  (`#navMoreWrap`/`toggleMoreNav()`, same open/close-on-outside-click
  pattern as the notifications bell) holding the less-frequent five: In
  Theaters, Coming Soon, The Word, On The Couch, The Vault.
  `NAV_MORE_VIEWS` makes the "More" button itself show `.active` when the
  current page is one of its children, so there's still a nav landmark when
  the panel is closed. Mobile is unaffected — it already used the separate
  bottom `.tabbar`, not this dropdown, and wasn't part of the complaint.
- **Kid/Teen/Young Adult Approved badge** (film pages) — the site already
  had a full "content pepper" advisory UI (`pepperRow`, language/violence/
  sexual-content flags + an MPAA-style cert) but **zero films had that data
  populated**, so it was fully dormant. Rather than fabricate cert data,
  this pulls the **real** US certification live from TMDB — same trust
  level as the posters/backdrops/cast already sourced live — via
  `/movie/{id}/release_dates` or `/tv/{id}/content_ratings`, added onto the
  existing `hydrateFilmMedia()` fetch (one extra parallel request, no new
  network round-trip pattern). `ageTier(cert)` maps G/PG/TV-Y/TV-G→**Kid**,
  PG-13/TV-PG/TV-14→**Teen**, R/TV-MA→**Young Adult**; NC-17 or an
  unresolved cert renders **no badge at all** rather than guessing — this
  literally answers "a way to rate adult movies kids can see": open any
  title, including one that isn't in Kids at all, and its real rating tier
  shows. `MEDIA_CACHE_KEY` bumped to `ws_media_v4` so the new field
  populates on next hydrate instead of waiting for every visitor's cache to
  naturally expire (no expiry exists otherwise).
- Verified in headless Chromium with mocked TMDB responses: `/kids` renders
  46 real Family/Animation titles with correct scope/type filtering; the
  nav dropdown opens, shows all 5 links, and closes on outside click; a
  mocked `PG-13` movie cert renders "🧑 Teen Approved" and a mocked `TV-MA`
  TV rating renders "🔞 Young Adult Approved" end-to-end from fetch → tier
  → badge. Caught and fixed a real bug along the way: the Kids scope-toggle
  note text was pre-escaped (`&amp;`) on top of `scopeToggleHTML()`'s own
  `esc()` call, double-encoding into a literal `&amp;` on the page.

**"More" dropdown redesign** (2026-07-09, owner: "the more dropdown is
cluttered and bad") — first pass was 5 links, all the same bold weight
(700), no icons, cramped 9px padding with no gap between rows, so it read
as one dense block of bold text rather than a menu. Fixed: each link now
has its own icon (reusing the exact SVGs from the mobile `.tabbar` for
Theaters/Coming Soon/Vault so the iconography stays consistent across
surfaces; new simple line icons for The Word/On The Couch), default weight
dropped to 600 so the `.active` item (700, gold) actually stands out, more
generous padding (10px) with a 1px gap between rows, and a small triangle
pointer (`::before`) connecting the panel visually to the "More" button.

## Little House on the Prairie (2026, Netflix) — added then removed (2026-07-09)
Taken back down same-day per owner request, no reason given. Removed all
three references (`FILMS` entry, `WS_POSTERS` pin, `FEATURED` carousel
slide) and deleted it from `api/films.json` directly (the build script only
adds/backfills, it doesn't prune stale entries, so a plain re-run wouldn't
have caught this). If it comes back, the original entry + real TMDB
data/reasoning (the Dr. George Tann "closer than usual bar" case) is
preserved in git history on this same date.

Owner asked to add it to the catalog and the `FEATURED` home carousel. Flagged
first: the core Ingalls-family cast and credited EPs (Rebecca Sonnenshine and
others) aren't Black, so on its face this doesn't clear the site's usual
Black-led bar. Owner's answer was "Who is playing George Tann" — verified via
TMDB + web search: **Jocko Sims plays Dr. George A. Tann**, based on a real
free-born Black physician who was the only doctor for miles on the actual
frontier — a substantive, named, real-history Black storyline, even though
he's billed below the four leads. Same "closer than usual bar" pattern as
`lioness`/`paradise`, documented the same way. `id:'little-house-on-the-
prairie-2026'` (year-suffixed since the original 1974 series could plausibly
be added later — catalog identity is title+year, never title alone), real
TMDB data throughout (`k`/`t` null, `votes:0`, `reviews:[]`), poster pinned in
`WS_POSTERS` since it was already confirmed against the correct TMDB id
(283304) while researching the Tann question. Synopsis leads with the Tann
context specifically, since that's the actual reason it's in the catalog, not
an incidental detail. Added to `FEATURED` as the 4th carousel slide
(`ey:'New series · Streaming today'` — it aired the same day as this
addition). Ran `node scripts/build-films-json.cjs` after, per convention.

Owner separately asked to use a specific Netflix/Jocko-Sims-Instagram
character-poster image for Dr. Tann. Flagged the tradeoff (Netflix's own
marketing art, not TMDB-licensed like everything else the site shows) and
hit a real technical wall: images pasted inline in chat don't land on this
session's filesystem, and Instagram's CDN 403s on direct hotlink fetches (no
session/referer). Checked the safe alternative — TMDB's 8 episode stills for
S1 plus Jocko Sims' full photo gallery — and none of them show him in
costume as Tann yet (only a generic modern headshot). Left unresolved: needs
either a real transferable file from the owner, or to wait for TMDB to index
better stills as the show gets more coverage.

## `.scope-wrap` spacing bug on Couch/Kids (2026-07-09)
Owner screenshotted the Kids scope toggle — "Our Picks / All Picks" pill sat
flush against its note text ("Black-led family films & animation.") with no
gap. Root cause: `scopeToggleHTML()` returns the `.scope` pill and
`.scope-note` span as siblings, and relies on being wrapped in a
`class="scope-wrap"` container for the `display:flex;gap:12px` that actually
spaces them apart. Home's `#homeScope` and Browse's `#browseScope` (both
static markup) had the class; `#couchScope` and `#kidsScope` (both built via
JS string concatenation when those pages were added) were missing it —
same bug on both pages, only Kids got reported. Fixed by adding
`class="scope-wrap"` to both wrapper divs.

## Home hero feature: "Why Did I Get Married Again?" (2026-07-09)
Owner: replace the Dinner Table Debate slot on home with "a beautiful
looking feature" for the film — trailer, cast in circular photos, release
date, and a Let's Go/Meh vote. Built as `#marriedFeature`/
`paintMarriedFeature()`, called from `renderHome()` in the exact slot
`renderDebate()` used to occupy. **Debate itself is untouched, not
deleted** — `renderHome()` just no longer calls it, same pattern as the
Group Chat removal (a live feature isn't destroyed just because it's
unwired from one page); `#debateBox` stays in the markup, hidden.

Real data throughout, "nothing fake" held all the way through:
- The film (`cs-1522689`, from `COMING_SOON`) had `trailer:null` — TMDB's
  `/videos` endpoint has nothing indexed for it yet. Rather than skip the
  ask or fake an ID, found the actual official teaser via web search,
  confirmed it's real via YouTube's oEmbed API (title: "Tyler Perry's Why
  Did I Get Married Again? | Official Teaser", channel: Netflix's own
  `@Netflix`), and set `trailer:'t_QUYXwkwss'` in `COMING_SOON` — this also
  means the existing excitement-vote gate (`excitementButtons()`, "only
  shown where there's a trailer") now correctly shows Let's Go/Meh on this
  title everywhere it appears (Coming Soon page, film page), not just the
  new home feature.
- `MARRIED_CAST` — 8 real cast members with real TMDB profile photo paths,
  fetched and verified directly (Tyler Perry, Taraji P. Henson, Jill Scott,
  Richard T. Jones, Tasha Smith, Michael Jai White, Lamman Rucker, Sharon
  Leal). Baked directly rather than live-fetched since this is a one-off
  hero for a single title, same reasoning as `EMMY_NOMS_2026`/`FEATURED`
  being hand-curated arrays instead of a general mechanism.
- The excitement vote buttons/backend are reused exactly as built for
  Coming Soon — no new voting system, no new table. `refreshExcitement()`
  and `loadAllExcitement()` gained a branch to repaint the home feature
  block specifically (`v==='home'`) so vote counts and pressed-state stay
  in sync everywhere the title appears, same as the existing soon/film
  branches.
- Visual treatment matches this session's "spotlight" bar: dark stage card,
  rotating conic-gradient sweep, twinkling sparkles, shimmer-text ribbon
  (`.mf-*` CSS, reuses the existing `emmySpin`/`emmyTwinkle`/`emmyShine`
  keyframes rather than duplicating them). Cast photos use a new
  gold-ringed circular avatar (`.mf-cast-av`) sized for a dark background;
  the excitement buttons got scoped light-on-dark color overrides since
  their default styling assumes a light panel.
- Verified in headless Chromium: debate box hidden, feature visible, real
  trailer iframe src correct, 8 cast cards render, date reads "Streaming
  Sep 9, 2026", voting toggles state and persists through
  `refreshExcitement`, "More on this title" navigates into the full
  `cs-1522689` detail page, mobile layout holds up. The trailer itself
  can't play inside this sandbox (no outbound access to youtube.com from
  headless Chromium here) — a test-environment limit, not a code issue;
  the embed URL is a verified-real video id.

**Follow-up polish** (2026-07-09, owner: share button on the clip, center
+ enlarge the cast): `.mf-share` — a small circular icon button overlaid
top-right of `.mf-trailer`, reuses the existing `openShareCardSoon(id)`
(native share sheet, clipboard-copy fallback) rather than a new share path.
`.mf-cast` switched from a left-aligned horizontal-scroll rail to a
centered, wrapping flex row (`justify-content:center;flex-wrap:wrap`) —
reads better as a "feature" than a scrollable strip. Avatars enlarged
68px→86px on the base/desktop rule (the `max-width:640px` mobile override
still drops them to 58px, untouched). `.excite-row` and `.mf-more` both
centered under the cast row via `margin:auto` (they're block-level flex/
inline-flex elements, so `text-align` alone wouldn't center them).

## Organic traffic / SEO (2026-07-09)
Owner: "we need traffic... we are battling Rotten Tomatoes and Flixster and
Fandango for traffic and Letterboxd." Audited the site's actual technical
SEO before touching design and found the single biggest leak: **zero
indexable film pages**. `#/film/<id>` is a hash route (never reaches a
server, nothing for a crawler to fetch), and the one static per-film
surface that did exist (`/f/<id>`, `api/f.js`) explicitly set
`<meta name="robots" content="noindex">` and auto-redirected via
`location.replace()` before a crawler could index anything — so a site with
1,000+ real film pages had exactly one indexable URL (the homepage). Fixed:
- **`api/f.js` rewritten**: dropped `noindex`, added `<link rel="canonical">`,
  and added real substantive body content (poster, title, year, real
  synopsis from the same baked catalog — no invented copy) instead of a
  single bounce link. Added `application/ld+json` structured data
  (`Movie`/`TVSeries` schema, keyed off `f.tv`) for search rich-result
  eligibility — deliberately did NOT include a fake `aggregateRating`; only
  real Kitchen/Table numbers would ever go in there, and `films.json`
  (the crawler-facing extract) doesn't carry live scores, so it's omitted
  rather than faked. **Also removed the auto-redirect.** An immediate
  `location.replace` makes Google treat the page as a pointer to the hash
  URL (not independently indexable) instead of indexing `/f/<id>`'s own
  content — so humans now get a clear gold "Rate this film/series on Well
  Seasoned →" CTA into the full app instead of a zero-friction bounce. This
  is a real UX tradeoff (one extra click for anyone who already had an
  `/f/<id>` link) traded for actually being indexable — flagging it in case
  the owner wants the auto-redirect back for social-share clicks
  specifically (would need to special-case by referrer, not done here).
- **`robots.txt`** (repo root, served as a static file same as `og.png`) —
  didn't exist at all before. Points crawlers at the new sitemap.
- **`api/sitemap.js`** (new, zero-dep, same pattern as `api/f.js`) — reads
  `films.json` and emits `sitemap.xml` (rewrite added in `vercel.json`)
  listing every `/f/<id>` plus the core static pages (`/`, `/join`,
  `/advertise`, `/apply/critic`, `/apply/writer`). Always in sync with the
  catalog automatically — no hand-maintained URL list to go stale.
- **Positioning vs. the named competitors**: Rotten Tomatoes/Letterboxd
  already own generic "[title] review" search intent at far higher domain
  authority — the realistic wedge is the combination no competitor has: a
  Black-culture-curated catalog + an honest **two-number** verdict (critics
  AND community, separately) instead of one aggregate score. The per-film
  page copy (synopsis-first, real CTA copy naming both "Kitchen"/"Table")
  is built to read distinctly from an RT/Letterboxd snippet in search
  results, not to out-rank them on volume.
- **Not done here (flagged, not executed):** regenerating `api/films.json`
  is still the existing manual step (`node scripts/build-films-json.cjs`)
  whenever `FILMS` changes — the sitemap/f.js SEO surface is only as fresh
  as that file. `api/apply.js`/`api/advertise.js` still auto-redirect
  (kept as-is — those are two pages, not 1,000+, and the instant-redirect
  UX matters more there than incremental indexability).

**Bug found and fixed while building this**: the catalog-wide poster
hydrator (`hydrateFromTMDB()`, used for every TV/film card without a baked
poster) was querying TMDB's **movie** search for every title regardless of
`f.type` — for TV shows this could return a same-named but unrelated movie.
Confirmed live via the API: `Lioness` (2023, Zoe Saldaña/Paramount+) was
resolving to *Leeuwin*, a same-year Dutch football drama also titled
"Lioness" on TMDB, on the Couch/Browse cards. All 168 TV titles in the
catalog rely on this hydrator (none have a baked poster), so any other TV
title whose name collided with an unrelated movie was equally at risk. Fixed
by branching on `f.type==='tv'` to hit `search/tv` (mirrors the already-
correct per-film `hydrateFilmMedia()`); bumped `POSTER_CACHE_KEY` to
`ws_posters_v2` so every visitor's already-poisoned localStorage cache gets
dropped and re-resolved correctly rather than silently keeping the wrong
poster forever.

## UX fixes (2026-07-08, owner-reported)
- **Showtimes ZIP input collapsed to a ~26px "blank box."** Root cause,
  present since initial deploy: `.modal input,.modal select{width:100%}`
  (added for stacked single-column form fields) and `.st-field input{flex:1}`
  have equal specificity, so source order decided the winner — the
  `.st-field` row (ZIP input + Find button, side by side) got its layout
  clobbered anywhere it rendered inside a `.modal`. Fixed with a scoped
  override (`.modal .st-field input{width:auto}` / `.modal .st-field
  .btn{width:auto}`) rather than touching the generic rule other modals rely
  on.
- **Showtimes felt slow/nonfunctional.** `/api/showtimes?debug=1` revealed
  SerpApi's `engine=google` isn't returning a `showtimes` panel at all for
  this account/query shape — confirmed empty even for genuinely wide,
  currently-playing releases (Superman, F1), not just obscure titles. Until
  that's fixed at the provider level, `fetchShowtimes()` now paints the
  honest fallback (real Fandango + Google-search links, no fabricated
  theaters) INSTANTLY instead of waiting 2-3s for the live call to fail
  first, then silently upgrades in place if a real response ever lands.
  `_stGen` guards against a stale response overwriting a newer search.
- **Fandango ticket unit ("I don't see it")**: it was live, but its gating
  (`f.year>=currentYear`) was both too broad (flagged 2026-dated stand-up
  specials and straight-to-streaming titles that never had a theatrical run
  — a "nothing fake" violation by implication) and not the actual bug the
  owner hit. Now gated on the same verified TMDB now-playing check
  (`_npTitles`/`loadNowPlaying`) the Theaters page uses, with an async
  upgrade (`#ticketBlockWrap`) once that data arrives — mirrors the existing
  backdrop/cast hydration pattern on the film page.

## Shop — real Printify merch (2026-07-12)
Owner: "we need to. create a printify store with merchandise. It needs to be
beautiful, easy ability to select colors and sizes." Chose "Custom-built
into the site" (a real `#/shop` page matching the site's own visual
identity, not Printify's hosted Pop-Up Store) over an embedded/linked-out
store, and confirmed real products already exist in a live Printify
account. Built as **two phases** — this entry covers Phase 1 only:

- **Phase 1 (built, this entry)**: browse real products, pick color/size,
  see the real price — no payment processing. `api/printify.js` (new,
  zero-dep, same config-gated pattern as `api/checkout.js`/`api/showtimes.js`)
  proxies Printify's Shop Products API server-side (`PRINTIFY_API_TOKEN`/
  `PRINTIFY_SHOP_ID` in Vercel env — unset yet, so it 503s and the client
  shows an honest "The shop isn't open yet" empty state, same convention as
  Stripe membership before real keys existed). Sanitizes the response to
  exactly what the storefront needs (never leaks Printify's internal cost
  price or unpublished/disabled products/variants). `#/shop`
  (`renderShop()`) is a poster-style grid (`.shop-grid`/`shopCardHTML`);
  clicking a card opens the existing site-wide modal (`showModal`) with a
  color-swatch row, a size-pill row, live price, and a "Buy now" button.
  The buy button is deliberately honest right now — it toasts "Checkout is
  almost here" and fires `track('shop_buy_intent',...)` rather than doing
  anything fake. Linked from the "More ▾" nav dropdown and the footer link
  row (not primary nav — same reasoning as Advertise: a shop link isn't the
  first thing most visitors need).
- **Phase 2 (not started, flagged to owner)**: actual checkout — charging a
  customer (needs live Stripe keys, same gap the membership scaffold has)
  and then placing the paid order with Printify for fulfillment
  (Printify's Orders API). Deliberately out of scope until the owner
  decides on payment flow.
- Confirmed live against the owner's real account (JWT token pasted
  transiently in chat, used only inline for verification — never written to
  any git-tracked file): Shop ID `1105035` ("PIVOT Wear"), 7 real published
  products (tees + a pin button).
- **Bug found and fixed while building this**: Printify's `variant.options[]`
  array is NOT reliably ordered to match `product.options[]`'s declared
  order. Verified against live data — a product declaring
  `options:[size,color]` still reported every variant's `options` array as
  `[colorId, sizeId]` (color first), the opposite of the declared order.
  Position-based indexing (`v.options[optionIndex]`) would have silently
  swapped color/size for at least some real products. Fixed by matching
  each variant option id against which option's own `values` list (by id,
  via a `Set`) it actually belongs to — order-independent regardless of how
  Printify orders either array. Re-verified against all 7 real products
  after the fix (zero mismatches) and end-to-end in a browser render (real
  color names/sizes render correctly, price and buy button behave
  correctly for the specific product that exposed the bug).
- `PRINTIFY_API_TOKEN`/`PRINTIFY_SHOP_ID` still need to be added by the
  owner in Vercel → Settings → Environment Variables for the live site to
  show real products (no tool in this environment can set Vercel env vars
  programmatically — confirmed via search, same limitation noted for
  Stripe/SerpApi keys).

## Shop Phase 2 — real checkout + Printify order fulfillment (2026-07-12)
Owner: "we need this [Stripe] for the clothes." Built the actual checkout
path immediately after Phase 1 (browse-only), skipping the originally-
planned pause — the owner was already mid-flow creating a Stripe restricted
key for this exact purpose when they asked.

- **`api/shop-checkout.js`** (new) — POST `{productId,variantId,quantity}`,
  config-gated on `STRIPE_SECRET_KEY` + `PRINTIFY_API_TOKEN` +
  `PRINTIFY_SHOP_ID` (503 + honest client message if any are unset, same
  convention as membership). Deliberately does NOT trust price/title from
  the client — re-fetches the specific product from Printify server-side
  and builds the Stripe line item (`price_data`, one-time `mode:'payment'`,
  not the subscription mode membership uses) from that authoritative data,
  so a tampered request can't under-charge or buy a disabled variant.
  `shipping_address_collection` is turned on, US-only for now (international
  shipping/rates aren't confirmed yet — flagged as a follow-up, not
  silently assumed). Client wiring: `shopBuy()` (index.html) now POSTs here
  and redirects to the real Stripe-hosted checkout URL instead of the old
  "Checkout is almost here" placeholder toast — that toast still fires as
  the honest fallback if the endpoint 503s (unconfigured) or the network
  call fails.
- **`api/stripe-webhook.js`** (new) — the fulfillment half: on
  `checkout.session.completed`, places the paid order with Printify's
  Orders API (`POST /shops/{id}/orders.json`) so the shirt/pin actually
  gets printed and shipped. Verifies Stripe's webhook signature manually
  via Node's built-in `crypto` (HMAC-SHA256 over `timestamp + '.' +
  rawBody`, timing-safe compare) — zero-dep, matching the rest of this
  repo's `api/*.js` convention of calling REST APIs directly instead of
  adding SDKs. Requires Vercel's automatic body parsing to be OFF
  (`export const config = {api:{bodyParser:false}}`) since signature
  verification needs the exact raw bytes Stripe signed, not a re-serialized
  JSON object. Shipping name is split into first/last for Printify's
  `address_to` fields; only merch sessions (metadata carries `productId`)
  trigger a Printify order, so a future membership-subscription webhook
  hitting the same endpoint wouldn't misfire an order.
- **Known limitation, flagged not silently shipped**: no persistent record
  of processed Stripe sessions (no new Supabase table — deliberately, since
  schema changes are a stop-and-confirm risk tier here and this was built
  in the same turn as the ask). A failed Printify order-placement call
  after a successful charge just logs server-side for manual fulfillment
  via the Printify dashboard; it does not retry itself, and there's no
  owner-facing order dashboard yet. Low risk at current volume, but flag to
  the owner if order volume grows enough that this needs real tracking.
- Verified: both new files pass `node --check`; end-to-end in headless
  Chromium (mocked `/api/shop-checkout`) confirms the client sends the
  correct `{productId,variantId,quantity}` for a real in-stock variant and
  attempts to redirect to the returned Stripe URL — the actual redirect
  can't complete inside this sandboxed environment (no route to the real
  internet for a fake test URL), a test-environment limitation, not a code
  issue.
- Owner still needs to, in order: (1) finish creating the restricted Stripe
  key scoped to Checkout Sessions → Write only, paste as `STRIPE_SECRET_KEY`
  in Vercel (shared with membership — one key covers both use cases); (2)
  once deployed, create a webhook endpoint in the Stripe dashboard pointing
  at `https://itswellseasoned.com/api/stripe-webhook` listening for
  `checkout.session.completed`, then paste its signing secret into Vercel
  as `STRIPE_WEBHOOK_SECRET`; (3) do a real end-to-end test purchase before
  telling anyone the shop is open.

## Shop: front/back photo toggle + price alignment (2026-07-12)
Owner: "id rather show the back of the tee shorts on the site. can you align
prices as well and change them?" Clarified via quick questions: front stays
the default photo with a toggle to flip to the back (not back-only), tees
get one flat price across all sizes (ending in `.97`) except the Women's
Boxy Tee which stays its own price, and "align" meant the actual on-page
price display looked uneven card-to-card, not just the number formatting.

- **Front/back toggle** — `api/printify.js` now also returns
  `backImagesByColor` alongside the existing `imagesByColor`, built from
  Printify's own `image.position==='back'` tag on its real mockup photos
  (confirmed live: every tee has real back-view mockups, though only for a
  subset of colors — Printify doesn't render a mockup for every color/angle
  combination). `shopProductModalHTML()` shows a small "Show back"/"Show
  front" pill button (`.shop-face-toggle`, bottom-right of the product
  photo) **only when a real back photo exists for the currently selected
  color** — no fabricated or guessed angle if Printify has nothing to show,
  same "nothing fake" bar as everywhere else. Switching color swatches
  re-evaluates this per color, so the toggle silently disappears if the new
  color has no back mockup rather than showing a stale/wrong photo.
- **Price alignment** — `.shop-card` (the grid card) is now a flex column
  with `.shop-card-meta{flex:1}` and `.shop-card-price{margin-top:auto}`, so
  every card's price sits flush against the same bottom edge regardless of
  how many lines the title wraps to. Previously prices could land at
  different heights card-to-card within the same grid row. Verified via
  `getBoundingClientRect()` in headless Chromium — all cards in a row now
  share one exact price baseline.
- **Price change — done via Printify, not code**: `api/printify.js` and
  `api/shop-checkout.js` both already read price live from Printify on
  every request, so a price change needs zero code changes — it only needs
  updating at the source. Regular tees (all except the Women's Boxy Tee) →
  **$39.97 flat across every size** (they currently range $38.58–$42.87 by
  size due to Printify's per-size cost tiers). Women's Boxy Tee → **$44.97**
  (currently $41.17–$44.52 by size). Owner needs to set these directly in
  the Printify dashboard (Products → each tee → Pricing → set one price for
  all variants) — not done here, since it's a live pricing change to a real
  account this environment has no write-scoped credential for right now.
- Verified end-to-end in headless Chromium against the owner's real
  7-product catalog (cached in this session's scratchpad from earlier
  verification, not committed): toggle appears/hides correctly per color
  across products, image swaps on click, label flips "Show back"/"Show
  front" correctly, price baseline confirmed aligned row-wide, zero console
  errors, `api/printify.js` still passes `node --check`.

## Shop redesign — lookbook display + brand copy (2026-07-12)
Owner: "Lets increase the look of the lookbook and way we display the tees.
shift the naming of them and the description. Make it all match our brand."

- **`SHOP_COPY`** (index.html, near the shop JS) — a display-only override
  map keyed by real Printify product id, giving each product a brand-voice
  title/tagline/description in place of Printify's SEO-style listing copy
  (e.g. `"Officially Seasoned Salt Shaker Tee | Women's Boxy Tee"` →
  **"Officially Seasoned Boxy Tee"** / *"Relaxed fit. Seasoned taste."*).
  Deliberately display-only: checkout (`api/shop-checkout.js`) still reads
  the real Printify title/price server-side for the actual Stripe line
  item, so nothing about the transaction itself changes, only how it reads
  on-page. `shopTitle()`/`shopTag()`/`shopDesc()` fall back to the raw
  Printify title/description for any future product the owner adds that
  hasn't been curated yet — a new product still displays correctly, just
  without brand copy until someone adds an entry.
- **Lookbook grid redesign** — went from a dense 4-col square-crop grid
  (generic e-commerce default) to a 3-col grid of taller 4:5 portrait
  photos with no card chrome (no border/panel box — the photo IS the
  card), display-font titles, an italic tagline line, and a row of small
  color-swatch dots previewing the real available colors at a glance
  without opening the modal. **Front→back crossfade on hover**
  (`shopCardBackImage()`): reuses the real back-mockup data added earlier
  this session, but only cross-fades to the back photo of the exact same
  color shown up front — a product whose default color has no back mockup
  just has no hover effect rather than flashing a mismatched color's back
  view. Respects `prefers-reduced-motion` (no crossfade transition).
- Product modal picked up the same tagline line and the longer brand
  description (280-char clamp, up from 220, since the new copy reads
  better at full length).
- Verified in headless Chromium against the owner's real 7-product catalog:
  all 7 cards show brand titles/taglines (not Printify's raw SEO titles),
  3-column grid confirmed, `aspect-ratio:4/5` confirmed, swatch dots render
  on the 6 color-bearing products (correctly absent on the pin button,
  which has no color option), front/back toggle and price-row alignment
  re-verified working post-redesign, shop checkout flow unaffected, zero
  console errors.

## Shop: false "out of stock" bug (2026-07-12)
Owner: "i seen out of stock on things." Two real bugs, both in how variants
were being matched, not in Printify's data:

1. **Default selection landed on a nonexistent combo.** Opening a product
   picked `colors[0]` + `sizes[0]` independently, but Printify doesn't
   guarantee every color comes in every size — for 5 of the 7 real
   products, that default pairing wasn't an actual variant at all, so the
   modal opened straight to "Out of stock" on products that were 100% in
   stock. Fixed: `shopDefaultVariant(p)` now defaults to a real, in-stock
   variant's own color+size pair; `shopPick()` also auto-shifts the *other*
   dimension when a newly-clicked color/size doesn't exist alongside the
   current selection, instead of leaving the picker pointed at nothing.
2. **Bigger root cause, in `api/printify.js`**: the color/size swatch lists
   were built from Printify's `product.options[].values` — the FULL set of
   colors/sizes the blank garment template supports — not from what the
   seller actually published as real variants. Confirmed against live data:
   one shirt declares 9 possible colors but only 6 were ever turned into
   real, purchasable variants; the other 3 (Soft Pink, Natural, Athletic
   Heather) rendered as clickable swatches that could never resolve to an
   actual product no matter what size was picked — genuinely un-buyable,
   not a false positive. Fixed by deriving `colors`/`sizes` from the ids
   that actually appear in `variants`, not from the option template's full
   universe — a shopper can now only ever pick a combination Printify can
   actually fulfill.
- Verified against the owner's real catalog: color counts dropped
  accordingly per product (e.g. one tee went from 22 listed colors to the
  4 actually sold), every remaining color/size click resolves to a real
  variant every time (stress-tested every color × every size in isolation
  on the highest-variant-count product), all 7 products now default to
  "Buy now" on open instead of a false "Out of stock," zero console errors.

## Shop: API-created "Capsule 03 · The Mark" tees + price unlock (2026-07-12)
Owner pasted a real Printify API token (products.write scope) and asked to
fix prices, then to "Create designs, mens and womens tees and price them
accordingly and put on site. Ensure all designs are aligned perfectly." All
done directly against the live Printify account via the REST API (token used
inline only, NEVER written to any git-tracked file — same secret-handling
rule as always).

- **Price unlock + size-scaled .97 pricing**: every product was stuck
  `is_locked:true` (custom-integration publish lock — Printify locks a
  product on Publish and waits for the integration to POST a
  publishing_succeeded/failed callback; ours only reads, so they never
  unlocked). That lock blocks BOTH the dashboard AND the API price edit
  (error 8252 "Product is disabled for editing"). Fix: POST
  `/shops/{id}/products/{pid}/publishing_succeeded.json` to release the lock,
  then PUT the product with size-scaled prices rounded UP to the next `.97`
  (preserves the existing per-size margin structure, scales with size, ends
  in .97 per owner's rule). Verified every size still clears print cost
  (tightest ~$6.95). Note: clicking Publish in Printify re-locks; just
  release again if needed.
- **New products via API** — the uploaded HTML ("Capsule 03 · The Mark") is
  a canvas-based **design generator**, not flat art. Ran it headless
  (Playwright) and exported clean, transparent, print-ready PNGs of the
  house marks (crest, interlock WS, seal) by calling its own global draw fns
  and trimming to content. Then, per design: `POST /uploads/images.json`
  (base64), `POST /shops/{id}/products.json` with the same blueprints the
  owner's existing tees use (men's = blueprint 1382, women's boxy = 1393,
  both print provider 99), dark colorways where the bone art pops (men's:
  Black/Navy/Forest; women's: Black/Pepper), prices matched to the existing
  same-blueprint tees ($38.97/$39.97/$42.97 men's; $41.97/$44.97 women's),
  design centered `x:0.5,y:0.5` with per-shape scale (crest .80–.82,
  monogram .72–.74, seal .78–.80). Six products: Crest / Monogram / Seal ×
  men's + women's. Created each **`visible:false` first**, pulled the real
  Printify front mockup, visually verified alignment, THEN flipped
  `visible:true` — nothing went live unverified. Shop went 10 → 16 products.
- **`SHOP_COPY`** (index.html) gained brand title/tagline/desc entries for
  all 6 new tees (keyed by real Printify product id) plus the 3 remaining
  pre-existing products that still showed raw Printify SEO titles, so the
  whole shop now reads on-brand. Display-only, as before — checkout still
  uses Printify's real title/price server-side.
- Verified end-to-end in headless Chromium against the real 16-product
  catalog: all render, new tees show brand copy, 2-col lookbook grid, prices
  correct, zero console errors. The extracted design PNGs live in the session
  scratchpad only (regenerable from the HTML; the print files themselves are
  stored on Printify, referenced by upload id) — not committed.

## Shop hero banner — "Wear Your Verdict" spotlight (2026-07-12)
Owner asked to bring the merch promo look (built as social graphics) onto the
site. Chose "top of the Shop page." Replaced the plain `.shop-lookbook-head`
("Well Seasoned, worn.") header with `#shopHero` — a live spotlight banner
(`shopHeroHTML`, `.shop-hero` CSS) in the site's established spotlight
language (dark stage card, rotating gold conic sweep reusing `emmySpin`,
gold-foil shimmer eyebrow reusing `emmyShine`, pulsing glow `emmyGlow`).
Headline "Wear your **verdict.**", a lead line, and a "Shop the drop ↓"
button (`shopScrollGrid`) that smooth-scrolls to the product grid. The
featured product IMAGE is pulled LIVE from the loaded `_shopProducts` data
(`shopFeatured()` prefers a Seal/Crest/Monogram tee, else the first product,
`defaultImage`) — so the banner can never show a product that isn't actually
for sale (same "nothing baked/faked" rule as prices and votes). Painted only
after products load; the honest "shop isn't open yet" empty-state clears the
hero entirely (no orphan banner). CSS-only motion, respects
`prefers-reduced-motion`, stacks on mobile (`flex-direction:column-reverse`
under 720px). Verified in headless Chromium at desktop (1200px) and mobile
(390/420px): hero renders with the real Printify mockup, headline/CTA
present, grid ordering + back toggle + empty-state all still work, zero
console errors. (The flat social PNGs — promo/catalog/story — live in the
session scratchpad only, not committed; the on-site banner is the live HTML
version, not a baked image.)

## Admin dashboard stats — users + traffic + votes (2026-07-12)
Owner asked for an in-site way to see registered users and traffic (the anon
key can't read `auth.users` or the RLS-locked `events` table, and the
Supabase MCP tools return permission-denied in this environment, so neither
was visible any other way). Built as a read-only owner-gated snapshot:
- **`admin_dashboard_stats(p_secret)`** (backend/schema.sql) — SECURITY
  DEFINER RPC, same auth gate as verify_critic/set_comment_featured (owner
  login OR curation_admin passphrase). Returns aggregate counts only (never
  row data): users total/with-email/anon/new-7d/active-7d, events
  24h/7d/30d/all, votes total/7d, comments total. SECURITY DEFINER lets it
  read auth.users + public.events server-side; grants no new table access.
- **Client** (`loadAdminStats`/`statTile`, `.cur-stats`/`.stat-tile` CSS) —
  a stat-tile dashboard pinned to the top of `#/curate` (owner-only page),
  called on render, with a ↻ Refresh button. Degrades gracefully: if the RPC
  isn't deployed yet it shows a one-line "run the SQL from backend/schema.sql"
  hint instead of an error.
- **NOT yet applied to the live DB** — the Supabase MCP path is
  permission-blocked here, so the owner must paste the
  `admin_dashboard_stats` block from backend/schema.sql into the Supabase SQL
  editor once. Until then the curate page shows the hint. Verified both
  states in headless Chromium (mocked success → 12 tiles across People /
  Traffic / Votes; mocked 404 → the deploy hint), zero console errors.

## Shop: capsule backs, cap front-fix, bottom ordering (2026-07-12)
Owner: "put the new tees at the bottom but they also need some design on the
back. The hat is still turned around the wrong way." Three fixes:
- **Back prints on all 6 capsule tees** (via Printify API, `print_areas`
  with a `back` placeholder alongside `front`): Crest and Monogram tees get
  the **Seal** on the back; Seal tees get the **Crest** — non-redundant with
  each front. Gotcha found: a first PUT that spread the existing placeholder
  objects wholesale saved the back placeholder with **0 images** (Printify
  silently dropped it); rebuilding each image as a clean `{id,x,y,scale,
  angle,flipX,flipY}` object made it stick. bp1382 supports front/neck/back;
  min margin still ~$22 after the second print location, verified. The
  existing site front/back toggle (`.shop-face-toggle`, `backImagesByColor`)
  now lights up for these tees automatically since Printify tags the new
  back mockups `position:back`.
- **Trucker cap "turned around the wrong way"**: the cap only ever had ONE
  mockup selected and it was the back angle (`camera_label=back`, position
  `other`) — the design was correctly on `front_dtf`, but no front mockup
  existed, and re-saving `print_areas` did NOT regenerate more angles. Fix:
  **recreate the product fresh via API** (a fresh `POST products.json`
  auto-generates the full mockup set — front/back/person angles — with a
  front view as `is_default`), verify the front mockup shows the badge, make
  it visible, then DELETE the old back-only cap. New cap id
  `6a53d7abc154a354f50e8cb3` (old `6a53014af13bf5813304cc16` deleted);
  `SHOP_COPY` re-keyed to the new id.
- **New tees to the bottom of the shop**: `shopOrder()` (index.html) +
  `SHOP_BOTTOM` (the 6 capsule product ids) — everything else keeps
  Printify's newest-first order up top, the 6 capsule tees pinned last in a
  fixed order. Verified in headless Chromium: capsule tees are the last 6
  cards, cap leads with its front image, capsule-tee modals show a working
  "Show back" toggle, zero console errors.

## Kids page redesign — "Family movie night, sorted." (2026-07-13)
Owner: "we need to make the kids page more dope. Its weak and boring." The
page was just Browse with the word "Kids." on it — same eyebrow/headline/
scope-toggle/type-chips/grid as every other browse view, zero identity.
Rebuilt `renderKids()` (index.html) into a warm, playful zone that still
holds the brand + "nothing fake" rules:
- **Bright hero band** (`.kids-hero`, `kidsHeroHTML`) — a warm gold→orange→
  paprika gradient (a deliberately bright "cookout/movie-night" zone against
  the site's usual dark surfaces), big display headline "Family movie night,
  sorted.", floating emoji accents (🍿🎬⭐🧸🎈, CSS `khFloat`, reduced-motion
  safe), and the **age-approval system shown off as a feature** — Kid/Teen/
  Young Adult legend pills, tying into the existing real-TMDB `ageTier()`
  badges (honest: "every title opens with its real age rating").
- **Weekly family pick** (`.kids-feat`, `kidsFeatured`/`kidsFeaturedHTML`) —
  one standout title spotlighted big with cinematic backdrop art, HOME_SEED-
  seeded so it holds steady all week then rotates (same pattern as the home
  shelves). **Biased to Animation**, because the `isKidFriendly` predicate
  (tags include Family OR Animation) catches grown-folks dramas — the first
  pick landed on "Tyler Perry's The Oval" (a TV-14 soap), so `kidsFeatured`
  now prefers Animation titles and only falls back to the broader Family pool
  if none exist. Backdrop resolves live via `hydrateFilmMedia` then repaints
  just the featured block (guarded on `parseHash().view==='kids'`).
- **Friendlier filters** — type chips got emoji + bigger pills (✨ Everything
  / 🎬 Movies / 📺 Series), and the grid sits under a real section header
  ("The whole family shelf" + live count) instead of a bare count line. Scope
  toggle (Our Picks / All Picks) unchanged.
- Verified in headless Chromium desktop + mobile (390px): hero/legend/
  featured/chips/46 grid cards all render, featured pick is now a real
  animated film (Mufasa: The Lion King), zero console errors, no Kids-content
  horizontal overflow (the one overflow at 390px is the pre-existing header
  auth-button cluster, site-wide, not introduced here). Reduced-motion
  disables the floating emoji.

## Kids Key — parent-facing age-rating helper (2026-07-13)
Owner: "is there a rating system and key we can pin during scroll... a kids
key that opens that helps with their movies on this page only." Built a
second floating dock, mirroring the global score-legend dock pattern but
**scoped to #/kids only**:
- `#kidsKeyDock` (markup near `#legendDock`) — a pinned "🧒 Kids Key" toggle
  at **bottom-LEFT** (the global "? Key" is bottom-right, so they never
  collide), opening a "🍿 Parent's guide" panel (`kidsKeyPanelHTML`) that
  explains the three tiers with the **real certifications** each maps to
  (same mapping `ageTier()` uses on film pages): Kid = G/PG/TV-Y/TV-Y7/TV-G,
  Teen = PG-13/TV-PG/TV-14, Young Adult = R/TV-MA. Honest note: NC-17 /
  unrated titles show no badge rather than guess.
- `refreshKidsKey(view)` (called from `render()` right after `setActiveNav`)
  shows the dock only when `view==='kids'`, hides + closes it on every other
  view. Same click-outside + Escape close handlers as the legend dock;
  `.kids-key-dock` added to the print-hide rule; reduced-motion safe; sits
  above the mobile tabbar on small screens.
- Verified in headless Chromium: hidden on Home/Browse, visible + labeled on
  Kids, opens 3 tiers with correct cert strings, no horizontal overlap with
  the global Key (x:18 vs x:1188), auto-hides on navigation, zero console
  errors.

## Admin: Critic posts tab — see everything critics have posted (2026-07-13)
Owner: "For the critics on the site, i want to be able to see what they have
posted on the site from the admin side." Added a fourth tab to `#/curate`
("Critic posts") that aggregates every Kitchen review across the whole
catalog in one scrollable, searchable list — a critic's reviews were
previously only visible one at a time, on each film's own page.
- **No new backend needed** — `critic_reviews` is already publicly readable
  (`cr_read` policy: readable when the row's `user_id` belongs to a seated
  critic), the exact same query shape `loadKitchenReviews()` already uses
  per-film, just without the `film_slug=eq.` filter and joined to
  `profiles(name,critic_outlet,avatar_url)`. Read-only by design — the ask
  was to *see* what's posted, not moderate it, so no delete/remove action
  was added (a natural follow-up if ever needed, but out of scope here).
- `loadCurReviews()`/`renderCurReviewsList()`/`curReviewRowHTML()`
  (index.html) — fetches up to 500 most-recent reviews, client-side search
  across critic name/outlet/film title/review text. Each row shows the
  critic's avatar, name + outlet, the film (a real link into `renderFilm`
  via `find(film_slug)`), the score as a gold pill, the date, and the
  written review — or an honest "Score only — no written review" line for
  score-only entries, never inventing filler text.
- Verified in headless Chromium (mocked `critic_reviews` data, including one
  score-only row to check the empty-review fallback): tab renders alongside
  the existing three, 3/3 mock reviews render with correct film titles
  (resolved via `find()`) and scores, search filters correctly by critic
  name, clicking a film title navigates to that film's real page
  (`#/film/sinners`), zero console errors.

## Fix: seating a critic didn't persist — "nothing showed up" on refresh (2026-07-13)
Owner: "I just seated a critic and hit refresh and nothing showed up. I feel
like im losing critics who have applied." Root cause found in `inboxSeat`/
`inboxApproveWriter`/`inboxRemove`/`inboxRemoveWriter` (index.html): they
correctly flipped `profiles.is_critic`/`is_writer` via `verify_critic`/
`verify_writer`, but **never wrote the application's own `status` column**
back to `'seated'` (or reverted it on removal). `inboxCardHTML`'s button
logic reads `seated=(status==='seated')` to decide whether to show "Seat as
critic" or "Remove critic" — so after seating, the application row kept
whatever status it had before (e.g. `'received'`), and on refresh the card
rendered exactly as if the seat action had silently failed. The applicant
was never actually lost (no row deleted, no data missing) — the seat
genuinely took (`profiles.is_critic=true`), it just didn't visually persist,
which reads identically to "disappeared" from the owner's side.

Fix: added `_syncAppStatus(id,status)` — fires the existing
`admin_set_application_status` RPC (already used by the Shortlist/Pass
buttons) after seat/approve succeeds (→ `'seated'`) and after remove
succeeds (→ `'review'`, so the buttons reset to seatable rather than
getting stuck showing "Remove critic" for someone no longer seated).

Note on diagnosis: the Supabase MCP connector was disconnected this session,
so live `critic_applications` rows couldn't be queried directly, and a
direct anon-key pull of applicant PII was correctly blocked by the auto-mode
production-read guard. Root-caused purely by reading the client code path
end to end instead — `admin_list_applications`/`critic_applications` live
only in the actual Supabase DB (never backfilled into backend/schema.sql,
a known pre-existing gap), so their exact server-side definitions weren't
inspectable either; the fix only needed the client-side write, which was
provably the missing piece.

Verified in headless Chromium: mocked seat action fires
`admin_set_application_status` with `p_status:'seated'`; a fresh page load
against the now-updated mock row renders the `SEATED` badge and "Remove
critic" button correctly — the exact persistence that was missing before.

## The Word → magazine expansion: interviews + editorials (2026-07-14)
Owner: "Also I want a feature magazine style page where we conduct
interview, write features and editorials," then confirmed video is a real
intended format: "we will also house video interviews here hopefully."
Rather than build a parallel content system, expanded The Word's existing
`articles` table/RPC/editor — same owner-only publish flow, same markdown
body, same public read policy — since interviews/editorials are editorial
content like articles, just video/quote-driven instead of prose (matches
prior guidance already in this file). "Hopefully" signaled no real
interview is lined up yet, so this is infrastructure only — no placeholder
interview content or fake video was added, honoring "nothing fake."

- **Schema** (`backend/schema.sql`) — additive/nullable-or-defaulted columns
  on `articles`: `kind text not null default 'article' check (kind in
  ('article','interview','editorial'))`, `video_url text`, `subject text`
  (who's being interviewed — distinct from `author`, who wrote/conducted the
  piece). `publish_article` now accepts/persists all three (defaults `kind`
  to `'article'` for any caller that omits it, so nothing existing breaks).
  **NOT YET APPLIED LIVE** — Supabase MCP is disconnected this session, so
  the owner needs to paste the migration block (marked in schema.sql) into
  the Supabase SQL editor, same as the still-pending `admin_dashboard_stats`
  RPC from a prior entry.
- **Graceful degradation until the migration runs**: `loadArticles`/
  `_articleFetch` (index.html) try the full column list first; if PostgREST
  400s on the unknown columns, they transparently retry with the original
  column list and default every row's `kind` to `'article'` client-side —
  so existing published pieces never disappear from The Word just because
  the SQL hasn't been run yet. The write path degrades the same way: an
  unmigrated `publish_article` RPC simply ignores the extra jsonb keys.
- **`renderWord()`** now sections the grid — Interviews / Editorials /
  Features & Reviews shelves (only rendering a section that actually has
  pieces; falls back to one flat shelf, unlabeled, when nothing's
  categorized yet, so an empty magazine doesn't show empty section
  headers). `articleCard()` adds a kind badge (🎤 Interview / 🎬 Video
  interview when `video_url` is set / ✍️ Editorial) and appends the
  `subject` name to the title for interview/editorial pieces.
- **`renderRead(slug)`** embeds a real video player (reusing the exact
  `.mf-trailer`/YouTube-nocookie embed pattern already built for the home
  "Why Did I Get Married Again?" feature) when `video_url` resolves to a
  real YouTube id via the new `ytId()` helper (accepts a full watch/share/
  embed URL or a bare id; returns null — no fake/broken embed — for
  anything else). Shows a "With <subject>" line under the headline for
  interview/editorial pieces that have one.
- **`openArticleEditor`/`paintArticleEditor`/`doPublishArticle`** gained a
  Kind selector (Article/Review, Interview, Editorial); picking Interview or
  Editorial reveals Subject + Video URL fields (`arKindChanged()`, swapped
  in via a small `#arKindFields` sub-render, not a full modal repaint). The
  admin passphrase hint line notes when the magazine columns aren't live yet.
- Verified in headless Chromium (mocked `articles` rows across all three
  kinds): sectioned grid renders correctly scoped to the active `#/word`
  view (the pre-existing Home-page "Reads from the culture" shelf reuses the
  same `.word-card` markup and stays mounted-but-inactive elsewhere in the
  SPA's DOM — not a bug, just something to scope test selectors around);
  opening an interview piece renders the real YouTube embed + "With <subject>"
  line + 🎤 Interview eyebrow; the owner editor's kind selector correctly
  reveals/hides the subject/video fields; zero console errors.

## The Word: magazine polish + five launch pieces (2026-07-14)
Owner (after the magazine redesign): "lets remove the boxes and source some
topics we can discuss and write them. Five articles."
- **Boxes removed on The Word only**: the global footer `.join-portal`
  (critic/writer recruitment cards + newsletter box) rendered on every page,
  cluttering the bottom of the new clean magazine. `render()` now stamps
  `document.body[data-view]` and CSS `body[data-view="word"] .join-portal
  {display:none}` hides it on `#/word` ONLY — the recruitment funnel is
  untouched on every other page. Verified: hidden on Word, present on Home.
- **Magazine visual redesign** (same commit lineage): `#/word` leads with a
  dark cover-story hero (`.word-cover`/`wordCoverHTML`, reusing the shop/Emmy
  `emmySpin`/`emmyShine`/`emmyGlow` spotlight language) for the newest piece,
  and the grid cards (`.word-card`) are now bled-image — the photo IS the
  card, kind/title/meta overlaid on a scrim (`.wc-scrim`), same "no chrome"
  convention as the shop lookbook — instead of the old boxed cream panel.
- **Five real launch articles** — `backend/seed_word_articles.sql` (real
  editorial content, real films, real facts, real TMDB backdrop art as
  heroes; bylined "The Founder"). Two features + three editorials: "The Genre
  Was Always Ours" (Black horror lineage, Sinners — the cover story),
  "Ryan Coogler Bet On Us Every Time", "The Case for Black Romance",
  "In Defense of the Cookout Canon", "Streaming Keeps Losing Our Movies".
  Heroes pull real `image.tmdb.org` backdrops (Sinners/Fruitvale/Love Jones/
  Love & Basketball/Daughters of the Dust — each verified 200 + backdrop_path
  pulled live from TMDB). "Nothing fake" held: these are genuine essays the
  owner asked to be drafted in their voice, every film/fact checked (no
  fabricated data), and NO interviews were seeded (an interview needs a real
  subject/video — none exists yet). Bodies use the site's markdown subset.
  **NOT AUTO-PUBLISHED** — this environment can't authenticate to the
  owner-gated `publish_article` RPC, so the content is delivered as an
  idempotent SQL seed (dollar-quoted bodies, `on conflict (slug) do nothing`)
  for the owner to run once in the Supabase SQL editor, same pattern as the
  migration. Validated against a throwaway Postgres 16: inserts 5 (3
  editorial/2 article), cover ordering correct, re-run inserts 0.
  Requires the magazine migration (kind/video_url/subject) to be live first —
  it is (owner ran it this session).

## The Word: Colman Domingo cover feature + house photo-treatment (2026-07-14)
Owner: "Write a feature piece on the industry or an actor... Vanity Fair
level... New York Magazine like," then "more combative and well researched,"
then "merge it all. artistically for the photos create something that
stands out."
- **Feature added** ("They Didn't Discover Colman Domingo. They Stalled
  Him.") — a combative, sourced critical feature (NOT a reported profile —
  zero fabricated quotes/scenes, "nothing fake"). Every stat verified via web
  research: five Black Best Actor winners in ~a century; the 38-year
  Poitier→Denzel gap; Denzel's lead win for a "crooked cop"; Domingo first
  Afro-Latino / first Black gay man nominated for playing a gay character
  (Rustin, 2024); back-to-back noms (Rustin/Sing Sing) with no win; Sing Sing
  equal-pay/profit-share model; Halle Berry still the sole Black Best Actress
  winner. Seeded as the newest piece → it's the cover story on #/word.
- **House photo-treatment for all six pieces** — instead of raw TMDB stills,
  `scratchpad/gen_word_art.js` renders a cohesive editorial-poster treatment
  (Playwright → JPG, 1200×1600 @1.5x): the real film still graded toward the
  brand palette (desaturate+warm+contrast), a soft-light brand wash, a frozen
  gold spotlight + light streak, vignette, real SVG-turbulence film grain, a
  hairline gold frame, and the foil salt-shaker mark top-left. Committed to
  `/word/<slug>.jpg` (served as static files by Vercel — no rewrite catches
  `/word/*`; verified vercel.json) and referenced as
  `https://itswellseasoned.com/word/<slug>.jpg` in the seed. Deliberately
  bakes NO title/kind text into the art — the site overlays those on the card
  (`.wc-body`) and would clash; the treatment is purely visual so it reads as
  a curated magazine's house style under the live typography. Sources per
  still: Sinners / Fruitvale Station / Love Jones / Love & Basketball /
  Daughters of the Dust / Rustin (Domingo) — all real, license-consistent
  with the site's existing TMDB imagery. The Domingo hero is the real Rustin
  still (the March reflected in his glasses) — genuinely his image, not a
  fabricated portrait.
- Seed now carries 6 pieces (3 features / 3 editorials), validated against a
  throwaway Postgres 16 (INSERT 0 6, cover ordering correct, idempotent).
  Still owner-run: paste `backend/seed_word_articles.sql` into the Supabase
  SQL editor once to publish (this env can't auth to `publish_article`). The
  art deploys with the push, so the hero URLs resolve by the time it's run.

## The Word: de-blocked into a contents-page list + wider cover (2026-07-14)
Owner: "I like the Colman banner but it should be wider? IDK. I hate the
other boxes though. It makes the page feel blocky."
- **Sections are no longer a poster grid.** The old `.word-grid`/`.word-card`
  (a wall of tall bleed-image boxes) read as blocky. The #/word sections now
  render as a magazine contents-page river (`articleRow`/`.word-list`/
  `.word-row`/`.wr-*`): a slim 3:4 cover thumbnail + kind eyebrow + headline +
  dek + byline, separated by hairline dividers, with a subtle slide-right
  hover (no box-lift). The house photo-treatment art still shows, now as the
  thumbnail. `articleCard`/`.word-grid` are UNCHANGED and still used by the
  home "Reads from the culture" 3-up teaser — only the magazine page switched
  to rows.
- **Cover widened** per the (tentative) note: `.wcov-imgwrap` grew from
  `clamp(220px,28vw,320px)` to `clamp(250px,36vw,420px)` and `.wcov-copy` set
  to `flex:1 1 46%`, so the cover-story image reads bigger/more banner-like.
  The side-by-side copy+portrait layout is otherwise unchanged (owner liked
  it). Verified desktop + mobile (rows stack, dek hidden < 640px, cover image
  leads on mobile); the only horizontal overflow is the pre-existing
  site-wide header auth-cluster, not introduced here.

## The Word: Vanity Fair editorial grid (2026-07-14)
Owner showed a Vanity Fair homepage: "see this.. keep the header fix the
rest." Kept the Colman dark cover banner (the "header"/hero) and rebuilt the
stories below it into a VF-style editorial grid:
- **`articleVFCard`/`.vf-grid`/`.vf-*`** — landscape (3:2) image, a RED kicker
  (the piece's kind → `--paprika`, like VF's TELEVISION/EXCLUSIVE labels), a
  serif headline (the already-loaded **Instrument Serif** via `--serif`,
  underline-on-hover), a short dek, and a small-caps mono byline ("BY THE
  FOUNDER") — all sitting on the open cream page with NO box, hairline top
  rule, generous whitespace. A single mixed grid (3-col → 2 → 1), newest
  first, no section headers — matching VF's homepage (kind conveyed by the
  kicker, not a section label). Replaced the previous `.word-list` rows.
- **Serif cohesion**: the cover headline (`.wcov-h`) and the article read
  page title (`.read-ttl`) also switched to `--serif` so the whole magazine
  reads like an editorial title face, top to bottom. Instrument Serif is a
  single-weight display serif (400) — set weight 400, sized up for presence.
- Kept: the header/intro, the dark Colman cover banner, the removed
  recruitment boxes (`body[data-view="word"]`), and the custom house
  photo-treatment art (now shown as the VF landscape thumbnails). The home
  "Reads from the culture" teaser still uses the old `articleCard` grid —
  unchanged. Verified desktop + mobile in headless Chromium (serif headlines,
  red kickers, small-caps bylines render; grid stacks 3→1; zero console
  errors). No seed/schema change — CSS/markup only, deploys on push.

## The Word: Gallery-Dark tone (2026-07-14)
Owner picked "Gallery Dark" from four rendered tone options (warm cream /
newsstand white / warm sepia / gallery dark) for The Word. Implemented as a
dark warm-charcoal page scoped ONLY to #/word via the `body[data-view="word"]`
marker (set in `render()`): dark background gradient, cream serif headlines,
`--gold-soft` eyebrow, a lightened red kicker (#E4794A) and dek/byline tones,
and — importantly — re-lightened footer text (`.ftag`/`.foot-row`/`.foot-row
a`/`.fine`) so the global footer doesn't go dark-on-dark on this page. The
dark Colman cover banner now melts into the page and the film art pops. Every
other view keeps the warm-cream tone (verified: home/browse stay
rgb(239,226,198), word is rgb(22,18,16), and the tone doesn't stick after
navigating away — attribute-scoped, no bleed). The light site nav header sits
above the dark page (intentional, small clean seam). The article READ page
(#/read/<slug>) is still light for long-form readability — a dark→light
transition on click; can be darkened too if the owner wants full parity.

## The Word: article (read) page — dark + floating paper column (2026-07-14)
Owner picked (from 3 rendered mockups: light / full-dark / hybrid) the
HYBRID for the article read page. Scoped to `body[data-view="read"]`: same
dark warm-charcoal stage as the #/word landing, full-width dark hero, then the
article body (`.read-body`) becomes a floating cream "paper" column
(background var(--panel), max-width 772px, centered, rounded, big shadow) so
long-form reading stays on light with dark serif type — best readability while
keeping the dark-magazine cohesion, no dark→light flip from the landing.
Back button lightened; footer text re-lightened (same as the landing); the
global join-portal recruitment block is now hidden on the read page too
(added `body[data-view="read"]` to the existing word hide rule) for a clean
dark reading experience — the funnel still shows on every light page. Verified
real render: body bg rgb(22,18,16), card bg cream, card max-width 772px,
join-portal display:none, zero console errors. Mobile: card padding/margins
reduced < 640px.

## The Word: improved article hero art (2026-07-14)
Owner: "improve the images for all articles." Regenerated all six
`/word/<slug>.jpg` heroes (`scratchpad/gen_word_art2.js`):
- **Native landscape 3:2** (1600×1067) instead of the old 3:4 portrait — the
  dark VF grid cards (3:2) and the read-page hero (wide) are landscape, so the
  art is now composed for those crops instead of being center-cropped from a
  portrait. The cover-story portrait frame (`.wcov-imgwrap` 3:4) still reads
  great via object-fit cover (subject centered). Verified cover, cards, and
  read hero all frame correctly.
- **Cleaner, brighter editorial grade**: dropped the heavy bottom scrim (no
  longer needed — titles now sit beside/below the image, never overlaid), the
  busy gold frame, and the salt-shaker watermark. Now just a subtle warm cast,
  a gentle vignette, a whisper of top/bottom depth, and light film grain — a
  clean magazine-photo look (VF images carry no frames/watermarks).
- **Better sources**: the Coogler piece moved off a dark, weak Fruitvale
  Station still onto the iconic **Black Panther** character montage (his most
  striking film; the piece covers his whole arc) — pulled as the top-voted
  textless 4K backdrop via TMDB `/movie/{id}/images`. Daughters of the Dust /
  Love Jones / Love & Basketball / Sinners kept their on-theme stills but read
  much brighter under the new grade (Daughters was nearly black before). All
  still real TMDB film art, license-consistent with the rest of the site.
- Same filenames, so no seed change — the improved files just deploy over the
  old ones on push.

## Magazine renamed → "The Balcony"; Michael $1B cover feature + home lead (2026-07-14)
Owner: epic NYT-with-bite feature on the Michael Jackson biopic crossing
$1B and how it indicts Hollywood's underfunding of Black film; make it the
home lead (replacing the Emmy items); rename the magazine and put the name
in the main nav banner, not the "More" dropdown. Owner picked **"The
Balcony"** from four options.
- **Fact-check first** (nothing fake): verified via web research that *Michael*
  (dir. Antoine Fuqua; Jaafar Jackson as MJ; Colman Domingo as Joe, Nia Long
  as Katherine) genuinely crossed **$1B on 2026-07-13** — the FIRST biopic
  ever, past Oppenheimer ($975M) and Bohemian Rhapsody ($911M); ~$155M budget
  (~6x); $629.8M/63% international; Lionsgate's first $1B film. Critique data
  is real + attributed in-text (UCLA Hollywood Diversity Report: Black-lead
  films ~25% smaller budgets, 40%+ less with 2+ Black creatives behind camera,
  ~30% fewer intl markets, yet more return per dollar; McKinsey: $10B+/yr left
  on the table). No fabricated quotes — the "three quotables" are pull quotes
  drawn from the piece itself.
- **Article** `michael-billion-dollar-reckoning` ("A Billion Dollars, and the
  Death of an Excuse") added to `backend/seed_word_articles.sql` as the newest
  → it's the cover of The Balcony AND the home lead. Real TMDB *Michael*
  backdrop (Jaafar in the red Beat It jacket), same house photo-treatment.
  Validated vs Postgres (7 rows, cover ordering, 3 pull quotes present).
- **Pull quotes**: `mdToHtml` now renders markdown `> ` lines as
  `.read-pq` blockquotes (NYT-style big serif, red left rule). Note esc()
  turns `>` into `&gt;` so the parser matches `^&gt;`.
- **Home lead**: replaced the `#emmyBanner` markup + `paintEmmyBanner()` call
  with `#leadStory` / `paintLeadStory()` (`LEAD_STORY` object + `.lead-*`
  CSS) — a dark cinematic banner (serif headline, gold shimmer eyebrow, sweep)
  leading `renderHome()`, linking to the article. Baked promo content so it
  shows regardless of DB state; edit the 4 `LEAD_STORY` fields to change which
  piece leads the home. Emmy JS/data left defined but unused (dead).
- **Rename** The Word → The Balcony across all user-facing surfaces (main nav
  link promoted out of the "More" dropdown; `NAV_MORE_VIEWS` no longer lists
  `word`; renderWord eyebrow; home "Reads from the culture" shelf; footer
  link; join-portal writer lane + copy; writer onboarding/terms/toasts;
  `ARTICLE_KIND_LABEL`/kicker labels). The internal view id is still `word`
  (route `#/word`, `data-view="word"`) — only the display name changed; code
  comments still say "The Word". Verified in headless Chromium: nav shows The
  Balcony (not in More), Emmy gone, home lead renders + opens the article, 3
  pull quotes render, Balcony landing + read eyebrow read "The Balcony", zero
  console errors; mobile lead stacks (image over copy).

## The Balcony: Michael feature rewritten in NYMag/VF longform voice (2026-07-14)
Owner supplied a detailed New York Magazine / Vanity Fair style brief
(immersive longform: delayed lead, scene-setting, flowing rhythm, wry
insight, resonant close). Rewrote the Michael $1B feature body in that voice
— opens on a documented real scene (Motown 25, 1983, the moonwalk debut,
Fred Astaire's next-day call — all real, hedged as "the story goes"), carries
the same verified facts/critique, and closes by circling back to the moonwalk
as an illusion of forward motion. "Nothing fake" held: no fabricated quotes,
no invented private scenes — the immersion is built from documented history +
real box-office/UCLA/McKinsey data. Dropped the explainer subheads for a
flowing single-arc structure (VF features don't use them). Same title/dek/
hero/slug, so the home lead + art are unchanged; only the article prose
deepened. Validated vs Postgres (7 rows, moonwalk lead + all 3 pull quotes
present, body ~7.3k chars) and rendered on the dark read page (3 .read-pq
blockquotes, 15 paragraphs, zero console errors).

## The Balcony: Domingo feature rewritten in NYMag/VF longform voice (2026-07-14)
Same elevation as the Michael piece, applied to the Colman Domingo feature.
Now opens on the real *Euphoria* pandemic bottle episode (Ali and Rue in the
diner, 2020 — a documented, widely-praised scene) as the delayed lead, flows
as a single immersive arc, and closes by circling back to that stillness.
Same verified facts/critique (five Black Best Actor winners, 38-yr gap,
Denzel/Training Day, Halle Berry sole winner, Rustin/Sing Sing firsts +
equal-pay model, back-to-back noms/no win). "Nothing fake": no invented
quotes or private scenes — immersion built from his real on-screen work +
real awards history. Same title/dek/hero/slug; only prose deepened. Validated
vs Postgres (7 rows, diner lead + 3 pull quotes, ~6.6k chars) and rendered on
the dark read page (3 .read-pq, 10 paragraphs, zero console errors).

## The Balcony: featured-actor profiles + social share on articles (2026-07-14)
Owner: "anytime we feature an actor their profile [should be] adjacent to the
article so people can click through and keep perusing," and "the share buttons
on the articles should be dope and shareable to social — Threads, Instagram
Stories, Facebook — stylize to that and lead back to the site."
- **Featured people** — reuses the EXISTING `subject` column (comma-separated
  names; no migration). `renderRead` now renders a "Featured in this story"
  row (`readPeopleHTML`/`.read-people`/`.rp-*`) of clickable profile chips at
  the end of the article — each links to `#/artist/<name>` (the TMDB-backed
  actor page). Avatars hydrate from a live TMDB person search
  (`hydrateReadPeople`, initial-letter fallback). The interview-only "With
  <subject>" hero line is now gated to `kind==='interview'`, so features use
  `subject` purely as the featured-people list. The editor exposes a "People
  featured (comma-separated)" field for ALL kinds (was interview-only);
  `publish_article` already persists `subject`, so no RPC change. Seed sets
  `subject` per article via idempotent `update` statements (Michael → Jaafar
  Jackson/Colman Domingo/Nia Long/Antoine Fuqua; Domingo → Colman Domingo;
  etc.).
- **Social share sheet** — `shareRead` now opens a branded modal
  (`openReadShare`) instead of a bare navigator.share: hero + serif title +
  a one-tap row of Threads / Instagram Story / Facebook / X / WhatsApp / Copy
  (`.sc-instagram` gradient added). Threads/FB/X/WhatsApp use the existing
  `socialShare` with the `/read/<slug>` URL (its own OG card, bounces back to
  the site). Instagram Story (`shareReadStory`/`buildReadStoryCard`) builds a
  branded 1080×1920 canvas card (the piece's art + title + wordmark +
  itswellseasoned.com) and shares the image via the device sheet, or downloads
  it to post to a Story — IG has no web share-to-story intent, so a saveable
  branded image is the honest path, and it carries the URL back. Verified in
  headless Chromium: chips render + link to #/artist, share modal shows 6
  branded buttons incl. Instagram, the 1080×1920 card builds, editor field
  present, zero console errors.

## The Balcony: featured-actor chips moved to top of article (2026-07-14)
Owner: "put the actor links at the top" + "make sure the mobile web version
works." Moved the `readPeopleHTML` call in `renderRead` from after the body
to directly under the byline (before the article copy); dropped the
`.read-people` top border/padding since it no longer needs a divider there.
Verified desktop (1180) + mobile (390) in headless Chromium: featured block
sits ABOVE the body copy, 4 chips link to #/artist, branded share sheet (6
buttons incl. Instagram) fits with zero modal overflow, zero console errors.
The only page horizontal overflow is the pre-existing header auth-cluster
(search + Sign in/Join), not introduced here.

## Rotating banner → "Moment Radar" (2026-07-14)
Owner shared a "Moment Radar" content-calendar concept (upcoming cultural
premieres/drops to have a page ready for) and said it fits the rotating home
banner (the `FEATURED` carousel). Wired it up for the two near-term SHOW
premieres in the window — both fact-checked via web search before going live
("nothing fake"):
- **Lanterns** (HBO Max, **Aug 16 2026**, Aaron Pierre as John Stewart / Kyle
  Chandler as Hal Jordan; 8 eps; Mundy/Lindelof/King). Added to the catalog as
  a real TV entry (pinned TMDB backdrop + poster in WS_POSTERS). `scope:'ours'`
  is a closer-bar call like `paradise`/`lioness` — dual lead, but Aaron Pierre
  as the iconic Black Green Lantern is the draw for the culture.
- **Fightland** (Starz, **Jul 31 2026**, Howard Charles/Nicholas Pinnock/
  Deborah Ayorinde, 50 Cent EP). Added as a real TV entry (poster pinned; TMDB
  had no textless backdrop, so the slide rides its poster + gradient).
- **Date-gated moment support in `FEATURED`/`featSlides()`**: a slide can carry
  `premiere` (flips the eyebrow from the pre-drop tease `ey` → `eyLive` on the
  day) and `until` (auto-retires the slide after its window, no manual
  takedown). Non-moment slides (no dates) stay evergreen. So the banner now
  self-manages timely moments: Lanterns shows "Premieres Aug 16 · HBO Max"
  now, flips to "New series · HBO Max" on 8/16, and drops off after 10/15.
- Ran `node scripts/build-films-json.cjs` per convention (1056 titles, +2).
  Verified in headless Chromium (sandbox clock is 2026-07-14): banner leads
  with both premieres carrying the right "Premieres …" eyebrows, then the
  evergreen slides; zero console errors. NOT wired (out of scope this pass):
  the brief's watch-list pages, verdict/where-to-watch hubs, and short-form
  video angles — the banner surfacing is the piece the owner pointed at.
  Unconfirmed items from the brief (I Love Boosters streaming date, specific
  BlackStar 2026 lineup) were deliberately left off pending confirmation.

## Showtimes button gated to real theatrical runs + "Coming" date badge (2026-07-14)
Owner: "make sure everything that's not in theaters does not have the showtime
button." Root issue: the film page's Where-to-watch row had a standalone
"Showtimes" button gated only on `f.type!=='tv'`, so EVERY movie (back-catalog,
streaming-only, unreleased) showed it. Fixes:
- Removed that ungated button. Showtimes/tickets now live ONLY in the already-
  gated `ticketBlockHTML` "Get tickets" block, which shows only for titles
  verified against the live TMDB now-playing list (`_npTitles`).
- New `upcomingReleaseDate(f)`: if a title has a Coming Soon entry dated later
  than today, it isn't out yet. `ticketBlockHTML` returns '' for such titles,
  and the Theaters-page provisional list (the pre-verification `f.year>=now`
  best-guess) now excludes them — so a Sept-2026 Netflix release like "Why Did
  I Get Married Again?" no longer appears on "In Theaters" with a showtimes
  button.
- Film page now shows a "🗓 Coming <date> — not out yet" badge for any title
  with a future Coming Soon date (directly answers "put a date on it"). "Why
  Did I Get Married Again?" is confirmed Netflix **Sep 9, 2026** (verified via
  web); the date already showed on the home hero feature + Coming Soon, now on
  the film page too.
- Verified in headless Chromium: WDIGMA film page has 0 showtimes buttons + the
  Coming badge; a film forced into the now-playing list still gets "Get
  tickets"; zero console errors.

## Showtimes modal reframed as a Fandango hand-off (2026-07-15)
Owner (screenshot of Toy Story 5 → "No live showtimes near 30024"): "this
feels like it is wrong and something isnt working because this movie just
came out." Diagnosed against the live endpoint
(`/api/showtimes?...&debug=1`): **the code is working correctly** — the
`SERPAPI_KEY` IS set in Vercel (the endpoint resolves canonical locations and
returns `knowledge_graph`/`organic_results`, not a 501), but SerpApi's
`engine=google` returns **zero `showtimes` panel for every query** —
confirmed empty for Toy Story 5 AND Superman, in Atlanta, LA, and 30024
(`showtimes_len:0` every time). This is the documented provider limitation
(Google no longer reliably exposes the classic showtimes panel to SerpApi's
general google engine), not a regression from the recent showtimes-button
gating. Since the live theater list can essentially never populate, the old
fallback copy ("No live showtimes near X right now…") read as a broken
search. Fix (`sampleShowtimes`, index.html): reframed the fallback as a
confident **ticketing hand-off** — "Get tickets for <title>", a primary
"Find showtimes on Fandango ↗" button, "Google showtimes ↗" backup, and a
"Powered by Fandango" note — which is the actual ticketing path anyway (and
the Fandango-affiliate monetization goal). The live `/api/showtimes` proxy
still runs in the background and silently upgrades to a real theater list on
the rare occasion it returns one (`renderRealShowtimes` unchanged), so this
is the honest default state, not an error. "Nothing fake" held — no
fabricated theaters/times, we hand off to the real source. Verified in
headless Chromium: the modal now leads with "Get tickets for Sinners" +
Fandango CTA + attribution, zero console errors. NOTE for the owner: to ever
show an in-app theater list, we'd need a showtimes data source that actually
returns theaters (SerpApi's google engine does not for this account) — flag
if that becomes a priority; Fandango's own affiliate deep link is the
reliable path today.

## Suggest a title — viewer catalog-gap requests → admin (2026-07-15)
Owner: "There should also be a way people can suggest a movie we don't have
in the catalog that will show in the admin page." Distinct from the existing
indie-filmmaker intake (`submitFilm` → `film_submissions`, a maker
submitting their OWN work with a screener link) — this is a viewer telling us
we're MISSING a real, existing title ("you don't have Love & Basketball").
Built end to end:
- **Backend** (`backend/schema.sql`, marked block) — new `title_suggestions`
  table (title/year/note/email/device_id/user_id/status/created_at), RLS with
  a public INSERT policy (anon + authenticated, so silent-anon identities can
  submit) and NO public SELECT (emails can't be enumerated). Owner-gated read
  via SECURITY DEFINER `list_title_suggestions(p_secret)` and status update
  via `set_title_suggestion_status(p_secret,p_id,p_status)` — same
  owner-login-OR-`curation_admin`-passphrase gate as `admin_dashboard_stats`/
  `verify_critic`. **NOT YET APPLIED LIVE** — owner pastes the block into the
  Supabase SQL editor once (same pending-migration pattern as the magazine
  columns + `admin_dashboard_stats`). Validated against a throwaway Postgres
  16: insert works, RPC returns rows with the passphrase, status updates,
  wrong passphrase raises `unauthorized`.
- **Client entry points**: the Browse **empty-search state** is the natural
  "we don't have this" moment — when a search returns nothing it now reads
  "No match for '<q>'" with a gold **Suggest "<q>"** button (prefilled), plus
  a general "Suggest a title" in the footer link row and on the no-filter
  empty state. `openSuggestTitle(prefill)` opens a modal (title required;
  year/why/email optional); `submitTitleSuggestion()` inserts via
  `sbVoteHeaders` (same pattern as `submitFilm`), success swaps the modal to
  an "On the list. 🙌" confirmation. Degrades gracefully — a friendly
  "couldn't send" toast if the table isn't live yet.
- **Admin**: a new **"Suggestions"** tab on `#/curate` (`CUR_TABS`,
  `adminSuggestions`/`suggStatus`) between Film submissions and Critic posts,
  listing every suggestion (title/year/status/date/email/note) with
  Reviewed/Added/Pass buttons. Owner-only; shows a one-line "run the SQL"
  hint until the migration is live.
- Verified in headless Chromium: no-match empty state shows the prefilled
  Suggest button → modal → mocked 201 POST (correct body) → "On the list"
  confirmation; the curate Suggestions tab renders mock rows with status/
  date/email/note; zero console errors.

## The Odyssey (2026, Nolan) added — closer-bar case (2026-07-15)
Owner: "Odyssey is not on the site. Huge movie. Should be on 'all films'.
Are there any black actors or actresses in this?" Verified via web + TMDB
(id 1368337, dir Christopher Nolan — NOT the same-year Marcel Walz film
1698863 or the doc): real Black cast in major roles — **Lupita Nyong'o**
(Helen / Clytemnestra), **Zendaya** (Athena), **Corey Hawkins** (Polybus),
alongside Matt Damon (Odysseus)/Holland/Hathaway/Pattinson/Theron. Not
Black-led/created (Damon leads, Nolan directs), so it's a "closer than usual
bar" case like `lioness`/`paradise`/`little-house` — included on the owner's
call for the prominent Black cast, not authorship. Owner chose to scope it
`'ours'` (both toggles), not just "all films". `id:'the-odyssey-2026'`
(year-suffixed — the 1997 miniseries could be added later; identity is
title+year). Real TMDB throughout (poster pinned in `WS_POSTERS` since
multiple 2026 "The Odyssey" titles exist and the auto title+year hydrator
could match the wrong one; backdrop `r57L2UBLPKcHdZQYg8tagv9XqK2` baked;
`k`/`t` null, `votes:0`, `reviews:[]`). Synopsis leads with Nolan + names the
three Black cast members and their real roles. In theatrical window now, so
the film page shows the Fandango "Get tickets" block automatically. Ran
`node scripts/build-films-json.cjs` (1057 titles, +1). Verified in headless
Chromium: entry correct (scope/nulls/cast/dir/poster), findable in search,
film page renders with the synopsis naming Lupita/Zendaya, zero console errors.

## The Pulse — full site dashboard (2026-07-15)
Owner: "a way to create a hub for every registered user and if they have
written a critic on the site and their vote count and track visits... a full
dashboard of the site" (ref: wellseasoned-pulse.netlify.app, a votes-only
Supabase dashboard — this goes further with a per-user directory).
- **`#/pulse`** (`renderPulse`, owner-only via `isOwner()`) — a dedicated
  dashboard page (new view id `pulse`, footer admin link next to Curate).
  Top: site-wide stat tiles (People / Traffic / Votes) reusing the existing
  `admin_dashboard_stats` RPC + `.stat-tile` CSS. Below: a **per-user
  directory** — every registered user with role badge (Critic/Writer/Member/
  Anon), Kitchen reviews count, votes, comments, tracked visits (events), last
  seen, and joined date. Searchable (name/email/outlet), filter chips
  (Everyone/Registered/Critics/Writers/Voters with live counts), and every
  column is click-to-sort (`.pulse-table`, horizontal-scroll wrapper on
  mobile).
- **Backend** (`backend/schema.sql`, marked block) — new SECURITY DEFINER RPC
  `admin_user_directory(p_secret)` (owner-login-OR-passphrase gate, same as
  `admin_dashboard_stats`). Reads the RLS-locked `auth.users` + `public.events`
  server-side and left-joins `profiles`/`critic_reviews`/`votes`/`comments`/
  `events` to return per-user aggregate rows (name, email, is_critic/is_writer,
  reviews, votes, comments, events, last_seen), newest 2000 users. Returns
  aggregate activity per user, never raw event rows. **NOT YET APPLIED LIVE** —
  owner pastes the block into the Supabase SQL editor (same pending-migration
  pattern as the other RPCs). Validated against a throwaway Postgres 16:
  seeded critic user returns reviews:2/votes:2/comments:1/events:3 correctly;
  wrong passphrase raises `unauthorized`.
- Client degrades gracefully — if either RPC isn't deployed yet, the stats
  block and the table each show a one-line "run the SQL" hint instead of
  erroring. Verified in headless Chromium (mocked RPCs): 12 stat tiles, 4-user
  directory, filter counts (Registered·3/Critics·1/Writers·1/Voters·4),
  default sort by last-seen, sort-by-votes, and search all correct, zero
  console errors; desktop + mobile.

## The Pulse: promote members → critics + invite (2026-07-15)
Owner: "move comments from my members to critics side… some signed up but
skipped the separate critic sign-up… move those people to critics or invite
them if they have commented on a lot of movies." Added owner-side promotion
straight from the Pulse user directory (no application needed):
- **New "Move / invite" column** on the `.pulse-table` — for any registered
  (email) member: **Make critic** (gold) + **Invite ✉**; for a seated critic:
  **Remove critic**; anon/no-email rows show "—". `pulseMakeCritic(email)`
  reuses the SAME owner-gated `verify_critic` RPC the applications inbox uses
  to seat an applicant (flips `profiles.is_critic`; coalesces bio/avatar so a
  member with no application row just becomes a critic cleanly), then shows the
  existing `seatedConfirm` modal (with its "email them the news" button) and
  refreshes the directory so the row flips to Critic. `pulseRemoveCritic`
  (verify_critic p_on:false, with confirm) and `pulseInvite` (a pre-filled
  mailto nudge that name-checks their comment count, does NOT promote — for
  when the owner wants to ask first) round it out. No new backend — all three
  reuse verify_critic / notifyContributor patterns already in the inbox.
- **New "Commenters" filter chip** (users with comments > 0) + the Comments
  column now highlights (gold) when > 0 — so the owner can sort/filter to the
  most active commenters and promote or invite them in one click. Directly
  answers "invite them if they have commented on a lot."
- NOTE on "move their comments to the critic side": a member's existing Table
  comments stay comments (a Kitchen review is a *scored* review the critic
  writes — fabricating scored reviews from unscored comments would break
  "nothing fake"). Promoting makes them a critic going FORWARD; standout past
  comments can still be featured via the existing set_comment_featured flow.
- Still TODO (member-facing, flagged to owner as a separate auth/UX change,
  not built this pass): making the critic path more discoverable at sign-up so
  members don't skip it — e.g. a "Become a critic" CTA on the member's own You
  page. Owner-side promotion (this entry) covers the immediate "move them" ask.
- Verified in headless Chromium (mocked verify_critic): member row shows Make
  critic + Invite, critic row shows Remove; clicking Make critic POSTs
  verify_critic with the right p_email, the row flips to a Critic badge on
  refresh; Commenters filter narrows to comments>0; zero console errors.

## Catalog sweep: 47 Black-led films 2023–2026 added (2026-07-16)
Owner: "do a sweep. What movies starring in lead roles since 2009 are we
missing?" then "go" (add them). Ran parallel research agents across eras
(2009→2026), deduped ~290 candidates against the catalog, found ~204 missing.
This entry is the FIRST batch: the 2024–2026 tier (most-searched-now titles)
— 47 real films added, each verified against TMDB (id/year/dir/cast/poster/
backdrop/overview all real), `k`/`t` null, `votes:{for:0,against:0}`,
`reviews:[]`, `scope:'ours'`, `type:'movie'` (or `'doc'`), posters pinned in
`WS_POSTERS` (new entries — auto-hydrate could mismatch same-title films),
backdrops baked. Synopses are the real TMDB overviews (trimmed), nothing
fabricated. Catalog 1057 → 1104; ran `node scripts/build-films-json.cjs`.
Includes: F1, Wicked / Wicked: For Good, A House of Dynamite, The Wild Robot,
A Quiet Place: Day One, Rebel Ridge, Sinners-era 2025 titles (Him, Opus, G20,
Straw-adjacent), Beverly Hills Cop: Axel F, The Deliverance, Nickel-Boys-era
2024 dramas, Nollywood (Everybody Loves Jenifa, House of Ga'a, Lisabi), docs
(Dahomey, Piece by Piece, Luther: Never Too Much, Sly Lives!, The Perfect
Neighbor), and more.
- **Skipped (nothing fake)**: Man on Fire (2026 Yahya remake) and Number One
  on the Call Sheet — neither is on TMDB yet, so no real data to bake; deferred.
- **Closer-bar flags** (Black lead but not Black-authored — owner's call, same
  as lioness/Odyssey): F1 (Damson Idris co-lead, Brad Pitt leads), Wicked/
  Wicked: For Good (Erivo is Elphaba but ensemble musical), A House of Dynamite
  (Idris Elba in a Bigelow ensemble), Back in Action (Foxx + Diaz), Captain
  America: Brave New World, Blink Twice, The Union. All added as `'ours'` per
  catalog norm; flag to owner if any should be pulled.
- **Still to add** (deferred, ~157 more): the 2009–2023 tier (154 titles) +
  a handful of 2025-26 docs. Same verify-against-TMDB process, next batch.
Verified in headless Chromium: 1104 FILMS, all new ids present, F1/Wild Robot/
House of Dynamite render with real cast + pinned posters, film pages open,
zero console errors.

## Catalog sweep batch 2: closer-bar rescope + 152 films 2009–2023 (2026-07-16)
Owner: "add the closer bar if we can pull some artwork and if they had
prominent roles for OUR FILMS. if not just add them to all films. continue."
- **Closer-bar rescope** (the 8 flagged in batch 1): checked each film's pinned
  poster + role prominence. Kept `scope:'ours'` for 6 where the Black lead is
  featured on the poster AND has a lead/co-lead role: Captain America: Brave
  New World (Mackie IS Cap), Back in Action (Foxx co-lead), Wicked +
  Wicked: For Good (Erivo/Elphaba), A House of Dynamite (Idris Elba, plays the
  President, on poster), The Union (Halle Berry co-lead). **Blink Twice** kept
  `'ours'` and re-pinned to the official Naomi Ackie poster
  (`6rHTnmIr0F6Vy3nCsNYhQpYOVse`) — she's the lead, Zoë Kravitz directs, and
  real art of her exists. **F1** moved to `scope:'all'` (All Films only) — every
  F1 poster is Brad Pitt; Damson Idris is a genuine co-lead but the marketing
  never features him prominently, so "Our Films" art would misrepresent it.
  (`scope:'all'` = shows only under the All Films toggle; a film with NO scope
  field defaults to `'ours'` per the `if(!f.scope)f.scope='ours'` line, so the
  non-ours value must be an explicit `'all'`.)
- **152 more films added (2009–2023 tier)** — the rest of the sweep. Same
  process: real TMDB data (id/year/dir/cast/poster/backdrop/synopsis), `k`/`t`
  null, 0 votes, `reviews:[]`, `scope:'ours'`, posters pinned, backdrops baked,
  era set by decade. Dramas/comedies/thrillers/biopics/docs across the full
  span: Precious, For Colored Girls, Pariah (already had some), Beasts of the
  Southern Wild, Belle, Mandela, Selma-era, Dope, Straight Outta Compton (some
  pre-existing), Roxanne Roxanne, Mudbound, Widows, Green Book, Us, Queen &
  Slim-era, Ma Rainey, One Night in Miami, Judas-era, Passing, King Richard,
  The Woman King-adjacent, Till, Nanny, American Fiction, Rye Lane, and many
  Nollywood/UK/African + documentaries.
- **Skipped (nothing fake)**: Mooz-lum (2010) and Gone Too Far! (2013) — not on
  TMDB, no real data to bake. Deferred.
- Catalog 1104 → **1256** titles; ran `node scripts/build-films-json.cjs`.
  Sweep total added this session: **199 films** (47 + 152). Verified in
  headless Chromium: FILMS parses (1256), new entries present with real cast/
  pinned posters, F1 scope='all', Emergency resolves to the right RJ Cyler
  film, film pages render, zero console errors.

## Bull Street (2024) added (2026-07-16)
Owner sent the poster, "lets add this movie as well." Verified via TMDB (id
1222327, dir. Lynn Dow) — matches the poster exactly: Loretta Devine leads as
small-town attorney LouEster Sadie Gibbs, with Amy Madigan, Malynda Hale,
Arielle Prepetit, Gary Ray Moore. Real Black-led courtroom drama (an Ivy
League lawyer challenges her family's claim to their longtime home; privilege
vs. legacy). `id:'bull-street-2024'`, `scope:'ours'`, real poster pinned in
WS_POSTERS, backdrop baked, `k`/`t` null, `votes:0`, `reviews:[]` — nothing
fake. Catalog 1256 → 1257; ran `node scripts/build-films-json.cjs`.

## Post-vote capture moment — the highest-leverage growth fix (2026-07-16)
Owner shared a growth strategy whose #1 item was: never gate the vote (it's
the best engagement act — 279 in the last 7 days), instead capture the email
in the two seconds RIGHT AFTER a vote, when the voter is most invested. Value
first, capture second. Built `postVoteCapture(f,side)` + `showPostVoteCapture`
(index.html), wired into `castVote` (replaced the old `maybeVoteNudge()` call
at the end of a vote).
- **Never gates.** The vote is already counted and celebrated first (a "for"
  vote stamps the seal, removed ~1360ms) — the capture modal fires AFTER the
  celebration lands (1450ms on `for`, 600ms on `against`) so the dopamine hit
  comes first, then the ask. Exactly the plan's "give them the dopamine, then
  capture."
- **Curiosity gap, honest.** The modal reframes the moment as "Your verdict on
  <title> is counted — here's where the culture stands, save yours to lock it
  in": two verdict rings (The Kitchen `f.k` + The Table `tableScore`) reusing
  the existing `auraRing`. Real numbers only — when the Kitchen is unscored it
  reads "Critics not in yet" and when the Table is below quorum it shows the
  real `tblCountText` ("N voted · M more to score it"), never a fabricated
  score. The gap line adapts: pending → "be here when the full verdict drops";
  both scored but not certified → "they haven't fully settled yet — that's the
  good part." Primary CTA "Save my verdict — free" → `openAuth('signup')`.
- **Once per session** (`sessionStorage ws_pvcapture`) so it stays a moment,
  not a nag; after the first vote it falls back to the lighter 3-vote
  cross-device `maybeVoteNudge`. Never shown to signed-in users
  (`app.signedIn`) or when the backend's unconfigured.
- **No double-ask.** The pre-existing once-ever email banner
  (`maybeEmailNudge`, scheduled by `applyVote` at +1200ms) now re-checks the
  capture flag at FIRE time (not just call time, since applyVote runs before
  the flag is set) and defers when the capture owns the session — so the two
  never stack. The banner also no longer marks itself "shown" unless it
  actually renders.
- **Social login (Google) is intentionally deferred** — flagged in a code
  comment as a second CTA slot; it needs a Supabase auth-provider config first
  (a stop-and-confirm auth-flow change), so #1 ships with the existing email
  signup.
- Verified in headless Chromium (desktop + mobile 390px): first anon vote
  opens the capture after the seal clears, "Save my verdict" opens signup,
  second vote same session does NOT reopen, signed-in users get nothing, no
  email banner stacks under it, honest "Critics not in yet"/quorum copy
  renders, zero console errors.
- **Next in the same growth plan (not built yet, owner-steered):** #2 "Pull up
  a seat at The Table" identity + You-page verdict list; #3 email capture moved
  to scroll/exit-intent tied to "The Verdict Drop" newsletter; #4 Sept 9 (Why
  Did I Get Married Again?) + Odyssey pre-registration hooks; #6 share-after-
  vote loop; #7 anon→registered conversion % tile in The Pulse. Affiliate layer
  (Amazon Associates, CJ/Fandango, FlexOffers, Skimlinks/Sovrn auto-linker) is
  owner-signup work; Netflix has NO affiliate program (matters for the Sept 9
  Netflix anchor — that's sponsorship/Amazon-adjacent money, not affiliate).

## Growth plan #2 — "Pull up a seat at The Table" identity + verdicts vs. the room (2026-07-16)
Second item from the owner's growth plan: kill the generic "Join" label and
make membership feel like an identity (joining the culture's verdict), and
give registered users a running list of their verdicts + where they land vs.
the room. Built on the EXISTING `renderYou()`/`voteBlock` (the You page already
had a hero, stats, taste block, plate, and a bare votes list) rather than a new
page.
- **Identity rename** (display-only; view id stays `join`, routing untouched):
  nav link "Join" → **"The Table"**; header signup CTA "Join" → **"Take a
  seat"**; the `#/join` hero eyebrow/headline → **"Membership / Pull up a seat
  at The Table."** with a new lead ("This isn't a newsletter — it's the
  culture's verdict…"). The post-vote capture's "Save my verdict" already opens
  the same signup ("Join the table").
- **Verdicts vs. the room** — `voteBlock` now renders, per verdict, a room chip:
  the real Table % + "with the room" (green) / "against the grain" (paprika),
  or "Table still counting" when a film is below quorum (honest — no comparison
  against a number that isn't real). Header renamed "Your votes" → "Your
  verdicts" with a summary stat: "You side with the culture on X of Y scored
  verdicts" (only counts films with a real Table score). Agreement = whether the
  room's majority side (`tableScore>=50` ⇒ seasoned) matches the user's side.
  `TABLE_QUORUM` is 1, so a user's own vote generally makes the film scored.
- New `.vr-room` CSS (agree/against/pending variants) + a mobile
  `flex-wrap` rule so the chip drops below the title cleanly < 640px.
- Verified in headless Chromium (desktop + mobile): nav "The Table", CTA "Take
  a seat", join hero renders, and a signed-in user with 3 seeded votes shows the
  correct chips (80% with the room, 15%/60% against the grain) + "1 of 3"
  summary, zero console errors. Gotcha noted: `render()` sets `data-view` on
  `document.body`, so `querySelector('[data-view="join"]')` matches BODY first —
  use `section[data-view="join"]` in tests.
- **Still open in the plan:** #7 anon→registered conversion tile in The Pulse;
  #4 Sept 9 / Odyssey pre-registration hooks; #3 scroll/exit-intent email
  capture for "The Verdict Drop"; #6 share-after-vote loop.

## Growth plan #7 — anon→registered conversion tile in The Pulse (2026-07-16)
"The one number that matters" from the growth plan: anonymous → registered
conversion, watched like a scoreboard (plan cites ~10%, 72 of 693; goal 25%).
Added a prominent hero tile at the very top of the Pulse stats
(`loadPulseStats`), above People/Traffic/Votes — `convTile(email,total)` renders
`users_email/users_total` as a % plus the raw "X of Y identities" and a labeled
"Goal: 25%" line. **No backend change** — `admin_dashboard_stats` already
returns `users_email` + `users_total`, so it's a pure client-side ratio of two
real counts (no projection/fabrication). New `.stat-tile-hero` CSS (dark
gold-bordered stage tile, full-width). Verified in headless Chromium with the
plan's exact mocked numbers → renders **10.4% · 72 of 693 · Goal: 25%**, zero
console errors. FOLLOW-UP (not built — needs owner SQL): true week-over-week
TREND requires storing a periodic snapshot (a small table + cron), a
stop-and-confirm backend change; the tile is a live snapshot for now.

## Growth plan #4 — premiere pre-registration hooks (Sept 9 / upcoming) (2026-07-16)
"Weaponize the Sept 9 spike now": capture emails against the Why Did I Get
Married Again? premiere (Netflix, Sep 9 2026) — and every upcoming title —
before the film drops. Built `premiereHookHTML(id,title,date,where)` + handlers
(`premiereRegister`/`premiereRemind`/`premiereDone`, index.html), an inline
"attaches-to-content" capture block (NOT a modal, NOT the existing .ics device
reminder — this is EMAIL capture): eyebrow "🔔 Premieres <date> · <where>",
"Be first on <title>", and either an email form (anon) or a one-tap "Remind me
on premiere day" (signed-in, uses their account email). Submit → `submitSignup`
with source `premiere_<id>` (reuses the `signups` table, ZERO schema change) +
a `track('premiere_intent'/'premiere_register')` interest signal, then the block
swaps in place to "✓ You're on the list · Your seat's saved."
- **Wired into two surfaces**: the Coming Soon detail page (`renderSoonDetail`,
  for any not-yet-released title) and the home marquee feature
  (`paintMarriedFeature`, WDIGMA — passes the verified "Netflix"). Both gated on
  `!soonReleased(c)` so a title that has already premiered shows no hook (a
  released film's Table/Kitchen vote + the post-vote capture take over).
- **Duplicate-id safe**: the same title can be mounted on both the (hidden) home
  view and the visible detail page at once, so handlers scope to the clicked
  button's own `.premiere-hook` via `closest()` rather than a global input id.
- **The Odyssey** is already in its theatrical window (out now), so it's covered
  by the #1 post-vote capture, not a pre-reg hook — pre-registration only makes
  sense before release.
- New `.premiere-hook` CSS — a solid cream panel (legible on both the light
  detail page and the dark married-feature card), gold border, mobile
  full-width form. Verified in headless Chromium: home hook renders "🔔
  PREMIERES SEP 9, 2026 · NETFLIX" + email form; submit POSTs
  `{email,source:"premiere_cs-1522689"}` and swaps to the confirmation;
  signed-in shows "Remind me on premiere day" (no input) and POSTs the account
  email; a released title (Ride or Die, dated in the past) shows NO hook; zero
  console errors.
- **Growth plan remaining after this:** #3 scroll/exit-intent email capture tied
  to "The Verdict Drop"; #6 share-after-vote loop (the share-card system already
  exists — wire it to fire post-vote showing the user's verdict). Affiliate layer
  (#5-adjacent) is owner-signup work.

## Growth plan #6 — share-after-vote loop (verdict on the share card) (2026-07-16)
"Make sharing the growth engine": after someone votes, offer a share card that
shows THEIR verdict → the card pulls in new visitors → who vote → register →
share. Reused the existing share-card system (`buildShareCard`/`openShareCard`/
canvas → PNG + social row) rather than a new one:
- **The card now stamps the sharer's own verdict** whenever `app.votes[f.id]` is
  set. Unscored film → the headline becomes "I SAID SEASONED." / "I SENT IT
  BACK." (was the generic "TWO VERDICTS. CAST YOURS." — still shown when the
  sharer hasn't voted). Scored film → a "MY VERDICT · SEASONED/SENT IT BACK"
  line under the tier label. Nudged the ring row up slightly to make room. This
  means EVERY share of a film the user voted on — from the film-page Share
  button OR the post-vote moment — carries their verdict, no new code path.
- **Post-vote capture modal** (#1) gained a "Share your verdict ↗" button
  alongside "Save my verdict — free" — so the highest-intent moment offers both
  the register ask AND the share loop. Signed-in / repeat voters reach the same
  verdict card via the existing film-page Share button.
- "Nothing fake" held: the card only ever shows real Kitchen/Table numbers (or
  the honest "cast yours" invite when unscored) plus the user's own real vote —
  no invented scores.
- Verified in headless Chromium by instrumenting canvas `fillText`: unscored+for
  → "I SAID SEASONED."; scored+against → rings + "MY VERDICT · SENT IT BACK";
  no-vote → "TWO VERDICTS. CAST YOURS."; the post-vote modal shows all three
  buttons (Save / Share / Not now); rendered card screenshot confirms the "MY
  VERDICT · SEASONED" line sits cleanly between the tier label and footer; zero
  console errors.
- **Growth plan remaining:** only #3 (scroll/exit-intent email capture tied to
  "The Verdict Drop" newsletter) is left of the product items — #1,2,4,6,7 are
  now built. #3 needs the newsletter to actually exist (no outbound send yet),
  so it's a capture-the-interest scaffold until Resend SMTP is live. Affiliate
  layer + Netflix-gap remain owner-signup work.

## Growth plan #3 — "The Verdict Drop": off-page-load email capture (2026-07-16)
Final product item of the growth plan: move email capture OFF page-load (no
on-load popup — hurts UX and premium ad networks like Mediavine penalize it) to
**real scroll-depth OR desktop exit-intent**, tied to the named asset **"The
Verdict Drop"** (release-day breakdowns, "the culture's verdict before everyone
else"). Rebranded the existing post-vote email banner (`showEmailNudge`) to The
Verdict Drop and added two triggers (`maybeVerdictDrop`/`armVerdictDrop`, armed
once at boot):
- **Scroll depth** — fires once the visitor passes ~55% of a scrollable page
  (guarded `h>200` so short pages don't false-fire).
- **Exit-intent** (desktop) — cursor leaves the top edge of the viewport
  (`mouseout`, `clientY<=0`, no relatedTarget). Mobile has no exit-intent, so
  scroll-depth covers it there.
- **Shares the `ws_email_nudge` once-ever flag** with the post-vote banner so
  the two never double-show; never fires for signed-in users; deferred while the
  stronger post-vote capture owns the session (`ws_pvcapture`).
- Submit → `submitSignup(email,'verdict_drop')` (reuses the `signups` table, no
  schema change) + `track('verdict_drop_shown')`. **Honest**: it builds the real
  list for a real planned newsletter — the "we'll be in touch" copy doesn't claim
  a send that isn't wired yet (Resend SMTP still pending; when it's live the
  owner emails the `verdict_drop` list).
- Verified in headless Chromium: NO banner on load; scroll past 55% → "🔔 The
  Verdict Drop" banner; submit POSTs `{source:"verdict_drop"}` and closes;
  doesn't reappear (once-ever); exit-intent shows it; signed-in users get
  nothing; zero console errors.
- **Growth plan status: the product side is now COMPLETE** — #1 post-vote
  capture, #2 seat-at-the-table identity + verdicts-vs-room, #3 Verdict Drop
  capture, #4 premiere pre-reg hooks, #6 share-after-vote loop, #7 conversion
  tile. #5 (return-visit loop) is served by the Verdict Drop newsletter itself.
  Remaining is all owner action: Resend SMTP (to actually send the Drop), and
  the affiliate signups (Amazon Associates / CJ-Fandango / FlexOffers /
  Skimlinks-Sovrn) — Netflix has NO affiliate program, so the Sept 9 anchor
  monetizes via sponsorship/Amazon-adjacent, not click-through.

## Children of Blood and Bone (2027) added to the catalog (2026-07-16)
Owner: "Put the children of the blood up on the site." It was already in
COMING_SOON (cs-621304) but NOT in the main FILMS catalog, so it wasn't
browsable/searchable/votable. Added it as a first-class catalog entry —
`id:'children-of-blood-and-bone-2027'`, `scope:'ours'`. Unambiguous "our film":
dir. Gina Prince-Bythewood, from Tomi Adeyemi's bestselling novel, all-Black
lead cast (Thuso Mbedu, Amandla Stenberg, Damson Idris, Tosin Cole, + Viola
Davis, Cynthia Erivo, Idris Elba, Lashana Lynch). Verified via TMDB (id 621304,
Post Production, releases 2027-01-14, Action/Fantasy). Real poster pinned in
WS_POSTERS; TMDB has no backdrop yet (post-production) so none baked — resolves
live if one lands. `k`/`t` null, `votes:0`, `reviews:[]`, `rt:"TBA"` (runtime
not final). Since it's still in COMING_SOON with a future date, the film page
shows the honest "🗓 Coming Jan 14, 2027 — not out yet" badge (via
`upcomingReleaseDate`) and no showtimes/tickets. Catalog 1257 → 1258; ran
`node scripts/build-films-json.cjs`. Verified in headless Chromium: entry
correct, findable in search, film page renders with the cast/director + coming
badge, zero console errors.

## Home marquee swapped → Children of Blood and Bone + hype voting (2026-07-16)
Owner: "Remove the Tyler perry movie as the marquee put this one in its place
and also I need a voting system [for] it." Repointed the home marquee feature
(`paintMarriedFeature`/`#marriedFeature`) from Why Did I Get Married Again?
(cs-1522689) to **Children of Blood and Bone** (cs-621304). WDIGMA is NOT
deleted — just unwired from the marquee (still in COMING_SOON, reachable), same
pattern as prior feature swaps.
- **Constants repointed** (identifiers kept as MARRIED_* to avoid churn across
  refreshExcitement/loadAllExcitement/#marriedFeature refs — a comment flags the
  rename-of-meaning): `MARRIED_FEATURE_ID='cs-621304'`; `MARRIED_CAST` = the 8
  real cast with real TMDB profile photos AND character names (Thuso Mbedu/Zélie,
  Amandla Stenberg/Amari, Damson Idris/Inan, Tosin Cole/Tzain, Viola Davis/Mama
  Agba, Cynthia Erivo/Admiral Kaea, Idris Elba/Lekan, Lashana Lynch/Jumoke).
- **No trailer** indexed on TMDB yet (post-production), so the hero leads with
  the real poster (`.mf-poster`) instead of a trailer iframe; ribbon reads
  "Feature · <dir>" (Gina Prince-Bythewood), date reads "Premieres <date>"
  (theatrical, not "Streaming").
- **Voting system**: reused the existing excitement/hype vote (Let's Go / Meh,
  `excitement_votes` table + `excitement_scores` view — already live). Since the
  vote is normally gated on having a trailer ("the fair way"), added a `force`
  param to `excitementButtons(c,force)` so this ONE curated marquee shows the
  hype vote without a trailer (the global Coming-Soon gate is unchanged). Framed
  honestly as anticipation ("How hyped are you?"), not a quality verdict — real
  backend-persisted votes, nothing fabricated. The #4 premiere email pre-reg
  hook carries over (platform arg now '' since distribution is unconfirmed).
- New CSS `.mf-poster`/`.mf-vote`/`.mf-vote-lab`. Verified in headless Chromium:
  marquee shows the film/dir/date/poster/8 cast+characters/hype vote/premiere
  hook, no Tyler Perry mention remains, clicking "Let's Go" toggles on and
  records `app.excitement['cs-621304']='excited'`, zero console errors. (TMDB
  cast/poster images are blank in the sandbox — no outbound internet — but
  resolve in production, same limitation as trailers.)

## Children of Blood and Bone — real trailer added to the marquee (2026-07-16)
Owner: "Make sure the trailer or clip is there." TMDB had no video indexed, so
sourced it via web search + verified each candidate through YouTube's oEmbed
(title + channel) before using anything — same bar as the WDIGMA trailer:
- `-2ad68XAKjg` (cited as "official trailer") → **401, embedding disabled** — unusable.
- `EYJShB8rt1w` (full CinemaCon trailer) → embeddable but on a **re-uploader**
  channel ("Movie Trailer Titan"), not official — risks takedown, rejected.
- `fWeYTa3Q6Y0` → **official Paramount Pictures Australia** "Title Reveal" —
  real, official channel, embeddable. **Chosen** (the honest, stable source; the
  full CinemaCon trailer played exclusively at CinemaCon and isn't posted in full
  on an official public channel).
Set `trailer:"fWeYTa3Q6Y0"` on the `cs-621304` COMING_SOON entry. The marquee
(`paintMarriedFeature`) auto-switched from the poster hero to the embedded
`youtube-nocookie` player, and the cs-621304 Coming Soon detail page now shows
the play button + excitement vote via the normal trailer gate too. Verified in
headless Chromium: marquee iframe src correct, poster fallback gone, hype vote +
share still present, detail page play button + 2 excite buttons, zero console
errors. (The clip can't actually play inside the sandbox — no outbound to
youtube — a test-env limit, not a code issue; the id is a verified-real embed.)

## Unreleased films: no "seen it" verdict vote + Coming Soon share poster (2026-07-16)
Owner: "The children of the bone needs a shared link that creates a coming soon
poster image and the poster on the 'new' films needs to be removed from the
ability to be voted as if it's an active movie out in theaters." Two fixes:
- **No verdict vote on unreleased catalog films.** `upcomingReleaseDate` was
  refactored to sit on a new `upcomingSoonEntry(f)` (returns the future-dated
  COMING_SOON entry a catalog film maps to by title, or null). In `renderFilm`,
  `var soonC=upcomingSoonEntry(f)` gates the `#votePanel`: when a title isn't out
  yet, the Seasoned/Send-It-Back verdict buttons + tally + stance-comment box are
  replaced with the **hype vote** ("How hyped are you?" → Let's Go/Meh via
  `excitementButtons(soonC,true)`) + the premiere email hook — never the
  "seen it" verdict, which implied an active theatrical/streaming release. The
  Table ring meta reads "Not out yet" (both at first paint AND in the
  `loadBackendVotes` refresh, which otherwise reset it to "Be the first").
  `renderVotes`/`restoreVoteUI`/`renderComments` now early-return when their
  elements are absent (they `byId(...).x` without null-checks), so the removed
  panel can't throw. Released films are completely unchanged (verified: Bull
  Street still shows the verdict buttons + comment box).
- **Coming Soon share poster image.** `openShareCardSoon(id)` was a bare
  link-share; rewrote it to open the same share modal as released films but
  driven by a new `buildSoonShareCard(c)` canvas → PNG: a "COMING SOON" poster
  (real poster art, title, "Dir. <name> · <year>", "PREMIERES <DATE>", brand
  footer — no scores, nothing faked). Save poster / native share-image /
  Threads-FB-X-WhatsApp-copy row, same plumbing as `openShareCard`
  (`saveSoonCard`/`nativeSoonShare`/`soonCardBlob`, `_soonCanvas`). The social
  buttons carry a crawlable link — `/f/<id>` when the title also has a catalog
  entry (real OG preview, e.g. Children of Blood and Bone), else the hash route
  (`filmByTitle` helper). The unreleased film page's Share button + the marquee/
  Coming-Soon-detail share buttons all now produce this poster.
- Verified in headless Chromium: CoBaB film page has NO verdict buttons, shows
  the hype vote + premiere hook + "Not out yet"; Bull Street (released) still
  votes normally; the soon card canvas draws "COMING SOON / PREMIERES JAN 14,
  2027 / Dir. Gina Prince-Bythewood" etc.; share modal shows Save poster + 5
  social buttons; zero console errors. (Poster art is the gradient fallback in
  the sandbox — no outbound to image.tmdb.org — real poster loads in prod.)

## Film counter accuracy — removed the [Sample Film] placeholder (2026-07-16)
Owner: "is the film counter accurate?" It was off by one. The home hero counter
(`paintCatalogCount`) and the advertise metric used raw `FILMS.length`, which
included **`sample-bland` / "[Sample Film]"** — a dead dev placeholder (noart,
fabricated k:41/t:38 + a fake "Imani Clarke" review) that every real
browse/search/shelf already excluded via `!f.noart`. So the site claimed 1,258
titles while only 1,257 were actually findable. Worse, `sample-bland` had leaked
into `api/films.json`, so the sitemap/OG surface exposed a crawlable
`/f/sample-bland` "[Sample Film]" page — a "nothing fake" leak. Fixes:
- **Removed** the `sample-bland` FILMS entry + its `WS_CAST`-style override-map
  reference (its baked scores/reviews were inert anyway — all FILMS k/t are
  nulled on load; scores only ever come from the backend, verified
  `withBakedScores:0` at runtime).
- **`catalogCount()`** helper = `FILMS.filter(!noart).length`; both the home
  counter and the advertise "Verified titles" metric now use it, so any future
  placeholder can never inflate the public number.
- **`scripts/build-films-json.cjs`** now skips (and deletes) any `noart` entry,
  and the orphaned `sample-bland` was pruned from `api/films.json` → 1258 → 1257.
- Verified: FILMS.length 1257, 0 noart entries, counter renders "1,257 Films &
  shows", films.json 1257 with no sample-bland, zero console errors.

## Marquee swapped again → By Any Means (real full trailer) (2026-07-16)
Owner: "Children of the bone looks weak. We should wait until a official trailer
what can or should we replace it with" → chose **By Any Means**. CoBaB only had
a short official Title Reveal (no full trailer on any official channel yet), so
the poster-led hero read weak. Repointed `MARRIED_FEATURE_ID` → `cs-1380417`
(By Any Means, Sep 3 2026, dir. Elegance Bratton). Researched the field first:
the only near-term Black-led COMING_SOON titles with a real trailer were By Any
Means and Why Did I Get Married Again? (both oEmbed-verified — By Any Means is
an OFFICIAL Paramount **full** trailer `ej8pjisr0Pc`, WDIGMA an official Netflix
teaser). By Any Means won on: full official trailer (not a teaser), genuine
"our film" (Black director + Yahya Abdul-Mateen II leads as a young Black FBI
agent, Giancarlo Esposito as real civil-rights figure Vernon Dahmer), soonest
date. `MARRIED_CAST` curated Black-forward (Yahya/Nicole Beharie/Giancarlo/
LisaGay Hamilton/LaChanze + co-lead Wahlberg) with real TMDB photos + character
names. Since the entry already has a trailer, the marquee auto-leads with the
embedded clip (no poster fallback). CoBaB stays in the catalog + Coming Soon;
restore it to the marquee (id 'cs-621304') once its full official trailer drops.
Verified in headless Chromium: title/ribbon(Elegance Bratton)/date(Sep 3 2026)/
trailer iframe(ej8pjisr0Pc)/6 cast+chars/hype vote/premiere hook all correct,
no old-feature mentions, zero console errors.

## Mini tags — "what you're in for", voted by the culture (2026-07-16)
Owner idea: tag movies by real elements ("Lots of cussin'", "Lots of sex",
"Lots of killing", "Lots of laughs", "Lots of tears", "Lots of lessons"), couple
them into filters, and — the unlock — composite badges like **"Don't Watch With
Mama."** Confirmed with owner it does NOT replace anything in the Key (scores/
seasoning tiers/peppers all stay); it's a new 4th Key section. Built the
FOUNDATION this pass (tagging + composites + Key + backend SQL); the stacked
tag FILTER on Browse/Serve-me-something is the next slice (it needs the vote
data flowing first).
- **Two layers.** Six raw element tags (`MINI_TAGS`, tap-to-vote chips on the
  film page) + composites (`MINI_COMPOSITES`) that are **computed** from the
  votes, never assigned: a composite shows only when every `needs` tag has
  cleared `MINI_QUORUM` (3 taps) AND no `not` tag has. "Don't Watch With Mama" =
  cuss+sex both high; "Cookout Approved" = laughs, no sex/kill; "Bring Tissues"
  = tears; "One For The Lesson" = lessons, no sex. Honest — only real taps earn
  a badge, holding the "nothing fake" line while being the screenshottable part.
- **Same vote model as excitement.** `miniTagVote`/`syncMiniTag`/`loadMiniTags`;
  counts from the public `mini_tag_counts` view, a visitor's own taps in
  `app.miniTags` (localStorage). Works locally/optimistically before the table
  is live (the scaffold is usable now), persists once configured.
- **Gated to released films** (`upcomingSoonEntry` check) — you can't tag what
  nobody's seen, same gate as the verdict vote.
- **Backend** (`backend/schema.sql`, marked NOT YET LIVE): `mini_tag_votes`
  table (unique `(film_slug,tag,user_id)`, forge-proof `user_id=auth.uid()`,
  RLS: public read / owner-identity insert-update-delete) + `mini_tag_counts`
  view. Owner pastes the block into the Supabase SQL editor once (same pending-
  migration pattern as the other RPCs); until then taps work locally only.
- **Key** gained a 4th section ("The mini tags · what you're in for") listing the
  six + a note about the composite badges. Nothing existing removed. NOTE: the
  auto-estimated "peppers" (Language/Violence/Sexual) now overlap the community-
  voted cuss/kill/sex tags — the owner may retire the peppers once tag coverage
  builds, their call (not done here).
- Verified in headless Chromium: 6 chips render on a released film with header;
  tap toggles on + increments + persists to app.miniTags; composites compute
  correctly (cuss+sex→Don't Watch With Mama; laughs+lessons/no-sex-kill→Cookout
  Approved + One For The Lesson); unreleased film shows NO row; Key shows the new
  section; zero console errors.

## Film page opens at the top now + "By Vibe" rankings tab (2026-07-16)
Two owner reports in one turn.
- **Scroll bug fix:** "every time i click on a film for full profile it opens at
  the bottom instead of the top." Root cause was NOT missing a scrollTo —
  `render()` already called it. It was `html{scroll-behavior:smooth}` (global
  CSS): on a route-based SPA that turns every page-nav `scrollTo(0)` into a
  visible smooth GLIDE from the previous scroll position, so opening a film from
  a card far down a long page animated up from the bottom (diagnosed by hooking
  `window.scrollTo` — saw a 537→0 smooth animation over ~365ms). Also
  `behavior:'auto'` in the existing call inherits the CSS smooth rather than
  forcing instant. Fix: base `html{scroll-behavior:auto}` (rails/shopScrollGrid
  set their own smooth explicitly), plus `history.scrollRestoration='manual'` so
  the browser stops restoring the old position, plus a post-content `scrollTo(0,0)`
  + rAF in `render()`. Verified: film opens at Y=0 instantly (was ~1000+).
- **The Vibe rankings tab** (owner: "We need a section on the rankings page for
  these elements. Especially the 'Lots of' so people can click the tags and see
  whats what"). New 4th rank category (`RANK_CAT='vibe'`, `renderVibeRankings`)
  alongside Films/Actors/Actresses. A "The Lots of" chip row (the 6 mini tags) +
  a "The badges" row (the 4 composites); tapping one ranks every film by that
  tag's community vote count (`RANK_TAG`/`setRankTag`), or lists the films that
  earned a composite (sorted by `compStrength`). New `loadAllMiniTags()` bulk-
  fetches the public `mini_tag_counts` view once and re-renders. Honest empty
  state per tag until the room taps. Reuses `.rank-list`/`.rank-row`; new
  `.vibe-badge` shows the count/earned marker. Needs the `mini_tag_votes`
  migration live to populate (boards are empty until then, by design). Verified
  in headless Chromium with seeded counts: correct desc ranking per tag, "Don't
  Watch With Mama" lists only qualifying films, chips switch boards, 🫦 renders,
  zero console errors.

## Mobile header + tabbar cleanup (2026-07-16)
Owner: "The mobile header display can be better" + "remove vault, soon, shop and
put kids in there" (the bottom tabbar).
- **Header overflow fixed:** on phones the row was 97px wider than the viewport
  (`.right` was 244px — the mobile search icon PLUS two auth buttons "Sign in" +
  "Take a seat"). Fix (CSS, `@media max-width:520px`): collapse the signed-out
  auth slot to a single "Take a seat" CTA (`#authSlot .btn-ghost{display:none}` —
  its signup modal already links returning users to Sign in), shrink the mark
  (46→36px), tighten wordmark/gaps. A `@media max-width:360px` step shaves a hair
  more (badge 30, word 16, wrap padding 12). Result: 0 overflow at 360–430px
  (every mainstream phone); 320px down to a negligible 9px (was 37). Signed-in
  state (avatar) unaffected.
- **Tabbar** (`.tabbar`): removed Soon / Vault / Shop, added **Kids** (friendly
  smiley line-icon) after Browse → a cleaner 6-tab bar: Home · Browse · Kids ·
  Rankings · Theaters · You (was 8). Removed items stay reachable via the footer
  link row (not orphaned). Verified: Kids tab routes to `#/kids` and shows
  `.active`; tabbar fits with 0 overflow down to 320px; zero console errors.

## Social kit page — imported Claude Design "Well Seasoned Social" (2026-07-16)
Owner asked to import a Claude Design project (`Well Seasoned Social.dc.html`) via
the design MCP and implement it. Pulled the design with `DesignSync get_file`
(the Vercel/Netlify import path needs a `claudeusercontent.com` bundle URL, which
the editor URL isn't). Implemented it as a self-contained static page,
`social-kit.html` (served at itswellseasoned.com/social-kit.html, `noindex`, not
nav-linked). It's a marketing asset board: **7 Instagram Stories (1080×1920)** —
Manifesto, How-to-read-a-score, The Gap, Lanterns (coming soon), The Seal
spotlight, Fightland (independent), CTA/The Table — plus **3 Threads posts**
(site voice / punchy / editorial) and per-story sticker+hashtag kits. Faithful
to the design 1:1: kept its exact markup/copy, just resolved the design-system
tokens (`--color-accent-*` = The Kitchen gold/paprika, `--color-accent-2-*` =
The Table green, neutrals = cream/brown) to the real WS palette and loaded the
site's real fonts (Bricolage Grotesque / Inter / Instrument Serif via Google
Fonts). Claude-Design runtime bits removed: `<x-dc>`/`<helmet>`/`support.js`/
`_ds_bundle.js` dropped, `<image-slot>` → labeled "drop the poster" placeholder
tiles, `<sc-if>` caption kits always shown. Added a click-to-expand that blows
any story tile up to true 1080×1920 in the browser (real fonts) for
screenshot-to-post. Real film art was later wired into the 3 film-spotlight stories (Lanterns backdrop / WDIGMA poster / Fightland poster, all verified live) and the Manifesto got the real salt-shaker brand mark as a hero; the other three explainers (How-to-read / The Gap / CTA) were deliberately kept as clean graphic cards — stronger that way, and a real film behind The Gap would fabricate its illustrative split. "Nothing fake" note: the scores (94/91, 94/61) and the
"Why Did I Get Married earned the seal" are illustrative TEMPLATE examples — the
caption kits already say to swap in a real split, confirm title/year, and only
post the seal once a film has genuinely earned it (I strengthened the Story 05
caption to say so). Verified in headless Chromium: 7 story frames + 3 threads
render with correct brand colors, click-to-expand opens a 1080×1920 frame, zero
console errors (fonts fall back to system in the sandbox — no outbound internet —
but load real in production).

## Home "Ten years on" spotlight — Insecure & Atlanta (2026-07-18)
Owner: "Any shows that's off air celebrating ten years?" → "Let's do insecure
and Atlanta. Something dope looking." Built `#tenYears`/`paintTenYears()`
(`TEN_YEARS` data object, `.ty-*` CSS), a dark anniversary stage card on the
home page (called from `renderHome()` right after `paintMarriedFeature()`,
sits after the marquee, before the Bracket teaser). Reuses the established
spotlight visual bar — dark stage card, rotating gold conic sweep
(`emmySpin`), shimmering gold-foil eyebrow (`emmyShine`), twinkling sparkles
(`emmyTwinkle`) — same chrome as the Emmy/lead-story/married-feature units.
Eyebrow "Ten years on · Class of 2016", serif headline "Insecure & Atlanta
turned 10.", then two backdrop show-cards (real TMDB backdrops:
Insecure `jS2R26p1S7JQtSCo4MjA9El45A8`, Atlanta `vN84JlTvOZvZzxi0D2SJQNFvtjS`)
each with a "10 years" gold pill + real premiere date (Insecure Oct 9 2016 ·
HBO; Atlanta Sep 6 2016 · FX) linking straight to the catalog page
(`go('film','insecure')`/`'atlanta'`). Closes with an honest note referencing
the REAL 10th-anniversary Insecure celebration Issa Rae announced (2026) —
nothing fabricated, no fake scores (both shows keep their existing catalog
data; this is a milestone callout, not a verdict). To change honorees edit
`TEN_YEARS.shows`. Verified in headless Chromium desktop + mobile (390px):
section visible, correct copy/dates, both cards, click routes to
`#/film/insecure`, grid stacks to 1 col on mobile (358px, no overflow),
reduced-motion disables the sweep/sparkles, zero console errors. Backdrops
render dark in the sandbox (no outbound to image.tmdb.org) — real in prod.

## The Balcony: founder's manifesto cover + home lead swap (2026-07-18)
Owner: "write about why we created this. How the industry has robbed and
pillaged black talent from their earning power due to somewhat the ratings
system and lack of desire to make black actors and actresses stars. Only if
its true and back it up with data." Verified the thesis against real sources
before writing (web-checked, not from memory) and told the owner which parts
hold: budget robbery is documented/quantified, the star-making gap is real
(worst for Black women), and the ratings-system claim is true but structural
(not a quantifiable dollar theft) — reframed accordingly so nothing is
overclaimed. Article `the-count-was-never-neutral` ("The Count Was Never
Neutral") added to `backend/seed_word_articles.sql` as the NEWEST piece → it's
the cover of The Balcony. Bylined "The Founder," first-person, NYMag/VF
longform voice: delayed lead on Halle Berry's 2002 Best Actress win (+ Denzel
same night, 38 yrs after Poitier), gut-punch that she's STILL the only Black
Best Actress winner ~24 yrs later, then the data spine, then the "why this
site exists" turn, closing by circling back to the door. Every figure real +
sourced: McKinsey 2021 (Black-led films budgeted 24% less, ~doubles with 2+
Black creatives behind camera; $10B+/yr left on table; 92% of execs white,
<6% of writers/directors/producers Black), UCLA 2025 (BIPOC leads far likelier
to be sub-$10M, white-male leads likeliest to headline $50M+), USC Annenberg
(82% of reviews by white critics, 63.9% white men, RT top critics 88.8%
white). Three `> ` pull quotes (render as `.read-pq`). `subject` = Halle
Berry, Denzel Washington, Sidney Poitier (featured-people chips). `film_slug`
= moonlight.
- **Hero art**: house photo-treatment (`scratchpad/gen_hero.js`, Playwright →
  1600×1067 landscape JPG) over the real iconic Moonlight beach-silhouette
  TMDB backdrop (id 376867, `/A9KPbYTQvWsp51Lgz85ukVkFrKf.jpg`) — the perfect
  visual thesis (a ~$1.5M film that won Best Picture and the industry still
  read the wrong name). Clean warm grade + vignette + light grain, matching
  the other `/word/*.jpg` heroes. Committed to `word/the-count-was-never-
  neutral.jpg`, referenced as `https://itswellseasoned.com/word/...` in the
  seed.
- **Home lead swapped**: `LEAD_STORY` repointed from the Michael piece to this
  one (eyebrow "The Balcony · Why We Built This"). Michael article untouched in
  the seed — just no longer the home lead.
- **By Any Means marquee removed** from home (owner request): `paintMarriedFeature`
  now hides `#marriedFeature` and early-returns, so no caller (renderHome or the
  excitement-sync sites) can resurface it. Data/cast/handlers kept intact for a
  one-line revival, same unwire-don't-delete pattern as the debate box.
- **NOT AUTO-PUBLISHED**: same as the other Balcony pieces — this env can't auth
  to `publish_article`, so the article is delivered in the SQL seed for the owner
  to run once in the Supabase SQL editor (requires the magazine kind/subject
  columns, already live). The home lead banner shows regardless (baked
  `LEAD_STORY`); the article body opens once the seed is run. Art deploys with
  the push so hero URLs resolve.
- Verified: seed validates against throwaway Postgres 16 (8 rows, this piece
  newest/cover, kind=editorial, 3 pull quotes, idempotent re-run inserts 0);
  headless Chromium — home lead shows the new title/eyebrow/art + routes to
  `#/read/the-count-was-never-neutral`, marquee hidden, read page renders title
  + 3 `.read-pq` + 3 featured-people chips, zero console errors.

## The Balcony: "The Count Was Never Neutral" rewritten in real longform voice (2026-07-18)
Owner: the first draft "wrote with so much AI wiring style and not New York
Times or Vanity Fair." Correct. Rewrote the body to strip the tells — dropped
the throat-clearing ("I want to be careful here"), the tidy tricolons, the
signposted `##` subheads (0 now, VF-style single-arc flow), and the little
summary sentences that explain the piece as you read it. Data is woven in as
marshaled evidence, not a labeled stat dump. Same verified facts intact
(McKinsey 24%/$10B/92%/<6%, UCLA sub-$10M vs $50M, USC Annenberg 82%/64%/~90%,
Halle Berry sole Best Actress winner + Denzel 2nd/38-yr Poitier gap), same
delayed lead on the 2002 Berry moment (rendered with real texture now — the
roll call, the crooked-cop line), same 3 `> ` pull quotes, same title/dek/hero/
slug. Body 5268 chars. Validated against throwaway Postgres 16 (newest/cover,
3 pull quotes, 0 subheads, old tell gone). Note: since the owner may have
already run the prior seed, the mobile publish path uses an UPSERT (`on
conflict (slug) do update`) so it overwrites any stale row with the new prose;
the committed seed keeps its `do nothing` idempotency for the full-file re-run.

## Installable PWA — "Get the app" without an app store (2026-07-18)
Owner: "Time to build an app for it." Shipped the foundation every app path
shares — turned the live site into a real installable PWA on the existing
single-file codebase (no dev accounts, no store review, deploys today). The
App Store / Google Play wrapper (Capacitor around this same PWA) is the clean
phase 2 whenever the owner sets up an Apple Developer account ($99/yr) + Google
Play account ($25 one-time); a full native React Native/Flutter rewrite was
explicitly advised against (two codebases forever, betrays the lean single-file
architecture).
- **`manifest.webmanifest`** (root) — name/short_name/description, `start_url:
  /?src=pwa`, `display:standalone`, `orientation:portrait`, theme `#E49B0B`,
  splash bg `#EFE2C6` (matches the paper app bg, no load flash), 3 icons
  (192 any, 512 any, 512 maskable).
- **Icons** (`brand/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-180.png`) — generated from the real brand salt-shaker mark
  (`scratchpad/gen_icons.js`, Playwright): rounded tile for the "any" purpose,
  full-bleed dark-bg + safe-zone shaker for maskable/apple. No new art invented.
- **`sw.js`** service worker — deliberately conservative so "every push
  deploys" and "nothing fake" both hold: navigations are NETWORK-FIRST (live
  deploy shows instantly online; cached shell is only the offline fallback,
  refreshed on every successful navigation); only SAME-ORIGIN static assets
  (brand icons, /word art) are cached stale-while-revalidate; `/api/*` is never
  cached; cross-origin (Supabase votes/auth, TMDB, YouTube, Google Fonts) is
  never intercepted, so scores/votes/auth are always live. `skipWaiting` +
  `clients.claim`; versioned cache (`ws-cache-v1`) cleared on activate.
- **Head**: `<link rel="manifest">`, `mobile-web-app-capable`,
  `apple-mobile-web-app-capable`, status-bar-style `default` (NOT
  black-translucent — that underlaps iOS status bar and would crowd the fixed
  header), `apple-mobile-web-app-title`, apple-touch-icon → the new 180.
- **Install prompt** (`.pwa-install`, inline ES5 near `</body>`) — subtle,
  once-ever (localStorage `ws_pwa_dismissed`), never shown when already
  installed (`display-mode:standalone`). Android/desktop: captures
  `beforeinstallprompt`, shows an "Install" button that fires the native prompt
  (tracks `pwa_prompt`/`pwa_installed`). iOS (no beforeinstallprompt): shows
  add-to-home-screen instructions instead. Sits above the mobile tabbar via
  safe-area + `--tab-h`.
- Verified in headless Chromium (iPhone UA): manifest linked + fetches (3
  icons, standalone), apple meta present, service worker registers → active →
  precaches the shell + icons + manifest, iOS install banner renders with the
  correct copy, zero real console errors (only the sandbox's aborted-font
  requests). Maskable icon eyeballed (gold shaker, dark bg, within safe zone).

## "This Week at The Table" ballot + honest empty states (2026-07-18)
Owner wanted films to feel less empty ("filling up the voting to some degree").
Held the "nothing fake" line — NO seeded/fabricated votes (the just-published
manifesto literally promises "nothing seeded, nothing bought"). Grounded it in
real data first: 808 real votes across 288 films (~1-2 each), 22 comments, so
~77% of the catalog shows a real zero. Two honest fixes shipped:
- **#1 `#weekTable`/`paintWeekTable()`/`weekBallot()`** — "This Week at The
  Table," a home section above the mosaic that CONCENTRATES real voting instead
  of diluting it: features the same weekly-seeded ~12 titles to everyone
  (HOME_SEED, holds all week then rotates), biased to lead with titles that
  already carry real votes so the ballot looks alive, padded with recognizable
  ours titles. Reuses `cardHTML` (so each card has the existing inline
  quick-vote buttons + real Table score) in a `.grid-cards` grid. A gold pill
  shows the REAL aggregate ("N verdicts cast on this week's ballot" — summed
  live `f.votes`, honest; "ballot's open" when zero). Auto-repaints when
  `loadAllBackendVotes()` → `rerenderActive()` → `renderHome()` lands real
  counts. `.wt-*` CSS.
- **#2 honest empty state on the film-page Table panel** — a 0-vote film used
  to show a dead "0 seasoned / 0 sent back." Wrapped the tally/splitbar/meta in
  `#tblNumbers` and added `#tblInvite` ("🍽️ The table's set. Be the first to
  call it — your verdict opens the room."); `renderVotes` toggles invite-vs-
  numbers on `total`. `tblCountText` 0-state → "Be the first at the table."
  `.tbl-invite` CSS (warm gold callout).
- Verified in headless Chromium: ballot renders 12 cards with inline vote
  buttons + real scores, count pill sums real votes ("79 verdicts…" with mock
  data); film Table panel shows the invite at 0 votes (numbers hidden) and
  flips to real numbers once votes exist; zero console errors. Nothing fake —
  every number is the live Supabase tally.

## Daily Trivia — Black film & TV (2026-07-18)
Owner: "Lets do a trivia question everyday on black movies and tv shows." Built
`#dailyTrivia`/`paintTrivia()`/`answerTrivia()` + a `TRIVIA` bank (28 questions),
a home section above the weekly ballot. One question a day, the SAME for everyone
(indexed by calendar day: `TRIVIA[triviaDayNo()%len]`, days-since-epoch at local
midnight), rotating daily and repeating only after the full bank cycles. Every
question + answer is a real verified fact (nothing fake) — Halle Berry/Monster's
Ball, Coogler/Black Panther, Poitier first Best Actor, Moonlight→McCraney play,
etc. On answer: correct option turns green + your wrong pick red, an explanation
shows, and a correct answer whose film is in the catalog gets a "See <title> →"
link (nudges to the film page → vote). State in localStorage (`ws_trivia` day+
pick, `ws_trivia_streak`/`ws_trivia_lastday` for a consecutive-days-played 🔥
streak); persists for the day (re-answer is a no-op). NO fabricated "% of the
room got it right" — only your own result; `track('trivia_answer',...)` logs real
analytics. `.trv-*` CSS (dark card, brand gold, serif question, 2-col options →
1-col mobile). Verified in headless Chromium: renders today's Q, wrong-answer path
highlights correct+wrong and shows explanation+film link+streak, persists across
reload, zero console errors. To grow the bank just append verified entries to
`TRIVIA`; a future real "community got it right %" would need a backend answers
table (owner SQL) — deliberately left local/honest for now.
