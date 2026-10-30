# Working in this repo

This repo makes 20-30 s South Park-style cut-out cartoon reels (1080 x 1920) on one Windows PC. README.md has the detail; this file is the short map. The two skills this work uses, screenwriting and humanizer, are in `.claude/skills/` and load when Claude Code opens this folder.

## First run on a new machine
1. Ask the user for the WanGP folder and its Python, a Python with numpy and faster-whisper (audio tools), a Python with numpy, scipy, opencv-python and pillow (image tools), and an ElevenLabs API key. The key goes in `.env` (copy `.env.example`). Never print it.
2. The scripts keep the original machine's paths (drive E:). Change them in every script you are about to run; README "Edit these paths" lists them, and `grep -rnE "[A-Za-z]:[\\/](Invoke|talking-reel|Wan2GP|getphantom-toons|Windows)" scripts src` finds them.
3. `npm install`, `npx tsc --noEmit`, `node scripts/x20-check.mts` and `node scripts/eyes-check.mts` pass before anything else.
4. `node scripts/voices.mjs` lists the user's ElevenLabs voices. Map each character in `CAST` of `scripts/voice-gen.mjs` to a voice in their account.
5. The art model in the scripts, Qwen Image 2.1 Turbo, is under a research-only license (README, "Credits and licenses"). For a business account ask the user, and offer Qwen-Image-2512 in WanGP (Apache 2.0) by changing `qwen_image_21_turbo_7B` in the art script.
6. No pictures, voices or sounds ship with the repo, and neither does the owner's character. A user's characters start from new master pictures (the first picture of each in the art script); later pictures of that character take the master as their reference.

## Making an episode, in this order
1. Topic, then the screenwriting skill with docs/format.md, docs/bible.md and docs/reel-rules.md: logline, three hooks, beats, the screenplay, in `docs/<ep>-<slug>.md`.
2. The test room (prompts/test-room.md): five cheap subagents read the script cold, at most two rounds. They show what reads; they do not pick the peak.
3. `episodes/<ep>.jsonc`, then the voices (README section 2). `public/<ep>/timings.json` is the episode's clock.
4. The shot list on that clock, in the episode doc. Sounds and music (README section 3).
5. The art subagent (prompts/art-agent.md) and the build subagent (prompts/build-agent.md) run in parallel. The build agent's phase 1 uses stand-ins until the art's `DONE.txt` exists.
6. The v1 render (`sh scripts/render-<ep>.sh`) and the checks in README section 8. Look at the contact sheet and the first-3-seconds strip yourself before the user sees the reel, and send fixes back to the build agent.
7. A new episode copies the files of the newest one as its pattern. x20 is the most complete; docs/x20-one-coffee.md follows it from topic to render.

## Rules
- docs/format.md wins when it disagrees with the skill or another doc.
- Every motion comes from `useCurrentFrame()`: no Math.random, no clocks. Renders must come out the same every time.
- Key text stays out of the bottom 400 px. The reel's first frame is its cover, because TikTok uses frame 0.
- Never print API keys. Never commit `.env`, `out/`, `scratch/` or generated media.
- Captions and anything else the public reads go through the humanizer skill.
- Give the readers and lookups to a cheap model and the art and the build to a stronger one. The main session keeps the script, the rules and the final look at the stills.
