# Art for x09 "Habits of the Rich" (docs/x09-habits-of-the-rich.md): Ross, Denise, the guru and a seminar crowd as South Park puppets, the three plates, the props and the inserts.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x08-art-gen.py (the LOOK words are its, and scripts/lips-art-gen.py's).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x09-art-gen.py [name[:seed,seed] ...]     -> out/x09-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. Without a seed list a name gets SEEDS (61, 62 if it is not there).
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the characters, poses and props); "I" and no reference give the size below (plates and inserts, 768 x 1344).
# Text is never painted (the prompts say so; the title on the screen, the TAX label, the notebook's words and the clock's hands are drawn in code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head), the second his avatar. No ghost.
# Denise: the first reference is her seated Pen picture (out/sp-cast5/denise-chair-phone-61.png) padded to a square (ref-denise.png, made here).
# A character with poses has ONE description and its master's seed in PICK (a pose and a crowd member's raised arm and turned head take the master as the reference); set PICK after looking at the pictures.
# Plates, props and inserts are in the flat paper words (SET, PROP, SCENE): the first takes in the plainer words came out as photographs and renders. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x09-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
DENISE_SRC = r"E:\getphantom-toons\out\sp-cast5\denise-chair-phone-61.png"
# the kept master of each character that has references (name -> seed); a reference named here is out/x09-cast/<name>-<seed>.png
PICK = {"guru": 70, "furman": 61, "crowd-1": 61, "crowd-2": 61, "crowd-3": 61, "crowd-4": 61, "crowd-5": 61, "crowd-6": 61}

LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show.")
LOOK_SHUT = LOOK.replace("Two big white oval eyes touch each other, with small black dot pupils. ", "")  # (the cannonballs squeeze their eyes shut)
FIT = "Full body, the whole figure fits inside the square picture with a wide white margin all round, on a plain white background."
FIT_BIG = "Full body, the figure is large and fills most of the square picture, the whole figure inside it with a small white margin all round, on a plain white background."
# (the first plates, with chandeliers and a glossy stage in the same SET words minus the second sentence, came out as photographs; a plate must be flat paper shapes like the puppets)
SET = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
       "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing. Background only, no people in front, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
# (the first props, in the older PROP words, came out as shaded renders and a photograph of a notebook: a prop must be flat paper shapes like the puppets)
PROP = ("Drawn exactly in the style of the TV cartoon South Park: a flat construction-paper cut-out cartoon, one simple flat-coloured shape per part, thick black outlines, solid colors with no gradients, no shading, "
        "no highlights, no shine, no shadow and no texture, like a child's drawing, not a photograph and not a 3D render. A single object, centered, filling most of the frame, on a plain white background. "
        "No text, no letters, no numbers and no logos anywhere.")
SCENE = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
         "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing; the people with huge round heads, big white oval eyes with small black dot pupils, no noses and mitten hands. "
         "A flat front-on scene filling the whole picture from edge to edge, no border. No text, no letters and no numbers anywhere. Vertical frame.")
CHAIR = "a plain black padded banquet chair with a chrome metal frame"
HEADSET = ("a thin black headset microphone on his head: a thin band over the top of his head, a small pad on one ear and a thin arm with a small round black microphone at the end "
           "reaching to the corner of his mouth")
GOLD = "a shiny metallic gold suit jacket and matching gold trousers over a crisp white shirt open at the collar with no tie, and shiny gold shoes"
ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
GURU = ("A slick showman in his 30s with slicked-back dark hair tied up in a small round man-bun on top of his head, a thin black pencil mustache, skin in a flat light tan, a pale beige-brown (about hex #E3BC8D), a little darker than pale peach skin and clearly not orange, not red and not yellow, "
        f"a huge wide smile showing a full row of big perfectly white teeth, {HEADSET}, wearing {GOLD}")
