# Build agent

The build agent turns the episode doc into the Remotion composition, the sound, the mix, the check scripts and the render. It works in two phases. Phase 1 runs while the art is being painted and uses stand-ins for the pictures. Phase 2 runs when the art folder is done. The coordinator is your main Claude Code session: it holds the script, the rules and the owner's notes, writes the shot list, starts the agent (we use `model: "sonnet"`), looks at what comes back and sends fixes.

In the prompts, `<ep>` is the lowercase episode id (x21) and `<EP>` the composition id (X21). `<last-ep>` and `<LAST-EP>` are the same two for the episode built before it. `$PY_AUDIO`, `$PY_IMG` and `$PY_WANGP` are the three Python interpreters from the README.

## What the coordinator has ready

The episode doc docs/<ep>-<slug>.md holds, in this order:

- the final screenplay (after the test room);
- the shot list on the voices' clock: a table with the shot number, start and end second, the framing (INSERT, CLOSE, MEDIUM, WIDE), the picture, the hits (every sound with its second) and the line. docs/x20-one-coffee.md has a full one;
- the build spec: where the voices are, the new sounds to generate, what the code draws, and the art list.

The voices are built: `public/<ep>/` with the line files and `timings.json`, and `out/<ep>-table-read.mp3` (see the README, step 2).

## Phase 1: everything that does not need the new art

Paste this into the Agent call.

