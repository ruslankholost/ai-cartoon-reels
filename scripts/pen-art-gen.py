# Art for "I'm Just Not a Sales Person" (docs/x04-sell-me-this-pen.md, script v6), Qwen Image 2.1 Turbo 7B from the prompt alone, recipe C of E:\Wan2GP\my_tests\sp_cast.py (the South Park look, our own characters),
# modeled on scripts/because-art-gen.py and scripts/tip-art-gen.py.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/pen-art-gen.py [name[:seed,seed] ...]     -> out/sp-cast5/<name>-<seed>.png
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call. Without a seed list a name gets the seed in SEEDS (71 if it is not there).
# Text is never painted (the prompts say so; the poster's words, the badge, the boxes' labels, the phone and the card reader's screen are drawn in code): the prep script cuts and measures what comes out.
# No real brand: no logos, no brand names.
# A character with several poses has ONE description and ONE seed, the master's, and only the pose part of the prompt changes (scripts/tip-prep.py puts the master's head on every pose):
#   Denise: DENISE_FACE / DENISE / DENISE_BLAZER, seed 61, master out/sp-cast3/denise-neutral-61.png (tip-art-gen.py)   Rhonda: RHONDA, seed 71, master out/sp-cast4/rhonda-71.png (because-art-gen.py, her coffee cup left out)
#   Brandon, the clerk, the hostess: new masters made here (brandon, clerk, hostess); their poses use the same description and the master's seed (SEEDS below).
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast5"); OUT.mkdir(parents=True, exist_ok=True)
LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show. Front view, full body, standing, arms at the sides unless a pose is described, on a plain white background. Vertical frame.")
LOOK_SIT = LOOK.replace("standing, arms at the sides unless a pose is described, ", "")  # (a seated pose must not be told "standing")
SET = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. Background only, no people, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
PROP = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "shapes, thin black outlines. A single object, centered, filling most of the frame, on a plain white background. No text, no letters, no numbers and no logos anywhere. Vertical frame.")
FILL = "drawn as a flat front-on stage set with no perspective, filling the whole picture from edge to edge: no border, no frame and no white margins"
# the second take for the sets that came out as a room in perspective (bg-garage, bg-hall1950) or with white bands above and below (bg-living1950)
FLAT = ("drawn as a flat painted theatre backdrop seen exactly straight on, with no perspective at all: only the flat back wall and the floor are visible, no side walls, no ceiling and no converging lines; "
        "the wall reaches the top edge of the picture and the floor reaches the bottom edge, filling the whole picture from edge to edge: no border, no frame and no white margins")
# ---- Denise: the words of tip-art-gen.py (DENISE) and the same face and hair words for the blazer
DENISE_FACE = ("A woman in her 40s with a messy brown hair bun on top of her head and a few loose strands, a tired flat face, mouth closed in a flat line, eyes open "
               "looking straight ahead, wearing ")
DENISE = DENISE_FACE + "a baggy grey hoodie with a front pocket, blue jeans and white sneakers"
DENISE_BLAZER = DENISE_FACE + "a navy-blue blazer worn open over the same baggy grey hoodie, the grey hoodie showing in the middle of her chest and bunched at her neck, blue jeans and white sneakers"
# ---- Rhonda: the words of because-art-gen.py (rhonda), up to her boots; the coffee cup is not in the pictures made here
RHONDA = ("A woman in her 40s with an enormous, voluminous cloud of tight bright red-orange curly hair, much wider than her head, but still fitting inside the picture with white space around it, "
          "large gold hoop earrings, a dry unimpressed flat face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a long purple cardigan open over a mustard-yellow top, "
          "black leggings and brown ankle boots")
