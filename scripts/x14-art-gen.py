# Art for x14 "Four Stars" (docs/x14-four-stars.md): Ross (the mug held out, on one knee with the ring box), Chuck (thumbs up, shrug, the mug and its foam mustache, flat out, sitting dazed with his phone) and the latte seen from above.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x13-art-gen.py, scripts/x12-art-gen.py and scripts/x11-art-gen.py (the LOOK, FIT, SET, PROP, ARM and SCENE words are theirs; SET and ARM are carried unchanged, no x14 picture uses them).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x14-art-gen.py [name[:seed,seed] ...]     -> out/x14-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the people); no reference gives the size in the job (the insert 1024 x 1024).
# Text is never painted (the prompts say so; the ring box stays empty, its golden star, the phone's screen, the dizzy stars, the confetti and the captions are drawn in code; Chuck's talking mouth is code too).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, the other seeds drew a smaller head), the second his avatar. No apron in this episode.
# Chuck: his x10 master (out/x10-cast/chuck-61.png, given as a path) is the only reference, and the prompts use x10's CHUCK_AGAIN words. Reused, not repainted: out/x10-cast (the shop plates bg-counter and bg-window, chuck, ross-point), out/x08-cast (Ross's master, ross-hand, ross-fly, ross-up) and out/x13-cast (chuck-phone).
# The insert is in the flat paper words (INS, from SCENE) and takes no reference. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x14-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
CHUCK_MASTER = r"E:\getphantom-toons\out\x10-cast\chuck-61.png"
# the kept master of each character painted here that has references (name -> seed); none: both masters are x08's and x10's, given as paths
PICK = {}

LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show.")
FIT = "Full body, the whole figure fits inside the square picture with a wide white margin all round, on a plain white background."
SET = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
       "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing. Background only, no people in front, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
PROP = ("Drawn exactly in the style of the TV cartoon South Park: a flat construction-paper cut-out cartoon, one simple flat-coloured shape per part, thick black outlines, solid colors with no gradients, no shading, "
        "no highlights, no shine, no shadow and no texture, like a child's drawing, not a photograph and not a 3D render. A single object, centered, filling most of the frame, on a plain white background. "
        "No text, no letters, no numbers and no logos anywhere.")
ARM = PROP.replace("A single object, centered", "A single arm and hand, large")  # the arms come in from the edge of the picture and are cut off by it (scripts/tup-art-gen.py)
SCENE = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
         "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing; the people with huge round heads, big white oval eyes with small black dot pupils, no noses and mitten hands. "
         "A flat front-on scene filling the whole picture from edge to edge, no border. No text, no letters and no numbers anywhere. Vertical frame.")
# the insert is a flat picture of a table top seen from above: the SCENE words without the people and the front-on view, a square frame
INS = (SCENE.replace("; the people with huge round heads, big white oval eyes with small black dot pupils, no noses and mitten hands", "")
            .replace("A flat front-on scene", "A flat picture seen exactly from directly above, a top-down view with no perspective,").replace("Vertical frame.", "Square frame."))
assert "people" not in INS and "front-on" not in INS and "Vertical" not in INS

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
CHUCK_AGAIN = ("The same man as in the picture, with the same face, the same bald head with grey curls at the sides, the same black sunglasses resting on top of his head (never over his eyes), "
               "the same white t-shirt, khaki cargo shorts, high white socks and brown sandals")
# after the fall (shots 19-20): the same man, his sunglasses knocked crooked with one cracked lens, a shoe print on his tee, his curls messed up
CHUCK_HIT = (CHUCK_AGAIN.replace(", the same black sunglasses resting on top of his head (never over his eyes)", "") +
             ". His same black sunglasses are now knocked crooked: they sit tilted on his forehead, one side higher than the other, right above his eyes and never over them, "
             "and one of the two lenses is cracked, with a few thin white crack lines across it. ")
