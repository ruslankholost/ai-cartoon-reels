# Art for x16 "Hiring a Zoomer" (docs/x16-hiring-a-zoomer.md): Ross at the café table (the résumé held up, the thumb jabbed over his shoulder) and his planting hand, Kenzie (the master, sipping) and her planting hand,
# Mom on the video call (sunglasses on, sunglasses lowered) and her arm, the plate behind Ross (four impatient customers in a line at the counter, then ducking).
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x15-art-gen.py, scripts/x14-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP, ARM and SCENE words are theirs).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x16-art-gen.py [name[:seed,seed] ...]     -> out/x16-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: Ross, his hand, Kenzie's sip and her hand; Mom's second picture and the ducking plate take the shape of their first, 768 x 1344 both; the line plate takes x10's bg-counter's 768 x 1344);
# no reference gives the size in the job (Kenzie 1024 x 1024, Mom 768 x 1344, Mom's arm 1344 x 768).
# Text is never painted (the prompts say so; the résumé and the plate's sign stay blank, the phone's screens, the sign's lettering and its cobwebs, the flags on the sticks, the pole in Mom's fist and the captions are drawn in code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, the other seeds drew a smaller head), the second his avatar.
# No apron in this episode. He sits behind a small round café table that hides his lap and legs, so the pictures end at the table's base. His hand takes x08's ross-hand-61 as its first reference (the recipe of x15's ins-invoice: the same arm, smartwatch and tattoo sleeve, the phone swapped for a thin stick).
# Kenzie is new: ONE description (KENZIE), her first picture is the master and its seed is in PICK; kenzie-sip takes the master as the only reference (KENZIE_AGAIN words). Mom is new too: ONE description (MOM); mom-glasses takes mom-live as the only reference.
# Kenzie's hand takes her master as its only reference (so her hoodie's green and her nails are hers; the recipe of Ross's hand), Mom's arm is in the flat paper words (ARM) and takes none. The plate bg-line takes x10's bg-counter-61 as its first reference
# (so the wall, the machines and the counter stay the plate's) and describes the customers and the sign in words; bg-line-duck takes bg-line as the only reference.
# The files are what WanGP saves (JPEG data under a .png name, as in every earlier episode; PIL and cv2 read them by content). A picture that was painted again keeps its first take as <name>-<seed>-old.png (a third as -old2); SEEDS names the kept seed of a name.
# The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x16-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
ROSS_HAND = r"E:\getphantom-toons\out\x08-cast\ross-hand-61.png"
BG_COUNTER = r"E:\getphantom-toons\out\x10-cast\bg-counter-61.png"
# the kept master of each picture that others take as a reference (name -> seed); a reference named here is out/x16-cast/<name>-<seed>.png
PICK = {"kenzie": 61, "mom-live": 61, "bg-line": 61}

LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show.")
FIT = "Full body, the whole figure fits inside the square picture with a wide white margin all round, on a plain white background."
PROP = ("Drawn exactly in the style of the TV cartoon South Park: a flat construction-paper cut-out cartoon, one simple flat-coloured shape per part, thick black outlines, solid colors with no gradients, no shading, "
        "no highlights, no shine, no shadow and no texture, like a child's drawing, not a photograph and not a 3D render. A single object, centered, filling most of the frame, on a plain white background. "
        "No text, no letters, no numbers and no logos anywhere.")
ARM = PROP.replace("A single object, centered", "A single arm and hand, large")  # the arms come in from the edge of the picture and are cut off by it (scripts/tup-art-gen.py)
SCENE = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
         "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing; the people with huge round heads, big white oval eyes with small black dot pupils, no noses and mitten hands. "
         "A flat front-on scene filling the whole picture from edge to edge, no border. No text, no letters and no numbers anywhere. Vertical frame.")
# the head-and-shoulders words for Mom (a bust, her eyes behind the sunglasses): LOOK without the body and the eyes
LOOK_BUST = (LOOK.replace("The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. ", "")
                 .replace("Two big white oval eyes touch each other, with small black dot pupils. ", ""))
assert "stubby" not in LOOK_BUST and "oval eyes" not in LOOK_BUST
# Kenzie's hands are inside her sleeves: LOOK without the mitten hands
LOOK_SLEEVES = LOOK.replace("short arms and simple mitten hands", "short arms")
assert "mitten" not in LOOK_SLEEVES

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
ROSS_SEAT = ROSS_HEAD.replace("redrawn as a full-body puppet", "redrawn seated at a table")
TEE_UP = "a plain black t-shirt, colourful tattoo sleeves on both forearms and a black smartwatch on his left wrist"
# his face while he yells (the steep V of the brows is x13's ANGRY, the open shout is x10's ross-point)
YELL = ("furious and yelling at the top of his lungs: his mouth wide open in a huge shout showing his teeth, the brows pulled down hard in a steep V over his eyes, "
        "the two big white eyes wide open with tiny black pupils")
