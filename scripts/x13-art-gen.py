# Art for x13 "Cheaper" (docs/x13-cheaper.md): Chuck (the phone, the till drawer in his arms, the apron), Ross shoving the drawer, and the two props (the apron, the register's customer display).
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x12-art-gen.py, scripts/x11-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP, ARM and SCENE words are theirs; SET, ARM, SCENE and CUP are carried unchanged, no x13 picture uses them).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x13-art-gen.py [name[:seed,seed] ...]     -> out/x13-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the people); no reference gives the size in the job (the props 1024 x 1024).
# Text is never painted (the prompts say so; the phone's screen, the bills and the display's screen stay blank, the digits, the profile and the captions are drawn in code; the coffee spray, the drips, the coins flying, the steam and the corks are code too).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, the other seeds drew a smaller head), the second his avatar.
# Chuck: his x10 master (out/x10-cast/chuck-61.png, given as a path) is the only reference, and the prompts use x10's CHUCK_AGAIN words. Reused, not repainted: out/x10-cast (the shop plates bg-counter, bg-window and bg-front, chuck, ross-wide, ross-till, ross-apron, ross-cup), out/x12-cast (Chuck's latte, point, cup and hold) and out/x08-cast (Ross's master).
# Props are in the flat paper words (PROP) and take no reference. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x13-cast"); OUT.mkdir(parents=True, exist_ok=True)
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

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
CHUCK_AGAIN = ("The same man as in the picture, with the same face, the same bald head with grey curls at the sides, the same black sunglasses resting on top of his head (never over his eyes), "
               "the same white t-shirt, khaki cargo shorts, high white socks and brown sandals")
CUP = ("one plain paper takeaway coffee cup (a flat white cup that narrows toward the bottom, a plain brown cardboard sleeve round its middle and a flat white lid on top, "
       "completely plain: no logo, no text, no pattern and no steam)")
# the brown of Ross's apron in out/x10-cast/ross-apron-61.png is about (145, 92, 49): hue 27, saturation 66%, value 57% (the words there were just "a plain brown apron")
# tried on the prop apron (no reference): "a plain brown" (117-146, 88-106, 47-60), "a flat muted medium brown ... dull ... cardboard" (133, 98, 54), "reddish, chestnut" (126, 45, 23), "caramel, orange" (175, 98, 26) on Chuck's;
# "a plain warm brown, the brown of a leather armchair" came out (145, 93, 36) on the prop and (128, 80, 36) on Chuck's apron, the closest
BROWN = "a plain warm brown, the brown of a leather armchair"
PHONE = ("one plain black smartphone (a flat black rounded rectangle, taller than it is wide, held upright with its front toward the viewer, the screen a plain blank flat light-grey rectangle "
         "filling almost all of its front, with nothing on it: no icons, no picture, no text, no numbers)")
DRAWER = ("an open cash-register drawer (a flat grey metal tray seen from the front and a little from above, wider than it is deep, with a thin flat grey front panel, "
          "full to the brim with a loose heap of flat green paper banknotes, each a plain green rectangle with a simple oval in the middle and nothing written on it, "
          "mixed with flat gold coins, each a plain gold circle with a thin black outline and nothing stamped on it)")
APRON = (f"a plain bib apron in {BROWN}: a bib that covers his chest and a skirt that hangs down to his knees, "
         "a flat brown neck strap going round his neck from the two top corners of the bib, no pocket, nothing written or drawn on it")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
