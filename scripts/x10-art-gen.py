# Art for x10 "My Own Business" (docs/x10-my-own-business.md): Ross, Chuck, Tyler, the courier and the guy at 5 pm as South Park puppets, four arms, the three shop plates, the box pile and the open till.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x09-art-gen.py (the LOOK, SET, PROP and SCENE words are its).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x10-art-gen.py [name[:seed,seed] ...]     -> out/x10-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the characters, poses and props); "I" and no reference give the size in the job (plates and the till 768 x 1344, the side arms 1344 x 768).
# Text is never painted (the prompts say so; the shop's sign, the box labels, HELP WANTED, the letter, the review's star, the clock's hands, the bell and the coin are drawn in code; night, fire, sprinklers, steam, corks, the moth are code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head), the second his avatar. His cup hand takes x08's ross-hand-61 as its first reference.
# Chuck, Tyler and the guy at 5 pm: ONE description each, the first picture is the master and its seed is in PICK; the second picture takes the master as the reference. cast/s1 is the old Family Guy style: only the docs/bible.md words are used.
# Plates, props and the till are in the flat paper words (SET, PROP, SCENE): the first takes in plainer words came out as photographs and renders. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x10-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
ROSS_HAND = r"E:\getphantom-toons\out\x08-cast\ross-hand-61.png"
# the kept master of each character that has references (name -> seed); a reference named here is out/x10-cast/<name>-<seed>.png
PICK = {"chuck": 61, "tyler": 61, "guy-wave": 61}

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
BILL = "one flat green banknote (a plain green rectangle with a simple oval in the middle and nothing written on it)"
APRON = "a plain brown apron (a flat brown bib shape with a curved neck cutout at the top, a strap loop at each top corner, two long waist ties hanging down, nothing written or drawn on it)"
EXTING = "a red fire extinguisher (a flat red cylinder with a black handle on top, a black hose and a black nozzle, nothing written on it)"
PLUNGER = "a plunger (a long plain wooden stick with a red rubber cup at its end)"
MOP = "a mop (a long plain wooden handle with a flat grey mop head made of thick grey strings at its end)"
CUP = ("one paper takeaway coffee cup (a flat white cup tapering toward the bottom, a plain brown cardboard sleeve around its middle and a flat white lid with a small sip hole, nothing written or printed on it)")

CHUCK = ("A balding man in his 60s with a bald top and thick curly grey hair only at the sides above his ears, light peach skin, a grumpy sour mouth, wearing a plain white t-shirt, khaki cargo shorts with big side pockets, "
         "high white socks and brown leather sandals; a pair of black sunglasses is pushed up and rests on top of his bald head, not over his eyes: both big white eyes are fully visible")
CHUCK_AGAIN = ("The same man as in the picture, with the same face, the same bald head with grey curls at the sides, the same black sunglasses resting on top of his head (never over his eyes), "
               "the same white t-shirt, khaki cargo shorts, high white socks and brown sandals")
TYLER = ("A skinny teenage boy of 15 with messy brown hair in uneven tufts sticking out over his forehead, light peach skin, wearing a baggy light-grey hoodie with the hood down and a front pocket, "
         "blue jeans with a small torn patch of lighter blue at each knee, and worn white sneakers")
TYLER_AGAIN = "The same boy as in the picture, with the same face, the same messy brown hair, the same baggy light-grey hoodie, the same ripped blue jeans and the same white sneakers"
COURIER = ("A stocky delivery man in his 40s with a thick dark moustache, light tan skin, a bored flat mouth, wearing a plain brown short-sleeved uniform shirt, plain brown trousers, "
           "a plain brown baseball cap with a short visor and black work boots; the uniform and the cap have no logo, no badge and no writing")
GUY = ("A cheerful ordinary office worker in his 30s with neat short sandy-blond hair, light peach skin, wearing a short-sleeved white shirt, a plain dark-blue tie, a blue lanyard around his neck "
       "with a small blank white ID badge hanging on his chest, dark grey trousers and black shoes")
