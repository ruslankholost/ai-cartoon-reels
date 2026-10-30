# Art for x15 "Bleep Fee" (docs/x15-bleep-fee.md): Ross (the call, leaning on the counter, the fistful of envelopes, buried in them, the receipt) and his hand with the invoice, Chuck (licking the plate, plucking a curl, the plate with the curl),
# the Bleep Guy (standing with his thumb on the button, holding out the receipt) and his button, the shop's door from inside and one envelope.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x14-art-gen.py, scripts/x13-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP and ARM words are theirs; ARM is carried unchanged, no x15 picture uses it).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x15-art-gen.py [name[:seed,seed] ...]     -> out/x15-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken.
# Sizes: with a "KI" reference the first reference sets the shape (a square one gives 1024 x 1024: the people and Ross's hand); no reference gives the size in the job (the props and the Bleep Guy 1024 x 1024, the door 768 x 1344).
# Text is never painted (the prompts say so; the phone's screen, the invoice, the receipt, the button's label and the captions are drawn in code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, the other seeds drew a smaller head), the second his avatar. No apron in this episode.
# Chuck: his x10 master (out/x10-cast/chuck-61.png, given as a path) is the only reference, and the prompts use x10's CHUCK_AGAIN words. Reused, not repainted: out/x10-cast (the shop plates bg-counter and bg-window, chuck) and out/x08-cast (Ross's master, ross-hand); the rest of the reused kit is listed in docs/x15-bleep-fee.md.
# The Bleep Guy is new: ONE description (BLEEP), his first picture is the master and its seed is in PICK; bleep-guy-receipt takes the master as the only reference (BLEEP_AGAIN words).
# Ross's invoice hand takes x08's ross-hand-61 as its first reference (the recipe of x10's ross-cup: the same arm, smartwatch and tattoo sleeve, the phone swapped for a sheet of paper).
# The door and the props are in the flat paper words (SET, PROP) and take no reference (the earlier sets do not): bg-counter's beige wall and wooden floor are in words. The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x15-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
ROSS_HAND = r"E:\getphantom-toons\out\x08-cast\ross-hand-61.png"
CHUCK_MASTER = r"E:\getphantom-toons\out\x10-cast\chuck-61.png"
# the kept master of each character painted here that has references (name -> seed); a reference named here is out/x15-cast/<name>-<seed>.png
PICK = {"bleep-guy": 61}

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

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
CHUCK_AGAIN = ("The same man as in the picture, with the same face, the same bald head with grey curls at the sides, the same black sunglasses resting on top of his head (never over his eyes), "
               "the same white t-shirt, khaki cargo shorts, high white socks and brown sandals")
# his face while he is angry (the steep V of the brows, the clenched teeth) is the words of x13's ross-drawer
ANGRY = "the brows pulled down hard in a steep V over his eyes, a tight clenched-teeth scowl, the two big white eyes wide open looking straight ahead"
STANCE = "his two short stubby legs side by side with both black sneakers flat on the ground"
PHONE = "one plain black smartphone (a flat black rounded rectangle, taller than it is wide, completely plain: no logo, no text, no icons)"
ENV = ("plain white envelopes (each a flat white rectangle wider than it is tall, with a thick black outline and a thin black V-shaped line running from its two top corners down to the middle for the closed flap, "
       "completely blank: no address, no stamp, no text, no lines of writing)")
PLATE = ("one plain white round dinner plate (a flat white disc with a thin black outline and a thin inner ring near its rim, with no food, no crumbs, no sauce, no pattern and no text on it)")
RECEIPT = ("one long narrow strip of plain white receipt paper (a thin flat white ribbon of paper about as wide as a mitten hand and very long, with a thin black outline, completely blank: "
           "no text, no numbers, no lines and nothing printed on it)")
# the Bleep Guy: the glasses sit on the huge eyes, the headphones on the combed-over hair; the box and its button are blank (the word BLEEP is code)
BLEEP = ("A small, skinny, pale man of about 50 with a narrow body and very pale pinkish-white skin, clearly paler than ordinary peach skin, thin grey-brown hair combed over a bald spot in a few thin strands, "
         "thin round black-rimmed glasses round his two big white eyes, wearing big black over-ear studio headphones on his head (a thick black band over the top of his head and one huge round black ear cup at each side, each ear cup as big as one of his eyes), "
         "a grey knitted cardigan with a row of small round buttons over a plain white shirt with a collar and a thin black tie, plain grey trousers and plain brown leather shoes. "
         "A flat grey box hangs from a black strap around his neck at belly height: a plain flat grey box, wider than it is tall, seen from the front and a little from above, "
         "with one big round flat red push button on its top face; nothing is written on the box or on the button")