assert "resting on top" not in CHUCK_HIT
HIT = ("His grey curls at the two sides of his head are messed up, sticking out wildly in all directions. "
       "On the chest of his white t-shirt there is a dusty grey shoe print (one flat grey smudge in the shape of a shoe sole with a few plain tread lines, nothing written or drawn in it). ")
DAZED = ("Dazed: the two big white eyes wide open with the small black pupils pointing in two different directions (one up and to the left, the other down and to the right), the brows tilted up in the middle, "
         "a small wobbly open mouth, a stunned dizzy look; not angry. ")
PHONE = ("one plain black smartphone (a flat black rounded rectangle, taller than it is wide, held upright with its front toward the viewer, the screen a plain blank flat light-grey rectangle "
         "filling almost all of its front, with nothing on it: no icons, no picture, no text, no numbers)")
# the big white mug of shots 10-12 and 19 (Ross's and Chuck's are the same): the foam is only the little dome over the rim
MUG = ("one big plain white ceramic coffee mug (a flat white cup with straight sides, a little taller than it is wide, one round C-shaped handle on its right side, "
       "a small puffy dome of white milk foam showing just above its rim, thin black outlines, completely plain: no logo, no text, no pattern and no steam)")
SAUCER = "a plain flat white round saucer (seen from the side as a thin wide flat disc under the mug's base, thin black outline)"
RINGBOX = ("one small open black velvet ring box (a small flat black box, about as wide as his two hands side by side, its lid swung open and standing up at the back, "
           "the open top tipped toward the viewer so that the inside shows: a plain flat cream-coloured satin cushion with nothing on it, completely empty: no ring, no jewel, no star)")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