GUY_AGAIN = ("The same man as in the picture, with the same face, the same neat sandy-blond hair, the same short-sleeved white shirt, dark-blue tie, blue lanyard with the blank white badge, dark grey trousers and black shoes")
LUNCHBOX = "a small plain grey metal lunchbox with a black handle"
BIRD = "a tiny bluebird (a round flat blue body, a paler blue belly, a tiny orange beak and one tiny black dot eye)"
PEACH = "a plain rounded mitten in light peach skin"

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- Ross, 1024 x 1024
  "ross-wide": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, both arms flung wide open and raised out to the sides at shoulder height with the mitten hands open and the fingers spread, "
                   f"his legs a little apart, his chest out, a huge wide grin showing a row of white teeth, his eyes wide open. Nothing is in his hands and nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-till": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, a tired flat mouth, eyes open looking straight ahead. His left arm, the one on the right side of the picture, is stretched straight out to the right at chest height "
                   f"and his mitten hand holds out {BILL} between the thumb and the mitten, as if paying someone who is outside the picture on his right. His other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-apron": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer with a friendly welcoming smile, both arms stretched forward, his two mitten hands holding {APRON} up by its top corners at chest height, "
                    f"spread open at arm's length in front of him so that its whole shape is visible, as if offering it to someone. He does not wear it. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-point": job(f"{ROSS_HEAD}, {TEE}. He stands leaning forward, seen from the front, furious: his mouth wide open in a shout showing his teeth, his big white eyes wide open with tiny pupils. "
                    "His left arm, the one on the right side of the picture, is stretched straight out to the right at shoulder height, his mitten hand a fist with one stiff index finger pointing straight out, "
                    f"as if pointing hard at someone outside the picture on his right. His other arm hangs at his side with the fist clenched. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-flood": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer in a frantic hurry: his eyes wide open, his mouth stretched in a strained forced smile, his head tilted sharply toward his shoulder on the left side of the picture, "
                    "clamping one black smartphone between that ear and that raised shoulder, the phone slanted. "
                    f"His right arm, the one on the left side of the picture, hangs down and holds {EXTING}, and his left arm, the one on the right side of the picture, is raised and bent and holds {PLUNGER} upright by its stick. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-coin": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, utterly tired: each big white oval eye is half covered from the top by a flat skin-coloured eyelid so that the eyes are half closed, his mouth a flat line, his head tilted a little to one side. "
                   "His left arm, the one on the right side of the picture, is bent and raised so that his mitten hand is held up at the height of his eyes next to his face, the thumb and the tip of the mitten pressed together in a small pinch, "
                   f"as if holding up something tiny, but there is nothing between them and nothing visible there. His other arm hangs at his side. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  "ross-mop": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, worn out, his head lowered a little, his eyes looking down and his mouth a flat line. Both his mitten hands grip {MOP} one above the other at chest height, "
                  f"the handle slanting down from his hands to the left side of the picture, where the flat grey mop head rests on the floor beside his feet. The whole mop is in the picture. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # his hand with the cup, shot 6 (x08's ross-hand-61 is the reference: the same arm, smartwatch and tattoo sleeve, the phone swapped for a cup)
  "ross-cup": job(f"The same hand and forearm as in the picture, with the same black smartwatch and the same colourful tattoo sleeve, coming in from the bottom of the picture, but the black phone is gone: the hand holds {CUP} upright instead, "
                  f"seen from the front, the cup filling the middle of the picture. {PROP.replace('A single object, centered', 'A single hand and cup, large')} Square frame.", [ROSS_HAND]),
  # ---- Chuck, 1024 x 1024: the master, then the wet one on it
  "chuck": job(f"{CHUCK}. He stands facing the viewer, seen from the front, impatient. His right arm, the one on the left side of the picture, is raised and bent at chest height with the mitten hand flat and open, the palm facing down, "
               "as if about to slap a counter bell that is outside the picture below it. His other hand, on the right side of the picture, holds one black smartphone with a plain blank screen at waist height. "
               f"His mouth is a flat scowl, eyes open looking straight ahead. Nothing else is in the picture. {LOOK} {FIT}"),
  "chuck-wet": job(f"{CHUCK_AGAIN}, but he is soaked from head to toe: his grey curls plastered flat and dripping, his white t-shirt wet, a darker grey-blue and clinging to his body, his shorts and socks dark and dripping, "
                   "a few small flat light-blue water drops falling from his hair and his clothes. He stands facing the viewer, his right arm, the one on the left side of the picture, bent and raised to chest height, "
                   "his mitten hand holding one black smartphone upright with its plain blank white screen facing the viewer; his other arm hangs at his side. A smug lopsided smirk, eyes open looking straight ahead. "
                   f"{LOOK} {FIT}", ["chuck"]),
  # ---- Tyler, 1024 x 1024: the master, then the selfie on it
  "tyler": job(f"{TYLER}. He stands slouching, seen from the front, his head tilted down, his big white eyes looking down at one black smartphone with a plain blank screen that he holds in both mitten hands at chest height, "
               f"a bored flat mouth. Nothing else is in the picture. {LOOK} {FIT}"),
  "tyler-selfie": job(f"{TYLER_AGAIN}. He stands facing the viewer, his right arm, the one on the left side of the picture, stretched out and raised so that he holds one black smartphone up at arm's length beside his head at head height, "
                      "with the back of the phone toward the viewer (a plain black rectangle with one small round camera lens), his big white eyes with their dot pupils looking toward the phone, a deadpan flat mouth; "
                      f"his other hand is in the front pocket of his hoodie. Nothing else is in the picture. {LOOK} {FIT}", ["tyler"]),
  # ---- the delivery guy with his hand truck, 1024 x 1024
  "courier": job(f"{COURIER}. Seen from the front, he leans back with both mitten hands on the two handles of a grey metal hand truck (a tall narrow grey metal frame with two small black wheels at the bottom and a small flat metal shelf at its foot), "
                 "tipping it forward toward the left edge of the picture at a steep angle, so that the tall stack of four plain brown cardboard boxes (each a flat brown rectangle with a lighter tan strip of tape on top, nothing written on them) "
                 f"piled on its shelf starts to slide off to the left. Nothing else is in the picture. {LOOK} {FIT}"),
  # ---- the guy at 5 pm, 1024 x 1024: the master (facing us), then the walking one on it
  "guy-wave": job(f"{GUY}. He stands facing the viewer, seen from the front, a broad friendly smile showing his teeth. His right arm, the one on the left side of the picture, is raised and bent at shoulder height with the mitten hand open "
                  f"and the fingers spread in a friendly wave; his other hand holds {LUNCHBOX} down at his side. Nothing else is in the picture. {LOOK} {FIT}"),
  "guy-walk": job(f"{GUY_AGAIN}. Now he is seen from the side in profile, walking to the right: his whole body and his face turned toward the right edge of the picture, caught mid-stride with one leg forward and the other leg back, "
                  f"one arm swinging, the other hand carrying {LUNCHBOX} at his side. His lips are puckered into a tiny round 'o' as if he is whistling, and his eyes, two big white ovals with small black dot pupils, look ahead to the right. "
                  f"{BIRD[0].upper() + BIRD[1:]} sits on his near shoulder. Nothing else is in the picture. {LOOK} {FIT}", ["guy-wave"]),
  # ---- the arms, flat props that come in from the edge and are cut off by it (the side ones 1344 x 768, the one out of the tip jar 768 x 1344)
  "hand-suit": job(f"A cartoon man's arm and hand reaching into the picture from the right edge, seen from the side and slightly above. The sleeve is a dark navy suit jacket sleeve with a white shirt cuff and one small gold cufflink showing at the wrist; "
                   f"it comes in horizontally from the right edge of the picture and is cut off by that edge. The hand is {PEACH}, open and empty with the palm up and a short thumb, held out flat as if waiting for money. {ARM} Horizontal frame.", res="1344x768"),
  "hand-work": job(f"A cartoon man's arm and hand reaching into the picture from the left edge, seen from the side and slightly above. The sleeve is a tan canvas work jacket sleeve with a ribbed brown cuff at the wrist; "
                   f"it comes in horizontally from the left edge of the picture and is cut off by that edge. The hand is {PEACH}, open and empty with the palm up and a short thumb, held out flat as if waiting for money. {ARM} Horizontal frame.", res="1344x768"),
  "hand-tiny": job(f"A cartoon man's thin arm and hand reaching up into the picture from the bottom edge, seen from the front. The sleeve is a plain white shirt sleeve with a white cuff fastened by one small round gold cufflink at the wrist; "
                   f"it comes in vertically from the bottom edge of the picture and is cut off by that edge. The hand is {PEACH}, open and reaching straight up with the palm facing the viewer, a short thumb out to one side. {ARM} Vertical frame.", res="768x1344"),
  "hand-grey": job(f"A cartoon man's arm and hand reaching into the picture from the right edge, seen from the side and slightly above. The sleeve is a plain grey suit jacket sleeve with a white shirt cuff showing at the wrist; "
                   f"it comes in horizontally from the right edge of the picture and is cut off by that edge. The hand is {PEACH}, its short thumb and the tip of the mitten pressed together in a small pinch like a crab claw, as if plucking something tiny, "
                   f"but there is nothing between them. {ARM} Horizontal frame.", res="1344x768"),
  # ---- the plates, 768 x 1344
  "bg-front": job("The front of a small coffee shop on a sunny street, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: a flat pale-blue sky across the top with one flat yellow sun in the top right corner and two flat white clouds; "
                  "the shop front is one flat warm terracotta wall with thin dark-brown trim, and across the upper part of it a long blank sign board, a plain flat cream rectangle with a thin dark-brown frame and nothing on it; "
                  "right under the sign board a long narrow flat grey metal box running the full width of the shop front, the housing of a roll-up shutter, with nothing hanging from it; "
                  "below the box the shop opening: a big plain glass window on the left, one flat pale-blue-grey pane with a thin dark-brown frame and a plain window sill, and a plain glass door on the right with the same thin dark-brown frame and a small round brass handle; "
                  "in front of the shop a flat light-grey sidewalk across the lower fifth of the picture and a flat dark-grey road strip with a kerb along the very bottom. Nothing and nobody in front of the shop. "
                  f"{SET}", res="768x1344"),
  "bg-counter": job("The inside of a small coffee shop seen from the customer side of the counter, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                    "in the upper third a flat warm-beige back wall with, at the left, a big blank chalkboard menu (a plain flat dark-green-black rectangle with a thick wooden frame and nothing written on it) and, at the right, a big round wall clock "
                    "(a plain flat round white face with a thick dark-brown rim, completely blank: no numbers, no hands and no marks); "
                    "in the middle of the picture, against the back wall, a low flat brown back counter with a silver espresso machine at its left end (a flat grey box with two round dials, two small spouts and one white cup on its tray) "
                    "and a flat dark-grey panini press at its right end (a plain flat grey box with a hinged lid and a black handle), the middle of the back counter left empty; "
                    "in the lower half of the picture a long flat light-wood counter seen straight on, its top edge about two thirds of the way down the picture and its front a flat dark-brown wooden panel, "
                    "with a flat grey cash register standing on the counter top at the left (a plain grey box with a blank grey screen and a closed drawer, no numbered buttons) "
                    "and a tall clear glass tip jar standing on the counter top at the right (a flat pale-blue-grey glass jar with a wide open top, completely empty, nothing written on it); "
                    f"a flat wooden floor strip along the very bottom. {SET}", res="768x1344"),
  "bg-window": job("The inside of a small coffee shop, looking at its front wall from the inside, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                   "the front wall is flat warm cream; on the left one big tall plain window, a thin dark-brown frame around one huge flat clear glass pane reaching from low above the floor up to near the ceiling; "
                   "on the right a plain glass door with a thin dark-brown frame and a small round brass handle, and low on the door a small flat grey horizontal mail slot with a hinged flap; "
                   "through the window and the door's glass a sunny street outside: a flat pale-blue sky, a flat light-grey sidewalk, a flat dark-grey road, and across the street a flat pale-yellow building with a row of plain dark windows; "
                   "a flat wooden floor with thin plank lines across the lower fifth of the picture and a flat cream ceiling strip across the very top. Nothing and nobody in the picture. "
                   f"{SET}", res="768x1344"),
  # ---- the props
  "prop-boxes": job(f"A big untidy pile of plain cardboard boxes of different sizes, drawn as flat cut-out shapes and seen exactly from the front: about twelve boxes, five big ones at the bottom, four medium ones on them and three small ones on top, "
                    "a few leaning crookedly, each box a flat brown rectangle with a thin lighter-tan strip of packing tape across its top, nothing written or printed on any box, a wide pyramid-shaped heap that fills most of the frame. "
                    f"{PROP} Square frame."),
  "ins-till": job("A flat scene seen exactly from above: an open, completely empty cash register drawer filling the picture, a flat grey metal tray with, along its back edge, a row of five narrow empty compartments for banknotes and, "
                  "in front of them, a row of four small empty round-cornered coin cups, a thin flat grey metal clip across the back, the bottom of every compartment plain flat light grey, the plain dark-brown wooden counter top around the drawer. "
                  f"Nothing in any compartment, no money, no coins. {SCENE}", res="768x1344"),
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
