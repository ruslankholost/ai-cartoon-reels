---
name: screenwriting
description: |
  Write, test and stage a 30-60 s cartoon or story reel (Instagram Reels, Shorts, TikTok): series engine, script, a test audience of subagents, and a shot list drawn in code with three.js in Remotion (AI image/video as the fallback). One skill built 2026-10-20 from everything Ross sent: the mcpmarket "screenwriter" and "threejs-builder" skills, the jtydhr88/screenwriting-skills plugin (sitcom, dialogue, scene craft, Lu Jun's short-play structure, series engine, character conflict), talsraviv/comedy-writers-room (writer + audience subagents) and CloudAI-X/threejs-skills (linked in section 8), all cut down to short vertical reels and to our numbers.
  USE WHEN: "write a script", "episode script", "storyboard", "shot list", "series engine", "check the jokes", a new episode of the cartoon series (this repo), any short dialogue sketch for a reel, or writing the three.js/Remotion code for its shots.
  WORKFLOW: idea → logline + engine check → 3 hooks → beat sheet → screenplay → test room (≤ 2 rounds) → shot list → self-check → Ross's "yes" → episode file → code.
---
# Screenwriting for 30-60 s reels

The techniques come from feature and TV craft books; what changes for a reel is that everything is ten times shorter, dialogue carries the comedy, and every shot has to move.

**In this repo, read first:** `docs/format.md` (the episode format since 2026-10-22: one funny sketch of 20-30 s that goes off the rails, the first 3 seconds, the open ending, the test room), `docs/bible.md` (cast, limits, line rules), `docs/production.md` ("What the numbers say"), `docs/reel-rules.md`. They win over this file when they disagree.

## 1. The numbers (our posted reels, Ross's Insights 2026-10-19)
| | "Friday Night Lead" (worked) | "Meet the Family" (flopped) |
|---|---|---|
| Length | 39 s | 67 s |
| Left in the first 3 s | ~15% | ~50% |
| Watched to the end | ~62% | ~3% |
| Opening | a problem on screen | a character introducing himself |
| Picture | drawn in code, 35 cuts, every shot moving on a sound | AI keyframes + clips, many stills |
| Words | 61, no narrator | the cat talks over everything |

So: a cut every 2 s or less (no shot over 2.4 s), few words, everything shown.

Ross on 2026-10-21, after "Tip?" v3 (36.5 s, 21 shots, three scenes of about 12 s each): "the reel has to be sharper, bolder and more dynamic - the scenes are too long". So aim for 20-30 s. Keep each scene to a few seconds, drop long silent beats, and make a repeated beat faster each time it comes back.

## 2. Structure: 起承转合 in 40 s (Lu Jun, "phoenix head, pig belly, leopard tail")
| Part | Time | Job |
|---|---|---|
| Head (hook) | 0-3 s | Something happens in the first 0.5 s on a sound (a burst, a crash, a face snapping to fury), the oddest picture by 1 s, a new picture every 0.4-1 s in one place, readable with the sound off, a question left open. Never a character standing there saying a line. Full rules and the 10-23 evidence: getphantom-toons docs/format.md, "The first 3 seconds". "Drama's enemy is explanation." |
| Setup | 3-8 s | Who wants what, in one exchange. The viewer thinks "that's me / that's my client". |
| Belly (build) | 8-33 s | About two thirds of the reel. Each beat follows from the last and makes it a little worse. 3-4 real turns, no more. |
| Turn (peak) | near the end | The biggest punch of the ladder: the most absurd one. |
| Tail (close) | last 3-5 s | Right after the peak, short: the twist lands on the word or picture that names it, a callback, a dry button. Card text over the last shot ~1 s. |

- 2-4 scenes, at most 3 locations (each set is code to build or a consistency risk).
- **Parallel cutting** works: the same moment for two characters, back and forth (FNL: Dave asleep vs Chad's phone answering).

**Openings that fit** (Lu Jun's list, filtered):
- *Conflict from frame one*: already mid-argument.
- *Cornered*: the character is stuck and has to act now.
- *Blow to the head*: a rule or a bill drops on him.
- *Reply that misses the point*: the customer asks one thing, Dave answers another.
- *Surprise arrival*: something new appears (Chad's new truck).
- *Set the trap*: the first shot plants the thing that will bite (the sign, the phone on mute).
- Banned: *self-introduction* (our flop).

**Endings that fit:**
- *Thunderclap*: the peak and the end are the same dry line.
- *Rebound*: a sharp turn right after the apparent win (Dave finally gets a call; it is for Chad).
- *Callback*: the opening image returns, heavier.
- *The line that lights it all*: one image or line reframes the episode. Visual, never a stated moral.
- Avoid: everyone happy, dragged out, a jump with no cause, the fix happening off screen, an outsider rescuing Dave, a summing-up moral, "Follow...", a black end card. An open ending only rarely: a cold viewer needs a closed beat.

## 3. Series engine (Rabkin, Landau, Goldberg; sw-series-engine-bible)
Before writing episodes, the series needs one sentence that every episode repeats: "Each episode, [who] runs into [a recognisable problem] and [the repeating pattern]." Tests:
- Could it give 99 different episodes?
- Is its core a process ("how does Dave keep losing to the thing he refuses to change?"), not an answer?
- Is the theme an arguable opposition (a small change vs staying the way you've always been), not one word?
- Same show every week, new each time. Every episode stands alone: viewers arrive cold from the feed, so no plot debt between episodes; a callback across episodes must be invisible to a new viewer.
- Per episode: can I name the stakes in one line? If not, cut it.

## 4. Characters that keep making stories (sw-character-conflict)
- **False belief stays, the situation moves.** Dave wants to keep working without changing; his belief "Marketing doesn't work." never changes (sitcom leads don't grow; the viewer's view of him does). Dave does not learn, or learns "sort of".
- **Strength = flaw.** His loyalty to the old way keeps the shop alive and costs him jobs.
- **The smallest first step.** A character always tries the smallest, most conservative move first; the world answers harder than he expected.
- **Every opponent has a knife**, one concrete weapon: Sarah's tiredness and veto, Chad being right and nice, Chuck's price. A fake or weak opponent kills the scene.
- **Pairs are bound and can't leave**: marriage, the street, the money. Each scene asks: which button does the other one press?
- **One-word temperament** per character (Dave stubborn, Sarah tired, Chad warm, Chuck stingy); the first line shows it.
- **Nice but flawed; any two of them make a joke; each has a valid point of view.** Chad's help should create Dave's problem, never solve it. The joke is on Dave's response, never on Chad's niceness.

## 5. Comedy mechanics (Smith, Landau, McKee, Walter; sw-sitcom-comedy, sw-scene-craft)
- **Tremendous trifle**: small stakes that are vital to the character (a nine-dollar spring fought like a mortgage).
- **Stupid strategy, obvious fix ignored**: the character picks the absurd plan and skips the sensible one.
- **Two-beat setup**: a plain, believable setup, one beat of development, then the punch. No hinting.
- **Punch word last, then stop.** Nothing after the key word.
- **One topper at most**, on the peak.
- **Give the audience the key**: show the cause before the character sees it; his reaction is the joke (we see the phone on mute, then Dave: "Nobody calls anymore.").
- **Every beat turns a value**: if a beat ends where it began, cut it.
- **Enter late, leave early**: cut on the button, before the conflict is settled.
- **Nobody agrees**: each line pushes against the last one.
- **Play it, don't say it**: an action instead of a stated feeling; the feeling goes onto an object.
- **One prop, planted, changed, paid off** (FNL: the phone in the dip; 9:04 PM on the card).
- **Concrete detail, not a concept**: "a 2009 van with a dead supplier's bumper sticker", not "an old truck". Environment tells character (Dave's dented door stuck half-open, Chad's sprinklers always on).
- **Escalate to off the rails** (Ross 2026-10-21, replaces the "one absurd peak" rule from 10-19): "our punchlines have to keep building, and the absurdity from start to finish should only grow" and "all the videos have to be exaggerated and just fucking off the rails".
  - Open on something everyone recognises. Each punch is bigger than the one before it, and each step follows from the last.
  - Exaggerate the pictures, and end off the rails.
  - What failed on 10-19 ("Be Chad") was a pile of unrelated gags, and on 10-21 a version that was absurd from the first line with no ladder.

## 6. Screenplay format
- **Slugline** per scene: `INT. DAVE'S LIVING ROOM - NIGHT`. Time of day sets the light.
- **Action lines: one short paragraph = one shot.** Present tense, active verbs, only what is visible.
  - Weak: `Dave is lazy and misses the call.`
  - Strong: `Dave snores on the couch, a beer can on his belly. On the coffee table his phone lights up: "Linda". Rings. Stops.`
- **Framing is written** in every shot: CLOSE / MEDIUM / WIDE / INSERT.
- **The look is repeated**: wardrobe and key props in the same words every shot (the bible's wording).

## 7. Dialogue: it carries the joke
- **Subtext over statement.** Ep. 2: "Dave's Plumbing, how fast can I come?" / "Never been a problem for you."
- One line = one thought, usually under 8 words. Vary the length. Each character has their own way of talking; cover the names and you should still know who speaks.
- The other character says the conclusion; nobody announces the lesson.
- End a scene on a nearly empty button (FNL: "Marketing doesn't work." / Barb: "Mm-hm.").
- A running line comes back once with a twist (FNL: "very busy" / "His phone isn't.").
- Swear on the spike only; write the real word, the bleep goes in at the edit.
- No "it's not X, it's Y", no hype words, no em dashes, no therapy talk, nothing that sounds translated.

## 8. Writing for the picture
**Default route: drawn in code** (three.js in Remotion, `src/flat.tsx` kit; Ross 10-20: "when you do this in code it looks much more dynamic"). Write for what code is good at:
- **Every shot moves on a sound**: a camera bump on the ring, a squash on the slam, a pop-in on the text ping, a whip to the reverse shot. Name the sound the motion hits. The motion verbs to pick from (from the threejs-builder "game patterns", 10-20):
  - *shake* on an impact (already in `src/shots.tsx`, frame-based);
  - *zoom pulse*, a 2-5% punch-in on the punch word;
  - *flash*, a white frame for 2-3 frames on a hit or a camera-phone snap;
  - *squash and stretch*: a squash before a jump or a slam, a squash then overshoot on landing;
  - *slow-mo*: a beat at half speed before the peak;
  - *parallax*: layers at different speeds when a truck drives past;
  - *pop-up text*: a number or word that pops over the object ("9 bucks", "1 star").
  In code these are written from `useCurrentFrame()`, never with `setTimeout`, `Math.random` or a clock (renders must come out the same every time).
- **Exact text works**: phone screens, listings ("Closed · Opens Mon 8 AM" vs "Open 24 hours"), clocks, prices, signs. Use them as jokes.
- **Objects never mutate**, hands never double, two people can share a shot, silent faces stay silent (mouths follow the voice).
- Limits: each new set and new prop is art to make or code to build, so reuse sets; acting is in poses, eyes and timing, not subtle faces.
- **Approved look for this series (10-20, "yes, that looks fucking great"): South Park puppets.** The image model (Qwen Image in WanGP, prompt only) paints the cast, sets and props; `scripts/sp-prep.py` / `nv3-prep.py` cut them into parts; `src/sp-puppet.tsx` moves them in three.js. Code draws only what it is best at: screens and UI, captions, mouths, lids, pupils, effects.
- When writing the shot code, read the matching skill of https://github.com/CloudAI-X/threejs-skills (MIT, read at commit 0e18186; this repo does not copy its files): `threejs-react-three-fiber` (scenes as JSX), `threejs-animation` (motion, glTF clips), `threejs-materials` (flat/unlit/toon), `threejs-geometry` (shapes, text), `threejs-postprocessing` (outlines, glow). Their examples run on a clock; in Remotion motion comes from `useCurrentFrame()`, never `useFrame`.

**The studio bar** (from the 703 Opus 5.5 code videos in github.com/yihui-dev/awesome-opus5-5-videos, studied 10-20; originals at `media.skillry.dev/opus-5-5/<slug>/original.mp4`). The best ones came from short prompts: the model art-directed its own code.
- **One design system per episode**: a palette, one caption font, one finishing pass over every layer (the same outline weight, a contact shadow under whatever sits on something, grain and a soft vignette only if they suit the look), so code-drawn parts match the painted art.
- **Props and hands are painted** with the cast (same model, same recipe); code draws only the screens on them. A prop drawn in plain code next to painted art looks cheap (v3's phone on the table).
- **Effects are simulated, then drawn in the show's style**: water as drops with gravity that stretch, splash and pool; steam and smoke as rising noise layers merged by a goo pass (blur, then alpha threshold) into flat organic clouds. Never static blobs or a few looping streaks.
- **One formal idea per scene**; transitions come from an object on screen (dive into the phone to enter a call; a flood or iris of about 0.3 s with a soft start). Hard cuts are kept for punchlines.
- **Motion in numbers, not adjectives**: springs with a small overshoot, anticipation before a hit, a squash on landing, poses on twos, a slow push on every hold (South Park staging otherwise stays still).
- **Sound by its measured peak on the hit frame**; a beat of silence before the peak; music changes with the scene and ducks under voices.
- **Crowds**: a few cut-outs tinted and flipped, back rows darker, a seeded phase for each, one person reacting in colour.
- **Gags that read in a scroll**: a running gag that keeps coming back, a counter that escalates (x1, x6, x19), onomatopoeia stamps, callbacks.
- **QA**: stills at the named moments with five yes/no questions each (pupils inside the whites? hand count right? text on text? blown whites? stray outlines?); a scan for one-frame pops; a separate reviewer judges, the builder never judges its own work; a machine check wherever a rule can be computed (`scripts/eyes-check.mts`).

**Fallback: AI image/video** (painted look). Follow production.md "What the AI picture can and cannot do": one simple action per shot, one speaker per talking shot, silent face close-ups start talking, liquids and throwing go wrong, small text garbles, every gag must survive as a still with a push-in.

## 9. Test room (talsraviv/comedy-writers-room, adapted)
Fresh eyes judge the script better than the context that wrote it. After the screenplay, before Ross:
1. **I write** the script in the main session (it holds the bible, the numbers and Ross's notes).
2. **Four test viewers react**, each a separate Agent call with `model: "haiku"`, sent in parallel. Each gets ONLY the screenplay text (lines + action paragraphs), none of our rules, and answers in a few sentences:
   - **The Owner**: "You've run a trade business (garage doors, plumbing) for 15 years. You scroll Reels at night after work. Is this your life? Which moment is the most 'that's me'? Would you send it to a buddy in the trade, and why or why not?"
   - **The Scroller**: "You flick through Reels fast. Here are the first 3 seconds: [first shot + first line]. Do you stay or swipe? Then read the rest: at which line would you have swiped?" Once a cut exists, all four also get its 0-2.8 s strip (`scripts/first3-strip.py`).
   - **The Skeptic**: "You've watched a lot of comedy and you hate hacky material. What actually surprised you? Which jokes have you heard before? Which lines sound written by a robot or a marketer?"
   - **The Overthinker**: "You take things literally. Where did you think 'wait, but why would he...'? Where does cause and effect break? Which picture couldn't really happen?"
   - Since x19 a fifth reader joins them: **the other side of the argument** (a parent for a sketch about parents, a remote worker for the laptop camper). All five prompts are in `prompts/test-room.md`.
3. **I sum it up**: what landed, what fell flat, where they would swipe, what confused them. Keep what worked, fix or cut what didn't, then run the room once more if needed.
4. **At most 2 rounds**, then the script goes to Ross with a short note on what changed and why. Ross's taste beats the test room. The room shows whether a beat reads and where viewers would leave; it does not choose the peak, and its ranking is no argument to Ross (10-23: it put "Then turn off the internet." first, Ross: "super stupid bullshit").

## 10. Output
One markdown file (in this repo: `docs/s1eNN-<slug>.md`):
1. **Logline**: who wants what and what it costs them. Which engine pattern it uses.
2. **3 hooks**, the chosen one marked.
3. **Beat sheet**: head / setup / belly / turn / tail with times.
4. **The screenplay**: scenes with sluglines, action paragraphs, dialogue.
5. **The shot list**, one table per scene:

| # | s | Frame | Picture (who wears what, props, light) | Motion, on which sound | Line / sound |
|---|---|---|---|---|---|
| 1 | 1.8 | WIDE | Linda in a snorkel mask on a flamingo float in her flooded basement, a lamp bobbing | camera bumps in on the drip | SFX drip. LINDA: "...Plumber near me." |

   On the AI route add `kind` (talk / hold / move / still) and `refs`, and under the table, for each risky shot, the objects with their count and what they must not turn into.
6. **Totals**: length, shots, words.
7. Mark my own additions until Ross approves them.

The episode file (`episodes/<ep>.jsonc`) is filled only after Ross says "yes" to the script.

## 11. Self-check before showing Ross
- [ ] The test room ran; the Owner recognises his life and the Scroller stays past 3 s.
- [ ] 35-50 s; the first 3 s pass docs/format.md "The first 3 seconds": something happens by 0.5 s, the oddest picture by 1 s, a new picture every 1 s or less, readable with the sound off, a question left open.
- [ ] It fits the engine sentence; the stakes fit in one line; it stands alone for a cold viewer.
- [ ] The first beat is real and recognisable; every punch is bigger than the one before and follows from it; the end is off the rails (Ross 10-21); cause and effect hold.
- [ ] Each opponent has a knife; nobody rescues Dave; Dave does not learn the lesson out loud.
- [ ] No shot over 2.4 s; no two similar angles in a row; ≤ 3 locations; every shot has a framing and a motion on a sound.
- [ ] Lines pass the bible's anti-AI rules; read aloud they sound like a tired, sharp, real person; punch word last.
- [ ] No spoken moral, no "Follow...", no black end card; nothing sells a product.
- [ ] Script first: no voices, pictures or code before Ross's "yes".
