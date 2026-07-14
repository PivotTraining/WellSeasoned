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
 'https://itswellseasoned.com/word/the-genre-was-always-ours.jpg', 'center',
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
 'https://itswellseasoned.com/word/ryan-coogler-bet-on-us.jpg', 'center',
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
 'https://itswellseasoned.com/word/the-case-for-black-romance.jpg', 'center',
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
 'https://itswellseasoned.com/word/the-cookout-canon.jpg', 'center',
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
 'https://itswellseasoned.com/word/streaming-keeps-losing-our-movies.jpg', 'center',
 'editorial', true,
 '2026-07-14 10:00:00+00', '2026-07-14 10:00:00+00'),

-- 6) FEATURE — Colman Domingo (cover story; newest) --------------------------
('colman-domingo-was-never-waiting',
 'They Didn''t Discover Colman Domingo. They Stalled Him.',
 $d$Five Black men have won Best Actor in the Academy's near-century. A thirty-eight-year silence sits in the middle of that record. Domingo's late ascent isn't the system working — it's a man outlasting a machine built to wait him out.$d$,
 $md$Let's start with a number, because the number is the whole argument.

In the roughly one hundred years the Academy has handed out its trophy for Best Actor, five Black men have won it. Five. Sidney Poitier in 1964. Then nothing — a silence you could raise a child in, send them to college, and bury a parent inside of — until Denzel Washington in 2002, thirty-eight years later. Jamie Foxx. Forest Whitaker. Will Smith. That's the list. That's the entire list.

And when the silence finally broke, look at what broke it. Denzel had already lost as Malcolm X. He'd lost as Rubin "Hurricane" Carter, a wrongly convicted man. The Academy handed him the lead statue for *Training Day* — for playing a crooked narcotics cop, a Black man as predator, the safest possible thing for that room to reward. The pattern is not subtle once you've seen it. Black menace gets the trophy. Black dignity gets a nomination and a limo home.

This is the industry that "discovered" Colman Domingo. Keep that number in your pocket. We'll need it.

## The thirty years they didn't watch

Domingo was born in West Philadelphia in 1969, which means that when the world decided he was a revelation, he was fifty-four years old and had been doing the work in plain sight since before some of the people writing his rediscovery were born.

The stage had him for decades — a Tony nomination for *The Scottsboro Boys* in 2011, the kind of credit the film industry files under *respectable* and *ignorable*. Television let a mass audience finally register the voice through *Fear the Walking Dead*. And then *Euphoria* handed him Ali, the recovering addict who does nothing across two seasons but sit in a diner booth and a church basement and *listen* to a teenage girl — and Domingo turned listening into an Emmy in 2022.

Here is the part the discovery story skips: none of this was latent. He wasn't unformed, waiting to be developed by some visionary. He was *finished* — a complete actor, fully in command — for the entire stretch that the business had no lead role for a middle-aged Black character man. The talent didn't ripen late. The industry's attention arrived late, and then had the nerve to call its own delay a fairy tale.

## What they still wouldn't give him

Then came the two years that are supposed to prove the machine works. They prove the opposite.

*Rustin*, 2023: Domingo plays Bayard Rustin, the gay architect of the 1963 March on Washington, a man the movement itself shoved to the margins for being inconvenient. The nomination made Domingo the first Afro-Latino ever nominated for Best Actor, and the first Black gay man nominated for playing a gay character. Sit with how late those firsts are arriving — 2024, not 1974. He lost.

*Sing Sing*, 2024: he plays Divine G, an incarcerated man performing his way toward his own humanity, made alongside the formerly incarcerated men of the real Rehabilitation Through the Arts program. And here Domingo did something the industry treats as heresy — he co-produced a film where *everyone got the same day rate*, the star and the youngest crew member paid identically, more than eighty artists holding real equity and cashing checks before a single ticket sold. A working rebuke to an industry whose entire architecture is built on paying the powerful more and everyone else in exposure. Back-to-back Best Actor nominations, a genuine rarity. He lost again.

Twice to the front of that room. Twice sent home. And I want to be precise about what that is, because the polite version — *what an honor just to be nominated* — is a sedative. A category that has produced five Black winners in a century, whose companion prize for Black women has produced exactly one, ever — Halle Berry, in 2002, still alone up there a quarter-century later — is not a meritocracy having an off decade. It is a preference, expressed consistently, over a very long time.

## The patience was a strategy

So drop the discovery story entirely. It flatters the wrong party.

The real story is a man who understood the arithmetic better than anyone and simply refused to be subtracted. The industry treats a Black actor's age as depreciation — use him young, discard him at forty, hand him the pastor and the ghost. Domingo inverted the math. Every year the room stayed turned away, he was compounding: the theater discipline, the supporting parts where he had to build a whole man before the scene cut, the flat refusal to play only the reduced version on offer. He didn't arrive late. He arrived with thirty years of interest the industry never thought it would have to pay.

The numbers say the machine was built to run out the clock on him. He ran it out on the machine instead — and even now, holding two nominations and no trophy, standing exactly where the record predicted the door would stay shut, he is the most alive thing in the room. That's not gratitude. That's a verdict. He was this good the whole time. The only thing that ever needed discovering was the industry's willingness to admit it.$md$,
 'The Founder', null,
 'https://itswellseasoned.com/word/colman-domingo-was-never-waiting.jpg', 'center',
 'article', true,
 '2026-07-14 15:00:00+00', '2026-07-14 15:00:00+00'),