# the table hides his lap and legs; the code puts the cups, the ring light and the phone on its top
TABLE = ("one small round wooden café table seen exactly from the front, flat with no perspective: a thin wide flat warm-brown tabletop (a long low flat rounded slab much wider than his shoulders, "
         "with a thin black outline and a slightly darker-brown front edge), held up by one thick short plain wooden column in the middle that ends in a flat round brown base on the floor; nothing stands on the table")
BEHIND = (f"He sits behind {TABLE}, facing the viewer, seen from the front: the tabletop is in front of him at the height of his belly and hides his lap and legs, "
          "so no legs, no chair and no feet are drawn; below the tabletop only the table's column and its round base are seen. ")
FIT_TABLE = FIT.replace("Full body, the whole figure", "The whole man and the whole table")
RESUME = ("one sheet of plain blank white paper (a flat white rectangle taller than it is wide, with a thick black outline, completely blank: "
          "no text, no lines, no numbers, no logo, no stamp and nothing printed on it)")
# the flag on it is code: the stick carries nothing
STICK = "The stick is a plain thin straight light-brown wooden stick, no thicker than a pencil, with nothing attached to it: no flag, no cloth, no tape and no text."

# Kenzie: the claw clip and the earbuds are drawn on the huge head, the sleeves swallow her hands and only the nails poke out; the tumbler is plain and has no handle
# the first take (seed 61, "sleeves pulled over her hands ... only four long pink nails poke out", the half-lidded look inside the description) drew thin peach hands with long nails coming out of the sleeves, wide-open sad eyes and a small cup;
# it is kept as kenzie-61-old.png: the words now make each sleeve end in a closed green mitten-shape with the nails sticking out of its front, the lids and the flat mouth are in BORED (in the pose sentence) and the tumbler is bigger;
# the second take (kept as kenzie-61-old2.png) had the sleeve-ends and the bored face right, but the earbuds were small and half hidden by hair and the tumbler a short fast-food cup: the words now give the earbuds long stems, the clip half the head's width and the tumbler a tall slim shape
# (the third take, the kept one, has the earbuds as before, a bigger clip and a slimmer tumbler, about 100 x 180 px against a head of 280 x 476: it reads as a tall cup, not as a giant one)
KENZIE = ("A young woman of 22 with a huge round head, light peach skin, messy brown hair twisted up on top of her head and held there by one big wide flat tan claw hair clip (a flat clip with a row of eight teeth, about half as wide as her head), "
          "with loose strands sticking out in all directions and two loose strands hanging down in front of her ears; one white wireless earbud in each ear (a white rounded bean sitting in the ear with a long thin white stem hanging down from it, the stem as long as the ear and clearly seen); "
          "she wears an oversized baggy sage-green hoodie (a flat soft grey-green, the hood down, a front pocket) whose sleeves are far too long: each sleeve hangs past where her hand would be and ends in a floppy round green sleeve-end like a green mitten, "
          "so that no skin, no hand and no finger is seen at all, and out of the front of each sleeve-end stick only four long thin pink acrylic nails (each a long narrow bright-pink rounded rectangle, like a little pink claw); "
          "baggy light-blue jeans and chunky white sneakers")
KENZIE_AGAIN = ("The same young woman as in the picture, with the same face, the same messy brown hair held up in the same big tan claw clip, the same small white earbuds, "
                "the same oversized sage-green hoodie with the same floppy green sleeve-ends that hide her hands and the same long pink nails sticking out of them, the same light-blue jeans and the same white sneakers")
BORED = ("a bored, unimpressed face: the top half of each of the two big white oval eyes is covered by a flat skin-coloured eyelid with a straight lower edge, so each eye is a half-closed white half-moon with the small black pupil in it "
         "looking straight ahead, the brows flat and low, the mouth a small flat straight line")
TUMBLER = ("one giant tumbler (a very tall slim flat light sky-blue cylinder, three times taller than it is wide and as tall as her whole head, a little narrower at the bottom, a flat white lid on top and one long thin pink drinking straw sticking up out of the lid, "
           "no handle, completely plain: no logo, no text, no pattern)")
TUMBLER_AGAIN = TUMBLER.replace("one giant tumbler", "the same giant tumbler as in the picture")

