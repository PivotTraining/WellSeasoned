-- ============================================================
-- The Word — five launch pieces (2026-07-14)
-- Real editorial content, real films, real facts, real TMDB film art.
-- Bylined "The Founder." Run this once in the Supabase SQL editor to
-- publish all five. Idempotent: re-running does nothing (on conflict do
-- nothing). Requires the magazine migration (kind/video_url/subject) to be
-- applied first — see backend/schema.sql.
-- Ordering: created_at is staggered so "The Genre Was Always Ours" is the
-- newest, i.e. the cover story on #/word. Two editorials + two features fall
-- into the sections below it.
-- ============================================================

insert into public.articles
  (slug, title, dek, body, author, film_slug, hero_image, hero_pos, kind, published, created_at, updated_at)
values

-- 1) COVER STORY — editorial ------------------------------------------------
('the-genre-was-always-ours',
 'The Genre Was Always Ours',
 $d$Black horror didn't arrive with "Get Out." It came home.$d$,
 $md$Every few years somebody announces that Black horror has *arrived*, like we wandered into the genre by accident and got lucky. *Get Out* clears a quarter of a billion dollars on a $4.5 million budget, Jordan Peele becomes the first Black writer to win the Academy Award for Original Screenplay, and the trade papers suddenly discover that Black folks can be scared — and scary — on camera.

But the door Peele walked through in 2017 was one we built ourselves, a long time ago.

## We were never guests here

Go back to 1973 and Bill Gunn's *Ganja & Hess* — a vampire film that is really about addiction, faith, and assimilation, so strange and so Black that the money men recut it and buried it. It played Cannes anyway. A year before that, *Blacula* took the oldest monster in the European canon and gave him a name, a love story, and a grievance rooted in the slave trade. By 1992, *Candyman* had turned a Cabrini-Green housing project into a haunted house and made the ghost a lynching victim — the horror wasn't the hook, it was the history the hook was hiding.

These weren't accidents. They were arguments. The genre has always been the safest place to say the loudest thing, because you can bury a truth inside a monster and slip it past the people it indicts.

## The metaphor is the point

What Peele understood — and what *Us* and *Nope* kept insisting — is that horror lets you literalize a feeling you've spent your whole life being told you imagined. The sunken place is not a twist. It is Tuesday.

That lineage runs straight into *Sinners*. Ryan Coogler set his vampires down in the 1932 Mississippi Delta on purpose. The thing that comes for that juke joint doesn't just want blood — it wants the music, the memory, the culture, and it will wear a friendly face to get in the door. If you have ever watched something you loved get discovered, extracted, and sold back to you, you already know exactly what that monster is.

## Stop calling it a moment

A moment ends. This doesn't. From Gunn to Kasi Lemmons's *Eve's Bayou* to DaCosta's *Candyman* to Coogler, there is one unbroken conversation about who gets to be afraid, who gets to survive the third act, and what our stories are worth when someone else holds the camera.

The genre was always ours. We're just finally the ones getting paid to admit it.$md$,
 'The Founder', 'sinners',
 'https://image.tmdb.org/t/p/w1280/nAxGnGHOsfzufThz20zgmRwKur3.jpg', 'center',
 'editorial', true,
 '2026-07-14 14:00:00+00', '2026-07-14 14:00:00+00'),

