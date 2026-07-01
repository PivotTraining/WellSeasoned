# Well Seasoned — backend

One file: [`schema.sql`](schema.sql). Paste it into the Supabase SQL Editor for your project and run it. Idempotent, safe to re-run.

The frontend (`../index.html`) already talks to this schema — the `SUPABASE_URL` / `SUPABASE_KEY` in the CONFIG block point at the project, and the app degrades gracefully to the built-in catalog if the tables don't exist yet.

## Tables & RPCs

| Object | Purpose | Who can write |
|---|---|---|
| `votes` | one row per (film, device), for/against | anon insert/update own device row |
| `vote_counts` (view) | live tally → The Table score | read-only |
| `comments` | The Table reads | anon insert; flag via `report_comment()` |
| `film_curation` | shelf/feature/hide/classic/order/Kitchen score overrides | **admin only, via `publish_curation()`** |
| `waitlist` | membership sign-ups | anon insert; not publicly readable |
| `app_secrets` | holds the curation admin passphrase | invisible to anon; definer functions only |

## Security notes (honest limits)

- **Vote integrity.** Votes are keyed on a client-generated `device_id`, so the unique constraint stops a *device* from stacking votes, but a determined actor can rotate device IDs or hit the REST endpoint directly. For a trust-first product this matters. The real fix is at the bottom of `schema.sql`: enable **Authentication → Anonymous sign-ins**, then swap the vote policies to key on `auth.uid()`. Until then, watch `votes` for abuse (a spike of same-second inserts from one range) and consider a rate limit (Supabase edge function or `pg_cron` sweep).
- **The publishable key is public by design.** RLS is the actual gate. The policies in `schema.sql` give anon exactly: read counts/curation/comments, insert a vote/comment/waitlist row. Everything sensitive (curation writes, the admin secret) is behind `SECURITY DEFINER` functions.
- **Curation passphrase** travels over HTTPS in the `publish_curation` RPC call. It's a lightweight admin gate, not full auth — fine for a single curator. Change it from the default before going live, and rotate it if it leaks (update `app_secrets.curation_admin`).
- **Per-film social previews.** The app sets the page title, canonical URL, and OG/Twitter tags per film client-side, which fixes browser tabs, the back button, and in-app share sheets. Crawlers and link-unfurlers read the *static* HTML, so a shared film link still unfurls with the site-level card. If per-film unfurls matter, add a small prerender step (a Vercel serverless/edge function that injects per-film `<meta>` for bot user-agents, or generate static per-film pages). Not required to launch.