```
You are the build agent for episode <ep> "<Title>", phase 1. The voices are built. The art is being painted by someone else and is not in yet. Build everything that does not need it, with stand-ins where a picture will go, so that phase 2 only has to cut and place pictures.

Read first:
- docs/<ep>-<slug>.md: the screenplay, the shot list and the build spec.
- The last episode as your model: src/<LAST-EP>.tsx, src/<last-ep>-*.ts(x), scripts/<last-ep>-*, scripts/render-<last-ep>.sh, and the "Build notes" of docs/<last-ep>-<slug>.md.
- docs/format.md.

Build:
1. The composition. src/<EP>.tsx in the shape of the last episode's (1080 x 1920, 30 fps, one scene per shot chosen by the frame, captions and the label as DOM over the canvas, props noCaps, cover and animatic) and a <Composition id="<EP>" ...> line in src/Root.tsx, registered the way the last episode is. The other files follow the last episode too: <ep>-sched.ts, <ep>-scenes.tsx (and -scenes-a.tsx), <ep>-draw.tsx, <ep>-props.tsx, <ep>-ui.tsx, <ep>-act.ts, <ep>-shared.tsx, <ep>-stage.tsx and <ep>-views.ts (the framing and plate view of each shot, which the check reads). Mouths follow the voice: run $PY_AUDIO -I scripts/amp-build.py <ep>, which writes src/amp-<ep>.json (mouth openness per frame from the voice loudness).
2. The timeline on the voices' clock. public/<ep>/timings.json is the clock: take n sits at tableRead.cues[n].at. Build src/<ep>-sched.ts on it, like the last episode's. Every shot hangs on a word. A spec time that falls on half a frame goes up to the next frame. A cut moves onto a word only when the spec says so, and then the word is said whole over one shot and captioned once. If the reel loops, the last shot runs into the first.
3. The captions. One per voice line, split at cuts. They stay inside y 250 to 1500 (out of the bottom 400 px, which Instagram covers) and left of the right-hand buttons, they never sit over a face, and they never run over a cut. A cut that falls within 0.06 s before the end of a word, or 0.08 s after the start of the next one, counts as a cut between the two words.
4. The label <POV label>. It slams on big at 0.00 (white, heavy, black outline, y about 300 to 560) and shrinks at 1.15 s into a small pill at the top (y about 250 to 320), where it stays to the end. The reel's first frame is the cover: the episode's oddest picture with the label big on it, so the opening shot starts on that picture. The cover shot is <cover shot>, inside the 3:4 crop.
5. Every code-drawn part in the spec: screens and UI, captions, the label, mouths, lids, pupils, and the effects. Effects are simulated and drawn in the show's style (water as drops with gravity, steam and foam as merged bubbles), not static blobs. All motion comes from useCurrentFrame() and nothing else: no useFrame, setTimeout, Math.random or clock. Anything random uses a seeded hash, so every render comes out the same.
6. Stand-ins. Where a painted picture will go, draw a coloured block with a head and the picture's name (the Ph component of the last episode). List every stand-in and the shots it is in.
7. The sound plan, with every hit on its frame.
   - New raw sounds: node scripts/sfx-gen.mjs sfx <name> <seconds> "<prompt>", and node scripts/sfx-gen.mjs music <name> <seconds> "<prompt>" for music. They land in scratch/sfx-raw.
   - Measure each clip (a 10 ms envelope, the peak, the spectrum) and cut it by those numbers into public/sfx through the PLAN in scripts/sfx-build.py. Write the peaks to src/sfx-peaks.json with scripts/sfx-peaks.py.
   - A sound that is not loud from its first sample is placed so that its measured peak sits on the hit frame. The others start on their frame.
   - A phone speaker plays nothing under about 150 Hz. If a clip is mostly sub-bass, give it a partner in the middle range. A music bed that is meant to be a small radio in the room gets a high-pass and a compressor (x20's café radio got a 150 Hz high-pass and a compressor).
   - You cannot listen. Write "measured, not listened to" in the notes.
8. The mix. scripts/<ep>-cues.mts writes scratch/cues.json: the voices at their places on the reel's clock, every sound cue, the music runs with their fades and their own ducks, and the tail of a looping reel. scripts/sp-mix.py mixes it: every sound sits 6 dB under the voices, music and special cues have their own duck, and the master is -14 LUFS with a true peak under -1.5 dBTP after AAC. scripts/<ep>-voice-over.py prints how far the voice sits over the sounds, line by line. Keep the voice at least as far over the sounds as in the last episodes (16.5 to 17.3 dB).
9. The scripts, shaped like the last episode's: <ep>-cues.mts, <ep>-stills.mts (stills at the key frames, mid-shot, shot edges, the first 3 s, the named moments and the cover), <ep>-check.mts, <ep>-caps-job.mts, <ep>-voice-over.py and scripts/render-<ep>.sh.
10. Checks before you hand over:
   - node scripts/<ep>-check.mts: no shot over 2.4 s, no two same framings in a row, every caption out of the bottom 400 px and never over a cut, every cut and every hit within half a frame of the spec;
   - npx tsc --noEmit is clean, also with --noUnusedLocals on your new files;
   - node scripts/eyes-check.mts passes (add a block for any pupils you draw, like the x20 block);
   - a silent test render on the stand-ins, then $PY_IMG -I scripts/pops-check.py on it: no one-frame pops;
   - sh scripts/render-<ep>.sh end to end on the stand-ins as V=v0.
11. Notes. Append "Build notes <ep> (phase 1: the new art is not in yet)" to the episode doc: the voices' clock; each shot with its start frame; the named moments, each on a frame; the sounds and what the numbers said; what is drawn in code; the stand-ins; where the spec's picture could not be had as written, and why; the checks with their numbers; what is weak or open. Commit.

Rules:
- Never print or log key values. Never open .env.
- Never play a video. Look at stills taken from it.
- One render at a time. Do not judge your own work: list what is weak, and where a rule can be computed, write a check.
- If a spec time or a picture cannot be built as written, build the nearest thing and say what you moved and why. Do not move a cut onto a word without saying so.
```

## Phase 2: after the art is in

Phase 2 can be the same agent, continued, or a fresh one. A fresh agent starts by reading the phase 1 build notes.

