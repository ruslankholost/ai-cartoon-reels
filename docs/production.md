# How we make an episode (season 1 on)

> **Note for this copy.** This is the first working order, written for the AI-clip route of season 1: keyframes with Qwen Image, talking clips with InfiniteTalk, moving clips with Wan. Steps 4 to 7, the clip tables, the SDXL notes and `scripts/shots.py` belong to that route and are kept as history. Since "Nobody Picks Up" v3 the episodes are built another way: Qwen paints the pictures, the `*-prep.py` scripts cut them into puppets, and three.js animates them inside Remotion. That route is in README.md, and docs/x20-one-coffee.md is a full worked example. Steps 0 to 3 (rules, script, voices, sound), the numbers and the voice gotchas still apply. In the commands below `$PY_AUDIO`, `$PY_IMG` and `$PY_WANGP` stand for the three Python interpreters named in the README.

The working order Ross set on 2026-10-19, and the decisions behind each step. Each step names who decides, what it makes and the command. Times are for this PC (RTX 3060 12 GB).

## 0. The rules that do not change
- Script first. No voices, frames or clips before Ross says "yes" to the script. `docs/bible.md` holds the cast and the limits; on 10-20 Ross cancelled the rest of it (the engine, Phantom as the narrator, the fixed outro), and the new approach is still open. The bar is a million-view reel:
  - familiar situations;
  - characters shown through details, not clichés;
  - a new shot every 2 s or less.
- The cast pictures were `cast/s1/<name>.png`, approved by Ross on 10-19 (not included in this copy). Do not redraw a character between episodes. A new character gets a candidate sheet first (`scripts/sd-gen.py` with the Family Guy LoRA, see below).
- Results go to Ross in chat with full paths. Nothing is posted without his "yes".

## What the numbers say (Ross's Insights, 2026-10-19)
| | "Friday Night Lead", 39 s | "Meet the Family", 67 s |
|---|---|---|
| Left in the first 3 s | about 15% | about half |
| Watched to the end | about 62% | about 3% |
| First second | a problem: a flooded basement, "plumber near me" | a cat introducing himself |

- **The first 3 s decide the reel.** The rules are in docs/format.md, "The first 3 seconds" (10-23).
- **One situation the viewer knows, ending on a punchline.** A family the viewer has never met does not hold anyone.
- **No black end card.** Most of those still watching left on "Follow..." and the black card. The card's text goes over the last shot (`"overlay": true` in `endcard`).
- **Length:** about 40–50 s until a longer one proves itself on our account.

**2026-10-20, Ross's Insights: "Nobody Picks Up" v3 vs "Friday Night Lead"** (read off his screenshots; views from the profile grid):
| | "Friday Night Lead", 39 s | "Nobody Picks Up" v3, 44 s |
|---|---|---|
| Views | 4,718 | 963 |
| Still watching at 5 s | about 80% | about 72% |
| at 8 s / 15 s | about 76% / 74% | about 65% / 55% |
| At the end | about 62% | about 47% |
| Non-followers / from the Reels tab | 99.7% / 94.2% | 98.8% / 86.7% |
- Both curves go flat after the first 15 s. The whole difference is made in the first 15 s.
- What NPU showed in those 15 s:
  - a problem without a joke in frame 1 (FNL: a woman in a snorkel mask on a flamingo float in her flooded basement);
  - two static phone screens (the search list, "calling...");
  - a second call that repeats the first one's pattern (the test room's Scroller flagged it).
- Next scripts: frame 1 is a funny picture as well as a problem, nothing static before 15 s, and no beat repeats the shape of the one before.
- Ross 10-20: the channel needs the widest audience for now ("relatable life stuff... not only things that happen to business owners but to people in general"). We are testing formats; once one works, we hammer it.