# Mom on the call: the sunglasses cover her eyes completely, the headset's boom ends at the corner of her mouth
# the first take (seed 61, "A glamorous woman in her late 40s with a huge round head ...") came out as a flat vector illustration with a neck and no black outlines, not as a South Park cut-out: kept as mom-live-61-old.png;
# the words now start with the South Park head (a huge perfect circle, no neck) and the outlines
MOM = ("A South Park style cartoon woman in her late 40s with thick black outlines: a huge perfectly round light tan-peach head as wide as her shoulders, sitting right on the shoulders with no neck, "
       "a big fresh voluminous golden-blonde blowout (a huge puffed-up bouncy flat golden-yellow hairdo that frames the whole face and curls out at the shoulders), "
       "big oversized black sunglasses (two big flat black rounded lenses joined by a thin black bridge, covering both of her eyes completely so that no white eye is seen), "
       "a black phone headset (a thin black band across the top of her hair, one black ear cup over her ear on the right side of the picture, and a thin black boom arm curving down from it to a tiny round black microphone beside the corner of her mouth), "
       "no nose, red lipstick on a small closed mouth drawn as a short curved line with one corner pulled up higher than the other in a cold confident smirk, "
       "a lilac blazer (a flat soft purple jacket with wide lapels) over a plain white top")