-- 2) FEATURE — Coogler --------------------------------------------------------
('ryan-coogler-bet-on-us',
 'Ryan Coogler Bet On Us Every Time',
 $d$From a train platform in Oakland to a juke joint in the Delta, one director kept making the same wager.$d$,
 $md$In 2013 a 27-year-old made a movie about a young man killed by a transit cop on a train platform. No superhero, no franchise, no safety net — just Oscar Grant, the last day of his life, and Michael B. Jordan playing him like someone we already loved.

*Fruitvale Station* won the Grand Jury Prize and the Audience Award at Sundance that year. Ryan Coogler has been collecting on that first bet ever since.

## The through-line is trust

Look at the arc. *Fruitvale Station* (2013). *Creed* (2015), which reached into a tired franchise and found a whole new heart in Adonis. *Black Panther* (2018), the first superhero film ever nominated for Best Picture, a movie that won Ruth E. Carter and Hannah Beachler their Oscars — the first Black artists to win in Costume Design and Production Design — and made Wakanda feel less like a set than a promise.

Then, after all that leverage, Coogler used it to go back to the beginning: an original film, no I.P., no cape. *Sinners* (2025) is a period vampire story set in the Jim Crow South, and it is the most personal swing he's taken since that train platform.

## He kept casting the same faith

Michael B. Jordan has been in the room for almost all of it — Grant, Creed, Killmonger, and now the twin brothers Smoke and Stack. That's not nostalgia. That's a director who found a collaborator he believed in and refused to trade him for a bigger name every time the budget grew.

And the more clout Coogler earned, the more he spent it on ownership instead of comfort. He fought to make *Sinners* on his terms, negotiating to hold onto the film itself rather than hand it over and walk away — a rare thing for a Black filmmaker inside a major studio, and a quiet argument that the people who make the culture should get to keep a piece of it.

## Why it matters here

We talk a lot on this site about scores earned and never bought. Coogler's whole career is that idea in motion. He never took the shortcut, never let a studio flatten the specificity out of a story to widen the audience — and the audience came anyway, in record numbers, precisely *because* he trusted them to keep up.

Every film was a bet that we would show up for something made with our full complexity intact. We keep proving him right.$md$,
 'The Founder', null,
 'https://image.tmdb.org/t/p/w1280/u0nAnvRdzAGgDYLyfIbAUBDOcpb.jpg', 'center',
 'article', true,
 '2026-07-14 13:00:00+00', '2026-07-14 13:00:00+00'),

-- 3) EDITORIAL — Black romance ------------------------------------------------
('the-case-for-black-romance',
 'The Case for Black Romance',
 $d$"Love Jones" turns the ordinary business of falling for someone into the whole point. Hollywood still won't fund enough of it.$d$,
 $md$There is a scene in *Love Jones* where Darius reads a poem at an open mic and calls it "a little something for the sistas." It is soft and it is grown and it asks for nothing but attention. In 1997 that was practically radical: a Black film where the stakes were simply whether two people would stop being afraid of each other.

Almost thirty years later, we still don't get enough of it.

## Tenderness as a genre

*Love Jones* (Theodore Witcher's only feature — he never got the shot at a second) gave us Chicago, jazz, poetry, and grown people talking to each other like the conversation was the romance. Three years later Gina Prince-Bythewood made her directorial debut with *Love & Basketball* and split a whole life into quarters, letting Monica and Quincy love each other across two decades without ever once making it cute.

These films understood something the market keeps forgetting: for Black audiences, getting to see ordinary tenderness on screen — no trauma, no funeral, no lesson — is its own kind of luxury.

## The market keeps underwriting the wrong thing

Every year studios greenlight another Black film built around pain, because pain reads as *important* and importance reads as *awards*. Meanwhile the romances — the Sunday-afternoon, watch-it-nine-times, know-every-line romances — get made on shoestrings or not at all.

When one does slip through, it lands. *The Photograph* (2020) and Eugene Ashe's *Sylvie's Love* (2020) both proved there is a hungry audience for Black love shot like it's beautiful, because it is. But two films in a year is a trickle, not a canon.

## Joy is not a lesser subject

Here's the argument, plainly: a people who are constantly asked to justify their suffering on screen deserve — and will pay for — the right to watch themselves simply *want* each other. Black romance is not a break from serious cinema. It is the serious cinema of the interior life, the part of us that exists when no one is oppressing anyone.

We should fund it like we mean it. Until the industry does, we'll keep pulling these films up ourselves, one rewatch at a time.$md$,
 'The Founder', null,
 'https://image.tmdb.org/t/p/w1280/e9ZX5bzErTNVACJ4bBRlCmmsPMJ.jpg', 'center',
 'editorial', true,
 '2026-07-14 12:00:00+00', '2026-07-14 12:00:00+00'),

-- 4) FEATURE — the cookout canon ---------------------------------------------
('the-cookout-canon',
 'In Defense of the Cookout Canon',
 $d$The films that play on a loop at every family gathering aren't lesser art. They're the ones that lasted.$d$,
 $md$Nobody at the cookout is putting on a Best Picture winner. Somebody's uncle has the remote, and by the second plate the TV is playing *Friday* — again — and every person in the room can say the lines before the actors do.

That's not a lower shelf of cinema. That's the shelf that survived.

## The list writes itself

You know it without being told. *Friday* (1995). *Love & Basketball* (2000). *The Best Man* (1999). *Love Jones* (1997). *Poetic Justice* (1993). *Brown Sugar* (2002). *Coming to America* (1988), which is basically a national holiday at this point. These are the films that don't get the retrospectives and the criterion boxes, and they are, by a wide margin, the most *watched* films we have.

Rewatchability is a kind of greatness we don't take seriously enough. Anybody can hold your attention once. These hold it for thirty years.

## Comfort is a craft

It is genuinely hard to make something people want to live inside. The cookout canon runs on a specific chemistry — a cast that feels like people you actually know, dialogue with real rhythm, a world where Black life is just *life* and not a case study. *The Best Man* got a whole ensemble to feel like your slightly-too-messy friend group. *Brown Sugar* made loving hip-hop and loving a person the same sentence.

None of that is accidental, and none of it is easy. We just tend to call it "fun" and move on, as if fun were the opposite of accomplished.

## Why we shelve them with respect

On Well Seasoned these titles sit next to the heavy hitters on purpose. A canon that only honors the films that made you cry is a canon that's ashamed of joy. The movies that raised us, that play at every graduation and repast and Sunday, earned their spot the hard way — one living room at a time.

Pull up a chair. Somebody's about to quote the whole first act.$md$,
 'The Founder', null,
 'https://image.tmdb.org/t/p/w1280/jF71CkY9bHyWvZTNQUThyzecXYb.jpg', 'center',
 'article', true,
 '2026-07-14 11:00:00+00', '2026-07-14 11:00:00+00'),