CHUCK = [CHUCK_MASTER]
JOBS = {
  # ---- Ross, 1024 x 1024
  # shot 14: "TAKE IT!!" (the coins flying, the corks and the kettle are code)
  # Ross's head is exactly the master's (box 316-717 x 28) only on seed 61, the master's own: the seeds 62-66 gave a head 14% smaller and a taller body, so he stays on 61
  # the first take (the old words, no legs said) copied the master's seated legs (thighs forward, knees bent) and is kept as ross-drawer-61-seated.png; the words now put his two short legs and the sneakers on the ground
  "ross-drawer": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, his two short stubby legs side by side with both black sneakers flat on the ground. "
                     "He is furious: the brows pulled down hard in a steep V over his eyes, a tight clenched-teeth scowl, eyes open looking straight ahead. "
                     f"Both his arms are bent and held out in front of him at chest height, the two mitten hands gripping the two sides of {DRAWER}, which he holds out in front of his chest as if shoving it at someone; "
                     f"the drawer covers his chest and belly and his face stays uncovered above it. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- the props, 1024 x 1024
  # shot 15: it flies onto the drawer
  # the first take (seed 61, "a flat muted medium brown, a dull leather brown ...") was an olive (133, 98, 54): the words now say BROWN; the old picture is kept as prop-apron-61-old.png
  "prop-apron": job(f"A plain bib apron laid out flat and seen exactly from the front, with nothing in it and nobody wearing it, in {BROWN}: an apron with a narrow bib at the top with a curved neck cutout, "
                    "a flat neck strap that rises from the two top corners of the bib and closes in a loop above it; below the bib a wider skirt that widens a little down to a straight bottom hem; "
                    f"and two long thin waist ties hanging down from the two sides at waist height. Nothing written or drawn on it, no pocket, no pattern and no stitching. {PROP}"),
  # the digits are drawn on the screen in code (shots 1, 5, 8, 10, 12, 17, 19, 20)
  # the first take (seed 61) was a square computer monitor, 1.25 x as wide as tall: the words now say twice as wide
  "ins-display": job("The customer display of a cash register, seen exactly from the front: a small flat grey plastic box, twice as wide as it is tall, on a short grey stand (a short thick grey neck under the box and a flat round-cornered grey base); "
                     "the front of the box almost all one wide flat blank dark-green screen, a plain flat dark-green rectangle twice as wide as it is tall with a thin grey bezel round it and nothing on it: "
                     f"no digits, no letters, no symbols, no glow and no reflection. {PROP}"),
  # ---- Chuck, 1024 x 1024, on his x10 master (his talking mouth is code)
  # shot 9: "I'll post about you. I got forty followers." (the profile on the screen is code)
  # the first take (seed 61) kept the master's sad worried brows and a mild smile: the words now give half-lidded eyes, level brows and a wide smirk (seed 62);
  # the phone still comes out where the master's waving mitten is, beside his neck and shoulder, a little above chest height
  "chuck-phone": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, proud and smug: his head tilted back a little with the chin lifted, the two big white eyes half-covered by flat lids "
                     "(the top half of each white oval hidden, the pupils showing below the lids), the brows level and relaxed, a wide pleased smirk curving up at both corners of his mouth; not sad and not worried, no frown. "
                     "His right arm, the one on the left side of the picture, is raised and bent sharply at the elbow so that the forearm points up, "
                     f"and the mitten hand at its end holds {PHONE} up beside his chest, level with the middle of his t-shirt and well below his chin, the screen facing the viewer, without covering any of his face. "
                     f"His other arm, the one on the right side of the picture, hangs straight down at his side with an empty mitten hand. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 15: Ross shoves the drawer into his arms, the apron lands on it
  "chuck-drawer": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, surprised: the brows raised high, the two big white eyes wide open, a small round open mouth. "
                      f"Both his arms are bent and hold {DRAWER} in front of his belly, hugging it against his belly with both mitten hands under its two sides; "
                      f"the drawer is at belly height and covers his belly and the top of his shorts, and his face and his chest stay uncovered above it. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 19: he runs the shop now (the counter covers him from the waist down)
  # the first take (seed 61) kept the master's sad frown and was a bright orange (kept as chuck-apron-61-old.png); the words then gave half-lidded eyes and a smirk (the takes 62 and 63, a drab khaki and a rust red);
  # the colour words are now BROWN, and seed 61 gives the smirk with level brows and a head the master's size
  "chuck-apron": job(f"{CHUCK_AGAIN}, but now he also wears {APRON}, over the t-shirt and the shorts. "
                     "He stands facing the viewer, seen from the front, calm and smug: the two big white eyes half-covered by flat lids (the top half of each white oval hidden, the pupils showing below the lids), "
                     "the brows level and relaxed, a small smug smirk curling up at one corner of the closed mouth; not sad and not worried, no frown. "
                     "His two arms are crossed over his chest, the forearms folded one over the other across the apron's bib, the mitten hands tucked in at the elbows. "
                     f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"chuck-phone": [62], "ins-display": [62]}
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