MOM_AGAIN = ("The same woman as in the picture, with exactly the same golden-blonde blowout, the same black headset with its boom microphone, the same red lipstick and cold smirk, the same lilac blazer over the white top "
             "and the same flat soft-beige background, all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- Ross at the table, 1024 x 1024 (only the master's own seed 61 keeps his head's size)
  # shot 1 (and the wide 7): the boss smile, the résumé up (the ring light's glow, the squint and the label are code)
  "ross-table": job(f"{ROSS_SEAT}, {TEE_UP}. {BEHIND}"
                    "A big fake boss smile: a very wide toothy grin with a long row of white teeth stretched across his whole face, the brows raised high, the two big white eyes wide open looking straight at the viewer. "
                    f"Both his arms are bent and raised in front of his chest, and his two mitten hands hold {RESUME} upright at the height of his chest, one hand gripping each side of the sheet, the sheet facing the viewer, "
                    "below his chin so that his whole face stays uncovered. "
                    f"Nothing else is in the picture. {LOOK} {FIT_TABLE}", ROSS),
  # shot 17: "IT'S A COFFEE SHOP!" (the vein is code; the line is the plate behind him)
  # the first take (seed 61, "the thumb pointing straight up and back past his shoulder") drew a thumbs-up beside his head, which reads as approval: kept as ross-thumb-61-old.png; the words now point the thumb out to the side
  "ross-thumb": job(f"{ROSS_SEAT}, {TEE_UP}. {BEHIND}He is {YELL}. "
                    "His right arm, the one on the left side of the picture, is bent with the elbow out and raised so that its mitten hand, a loose fist with only the short thumb stuck out, is held beside his shoulder "
                    "at the height of his shoulder, the thumb pointing sideways, out to the left and a little upward, away from his head (not straight up), jabbing it back past his shoulder at something behind him. "
                    "His other arm, the one on the right side of the picture, reaches down to the table and its mitten hand lies flat on top of the tabletop with the palm down. "
                    f"Nothing else is in the picture. {LOOK} {FIT_TABLE}", ROSS),
  # shots 12, 18: his tattooed hand stabs a desk flag into her tumbler and onto the screen (the flag's cloth is code; the build turns the hand to the target)
  # the first take (seed 61, "the hand pinches one thin stick ... like a crab claw") drew a realistic four-finger fist round the stick, with finger lines unlike the series' mitten hands: kept as hand-ross-61-old.png;
  # the words now draw the South Park mitten (x15's ins-button words) and the pinch
  "hand-ross": job("The same hand and forearm as in the picture, with the same black smartwatch and the same colourful tattoo sleeve, coming in from the bottom of the picture, but the black phone is gone: "
                   "the hand is drawn like the hands of the South Park characters, a plain rounded mitten shape in light peach skin with one short fat separate thumb, no finger lines, no knuckles and no fingernails, and it pinches one thin stick: "
                   "its short thumb and the tip of the mitten are pressed together in a small pinch like a crab claw on the lower end of the stick, "
                   "the stick standing upright and rising from the pinch straight up to near the top of the picture. "
                   f"{STICK} {PROP.replace('A single object, centered', 'A single hand and stick, large')} Square frame.", [ROSS_HAND]),
  # ---- Kenzie, 1024 x 1024: the master (no reference), then the sip on it
  # shots 2, 6, 8, 13, 24, 27: bored behind the ring light (the ring, the phone and the live are code; her mouth is code)
  "kenzie": job(f"{KENZIE}. She stands facing the viewer, seen from the front, slouching a little, her two sneakers flat on the ground side by side, {BORED}. "
                f"Her right arm, the one on the left side of the picture, is bent in front of her chest, its floppy green sleeve-end wrapped round the middle of {TUMBLER} and holding it upright, "
                "the four long pink nails sticking out of the sleeve-end against the front of the tumbler. "
                "Her other arm, the one on the right side of the picture, hangs straight down at her side and ends in a floppy green sleeve-end with four long pink nails sticking out of its front. "
                f"Nothing else is in the picture. {LOOK_SLEEVES} {FIT}"),
  # shots 10, 24: sipping from the straw
  "kenzie-sip": job(f"{KENZIE_AGAIN}. She stands facing the viewer, seen from the front, sipping: her right arm, the one on the left side of the picture, is bent and raised so that its floppy green sleeve-end holds {TUMBLER_AGAIN} "
                    "up in front of her chin, the pink straw going into her mouth, her lips closed round the straw, the four long pink nails sticking out of the sleeve-end against the tumbler. "
                    "Her eyes are half closed: the top two thirds of each of the two big white oval eyes is covered by a flat skin-coloured eyelid, leaving a thin half-moon slit, so she looks sleepy and bored. "
                    "Her other arm hangs straight down at her side and ends in a floppy green sleeve-end with four long pink nails sticking out of its front. "
                    f"Nothing else is in the picture. {LOOK_SLEEVES} {FIT}", ["kenzie"]),
  # shot 5 (the toothpick flag into his coffee), 27 (one more flag toward the lens): her hand in the sleeve (the flag's cloth is code)
  # the first take (seed 61, "a floppy round green sleeve-end like a green mitten that covers the whole hand") drew a bright leaf-green paw with a fan of nails and the stick behind it, not the sleeve's sage-green and not a pinch: kept as hand-kenzie-61-old.png;
  # the second take (seed 61, a sleeve tube with a gathered cuff, no reference; kept as hand-kenzie-61-old2.png) had the right shapes, but its green was paler than her hoodie (median 154,178,140 against 128,159,112 on the master) and four skin-coloured fingers showed under the nails;
  # the words now give her master as the reference, as x15's ins-invoice does with Ross's hand, so the green and the nails are hers (median green 117,149,103 on this one); the kept picture is seed 62
  "hand-kenzie": job("A close view of just one arm of the same girl as in the picture, with nothing else of her: no head, no face and no body. The arm is the sleeve of her same oversized baggy hoodie, exactly the same flat grey-green, "
                     "a long baggy tube that comes up into the picture from the bottom edge and is cut off by that edge, with a gathered ribbed cuff of the same green at its end. "
                     "Her hand is hidden inside the sleeve, so that no skin and no finger is seen at all; out of the round opening of the cuff stick her same four long thin bright-pink acrylic nails, standing up side by side with a small gap between them, "
                     "and the lower end of one thin straight stick is pinched between the tips of two of the nails like tweezers, the stick standing upright and rising straight up to near the top of the picture. "
                     f"{STICK} {ARM} Square frame.", ["kenzie"]),
  # ---- Mom, 768 x 1344 (the phone's screen is a tall one; the wall behind her is one flat beige because the screen's banner, LIVE and the frame are code)
  # shots 14, 15: "She needs thirty an hour." (her talking mouth is code over the smirk)
  "mom-live": job(f"{MOM}. She is seen from the front as on a video call, head and shoulders only: her huge round head in the upper middle of the picture, about two thirds as wide as the picture, "
                  "and her shoulders in the lilac blazer reaching nearly to the picture's sides and cut off by the bottom edge; her arms are not seen. "
                  "The background is one completely flat plain soft-beige colour filling the whole picture, with nothing else on it. "
                  f"{LOOK_BUST} Vertical frame.", res="768x1344"),
  # shot 16: "Or customers." (the sunglasses slide down an inch)
  # the first take (seed 61) had the right face, but the edit came out with a grainy felt texture over the hair, the skin, the blazer and a blotchy wall: kept as mom-glasses-61-old.png; the words now say flat solid colours, and the kept picture is seed 62
  "mom-glasses": job(f"{MOM_AGAIN}, except for one thing: her big black sunglasses are now pushed down her face by about an inch, so that they sit low on her face, "
                     "and above the top rims of the sunglasses her two big white oval eyes with small black dot pupils are now seen, looking straight at the viewer over the rims with the brows raised, a cold unimpressed stare. "
                     f"She is still seen from the front, head and shoulders only, cut off by the bottom edge. {LOOK_BUST} Vertical frame.", ["mom-live"]),
  # shot 19: her arm comes out of the phone and draws the pole (the pole, drawn in code, goes through the fist)
  # the first take (seed 61, "one long pointed red manicured nail that sticks out of the curled fingertip") drew one big red blob on the fist instead of nails: kept as mom-arm-61-old.png; the words now ask for four nails, one on each finger
  "mom-arm": job("A cartoon woman's arm and hand reaching into the picture from the left edge, seen from the side. The sleeve is a lilac blazer sleeve (a flat soft purple jacket sleeve) with a white blouse cuff showing at the wrist; "
                 "it comes in horizontally from the left edge of the picture and is cut off by that edge. The hand is a plain rounded mitten in light tan-peach skin, clenched in a tight fist, "
                 "the four short fat fingers curled into a row of round bumps facing the viewer and the short thumb wrapped across them, as if gripping a tall vertical pole that is not there: nothing is held in the fist and nothing is drawn through it. "
                 "Each of the four curled fingers has its own long pointed red manicured nail sticking out of its fingertip like a little red claw, four long red nails in a row, and the top finger wears one big gold ring with one big round blue gem. "
                 f"{ARM} Horizontal frame.", res="1344x768"),
  # ---- the plate behind Ross, 768 x 1344: x10's counter on the first reference, the customers and the sign in words
  # shots 7, 17, 25: the line (the sign's NOW HIRING and its cobwebs are code, on the blank white sign)
  "bg-line": job("The same coffee shop as in the picture, drawn in the same flat paper cut-out style, with the same beige back wall, the same chalkboard and round clock, the same back counter with the espresso machine and the panini press, "
                 "the same front counter with the cash register and the glass jar on it and the same wooden floor strip, all kept exactly the same and in the same places, but now: "
                 "in the middle of the front counter top stands one blank white paper sign (a flat white rectangle wider than it is tall, with a thin black outline, standing upright on two small brown wooden feet, "
                 "completely blank: no text, no letters, no numbers, no drawings and no marks on it); nobody works behind the counter; "
                 "and in front of the counter, in the lower half of the picture, four impatient customers stand side by side in a row, facing the viewer, each one a whole standing person with a huge round head, "
                 "big white oval eyes with small black dot pupils, no nose and mitten hands, all four scowling, each in a different colour: "
                 "the first, on the far left, a man in a navy-blue jacket with his arms folded tight across his chest, glaring; "
                 "the second, a woman with a short black bob in a yellow raincoat, tapping one foot: one foot lifted off the floor with its toe tapping, her arms hanging down, her eyes rolled up, her mouth pursed; "
                 "the third, a bald man in a green sweater, holding one wrist up in front of his face and glaring at the wristwatch on it, his other hand on his hip; "
                 "the fourth, on the far right, a teenager in an orange hoodie, looking down at one black smartphone held in both hands, a flat bored mouth. "
                 f"Nothing else is in the picture. {SCENE}", [BG_COUNTER]),
  # shot 22: the steam storm (the flags and the steam are code)
  # the first take (seed 61) had the four crouched with their arms over their heads, but the edit came out with a blotchy sponge-like grain over the wall, the chalkboard and the counter and the bald man and the black bob drew dark hair: kept as bg-line-duck-61-old.png; the kept picture is seed 62
  "bg-line-duck": job("The same picture exactly, the same coffee shop with the same wall, counter, paper sign and floor and the same four customers in the same clothes standing in the same places, "
                      "but now all four are ducking: each one crouched low with the knees bent, the huge head pulled down between the shoulders, the eyes squeezed shut, "
                      "and both arms raised over the top of the head with the mitten hands clasped over the hair and the elbows out; none of them looks at the viewer. "
                      f"Nothing else is changed. {SCENE}", ["bg-line"]),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"hand-kenzie": [62], "mom-glasses": [62], "bg-line-duck": [62]}
# a reference name is a file path or a kept master (PICK)
def ref(r): return r if ("\\" in r or "/" in r) else str(OUT / f"{r}-{PICK[r]}.png")

want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else SEEDS.get(name, [61])))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    j = JOBS[name]
    for seed in seeds:
        if (OUT / f"{name}-{seed}.png").exists(): print(name, seed, "exists, skipped (a picture is never overwritten: the cut-outs are made from it)", flush=True); continue
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": j["prompt"], "resolution": j["res"], "seed": seed})
        if j["refs"]: s.update({"video_prompt_type": j["mode"], "image_refs": [ref(r) for r in j["refs"]]})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
