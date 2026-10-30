# Art for x11 "Are You Open?" (docs/x11-are-you-open.md): Ross (the sign, the wheel, the bed, the bath, the pajamas and apron), Chuck (smushed on the glass, at the curtain, putting his wallet away), the four night and bathroom plates and the three props.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP, ARM and SCENE words are its; ARM and SCENE are carried unchanged, no x11 picture uses them).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x11-art-gen.py [name[:seed,seed] ...]     -> out/x11-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the people); "I" and no reference give the size in the job (plates and the curtain 768 x 1344, the dashboard and the pastry case 1344 x 768).
# Text is never painted (the prompts say so; the sign, the clocks, the band-aid, the gauges and the screens stay blank, the captions are drawn in code; the cucumbers, the boil, the steam, the glass, the smear, the eyelids and Chuck's talking mouth are code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head), the second his avatar.
# Chuck: his x10 master (out/x10-cast/chuck-61.png, given as a path) is the only reference, and the prompts use x10's CHUCK_AGAIN words. Reused, not repainted: out/x10-cast (the shop plates bg-front, bg-counter and bg-window, ross-point, chuck) and out/x08-cast (Ross's master).
# Plates and props are in the flat paper words (SET, PROP): the first takes in plainer words came out as photographs and renders. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x11-cast"); OUT.mkdir(parents=True, exist_ok=True)
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
# FIT for the pictures that are not a full standing figure (only the opening words and the margin change; the white background stays)
FIT_UP = FIT.replace("Full body, the whole figure", "From the knees up, the whole figure")
FIT_HEAD = FIT.replace("Full body, the whole figure fits inside the square picture with a wide white margin all round", "The head, the shoulders and the two hands fill most of the square picture with a narrow white margin all round")
FIT_BED = FIT.replace("Full body, the whole figure", "The whole bed with him in it")
FIT_BATH = FIT.replace("Full body, the whole figure", "The whole bathtub with him in it")

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
APRON = "a plain brown apron (a flat brown bib shape with a curved neck cutout at the top, a strap loop at each top corner, two long waist ties hanging down, nothing written or drawn on it)"
PJ = ("long-sleeved pajamas of flat light-blue and white vertical stripes (a striped button-up top with long sleeves down to the wrists, no pocket and no logo, and matching striped long trousers); "
      "the sleeves cover his forearms, so no tattoo shows")
CHUCK_AGAIN = ("The same man as in the picture, with the same face, the same bald head with grey curls at the sides, the same black sunglasses resting on top of his head (never over his eyes), "
               "the same white t-shirt, khaki cargo shorts, high white socks and brown sandals")
