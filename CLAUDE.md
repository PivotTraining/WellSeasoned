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
- **Black-filmmaker YouTube shorts catalog** (2026-07-20, owner: "there is a
  budding catalog of short films on youtube from black filmmakers. go after
  the top viewed films over 100k views"). Agreed standard with owner:
  press-cited view counts only (no live YouTube API access in this
  environment — JS-rendered page, can't scrape a real count directly), page
  format = the existing Pumzi/Hair Love short-film pattern with a large
  embedded player since the whole film IS the YouTube video. Research so far
  (multiple search angles: general virality, DUST, ARRAY/Ava DuVernay,
  Wikipedia sweep, individual creator searches): real candidates exist and
  verify fine on authenticity (e.g. "The Blackening" 2018 — Comedy Central
  Originals' official channel, confirmed via oEmbed, real Black creators
  Dewayne Perkins/Chioke Nassor/3Peat — but no citable count for the SHORT
  itself, only for the later feature's trailer) but a PRECISE, CITABLE
  YouTube-alone view count over 100k for an individual short is proving
  genuinely hard to surface via search (e.g. Kelly Fyffe-Marshall's
  TIFF-winning "Black Bodies" only has a citable ~20k combined across three
  platforms, well under the bar). Diminishing returns on further blind
  search — the fast unblock is the owner naming specific channels/creators
  they've actually been seeing, so verification can be targeted instead of
  exploratory.
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

## Daily Trivia restyled → "The Culture Card" (Black Card Revoked energy) (2026-07-18)
Owner: "Almost in the style of black card revoked." Reframed the daily trivia as
a **Culture Card** check — the playful "know it or your card's on notice" stakes
of a Black Card Revoked night, evoking the vibe WITHOUT copying the trademark
(our own name/treatment). Same verified-fact bank + daily rotation + streak logic
underneath; new framing/skin on top:
- **Black-card treatment** (`.cc-card`): near-black metal gradient, gold-foil
  "THE CULTURE CARD" wordmark (shimmer via `emmyShine`), a diagonal light-sweep
  (`ccShine`, reduced-motion safe), a top divider, and a **card-standing chip**
  (tier by streak: New Member → Good Standing(3) → Gold(7) → Platinum(14) →
  Certified(30), with 🔥 N).
- **Stakes copy**: eyebrow "Daily Card Check", a stakes tag that reads "Answer to
  keep your card" → "✓ Card's good" / "✗ Card flagged" after answering.
- **Celebrate/roast lines** (`CC_PRAISE`/`CC_ROAST`, day-seeded so stable per
  day): correct → warm praise ("The elders approve.", "Certified. Pull up a
  chair."); wrong → affectionate family-reunion ribbing ("Auntie just shook her
  head.", "The cookout committee is reviewing your application. 👀") — never
  mean, always in-group warmth. Explanation + "See <film> →" link unchanged.
- Verified in headless Chromium: foil brand, tier chip (Gold·🔥), stakes flip on
  answer, praise/roast + explanation + film link render, zero console errors.

## Card Check: rotating daily category + flip reveal (2026-07-18)
Owner: "you choose" then "maybe it rotates." Made the rotation the feature (over
a dedicated page, kept in back pocket). Each of the 28 `TRIVIA` questions got a
`cat` (Oscar History / Behind the Camera / On TV / On the Big Screen); the card
eyebrow now reads "Today · <category>" so the daily flavor is visible and rotates
as the day-indexed question rotates (verified: 6 consecutive days cycle through
categories). Also added a physical **card flip** on answer (`.cc-flip` →
`ccFlip` rotateY(360deg), added in `answerTrivia` after repaint, reduced-motion
safe). Foil brand is "Card Check". Verified in headless Chromium: category
eyebrow rotates by day, flip class applies on answer, zero console errors.

## Guardrail: stay film + review focused, not an entertainment zeitgeist (2026-07-18)
Owner: "Lets ensure the page is still movie focused and review focused. So lets
not make it like some zeitgeist of entertainment." Correct check — recent
engagement additions (Card Check trivia, Ten Years spotlight, Bracket teaser)
had crept ABOVE the actual review core on the home page, so a visitor scrolled
past two games and a nostalgia unit before reaching the films + the voting
ballot. Realigned the home order (markup only — every section is painted by id
in renderHome, so DOM order is free to change): **This Week at The Table (the
voting/review act) + the film grid now lead**, right under "How to read a
score"; Ten Years, the Bracket teaser, and Card Check moved BELOW the mosaic as
supporting "dessert." Verified order: teach → weekTable → mosaic → tenYears →
dailyTrivia. **Standing principle for future features:** the site is a film & TV
REVIEW platform (dual verdict: The Kitchen + The Table). The catalog, verdicts,
and voting are the front door; games/spotlights/quizzes are supporting units
that stay below the core and must always tie back to a real film/review (e.g.
Card Check answers link "See <film> →"). Don't add general pop-culture/celebrity/
non-film content, and don't let engagement features outrank the review loop.

## Native app — Capacitor iOS wrapper scaffolded (2026-07-19/20)
Owner set up the Apple Developer account + App Store Connect app record
("Well Seasoned", bundle id `com.wellseasoned.app`) and asked to build the
app. Scaffolded the App Store phase of the PWA plan (previous entry) as a
Capacitor wrapper — isolated in `app/` so the zero-build single-file site is
untouched:
- **`app/capacitor.config.json`** — `server.url:'https://itswellseasoned.com'`
  (the native webview loads the LIVE site directly; no bundled copy to keep
  in sync — every push to the site is what the app shows, no resubmission
  needed for content changes). `www/index.html` is just a brief branded
  loading placeholder for the instant before the remote page paints, or if
  offline.
- **`app/ios/`** — real Xcode project generated via `npx cap add ios`
  (CocoaPods/xcodebuild can't run in this sandbox — that step is documented
  in `app/README.md` for the owner's Mac). Bundle id + display name flow
  through from the config. Portrait-locked on iPhone (matches the PWA
  manifest's `orientation:portrait`).
- **Real app icon + splash** (`app/gen_native_assets.js`, Playwright) from the
  same house salt-shaker mark — full-bleed 1024×1024 square (no transparency/
  rounding, per Apple's App Store icon spec — the OS applies the mask) and a
  2732×2732 branded splash on the paper background color.
- **Push notifications wired for real, not just declared** — this is what
  keeps a "wrapped website" from tripping App Review Guideline 4.2 (no
  native value). `AppDelegate.swift` forwards the standard APNs callbacks
  (`didRegisterForRemoteNotificationsWithDeviceToken` etc.) to
  `@capacitor/push-notifications`; `index.html` (near the PWA service-worker
  registration) detects `window.Capacitor.isNativePlatform()` and, only when
  actually running inside the native shell, requests permission and
  registers for real. The redundant "install the app" PWA banner is
  suppressed in that same context (you're already IN the app). Device
  tokens are only logged via `track('push_registered')` for now — actually
  SENDING campaigns needs a `device_tokens` table + send pipeline, a backend
  change flagged but deliberately not built without the owner's sign-off,
  same risk tier as any other schema change here.
- Verified in headless Chromium with `window.Capacitor` mocked both ways:
  plain web visitors get the exact same PWA experience as before (install
  banner still shows, zero errors); a simulated native context calls
  `PushNotifications.register()` for real and correctly suppresses the PWA
  install banner, zero errors either way.
- **`.gitignore`** extended for `app/node_modules`, Pods, build output —
  same convention as any other repo, only regenerable junk excluded; the
  Xcode project itself, Info.plist, AppDelegate.swift, and generated
  icon/splash assets are committed.
- **Still needed from the owner** (documented in `app/README.md`, can't be
  done in this sandbox — no macOS/Xcode/CocoaPods here): `npx cap sync ios`,
  open in Xcode, set the signing team, confirm the Push Notifications
  capability is attached, Archive → upload to App Store Connect. Android is
  the identical process via `npx cap add android`, held off until a Google
  Play Developer account exists.

## iOS: cloud build path (Codemagic) — local Mac disk space blocked (2026-07-20)
Owner's Mac has only ~427MB free (228GB drive, 98% full) — not enough for
Xcode's 15-40GB install, so the local `npx cap open ios` path from the
previous entry is blocked. Added `codemagic.yaml` (repo root) — a verified
(fetched Codemagic's current docs before writing, not from memory) CI config
that builds `app/`'s iOS project on a cloud Mac and pushes straight to
TestFlight via an App Store Connect API key integration, no local Xcode or
disk space needed at all. `app/README.md` gained a "Cloud build" section with
the exact setup steps (create the API key in App Store Connect, connect it in
Codemagic's UI, trigger a build). Integration key name in the yaml
(`well_seasoned_asc`) must match whatever the owner names it in Codemagic's
UI — flagged in both the yaml comment and the README. YAML validated
(`python3 -c "import yaml"` parses clean). Local Xcode path from the prior
entry is still valid/preferred once the owner frees disk space or uses a
different Mac — this is an alternate unblock, not a replacement.

## Fix: comedy specials flooding Documentaries/Shorts (2026-07-20)
Owner: "too many comedies are in documentaries and short films." Root cause:
`isDoc()`/`isShort()` had no exclusion for stand-up specials, which routinely
carry `genre:'Documentary'` + a `Documentary` tag on TMDB (a filmed special
IS shot documentary-style) and often run under 40 minutes — so they flooded
both the Documentaries shelf/filter and the Shorts shelf/filter, which
already have their own dedicated home (the Stand-Up shelf/`tags` filter).
Fix: both functions now exclude anything tagged `Stand-Up` first. Verified
against the actual catalog data (Node, same eval-FILMS technique as
`build-films-json.cjs`): docs 162→98 (0 comedy-genre remaining, was 64),
shorts 19→9 (0 comedy-genre remaining, was 10). One straggler (`Kevin Hart:
What Now?`) was missing the `Stand-Up` tag entirely — added it directly.
Both `contentMatch()` (Browse filter chips) and the home shelves
(`docSection`/`shortSection`) reuse these same two functions, so the fix
covers both surfaces. Verified in headless Chromium: doc/short rails render
real content only, zero console errors.

## Home featured carousel refresh + a real data fix (2026-07-20)
Owner: "Refresh the content on the site." Audited the home page for staleness
rather than guess at scope. Found two real, concrete issues:
- **`FEATURED` had two now-FALSE claims**: "Survival of the Thickest" and "All
  the Queen's Men" both read "New season · Just dropped" — but those seasons
  dropped 2026-07-02 and 2026-06-10 respectively (18 and 40+ days before
  today), so the copy had become inaccurate by implication, a real "nothing
  fake" issue, not just staleness. Fixed: Queen's Men retired from the
  carousel (no strong evergreen claim to make); Thickest reworded to
  "Final season · Streaming now" (accurate, doesn't imply recency it no
  longer has).
- **`diarra-from-detroit`'s `where` field was wrong** — listed `'Prime
  Video'`, but the show has never been on Prime Video (S1 was BET+, now
  moving to Paramount+ as BET+ shuts down). Verified via web search
  (multiple trade pieces) and fixed to `'Paramount+'`.
- **Added a genuinely fresh, verified pick**: Diarra from Detroit Season 2
  premieres 2026-07-29 on Paramount+ (confirmed via Deadline/TVInsider/
  ComingSoon.net) — added to `FEATURED` with the same premiere/until
  countdown pattern as Lanterns/Fightland, real TMDB backdrop pinned
  (id 247796, verified single unambiguous match, backdrop URL returns 200).
- Coming Soon itself was already fine — `soonReleased()` already filters
  past-dated entries automatically, so nothing there needed fixing.
- Verified in headless Chromium: `featSlides()` returns the corrected 5-slide
  list in order, Diarra's countdown copy is exactly right, the stale/false
  labels are gone, zero console errors.

## iOS build: hardened against the next likely Codemagic failures (2026-07-20)
Owner got stuck on Codemagic again (no error text given, went to sleep) —
worked ahead autonomously rather than wait, researching and fixing the most
likely NEXT failure points after the signing fix, all verified against
current docs/discussions before writing (not from memory):
- **API key role was wrong in the original instructions.** Told the owner
  to create the key with "App Manager" access — verified that's insufficient:
  creating a NEW certificate/profile (what our `fetch-signing-files --create`
  step does) requires **Admin** access; App Manager can only use
  already-existing signing files. Since Apple doesn't allow changing a key's
  role after creation, this needs a revoke-and-recreate. Documented as the
  most likely next blocker in `app/README.md`, with the wrong-role error
  pattern described (often reads like a permissions/403, easy to mistake for
  the earlier profile error).
- **Export compliance**, proactively fixed rather than just documented:
  `app/ios/App/App/Info.plist` now declares `ITSAppUsesNonExemptEncryption:
  false` (accurate — HTTPS only, no custom encryption), so a build doesn't
  get stuck un-testable in App Store Connect pending a manual answer.
- **Build number collisions**, proactively fixed: `codemagic.yaml` now
  auto-increments the build number every run via Codemagic's own counter
  (`agvtool new-version -all $BUILD_NUMBER`, verified syntax) — no Apple
  lookup needed, reruns can never collide.
- `max_build_duration` bumped 60→90 min (first run does real cert/profile
  creation + cold CocoaPods cache, verified `mac_mini_m2` is still the
  correct/current free-tier instance type).
- `app/README.md` restructured into a numbered troubleshooting list in the
  order these are likely to surface, so the owner doesn't need a round-trip
  per error.
- Validated: Info.plist parses (`plistlib`), codemagic.yaml parses (`yaml`).

## Overnight QA sweep: more baked-in "just dropped" staleness + safety check (2026-07-20)
Owner asked me to work ahead overnight. Extended the FEATURED-carousel fix from
earlier tonight — grepped every `syn:` (synopsis) field across the whole
catalog for the same class of bug: time-relative claims baked into a
PERMANENT field with no expiry mechanism (worse than FEATURED, which at least
has `until` dates). Found and fixed 5 more:
- `they-took-my-daughter` — synopsis literally said "Just dropped,
  exclusively on Starz." Removed; `where`/tags already convey platform.
- `survival-of-the-thickest` / `all-the-queens-men` — synopsis (not just the
  FEATURED eyebrow fixed earlier) also said "Season 3/5 just dropped."
  Reworded to evergreen ("The third and final season." / "Now in its fifth
  season.").
- `the-chi` / `raising-kanan` — synopsis said "Season 8/5 ... is airing now."
  Verified both are STILL technically airing today (The Chi S8 finale Jul 26;
  Raising Kanan S5 ends Aug 7) but same structural risk — reworded to
  evergreen ("Its eighth and final season." / "Its fifth and final season.")
  before they go stale in a couple weeks like the others already had.
- Swept for other time-relative phrasing ("now streaming," "recently,"
  "this season," etc.) — remaining hits were all in-story plot language
  ("recently divorced," "recently-deceased"), not publication-timing claims.
  No further action needed.
- **Safety-relevant check**: cross-referenced every `isKidFriendly()`-tagged
  title (Family/Animation tag, feeds the Kids section) against `WS_SPICE`
  mature-content flags (sexual content flag, or R/TV-MA/NC-17 cert) — zero
  matches. Kids section confirmed clean, no fix needed.
- Browser sweep across 18 routes (home, browse, kids, rankings, Balcony,
  shop, couch, soon, theaters, join, bracket, + 6 individual film pages
  including everything touched tonight) — zero real JS exceptions
  (`pageerror`); all console noise was expected network/resource-load
  artifacts from the local test harness (no serverless functions, no
  outbound internet), not real bugs.

## Film Events — real festival listings + home spotlight (2026-07-20)
Owner: "What film events are coming up? We should have somewhere bottom tab
for that and or highlight the most major one in the next 60 days and how to
go." Researched real, verified events before building anything (same bar as
everything else): confirmed via official sources — **BlackStar Film
Festival** (Aug 6-9, 2026, Philadelphia + online, 15th year, 91 films,
tickets at blackstarprojects.org/festival/passes) and **HollyShorts Film
Festival** (Aug 13-23, 2026, LA, Oscar-qualifying, 430 films,
hollyshorts.com). Checked others: ABFF already happened (May 27-31, past);
Urbanworld's dates conflict between sources (Oct 14-18 vs Nov 4-8) and both
fall outside the 60-day window regardless, so left out rather than guess.
- **`EVENTS`** array (real entries only, each needs a verified official
  source before being added — same convention as the catalog) +
  `upcomingEvents()`/`eventDateRange()`/`eventDaysAway()` helpers.
- **`#/events`** page (`renderEvents()`) — lists every real upcoming event as
  a dark card (date badge, dates/city/mode, blurb, real ticket link). Footer-
  linked and in the desktop "More ▾" dropdown alongside Theaters/Soon/Couch/
  Vault.
- **Home spotlight** (`#eventSpotlight`/`paintEventSpotlight()`) — "highlight
  the most major one... and how to go": picks the soonest event within 60
  days (picks `upcomingEvents()[0]`; BlackStar is both soonest and the
  flagship right now, so no separate importance-ranking was needed). Dark
  stage spotlight reusing the established visual language (`emmySpin`/
  `emmyShine`/`emmyTwinkle`), a real "In N days" countdown, real ticket CTA,
  and a link to the full events page. Placed in the "dessert" tier below the
  core film grid, same tier as Ten Years/Bracket/Card Check, per the
  standing "stay review-focused" guardrail.
- **Deliberately NOT added to the mobile bottom tabbar** — that tabbar is a
  fixed 6 slots with no overflow, and was intentionally slimmed from 8 down
  to 6 two sessions ago specifically to declutter it; a 7th icon would
  reverse that. Reachable instead via the desktop "More ▾" dropdown + footer
  link (same discoverability tier as Theaters/Coming Soon/Vault/Couch) and
  the home spotlight. Flagged to the owner as a deliberate call, not a
  silent omission — a literal 7th tab is one line to add if still wanted
  after hearing the tradeoff.
- Caught and fixed a mistake during the build: initially wrote a fabricated
  TMDB image path as the BlackStar spotlight backdrop (there is no TMDB
  entry for a real-world festival) — caught before shipping and removed;
  the spotlight/cards degrade gracefully to the plain dark panel when no
  real art exists, same pattern as event/slide entries elsewhere on the site
  with no confirmed image.
- Verified real URLs resolve (200): blackstarprojects.org/festival/passes,
  hollyshorts.com. Verified in headless Chromium: home spotlight shows
  BlackStar with correct "In 15 days" + real date range + real ticket link;
  `#/events` lists both real events with correct dates; both nav entries
  (More dropdown, footer) present; zero console errors.

## "Is God Is" (2026) added to the catalog (2026-07-20)
Owner: "add 'Is God Is (2026)' to the films." Verified via TMDB (id 1380316,
released 2026-05-14) — the film adaptation of Aleshea Harris's Obie
Award-winning play, and she wrote AND directed it herself (a real rarity).
Unambiguously Black-led: Aleshea Harris (writer/director), all-star cast
Kara Young, Mallori Johnson, Vivica A. Fox, Sterling K. Brown, Janelle
Monáe, Mykelti Williamson, Erika Alexander, Xavier Mills. `id:'is-god-is-
2026'`, real poster pinned in WS_POSTERS, backdrop baked, `k`/`t` null,
`votes:0`, `reviews:[]` — nothing fake. Catalog 1257 → 1258; ran
`node scripts/build-films-json.cjs`.

## Fix: critic/writer applications silently failing (2026-07-20)
Owner: "I also don't think im seeing all application submissions either."
Root-caused by comparing `doApply` (critic/writer applications) against its
proven sibling `submitFilm` (film submissions, documented reliable) rather
than guessing — found a real structural gap: `submitFilm` mints/refreshes a
real identity first (`ensureIdentityThen`) and writes with the caller's
session JWT (`sbVoteHeaders`) plus a matching `user_id` (`myUid()`);
`doApply` did none of that — it wrote with the bare anon key
(`sbHeaders()`, no JWT) and a possibly-stale `app.userId` captured at form-
open time.
Verified live against production (two diagnostic curl POSTs to
`critic_applications`, using an unmistakable
`[DIAGNOSTIC TEST - DELETE ME]` name so they're safe to spot and delete):
sending a `user_id` without a matching session JWT returns **409** with
Postgres error code **23503 — a foreign-key violation** (`user_id` doesn't
reference an existing `profiles` row), NOT a duplicate-email conflict. But
the old client code treated **every** 409 as "you already applied" and
showed the applicant a false success message ("You're already in review")
— so real applications were being silently dropped while the applicant
walked away thinking they were done. This is almost certainly why some
submissions never reached the inbox.
**Fix**: `doApply` now mirrors `submitFilm`'s exact working pattern
(`ensureIdentityThen` → real JWT via `sbVoteHeaders` → fresh `user_id` via
`myUid()` set at write time, not form-open time), and the response handler
now inspects the actual Postgres error `code` — only `23505` (a genuine
unique-constraint duplicate) shows "already in review"; anything else,
including the `23503` FK violation that was silently eating submissions,
now surfaces as a real "Could not submit — try again" so the applicant
knows to retry. Verified in headless Chromium across all three real
response shapes (success / true duplicate / the broken-FK case) — each
shows the correct outcome, real JWT confirmed on every request, zero
console errors.
**Cleanup needed**: the second diagnostic curl test (verifying the
null-user_id path still works) legitimately inserted one real row into the
live `critic_applications` table — name `[DIAGNOSTIC TEST - DELETE ME]`,
email `diagnostic-test-doApply-nulluid@itswellseasoned-test.invalid`. Owner
should delete it from Curate → Applications.

## Curate: new "Critics" tab — a findable roster of everyone seated (2026-07-22)
Owner: "I want to see the people I moved over to critic and that doesnt show
on a list." Real gap: Curate's Applications tab only lists people who
*applied*; a member promoted directly from The Pulse's "Make critic" button
(no application involved) never appeared on any admin list — the only way to
confirm they were seated was Pulse's Critics filter chip buried in the full
user directory table. Added a dedicated `['critics','Critics']` tab to
`CUR_TABS`/`renderCuratePage`/`curShowTab` (index.html), between Applications
and Film submissions. `loadCurCritics()` calls the same owner-gated
`admin_user_directory` RPC The Pulse already uses (needed for email — the
public `profiles` table doesn't expose it, and email is required to reuse
`verify_critic` for removal), filters to `is_critic:true` client-side.
`curCriticRowHTML()` shows avatar/name/outlet/email/seated-date + real
review/vote/comment counts (reuses the existing `.cr-row`/`.cr-body` CSS from
Critic posts — no new styles needed), with a Remove button that calls the
existing `pulseRemoveCritic(email)` (same `verify_critic(p_on:false)` RPC
already used by Pulse/the inbox) and refreshes the list. Read-only aside from
that one existing action — no new backend. Degrades gracefully with the same
"run the SQL" hint if `admin_user_directory` isn't deployed yet. Verified in
headless Chromium (mocked `admin_user_directory` with 2 critics + 1 non-critic
member): tab renders, count reads "2 critics", only the two `is_critic:true`
rows show, Remove button present, zero real console errors.

## Fix: home background "glitching" — spotlight sweep transform bug (2026-07-22)
Owner: "the background is glitching on homepage." Root cause: five dark
"stage card" spotlight sweeps (`.lead-inner::after`, `.ty-wrap::after`,
`.evs-wrap::after` on home; `.shop-hero::after`, `.word-cover::after`
elsewhere) center themselves with a base `transform:translate(-50%,-50%)`,
then animate on the shared `emmySpin` keyframe, which only defines
`to{transform:rotate(360deg)}` — dropping the translate entirely. Animating
between mismatched transform function lists (`translate(...)` → bare
`rotate(...)`) forces the browser to matrix-decompose every frame, which
visibly wobbles the glow mid-spin and then **snaps/pops at every loop
restart** (every 15–18s per element) — three of these run simultaneously on
home (Lead story banner, Ten Years spotlight, Events spotlight), which reads
exactly as "the background glitching." The other spin users
(`.mf-wrap`/`.feat-car`/`.plan.feature`/dead `.emmy-car-wrap`) center via
`inset:-60%` instead of `top/left/transform`, so they had no base transform
to lose and never had this bug.
Fix: new `@keyframes emmySpinCenter{to{transform:translate(-50%,-50%)
rotate(360deg)}}` — keeps the translate in both the base rule and the
keyframe so only rotate ever animates, no decomposition, no snap. Repointed
all 5 translate-based sweeps to it; the 4 inset-based ones stay on plain
`emmySpin`, unchanged. Verified in headless Chromium: computed `::after`
transform matrix matches the static base matrix exactly (translate offset
preserved, only rotation progressing), zero console errors. CSS-only, no
markup/JS change.

## Follow-up: background-attachment:fixed removed (still glitching after the sweep fix) (2026-07-22)
Owner reported the home background was "still acting up" after the
emmySpinCenter fix above. That fix was real (verified via computed-style
matrix) but evidently not the whole story. Second, more likely culprit:
`body{background-attachment:fixed}` (desktop-only, day-one rule) pins the
page's own radial-gradient background in place while content scrolls over
it — on a page with ~7 large blurred `box-shadow` "stage cards" (a count
that's grown a lot this week: Lead story, Ten Years, Events, Card Check, This
Week at The Table, etc.), this is a textbook cause of visible scroll-time
tearing/flicker in Chrome and Safari: the browser has to repaint the fixed
background on every scroll frame while also recomputing all those shadows,
and drops frames under the load. Removed the rule entirely — the gradient
now scrolls normally with the page. Purely a decorative top-of-page glow, so
the visual loss is negligible; the scroll-smoothness gain is real. CSS-only.
If this still doesn't fully resolve it, the next things to check are: (1)
hard-refresh/clear cache, since the earlier sweep-transform fix needs the
new deploy to actually load; (2) which specific element glitches — a video
or screen recording from the owner would pin it down far faster than more
blind fixes.

## New content + homepage shuffle: "72 Hours" (Kevin Hart, Netflix) added (2026-07-23)
Owner: "Create new content for site, shuffle homepage where applicable." Researched
real, current Black-led film/TV news before adding anything (web search →
verify via TMDB/YouTube oEmbed, same bar as always). Found **72 Hours**
(TMDB id 949838) — Kevin Hart leads, directed by Tim Story (Barbershop, Ride
Along — a Black director), premieres **2026-07-24 on Netflix** (confirmed via
press + the trailer living on Netflix's own YouTube channel, oEmbed-verified:
"72 Hours | Kevin Hart | Official Trailer | Netflix"). Real TMDB poster/
backdrop pinned in `WS_POSTERS`, real cast/synopsis, `scope:'ours'` (clear
call — Kevin Hart is the lead, Black director, not a closer-bar case).
- Added to **FILMS** (`72-hours-2026`, k/t null, votes:0, reviews:[]) so it's
  in the searchable catalog and eligible for home-mosaic rotation.
- Added to **COMING_SOON** (`cs-949838`, same id pattern as Children of Blood
  and Bone) so `upcomingSoonEntry()` gates it correctly — hype vote + "Coming
  Jul 24" badge instead of a premature verdict vote, until it actually
  releases tomorrow.
- **Homepage shuffle**: swapped it into the `FEATURED` home carousel in place
  of `man-of-war` (the oldest, most generic "Featured · Out now" slot, no
  longer the freshest thing to lead with) — `ey:'Premieres Jul 24 · Netflix'`
  (absolute date, not "tomorrow" — holding the July 20 lesson about
  time-relative copy going stale) → `eyLive:'New on Netflix'` once it drops,
  retiring itself via `until:'2026-09-07'`. `man-of-war` stays untouched in
  the FILMS catalog — only removed from the carousel array.
- Ran `node scripts/build-films-json.cjs` (1259 titles, +1). Verified in
  headless Chromium: catalog entry, COMING_SOON entry, and the FEATURED
  carousel slide all resolve correctly with real data, zero console errors.

## Social graphics — explore-the-site + 72 Hours promo (2026-07-23)
Two Instagram-portrait (1080×1350) graphics built in the established
spotlight-card house style (dark stage, gold conic glow, Bricolage/
Instrument Serif/DM Mono), rendered via the same Playwright HTML→PNG pipeline
as the win-back graphic:
- `scratchpad/explore-the-site.png` — "Five things worth knowing" tour of
  real, live features (The Balcony, This Week at The Table, Card Check, the
  Kids wing, the installable PWA) — no fabricated stats, just what's actually
  shipped.
- `scratchpad/promo-72hours.png` — real TMDB still (Kevin Hart + cast) as a
  full-bleed hero with a dark scrim, real premiere date/cast/director,
  pointing back to the hype vote on-site. The photo/synopsis are the same
  verified data added to the catalog above.
Not committed to the repo (marketing assets, not site code) — delivered
directly to the owner, same convention as the win-back graphic.

## Fix: 72 Hours trailer wasn't wired to the FILMS catalog entry (2026-07-23)
Caught right after the previous entry (owner asked "do we have a trailer
attached? Is it featured on page?"). The real, verified trailer
(`N-J-HR3quc4`) was set on the **COMING_SOON** entry (`cs-949838`) — so it
plays correctly on the Coming Soon detail page — but the **FILMS** catalog
entry (`72-hours-2026`) only picks up a trailer via the `WS_TRAILERS[f.id]`
override map (`applyMeta()`), which I forgot to add an entry to. Result: the
FEATURED home carousel slide (which reads `f.trailer` off the FILMS entry,
not the Coming Soon one) had no "▶ Trailer" button, and the film's own detail
page would have shown none either. Fixed by adding `'72-hours-2026':
'N-J-HR3quc4'` to `WS_TRAILERS`. Verified in headless Chromium: `find(
'72-hours-2026').trailer` now resolves, and the FEATURED slide HTML includes
the real `▶ Trailer` button wired to `openTrailer('72-hours-2026')`.

## Home FEATURED carousel: Share button added (2026-07-23)
Owner: "Carousel films need a share button." The home spotlight carousel
(`.feat-car`/`featSlideHTML`) had a gold CTA + a Trailer button but no way to
share a slide directly — the film page itself already has one (`renderFilm`'s
`.film-actions` row), so this closed a real gap on the highest-visibility
surface on the site. Added a "Share ↗" button to `.feat-cta` next to Trailer
(`event.stopPropagation()` so it doesn't also trigger the card's own
navigate-to-film click). New `featShare(id)` mirrors the exact released-vs-
coming-soon branch the film page's own Share button already uses
(`upcomingSoonEntry(f)` → `openShareCardSoon` for a title still in its Coming
Soon window, else `openShareCard` for the real verdict card) — so a slide for
an unreleased premiere (e.g. 72 Hours) shares the honest "COMING SOON" poster
card, never a verdict card for a film nobody's voted on yet. Verified in
headless Chromium: all 5 current FEATURED slides render the button; an
upcoming title routes to `openShareCardSoon`, a released one to
`openShareCard`; zero console errors.

## Misty Green (Chris Rock, A24) added to the marquee; SEO breadcrumbs + Article indexing fix (2026-07-23)
Owner: "we need to have the misty green trailer on the featured carousel and
remove the lantern. ensure seo and breadcrumbs are well done for traction."

**Misty Green** — verified via web search + TMDB (id 1381221) + YouTube
oEmbed: Chris Rock writes/directs/stars, Rosalind Eleazar leads, Daniel
Kaluuya co-stars as her brother, Adam Driver/Anna Kendrick/Topher Grace round
out the cast. A24, premieres TIFF September, opens in theaters **October
2026** — no exact day has been publicly announced anywhere (checked Deadline,
Variety, FirstShowing, GoldDerby — all say "October 2026," date TBA). Rather
than fabricate a specific day, used `2026-10-31` (month-end) as internal
plumbing only for the Coming Soon gate/sort — the one thing everyone actually
sees, the FEATURED eyebrow, reads "Coming October 2026 · A24" (no invented
day). Added to FILMS (`misty-green-2026`, scope:'ours', k/t null, votes:0),
COMING_SOON (`cs-1381221`, real trailer `ACaWuqeLpSk`, oEmbed-verified
official A24 upload), `WS_POSTERS`/`WS_TRAILERS`. Swapped into `FEATURED`
in place of `lanterns` (removed from the carousel only — stays in the FILMS
catalog/browsable, same precedent as `man-of-war` two entries up). Ran
`node scripts/build-films-json.cjs` (1260 titles). Verified in headless
Chromium: catalog/Coming-Soon entries resolve, FEATURED carousel shows Misty
Green with a working trailer button, Lanterns gone from the carousel but
still in FILMS, zero console errors.

**SEO + breadcrumbs pass** — audited every real indexable surface:
- **`api/read.js` (The Balcony articles) was the biggest live gap**: it was
  set `noindex` + auto-`location.replace()` — the EXACT anti-pattern `api/f.js`
  was fixed for on 2026-07-09 (an instant redirect tells Google to index the
  hash URL, i.e. nothing, instead of this page). Every Balcony piece —
  including the just-published "The Count Was Never Neutral" founder's
  feature — was completely unindexable. Fixed the same way `f.js` was: real
  substantive body content (fetches `body` from Supabase and renders it as
  actual paragraphs/blockquotes, not just a title card), `Article` +
  `BreadcrumbList` JSON-LD, a canonical link, a visible breadcrumb nav (Well
  Seasoned › The Balcony › Title), and a "Read on Well Seasoned →" CTA instead
  of a zero-friction bounce.
- **`api/f.js`**: added `BreadcrumbList` JSON-LD (Well Seasoned › Browse ›
  Title) + a visible breadcrumb nav row, replacing the old single "back to
  Well Seasoned" link — more internal link signal, not just a rich-result
  nicety.
- **`api/sitemap.js`**: was missing every `/read/<slug>` URL entirely (only
  ever listed films + a few static pages). Now fetches published articles
  from Supabase and includes them, so The Balcony is actually discoverable —
  degrades gracefully (ships films+static only) if that fetch ever fails.
- **`index.html`**: added site-wide `Organization` + `WebSite` JSON-LD (no
  brand-entity structured data existed at all before this). Deliberately did
  **not** add a `SearchAction`/sitelinks-searchbox claim — Browse's search is
  client-side state (`FILTERS.q`), not URL-addressable via a query string, so
  a sitelinks searchbox schema would be structured data that doesn't actually
  work. Same "nothing fake" bar applied to markup, not just content.
- `robots.txt` already correctly allows all + points at the sitemap; no
  change needed there.
- Verified: `node --check` on all three touched `api/*.js` files; a local
  handler-invocation test confirms `api/f.js` emits valid `Movie` +
  `BreadcrumbList` JSON-LD and a real breadcrumb nav for `misty-green-2026`.

## Investigating "still glitching" report + a real flex-sizing bug found and fixed (2026-07-23)
Owner sent a screenshot (desktop Safari) showing the home Balcony lead-story
card with its hero image rendering as a small box far short of its intended
~53%-width/360px-tall area, alongside what looked like unrelated large
background imagery filling the rest of the card. Diagnosis process: couldn't
get a headless browser to reach the live internet from this sandbox
(Playwright, even routed through the environment's HTTPS proxy, couldn't
complete a real TLS connection — curl could, so investigation continued via
raw fetches instead of visual repro). Confirmed via direct fetch that
`/word/the-count-was-never-neutral.jpg` (the real hero image referenced by
`LEAD_STORY.image`) is exactly right (the Moonlight beach-silhouette art) —
so the small box in the screenshot IS the correct, real image, just sized
wrong; whatever filled the rest of the visible area does not correspond to
any image path in this codebase.

Found a real, plausible root cause matching the exact symptom (image side
collapsing well below its flex-basis while the text side renders normally):
`.lead-copy`/`.lead-media` (and the same text+image split-panel pattern in
`.evs-copy`/`.evs-media`, `.sh-copy`, `.wcov-copy` — Events spotlight, Shop
hero, Balcony cover) are flex row children with a percentage `flex-basis` but
no `min-width:0`. Flex items default to `min-width:auto`, sized to their
content's intrinsic minimum — WebKit/Safari enforces this more strictly than
Chromium, so a flex item's real content-minimum can silently override its
flex-basis and eat space from a sibling, exactly the "image box way smaller
than its 53%" symptom reported. Added `min-width:0` to all six affected
rules — the standard, well-documented fix for this exact class of flexbox
bug, safe everywhere it's applied since none of these panels rely on
content-based auto-sizing.

**Not fully closed out**: the large, unrelated-looking background content
visible behind/around the small image box in the screenshot doesn't match
any asset in this codebase, and `.lead-inner` already has `overflow:hidden`,
which should preclude our own elements (including the oversized animated
`::after` sweep) from painting outside the card. Flagged directly to the
owner as possibly a WebKit compositing/paint-cache artifact rather than a
code bug — asked them to fully quit and reopen Safari (not just the tab) and
hard-refresh, then confirm whether the flex fix alone resolved what they were
seeing.

## Home "background glitching" — WebKit overflow-clip fix (attempt 3) (2026-07-23)
Owner reported the home background still glitching after the emmySpinCenter
and background-attachment fixes — screenshot (desktop Safari) showed the
Balcony lead-story card's Moonlight hero rendering as a small detached box
with a large photographic image bleeding across the viewport behind it. Could
not reproduce in Chromium (renders pixel-correct) and the bleed image matches
no asset in the codebase, which pointed at a WebKit-engine-specific bug rather
than bad layout or bad image data. Confirmed the live deploy was current (not
stale) before proceeding.
Root cause hypothesis (matches the symptom class exactly — a photographic
child spilling past its rounded container ONLY in Safari): the home spotlight/
carousel containers (`.lead-inner`, `.feat-car`, `.ty-wrap`, `.evs-wrap`) all
use `overflow:hidden` + `border-radius` to clip either an animated
conic-gradient `::after` sweep or, in the carousel's case, a `.feat-track`
that lays all 5 slides (each a full-width film-backdrop photo) side by side
and is promoted to its own layer via `will-change:transform`. WebKit has a
long-standing bug where `overflow:hidden` + `border-radius` fails to clip a
descendant that's on its own compositing layer — so those off-screen backdrop
photos can paint across the page. Chromium clips correctly, which is why it
never reproduced locally.
Fix: force each clipping container onto its own backing layer with
`transform:translateZ(0)` (+ `-webkit-` prefix) and `isolation:isolate`, the
standard remedy for this WebKit clip bug — it makes the container itself
composited so it clips composited descendants. Deliberately did NOT use the
`-webkit-mask-image:-webkit-radial-gradient(white,black)` variant of this hack
(also commonly cited) because a white→black radial mask fades the card edges
to transparent — a visible corner vignette. `translateZ(0)` is a pure no-op
where clipping already works (verified in Chromium: lead-media still 602×385
in place, zero full-screen photo bleed, zero console errors).
NOTE if this STILL doesn't resolve it for the owner: the decisive next
diagnostic is the exact URL of the bleeding image — right-click it in Safari →
"Copy Image Address" — which names the source element in one shot; and whether
it reproduces in Chrome on the same Mac (Safari-only ⇒ this class of fix;
every browser ⇒ a data/deploy issue). Re-uploading the featured movie would
NOT help — it's a CSS clip bug, not corrupt image data.

## Home "glitch" SOLVED — it was the Queen & Slim poster, root cause = grid track blowout (2026-07-23)
Owner copied the exact image address of the bleeding image:
`image.tmdb.org/t/p/w342/qfIJOmsiBcum6EGosiy5gTF6ihk.jpg` — which is the
**Queen & Slim** poster (Daniel Kaluuya + Jodie Turner-Smith leaning on a
chrome-grille car, B&W). That's the "big car photo" that had been filling the
viewport behind the Balcony lead card in Safari (and matches the owner's
earlier "mobile still displaying the queen and slim" report). Queen & Slim
renders on home via `TUBI_IDS` (Free-on-Tubi shelf) and the mosaic.
Root cause (finally pinned down by analysis, since it never reproduced in
Chromium): `.poster-img` is `position:absolute;inset:0;width:100%;height:100%`
— its size is dictated entirely by its `.poster` parent, whose width comes from
its grid cell. The home grids (`.mosaic`, `.grid-cards`) used
`grid-template-columns:repeat(N,1fr)`. A bare `1fr` track carries an implicit
`minmax(auto,1fr)` minimum = the item's min-content size; when that can't be
satisfied, WebKit lets the tracks **blow out to full width** (a well-documented
Safari grid bug Chromium doesn't share). A full-width grid cell → a ~1136px-wide
poster → an `inset:0` img ~1136×1704, i.e. filling and exceeding the viewport,
with the first mosaic/shelf card (Queen & Slim) painting right behind the lead
story. That's the whole glitch.
Fix (canonical, high-confidence): every card/poster grid switched
`repeat(N,1fr)` → `repeat(N,minmax(0,1fr))` (23 grids, all breakpoints) so
tracks can shrink below content min-size instead of blowing out. Plus
belt-and-suspenders on the poster itself: `.card .poster{contain:layout paint}`
(robustly clips descendants to the box + establishes a containing block, cheap
— no forced compositing layer, unlike translateZ) and `.poster-img{max-width:
100%;max-height:100%}`. `minmax(0,1fr)` is a strict no-op wherever the grid
already fits (verified in Chromium: all 131 home posters unchanged at 271×406,
grids intact, zero console errors), so there's no risk to the working desktop
render. This supersedes the three earlier speculative attempts
(emmySpinCenter / background-attachment / flex min-width:0 / spotlight
translateZ) — those were real hardening but not the cause; the grid blowout was.
The prior spotlight-card translateZ fixes (commit 3dffd11) are kept — harmless
and correct isolation for those dark stage cards.

## Queen & Slim poster swapped to an alternate variation (2026-07-23)
Owner asked to try swapping the Queen & Slim poster to a different TMDB
variation while chasing the still-unresolved "full-screen Queen & Slim image"
glitch on their signed-in home page. Swapped `WS_POSTERS['queen-slim']` (and
the matching `api/films.json` `p` field) from `qfIJOmsiBcum6EGosiy5gTF6ihk.jpg`
(the B&W car poster) to `ksHdHK17wRKMLkpMH4UslMT1V0p.jpg` — the highest-voted
alternate official poster (9 votes, the two of them standing in front of a
garage). Both real, official TMDB art, same 2:3 ratio. Diagnostic value: the
glitch does NOT reproduce on a clean signed-out headless load (poster renders
a normal 271×406), so the image file itself is almost certainly not the cause
(an img can't overflow a correctly-sized grid cell) — but a new URL bypasses
any cached reference to the old one, and if the glitch PERSISTS with a
different image it definitively proves the cause is data/render state (likely
the owner's signed-in curation), not the image. Reversible one-line change.

## ROOT CAUSE FOUND AND FIXED: the "background glitching" was a missing position:relative on .ctc-poster (2026-07-23)
Finally solved after four earlier attempts missed it (emmySpinCenter,
background-attachment removal, flex min-width:0, spotlight-card translateZ,
and swapping the Queen & Slim poster — all real hardening, none the cause).
Owner ran a console diagnostic script that dumped every oversized element on
the live page; the smoking gun was:
`<img class="poster-img"> parentClass:"ctc-poster img-ok" size:"2002x506"`.

`.ctc-poster` is the small 56×84px film-thumbnail box in the home
"What the culture's saying" shelf (`culTalkCardHTML`, fed by
`loadCulTalk()` — real owner-curated **featured comments**, fetched from
`comments?featured=is.true`). That shelf hides itself (`display:none`) unless
there's real featured-comment data, and EVERY automated test this session
mocked all Supabase REST calls to return `[]` — so this specific component
never rendered once in any of my headless checks, even though I'd tested the
main poster grid repeatedly. That's the actual reason four fixes in a row
missed it: I was testing the wrong element.

Root cause: `.ctc-poster{flex:none;width:56px;height:84px;...}` had **no
`position` set** (defaults to `static`). `posterInner()` — shared with every
other poster context on the site — renders `<img class="poster-img">` styled
`position:absolute;inset:0`. An absolutely-positioned element sizes itself
against its nearest *positioned* ancestor; skipping a static `.ctc-poster`
and a static `.cul-talk-card`, it kept climbing the DOM until it found none,
falling back to the initial containing block — i.e. the viewport. Result: the
poster image renders full-viewport-sized, top:0/left:0, regardless of which
film or which image file (fully reproduced and proved with a real headless
test using a real loaded JPEG: buggy CSS → image renders 1280×900 at
top:0/left:0 despite `naturalWidth:342`; fixed CSS → same image renders the
correct 56×84). This is why it was NOT a WebKit-only bug — it's a plain CSS
positioning bug that hits every engine identically, which is exactly why the
owner saw it in both Safari and Chrome, and why it followed the film entry
(Queen & Slim) rather than any specific image file — swapping the poster
image earlier only proved the file wasn't the cause, which was the correct
diagnostic step even though the real fix lay elsewhere.

Fix: one line — `.ctc-poster{position:relative;...}`. Verified every other
`posterInner()` caller site (`.poster` in the main grid, `.room-poster` on
the film page) already had `position:relative` on its container; `.ctc-poster`
was the sole exception. Audited via `grep -n "posterInner("` for every call
site.

Lesson for future debugging on this codebase: when a real, owner-reported
visual bug won't reproduce in headless tests, check whether the mocked
Supabase responses are silently hiding the exact component in question —
`display:none`-until-real-data sections (featured comments, admin stats, etc.)
are common on this site and a blanket `body:'[]'` mock defeats them all.

## Vote-invite social graphics + Denzel Bracket promo (2026-07-24)
Owner: "I want to start pushing individual movies and getting votes. We need
artwork for social media to invite people to vote and comment. I also want
artwork for the Best Denzel movie tournament." Built a reusable 1080×1350
Instagram-portrait template (`gen_batch1.js`-style: Playwright HTML→PNG,
`page.goto('file://...')` not `setContent()` since `setContent()` loads at
`about:blank` and blocks `file://` image loads cross-origin — a real gotcha
worth remembering for any future graphic-gen work) — dark stage, full-bleed
real film backdrop, bottom gradient scrim, brand badge (needs
`text-shadow`/`drop-shadow` on the wordmark or it vanishes against bright
photos — caught and fixed after the first pass), gold eyebrow, "Cast your
*verdict* on `<Title>`." headline, Kitchen/Table glass-panel cards, gold
"Vote now →" CTA, itswellseasoned.com line. Delivered directly to the owner
(marketing assets, not committed to the repo): Sinners, The Woman King, then
6 more for real current rankings positions 20-25 (Set It Off, Soul Food, The
Color Purple, Menace II Society, O.J.: Made in America, Juice — ranking
computed by replicating the site's own `tableScore`/`overallScore` formula
against a live query of the public `vote_counts`/`kitchen_scores` Supabase
views) with Seth-Godin-voice captions and real film links. Also delivered the
Denzel Bracket tournament promo graphic (same house style, Malcolm X hero
art, 4×2 grid of the 8 real seed-film posters, CTA to `/#/bracket`) — the
`denzel` bracket (`BRACKETS` array, index.html) started 2026-07-22 with seeds
training-day/malcolm-x/american-gangster/glory/fences/devil-in-a-blue-dress/
the-hurricane/he-got-game.

## The long "background glitching" saga — actually solved (2026-07-23/24)
Multi-day thread (see the several dated entries above: emmySpinCenter,
background-attachment removal, flex min-width:0, translateZ WebKit-clip fix,
Queen & Slim poster swap) finally closed. **The real root cause**: `.ctc-poster`
(the 56×84px mini poster in the home "What the culture's saying" shelf —
real owner-curated featured comments, `loadCulTalk()` → `comments?featured=
is.true`) had no `position` set. `posterInner()` (shared by every poster
context sitewide) renders `<img class="poster-img">` as `position:absolute;
inset:0`, which needs a positioned ancestor; skipping the static `.ctc-poster`
it fell back to the viewport as its containing block, so the poster image
rendered full-screen — reproduced identically in Chrome AND Safari (a plain
CSS bug, not WebKit-specific, which is why four WebKit-flavored fixes in a
row didn't help). Broke the case only once the owner pasted the exact
bleeding image's URL (Queen & Slim's poster), a poster swap PROVED the image
file wasn't the cause when the bug persisted anyway, and a console
diagnostic the owner ran named the actual broken parent element
(`ctc-poster`) — a component every automated test this session had been
silently hiding by mocking all Supabase calls to `[]`. Fix: one line,
`.ctc-poster{position:relative;...}`. All four earlier fixes were real,
legitimate hardening (kept) — just not the cause. **Lesson restated because
it mattered this much**: `display:none`-until-real-data components are a
blind spot for any headless test that blanket-mocks Supabase responses.

## The Balcony: "Eight Roles, No Consensus" — Denzel Washington feature (2026-07-25)
New Balcony piece (`backend/seed_word_articles.sql`) tied to the live Denzel
Bracket tournament, in the established NYMag/VF longform voice (delayed lead,
no subheads, 3 pull quotes, real facts as evidence not stat-dumps). Delayed
lead: Chadwick Boseman's real June 2019 AFI Life Achievement Award speech for
Denzel, telling the real story of Denzel anonymously funding 9 Howard
theatre students' (including Boseman's) 1998 British American Drama Academy
summer at Oxford, arranged via Phylicia Rashad, kept quiet for 20 years —
verified via web research before writing. Factual spine (also verified): 10
Oscar nominations, the most of any Black actor in Academy history, against
only 2 wins (Glory 1990 supporting, Training Day 2002 lead) — used as
evidence that the "which Denzel role is best" debate is structurally
unresolvable, tying directly into the site's real Bracket feature without
reading as an ad. The 8 real bracket seed roles are woven in as the
supporting evidence for why no consensus forms. Hero art: real TMDB Training
Day still (id 2034, Denzel as Alonzo) through the house photo-treatment
pipeline (warm sepia grade, film grain, vignette), committed to
`word/denzel-eight-roles.jpg`. `subject:'Denzel Washington, Chadwick Boseman,
Phylicia Rashad'` for the featured-people chips. Validated against a
throwaway Postgres 16 (9 rows total, idempotent re-run, `kind` check
constraint satisfied, 3 pull quotes present, 6540-char body). **Not
auto-published** — same as every other Balcony piece, this environment can't
auth to the owner-gated `publish_article` RPC; the owner runs
`seed_word_articles.sql` once in the Supabase SQL editor. The hero art itself
deploys with the push regardless.

## Catalog sweep: Ride or Die + The Dutchman (2026-07-25)
Two real, verified 2026 additions found via a general news sweep (not tied to
a specific owner list this time):
- **Ride or Die** (`ride-or-die-2026`, TV, Prime Video, premiered Jul 15
  2026) — Octavia Spencer co-leads (billed #2) opposite Hannah Waddingham in
  Tessa Coates' action-comedy about two best friends on the run across
  Europe after one discovers the other is a professional assassin. A
  "closer than usual bar" case by cast composition (Waddingham/Bill Nighy
  are the other two leads, neither Black) — included because Octavia is
  genuinely co-lead billing AND the key art puts her front-and-center at the
  wheel of the car, not sidelined the way `f1`'s Damson Idris was (that one
  is `scope:'all'` for exactly the opposite reason — flag to the owner if
  this call should be revisited).
- **The Dutchman** (`the-dutchman-2026`, movie, released Jan 2026, dir.
  Andre Gaines) — Andre Holland leads a modern feature adaptation of Amiri
  Baraka's 1964 Obie Award-winning play, with Zazie Beetz, Stephen McKinley
  Henderson, and Aldis Hodge. Unambiguous Black-led/Black-adapted-from
  pick, `scope:'ours'`.
Both verified via TMDB (ids 241882 / 1180417): real cast/director/synopsis,
posters pinned in `WS_POSTERS`, backdrops baked inline, `k`/`t` null,
`votes:0`, `reviews:[]` — nothing fake. Catalog 1260 → 1262; ran
`node scripts/build-films-json.cjs`. Verified in headless Chromium: both
film pages render with correct titles, zero console errors.

Owner then named a third directly: **Newborn** (`newborn-2026`, movie,
released Apr 10 2026) — Nate Parker writes/directs/produces, David Oyelowo
leads as Chris Newborn (a man rebuilding his life after seven years in
solitary confinement), with Olivia Washington, Barry Pepper, Jimmie Fails.
Unambiguous Black-led pick, `scope:'ours'`. Verified via TMDB (id 787844):
real cast/director/synopsis, poster pinned, backdrop baked, `k`/`t` null,
`votes:0`, `reviews:[]`. Catalog 1262 → 1263; ran
`node scripts/build-films-json.cjs`. Verified in headless Chromium: film
page renders with correct title/director, zero console errors.

## Pulse: comment moderation + home "cast your first vote" widget (2026-07-26)
Owner: "I want a way in the pulse to see new comments to be able to
moderate. Also we should improve the how to vote bar on the home screen or
something. Too many visitors dont vote at least once."

- **Comment moderation** — new SECURITY DEFINER RPCs (`backend/schema.sql`,
  marked NOT YET LIVE, same pending-migration pattern as every other admin
  RPC this session): `admin_list_comments(p_secret,p_limit)` — an owner-
  gated read of every comment INCLUDING reported ones (the public
  `comments_read` policy already hides `reported=true` rows from everyone
  else, so this is the one place the owner can actually see them) — and
  `admin_moderate_comment(p_secret,p_id,p_reported)`, a two-way flip of that
  same flag. Deliberately distinct from the existing public `report_comment`
  RPC, which anyone can call but which only ever sets `reported=true` (a
  flag, not a moderation tool) — this is the owner-only hide/restore switch.
  No new table; reuses `comments.reported`/`comments.featured` exactly as
  they already exist. New "Recent comments" panel on `#/pulse` (below the
  user directory): search, filter chips (All/Unreviewed/Reported/Featured
  with live counts), each row showing name/stance/film link/body/timestamp,
  with Hide/Restore and Feature/Unfeature actions (Feature reuses the
  existing `set_comment_featured` RPC the film-page ★ toggle already uses —
  no duplicate logic). Degrades gracefully with the standard "run the SQL"
  hint if the RPCs aren't deployed yet, same as every other not-yet-live
  Pulse/Curate panel. Validated the new RPCs against a throwaway Postgres 16
  (list/hide/restore/unauthorized-reject all correct); verified client-side
  in headless Chromium with mocked data: renders, filters, and the moderate
  action fires the right payload and flips the row in place, zero console
  errors.
- **Home "cast your first vote" widget** — real gap: every card sitewide
  already has inline quick-vote buttons (`quickVoteRow`), but the very first
  thing a new visitor sees under the hero was `.teach`, a purely educational
  "how to read a score" blurb with no vote action at all — voting required
  scrolling down to find a card first. Restructured `.teach` into a
  `.teach-vote` widget (new `voteBarHTML()`/`voteBarPick()`/`voteBarVote()`,
  index.html) that surfaces ONE real film — specifically the same film
  `weekBallot()` already leads the "This Week at The Table" ballot with, so
  it's never a second, disconnected pick — with a poster thumb, title, and
  big one-tap "It's Seasoned"/"Send It Back" buttons right at the top of the
  page. The pick is cached per pageview (`_voteBarFilmId`) specifically
  because `weekBallot()`'s own selection logic favors films that already
  have votes, so voting through the widget would otherwise nudge the
  underlying tally and swap the widget to a DIFFERENT film out from under
  the visitor immediately after they voted — caught and fixed via headless
  testing before shipping. Reuses the exact same `applyVote`/`track` path
  every other vote button on the site uses — real, backend-persisted, same
  post-vote capture flow fires afterward. The original "how to read a
  score" explainer + its three buttons (See how it works / Find your picks
  / Serve me something) moved below it as a secondary row, unchanged
  otherwise. Verified in headless Chromium desktop + mobile: widget renders
  the real weekly pick, casting a vote updates the same card in place
  (button goes `.on`, film doesn't swap), zero console errors, zero
  horizontal overflow at 390px.

## Fix: schema.sql not idempotent — missing drop-policy guard on debate_votes (2026-07-26)
Owner hit `ERROR: 42710: policy "debate_votes_delete_own" for table
"debate_votes" already exists` re-pasting `backend/schema.sql` into the
Supabase SQL editor to publish the new comment-moderation RPCs. Real bug,
not user error: `debate_votes_delete_own` was the only policy in the whole
file created without a preceding `drop policy if exists` guard (its two
siblings right above it both had one). Added the missing guard; verified
idempotent by running the block twice in a row against a throwaway
Postgres 16. Swept the rest of the file programmatically (regex diff of
every `create policy` vs. every `drop policy if exists`) — confirmed this
was the only gap.

## Pulse comments: contact info + thank-you/feature emails + 100-comment critic tracker (2026-07-26)
Owner: "let them know when we feature them and also have their contact
info... a button next to each comment that says thank you so much for
taking the time to comment. When you get to 100 comments we consider you
for our critic position."
- `admin_list_comments` (backend/schema.sql) now also returns each
  commenter's real email (SECURITY DEFINER join to `auth.users`, same
  technique `admin_user_directory` already uses) and their running total
  comment count sitewide (grouped server-side by `user_id` — a real count,
  never estimated). A comment with no `user_id` (silent-anon, no real
  account) gets `email:null`; the client shows "no email on file" and hides
  the email-dependent buttons rather than guessing an address.
- New progress badge per row on `#/pulse`: "N/100 toward a critic seat"
  below 100, "N comments — critic-eligible" at or above.
- Two new mailto actions (same no-backend-send pattern as `pulseInvite`/
  `notifyContributor` — a pre-filled draft the owner reviews and sends):
  "🙏 Thank you" on every comment with an email on file (names the film,
  states the real 100-comment rule and their current count), and
  "📣 Notify feature" once a comment is marked featured.
- Validated the updated RPC against a throwaway Postgres 16; verified
  client-side in headless Chromium (mocked data covering has-email,
  no-email, and featured/over-100 cases) — correct badges, correct button
  visibility, zero console errors.

## Fix: "Reads posted" stat differed by device for the same signed-in account (2026-07-26)
Owner: "So depending on what computer i am using it changes the same user
signed in voting and comment information." Votes already had `loadMyVotes()`
reconciling `app.votes` against the backend by `user_id` on every sign-in/
session-restore, so a real account read the same vote stances everywhere.
Comments had no equivalent — the You page's "Reads posted" tile summed
`app.comments`, populated ONLY by `postComment()` on that specific device,
never by anything from the backend. Same account, two devices, two
different counts. Added `loadMyComments()` (mirrors `loadMyVotes()` exactly)
— pulls the real total from `comments?user_id=eq.<uid>`, stored in the new
`app.myCommentCount`; wired into the same three call sites `loadMyVotes()`
already uses. `renderYou()` now prefers the real total once it's back,
falling back to the local tally in the meantime so the stat doesn't blank
out mid-fetch. Verified in headless Chromium simulating a genuinely fresh
device (empty localStorage, only a real session) — correctly shows the
backend's real counts instead of zero, zero console errors.

## Fix: "make sure you're signed in as the owner" on a real, active owner session (2026-07-26)
Owner: "When i go to seat a critic under Hello@pivottraining.us it says
make sure i am signed in as the admin what the heck." Root cause: every
owner-gated admin write built its request headers from whatever
`access_token` happened to be cached in `authSession` at click time, with
no freshness check — votes already got this exact fix months ago
(`ensureFreshIdentity`, "the my vote didn't stick" bug) but it was never
extended to the 20+ owner-gated RPC call sites (seat/remove critic or
writer, feature a comment, publish/delete an article, publish curation,
moderate a comment, etc.). A session left open long enough for the JWT to
quietly expire — the normal case on a dashboard page like Pulse/Curate that
isn't reloaded often — still *looks* signed in client-side, but the stale
token fails `auth.jwt()->>'email'` server-side, so a real, genuinely signed-
in owner got a confusing "sign in as the owner" error for no visible
reason. New `ownerFetch(url,body)` (index.html) refreshes the session first
via the existing `ensureFreshIdentity()` (a no-op if already fresh) THEN
fires the RPC with a guaranteed-fresh JWT; converted every owner-gated RPC
call site to use it (`verify_critic`/`verify_writer`, `set_comment_featured`,
`admin_moderate_comment`, `admin_list_comments`, `admin_dashboard_stats`,
`admin_user_directory`, `admin_list_applications`,
`admin_set_application_status`, `list_title_suggestions`,
`set_title_suggestion_status`, `publish_curation`, `publish_article`,
`delete_article`). `list_film_submissions`/`set_submission_status`
deliberately left untouched — gated purely by the legacy passphrase, not a
JWT, so never exposed to this bug. Verified in headless Chromium: with a
simulated EXPIRED session, `pulseMakeCritic` now transparently refreshes
first and the RPC fires with the new token (confirmed via the actual
Authorization header); with an already-fresh session, no unnecessary
refresh happens. Full-route sweep signed in as owner across Pulse/Curate/
Inbox, zero console errors.

**Flagged, not fixed (separate concern, out of scope for this fix):**
`notify_user` (backend/schema.sql) has no owner/identity check at all —
any authenticated caller can write a notification into any other user's
feed by user_id. Low current risk (no UI exposes an arbitrary user_id to
send to), but worth tightening if that ever changes. Stop-and-confirm with
the owner before touching it, same risk tier as any other auth-adjacent
RPC change.

## The Drop: A Snowfall Saga added + home reordered (carousel up, Balcony down) (2026-07-29)
Owner: "'The Drop' debuts Sept 8th on FX...we need some artwork on the carousel
for this. Lets lower the Balcony article somewhere near the lower third, raise
the carousel to the top with prominence and replace something in the carousel
with this."
- **Verified first** (TMDB id 304842 + trades): *The Drop: A Snowfall Saga*,
  the Snowfall spinoff, FX with next-day Hulu streaming, first air
  **2026-09-08**, creator **Malcolm Spellman** (TMDB `created_by` is empty —
  sourced from trades), Gail Bean (Wanda) and Isaiah John (Leon) reprising
  their Snowfall roles, plus Asante Blackk, Peyton Alex Smith, Mykelti
  Williamson, Nicki Micheaux. Unambiguous "our show" — no closer-bar call
  needed. Poster `/7LElTi7Ys1JMDrxRgWpol1g47Vw.jpg` visually confirmed as the
  real FX/Hulu key art and pinned in `WS_POSTERS`. **TMDB has zero backdrops**
  for it, so the entry carries `nobd:true` (the flag added during the Thomas
  Crown work — makes `applyMedia()` skip backdrops permanently so a later
  hydrate can't quietly re-apply a bad one); the carousel slide rides its
  poster + gradient, same as `fightland`.
- Added to **FILMS** (`the-drop-a-snowfall-saga`, k/t null, votes:0,
  reviews:[]) and to **COMING_SOON** (`cs-304842`, `trailer:null` — no trailer
  has been posted on an official channel yet; add it when one lands).
- **Carousel**: replaced `72-hours-2026` in `FEATURED` (the most-spent moment
  — its `until` was `2026-09-07`, the day before The Drop premieres) with the
  date-gated pattern: `ey:'Premieres Sep 8 · FX, streams on Hulu'` →
  `eyLive:'New series · FX, streams on Hulu'` on the day, `until:'2026-10-20'`
  to auto-retire. 72 Hours stays in the catalog, only unwired from the
  carousel — same unwire-don't-delete convention as `man-of-war`/`lanterns`.
- **Home reorder** (markup only — every section paints by id, so DOM order is
  free): `#featuredBanner` moved to the very top of `.hero`, above `.hero-top`;
  `#leadStory` (the Balcony banner) moved down into the dessert tier, directly
  after `#mosaic` and before `#eventSpotlight`. New order: carousel → hero copy
  → scope → teach/vote bar → This Week at The Table → mosaic → **Balcony lead**
  → Events → Ten Years → Bracket → Card Check. Still consistent with the
  "stay review-focused" guardrail: the carousel is real current film/TV, and
  the voting + catalog still sit above every game/spotlight unit.
- **`upcomingSoonEntry()` widened to series.** It hard-excluded `type==='tv'`,
  so an unreleased SHOW would have shown the full "seen it" verdict vote — the
  exact thing that gate exists to prevent. Dropped the exclusion (the two
  theatrical-only callers, `ticketBlockHTML` and `renderTheaters`, already gate
  on `f.type` themselves). Audited the whole catalog first: The Drop is the
  only TV title with a future-dated COMING_SOON entry, so nothing else changes
  behavior. Its film page now correctly shows the "🗓 Coming Sep 8, 2026 — not
  out yet" badge + the hype vote + the premiere email hook, and zero verdict
  buttons; a released title (Bull Street) is untouched.
- **OG card** generated (`og/the-drop-a-snowfall-saga.jpg`, registered in
  `api/og-cards.json`) so a shared `/f/<id>` link previews as the branded
  1200×630 landscape card instead of a centre-cropped portrait poster. Fixed a
  real bug in `scripts/gen-og-card.cjs` while doing it: the eyebrow was
  hardcoded to "In theaters <date>" for any upcoming title, which read "IN
  THEATERS SEP 8, 2026" on a TV series. Now branches on `f.tv` → "Premieres".
- Ran `node scripts/build-films-json.cjs` (1264 → 1265). Verified in headless
  Chromium: home order correct, carousel carries the new slide with the right
  eyebrow, film page gating correct on both the unreleased series and a
  released control, zero horizontal overflow at 360/390/768/1280/1920, zero
  console errors.

## Fix: every trailer embed showed "Error 153 — Video player configuration error" (2026-07-30)
Owner screenshotted a home card mid-hover-preview showing YouTube's "Error 153
Video player configuration error" and said "they all say that" — i.e. every
trailer on the site, not one bad video id. Verified the video itself was fine
before touching anything: fetching the embed page server-side with a real
Referer returns `playableInEmbed:true` and `previewPlayabilityStatus.status:
"OK"`, so nothing was wrong with the ids, the channels, or `youtube-nocookie`.
Error 153 is YouTube's embed player refusing to initialize when it can't read
the embedding page's origin off the **referrer** — Safari's tracking
protection strips the referrer on cross-site subresources by default (the
owner is on Safari), so the player had nothing to verify us with. Nothing in
this repo set a referrer policy at all: no `<meta name="referrer">`, no
`referrerpolicy` on any iframe, and no CSP/headers in `vercel.json`, so the
site was riding whatever each browser defaulted to. Fix: declare it
explicitly in both places — a `<meta name="referrer"
content="strict-origin-when-cross-origin">` in `<head>`, plus
`referrerpolicy="strict-origin-when-cross-origin"` on all five embed sites
(the 4 markup iframes — Coming Soon detail, film-page trailer modal, home
marquee, Balcony video interview — and the JS-built hover-preview iframe in
`cardPreview()`, set via `setAttribute`). That sends the bare origin, no path
or query, which is all YouTube needs. Verified in headless Chromium: the meta
tag, the modal iframe, and the dynamically-created hover-preview iframe all
carry the policy, zero console errors. NOTE: this could not be reproduced
in-sandbox (no outbound route to youtube.com from headless Chromium here), so
it's diagnosed from the documented cause + the server-side playability check
rather than a live repro — if trailers still error after this deploy, the next
thing to rule out is a browser extension stripping referrers (the standard
second cause of 153).

## Ray Jr. — three films added with real trailers (2026-07-30)
Owner: "Can you find the movies for ray jr and put them in the appropriate
categories with trailers and descriptions." Ray Jr. is a Cleveland indie
filmmaker/actor (Legit Paper Entertainment). TMDB person 2616888 carries
exactly three credits, and a separate TMDB title search + web sweep surfaced
nothing else — his own site (legitpaperent.com) is now a squatted spam domain,
so TMDB is the only verifiable source. All three added, each with real
TMDB data (id/year/dir/cast/poster/synopsis) and a real trailer:
- **Rent Due** (2019, `rent-due-2019`) — Comedy, 1h 13m, dir. Mike Berry;
  Ray Jr. stars as Reggie and exec produces, with Jasmin Brown, Michael
  Colyar and Machine Gun Kelly (TMDB credits him as "mgk", person 1276759 —
  Cleveland connection checks out). Free on Tubi.
- **Ray Jr's Legit Paper** (2021, `ray-jrs-legit-paper-2021`) — Drama, 1h 8m,
  dir. Ray Jr. + Mike Berry, with Barton Fitzpatrick, Lamar Odom and Stalley.
  Free on Tubi, also rent.
- **Ray Jr's Just My Thoughts** (2022, `ray-jrs-just-my-thoughts-2022`) —
  Documentary, 1h 11m, dir. Ray Jr. Rent only (Apple TV/Google Play/YouTube).
Categories are the site's real ones, verified against the live predicates
rather than assumed: `isDoc()` picks up Just My Thoughts (genre Documentary +
tag), `isShort()` correctly rejects all three (68–73 min, over the 40-min
bar), and the two Tubi titles land in the "Free on Tubi" home shelf via
`where` (no TUBI_IDS entry needed — that list only *appends* Tubi to films
that don't already declare it). `where` values reflect the live TMDB US
watch-providers feed, not a guess.
- **Trailers**: all three verified via YouTube oEmbed as uploads on
  **LegitPaperEnt**, Ray Jr.'s own company channel — official source, not a
  re-uploader — and each confirmed `playableInEmbed:true` before wiring.
  Added to `WS_TRAILERS`.
- **`nobd:true` on all three**: TMDB has no backdrop for any of them, and
  "Rent Due" is exactly the kind of generic title the title+year hydrator can
  mismatch, so the flag blocks a wrong film's backdrop from ever landing.
  Posters pinned in `WS_POSTERS` for the same reason.
- `k`/`t` null, `votes:0`, `reviews:[]` — nothing fake. Catalog 1265 → 1268;
  ran `node scripts/build-films-json.cjs`. Verified in headless Chromium: all
  three resolve with correct genre/type/doc/short classification, posters and
  trailers wired, film pages render with the trailer button, a site search for
  "ray jr" returns all three (Rent Due via the cast match), zero console errors.
