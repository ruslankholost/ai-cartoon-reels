# Art for "Tip?" (docs/x02-tip.md), Qwen Image 2.1 Turbo 7B from the prompt alone, recipe C of E:\Wan2GP\my_tests\sp_cast.py (the South Park look, our own characters).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/tip-art-gen.py [name[:seed,seed] ...]     -> out/sp-cast3/<name>-<seed>.png
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call. Without a seed list a name gets the seed in SEEDS.
# Text is never painted (the prompts say so, and the screens, signs and receipts are drawn in code): scripts/tip-prep.py cuts and measures what comes out.
# v3 (docs/x02-tip.md) uses: denise-neutral, denise-bottle, denise-apron, denise-apron-out, kyle, kyle-jacket (seed 74: the head is as big as Kyle's own), line-a..d, attendant-stand, attendant-me,
# bg-store, bg-store-fridges, bg-selfcheck, bg-cafe, bg-cafe-wide2 (seed 73), terminal, kiosk, bag, hand-point, hand-jacket, tip-jar. The other jobs (Lily, the ATM, the lemonade stand, the tablet, the
# card, the phone and cash poses) are the record of v1's and v2's art; their pictures and cut-outs stay on disk, nothing in the composition reads them.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast3"); OUT.mkdir(parents=True, exist_ok=True)
LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show. Front view, full body, standing, arms at the sides unless a pose is described, on a plain white background. Vertical frame.")
SET = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. Background only, no people, no text, no letters and no numbers anywhere. Front-on view. Vertical frame.")
PROP = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "shapes, thin black outlines. A single object, centered, filling most of the frame, on a plain white background. No text, no letters and no numbers anywhere. Vertical frame.")
DENISE = ("A woman in her 40s with a messy brown hair bun on top of her head and a few loose strands, a tired flat face, mouth closed in a flat line, eyes open "
          "looking straight ahead, wearing a baggy grey hoodie with a front pocket, blue jeans and white sneakers")
DENISE_APRON = ("A woman in her 40s with a messy brown hair bun on top of her head and a few loose strands, a tired flat face, mouth closed in a flat line, eyes open looking straight ahead, wearing a baggy grey hoodie with long sleeves "
                "and over it a plain bright green apron with a strap around her neck that covers her chest and belly, blue jeans and white sneakers")
