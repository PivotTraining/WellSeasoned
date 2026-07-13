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
