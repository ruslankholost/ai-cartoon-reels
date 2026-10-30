# Art for "Because" (docs/x03-because.md), Qwen Image 2.1 Turbo 7B from the prompt alone, recipe C of E:\Wan2GP\my_tests\sp_cast.py (the South Park look, our own characters),
# modeled on scripts/tip-art-gen.py.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/because-art-gen.py [name[:seed,seed] ...]     -> out/sp-cast4/<name>-<seed>.png
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call. Without a seed list a name gets the seed in SEEDS.
# Text is never painted (the prompts say so, and the menu board, the totals and the sign are drawn in code): scripts/because-prep.py cuts and measures what comes out.
# No real brand: no logos, no chain names, nothing that looks like a real fast-food chain's sign (docs/bible.md). The palette is teal, cream, wood and charcoal, not red and yellow.
# Denise is not made here: her hoodie puppet is Tip's (tip-deniseHood-*, the same head).
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast4"); OUT.mkdir(parents=True, exist_ok=True)
LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show. Front view, full body, standing, arms at the sides unless a pose is described, on a plain white background. Vertical frame.")
SET = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. Background only, no people, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
PROP = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "shapes, thin black outlines. A single object, centered, filling most of the frame, on a plain white background. No text, no letters, no numbers and no logos anywhere. Vertical frame.")
# the counter, in one description, so that both plates show the same counter: a teal front panel and a light wood top, cream walls, a light checkered floor
COUNTER = "a long counter with a plain teal front panel and a light wood top"
JOBS = {
  # ---- the cast
  "cashier": ("A skinny 17 year old guy with messy short sandy-blond hair, a bored flat face with his mouth closed in a flat line, eyes open looking straight ahead, "
              "wearing a plain teal short-sleeved polo shirt with no logo and no writing, black pants and black shoes, nothing on his head, no hat and no headphones, "
              f"standing with his arms hanging at his sides. {LOOK}"),
  "rhonda": ("A woman in her 40s with an enormous, voluminous cloud of tight bright red-orange curly hair, much wider than her head, but still fitting inside the picture with white space around it, "
             "large gold hoop earrings, a dry unimpressed flat face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a long purple cardigan open over a mustard-yellow top, "
             "black leggings and brown ankle boots, holding one white paper takeaway coffee cup with a plain white lid and a brown cardboard sleeve in her right hand, the right arm bent with the cup "
             f"at chest height in front of her, her left arm at her side. {LOOK}"),
  # ---- the counter, from the dining room (the cashier works behind it) and from behind it (for the ending)
  "bg-counter": ("A fast-food restaurant drawn as a flat front-on stage set with no perspective: the back wall faces the viewer straight on; across the upper part of the wall hangs one huge, "
                 "completely blank, plain dark charcoal menu board in a thick warm wooden frame, with nothing on it at all, no writing, no pictures, no logo; "
                 f"below it {COUNTER} runs across the picture at about the middle, a cash register on the counter at the left; behind the counter on the left a plain steel fryer station and a steel heat-lamp shelf, "
                 "on the right of the back wall a plain swing door with a small round window; cream tiled walls, a light checkered floor in front of the counter. "
                 f"The counter's front panel is plain, with nothing on it. {SET}"),
  "bg-counter-back": ("The inside of a fast-food restaurant seen from the staff side of the counter, looking out into the dining room, front-on, with no perspective, filling the whole picture from edge to edge: "
                      f"no border, no frame and no white margins. At the bottom the long counter in the foreground, {COUNTER}, reaching both sides of the picture, with a cash register at the left of it; "
                      "beyond the counter a bright dining room: a big window across the back wall with a sunny sidewalk and a tree outside, a glass front door at the right, two plain booths with small tables "
                      "along the window, cream walls, a light checkered floor that runs down to the counter. No menu board, no people. "
                      f"The counter is plain, with nothing on it. {SET}"),
  # ---- the props (the totals on the screen and the menu board's words are drawn in code)
  "tray": f"A flat rectangular brown plastic fast-food tray lined with a plain white paper sheet, seen from the front and a little from above, holding one cheeseburger (a sesame bun, a brown patty, a slice of orange cheese, green lettuce) and a plain brown cardboard carton of golden french fries. {PROP}",
  "cup": f"A gigantic paper drink cup as big as a trash can, very wide and tall, plain white with one wide teal stripe, with a flat white plastic lid and a very long white straw sticking out of the top. {PROP}",
  "pies": f"Two golden-brown baked hand pies with crimped edges, each one sticking halfway out of a plain white paper sleeve, standing side by side. {PROP}",
  "hat": f"A white paper fast-food worker's hat seen exactly from the front and perfectly symmetrical: a flat-topped paper cap shaped like a short cylinder, with one narrow teal band around it and a short stiff brim at the bottom front, the brim facing the viewer. {PROP}",
  "hat-boat": f"A white folded paper hat as worn by diner and fast-food workers: a flat boat-shaped paper cap seen exactly from the front, a trapezoid that is wider at the top than at the bottom with a slightly curved top edge, one narrow teal stripe along its bottom edge, no brim. {PROP}",
  "hat-visor": f"A white paper visor cap seen exactly from the front and perfectly symmetrical: a rounded dome crown with one narrow teal band at its base and a short curved brim directly below it pointing at the viewer. {PROP}",
  "headset": f"A simple flat black headset drawn as flat black paper shapes with no shading and no highlights, seen straight from the front: a thick curved headband, a round ear cup at each end of the band, and a thin microphone boom coming from the left ear cup, curving forward with a small round microphone at its end. {PROP}",
  "screen": f"A small customer-facing payment display seen straight from the front: a rectangular dark screen with a thick light-grey plastic bezel, standing on a short sturdy stand with a round base. The screen is blank and dark. {PROP}",
}
SEEDS = {}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [SEEDS.get(name, 71)]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": "768x1344", "seed": seed})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