GURU_AGAIN = ("The same man as in the picture, with the same face, the same slicked-back hair with the small man-bun, the same pencil mustache, the same headset microphone and the same shiny gold suit")
DENISE_AGAIN = ("The same woman as in the picture, with the same face, the same messy brown hair bun with a few loose strands, the same baggy grey hoodie, blue jeans and white sneakers, "
                "a tired flat face with her mouth closed in a flat line, eyes open looking straight ahead")
FUR = ("A heavyset man in his 50s with a bald head and thick grey hair at the sides, a bushy grey mustache, light peach skin, a sly smug smirk, wearing a long fluffy dark-brown fur coat that reaches his shins "
       "over a black suit with a gold tie, gold rings on his fingers and shiny black shoes")
LANYARD = "a blue conference lanyard around the neck with a small blank white badge on it"
CROWD = {  # six seminar attendees, one description each; the raised-arm picture takes the seated one as its reference
  "crowd-1": "An old man in his 70s with thick white hair and bushy white eyebrows, a kind wrinkled face, light peach skin, small round wire-rimmed glasses, a beige knitted cardigan with buttons over a checked shirt, grey trousers and brown shoes",
  "crowd-2": "A young Black woman in her 20s with a big round natural afro hairstyle, medium-dark brown skin, a mustard-yellow blazer over a white top, black trousers and white sneakers",
  "crowd-3": "A heavyset balding white man in his 40s with a thin ring of brown hair, a stubbly chin, light peach skin, rimless glasses, a light-blue button-up shirt with the sleeves rolled up and a loosened dark tie, khaki trousers and black shoes",
  "crowd-4": "An East Asian woman in her 30s with a straight black bob haircut with bangs, light tan skin, a dark grey blazer over a white blouse, black trousers and black flat shoes",
  "crowd-5": "A Latino man in his 30s with short black hair and a short dark beard, medium brown skin, a navy-blue polo shirt, blue jeans and brown loafers",
  "crowd-6": "A South Asian woman in her 50s with brown skin, long black hair with grey streaks in a low ponytail, red-framed glasses, a teal cardigan over a cream blouse, dark trousers and flat shoes",
}

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
JOBS = {
  # ---- Ross, 1024 x 1024
  "ross-chair": job(f"{ROSS_HEAD}, {TEE}. His mouth is closed in a flat line, eyes open looking straight ahead. He sits upright on {CHAIR}, seen from the front, his knees toward the viewer, both hands resting flat on his knees with nothing in them. {LOOK} {FIT}",
                    [ROSS_MASTER, AVATAR]),
  "ross-board": job(f"{ROSS_HEAD}, {TEE}, his mouth closed in a flat line, eyes open. He stands with his body turned three-quarters toward the left edge of the picture and his face turned to look at the viewer. "
                    "His right arm, the one on the left side of the picture, is raised and bent at shoulder height and his mitten hand holds one thick black felt-tip marker, its tip pointing to the left, "
                    f"as if writing on a board that is outside the picture to his left. His other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", [ROSS_MASTER, AVATAR]),
  "ross-slam": job(f"{ROSS_HEAD}, {TEE}. He stands leaning forward, his body turned three-quarters toward the left edge of the picture and his face turned to look at the viewer, his eyes wide and his mouth clenched. "
                   "His right arm, the one on the left side of the picture, is thrust straight out to the left at shoulder height, his fist clenched hard around one thick black felt-tip marker pointing left, "
                   f"as if slamming it onto a board that is outside the picture to his left. His other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", [ROSS_MASTER, AVATAR]),
  "ross-headset": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer with both arms raised and bent, his two mitten hands at the sides of his head holding a black headset microphone "
                      "(a thin black band over the top of his head, a pad on one ear and a thin arm with a small round black microphone reaching toward the corner of his mouth) as if he is just putting it on. "
                      f"A sheepish look: his eyes glance to the side and his mouth is a small awkward crooked smile. {LOOK} {FIT}", [ROSS_MASTER, AVATAR]),
  # the same pose with the guru's own headset (the third picture), so the one he puts on is the one the guru wore; only the headset is copied from the guru
  "ross-headset-g": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer with both arms raised and bent, his two mitten hands at the sides of his head, just putting on a headset microphone that is exactly the headset worn by the man in the third picture "
                        "(only that headset is copied from the third picture: a thin black band over the top of the head, one black ear pad and a thin arm with a small round black microphone reaching to the corner of the mouth); he stays the man of the first two pictures "
                        f"with his own face, hair and plain black t-shirt. A sheepish look: his eyes glance to the side and his mouth is a small awkward crooked smile. {LOOK} {FIT}", [ROSS_MASTER, AVATAR, "guru"]),
  "ross-gold": job(f"{ROSS_HEAD}, but he wears {GOLD}, and {HEADSET}. The gold jacket sleeves cover his arms. He is in mid-air in a cannonball jump, seen from the front, his knees pulled up and hugged tightly to his chest "
                   "by both arms, his body curled in a tight ball, both feet off the ground, his eyes squeezed shut as two thick black curved lines and his cheeks puffed out round, his mouth shut tight. "
                   f"{LOOK_SHUT} {FIT}", [ROSS_MASTER, AVATAR]),
  # ---- Denise, 1024 x 1024 (her face and head are the old ones; the body is new)
  "denise-note": job(f"{DENISE_AGAIN}. She sits upright on {CHAIR}, seen from the front, with a spiral-bound notebook lying open on her lap (its page blank, held by her left hand) and a bright pink ballpoint pen "
                     f"in her right hand, its tip resting on the page as if she is about to write. She holds no phone. {LOOK} {FIT}", [str(OUT / "ref-denise.png")]),
  # ---- the guru: the master, then four poses on it
  "guru": job(f"{GURU}. He stands facing the viewer, seen from the front, his right fist raised high above his head in a hype pose, his other arm bent with the fist at his waist, his chest out, a confident grin. {LOOK} {FIT}"),
  "guru-cannon": job(f"{GURU_AGAIN}. He is in mid-air in a cannonball jump, seen from the front, his knees pulled up and hugged tightly to his chest by both arms, his body curled in a tight ball, both feet off the ground, "
                     f"his eyes squeezed tightly shut, each one a big white oval with a thick black angled line across it like a '>' and a '<', his cheeks puffed out round, his mouth pressed shut with no teeth showing. {LOOK_SHUT} {FIT_BIG}", ["guru"]),
  "guru-smash": job(f"{GURU_AGAIN}. He leans far forward and down, seen from the front, his right arm swinging down hard with the fist clenched as if smashing something on the floor (nothing is drawn there), "
                    f"his left arm flung back behind him, his knees bent, a furious shout: mouth wide open showing his big white teeth, eyes wide. {LOOK} {FIT}", ["guru"]),
  "guru-toast": job(f"{GURU_AGAIN}. He stands, seen from the front, his right arm raised high above his head holding a tall clear drinking glass filled with bright yellow liquid as if making a toast, "
                    f"his other fist on his hip, a huge grin showing his big white teeth. {LOOK} {FIT}", ["guru"]),
  "guru-caught": job(f"{GURU_AGAIN}. He is crouched low in a squat, seen from the front, his knees bent and spread, holding a small black handheld card reader (a plain rectangle with a blank screen and a few small plain buttons) "
                     "in his right hand and a plain blue plastic credit card with nothing printed on it in his left hand, his eyes wide open in shock with tiny pupils, his mouth a tight closed grimace, "
                     f"frozen as if he has just been caught. {LOOK} {FIT}", ["guru"]),
  # ---- the crowd, 1024 x 1024: six seated, then the same six with an arm up (empty open hand)
  **{k: job(f"{v}, mouth closed in a flat line, eyes open looking straight ahead, sitting upright on {CHAIR}, seen from the front, both hands resting in the lap, wearing {LANYARD}. {LOOK} {FIT}")
     for k, v in CROWD.items()},
  **{k + "-up": job(f"The same person as in the picture, with the same face, hair and clothes and the same lanyard, sitting on the same chair, now with one arm raised straight up above the head and the hand open and empty with the fingers spread, "
                    f"the other hand resting in the lap. {LOOK} {FIT}", [k]) for k in CROWD},
  # shot 21: the whole crowd turns to look at the guru at the edge of the stage, to frame right
  **{k + "-turn": job(f"The same person as in the picture, with exactly the same face, hair and clothes (nothing added to the face), the same lanyard, the same chair and the same seat pose, but the head is turned sharply toward the right edge of the picture, "
                      "in three-quarter view turning to profile, both big white oval eyes with their black dot pupils looking to the right; the body still faces the front with both hands resting in the lap. "
                      f"{LOOK} {FIT}", [k]) for k in CROWD},
  # ---- the plates, 768 x 1344
  "bg-stage": job("The front of a hotel ballroom stage seen from the front row, drawn as a flat front-on stage set with no perspective, filling the whole picture from edge to edge with no border: across the upper half one giant "
                  "plain solid dark grey rectangle with a thin light-grey frame, the blank projection screen, as wide as the stage and with nothing on it; at the far left and the far right of the stage two tall plain black rectangular "
                  "pillars with small round tops (pyrotechnic columns, unlit, no flames, no sparks) standing on the stage floor; a thick gold curtain, a flat gold shape with a few simple fold lines, at each side; "
                  "a row of round yellow stage lights along a black bar at the very top; a flat light-brown wooden floor with thin plank lines across the lower third of the picture, nothing and nobody on it. "
                  f"{SET}", res="768x1344"),
  "bg-crowd": job("The inside of a hotel ballroom seen from the stage, drawn as a flat front-on stage set: straight horizontal rows of identical simple black chairs (each a flat black rounded back, a flat black seat and thin grey legs) "
                  "on a flat dark red carpet, the rows going back and getting smaller toward the top of the picture; the two nearest rows at the bottom of the picture are completely empty, no people in them; "
                  "the farther rows higher up have simple flat paper people sitting in them (round heads, simple bodies) in dim muted navy, brown and purple, with dim muted faces, not black; "
                  f"two simple flat gold chandeliers hang from a flat cream ceiling across the top of the picture; flat warm beige walls. {SET}", res="768x1344"),
  "bg-board": job("A big plain white rectangular whiteboard with a thin grey frame on a wooden easel, seen exactly from the front, filling most of the picture: its surface completely clean, plain white with nothing on it, "
                  "a small grey marker tray along its bottom edge with nothing on it, the easel's two wooden legs and a wooden crossbar below it, in front of a flat pale blue-grey wall, a flat brown floor strip along the very bottom. "
                  f"{SET}", res="768x1344"),
  # ---- the props
  "prop-tub": job(f"A single round galvanized metal washtub drawn as a flat light-grey cut-out shape, seen from the front and a little from above: a wide rim, two ring-shaped side handles and two horizontal ribs around its side, heaped to the brim with a pile of pale-blue ice cubes, each cube a flat pale-blue rounded square with a thin white edge. {PROP} Square frame."),
  "prop-clock": job(f"A single classic twin-bell alarm clock drawn as flat cut-out shapes, seen exactly from the front: a round flat red body, a round flat white clock face that is completely blank (no numbers, no hands and no marks), two flat light-grey bells on top side by side with a small flat grey hammer between them, and two small flat grey legs at the bottom. {PROP} Square frame."),
  "prop-notebook": job(f"A spiral-bound notebook lying open, drawn as flat cut-out shapes and seen exactly from above, filling most of the frame: a row of flat grey wire spiral loops along the top edge and below them one big flat cream page with thin pale-blue horizontal ruled lines and a thin pink vertical margin line near the left edge, a thin flat blue cover edge showing under the page, nothing written on it. {PROP} Vertical frame.", res="768x1344"),
  # ---- the inserts, 768 x 1344
  "furman": job(f"{FUR}. He stands facing the viewer with his arms at his sides. {LOOK} {FIT}"),
  "ins-tax": job("A flat scene with a plain wooden crate box in the middle of the picture, standing on the floor, waist high, with a narrow horizontal slot in its top front edge and a plain blank pale-cream rectangular label panel on its front with nothing written on it. "
                 "On the left of the box a short stubby cleaner in a pale-blue uniform and a cap pushes one very fat envelope, stuffed so full of cash that it bulges and the corner of a green banknote sticks out of its flap, into the slot with both hands, a yellow mop bucket with a mop standing beside him. "
                 "Behind the box on the right, the man from the reference picture in his long fur coat tiptoes past on the tips of his toes with his knees bent and a sneaky sideways look, hugging a big brown cloth money sack with a single white dollar sign on it in both arms. "
                 f"Plain pale blue-grey wall, plain grey floor. {SCENE}", ["furman"], res="768x1344", mode="I"),
  "ins-wash": job("A flat scene: a white front-loading washing machine seen exactly from the front in the lower half of the picture, a big round glass porthole in the middle of its door with a tumbling mass of green paper banknotes "
                  "(plain green rectangles each with a simple oval in the middle) behind the glass, a plain control panel on top with two round knobs; above it a clothesline strung across the picture with six green banknotes pegged to it "
                  f"with wooden clothespins, hanging to dry; plain pale-yellow laundry room wall, a plain tile floor. {SCENE}", res="768x1344"),
  "ins-hit": job("A flat scene: two short stubby men, both with huge round heads, standing side by side facing the viewer and turned slightly toward each other. The man from the reference picture in his long fur coat is on the left and shakes hands with a hitman on the right, "
                 "their right hands clasped together in the middle of the picture. The hitman is as short and stubby as the fur man and has a huge round pale-peach head as big as the fur man's head, big plain black sunglasses covering his eyes as one wide black bar, "
                 "a flat closed mouth, a black fedora hat and a long black trench coat with the collar turned up, and his other hand holds a black violin case down at his side, the whole case inside the picture. Both men stand close together in the middle of the picture with empty wall on both sides of them. "
                 f"Plain pale warm-beige wall, plain dark-grey floor. {SCENE}", ["furman"], res="768x1344", mode="I"),
}
# the kept picture of each name (the other tried seeds stay in out/x09-cast as alternates; ross-headset, the first take with over-ear cups, is one of them)
SEEDS = {"ross-chair": [61], "ross-board": [61], "ross-slam": [61], "ross-headset-g": [61], "ross-gold": [62], "denise-note": [63],
         "guru": [70], "guru-cannon": [73], "guru-smash": [71], "guru-toast": [72], "guru-caught": [70],
         **{f"crowd-{n}": [61] for n in range(1, 7)}, **{f"crowd-{n}-up": [62 if n == 2 else 61] for n in range(1, 7)}, **{f"crowd-{n}-turn": [63 if n == 3 else 62] for n in range(1, 7)},
         "bg-stage": [63], "bg-crowd": [63], "bg-board": [61], "prop-tub": [66], "prop-clock": [65], "prop-notebook": [65],
         "furman": [61], "ins-tax": [65], "ins-wash": [62], "ins-hit": [68]}
# a reference name is a file path or a kept master (PICK)
def ref(r): return r if ("\\" in r or "/" in r) else str(OUT / f"{r}-{PICK[r]}.png")
def denise_square():
    from PIL import Image
    p = OUT / "ref-denise.png"
    if not p.exists():
        im = Image.open(DENISE_SRC).convert("RGB"); n = max(im.size)
        sq = Image.new("RGB", (n, n), (255, 255, 255)); sq.paste(im, ((n - im.width) // 2, (n - im.height) // 2)); sq.resize((1024, 1024), Image.LANCZOS).save(p)

want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else SEEDS.get(name, [61, 62])))
denise_square()
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
