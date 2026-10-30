# Art for x12 "Speak to the Manager" (docs/x12-speak-to-the-manager.md): Ross (in the tie, in the cape, as God), Chuck (the latte, the pointing finger, the scream, the cup shown, the cup held out) and the two props (the crown, the beard).
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x11-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP, ARM and SCENE words are theirs; SET, ARM and SCENE are carried unchanged, no x12 picture uses them).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x12-art-gen.py [name[:seed,seed] ...]     -> out/x12-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the people); no reference gives the size in the job (the props 1024 x 1024).
# Text is never painted (the prompts say so; the name tag and the cup stay blank, the MANAGER on the tag and the captions are drawn in code; the bell, the rope, the halo, the steam and Chuck's talking mouth are code too).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head), the second his avatar.
# Chuck: his x10 master (out/x10-cast/chuck-61.png, given as a path) is the only reference, and the prompts use x10's CHUCK_AGAIN words. Reused, not repainted: out/x10-cast (the shop plates bg-counter and bg-window, chuck) and out/x08-cast (Ross's master).
# Props are in the flat paper words (PROP) and take no reference. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x12-cast"); OUT.mkdir(parents=True, exist_ok=True)
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

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
CHUCK = [CHUCK_MASTER]
JOBS = {
  # ---- Ross, 1024 x 1024
  # shots 4-5: he pops up from behind the counter (the counter covers him from the waist down; the tag's MANAGER is code)
  "ross-tie": job(f"{ROSS_HEAD}, {TEE}. Over the t-shirt at the collar he wears a plain red clip-on necktie (a flat red tie with a small knot, hanging straight down the middle of his chest, nothing printed on it), "
                  "and a small blank white rectangular name tag is pinned on his left side of the chest, the side on the right of the picture, with nothing written or drawn on it. "
                  "He stands facing the viewer, seen from the front, both arms hanging straight down at his sides, a flat deadpan face, eyes open looking straight ahead. "
                  f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shots 7 and 9: the crown is a separate prop
  "ross-king": job(f"{ROSS_HEAD}, {TEE}. Draped over his shoulders he wears a red velvet cape with a wide white fur collar (a flat red cape; the fur collar a flat white fluffy band lying round his neck and over his shoulders; "
                   "the cape hangs down behind his back and shows as flat red shapes on both sides of his body, down to his knees; nothing written or drawn on it). "
                   "He stands facing the viewer, seen from the front, both arms hanging at his sides in front of the cape, a flat deadpan face, eyes open looking straight ahead. "
                   f"Nothing on his head: no crown and no hat. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shots 11-12, 14, 17: he hangs on a rope drawn in code; the beard and the halo are added
  "ross-god": job(f"{ROSS_HEAD}. He is wrapped in a plain white bedsheet worn like a long robe (flat white cloth with a few soft fold lines, from his shoulders down to his ankles, nothing written or drawn on it), "
                  "with a thin brown rope tied around his waist as a belt, its two ends hanging down. His forearms are bare, with the colourful tattoo sleeves and the black smartwatch on his left wrist. "
                  "He stands facing the viewer, seen from the front, both arms raised wide out to the sides at shoulder height with the mitten hands open and spread, and his bare feet show under the hem of the sheet. "
                  "A calm serene face with a faint gentle smile, eyes open looking straight ahead. Nothing on his head: no halo and no hat; no beard, only his light stubble. "
                  f"The belt is the only rope in the picture and nothing hangs from above. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- the props, 1024 x 1024
  "prop-crown": job("A simple flat gold crown seen exactly from the front: a straight flat gold band along the bottom and three pointed triangular tips rising from it (one in the middle, a little taller, and one at each end), "
                    f"with a round red jewel (a flat red circle) on the band under each tip, three jewels in all, nothing else on it. {PROP}"),
  # the first take (seed 61) was a tall narrow U, a string of pearls two balls wide: the words now say wide (twice as wide as tall), a thick heap at the bottom and a bumpy cloud outline
  "prop-beard": job("A big fluffy white cotton-ball beard seen from the front: a thick cloud of many round white cotton balls of different sizes piled together and overlapping (each ball a flat white circle with a thin black outline), "
                    "so the outline of the whole beard is bumpy and scalloped. The beard is shaped like a wide letter U lying like a smile, twice as wide as it is tall: a thick heap of three or four rows of balls at the bottom, "
                    "two thinner arms curving up on the left and right, and a rounded open gap in the middle of the top edge, big enough for a mouth, where plain white background shows. "
                    f"A false beard on its own: no face, no head, no person, no hook and no string. {PROP}"),
  # ---- Chuck, 1024 x 1024, on his x10 master (his talking mouth is code)
  # shots 1-2 and 5: the bell is code
  # the first take (seed 61) hung the arm out and down with the mitten limp and tilted: the words now bend the elbow (the upper arm down, the forearm out level) and lay the hand flat
  "chuck-latte": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, furiously angry: the brows pulled down hard in a steep V over his eyes, a tight downturned frown, eyes open looking straight ahead. "
                     "His right arm, the one on the left side of the picture, is bent sharply at the elbow: the upper arm hangs down at his side and the forearm is raised out to the left, level, at chest height, "
                     "so that the khaki mitten hand at its end is held flat and horizontal with the palm facing down and the fingers together pointing left, as if about to slap a table top below it, but there is nothing below it. "
                     f"His left hand, on the right side of the picture, holds {CUP} at waist height. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 8
  "chuck-point": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, squinting with suspicion: his two big white eyes narrowed to half height by flat lids, the brows low, a flat suspicious mouth. "
                     "His right arm, the one on the left side of the picture, is stretched straight out to the left side of the picture at shoulder height, with one stiff index finger pointing straight out at someone outside the picture, the other fingers curled. "
                     f"His left hand, on the right side of the picture, holds {CUP} at his side. Nothing else is in the picture, nobody is pointed at. {LOOK} {FIT}", CHUCK),
  # shot 10
  # the first take (seed 61) was a worried gasp with the head level: the words now make it a furious scream, brows down in a V, the head tilted back
  "chuck-scream": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, screaming at the ceiling in a furious rage: his whole head is tilted back with the chin pushed up and forward, so that his face looks up at the ceiling; "
                      "his eyes look straight up (the pupils at the very top of the white ovals), the brows are pulled down in a steep angry V, and his mouth is stretched wide open in a huge scream showing his upper teeth and his tongue. "
                      "Both arms hang straight down at his sides with both mitten hands clenched into tight fists; "
                      f"his left fist, on the right side of the picture, holds {CUP}. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shots 13, 15, 16
  "chuck-cup": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, a sulky pouting face: the lower lip pushed out, the brows low and sad, eyes open looking straight at the viewer. "
                   f"His right arm, the one on the left side of the picture, is raised and bent so that his mitten hand holds {CUP} up beside his face at the height of his face, the cup turned toward the viewer as if showing it to us, "
                   f"without covering any of his face. His other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 14: the steam is code
  "chuck-hold": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, calm, a relaxed flat neutral face, eyes open looking straight ahead. "
                    "His right arm, the one on the left side of the picture, is stretched straight out to the left side of the picture and raised to head height, "
                    f"the mitten hand at the end of the arm holding {CUP} out at arm's length, upright, as if holding it under something to his left. His other arm hangs at his side. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"prop-beard": [62], "chuck-latte": [62], "chuck-scream": [62]}
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