BLEEP_AGAIN = ("The same man as in the picture, with the same face, the same very pale skin, the same thin grey-brown hair combed over his bald spot, the same round glasses, the same big black over-ear headphones, "
               "the same grey knitted cardigan over a white shirt and thin black tie, the same grey trousers and brown shoes, and the same flat grey box with the one big round red button on its top, hanging from the strap round his neck at belly height")
DEADPAN = "a blank deadpan face: the two big white eyes with small black dot pupils looking straight ahead, the brows flat and level, the mouth a small flat straight line"

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
CHUCK = [CHUCK_MASTER]
JOBS = {
  # ---- Ross, 1024 x 1024 (only the master's own seed 61 keeps his head's size)
  # shot 2: the robocall, the service smile (the phone's call screen is code, the line goes through a phone filter)
  "ross-call": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, {STANCE}. "
                   "A polite customer-service smile: a friendly closed-mouth smile curving up at both corners, the brows slightly raised, the two big white eyes open looking straight at the viewer. "
                   f"His right arm, the one on the left side of the picture, is bent and raised so that its mitten hand holds {PHONE} upright against his right ear, the one on the left side of the picture, "
                   "the phone beside his head with its long edge along the side of his face; the phone does not cover any of his face. "
                   "His other arm, the one on the right side of the picture, hangs relaxed straight down at his side. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 6: "Everybody's trying to FUCK me!" (the counter is the x10 plate's front layer: his hands rest on its top edge)
  "ross-lean": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, bent forward at the waist and leaning toward the viewer, his shoulders hunched up high toward his ears, his huge head thrust forward. "
                   f"He is furious: {ANGRY}. "
                   "Both his arms are straight and reach down and forward, and both mitten hands are pressed flat with the palms down on an invisible counter edge at waist height, one on each side of his body, wide apart; "
                   "there is no counter, no table and no surface drawn anywhere, the hands just rest flat in the air. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 7: "I get invoices for SHIT I never ordered!" (the vein is code)
  "ross-envelopes": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, {STANCE}. He is furious: {ANGRY}. "
                        f"His right arm, the one on the left side of the picture, is bent and raised high so that his mitten hand, a tight fist, is held up above his shoulder at the height of his head "
                        f"and grips a thick fistful of {ENV}: about a dozen envelopes bunched in the fist and sticking out of it in a messy fan, shaken at the viewer. "
                        "His other arm, the one on the right side of the picture, hangs down at his side with the mitten hand open and the fingers spread. "
                        f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 10: B-roll, up to his neck in the mail (the envelopes still raining in are code, painted from prop-envelope)
  "ross-buried": job(f"{ROSS_HEAD.replace('redrawn as a full-body puppet, ', '')}, a plain black t-shirt and a colourful tattoo sleeve on his forearm. "
                     f"He is buried up to his chin in a huge heap of {ENV}, seen from the front: the heap is a wide pyramid-shaped pile of hundreds of flat white envelopes that fills the lower three quarters of the picture, "
                     "and only his huge head and his one raised right arm stick out of the top of the pile; the rest of his body is hidden under the envelopes. "
                     "His right arm, the one on the left side of the picture, is raised straight up beside his head, with the colourful tattoo sleeve on its forearm, and its mitten hand holds one single white envelope up in the air. "
                     f"His other arm is hidden in the pile. He is furious: {ANGRY}. "
                     f"Nothing else is in the picture except the envelopes. {LOOK} {FIT.replace('Full body, the whole figure', 'The whole heap with the man in it')}", ROSS),
  # shot 24: "I never ORDERED any bleeps!" (the twitch is code; the receipt's printing and its total are code too)
  "ross-receipt": job(f"{ROSS_HEAD}, {TEE}. He stands facing the viewer, seen from the front, {STANCE}. "
                      "He stares in stunned disbelief down at the paper in his hands: the two big white eyes wide open with the small black pupils at the bottom of the white ovals, looking down, the brows raised, the mouth a small tight flat line. "
                      f"Both his arms are bent and held out in front of him at chest height, and his two mitten hands hold the top end of {RECEIPT} between them; "
                      "the strip hangs straight down in front of his body and legs and curls in a few loose loops on the ground at his feet, the whole strip visible down to the floor. "
                      f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 11: his tattooed hand holds the open invoice to the camera (INVOICE / You opened this. / $29.99 is code, on the blank sheet)
  "ins-invoice": job("The same hand and forearm as in the picture, with the same black smartwatch and the same colourful tattoo sleeve, coming in from the bottom of the picture, but the black phone is gone: "
                     "the hand holds up one sheet of plain blank white paper instead, seen from the front and held upright, its thumb and fingers gripping the sheet's lower edge, the sheet filling most of the picture: "
                     "a big flat white rectangle taller than it is wide, with a thick black outline, completely blank: no text, no lines, no numbers, no logo, no stamp and nothing printed on it. "
                     f"{PROP.replace('A single object, centered', 'A single hand and sheet of paper, large')} Square frame.", [ROSS_HAND]),
  # ---- Chuck, 1024 x 1024, on his x10 master (his talking mouth is code)
  # shot 12: B-roll, "guy eats the whole thing..."
  "chuck-lick": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, in blissful concentration: the two big white eyes half-covered by flat lids (the top half of each white oval hidden, the pupils showing below the lids), the brows relaxed. "
                    f"Both his arms are bent and raised in front of his chest, and his two mitten hands hold {PLATE} up close in front of his chin, one mitten on each side of the plate, "
                    "tilted back so that its top face is turned up toward his mouth and we see it as a wide flat white oval; "
                    "his mouth is open and a long flat pink tongue sticks out of it and down onto the plate's top face, licking the plate clean. His face stays uncovered above the plate. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shot 13: he plucks one curl (the ping and the curl dropping are code)
  "chuck-pluck": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, wincing: the big white eye on the right side of the picture squeezed shut, drawn as a thin curved line with a tight crease, "
                     "the other big white eye wide open with a small pupil, the mouth stretched in a pained grimace showing clenched teeth. "
                     "His right arm, the one on the left side of the picture, is raised and bent up to the side of his head, its thumb and the tip of the mitten pressed together in a small pinch like a crab claw "
                     "on one single grey curl of the hair at that side of his head, pulling that curl straight outward so that it stretches into one long thin curly grey strand. "
                     f"His other arm, the one on the right side of the picture, is bent at his chest and its mitten hand holds {PLATE} upright against his chest, the front of the plate toward the viewer, with nothing on it. "
                     f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # shots 14-15: "Found a hair. I want my money back." (the plate slides across the counter; the insert is cut from this picture)
  # the first take (seed 61, "smug: a lopsided smirk with one corner of the mouth raised ...") kept the master's sad frown and is kept as chuck-plate-61-old.png: the words now draw the smirk (a U-shaped mouth, the corners turned up, no frown), as x14's chuck-shrug
  "chuck-plate": job(f"{CHUCK_AGAIN}. He stands facing the viewer, seen from the front, smug and pleased with himself: a wide U-shaped smirk curving up at both corners of the mouth, the right corner higher than the left, the cheeks lifted, "
                     "one brow arched high in a cocky look and the other brow level, the two big white eyes half-covered by flat lids (the top half of each white oval hidden, the pupils showing below the lids); not sad, not worried, no frown, no downturned mouth. "
                     f"His right arm, the one on the left side of the picture, is stretched forward and down with its mitten hand on the rim of {PLATE}, pushing it forward toward the viewer: "
                     "the plate is seen from a little above as a wide flat white oval floating level at chest height in front of him, and in the exact middle of the plate lies one small grey curl of hair (a tiny grey curly squiggle). "
                     "His other arm, the one on the right side of the picture, is stretched out to the side at waist height with the mitten hand open and flat, the palm turned up, as if asking for money. "
                     f"Nothing else is in the picture. {LOOK} {FIT}", CHUCK),
  # ---- the Bleep Guy, 1024 x 1024: the master (no reference), then the one holding out the receipt on it
  # shots 22, 25: "all along" next to Ross, the thumb on the button (the word BLEEP on the box is code)
  "bleep-guy": job(f"{BLEEP}. He stands facing the viewer, seen from the front, his two thin legs side by side with both brown shoes flat on the ground, {DEADPAN}. "
                   "His right arm, the one on the left side of the picture, is bent in front of his belly and its mitten hand rests on top of the grey box with the thumb pressing on the big round red button; "
                   "his other arm hangs straight down at his side. "
                   f"Nothing else is in the picture. {LOOK} {FIT}"),
  # shot 22: BRRRT, the receipt (its printing across the floor and the total are code)
  "bleep-guy-receipt": job(f"{BLEEP_AGAIN}. He stands facing the viewer, seen from the front, his two thin legs side by side with both brown shoes flat on the ground, {DEADPAN}. "
                           f"Both his arms are bent and held out in front of him toward the viewer at chest height, and his two mitten hands hold the top end of {RECEIPT} between them; "
                           "the strip hangs down from his hands and curls in a few loose loops on the floor in front of his feet. "
                           "The grey box with its big red button stays fully visible on his belly and is not covered by the paper. "
                           f"Nothing else is in the picture. {LOOK} {FIT}", ["bleep-guy"]),
  # ---- the insert, 1024 x 1024
  # (the thumb on the button: the pop, the red flash and the word BLEEP are code)
  # the first take ("a very pale pinkish-white mitten hand ... its fat thumb points straight down ...") drew a realistic hand pressing with a pointing index finger, five-finger line art unlike the series' mitten hands; it is kept as ins-button-61-old.png: the words now draw the South Park mitten and say it is the thumb
  "ins-button": job("A close view of one big round red push button on top of a flat grey box, seen from the front and a little from above, with a thumb pressing it from above. "
                    "The flat grey box (a plain flat grey rectangle wider than it is tall, with a thin black outline and a thin lighter-grey top face) fills the bottom half of the picture, "
                    "and on the middle of its top face sits the big round button, a flat red disc about as wide as a mitten hand with a thin darker-red rim, standing a little above the box. "
                    "From the top edge of the picture a simple very pale pinkish-white cartoon mitten hand comes down into the picture, drawn like the hands of the South Park characters: "
                    "a plain rounded mitten shape with one short fat separate thumb, no finger lines, no knuckles and no fingernails, with a grey knitted cardigan sleeve and a white shirt cuff at its wrist. "
                    "The mitten is held above the button with its short fat thumb pointing straight down and pressing on the middle of the red button; it is the thumb that presses, not a pointing index finger, and the rest of the mitten is cut off by the top edge of the picture. "
                    "Nothing is written on the box or on the button. "
                    f"{PROP.replace('A single object, centered', 'A single button and thumb, large')} Square frame."),
  # ---- the set and the prop
  # shot 9: B-roll, the door from inside (the mail slot fires the envelopes, the pile rises in front of it: code)
  "bg-door": job("The inside of a small coffee shop, looking straight at its front door from the inside, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                 "the wall is flat warm beige with a flat cream ceiling strip across the very top; "
                 "in the middle of the picture a tall plain closed wooden door, a flat warm medium-brown door with a few thin dark-brown vertical plank lines and a thin dark-brown frame, "
                 "reaching from the floor up to near the ceiling and about two thirds as wide as the picture; "
                 "high in the door at head height a small square window with a thin dark-brown frame round one flat clear glass pane showing a sunny street outside: "
                 "a flat pale-blue sky, a flat pale-yellow building across the street, a flat light-grey sidewalk and a flat dark-grey road; "
                 "in the middle of the door at waist height a brass mail slot, a flat wide horizontal gold-brass rectangle with a thin dark slit across its middle and a hinged flap, and a small round brass doorknob at the right side of the door; "
                 "on the floor right in front of the door a plain flat dark-brown doormat, a wide low rectangle with nothing written on it; "
                 "a flat warm-brown wooden floor with thin plank lines across the lower fifth of the picture. Nothing and nobody in the picture. "
                 f"{SET}", res="768x1344"),
  # the flying envelopes are cut from this one
  "prop-envelope": job(f"A single plain white envelope seen exactly from the back, lying flat and turned a little to one side (tilted about ten degrees), drawn as flat cut-out shapes: "
                       "a flat white rectangle wider than it is tall, with a thick black outline and, across it, a thin black V-shaped line from its two top corners down to the middle for the closed flap. "
                       "Completely blank: no address, no stamp, no text and no lines of writing. "
                       f"{PROP} Square frame."),
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