JOBS = {
  # ---- Denise in the hoodie: the same woman, five poses
  "denise-neutral": f"{DENISE}. {LOOK}",
  "denise-bottle": f"{DENISE}, holding up one small clear plastic water bottle with a blue cap in her right hand, the arm bent and raised to shoulder height in front of her, her left arm at her side. {LOOK}",
  "denise-tap": f"{DENISE}, her right arm bent and raised in front of her chest with only her index finger pointing forward as if she is tapping a screen, her left arm at her side. {LOOK}",
  "denise-phone": f"{DENISE}, holding a black smartphone in her right hand in front of her chest with the arm bent, her left arm at her side. {LOOK}",
  "denise-cash": f"{DENISE}, holding a small fan of green banknotes in her right hand in front of her chest with the arm bent, her left arm at her side. {LOOK}",
  # ---- the corner store
  "kyle": ("A skinny 19 year old guy with messy short brown hair, a bored flat face with his mouth closed in a flat line, wearing a red short-sleeved corner-store polo shirt with a "
           f"bright blue lanyard strap hanging around his neck down his chest with a small blank white ID badge at the bottom of it, khaki pants, standing with his arms hanging at his sides. {LOOK}"),
  "line-a": f"A man in his 30s with a brown ponytail and a short beard, in an orange hoodie, holding a bag of chips in his hand, a tired bored face, mouth closed. {LOOK}",
  "line-b": f"A woman in her 50s with short grey hair, in a teal jacket and black trousers, holding a loaf of bread under her arm, a patient bored face, mouth closed. {LOOK}",
  "line-c": f"A bald man in his 60s with round glasses, in a plaid flannel shirt and brown pants, holding a folded newspaper, a bored face, mouth closed. {LOOK}",
  "line-d": f"A teenage girl with two long braids, in a denim jacket and a long green skirt, holding a can of soda, a bored face, mouth closed. {LOOK}",
  "bg-store": f"The inside of a small corner store, front-on: a long counter across the bottom of the picture with a cash register area on it, behind the counter shelves of snacks and boxes, along the back wall a row of glass-door drink fridges full of bottles and cans, bright fluorescent ceiling lights, a plain white floor with lines. {SET}",
  "bg-store-fridges": f"The inside of a small corner store, front-on, seen from the customer's side: a back wall made of a row of four glass-door drink fridges full of bottles and cans, a snack aisle on the right, a tiled floor, bright fluorescent ceiling lights. No counter. {SET}",
  # ---- the supermarket
  "bg-selfcheck": f"The floor of a big supermarket seen from the end of the self-checkout area: an empty tiled floor in a wide hall, a row of bright ceiling lights, plain pale walls with a blank hanging sign, shelves far in the background. No machines and no people. {SET}",
  "kiosk": f"A self-checkout machine seen from the front: a white and grey kiosk with a big touchscreen near the top showing a blank dark grey screen, a barcode scanner window and a card reader below it, a bagging shelf on the right, and a tall thin pole rising from the top of the kiosk with a round light bulb on the end that is switched off. {PROP}",
  "attendant": f"A man in his 60s with thinning grey hair and a grey moustache, a tired kind face with his mouth closed in a flat line, wearing a bright blue store vest over a white shirt with a plain blank name badge, khaki pants, standing with his arms hanging at his sides. {LOOK}",
  "attendant-thumb": f"A man in his 60s with thinning grey hair and a grey moustache, a tired embarrassed face with his mouth closed, wearing a bright blue store vest over a white shirt, khaki pants, his right thumb pointing at his own chest with the right arm bent, his left arm hanging at his side. {LOOK}",
  "bag": f"An open white plastic grocery bag standing upright and stuffed with groceries: a loaf of bread, a carton and a few red apples sticking out of the top. {PROP}",
  # ---- the bank
  "bg-atm": f"The outside wall of a bank building seen straight on: a pale stone wall with a big glass door at the far left edge, and an ATM machine built into the wall at the center-right at chest height: a grey ATM with a big blank dark screen, a plain keypad of buttons, a card slot with a small light and a cash slot below it, a small street lamp hanging above, a grey sidewalk at the bottom. {SET}",
  # ---- the street
  "bg-street": f"A quiet suburban sidewalk in the afternoon seen front-on: a green lawn, a white house with a porch in the background, a leafy tree, a clean grey sidewalk across the bottom of the picture. {SET}",
  "stand": f"A small wooden lemonade stand seen from the front: a table with a front panel, a blank cardboard sign hanging on the front panel, a glass pitcher of yellow lemonade and two paper cups on the table top, a striped red and white awning on two posts. {PROP}",
  "lily": f"A girl, 8 years old, with brown hair in two pigtails tied with pink bands, a calm bored face with her mouth closed in a flat line, wearing a yellow t-shirt and blue shorts, sitting on a small wooden stool with her hands on her knees. {LOOK}",
  # ---- the props with screens (the screens are painted blank and drawn in code)
  "terminal": f"A handheld card payment terminal seen from the front, from the customer's side, on a short flexible black swivel arm that comes up from the bottom of the picture: a chunky black and grey device with a big blank dark screen, a small card slot on top and a few plain grey buttons below the screen. {PROP}",
  "tablet": f"A tablet on a small desk stand seen from the front, with a small square white card reader attached beside it: a thin dark tablet with a blank dark screen and a white square card reader with one tiny light. {PROP}",
  "card": f"A single plain blue bank card seen from the front, a rounded rectangle with a small gold square chip on the left and a plain white stripe along the bottom, nothing written on it. {PROP}",
  "attendant-me": f"A man in his 60s with thinning grey hair and a grey moustache, a tired embarrassed face with his mouth closed, wearing a bright blue store vest over a white shirt, khaki pants. His right arm is bent with the elbow out and his right hand is closed into a fist with only the thumb stuck out sideways, the thumb pointing back at his own chest, the way a person points at himself saying 'me'. His left arm hangs at his side. {LOOK}",
  "attendant-stand": f"A man in his 60s with thinning grey hair and a grey moustache, a tired embarrassed face with his mouth closed, wearing a bright blue store vest over a white shirt, khaki pants. Both of his arms hang straight down at his sides. {LOOK}",
  "hand-point": f"A cartoon hand and forearm in a baggy grey hoodie sleeve with a ribbed cuff, reaching up from the bottom edge of the picture, seen from the front, palm down, the hand a plain rounded mitten in light peach skin with a short thumb and one extended index finger pointing straight up. {PROP}",
  # ---- v3 (docs/x02-tip.md): the coffee shop. Denise's face and Kyle's face are the old ones (tip-prep.py puts the master's head on every body), so only bodies and sets are made here
  "denise-apron": f"{DENISE_APRON}, her arms at her sides. {LOOK}",
  "denise-apron-out": f"{DENISE_APRON}, her right arm bent and held out in front of her at shoulder height with her hand closed in a loose fist, as if she is holding a device out at arm's length, her left arm at her side. {LOOK}",
  "kyle-jacket": ("A skinny 19 year old guy with messy short brown hair, a bored flat face with his mouth closed in a flat line, wearing an open navy-blue puffy winter jacket with thick quilted stripes over a red short-sleeved polo shirt, "
                  "a bright blue lanyard strap hanging around his neck down his chest with a small blank white ID badge at the bottom of it, khaki pants, holding up one small clear plastic water bottle with a blue cap in his right hand, "
                  f"the arm bent and raised to shoulder height in front of him, his left arm at his side. {LOOK}"),
  "bg-cafe": f"The inside of a small coffee shop, front-on, seen from the customer's side: a long wooden counter across the bottom of the picture with a brown front panel and a light wood top, a cash register on the counter at the left, behind the counter on the back wall a big black blank chalkboard menu hanging at the center, a shiny chrome espresso machine on a back shelf at the left, wooden wall shelves with rows of white cups on the right, two round warm pendant lamps hanging from the ceiling, warm cream walls, a light wood plank floor. {SET}",
  "bg-cafe-wide": f"The inside of a small coffee shop, front-on, seen from the customer's side, a wide view of the whole room: on the left half a long wooden counter with a shiny chrome espresso machine and wall shelves of white cups behind it and a big black blank chalkboard menu hanging above, on the right half an open doorway in the wall with no door in it and a bright sidewalk and street seen through it, a small round table with two chairs next to the doorway, round warm pendant lamps hanging from the ceiling, warm cream walls, a light wood plank floor. {SET}",
  "bg-cafe-wide2": f"The inside of a small coffee shop drawn as a flat front-on stage set with no perspective: the back wall faces the viewer straight on; on the left half a long wooden counter across the bottom of the picture with a cash register on it, behind the counter a chrome espresso machine on a shelf, wall shelves of white cups and a big black blank chalkboard menu hanging on the wall; on the right half of the back wall an empty doorway with no door in it and a bright sidewalk and street seen through it; a small round table with two chairs at the right; warm round pendant lamps; warm cream walls; a light wood plank floor. {SET}",
  "tip-jar": f"A tip jar: a tall clear glass jar with a wide mouth and a black plastic lid with a slot in it, a blank plain white paper label stuck on the front of the jar, and exactly two gold coins lying at the bottom of the jar. {PROP}",
  "hand-jacket": f"A cartoon hand and forearm in a puffy navy-blue quilted jacket sleeve with a ribbed cuff, reaching up from the bottom edge of the picture, seen from the front, palm down, the hand a plain rounded mitten in light peach skin with a short thumb and one extended index finger pointing straight up. {PROP}",
  "hand-phone": f"A cartoon hand and forearm in a baggy grey hoodie sleeve with a ribbed cuff, reaching up from the bottom edge of the picture, the hand a plain rounded mitten in light peach skin holding a black smartphone upright with the back of the phone facing the viewer. {PROP}",
}
SEEDS = {"denise-neutral": 61, "denise-bottle": 61, "denise-tap": 61, "denise-phone": 61, "denise-cash": 61, "denise-apron": 61, "denise-apron-out": 61, "kyle-jacket": 74}
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
