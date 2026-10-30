# Art agent

The art agent paints every picture an episode needs with Qwen Image 2.1 Turbo in WanGP, looks at each one, and hands over a folder that the build agent cuts into puppets (`scripts/<ep>-prep.py`). The coordinator is your main Claude Code session, the one that holds the script, the rules and the owner's notes. It writes the art list, starts the agent (we use `model: "sonnet"`) and reads the result.

## What the coordinator writes first

The art list goes into the episode doc under "The art (for the art agent, <date>)". docs/x20-one-coffee.md has a full example with 21 pictures. For each picture:

- the name (`camper-sit`, `hand-dev`, `prop-cup`) and the shots that use it;
- what is in it, in plain words: the pose, the mouth, where the eyes look, what the hands hold, how many of each thing;
- the reference it takes, and the size: 1024 x 1024 for people, hands and most props, 1344 x 768 for wide pictures (a row of people, a long table, a laptop);
- what is reused from earlier episodes and not painted again: a background plate, a hand, a recurring character's master;
- the rules for the whole list: no text, light peach faces, the same clothes in every picture of a character.

Write each picture so that a cut-out can be made from it: a plain white background, the figure whole inside the frame (or cut off by the edge on purpose, like an arm that comes in from the side), and one pose per picture.

## The brief

Paste this into the Agent call after you fill in the placeholders.

```
You are the art agent for episode <ep> "<Title>". Your job is to paint every picture on the art list of docs/<ep>-<slug>.md (the "The art" section) with Qwen Image 2.1 Turbo 7B in WanGP, to look at every picture, and to hand over a folder the build agent can cut into puppets. You do not write scene code.

Read first:
- docs/<ep>-<slug>.md, the "The art" section: the list.
- scripts/<last-ep>-art-gen.py: the script of the last episode. Yours is modeled on it. Keep its style words (LOOK, FIT, PROP, ARM and the others), its helper functions and its run loop, and change the JOBS table. The comments above each entry say what went wrong in earlier takes and which words fixed it. Read them before you write a prompt.
- out/<last-ep>-cast/DONE.txt: the hand-over note of the last folder. Yours has the same shape.

Do this:
1. Write scripts/<ep>-art-gen.py with one JOBS entry per picture on the list. Use one description per character or object and repeat it word for word in every picture of it, because the model keeps the face from a reference picture and forgets clothes and props that are not described. The style words stay as in the last script: the South Park cut-out look (flat colours, thin black outlines, a huge head, two big white oval eyes that touch, small dot pupils, no nose), "an original character, not a character from the show", and a plain white background.
2. Settings: model qwen_image_21_turbo_7B, seed 61 for every picture, the size from the list. References go in image_refs with video_prompt_type "KI": the first reference sets the shape of the picture, and a square one gives 1024 x 1024. A character's first picture (its master) takes the character's reference picture. Every later picture of that character takes the master as its only reference. A character who came back from an earlier episode takes that episode's master first, so the head keeps its size and drawing (this holds only on the master's own seed 61, so every picture of that character is seed 61). PICK holds the kept master of every name that other pictures take as a reference.
3. Run it in the foreground: $PY_WANGP -I scripts/<ep>-art-gen.py [name[:seed,seed] ...]. It writes out/<ep>-cast/<name>-<seed>.png. Run one WanGP job at a time, because the GPU is shared, and never start a second WanGP script while one is running. Paint at most 5 pictures per call: a picture takes 20 to 90 s and the model loads once per call. The script skips a name that already has a file, so a picture is never overwritten (the cut-outs are made from it). The files are what WanGP saves: JPEG data under a .png name. PIL and OpenCV read them by content, so do not convert them.
4. Look at every picture as soon as it exists. Open the file at full size and check:
   - it matches the list: the pose, the mouth, where the pupils are, what each hand holds, the number of hands, fingers and objects;
   - every face is light peach. No face is painted one solid dark colour with only the whites of the eyes showing (coffee, soot, mud), because it reads as a skin tone. Use drips, streams and splats over visible skin;
   - no text, letters, numbers or logos anywhere. The code draws all lettering, so screens, signs and labels are painted blank or plain black;
   - the clothes, hair and props match the character's description and the master;
   - the background is one flat white, with no streaks or tint in the corners;
   - nothing that must be whole is cut off by the frame.
5. Re-roll only a picture that is broken, and never for taste. A broken picture is painted again on seed 61 with changed words: the same prompt and seed give the same picture, so the words are what you change. Rename the broken file to <name>-61-old.png first (later ones -old2, -old3), then run the script for that name. Above the JOBS entry write a comment: what was wrong in each earlier take and which words fixed it. Use a second seed only when new words cannot fix the picture. Record the kept seed of every picture in SEEDS (61 when nothing else was needed).
6. Make the contact sheet out/<ep>-cast/sheet.jpg with every kept picture and its name. scripts/sheet.py takes a labels.json of {label, path}.
7. Write out/<ep>-cast/DONE.txt for the build agent. For each kept picture give the file, the size, what is in it, and coordinates in px of the picture with y down, saying whether they were measured on the colours or read by eye. Give the boxes of the eye whites, the pupils, the mouth and the top of the hair, and the boxes of the hands, props and cord ends that the code must follow. Add:
   - Head registration. If a character's head must sit on a master head (its rig is registered on that head), give the eye-white boxes of this picture and of the master, the scale that makes them equal, and the shift, for example "scale 1.087 about the eye midpoint, move 2 px right and 21 px down". Name the earlier take that has the exact head, if one does.
   - Weak spots: anything the cutter should know before cutting, such as pupils too low to move, a third hand in a corner, three different drawings of one gong, white on white with only a thin outline, a fine pen-sketch texture, tiny earbuds.
   - The earlier takes and why each was replaced.
8. Commit scripts/<ep>-art-gen.py and the art notes you added to the episode doc. The pictures stay out of git, because out/ is ignored.

Rules:
- Write only scripts/<ep>-art-gen.py, out/<ep>-cast/ and the art notes in the doc. Do not touch src/.
- This script needs no keys. Never print or open .env.
- Do not say a picture is fine unless you looked at it. Report what you checked and what is weak.
- If the coordinator asks for one more picture later, add it to the same script, paint it, and add it to the sheet and to DONE.txt.
```

## After the agent finishes

The coordinator opens sheet.jpg, then the pictures that DONE.txt calls weak, and asks for repaints before the build agent starts phase 2. docs/img/x20-cast-sheet.jpg is the sheet of x20.
