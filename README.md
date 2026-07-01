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

Run `../well-seasoned-backend/votes_migration.sql` once in the Supabase SQL Editor to create the `votes` table and `vote_counts` view. After that, the Table score aggregates across everyone in real time.