CHAIR = "a plain folding lawn chair with a silver aluminium tube frame, tubular armrests and green woven webbing on the seat and back"
BEER = "a plain silver aluminium beer can with a blank unlabelled side"
# ---- Brandon: one description for the master and every pose
BRANDON = ("A man in his 30s with slick gelled-back dark hair, a confident smug face with his mouth closed in a small smirk, eyes open looking straight ahead, "
           "wearing a shiny electric-blue suit jacket and matching trousers over a white shirt open at the collar with no tie, a gold wristwatch on his left wrist, "
           "a small blank white rectangular name badge pinned on the chest of the jacket, shiny black dress shoes")
# ---- the 1949 clerk
CLERK = ("A thin bored store clerk in his 50s in 1940s style, with centre-parted slicked-down dark brown hair, small round black-rimmed glasses, a bored flat face with his mouth closed in a flat line, "
         "eyes open looking straight ahead, wearing a white collared shirt with black elastic sleeve garters on his upper arms, a black bow tie, a plain grey vest, dark trousers and black shoes")
# ---- the 1950s hostess and her three guests
HOSTESS = ("A cheerful woman in her 30s in 1950s style, with short dark brown curled hair, a friendly face with her mouth closed in a small closed-lip smile, eyes open looking straight ahead, "
           "wearing a fitted pastel-pink dress with long sleeves and a white collar, a pearl necklace and low white shoes")  # (long sleeves: the first take left the sleeves open and they came out long, short and elbow-length in three pictures)