-- 7) FEATURE — Michael $1B (cover story + home lead; newest) ------------------
('michael-billion-dollar-reckoning',
 'A Billion Dollars, and the Death of an Excuse',
 $d$“Michael” is the first biographical film in history to cross a billion dollars — and nearly two-thirds of it came from the overseas audiences Hollywood swore didn’t exist for Black stories. Consider the excuse officially dead.$d$,
 $md$For four minutes on a spring night in 1983, on a stage borrowed from the past, a twenty-four-year-old in a black sequined jacket and a single white glove did something the room did not know was possible.

Motown had gathered its royalty — the Temptations, the Four Tops, the surviving gods of Hitsville, U.S.A. — to toast its own first quarter-century, and Michael Jackson had agreed to appear on a single condition: that he be allowed one number that did not belong to Motown. He sang "Billie Jean." Then, on a downbeat, he glided backward across the stage as though the floor had been oiled and gravity had signed a waiver. The moonwalk. Tens of millions were watching at home. Fred Astaire, the story goes, telephoned the next morning to say he'd been robbed. The boy from Gary, Indiana had moved backward and gone straight through a ceiling no one had bothered to measure, because no one had imagined a body arriving at it.

Forty-three years later, on the second Sunday of July, he did it again — this time from beyond the grave, and this time the ceiling was made of money.

*Michael*, Antoine Fuqua's cradle-to-crown account of the man's life, crossed one billion dollars at the global box office. Sit with the sentence, because its history is easy to underfeel. Not the biggest music biopic — it passed *Bohemian Rhapsody* and its $911 million back in the spring, almost as an afterthought. Not merely the biggest film ever made about a real person — it stepped over *Oppenheimer*'s $975 million in late June without breaking stride. *Michael* is the first biographical film in the history of the medium to reach a billion dollars. There is no second. The category it now leads is a category of one.

It cost Lionsgate roughly $155 million and has returned more than six times that — the studio's first billion-dollar release in its half-century, and only the second film of all 2026 to touch the mark at all. The picture is carried by Jaafar Jackson, Michael's own nephew, in the first acting role of his life; Colman Domingo plays the father, Joe, and Nia Long the mother, Katherine. A film Black from the marquee to the margins made the roundest, least-arguable number the business knows how to keep.

> No film about a real human being had ever crossed a billion dollars. The one that finally did is about a Black man, carried by a Black man, directed by a Black man — and the industry is behaving as though the weather did it.

Here is where the fairy tale is meant to arrive, the part where a chastened Hollywood learns its lesson and the strings swell. Skip it. The instructive story is the one the number exposes, and it does not flatter anyone.

For as long as anyone has asked the studios why they spend less on Black films, the answer has come back the same, usually at a lower volume, as if it were an awkward medical fact: *they don't travel*. The overseas markets — Europe, the Gulf, East Asia, Latin America — supposedly will not turn out for a Black face above the title, and since foreign box office is where the modern blockbuster is made or buried, the rest of the logic assembles itself without anyone having to say it aloud. Smaller ceiling, smaller budget, smaller campaign, smaller faith.

*Michael* made $629.8 million overseas.

> Sixty-three cents of every dollar arrived from the international audience the studios spent three decades swearing did not exist.

That is not a dent in the theory. That is the theory laid out on the pavement with a sheet over it. Nearly two-thirds of a billion dollars, harvested precisely in the territories that were supposed to yawn.

And the receipts, it turns out, were never hidden — only unread. Year after year, UCLA's Hollywood Diversity Report has documented the same quiet arithmetic: films with a Black lead handed budgets roughly a quarter smaller than films without one, the gap widening past forty percent once two or more Black creatives sit in the chairs behind the camera. Those same films are shipped to something like thirty percent fewer international markets — and then, underfunded and under-shown by design, they are made to audition for their own existence, and they pass, returning more per dollar than the films handed the good seats. McKinsey, doing the cold math, once put the revenue the industry forfeits every year by refusing to fund and distribute Black stories at parity at north of ten billion dollars. Annually. Left in the street. On a hunch that the audience wasn't there — the same audience that just wired a single film ten figures.

None of this is a redemption arc, and it insults the evidence to narrate it as one. *Michael* did not reach a billion because the industry finally believed in it; a portion of its reshoot bill, by several accounts, was covered not by the studio but by the Jackson estate. The machine did not bet on this movie. It was dragged to a billion dollars behind a dead icon, a first-time lead and a director it has spent years under-resourcing — and it has arrived, breathless, at the podium to accept the award.

> The business did not bet on Michael. It was dragged to a billion dollars, and it has shown up at the podium to accept the trophy.

We have all seen this rerun, and we know its beats by heart. *Black Panther* was the "risky" comic-book movie that made $1.3 billion. *Sinners* was the original, un-franchised swing no one could quite bring themselves to underwrite. *Girls Trip*, *The Woman King*, *Us* — every few seasons a Black film clears a bar it was never funded to clear, and every few seasons the astonishment is performed again, fresh as if the last ten instances had been wiped from the tape. The astonishment is the tell. A person cannot be genuinely surprised by the same outcome for thirty years unless, somewhere behind the surprise, a decision has been made not to learn.

So let *Michael* be the one they cannot file under lightning. Not because a Black film made money — Black films have always made money, disproportionate money, money per dollar that any honest ledger shows on its first page. But because this one made *the* number, the sacred and supposedly unrepeatable billion that ends every argument in the room where budgets are set. There is no smaller print left to bury it in.

The audience has spoken, in the only tongue the studios claim to respect. A billion dollars is not a request for a seat at the table. It is an invoice. The industry can pay it — fund these films like the propositions they keep proving to be, send them everywhere, retire the astonished face for good — or it can go on leaving ten billion a year on the sidewalk and calling the people who point at it ungrateful.

The moonwalk, remember, was an illusion of physics: a man moving forward by giving every appearance of sliding back. For forty years the business has run the same trick in reverse — the look of forward motion on Black film, the fact of a slow glide backward, and a crowd too dazzled to check the direction of travel. In 1983 a boy in a white glove broke a ceiling nobody thought a person could reach. In 2026 a movie about him broke the one made of money. The only surface in the whole story that has not cracked is the one behind the executives' eyes. He keeps clearing the bar. They keep calling it a miracle. It was never a miracle. It was just never, for one moment, a mystery.$md$,
 'The Founder', null,
 'https://itswellseasoned.com/word/michael-billion-dollar-reckoning.jpg', 'center',
 'article', true,
 '2026-07-14 18:00:00+00', '2026-07-14 18:00:00+00')

on conflict (slug) do nothing;