-- 5) EDITORIAL — streaming / preservation ------------------------------------
('streaming-keeps-losing-our-movies',
 'Streaming Keeps Losing Our Movies',
 $d$Titles vanish from the services with no warning. Our films disappear first — which is exactly why a real catalog matters.$d$,
 $md$Try to stream *Daughters of the Dust* tonight. Some months you can; some months it's gone, shuffled off a service in a licensing reshuffle nobody announced. For a film this important, that should be a scandal. Mostly it's just Tuesday.

## What we're at risk of losing

Julie Dash's *Daughters of the Dust* (1991) was the first feature by a Black American woman to get a general theatrical release in this country. It is a landmark — visually, spiritually, historically — and when Beyoncé made *Lemonade* twenty-five years later, its fingerprints were all over it. It took a full restoration by a boutique distributor in 2016 to pull the film back from the edge of simply being unavailable.

That's the pattern. The films that get preserved, remastered, and kept one click away are rarely ours first. Kasi Lemmons's *Eve's Bayou*, one of the highest-grossing independent films of its year, spent long stretches being weirdly hard to find. Whole runs of Black independent cinema live on out-of-print discs and grainy uploads because no algorithm decided they were worth the shelf space.

## Streaming was never a library

We were sold a fantasy: everything, forever, for a monthly fee. What we actually got is a rental counter that rearranges itself in the dark. A title is there until a contract lapses, and then it isn't, and no one who loved it gets a vote. Films with big franchises behind them get protected. Films that represent a specific community's memory get treated as inventory.

For a people whose history has been erased, rewritten, and locked away before, "you can watch it until we quietly pull it" is not good enough.

## Why we keep the lights on

This is the unglamorous reason a curated catalog matters. Not to compete with anybody's queue, but to make sure the films are *findable* — named, dated, credited, pointed to wherever they actually live this week. A place that remembers a movie exists even when the platforms forget.

Keeping track of our own work is not nostalgia. It's maintenance. Somebody has to write down where the culture is kept, or one day we'll go looking for it and the shelf will be empty.$md$,
 'The Founder', null,
 'https://image.tmdb.org/t/p/w1280/l8ofJ0ErKaL5F3JKmYVn4aa4i1w.jpg', 'center',
 'editorial', true,
 '2026-07-14 10:00:00+00', '2026-07-14 10:00:00+00')

on conflict (slug) do nothing;
