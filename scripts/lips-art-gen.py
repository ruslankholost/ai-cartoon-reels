# Art for "Cold Lips" (docs/x06-cold-lips.md, script v2), Qwen Image 2.1 Turbo 7B from the prompt alone, recipe C of E:\Wan2GP\my_tests\sp_cast.py (the South Park look, our own characters),
# modeled on scripts/tip-art-gen.py, scripts/pen-art-gen.py and scripts/tup-art-gen.py.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/lips-art-gen.py [name[:seed,seed] ...]     -> out/sp-cast7/<name>-<seed>.png   (768x1344)
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call, one WanGP job at a time (check nvidia-smi first: Whisper may hold the card).
# Without a seed list a name gets the seed in SEEDS (71 if it is not there). Text is never painted (the prompts say so; the badge, the cup and the phone are blank): scripts/lips-prep.py cuts and measures what comes out.
# No real brand: no logos, no brand names, nothing written on a cup, a badge or a phone.
# A character with several poses has ONE description and ONE seed, the master's, and only the pose part of the prompt changes (scripts/tip-prep.py puts the master's head on every pose):
#   the customer: master = customer-stand (seed 71); Todd: master = todd-kneel (seed 73; todd-stand was made too, its head is too big for the poses'). The dog is three pictures of one description with one seed; only the face words change.
# Reused, not made here: the café plates (tip-bg-cafe.jpg, tip-bg-cafeWide.jpg and their counters), Denise in the green apron (tip-deniseHood-*), the line of four (tip-lineA..D), the glass door (code).
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast7"); OUT.mkdir(parents=True, exist_ok=True)
LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show. Front view, full body, standing, arms at the sides unless a pose is described, on a plain white background. Vertical frame.")
SET = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. Background only, no people, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
PROP = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "shapes, thin black outlines. A single object, centered, filling most of the frame, on a plain white background. No text, no letters, no numbers and no logos anywhere. Vertical frame.")
# ---- the customer (50s): the face and the hair are in every pose's words; the purse hangs on her LEFT forearm, which is the RIGHT side of the picture (the first words of a side are always spelled out: a model mirrors "right arm")
CUSTOMER = ("A woman in her 50s with bright golden-yellow blonde hair, a saturated yellow, cut in a sharp, straight, sleek bob that ends at her jaw, with straight-cut bangs, big black sunglasses pushed up on top of her head, small round white pearl earrings, "
            "thin dark brown eyebrows, a stiff sour face with her mouth closed in a flat line, eyes open looking straight ahead, wearing a long pale grey-beige trench coat buttoned up to the neck with a tall collar closed right under her chin, so that no skin shows on her neck or chest, with a tied belt, "
            "dark grey trousers and black flat shoes")
PURSE = ("Her left arm, on the right side of the picture, is bent with the forearm held in front of her waist, and a small tan leather purse hangs from it by a short strap looped over the forearm: a small square "
         "caramel-brown tan leather purse hanging in front of her at waist height, seen from the front, with a wide open top showing a dark empty inside, nothing in it")
# ---- Todd (30s), the café manager: the badge is blank (the code writes TODD / MANAGER); the tie is too short
TODD = ("A chubby man in his 30s with pale peach skin, lighter than usual, a big round face, a shiny sweaty forehead with a few small blue sweat drops on it, thin messy light-brown hair receding at the front and thinning on top, thin eyebrows, "
        "a nervous worried face with his mouth closed in a flat line, eyes open looking straight ahead, wearing a white short-sleeved dress shirt with big dark blue-grey wet sweat patches in both armpits, "
        "a bright red necktie that is far too short: a tiny stubby tie only about a hand long, like a child's tie, ending high on his chest just under the collar, far shorter than a normal tie, with the whole middle of the white shirt bare between the tip of the tie and his belt, "
        "khaki trousers, brown shoes, and a plain flat black rectangular badge on the left side of his chest with nothing written on it")