CHUCK_CLOSE = CHUCK_AGAIN.replace(", khaki cargo shorts, high white socks and brown sandals", "")  # the close-up shows no legs
BANDAID = "a white band-aid cross (two crossed flat white strips, nothing printed on them) stuck on his bald head just below the sunglasses"

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
CHUCK = [CHUCK_MASTER]
JOBS = {
  # ---- Ross, 1024 x 1024
  # shots 1 and 24: he flips the door sign (the sign is drawn in code)
  "ross-sign": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, a calm satisfied smile, eyes open looking straight ahead. "
                   "His left arm, the one on the right side of the picture, is raised and bent so that his mitten hand is held up beside his face at eye height, the thumb and the tip of the mitten pinched together "
                   "as if holding the edge of a small sign hanging in front of him, but there is nothing between them and nothing in the hand. His other arm hangs at his side. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shots 5-9: a dashboard prop covers him below the wheel
  "ross-drive": job(f"{ROSS_HEAD}, a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist and dark blue jeans. "
                    "He sits facing the viewer as if in a car seat, seen from the front from the knees up, a relaxed happy face, eyes open looking straight ahead. "
                    "Both his mitten hands are up in front of his chest holding a plain round black steering wheel seen from the front (a flat black ring with a plain grey hub in the middle, nothing on it), "
                    f"the wheel in front of his chest. Nothing else is in the picture, no car and no seat. {LOOK} {FIT_UP}", ROSS),
  # shots 10-12: the bed is part of the picture (sleep is code eyelids)
  "ross-bed": job(f"{ROSS_HEAD}, wearing {PJ}. He sits up in a single bed, seen from the foot of the bed and facing the viewer, eyes open, a neutral flat mouth. "
                  "A flat solid dark-blue blanket is pulled over his legs up to his waist, his two mitten hands rest on the blanket, a plain white pillow is behind his back and a plain wooden headboard is behind the pillow. "
                  f"The whole bed is part of the picture. Nothing else is in the picture, no room and no table. {LOOK} {FIT_BED}", ROSS),
  # shots 14-18: the tub is part of the picture (the cucumbers, the boil and the steam are code)
  "ross-bath": job(f"{ROSS_HEAD}, with colourful tattoo sleeves on both forearms and a black smartwatch on his left wrist. He sits in a plain white bathtub seen from the front, "
                   "sunk to his shoulders in a big heap of white foam bubbles that fills the tub and spills over its rim, so that only his head, his bare shoulders and his two arms resting along the tub's rim show above the foam "
                   "and nothing below his shoulders is visible. A small yellow rubber duck (a flat yellow body, a tiny orange beak, one tiny black dot eye) sits on the rim of the tub. "
                   f"A blissful relaxed face, a soft smile, eyes open looking straight ahead. The whole tub is part of the picture. Nothing else is in the picture. {LOOK} {FIT_BATH}", ROSS),
  # shots 20 and 23: 4 AM, the apron over the pajamas
  "ross-pj": job(f"{ROSS_HEAD}, wearing {PJ}. Over the pajamas he wears {APRON}, the bib over his chest and the ties tied around his waist, and his feet are bare. He stands facing the viewer, seen from the front. "
                 "His left arm, the one on the right side of the picture, is raised and bent so that his mitten hand is held up beside his face at eye height, the thumb and the tip of the mitten pinched together "
                 "as if holding the edge of a small sign hanging in front of him, but there is nothing between them and nothing in the hand. His other arm hangs at his side. "
                 f"A huge manic wide grin showing all his teeth, his eyes wide open. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- Chuck, 1024 x 1024, on his x10 master
  # shots 2, 4, 6, 8, 9, 11, 13: the glass, the smear and his talking mouth are code
  # the first take (seed 61, with the full outfit in the words) came out as a standing full body with an unsquashed face: the close-up has no legs in the words, and its crop and squash are spelled out
  "chuck-smush": job(f"{CHUCK_CLOSE}. A very tight close-up: only his huge head, his shoulders and his two hands are in the picture, and the bottom edge of the picture cuts through the middle of his chest, so no belly, no legs and no feet show. "
                     "He is seen from the front as if through a pane of glass that he presses his face and both hands against: his whole head is squashed into a wide flat oval, much wider than tall, with the cheeks flattened and spread out wide, "
                     "his big white oval eyes squeezed wider and flatter but both fully visible with their small black dot pupils, his mouth a small flat horizontal line (not a frown), "
                     "the black sunglasses on top of his bald head pushed crooked and tilted, one side higher than the other, and both mitten hands spread flat and wide on either side of his face as if pressed on glass. "
                     f"No glass is drawn. Nothing else is in the picture. {LOOK} {FIT_HEAD}", CHUCK),
  # shot 16: the curtain is a separate prop
  "chuck-curtain": job(f"{CHUCK_AGAIN}, and also {BANDAID}. He stands facing the viewer, seen from the front, a polite deadpan face, eyes open looking straight ahead. "
                       "His right arm, the one on the left side of the picture, is raised straight up above his head with the mitten closed as if gripping the edge of a curtain that is not in the picture. "
                       "His left hand, on the right side of the picture, holds an open plain brown leather wallet (a flat brown folded wallet opened out, two empty tan card slots inside, nothing written or drawn on it) "
                       f"out toward the viewer at chest height. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shots 21 and 22
  "chuck-wallet": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, his head tilted down a little, a bored flat face. "
                      "His right hand, the one on the left side of the picture, is pushing a plain brown wallet (a flat brown folded rectangle, nothing written or drawn on it) into the big side pocket of his cargo shorts; "
                      f"his other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # ---- the plates, 768 x 1344
  # the first two takes (seeds 61 and 62) drew their own steering wheel and dashboard hump at the bottom, and the second also left a white margin round the frame: Ross holds the wheel and prop-dash is the dashboard,
  # so the words say front seat (not driver's seat), leave the windshield out (it brings the wheel with it) and put the frame on the picture's edges
  "bg-car": job("A flat front-on picture of the inside of a small car at night, drawn with no perspective and filling the whole picture from edge to edge with no border and no white margin: "
                "in the middle a plain grey front seat seen from the front, a tall rounded seat back with a headrest on top, empty, reaching down to the bottom of the picture; behind it a plain darker-grey back seat; "
                "and behind that a wide rear window, one flat dark-blue night pane showing a dark street with two flat yellow street lights; a flat grey roof lining across the top; "
                "a thick flat dark-grey frame running along all four edges of the picture, touching the edges. Night colours. "
                "Nothing is in front of the seat: no steering wheel, no dashboard, no pedals and no person, only the seats, the roof lining, the rear window and the frame. "
                f"{SET}", res="768x1344"),
  "bg-bedroom": job("A small bedroom at night, seen from the front, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: the back wall flat dark blue; "
                    "in the middle of the upper half of the wall a plain window with a thin white frame and a cross bar, and through it a flat navy sky with one round pale-yellow full moon over flat black rooftops "
                    "(a row of small black houses, each a plain black square with a triangular sloped roof, at different heights, with two small chimneys; not mountains); "
                    "below the window the wall is empty down to a flat dark wooden floor, no bed and no other furniture; "
                    "on the right a small plain wooden bedside table with a plain black box alarm clock on it, its screen blank and dark, no digits and no hands. "
                    f"{SET}", res="768x1344"),
  "bg-bathroom": job("A small bathroom, seen from the front, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                     "the back wall covered in flat pale-blue square tiles drawn with simple thin grid lines; a plain thin silver curtain rod across the top of the picture from edge to edge, nothing hanging from it; "
                     "a flat white floor strip along the bottom. No bathtub, no sink and no curtain; nothing and nobody else in the picture. "
                     f"{SET}", res="768x1344"),
  "bg-bathdoor": job("The inside of a small bathroom seen from inside the bathtub, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                     "a flat pale-blue tiled wall with simple thin grid lines; on the left a plain white sink with a plain blank mirror above it (a flat pale grey rectangle with a thin frame, no reflection); "
                     "a plain white towel hanging on a silver rail in the middle; a plain white door on the right; a flat white floor strip along the bottom. Nobody in it. "
                     f"{SET}", res="768x1344"),
  # ---- the props
  # the first take of the curtain (seed 61) hung from its own rod, which the bathroom plate already has: the rings are the top edge and nothing is above them
  "prop-curtain": job("A long plain shower curtain hanging straight down, filling the frame from top to bottom: flat pale yellow with a few thin darker-yellow vertical fold lines and a row of small white rings along its top edge. "
                      "The rings are the top of the picture: there is no curtain rod and nothing else above or beside the curtain. "
                      f"{PROP} Vertical frame.", res="768x1344"),
  # the first take of the dashboard (seed 61) was a trapezoid cluster that stopped short of both sides, with speckled gauge rims
  "prop-dash": job("A car dashboard seen exactly from the front, drawn as a flat dark-grey rectangular bar, much wider than tall, that runs right across the picture from the left edge to the right edge and is cut off by both edges, "
                   "with a straight flat top edge and a straight flat bottom edge. On the bar two big round blank gauges (each a flat white face with a plain thin black outline inside a plain flat darker-grey ring, "
                   "no numbers, no needles, no marks, no dots) and in the middle between them a small blank dark rectangular screen. Nothing else on it. "
                   f"{PROP} Horizontal frame.", res="1344x768"),
  # the first take of the case (seed 61) had one shelf with four muffins and five cookies, drawn as a 3D glass box: two shelves, five and five, a flat front
  "prop-case": job("A glass pastry display case seen exactly from the front, drawn as a flat rectangle with no perspective and no visible top or sides: a low flat light-wood base along the bottom, above it a flat pale-blue-grey glass front with a thin frame, "
                   "and inside it two flat horizontal shelves: on the upper shelf a row of five plain muffins (flat brown paper cups with round tan tops), on the lower shelf a row of five plain round cookies; "
                   f"nothing written on anything. {PROP} Horizontal frame.", res="1344x768"),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"chuck-smush": [62], "bg-car": [63], "bg-bedroom": [62], "prop-curtain": [62], "prop-dash": [62], "prop-case": [62]}
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