```
You are the build agent for episode <ep> "<Title>", phase 2. The art is in out/<ep>-cast, and its DONE.txt says what each picture is and where its parts are. Phase 1 stands: the schedule, the sounds, the mix and the captions. Read the phase 1 build notes, DONE.txt and the coordinator's notes below before you change anything.

Coordinator's notes:
<numbered list of requests, for example which picture to register on which head, a clock that needs more frames, a sound to drop>

Build:
1. The prep script. Write scripts/<ep>-prep.py on the recipe of scripts/<last-ep>-prep.py, which imports the chain of earlier prep scripts (the flood-fill cut of the white, the cleaners for paper pockets and halos, the eyes, skin and white measured on each picture, the master-head registration for recurring characters). Run $PY_IMG -I scripts/<ep>-prep.py [parts]. It cuts every picture of the art folder into the people, props and puppets the scenes use, and writes public/sp/<ep>-*.png, src/<ep>-rig.json (px of the pictures, y down) and debug sheets in scratch/<ep>-prep. Look at the debug sheets for halos, paper left between arms or inside a prop, stair-stepped edges (the paper is not the same white in every picture, so the cut level is set per picture) and parts that must move apart.
2. Stage every shot with the painted art and replace every stand-in. Code draws only what code does best: screens, lids, pupils, mouths over the painted ones, effects and shadows. A recurring character's head registers on its master head. If a picture came out with its head at a different scale, scale and shift it as DONE.txt says.
3. Render v1: sh scripts/render-<ep>.sh. It makes out/<ep>-v1.mp4, the phone copy (crf 24, under 5 Mbit), the cover, the contact sheet and the first-3-seconds strip.
4. Run the checks and write their numbers into the notes:
   - no shot over 2.4 s, and no two same framings in a row (node scripts/<ep>-check.mts);
   - npx tsc --noEmit is clean;
   - node scripts/eyes-check.mts: every pupil stays inside its eye white at every look;
   - $PY_IMG -I scripts/pops-check.py on the silent render finds no one-frame pops, also at the tighter 0.4 / 2. A flash must be at least two frames wide;
   - about -14 LUFS after AAC, true peak under -1.5 dBTP (sh scripts/loud.sh), and the voice margin over the sounds from scripts/<ep>-voice-over.py;
   - $PY_AUDIO -I scripts/stt-lines.py out/<ep>-v1.mp4: Whisper hears every line on the final file;
   - the captions: node scripts/<ep>-caps-job.mts, node scripts/still.mjs scratch/job-caps.json --par=4, then $PY_IMG scripts/caps-check.py 250 1500, so that every caption sits inside y 250 to 1500;
   - the label and every on-screen text read at 360 x 640.
5. Look at stills of every shot. Take the first, last and middle frame of each shot from the mp4 itself (scripts/mp4-frames.py and scripts/sheet.py, or ffmpeg) and look at each one for: pupils outside the eyes, a wrong number of hands, text on text, a caption over a face, a one-frame pop at a cut, the wrong side of the counter, small text at phone size. Fix what you find and render again with the same checks.
6. Notes. Append "Build notes <ep>, phase 2" to the episode doc: what changed from phase 1, how the art was cut, how each shot is staged, what you did with each of the coordinator's notes (by number), the checks of v1 with their numbers, and what is weak or open. Commit. Do not push: the coordinator pushes.

Rules:
- The same as phase 1: no key values printed, no video played, one render at a time, motion only from useCurrentFrame(), renders identical every time.
- When the coordinator sends fixes after looking at v1, apply each one, render again, rerun the same checks, and add a short paragraph to the notes saying what changed.
```

## After phase 2

The coordinator looks at the first-3-seconds strip (docs/img/x20-v1-first3.jpg is the x20 one), the contact sheet (docs/img/x20-v1-sheet.jpg) and the phone copy at its real size, and sends the fixes. In x20 the coordinator's look found two things: the cobwebs were too small to read on a phone, and the cheer was too small. Both were fixed and v1 was rendered again with the same checks.