# ---- the dog: only its head and the tops of its front paws, in a SQUARE frame (768x768). In the tall frame the model drew whole sitting dogs however the words cut the picture off (those pictures are in out/sp-cast7/trials), and with a
# "ledge" it drew the ledge's line across the picture; the square frame with "peeking over the top edge of something that is not drawn" gives a head, a bit of neck and two paws at the bottom edge, nothing else. The three faces share
# the words of everything else and one seed.
DOG = ("A tiny tan chihuahua dog peeking up over the top edge of something that is not drawn, seen from the front: only its big round head with two huge pointed upright ears, a short bit of neck, and its two small front paws resting side by side at the very bottom of the picture, "
       "the toes of the paws curled over the edge. Nothing at all is drawn below the paws: the picture ends there. Short smooth tan fur, a small black nose, two big white oval eyes with small black dot pupils. ")
DOGFACE = {
  "neutral": "Its eyes are open as big white ovals looking straight ahead and its mouth is closed in a small flat line: a calm, neutral face. ",
  "sour": "Its eyes are squinted into narrow slits under heavy flat eyelids and its mouth is closed in a small frown, turned down at the corners: a stiff, sour, disapproving face. ",
  "gasp": "Its eyes are wide open as big round white circles with tiny black dot pupils and its mouth is open in a small round O shape: a shocked, gasping face. ",
}
DOGEND = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple shapes, thin black outlines, on a plain white background. "
          "No text, no letters and no numbers anywhere. Nothing else in the picture: no purse, no collar, no leash, no ledge line. Square frame.")
JOBS = {
  # ---- the customer: the master (arms down) and two poses
  "customer-stand": f"{CUSTOMER}. {PURSE}. Her right arm, on the left side of the picture, hangs straight down at her side. {LOOK}",
  # (the first wording, "... her hand holds one white paper takeaway coffee cup ... pinching the edge of the lid between her thumb and index finger", gave a hand that grabbed the lid with all its fingers; this one says "palm facing down",
  # "only her thumb and index finger" and "pinky stuck out", and the sleeve is for the cut: a white cup with a faint grey outline on a white background goes hollow in the prep. Seeds 71-74 of the first wording are in out/sp-cast7/trials)
  "customer-rat": (f"{CUSTOMER}. {PURSE}. Her right arm, on the left side of the picture, is stretched straight out to her side at shoulder height with the elbow straight. Her right hand is held with the palm facing down: between only her thumb and her index finger "
                   "she pinches the top edge of the lid of one white paper takeaway coffee cup with a plain brown cardboard sleeve around its middle, her other three fingers are curled up away from the cup and her pinky finger is stuck out stiffly, "
                   "the way a person holds a dead rat by its tail; the cup hangs straight down below her fingers, held out as far away from her body as possible with disgust. Only one cup, nothing written on it. " + LOOK),
  "customer-phone": f"{CUSTOMER}. {PURSE}. Her right arm, on the left side of the picture, is bent, and her right hand holds one black smartphone upright at chest height in front of her, her thumb on the phone. {LOOK}",
  # ---- the dog: three faces
  **{f"dog-{k}": f"{DOG}{v}{DOGEND}" for k, v in DOGFACE.items()},
  # ---- Todd: the master (arms down) and five poses
  "todd-stand": f"{TODD}, standing with his arms hanging at his sides. {LOOK}",
  "todd-point": f"{TODD}, his right arm, on the left side of the picture, stretched straight out to his side at shoulder height with his index finger pointing out sideways and the other fingers curled, his left arm hanging at his side. {LOOK}",
  "todd-beg": f"{TODD}, both arms stretched out to his sides and bent at the elbows, both open hands held out palms up with the fingers spread, in a pleading, begging gesture. {LOOK}",
  "todd-kneel": f"{TODD}, kneeling upright on both knees on the floor, seen from the front, his lower legs folded back and hidden behind his thighs, both hands resting flat on his thighs, his back straight. {LOOK}",
  "todd-jump": f"{TODD}, jumping in mid-air, seen from the front, his feet off the ground with both knees tucked up high toward his chest, his right arm, on the left side of the picture, pushed straight down and out at his side with the hand flat as if he has just pushed off a counter, his left arm bent up and out to the side. {LOOK}",
  "todd-dryer": f"{TODD}. Only the top half of him is shown, from his head down to his waist, cut off at the waist by the bottom edge of the picture. He holds one bright pink hair dryer in his right hand, on the left side of the picture, his arm bent, with the nozzle of the hair dryer pointing at his own mouth. {LOOK}",
  # ---- the plate for the customer's close-ups: the coffee shop seen from behind the counter, toward the room (the glass door is drawn in code: the doorway is empty)
  "bg-cafe-back": ("The inside of a small coffee shop seen from the staff side of the counter, looking out into the room toward the front of the shop, drawn as a flat front-on stage set with no perspective, filling the whole picture from edge to edge: "
                   "no border, no frame and no white margins. The front wall faces the viewer straight on: in the exact middle of it an empty doorway with no door in it, framed in dark brown wood, with a bright sunny sidewalk, a street and a building across the street seen through it; "
                   "to the left of the doorway a big window in a thin brown wooden frame showing the same sunny street; warm cream walls, a dark brown wooden panel along the bottom of the wall; on a light wood plank floor two small round cafe tables with two chairs each, one table at each side of the doorway; "
                   "round warm pendant lamps hanging from the ceiling; bright morning daylight. At the very bottom of the picture, in the foreground, the top of the long wooden counter, a light wood top with a brown wooden front panel, reaching both sides of the picture with nothing on it. "
                   f"{SET}"),
}
RES = {f"dog-{k}": "768x768" for k in DOGFACE}  # the dog pictures are square
# ---- the side views of the kiss (shot 13: from the front a viewer sees him kiss her hip, so the smooch is a cut to a profile): the same two people in full profile, facing the LEFT of the picture (she faces away from him,
# he kneels behind her and leans to her seat), whole body, painted faces (neither speaks in that shot). The words of the costume are the front pictures' words; only the face and the pose are new.
SIDE = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple geometric shapes, thin black outlines. The head is huge, a big plain circle, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Seen in full profile, exactly from the side, facing the LEFT side of the picture, with the back on the right side of the picture: "
        "{EYE}, a thin eyebrow above it, no nose, the mouth {MOUTH} at the front of the face. No text, no letters and no numbers anywhere. An original character, not a character from the show. Whole body, on a plain white background. ")
