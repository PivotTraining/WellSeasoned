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