CHUCK = [CHUCK_MASTER]
JOBS = {
  # ---- Ross, 1024 x 1024
  # shot 10: "On the house." (behind the counter: it covers him from the waist down; the mug lands on the counter top)
  "ross-present": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, his two short stubby legs side by side with both black sneakers flat on the ground. "
                      "He beams too hard, a fake customer-service smile: a huge stiff wide grin showing all his teeth, the corners of the mouth stretched far up, the two big white eyes wide open and fixed, the brows raised high. "
                      f"Both his arms are bent and held out in front of him at chest height, the two mitten hands holding the two edges of {SAUCER}, and {MUG} stands on the saucer; "
                      "he offers it out in front of his chest toward the viewer; the mug covers his chest and his face stays uncovered above it. "
                      f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 14: "JUST PRESS FIVE!!" (in front of the counter; the golden star in the box is code, his hands shaking too)
  "ross-kneel": job(f"{ROSS_HEAD}, {TEE}. He is down on one knee facing the viewer, seen from the front, like a man proposing marriage: one knee (the one on the right side of the picture) rests on the ground, "
                    "the other leg (on the left side of the picture) is bent with its black sneaker flat on the ground. "
                    "A pleading begging face: the brows tilted up steeply in the middle in a worried arc, the two big white eyes wide open and looking up at the viewer, a small wobbly downturned mouth. "
                    f"Both his arms are bent and held out in front of him at chest height, the two mitten hands holding out {RINGBOX} toward the viewer. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- Chuck, 1024 x 1024, on his x10 master (his talking mouth is code)
  # shot 5: "Four stars is GOOD!" (the thumbs pop up on the first word)
  "chuck-thumbs": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, delighted: the brows raised high in happy arcs, the two big white eyes wide open, a big wide friendly open smile showing his upper teeth; not sad, not worried, no frown. "
                      "Both his arms are bent at the elbows with the forearms raised up in front of his chest, and both mitten hands are closed with only the thumb sticking straight up: "
                      "a thumbs up with each hand, one thumb on each hand, two thumbs up in all. "
                      f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 8: "Nobody's perfect."
  # the first take (seed 61, "a small relaxed easy smile, the brows level ... no frown") kept the master's sad frown and is kept as chuck-shrug-61-old.png: the words now draw the smile (a U-shaped mouth, the corners turned up, the brows raised)
  "chuck-shrug": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, shrugging in a relaxed way: both shoulders raised high up toward his ears, both elbows bent and tucked close to his sides, "
                     "both forearms held out to the sides at waist height, each mitten hand open with its palm facing up. "
                     "He smiles easily: a gentle wide smile curving up at both corners of the closed mouth (a U-shaped mouth, the corners turned up and never down), the cheeks lifted, "
                     "the brows raised a little in a friendly what-can-you-do look, the two big white eyes open and cheerful; not sad, not worried, no frown. "
                     f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 12: "...Four." (the mug comes up to his lips and goes down in code)
  "chuck-mug": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, calm and unimpressed: the two big white eyes half-covered by flat lids (the top half of each white oval hidden, the pupils showing below the lids), "
                   "the brows level and flat, the mouth a flat straight line. On his upper lip a thick white milk-foam mustache (a fluffy flat white band with a bumpy cloud outline and a thin black outline, as wide as his mouth). "
                   f"Both his arms are bent and held in front of him, and his two mitten hands hold {MUG} at chest height, one mitten round the handle and the other cupped under the other side of the mug; "
                   "the mug covers his chest and his face stays uncovered above it. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 19: the build lays him flat on the floor
  # (kept as painted: both pupils look the same way, so the look is stunned rather than crossed; the shoe print is a grey halftone sole with tread squares)
  "chuck-star": job(f"{CHUCK_HIT}{HIT}"
                    "He stands facing the viewer, seen from the front, in a wide starfish pose: both arms stretched out straight to the sides and a little upward, both legs spread wide apart, so that his whole body makes a big X, "
                    f"the mitten hands open and spread. {DAZED}"
                    f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 20: he types the three-star review (the screen is code)
  # (kept as painted: the legs come out foreshortened, the soles of the sandals toward us; the tapping mitten's tip touches the phone at the left edge of its screen, and the shoe print is half hidden by the hand and the phone)
  "chuck-wreck": job(f"{CHUCK_HIT}{HIT}"
                     "He sits on the floor facing the viewer, seen from the front, with his two legs stretched out straight in front of him toward the viewer, a little apart, the white socks and brown sandals at the bottom of the picture. "
                     f"{DAZED}"
                     f"His left arm, the one on the right side of the picture, is bent and its mitten hand holds {PHONE} upright at chest height, the screen facing the viewer, without covering any of his face. "
                     "The thumb of his other mitten hand, on the left side of the picture, reaches out in front of the phone and its tip touches the bottom of the phone's screen, as if tapping it. "
                     f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # ---- the insert, 1024 x 1024
  # shot 11: Chuck's face in the foam, a sparkle in code (nothing is written; the coffee comes out a golden brown, the sunglasses a dark brown)
  "ins-latte": job("A big plain white ceramic mug of latte on a plain white round saucer, seen exactly from directly above and filling most of the square picture, standing on a warm wooden counter top. "
                   "From above the mug is a big round white ring with one round C-shaped handle sticking out of its right side, and the saucer is a bigger white circle under it with a thin black outline. "
                   "The counter top is flat light-brown wooden planks with a few thin darker-brown grain lines and fills the rest of the picture from edge to edge. "
                   "Inside the ring the latte is a flat brown coffee circle, and on it, in white milk foam, is latte art: a simple cartoon face of a bald man, drawn in white foam with thin dark-brown lines: "
                   "a big round white head with nothing on top of it but a pair of dark-brown sunglasses pushed up on top of the head (two dark-brown ovals joined by a bridge), "
                   "a few small curly swirls of foam at the left and right sides of the head for curly hair, two small round dark-brown dot eyes and a wide curved dark-brown smile. "
                   f"Only brown and white in the latte. Nothing is written anywhere. {INS}"),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {}
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