SIDE_EYE_OPEN = "ONE big white oval eye with a small black dot pupil near the front edge of the face"
CUSTOMER_SIDE = ("A woman in her 50s with bright golden-yellow blonde hair, a saturated yellow, cut in a sharp, straight, sleek bob that ends at her jaw and covers the back and the top of her head, with straight-cut bangs, big black sunglasses pushed up on top of her head, one small round white pearl earring, "
                 "a bored, deadpan, slightly contemptuous face, wearing a long pale grey-beige trench coat buttoned up to the neck with a tall collar closed right under her chin, so that no skin shows on her neck or chest, with a tied belt, dark grey trousers and black flat shoes. "
                 "She stands exactly in profile and the back of her coat makes a clear, round, curved bulge at her seat, her bottom sticking out behind her. "
                 "Her left arm, on the side toward the viewer, is bent with the forearm held in front of her waist, and a small tan leather purse hangs from it by a short strap looped over the forearm: a small square caramel-brown tan leather purse hanging at her side at waist height, "
                 "its wide front toward the viewer, with a wide open top showing a dark empty inside, nothing in it. ")
TODD_SIDE = ("A chubby man in his 30s with pale peach skin, lighter than usual, a big round head, a shiny sweaty forehead with a few small blue sweat drops on it, thin messy light-brown hair receding at the front and thinning on top, "
             "wearing a white short-sleeved dress shirt with a big dark blue-grey wet sweat patch in the armpit, a bright red necktie that is far too short: a tiny stubby tie only about a hand long, like a child's tie, ending high on his chest just under the collar, "
             "khaki trousers, brown shoes, and a plain flat black rectangular badge on his chest with nothing written on it. "
             "He is kneeling on both knees on the floor, exactly in profile, leaning far forward from the hips with his back slanted steeply forward, his chest nearly down on his thighs and his head pushed far forward and low, his hands resting on his thighs. ")
