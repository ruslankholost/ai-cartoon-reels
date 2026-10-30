# Series bible (sent whole to every writers' room call, scripts/writers-room.mjs)

On 2026-10-20 Ross cancelled the old bible: the engine, Phantom as the narrator, the fixed outro, the reference-account shape, the places, the running gags and the idea bank. Only the characters, their archetypes and the limits stay. The old version is in the original repo's history (not in this copy). The new approach is not chosen yet. The AI picture limits moved to docs/production.md.

What we know (Ross's Insights, docs/production.md "What the numbers say"): "Friday Night Lead" worked (a dialogue sketch with no narrator, everything shown, 39 s); "Meet the Family" did not (a cat introducing his family, 67 s).

## The main character: Ross (since 2026-10-24)
Ross 10-24, writing x08 "Just Let Me Pay": "let's try to make some really funny 30-second episode where I'm just fuming hard about something", then "our bible is different now, it turns out I'm the main character", and "let's make a cartoon about me, about how everything companies do pisses me off, how I notice what annoys customers and I'm fuming over all of it, in short my days as the GetPhantom owner, made up for now, like a cartoon". The cast below stays as the world he runs into: clients, sellers, customers.

The series in one sentence: every episode Ross, who owns GetPhantom, runs into something a company does to its customers, sees exactly what drives them away, and it builds until he blows. His days are made up for the cartoon.

**Ross**: the marketer behind GetPhantom, drawn from his South Park avatar (a reference picture made from his photo; it is not in this copy): a reddish-brown undercut with shaved sides, light stubble, round black flesh tunnels in both earlobes, a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch. Voice: the ElevenLabs voice jack-tyler since x08 (`scripts/voice-gen.mjs`, CAST `ross`); his own cloned voice is never used for characters.
- The engine: he knows how buying and selling should go, so a broken checkout, a seller who doesn't call back or a pointless upsell sets him off harder than anyone. Every episode something everyday sets him off, and it builds until he blows.
- Until x17 the blow-up was his signature, growing within an episode: an eye twitch, a vein, then his ear tunnels popping out like champagne corks and steam whistling out of the holes like a kettle. Ross 10-27: "without me fuming super hard - that's old already", and he wants it "dynamic". From x18 on he does not blow up: no corks, no steam, no purple face, no scream. He stays polite and dry, answers with a look or a short line, and the speed comes from what happens around him and from the cuts.
- Until x17 the joke was the size of his reaction. He never explains what the other side should have done: the picture shows it.
- He owns GetPhantom. In the show he is not a tradesman and not a tattoo artist.
- His role can change from one episode to the next (Ross 10-24: "so that a wide audience gets it. Basically you can make me a sucker or an expert or anyone, the main thing is that it takes off"): the sucker, the expert, or both. A wide audience has to get the topic, and it stays about small business: Ross as the owner, or what owners live through (Ross 10-27 on x17, the plane seat swap: "I didn't get at all how this has anything to do with small business, hello?"). The biggest numbers alone do not pick a topic.

**The ghost** (dropped 2026-10-24): the small navy GetPhantom ghost that rode on Ross's shoulder in x08. Ross: "the ghost can come off my shoulder, it isn't needed at all and only gets in the way of understanding it". No episode after x08 has it; x08 keeps it, because its captcha gag rides on it.

## Limits (these stay whatever the approach)
- **A ladder from real to unhinged** (Ross 2026-10-21): "our punchlines have to keep building, and the absurdity from start to finish should only grow", "all the videos have to be exaggerated and just fucking off the rails".
  - The first beat is something that really happens.
  - Every next punch is bigger, follows from the one before, and the ending is off the rails.
  - What does not work: unrelated gags piled up (episode 2 "Be Chad", 10-19: "way too nuts"), and absurd from the first line (the "Because" v3 draft, 10-21: "sounds like absurdity").
- Nobody sells anything: no product, no software, no pitch.
- Adult tone: bleeped swearing (write the real word; the bleep is added in the edit), innuendo, toilet humour. No nudity, no sex shown, no real people (Ross himself is the exception since 10-24), no real brands, no slurs. (Since 10-21 the story part of an episode may name real companies and historical figures, with sourced facts and no logos: docs/format.md.)
- Our own characters only. Literal copies of named characters (the Griffins, Garfield, Snow White, any Disney cat), logos and show fonts stay out.
- Chad is an immigrant and Rose is Black. Their traits come from their work and character. No joke is ever about anyone's origin, accent or race. The butt of the joke is Dave, then Sarah, Chuck and Tyler.
- Minors: Tyler (15) asks for money "for smokes" but is never shown smoking or vaping; no children in adult jokes; no children hurt.
- Garage-door safety: no child or pet under a moving door; no do-it-yourself spring fix shown as a how-to; Dave can botch a job, but never with a spring injury.
- Dialogue in English.

## How lines must sound (Ross's anti-AI rules, from his writing prompt)
Write like a live, slightly tired, still sharp person. Allowed: roughness, a broken rhythm with an inner logic, natural swearing.
Banned:
- sterile, polished, literary phrasing; dramatic metaphors;
- "it's not X, it's Y" and other binary constructions;
- choppy one-word-sentence staccato for effect;
- noun-heavy lines with no verbs;
- ad-speak ("the perfect solution", "a happy life");
- therapy talk nobody asked for ("you have the right to be tired");
- jokes from a book of office jokes;
- anything that reads like a translation.
The test: a viewer must think a funny, tired, real person wrote it.

## Cast (voices are ElevenLabs, model eleven_v4)
Ross approved the cast and the names on 10-19; the cast pictures (cast/s1/) are not part of this copy.

**Phantom**: the family cat. A slim ginger tabby drawn the Family Guy way: a big round head, stripes on the forehead and the tail, green eyes always half-closed, a smug little smile, a smart, adult, unimpressed look. Wears a black t-shirt with the GetPhantom ghost on the chest. (Ross picked him over the fat Maine Coon on 10-19, which read as a bear.) Voice: Brian, low, dry, adult, always with a note of irony.
- Smarter than his owners and tired of their stupidity. Brash and direct; a philosopher whose lines sound wise and land as insults.
- Hungry, he is a shameless suck-up (rubs legs, "I love you people"); full, he is cheeky. The bowl in the shot tells which Phantom we get.
- He is in love with Pearl, the white cat next door, who lives far better than he does and does not know he exists. His longing across the fence mirrors Dave's envy of Chad.
- Calls Dave "my dad", Sarah "my mom" and Dave's father "Grandpa".

**Dave**: the owner, late 40s, garage-door repair, inherited from his father; the old rusty truck still says "& SON" on the door, the father's name worn off. Fat, bald on top with a little tuft of brown hair, brown hair on the sides, a thick brown mustache, a double chin, tired half-closed eyes. Hand-me-down clothes: an old olive bomber jacket with patches, a white t-shirt, ripped jeans, old sneakers. Voice: Callum.
- Old-school, a technophobe, works only by word of mouth, does not believe in marketing ("Marketing doesn't work."). The business came too easily and he never grew it.
- Beer in front of the TV every evening. Swears and complains. Hates change. Always right in his own eyes and sure he deserves more.
- Every few episodes he announces he is switching careers, then drops it.
- A believer: church every Sunday, where he hunts for clients.
- Agencies call him; he tells them to f*** off.
- Talks big, then folds.

**Sarah**: Dave's wife, 40s, a nurse. Light blue scrubs, dark circles under her eyes, a messy brown bun, a coffee mug always in her hand. Voice: Matilda (tired, sharp, a little nasal when she mocks).
- Comes home from a shift and then cleans and cooks. Exhausted, angry, a skeptic.
- Does not believe in her husband, and also refuses every change herself: she complains that nothing changes and kills every idea that could change it.
- Envies Lisa. Smiles at her, then her face drops the moment she turns away.
- Pumps Lisa for what Chad does; whatever Lisa says, Sarah answers "Mine can't do that." or "That won't work for him."
- Catchphrases: "Mine can't do that." "Everything's on me. Again."

**Tyler**: Dave and Sarah's son, 15. Messy brown hair, a grey hoodie, ripped jeans, a phone, contempt. Has no respect for either parent, demands his rights, pulls money out of them "for smokes" to look cool (never shown smoking). Speaks in eye-rolls.

**Chad**: the neighbour, Dave's competitor in the same trade. An immigrant who never had anything easy and built everything from zero. Good-looking and keeps it that way: gym, clean food, a sharp haircut; tanned, muscular, golden blond swept hair, a big white smile, a cream polo with a navy collar, khaki pants. A brand-new, spotless red pickup. Voice: Eric.
- Successful, confident, always keeps up with the times and tries the new thing.
- Never mean: he is genuinely nice to Dave, which makes it worse.
- Answers every call. Takes vacations.
- His backstory is shown, never told.

**Lisa**: Chad's wife, 30s, a fairy tale in a suburban garden. Long wavy brown hair, a yellow sundress, a bluebird on her finger. Plants flowers; birds and rabbits come to her and she talks to them. Lives for her own pleasure and backs her husband. Not worn out by work. Voice: Jessica (soft, bright).
- Wants to be friends with Sarah and does not notice the envy. Innocently says the right answer every time.

**Pearl**: Chad and Lisa's cat. A white Persian with long silky fur, big blue eyes with long lashes, a pink collar with a gold heart, lives on a pink velvet cushion in Chad's window. Never speaks. Barely notices Phantom.

**Oliver**: Chad and Lisa's son, about 15. Short blond hair, an elite-school uniform (navy blazer with a crest, striped tie, grey trousers), polite, loves his parents, hugs them in public.

**Chuck**: Dave's client. Balding with grey curls on the sides, sunglasses on his head, a white t-shirt, cargo shorts, white socks with sandals, phone always out. Hunts for the cheapest price. Always unhappy with the work and asks for a discount once the job is done. Calls for days afterwards to complain that something is off. Leaves reviews. Threatens to tell all his friends what a bad tradesman Dave is; when he wants a discount, promises the opposite: "All my buddies will only call you."

**Rose**: Chad's client, a property developer, a Black woman. A white hard hat, a navy work vest over a light blue shirt, a short black bob, a tablet in her hand. Direct, busy, pays on time. A regular buyer of garage doors for her builds; she has the money. Says what she wants in one sentence and expects an answer the same day. The dream client Dave never gets.

## Mirrors (the archetypes in pairs)
Everything in Dave's life has a better copy next door:
| Dave's side | Chad's side |
|---|---|
| Dave, inherited the business and let it rot | Chad, built his from zero |
| Sarah, worn out and envious | Lisa, happy and kind |
| Tyler, takes money and gives contempt | Oliver, polite and loving |
| Chuck, haggles and complains | Rose, pays and comes back |
| a rusty pickup with "& SON" faded on the door | a new red pickup |
| a brown patchy lawn, peeling paint, his own garage door dented and stuck half-open | a perfect lawn, sprinklers always on, flowers, a pool with loungers, a big shiny grill |
| no vacation | regular vacations |
| Phantom, in love | Pearl, who does not know he exists |
