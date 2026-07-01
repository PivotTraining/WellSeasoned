# Well Seasoned

A film & TV rating site built for Black culture. Every title carries two scores: **The Kitchen** (verified critics of the culture) and **The Table** (the community). Rated by the culture.

Live at [itswellseasoned.com](https://itswellseasoned.com).

## Stack

Single self-contained `index.html` (all HTML, CSS, and JS inline). No build step. Static hosting.

- Posters, trailers, metadata: TMDB (poster URLs baked in; an optional in-app key unlocks live fetch on a given browser).
- Shared votes: Supabase (Postgres + PostgREST). Device-keyed, no account gate. Schema in `../well-seasoned-backend/votes_migration.sql`.
- Hosting: Vercel (static).

## Deploy

This repo is deploy-ready. Connect it to Vercel (Add New → Project → import this repo) and it serves `index.html` at the root. `vercel.json` sets clean URLs.

## Config

The two backend values live in the CONFIG block near the top of `index.html`:

```
var SUPABASE_URL='https://iherwgeuxwpapjreoofq.supabase.co';
var SUPABASE_KEY='sb_publishable_...';   // publishable/anon key — safe to be public
```

Votes stay a harmless no-op until both are set. The publishable key is meant to be public; row-level security controls what anonymous users can do (read counts, cast/switch their own vote).

## Backend setup

Run [`backend/schema.sql`](backend/schema.sql) once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run). It's idempotent and safe to re-run. It creates:

- **`votes`** + **`vote_counts`** view — The Table score, aggregated across everyone in real time. One row per device per film (unique constraint), so a device can't stack votes.
- **`comments`** — real reads from The Table. (The old hardcoded seed comments were removed; an empty film now reads "be the first" instead of faking a crowd.)
- **`film_curation`** — the "move things around" table. The catalog content stays in `index.html`; this table holds only the editorial overrides the app merges on top (which shelf a title sits on, featured/hidden, classics, display order, and an optional Kitchen score).
- **`waitlist`** — membership sign-ups.
- RPCs: `publish_curation()` (admin-gated) and `report_comment()`.

### Curating live (moving titles around)

1. In `backend/schema.sql`, change the seeded admin passphrase (`app_secrets.curation_admin`) to something long and private before running it — or update it later in the SQL Editor.
2. On the site, open **Curate the shelves** (the curation modal), move titles between Our Films / All Films, feature, hide, or mark classics.
3. Click **Publish to backend** and enter the passphrase. Your choices go live for everyone; every visitor's app reads `film_curation` on load and merges it in. The passphrase is remembered in your browser so you only enter it once.

See [`backend/README.md`](backend/README.md) for security notes (vote integrity, per-film social previews, and the optional anonymous-auth hardening).