# (the first wording of the customer's head, "huge, a big plain circle", gave a profile whose face was 83-90 % of the front master's; "gigantic, almost as tall as the body from the shoulders to the knees" gives 100 % in seed 71)
JOBS["customer-side"] = CUSTOMER_SIDE + SIDE.replace("{EYE}", SIDE_EYE_OPEN + " under a heavy half-closed eyelid").replace("{MOUTH}", "is one flat line").replace("The head is huge, a big plain circle, and sits right on the body with no neck.", "The head is gigantic, a huge plain circle almost as tall as the whole body from the shoulders to the knees, and sits right on the body with no neck.") + "Vertical frame."
JOBS["todd-side"] = TODD_SIDE + SIDE.replace("{EYE}", "ONE eye shut tight, drawn as a short curved line near the front edge of the face").replace("{MOUTH}", "is a big pair of fat, plump pink lips puckered up in an exaggerated kiss and pushed far out in front of the face like a fish's mouth, drawn") + "Square frame."
RES.update({"customer-side": "768x1344", "todd-side": "1024x1024"})
# the picks, and why (the other seeds tried stay in out/sp-cast7, the trial wordings in out/sp-cast7/trials):
#  customer: stand 71 and phone 71 (a head of r 132 and 133 px: the same size to 1 %; seeds 72-74 had heads of 131-152 px, so their rat and phone bodies would have been registered 7-15 % off), rat 72 (r 136; the rat of seed 71 held the cup
#   with a messy hand). Three first takes were thrown away: pale hair (the skin's own colour, so the prep's face blob ran into the hair), a V neck of bare skin (it ran into the face too), and a hand that grabbed the lid.
#  dog: seed 74 for all three faces (73 and 75 too: 75 has a ledge line drawn across it and 73's inner ears change colour from one face to the next; 74's ears, head and paws are the same in all three).
#  Todd: seed 73 for all five poses (and the standing picture; 71-76 were tried for each pose: their heads are 170-258 px, 73's four poses are 171-181 and the pointing one 220, and the costume is drawn alike in them).
#   Three takes of the costume: "very pale pink skin" gave a pink face and the tie came down to the belt twice; "a tiny stubby tie only about a hand long" gave the short tie of all four seeds.
#  plate: 73 (the globe lamps and the brown beam are the wide plate's; 71, 72 and 74 have industrial dome lamps like the counter plate's).
#  side views (71-75 tried for each, two wordings of each): customer-side 71 (the first wording of her head, "huge, a big plain circle", gave faces 83-90 % of the front master's; "gigantic, almost as tall as the body" gives 1.01 in seed 71, with the
#   half-lidded eye, the flat mouth, the round seat and the purse with a dark opening). todd-side 73 (the lean "chest nearly down on his thighs" with a "small round kissing pucker" gave a pucker of 26 x 43 px on a figure 754 px wide, too small to read across
#   the frame; "a big pair of fat, plump pink lips ... like a fish's mouth" gives 56 x 74 px in seed 73, which kept its pose, its tie and its hair: face 1.00 and head circle 1.04 of the master's. With that wording seeds 71, 72 and 75 drew faces 8-25 % too big,
#   74 a painterly one with a smaller pucker; the small-pucker pick is trials/todd-side-73-small-pucker.png).
SEEDS = {"customer-stand": 71, "customer-phone": 71, "customer-rat": 72, "todd-stand": 73, "todd-point": 73, "todd-beg": 73, "todd-kneel": 73, "todd-jump": 73, "todd-dryer": 73,
         "dog-neutral": 74, "dog-sour": 74, "dog-gasp": 74, "bg-cafe-back": 73, "customer-side": 71, "todd-side": 73}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [SEEDS.get(name, 71)]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": RES.get(name, "768x1344"), "seed": seed})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
