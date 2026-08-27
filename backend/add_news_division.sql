-- ============================================================
-- The Balcony — news division ("The Wire")
--
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- News is a different SHAPE from the rest of The Balcony. A feature is a
-- 7,000-character essay with a hero, pull quotes and a byline. A dispatch is
-- a headline, two or three sentences, a date and a source. So it reuses the
-- articles table (same publish RPC, same owner gate, same read policy) but
-- gets its own kind and its own compact presentation.
--
-- Adds:
--   kind = 'news'   -- widens the existing check constraint
--   source_url      -- where the news came from; a dispatch cites or it isn't news
-- ============================================================

alter table public.articles add column if not exists source_url text;

-- Widen the kind constraint to admit 'news'. Dropping and recreating is the
-- only way to alter a CHECK, and doing it by name keeps this re-runnable.
alter table public.articles drop constraint if exists articles_kind_check;
alter table public.articles add constraint articles_kind_check
  check (kind in ('article','interview','editorial','news'));

-- publish_article already passes the whole jsonb through, but it enumerates
-- columns explicitly, so source_url needs adding there too. Replacing the
-- function wholesale keeps it in one place.
create or replace function public.publish_article(p_secret text, p_article jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare expected text; s text;
begin
  select value into expected from public.app_secrets where key='curation_admin';
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'hello@pivottraining.us'
     and (expected is null or p_secret is distinct from expected) then raise exception 'unauthorized'; end if;
  s := coalesce(nullif(p_article->>'slug',''), lower(regexp_replace(coalesce(p_article->>'title',''),'[^a-zA-Z0-9]+','-','g')));
  insert into public.articles
    (slug,title,dek,body,author,film_slug,hero_image,hero_pos,kind,video_url,subject,source_url,published,created_at,updated_at)
  values (
    s,
    p_article->>'title',
    p_article->>'dek',
    p_article->>'body',
    coalesce(nullif(p_article->>'author',''),'The Founder'),
    nullif(p_article->>'film_slug',''),
    nullif(p_article->>'hero_image',''),
    coalesce(nullif(p_article->>'hero_pos',''),'center'),
    coalesce(nullif(p_article->>'kind',''),'article'),
    nullif(p_article->>'video_url',''),
    nullif(p_article->>'subject',''),
    nullif(p_article->>'source_url',''),
    coalesce((p_article->>'published')::boolean, true),
    coalesce((p_article->>'created_at')::timestamptz, now()),
    now()
  )
  on conflict (slug) do update set
    title=excluded.title, dek=excluded.dek, body=excluded.body, author=excluded.author,
    film_slug=excluded.film_slug, hero_image=excluded.hero_image, hero_pos=excluded.hero_pos,
    kind=excluded.kind, video_url=excluded.video_url, subject=excluded.subject,
    source_url=excluded.source_url, published=excluded.published, updated_at=now();
  return s;
end $$;
