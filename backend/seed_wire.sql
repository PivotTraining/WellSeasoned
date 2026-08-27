-- ============================================================
-- The Wire — opening dispatches
--
-- Run AFTER backend/add_news_division.sql. Idempotent (on conflict do nothing).
--
-- Every item below was verified during the work that produced it: the trailers
-- were confirmed on the studios' own YouTube channels via oEmbed, the air dates
-- come from TMDB's episode data, and the BET+ and box-office items are the
-- reporting behind two already-published Balcony pieces. Nothing here is
-- written from memory, and each carries the source it came from.
-- ============================================================

insert into public.articles
  (slug, title, dek, body, author, film_slug, kind, source_url, published, created_at, updated_at)
values

('wire-beauty-in-black-s3',
 'Beauty in Black returns for a third season',
 $d$Tyler Perry's Netflix drama is back August 27, picking up where the second season's cliffhanger left it.$d$,
 $b$Season three premieres August 27 on Netflix. The second season ended in March.$b$,
 'The Wire','beauty-in-black','news','https://www.themoviedb.org/tv/246246',
 true,'2026-08-24 09:00:00+00','2026-08-24 09:00:00+00'),

('wire-varnell-hill-premiere',
 'Tommy Davidson finally gets the desk: The Varnell Hill Show sets September 1',
 $d$The Martin spinoff lands on Paramount+ — not BET+, where it was announced — with Martin Lawrence executive producing.$d$,
 $b$Eight episodes, premiering September 1 on Paramount+, with two episodes out of the gate and one a week after. Kym Whitley, Wendy Raquel Robinson and Emmanuel Hudson co-star; Bentley Kyle Evans showruns and Martin Lawrence executive produces. The show was announced as a BET+ project before that service was folded into Paramount+.$b$,
 'The Wire','the-varnell-hill-show','news','https://deadline.com/2026/08/the-varnell-hill-show-premiere-date-paramount-plus-photos-1237018677/',
 true,'2026-08-20 10:00:00+00','2026-08-20 10:00:00+00'),

('wire-the-drop-trailer',
 'FX drops the first full trailer for The Drop: A Snowfall Saga',
 $d$Gail Bean and Isaiah John return as Wanda and Leon in the Snowfall spinoff, out September 8 on FX and Hulu.$d$,
 $b$The official trailer went up on FX's channel. The series follows Wanda Bell and Leon Simmons in 1990s Los Angeles as the fallout from the crack epidemic gives way to the rise of West Coast rap. Eight episodes, premiering September 8 on FX with next-day streaming on Hulu.$b$,
 'The Wire','the-drop-a-snowfall-saga','news','https://www.youtube.com/watch?v=3Yy_6OaAk3Q',
 true,'2026-08-17 14:00:00+00','2026-08-17 14:00:00+00'),

('wire-different-world-trailer',
 'Netflix releases the full A Different World trailer',
 $d$Hillman reopens September 24 — thirty-nine years to the day after the original premiered.$d$,
 $b$Maleah Joi Moon plays Deborah Wayne, daughter of Dwayne and Whitley. Kadeem Hardison, Jasmine Guy, Cree Summer and Darryl M. Bell all recur across the season. Felicia Pride showruns; Debbie Allen executive produces and directs three episodes. Brandy recorded a new version of the theme.$b$,
 'The Wire','a-different-world-2026','news','https://www.youtube.com/watch?v=W8jMEXwErvk',
 true,'2026-08-17 12:00:00+00','2026-08-17 12:00:00+00'),

('wire-lanterns-premiere',
 'Lanterns is on the air',
 $d$Aaron Pierre''s John Stewart arrived August 16 on HBO Max, opposite Kyle Chandler.$d$,
 $b$Eight episodes from Chris Mundy, Damon Lindelof and Tom King. Pierre reprises John Stewart in James Gunn's Man of Tomorrow, making this the first DC series built to carry a character straight into the films.$b$,
 'The Wire','lanterns','news','https://www.themoviedb.org/tv/95350',
 true,'2026-08-16 18:00:00+00','2026-08-16 18:00:00+00'),

('wire-bet-plus-closes',
 'BET+ is gone',
 $d$The phase-out finished this month. A thousand hours of programming now live in a tab inside Paramount+.$d$,
 $b$Announced in March by BET Networks president Louis Carr, begun in June, completed mid-August. Subscriptions did not transfer — former subscribers were offered a discount on a separate Paramount+ purchase at a higher monthly price. Paramount's own language says the library moves subject to rights restrictions and license expirations; no list of what did not make the crossing has been published.$b$,
 'The Wire',null,'news','https://variety.com/2026/tv/news/bet-plus-shutting-down-paramount-skydance-acquires-tyler-perry-stake-1236687482/',
 true,'2026-08-15 11:00:00+00','2026-08-15 11:00:00+00')

on conflict (slug) do nothing;