FORM = "a small blank white paper form with nothing printed on it in her left hand and a black ballpoint pen in her right hand, both held in front of her waist"
JOBS = {
  # ---- Denise: poses on out/sp-cast3/denise-neutral-61.png (seed 61)
  # (the first take, "... her left hand resting on the chair's armrest", was fine to look at, but its two eye whites ran together into one blob, and tip-prep.py's find_eyes then took two white gaps of the chair frame for the eyes)
  "denise-chair-phone": f"{DENISE}, sitting upright in {CHAIR}, seen from the front, holding a black smartphone in her right hand in front of her chest with the arm bent, her left hand resting flat on top of the chair's armrest. {LOOK_SIT}",
  "denise-chair-beer": f"{DENISE}, sitting upright in {CHAIR}, seen from the front, holding {BEER} in her right hand, and holding a plain pale-blue plastic bowl full of potato chips on her lap with her left hand. {LOOK_SIT}",
  "denise-blazer": f"{DENISE_BLAZER}, standing and holding one blank white sheet of paper (a job resume with nothing written on it) in both hands in front of her waist. {LOOK}",
  "denise-blazer-pat": f"{DENISE_BLAZER}, standing with both hands flat on the blazer's side pockets at her hips, her elbows bent out a little, as if patting her pockets looking for something. {LOOK}",
  # (the first wording, "closed in a loose fist as if holding a pen, with nothing in the hand", painted a tiny silver pen tip sticking out of the fist: the word "pen" is left out)
  "denise-blazer-fist": f"{DENISE_BLAZER}, standing, her right arm bent with her right hand raised to chest height, closed in a loose upright fist with the thumb on top, curled around nothing, the hand completely empty with nothing sticking out of it, her left arm hanging at her side. {LOOK}",
  # ---- Rhonda: poses on out/sp-cast4/rhonda-71.png (seed 71), no coffee cup
  "rhonda-chair-beer": f"{RHONDA}, sitting upright in {CHAIR}, seen from the front, holding {BEER} in her right hand at chest height with the arm bent, her left hand resting on the chair's armrest. {LOOK_SIT}",
  "rhonda-beers": f"{RHONDA}, standing, holding one {BEER} in each hand at waist height, both arms bent a little at her sides. {LOOK}",
  # ---- Brandon (new): the master and three poses
  "brandon": f"{BRANDON}, standing with his arms hanging at his sides. {LOOK}",
  "brandon-reader": f"{BRANDON}, holding a small black handheld card reader (a plain black rounded rectangle with a small dark blank screen) up in his right hand at chest height with the arm bent, his left arm hanging at his side. {LOOK}",
  # (the first wording, "pointing back over his right shoulder with his right thumb ... his left hand on his hip", came out mirrored: the thumb on the picture's right side, on the watch arm)
  "brandon-point": f"{BRANDON}, his right arm, on the left side of the picture, bent upward with the fist at shoulder height and the thumb pointing up and back over his right shoulder, as if pointing at something on the wall behind him, his left hand on his left hip, on the right side of the picture. {LOOK}",
  "brandon-rip": f"{BRANDON}, his right arm raised high above his head out to the side, the hand closed as if gripping the corner of a poster on a wall, his left arm hanging at his side. {LOOK}",
  # ---- the 1949 clerk (new)
  "clerk": f"{CLERK}, standing with his arms hanging at his sides. {LOOK}",
  # (the first wording, "holding one plain pale-blue plastic bowl up in front of him with both hands, just below his chin...", left both arms hanging and the bowl floating under his chin)
  # (the second wording, "... the bowl lifted up just below his chin with its rim close to his mouth", gave both hands but the rim sat on his mouth: the master's head sprite would hide the top of the bowl)
  "clerk-bowl": f"{CLERK}, his elbows bent and both forearms raised in front of his chest, his two hands holding one plain pale-blue plastic bowl, one hand on each side of the bowl, the bowl held in front of his chest with its top rim level with his collar just below his chin, so that the bowl does not cover his face, as if he is about to blow the dust off it. {LOOK}",
  # ---- the 1950s hostess (new, generic)
  "hostess": f"{HOSTESS}, standing with her arms hanging at her sides. {LOOK}",
  "hostess-bowl": f"{HOSTESS}, holding up one pastel-turquoise plastic bowl with a matching lid in her right hand, the arm bent and raised to shoulder height, presenting it to the viewer, her left arm hanging at her side. {LOOK}",
  "hostess-box": f"{HOSTESS}, carrying a plain closed brown cardboard box with nothing written on it in both arms in front of her waist. {LOOK}",
  # ---- the three 1950s guests (new, one picture each; each holds a blank form and a pen)
  "guest1": ("A plump woman in her 50s with short grey set curls, a glazed blank face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a lavender 1950s dress with a round collar and low shoes, "
             f"standing, holding {FORM}. {LOOK}"),
  "guest2": ("A thin woman in her 40s with a tall blonde bouffant hairdo, cat-eye glasses, a glazed blank face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a mint-green 1950s dress and low shoes, "
             f"standing, holding {FORM}. {LOOK}"),
  "guest3": ("A woman in her 30s with a long black ponytail tied with a red scarf, a glazed blank face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a yellow 1950s dress with small white polka dots and low shoes, "
             f"standing, holding {FORM}. {LOOK}"),
  # ---- the sets
  # (the first take used FILL and came out as a room in perspective: side walls, a sloping ceiling, the door on the right wall)
  "bg-garage": ("A suburban garage at night " + FLAT + ". One bare light bulb hangs on a short cord from the top edge of the picture at the center and lights the garage with a warm yellow glow, "
                "everything else dim, in dark blue-grey night shadows. A grey concrete floor across the bottom third of the picture. At the left of the back wall a pegboard with a few simple tools hanging on it, and a small mini fridge standing on the floor under it; "
                "a grey metal shelf unit with a few plain paint cans on it; at the far right end of the back wall a plain closed side door. The middle of the back wall and the middle of the floor are empty. "
                f"No chairs, no boxes. {SET}"),
  "bg-office": ("A small cheap rented office, seen from the boss's side, " + FILL + ". The back wall faces the viewer straight on: a plain light-grey wall with a big empty space in the middle of it, nothing hanging there. "
                "A fake potted plant in a plain white pot at the right, closed white blinds on a window at the left. A modern plain white desk runs across the whole lower part of the picture from the left edge to the right edge, "
                f"its top seen from the front with nothing on it, with a thin strip of grey carpet below it. No chair, no people. {SET}"),
  "bg-office-back": ("The same small cheap rented office seen from the other side, " + FILL + ". Plain light-grey walls; in the middle of the back wall a door with a big frosted glass panel in it (the glass is plain, with no writing); "
                     "a water cooler with a big water bottle on top of it at the left of the door, a coat rack at the right of the door; a thin strip of grey carpet along the bottom. No desk, no people. "
                     f"{SET}"),
  "bg-store1949": ("A 1940s department store " + FILL + ". The back wall faces the viewer straight on, covered with wooden shelves with only a few plain bowls on them. A long wooden shop counter with a polished wood top and a plain wooden front panel runs across the picture "
                   "with its top at about the middle of the picture, piled along its top with tall stacks of plain pastel plastic bowls (pink, mint, yellow and pale blue). A ceiling fan with four wooden blades hangs from the ceiling at the top center. "
                   f"Cream walls, a wooden floor. No signs, no price tags. {SET}"),
  "bg-living1950": ("A 1950s living room " + FLAT + ". A long pastel mint-green sofa against the back wall, wide enough for three people, with a low back; "
                    "in front of the sofa a low wooden coffee table with a few pastel plastic bowls on it; a standing floor lamp with a cream lampshade at the left; a window with pastel-pink curtains at the right; "
                    f"pale yellow walls, a wooden floor. {SET}"),
  "bg-hall1950": ("A 1950s office hallway " + FLAT + ". In the middle of the wall a wooden door with a frosted glass panel in the upper half (the glass is plain, with no writing on it), "
                  f"dark wood panelling on the wall on both sides of the door, a polished wooden floor across the bottom of the picture. No other doors. {SET}"),
  # ---- the props
  "pen": f"A black-and-silver click ballpoint pen lying exactly horizontal, stretching across the full width of the picture: a glossy black barrel, a silver clip along the top, a silver push button at the left end and a silver tip at the right end. {PROP}",
  "box": f"A plain closed brown cardboard box seen exactly from the front, a flat front face with a thin sliver of its top, with a strip of plain tan packing tape across the top seam and nothing written or printed on it. {PROP}",
  "pallet": f"A wooden shipping pallet seen exactly from the front: a flat wide stack of plain light wooden planks, a row of top boards, three chunky square wooden blocks, and a row of bottom boards, nothing written on it. {PROP}",
  # (the first take had a pale, nearly white sky and a white bottom band: they melt into the white background and a cut-out would eat them. The sky is a clear light blue and the bottom band dark navy)
  "poster": ("A big rectangular poster seen exactly from the front, filling the whole frame from edge to edge: a white luxury yacht sailing on bright blue water under a bright sunny light-blue sky with a few small white clouds, "
             "the sky and the sea reaching the left and the right edges of the picture; an empty plain solid royal-blue band across the very top of the poster, about a seventh of its height; "
             f"and a thin empty plain solid dark navy band across the very bottom, about a twentieth of its height. {PROP}"),
}
# the seeds of the recommended pictures: a pose uses its master's seed (Denise 61, Rhonda 71; Brandon 72 of the tried 71, 72, 73: the biggest head and the clearest smirk; the clerk 72 of 71, 72: the head as wide as the shoulders;
# the hostess and the guests 71). Also 72: bg-garage (71 has a small box on the shelf, 73 white margins and boxes), pallet (71 has two decks), poster (71 has a pale sky). The other tried seeds stay in out/sp-cast5 (brandon-71, -73, clerk-71, bg-garage-71, -73, pallet-71, poster-71).
SEEDS = {"denise-chair-phone": 61, "denise-chair-beer": 61, "denise-blazer": 61, "denise-blazer-pat": 61, "denise-blazer-fist": 61, "rhonda-chair-beer": 71, "rhonda-beers": 71,
         "brandon": 72, "brandon-reader": 72, "brandon-point": 72, "brandon-rip": 72, "clerk": 72, "clerk-bowl": 72, "bg-garage": 72, "pallet": 72, "poster": 72}
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