**2026-10-21, all four cartoons, Insights read on the web** (instagram.com/insights/media/<media id>/ in Ross's Chrome; "Tip?" and "Because" were under a day old):
| | Views | Reach | Likes | Comments | Saves | Shares | Profile actions | Follows |
|---|---|---|---|---|---|---|---|---|
| "Friday Night Lead", 10-19 | 5,125 | 2,809 | 94 | 1 | 2 | 0 | 0 | 0 |
| "Nobody Picks Up" v3, 10-20 | 2,715 | 1,198 | 30 | 0 | 2 | 0 | 0 | 0 |
| "Tip?" v3, 10-21 | 2,196 | 1,351 | 33 | 4 | 1 | 3 | 0 | 0 |
| "Because" v1, 10-21 | 1,588 | 1,114 | 33 | 0 | 1 | 0 | 0 | 0 |
- 99.4–99.8% of the views come from non-followers, so the reels are recommended to strangers. The account had 10 followers on 10-19 and still has 10.
- Likes are 1–2% of views; the reference account we measured against gets 8–12%. Instagram ranks reels by watch time, likes per reach and sends per reach, with sends weighing a bit more for non-followers (Mosseri, 2025-01-21). We have 3 shares in total, all on "Tip?", the topic people argue about, whose caption asked "Are you a tip-person?". Three shares is a weak signal.
- Nobody opened the profile, so the bio is not what stops follows yet.

**2026-10-23, all six cartoons, Insights read on the web** (accounts reached, shown as "Viewers"; the grid's views also count repeat views):
| | Seconds per shot | Voices | Reached | Likes | Shares |
|---|---|---|---|---|---|
| "Friday Night Lead", 10-19 | 1.1 (36 shots in 39.7 s) | as spoken | 2,869 | 94 | 0 |
| "Nobody Picks Up" v3, 10-20 | about 5 (8 shots in 44 s) | as spoken | 1,198 | 31 | 0 |
| "Tip?" v3, 10-21 | 1.7 | as spoken | 1,420 | 36 | 3 |
| "Because" v1, 10-21 | 1.3 | 1.14-1.5x | 1,154 | 37 | 0 |
| "Not a Sales Person" v2, 10-22 | 1.4 | 1.1-1.15x on 5 lines | 115 | 2 | 0 |
| "Cold Lips" v2, 10-23 (12 h old) | 1.5 | as spoken | 126 | 4 | 0 |
- Reach does not follow speed. "Because" cuts almost as often as FNL and has the fastest voices, yet reached 40% of FNL; NPU with 5 s shots reached as many as "Because". FNL was never sped up: it was fast through the cut (0.2 s between lines) and something moving on every sound.
- The last two were shown to about 120 accounts, 95-97% of them non-followers, and stopped there. Instagram still recommends them; the first viewers scrolled on (Ross saw heavy skipping on "Not a Sales Person").
- On TikTok "Cold Lips" got about 1,000 views and a South Park TV-show label (Ross): TikTok matches the puppet look to the show.
- Follows: 0 on all six. The account has 11 followers.

## 1. Script (Ross approves)
- Write it with the `screenwriting` skill (skills/screenwriting, 10-20: engine, structure, comedy mechanics, a test room of subagents, code-drawn shots by default). Write `docs/s1eNN-<slug>.md`: a shot table (# / s / Shot / Sound or line), the lines in English, the director's notes. Mark Claude's additions until Ross approves them.
- Optional: `node scripts/writers-room.mjs <episode>` runs a premise through beats, critics and rewrites on API credits (`docs/pitches/<episode>.md` in).
- Check before sending:
  - 40–50 s (see "What the numbers say");
  - the premise lands in the first 3 s;
  - one absurd peak at most;
  - no shot over 2.4 s.

## 2. Voices (about 30 min)
- `episodes/<episode>.jsonc` holds the lines, each with 3 directions (ElevenLabs v4 tags plus stability and style); see `episodes/meet-the-family.jsonc`.
- Season 1 voices (`scripts/voice-gen.mjs` CAST; the number is the position there):

  | Character | Voice | CAST number |
  |---|---|---|
  | Phantom | Brian | 1 |
  | Dave | Callum | 1 |
  | Sarah | Matilda | 1 |
  | Lisa | Jessica | 1 |
  | Chad | Eric | 3 |

  Ross's own cloned voices are never used for characters.
- `node scripts/voice-gen.mjs <episode> --char phantom,sarah,lisa,dave,chad --tries 3` writes three takes per line. The ElevenLabs plan allows 5 requests at once, so run at most one batch at a time.
- `scripts/voice-analyze.py <episode>/` measures every take (pitch, flatness, speed). `scripts/voice-check.py <files>` runs Whisper. Pick one take per line in `plan`; a bleeped word goes in `bleep` (0-based word index), a breath in front of a line is cut with `from` and a word that must stop short ("Twenty gr") ends at `to` (both are seconds in the raw take).
- Set `lead`, the `gaps` (the silent shots live in the gaps) and `tableSfx` (sounds placed off a line's start or end).
- `$PY_AUDIO -I scripts/voice-build.py <episode>` writes `public/<episode>/` line files, `timings.json` and `out/<episode>-table-read.mp3`. Send the table read to Ross.

## 3. Sound
- New effects: `node scripts/sfx-gen.mjs sfx <name> <seconds> "<prompt>"`, then copy them to `public/sfx-src/`. Add a line to PLAN in `scripts/sfx-build.py` (trim, fades, level) and run it.
- Music: `node scripts/sfx-gen.mjs music <name> <seconds> "<prompt>"` per scene. Assemble `public/music/<episode>-bed.mp3` so that its last hit lands on the end card; `scripts/mix.py` looks for that hit.
- In the pilot the night has no bed, only the sax.

## 4. Shot list
- The `shots` key of the episode file. Each shot needs:
  - **`at`**: placed on `timings.json` just before the word the cut belongs to;
  - **`kind`**: see step 6;
  - **`who`**: the speaker, for "talk";
  - **`refs`**: cast names;
  - **`key`**: the keyframe prompt;
  - **`move`**: the motion prompt.
- Name the wardrobe, props and set in every key prompt. Qwen keeps the face from the reference, not the clothes or the scene. Describe each character the same way every time (see the descriptions at the top of the pilot's shot builder).
- The episode file also sets `style`, `style0` (the keyframe style lines), `moveModel`, `refs`, `end`, `endcard` and `stamps`.

## 5. Keyframes (about 40 s each)
- Command: `$PY_WANGP scripts/shots.py <episode> keys [--only s01,s02] [--force]`.
- Model: Qwen Image 2.1 Turbo 7B, with the cast pictures as references.
- Look at every keyframe before clips: a contact sheet with `scripts/sheet.py`. Redo a bad one with a new `seed` in the shot and `--force --only`.

## 6. Clips: which model for which shot (decided 2026-10-19 by test)
| kind | What it is | Model | Time |
|---|---|---|---|
| talk | someone on screen says their line | InfiniteTalk, driven by that character's own line | ~3 min per 2.5 s |
| hold | a face that must not talk: every Phantom shot (his lines are thoughts), every silent reaction | InfiniteTalk driven by silence: the mouth stays shut, the eyes, ears and tail move | ~3 min |
| move | action with no face close up: inserts of hands, wides, driving trucks | Wan 2.2 Enhanced Lightning v2 i2v (`moveModel`), 4 steps | ~2 min |
| still | a simple insert | the keyframe with a push-in; `"fx": "buzz"` shakes it | none |

**The test behind the table** (ep. 2 shots that Wan 2.1 i2v had ruined):
- Wan 2.2 Enhanced Lightning fixed 1 of 4 (the sparks).
- It swapped one defect for another (the clock digits) and still made 2 silent mouths talk.
- Giving it the same picture as the first and the last frame did not stop the mouths.
- InfiniteTalk on silence passed the defect check on the shot Wan had failed three times, and on Phantom (a closed mouth, blinks, a tail flick).

So a face without a line is never a "move" shot.

Run: `scripts/shots.py <episode> clips --qa`. The check sends 8 frames of each clip to Claude and remakes a rejected clip with a new seed, up to 3 tries. A move or hold shot that still fails becomes its keyframe with a push-in at the edit step.

**The pilot's result** (34 clips took 55 generations with the retries, about 2.5 hours):

| kind | passed | failed after 3 tries |
|---|---|---|
| hold | 13 of 15 | s03 (Dave's mouth moved), s38 (no wink, eyes sideways) |
| talk | 7 of 8 | s12 (mouth too busy for one word; kept, it reads fine at phone size) |
| move | 5 of 11 | s02, s07, s09, s29, s33, s35: an unasked hand comes in, headlights switch on, a phone doubles, a paw turns into a hand |

So "move" is the weak kind. Plan the gags so they still work as a still with a push-in, and keep hands out of move shots where you can (a hand in the keyframe invites a second one).

**"Triple-A" (10-20)**: 16 clips, about an hour (00:20–01:22) with one restart after a low-memory stop.

| kind | passed | failed after 3 tries |
|---|---|---|
| talk | 5 of 5 | |
| hold | 6 of 7 | a17: the economist was to push up his glasses; the hand never came up, or the glasses vanished |
| move | 3 of 4 | a08: pages flipping "by themselves, no hands" still got a hand and a sleeve |

A hold is only a face: blinks, ears, tail. A hand action (glasses, a phone to the ear) does not happen in it, so write that shot as a move or keep the action in the keyframe.

## 7. Edit, mix, render
- `sh scripts/render-ep.sh <episode> <Composition>` runs:
  1. the edit list;
  2. the mix to -14 LUFS;
  3. a silent render of `src/<Composition>.tsx`;
  4. the mux.

  The output is `out/<episode>-v1.mp4`.
- A new episode needs a 6-line `src/<Name>.tsx` that calls `painted(timings, edit)` from `src/Painted.tsx`, and a `<Composition>` line in `src/Root.tsx`.
- Each character's caption colour is in `src/sched.ts` (SPEAKER).
- Checks:
  - `scripts/stt-lines.py <video>`: every line can be heard over the mix;
  - `scripts/mp4-frames.py` plus `scripts/sheet.py`: a contact sheet of the finished video;
  - `sh scripts/loud.sh <file>`: loudness.

## What the AI picture can and cannot do (moved from the bible, learned 2026-10-19)
Keyframes are made from the cast pictures by an image model; clips by a video model (InfiniteTalk for talking close-ups, Wan image-to-video for the rest). Write and board around these limits:
- One simple action per shot. Two actions in one 1-second shot ("rips the phone off and throws it") fail: one of them goes missing.
- A talking shot is a close-up or medium shot of ONE speaker; the lips are driven by their own voice. Never two people talking in one shot.
- In a shot with no line, the video model still opens and closes mouths. Prefer faces that are asleep, screaming, wincing or turned away, the back of a head, hands, objects, animals, or wide shots; a silent reaction close-up of a face is risky.
- A sleeping character tends to wake up mid-shot. Keep sleeping shots short (about 1 s).
- Hands: never ask for two hands doing different things near the face; say which hand does what. Never describe a hand "on the chest" while the other hand holds a phone.
- Liquids poured, flushing, things being thrown into something, and objects transforming go wrong often. Show the before and the after as two shots instead of the motion.
- Glowing phones turn into electric sparks. Say "the screen lights up", never "glows" or "vibrates".
- Big simple handwritten text works (a fridge note, "& SON" on the truck door, MARKETING on a book cover); small text, calendars, clocks and digits come out garbled or change. Put important words in the dialogue or in a stamp card instead.
- Crowds work as a static wide shot; they barely move.
- The image model keeps the face, not the clothes: every shot must say what each person wears and what each prop is (for example "a black smartphone strapped to his palm with silver duct tape").
- Light comes from a real source in the scene (window, lamp, phone screen, TV); characters look at something that is in the scene.

## Gotchas
- Wan i2v makes any face without a line talk, and new seeds rarely fix it. The keyframe drives the defect, so use "hold".
- Name the set in every keyframe prompt, close-ups too. Without a background Qwen draws the cast picture's white one: 5 of the pilot's 38 keyframes came out on white.
- A shot built on a split (the two yards, the two driveways) must say LEFT of the fence: ..., RIGHT of the fence: ..., and say whose side each thing is on. "Over the fence the neighbor's pool" put the pool in Sarah's yard until Ross caught it.
- A gag the model shies away from (Pearl licking her backside) needs the pose spelled out ("the classic cat grooming pose: one hind leg stretched straight up, head bent down, tongue out").
- Qwen garbles long text in pictures. Keep signs to 1–3 big words (& SON, BUDDY, UNKNOWN NUMBER); if a word comes out wrong, lay it over in the edit.
- SDXL prompts for new cast pictures (`scripts/sd-gen.py`):
  - CLIP stops at 77 tokens, so count them;
  - "lion mane" draws a lion, "fur ruff" draws an Elizabethan collar, and "fat" plus "mane" draws a bear;
  - a cat prompt with a white background and a white muzzle comes out white unless "orange fur" is said;
  - img2img from a photo (a job with `init` and `strength` 0.6–0.72) keeps the look but adds eyelashes and human hair unless they are in the negatives.
- ElevenLabs allows 5 requests at once; more come back 429.
- WanGP runs one job at a time on 12 GB. Never start two WanGP scripts together.
- The clips stage holds about 10 GB of RAM. When the PC runs low, Claude Code stops the background job (it happened on the pilot, 10-19). Close the browser first. Rerunning the same command resumes: a shot whose clip exists is skipped.
- "hold" keeps the mouth shut on Phantom, Sarah and Tyler, but Dave's s03 still moved his mouth on silence in 3 tries out of 3. A face that fails the check becomes a still with a push-in at the edit step, which is fine for a 1–2 s reaction.
- Wan 2.2 likes to add liquid, sparks and particles: "an empty can" sprayed foam twice. Say what must not happen ("nothing comes out of the can").
- A keyframe made earlier is a bad reference for an extra (the 1960s businessman): Qwen copied the picture whole and ignored the new scene. Describe an extra in the same words in every shot instead (a heavyset man with dark hair and a big chin, a grey suit, a grey fedora).
- Book covers and signs that are not in the script come out as garbled words. Say "a plain yellow cover with no words on it".
