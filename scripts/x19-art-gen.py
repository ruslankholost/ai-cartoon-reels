# Art for x19 "Screen Time" (docs/x19-screen-time.md, Part 2 of x18 "Unattended"): the mom (head snapped up from her phone, proud and pointing, begging with clasped hands, standing beside the stroller whose canopy is a TV),
# the toddler (at his table, then with the popcorn bucket), Ross in his apron (blown back by the song, holding out kids' headphones, in a paper usher's hat with the popcorn), the four customers (the master, the same four glazed, the same four with cash up)
# eight props (the tablet, the muffin, the stroller, the stroller with its TV, the rack of chargers, one charger, the popcorn bucket, the light switch)
# and two pointing hands (Ross's and the mom's, one index finger out, for the volume taps, the light switch, the charger slide and her plug, instead of a fist; the coordinator's later request): 22 pictures.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x18-art-gen.py (the LOOK, FIT, PROP, MOM_AGAIN, TODDLER_AGAIN, TABLE and Ross words, the MOM and TODDLER pictures taking x18's masters, Ross's two references and the seed rules are theirs;
# the row of four adults over a table edge is x18's kids-row idea).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x19-art-gen.py [name[:seed,seed] ...]     -> out/x19-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call (a picture takes 20 to 65 s, the model loads once per call). One seed per picture: a name gets 61; a second seed only if the first is broken, and SEEDS names the kept one.
# References and sizes (a "KI" reference makes the first reference set the shape, a square one gives 1024 x 1024; "I" and no reference give the size in the job):
#   mom-panic, mom-proud, mom-plead, mom-stroller take x18's mom-phone (out/x18-cast/mom-phone-61.png, the only reference): "KI", 1024 x 1024.
#   toddler-sit, toddler-popcorn take x18's toddler-pour (out/x18-cast/toddler-pour-61.png, the only reference): "KI", 1024 x 1024.
#   ross-blown, ross-headphones, ross-usher: the x08 master and the avatar, "KI", 1024 x 1024.
#   customers: no reference (the master of the four, on white, the table top along its bottom), 1344 x 768; customers-glazed and customers-cash take customers: "KI", 1344 x 768.
#   prop-tablet, prop-stroller, prop-rack: no reference, 1344 x 768 (wider than tall); prop-muffin, prop-stroller-tv, prop-charger, prop-popcorn, prop-switch: no reference, 1024 x 1024.
#   hand-ross-point takes x16's hand-ross (out/x16-cast/hand-ross-61.png) and the avatar: "KI", 1024 x 1024 (the arm comes in from the left edge); hand-mom-point takes x18's mom-phone (the only reference): "KI", 1024 x 1024 (the arm comes in from the right edge).
# Text is never painted (the prompts say so; the tablet's and the stroller TV's screens are plain flat black so that the code can draw on them; the code letters the captions, the label, 1%, "$6.50" and the rest).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, so every Ross picture is seed 61).
# It holds to the pixel only while the head's outline is left alone (ross-headphones: eye whites x 412-514 and 519-620, y 209-330, the master's): when the hair streams (ross-blown) or a hat sits on it (ross-usher) the model redraws the head smaller (0.91 and 0.84 of the master's size, see their notes).
# He wears x10's brown apron over the black tee (the bib over his chest, the ties round his waist) and his face is calm in all three: Ross never blows up (the hurricane in ross-blown is the song's force; only his hair and the apron blow).
# The mom and the toddler are x18's: their words are the _AGAIN ones, their masters are the only references; the table is x18's TABLE (a seated mom keeps her mint-green tumbler at the right side of the table, as in mom-glasses).
# The stroller is one design in three pictures (sky-blue seat, dark-grey frame, black wheels with light-grey hubs): prop-stroller from the side with an ordinary open hood, prop-stroller-tv and mom-stroller from the front with a giant TV where the canopy should be.
# Every face is light peach (no face is a solid dark colour).
# Reused, not repainted: x10 bg-counter, bg-window, ross-apron; x16 hand-ross (also the reference of hand-ross-point); x18 mom-phone, mom-shock, bg-seating.
# The files are what WanGP saves (JPEG data under a .png name, as in every earlier episode; PIL and cv2 read them by content). A picture that was painted again keeps its first take as <name>-<seed>-old.png (a later one as -old2, -old3, -old4); SEEDS names the kept seed of a name.
# The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x19-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
MOM_MASTER = r"E:\getphantom-toons\out\x18-cast\mom-phone-61.png"
TODDLER_MASTER = r"E:\getphantom-toons\out\x18-cast\toddler-pour-61.png"
ROSS_HAND = r"E:\getphantom-toons\out\x16-cast\hand-ross-61.png"
# the kept master of each picture that others take as a reference (name -> seed); a reference named here is out/x19-cast/<name>-<seed>.png
PICK = {"customers": 61}

LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show.")
FIT = "Full body, the whole figure fits inside the square picture with a wide white margin all round, on a plain white background."
PROP = ("Drawn exactly in the style of the TV cartoon South Park: a flat construction-paper cut-out cartoon, one simple flat-coloured shape per part, thick black outlines, solid colors with no gradients, no shading, "
        "no highlights, no shine, no shadow and no texture, like a child's drawing, not a photograph and not a 3D render. A single object, centered, filling most of the frame, on a plain white background. "
        "No text, no letters, no numbers and no logos anywhere.")
ARM = PROP.replace("A single object, centered", "A single arm and hand, large")  # the arms come in from the edge of the picture and are cut off by it (x10's and x16's ARM)
assert ARM != PROP
BODY = "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands."
LOOK_MANY = (LOOK.replace("The head is huge,", "Every head is huge,")
                 .replace(BODY + " Two big white oval eyes touch each other, with small black dot pupils. No nose.",
                          "Every body is short and stubby, with short arms and simple mitten hands, the children's bodies even shorter than the grown-ups'. Every face has two big white oval eyes that touch each other, with small black dot pupils, and no nose.")
                 .replace("An original character, not a character from the show.", "Original characters, not characters from the show."))
LOOK_ROW = LOOK_MANY.replace("Every body is short and stubby, with short arms and simple mitten hands, the children's bodies even shorter than the grown-ups'.", "The shoulders are narrow, the arms short and the hands simple mittens.")
assert LOOK_MANY != LOOK and "Every body" in LOOK_MANY and "Original characters" in LOOK_MANY and "Every head" in LOOK_MANY
assert LOOK_ROW != LOOK_MANY and "narrow" in LOOK_ROW
# the four customers look to the left: the gaze is in the look sentence itself, because the model draws South Park eyes with both pupils toward the nose whenever the gaze is only asked for at the end of a long prompt
LOOK_CUST = LOOK_ROW.replace("with small black dot pupils, and no nose.", "with small black dot pupils that look sideways to the left, each pupil pressed against the left edge of its white, and no nose.")
assert LOOK_CUST != LOOK_ROW
FIT_TABLE = FIT.replace("Full body, the whole figure", "The whole woman and the whole table")
FIT_TABLE_BOY = FIT.replace("Full body, the whole figure", "The whole boy and the whole table")
FIT_STROLLER = FIT.replace("Full body, the whole figure", "The whole woman from head to feet and the whole stroller beside her")
# the four customers over a table edge: x18's FIT_ROW idea with a café table top in the café's muted honey-tan; the top quarter is left empty so that the raised arms of customers-cash fit
FIT_ROW = ("The four heads, their shoulders and their hands fill the lower three quarters of the picture, leaving the top quarter empty white, and the flat café table top (a long flat muted honey-tan strip, a soft light brown like pale cardboard and not bright orange, "
           "with a thin black outline and a slightly darker-brown front edge) runs from the left edge to the right edge along the very bottom of the picture, on a plain white background above it.")
FIT_ROW_UP = FIT_ROW.replace("their hands fill the lower three quarters of the picture, leaving the top quarter empty white", "their raised arms and hands fill the picture")
assert FIT_TABLE != FIT and FIT_TABLE_BOY != FIT and FIT_STROLLER != FIT and FIT_ROW_UP != FIT_ROW

def cap(s): return s[0].upper() + s[1:]

# Ross (x18's words)
ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
APRON = "a plain brown apron (a flat brown bib shape with a curved neck cutout at the top, a strap loop at each top corner, two long waist ties hanging down, nothing written or drawn on it)"
ROSS_APRON = f"Over the t-shirt he wears {APRON}, the bib over his chest and the ties tied round his waist, the short black sleeves and the tattooed forearms showing on both sides of it."
# the paper usher's hat, the kids' headphones and the popcorn bucket (the bucket is the same in ross-usher, toddler-popcorn and prop-popcorn)
HAT = ("one small white paper pillbox hat (a short flat-topped cylinder with straight vertical sides, wider than it is tall and only about half as tall as one of his eyes, with a thin black outline, nothing written on it), much smaller than his head")
HEADPHONES = ("one tiny pair of kids' over-ear headphones (a thin curved bright-yellow headband shaped like an upside-down U and, at its two ends, two small round bright-blue ear cups with a thick bright-yellow cushion ring round each, completely plain: no logo, no text)")
POPCORN = ("one red-and-white striped popcorn bucket full of popcorn (a tall cup a little wider at the top than at the bottom, covered in flat vertical stripes of bright red and white of equal width with a thin black outline, a thick flat red rim round its top edge, "
           "and heaped over the rim a big round mound of fluffy popcorn: many small flat puffy irregular off-white and pale-yellow shapes, each with a thin black outline), completely plain: no text, no letters, no logo and no picture on it")

# the mom (x18's words; she keeps the table and the tumbler of the master)
MOM_AGAIN = ("The same woman as in the picture, with exactly the same blond messy bun and loose strands, the same big black oversized sunglasses, the same lavender zip-up jacket over the white tank top and the same face, "
             "all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
MOM_STAND = "standing, seen from the front, the whole woman from head to feet, in black leggings and white sneakers, with no table and no chair in the picture"
MOM_SEATED = "she still sits behind the same small round wooden café table with the same mint-green tumbler on it at the right side of the picture, seen from the front"

# the table (x18's TABLE words) and the toddler at it
TABLE = ("one small round wooden café table seen exactly from the front, flat with no perspective: a thin wide flat light-oak tabletop (a long low flat rounded slab much wider than her shoulders, "
         "a flat muted honey-tan wood colour, a soft light brown like pale cardboard and not bright orange, with a thin black outline and a slightly darker-brown front edge), held up by one thick short plain dark-brown wooden column in the middle that ends in a flat round dark-brown base on the floor")
TABLE_BOY = TABLE.replace("her shoulders", "his shoulders")
assert TABLE_BOY != TABLE
# (the first take of toddler-sit said "no legs": the model drew his legs and red sneakers under the table anyway, so the words now say where they go; and it left the dinosaur off the tee, so TODDLER_AGAIN names it)
BEHIND_BOY = (f"He sits behind {TABLE_BOY}, facing the viewer, seen from the front: the tabletop is in front of him at the height of his belly and hides his lap, no chair is drawn, "
              "and below the tabletop his two short legs in the blue denim shorts hang down on both sides of the table's thick column, ending in his two small red sneakers flat on the floor at both sides of the table's round base. ")
TODDLER_AGAIN = ("The same toddler boy as in the picture, with exactly the same huge round head, the same wild messy brown hair in big uneven tufts, the same bright green t-shirt with the same small plump white cartoon dinosaur on its chest "
                 "(a round white body, a long tail, a small head and three little plates along its back), the same blue denim shorts and the same small red sneakers, "
                 "all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
# his stare: eyes wide, pupils in the exact vertical centre (the master's gaze is strong, so the word is repeated in every picture that needs a level stare)
STARE = "his two big white oval eyes are wide open and stare straight ahead at the viewer, each small black dot pupil in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white"

# the stroller: one design in three pictures (sky-blue seat, dark-grey frame, black wheels with light-grey hubs)
STROLLER = ("a baby stroller drawn flat in one sky-blue and dark-grey colour scheme: a flat sky-blue fabric seat with a rounded back, a thin dark-grey metal frame, round black wheels with light-grey hubs (the back wheels bigger than the front ones) and a long dark-grey push bar behind the seat")
# the first takes of mom-stroller and prop-stroller-tv (kept as -old) drew the TV nearly square, inside the canopy and only as wide as the stroller; the script's TV is "as big as the table", so it now overhangs the stroller on both sides
# (prop-stroller-tv: a clean wide rectangle over a small stroller; mom-stroller took two more tries, see there)
STROLLER_TV = (f"{STROLLER}, seen from the front, standing upright on its wheels with nothing in its seat, with a giant TV where its canopy should be: the canopy is flipped up and turned to face the viewer and has become one giant flat widescreen TV "
               "(a wide rectangle with sharp straight edges, about one and three quarters times as wide as it is tall, with a thin dark-grey bezel framed all round by a thick strip of sky-blue canopy fabric). "
               "The TV is gigantic, more than twice as wide as the stroller itself, so it sticks out far beyond the stroller on both sides, and it is by far the biggest part of the stroller; "
               "the screen is completely blank: a plain pure flat black with no reflection, no glare, no picture, no icons, no logo and no stand")

# the four customers (the same words in all three pictures of them, glazed and cash take the first as their reference);
# each shows only ONE hand, the one on the right side of the picture, the other is under the table: customers-cash raises the hidden one (a master with both hands down gave three hands each when an arm went up, the model never takes a hand away)
CUST1 = ("a man of 40 with short dark-brown hair and light stubble in a plain grey knitted sweater, with a silver laptop open on the table in front of him, seen from its back "
         "(a flat silver-grey rectangle with a thin black outline, completely plain: no logo and no mark on it, standing upright on the table and covering his chest below his face), "
         "and one mitten hand resting on the table at the right side of the laptop, the hand on the right side of the picture (his other hand is under the table, out of sight)")
CUST2 = ("an old man of 72 who is bald on top with a ring of thin white hair over his ears, big square black-rimmed glasses (two thin black rounded rectangles around his two big white eyes, joined by a thin black bridge; "
         "behind the lenses his small black dot pupils look sideways to the left, pressed against the left edge of his whites) and a dark-red knitted cardigan, "
         "holding a folded newspaper (a flat off-white rectangle with a thin black outline, completely blank: no text, no lines and no pictures) upright in front of his chest in one mitten hand, the hand on the right side of the picture, gripping its right edge "
         "(his other hand is under the table, out of sight)")
CUST3 = ("a woman of 30 with a big mass of curly bright red hair and a mustard-yellow sweater, holding a big white ceramic coffee mug (a flat white mug much wider than her hand, with one handle and a thin black outline, nothing written on it) "
         "in one mitten hand in front of her chest, the hand on the right side of the picture (her other hand is under the table, out of sight)")
CUST4 = ("a young man of 22 in a dark-teal knitted beanie and an olive-green hoodie, with a pair of big black over-ear headphones hanging round his neck (a thin black band behind his neck and two big round black ear cups resting on his collarbones at the two sides of his chin), "
         "and one mitten hand resting flat on the table, the hand on the right side of the picture (his other hand is under the table, out of sight)")
CUSTOMERS = ("Exactly four adults sitting in one straight row side by side from the left edge of the picture to the right edge, all facing the viewer, hidden from the chest down behind the edge of one long café table, "
             "so that only their huge heads, their shoulders and the one hand of each that is described below show above it. From the left to the right the four are: "
             f"first, {CUST1}; second, {CUST2}; third, {CUST3}; and fourth, {CUST4}. "
             "Every one of the four has exactly the same light peach skin, and every face is light peach. ")
CUSTOMERS_AGAIN = ("The same picture exactly: the same four adults in the same places in the same order, with the same faces, hair, glasses, beanie, clothes and things on the table, "
                   "behind the same flat café table top along the bottom, on the same plain white background, but now ")
GLAZED = ("every person's mouth hangs wide open in a slack round 'o', and every person's two big white oval eyes are stretched wide open and stare fixedly sideways to the left of the picture, each small black dot pupil pressed against the left edge of its white oval, a blank glazed stare; "
          "every head still faces the viewer")

# the pointing hand: x15's and x16's South Park mitten words, closed except for one stiff index finger
POINT_HAND = ("a closed mitten fist drawn like the hands of the South Park characters, a plain rounded mitten shape in light peach skin with one short fat separate thumb, no finger lines, no knuckles and no fingernails, "
              "with only one stiff index finger stuck straight out, a short thick round-tipped finger, pointing")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- the mom, 1024 x 1024: x18's mom-phone is the only reference of each
  # shot 12: her head snaps up from her phone, "No no no no NO!" (the painted mouth is open, like mom-shock's; the build rocks the picture on the syllables)
  "mom-panic": job(f"{MOM_AGAIN}, except for these changes: {MOM_SEATED}, but she has just snapped her head up from her phone in alarm and the phone is gone: no phone is in the picture. "
                   "Her head is held up straight and her two big white oval eyes are stretched wide open and look straight at the viewer, each small black dot pupil sitting in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white, "
                   "with two thin brown eyebrows raised high above them, and her mouth is wide open in a shout of 'no', a big open mouth showing her teeth. "
                   "Both her elbows are bent and both her mitten hands are raised open at the height of her shoulders, one on each side of her, the palms facing the viewer and the fingers spread wide, in a frantic 'stop' gesture. "
                   f"The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT_TABLE}", [MOM_MASTER]),
  # shot 23: "See? He's eating!" (she points at the toddler, to the right of the picture)
  "mom-proud": job(f"{MOM_AGAIN}, except for these changes: {MOM_SEATED}, but she is beaming with pride and the phone is gone: no phone is in the picture. "
                   "Her head is held up straight and she has a big proud smile, a wide open smiling mouth showing a row of white teeth, her cheeks lifted, and her two big white oval eyes are wide and bright and look toward the right side of the picture, "
                   "each small black dot pupil at the right edge of its white oval, with two thin brown eyebrows raised high. "
                   "Her arm on the right side of the picture is stretched out straight sideways to the right at the height of her shoulder, above the tumbler, with its mitten hand a fist and one stiff index finger pointing to the right of the picture; her other hand rests on the tabletop. "
                   f"The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT_TABLE}", [MOM_MASTER]),
  # shot 27: "...Charger?" in a terrified whisper (hands clasped under her chin)
  "mom-plead": job(f"{MOM_AGAIN}, except for these changes: {MOM_SEATED}, but she is terrified and begging, and the phone is gone: no phone is in the picture. "
                   "Her head is held up straight and her two big white oval eyes are stretched wide open and look straight at the viewer, each small black dot pupil sitting in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white, "
                   "with two thin brown eyebrows raised high and slanted up toward the middle in a worried frown; her mouth is a small tight wobbling line, a little open, the corners pulled down. "
                   "Both her elbows are bent and pulled in against her body and both her mitten hands are clasped together in front of her chin, the fingers interlaced, in a begging pose. "
                   f"The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT_TABLE}", [MOM_MASTER]),
  # shot 16: she yanks the stroller over and flips its canopy up: the TV inside it faces the viewer (the code draws the cartoon sun on its black screen)
  # the first take (-old) had a shaded stroller with a near-square screen and her pupils low in the whites, looking down (the master's gaze is strong); the second (-old2) put a 400 x 450 screen over the stroller and turned her gaze to it;
  # the third (-old3) had a landscape screen drawn in perspective (the left side taller than the right: no right angles for the code's screen); the kept fourth says "exactly front-on, a perfect rectangle with four right-angled corners":
  # the screen is a flat 540 x 400 rectangle, her pupils sit in the lower left of her whites, looking at it
  "mom-stroller": job(f"{MOM_AGAIN}, but now she is {MOM_STAND}, standing at the right side of the picture next to {STROLLER_TV}, which stands at the left side of the picture. "
                      "The TV is drawn flat and exactly front-on, a perfect wide landscape rectangle with four right-angled corners and its edges exactly horizontal and vertical (no perspective and no tilt), much wider than it is tall, that fills almost the whole left half of the picture, with the small stroller under it. "
                      "The woman's arm on the left side of the picture is stretched out to the left, with its mitten hand gripping the right edge of the TV at the height of her chest, and her other arm hangs at her side. "
                      "Her head is held up straight and she looks proud and smug: a small closed-mouth smile, two thin brown eyebrows raised a little, and her two big white oval eyes wide and bright, looking to the left of the picture at the TV, "
                      "each small black dot pupil pressed against the left edge of its white oval. "
                      f"The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT_STROLLER}", [MOM_MASTER]),
  # ---- the toddler, 1024 x 1024: x18's toddler-pour is the only reference of each
  # shots 3, 11, 26: at his table, hypnotised (the glaze, the blue light and the trembling lip are code; his hands lie flat, the table in front of him is bare for the muffin and the tablet)
  "toddler-sit": job(f"{TODDLER_AGAIN}, but now he is sitting at a small café table instead of standing, and he holds nothing. {BEHIND_BOY}"
                     "Both his arms are stretched forward and both his small mitten hands lie flat on the tabletop in front of him, palms down. "
                     f"His mouth hangs open in a small round 'o' (a small round dark open mouth) and {STARE}: a blank, hypnotised stare. "
                     f"Nothing else is on the table or in the picture: no carton, no plate, no cup and no tablet. {LOOK} {FIT_TABLE_BOY}", [TODDLER_MASTER]),
  # shot 22: he munches popcorn out of the bucket, eyes on the screen
  "toddler-popcorn": job(f"{TODDLER_AGAIN}, but now he is sitting at a small café table instead of standing. {BEHIND_BOY}"
                         f"He hugs {POPCORN} in both arms: the bucket stands on the tabletop right in front of him, its rim at the height of his chin, and both his arms are wrapped round its sides with the mitten hands on its front. "
                         f"His cheeks are puffed out round and full, bulging out on both sides of his face, and his mouth is closed and chewing, a small wavy line between the puffed cheeks; {STARE}. "
                         f"Nothing else is on the table or in the picture. {LOOK} {FIT_TABLE_BOY}", [TODDLER_MASTER]),
  # ---- Ross in his apron, 1024 x 1024 (only the master's own seed 61 keeps his head's size); calm in all three
  # shots 2 and 4: the song blows him back (the cups flying behind him and the wind are code; the face is his, the hair top streams to the right of the picture, the apron's ties fly out to the right)
  # Whenever the hair or a hat changes the head's outline the model redraws the head a little smaller (x17's ross-point changed his face and kept the master's head to the pixel, ross-headphones here did too):
  # five takes and variants (a "hurricane" sentence, "head exactly the same size" sentences, the master as the only reference) all drew the head 0.88 to 0.93 of the master's size; the kept one (words as below, both references)
  # has the face at 0.91 of the master's size, its eye midpoint 4 px left and 22 px up of the master's, and the closest face of them (scripts: mean difference 7.2 after aligning on the eyes, against 3 to 6 for the exact heads and 10 to 13 for the others);
  # the first two takes are ross-blown-61-old.png and -old2.png (their hair streamed to the right and to the left, heads 0.89 and 0.875), the master-only tries were not kept
  "ross-blown": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, calm: a polite closed-mouth smile held steady, the brows relaxed (not angry), the two big white eyes open looking straight ahead. "
                    "Both his arms are bent in front of his belly and both mitten hands are clenched into fists, gripping the air at the height of his belly (nothing is drawn there); his body does not lean and both his feet stay flat on the ground. "
                    "The longer swept top of his reddish-brown hair is blown flat over to the right of the picture and streams out sideways like a flag, and the bib of his apron and its two long waist ties fly out sideways to the right, flapping. "
                    f"Nothing else is in the picture: no wind lines and no objects. {LOOK} {FIT}", ROSS),
  # shot 14: "Headphones?" (held out over the counter)
  "ross-headphones": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, calm and helpful like a shop assistant offering something: a small friendly closed-mouth smile, the brows relaxed, the two big white eyes open looking straight ahead. "
                         f"Both his arms are stretched forward and bent a little at the elbows, and his two mitten hands hold {HEADPHONES} out in front of him at the height of his chest, one hand on each ear cup, the headband between them, flat toward the viewer, so that his face stays uncovered. "
                         f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 20: "...Popcorn?" (the paper hat and the bucket; the dim light is code)
  # the master's hair top is 30 px under the picture's top edge, so a hat needs room above the hair and the model redraws the whole figure smaller to make it (as with ross-blown): the takes with a taller hat (-old, -old2, head 0.84 and 0.81 of the master's),
  # a covering-the-hair hat, a flat disc (looked like a plate) and a paper garrison cap (a good paper hat, head 0.87) are not kept; the kept one has a pillbox only half an eye tall, both references:
  # face at 0.84 of the master's size, the eye midpoint 14 px left and 8 px up of the master's, mean face difference 7.6 after aligning on the eyes
  "ross-usher": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front. He is a calm, polite cinema usher making an offer: a small pleasant closed-mouth smile, the brows relaxed, the two big white eyes open looking straight ahead. "
                    f"On top of his hair sits {HAT}. "
                    f"Both his arms are bent and raised in front of him and his two mitten hands hold {POPCORN} up in front of his chest, one hand under each side of the bucket, at the height of his chest and belly, below his chin, so that his face stays uncovered. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- the four customers, 1344 x 768: the master (no reference), then the same four glazed and with cash up
  # shots 17, 18, 21, 25: the café's customers (cut out one by one; the table top is a layer of its own; the blue light and the glaze are code)
  # the first take (pupils "at the far left edge", kept as customers-61-old.png) drew every pupil toward the nose, so all four stared at the viewer (left eye's pupil at 0.70 of its white, right eye's at 0.27), and so did the second (-old2, "pressed against the left edge");
  # the third (-old3) had the gaze in the look sentence itself (LOOK_CUST): three of the four looked left, the old man's pupils still converged behind his glasses; the fourth (-old4) added the glasses phrase to CUST2 and all four looked left,
  # but every person had both hands down, and a raised arm in customers-cash made three hands each (the model never takes a hand away): the kept master shows one hand each, the other is under the table
  "customers": job(CUSTOMERS + "All four are calm and are watching something off to the left of the picture: every head faces the viewer, but in every face both eyes look sideways to the left, each small black dot pupil pressed against the left edge of its big white oval, "
                   "so that both pupils of every person sit at the far left of their whites; every mouth is a small closed line, neither smiling nor frowning. "
                   f"Nothing else is in the picture. {LOOK_CUST} {FIT_ROW} Horizontal frame.", res="1344x768"),
  # shot 18: they turn to the screen one by one (mouths fall open, eyes glaze); its first take (-old) was painted from the both-hands master
  "customers-glazed": job(CUSTOMERS_AGAIN + GLAZED + "; every hand stays where it was. "
                          f"Nothing else is changed. {LOOK_CUST} {FIT_ROW} Horizontal frame.", ["customers"], res="1344x768"),
  # shot 21: every hand shoots up with cash
  # the first take (kept as customers-cash-61-old.png) had the four arms up but only the laptop man's banknote (floating above his fist), three empty fists, and the old man's raised sleeve grey instead of his dark red;
  # the second (-old2.png) had four banknotes in four raised hands in the right sleeves, but every person kept both hands on the table, the laptop, the newspaper or the mug as well: three hands each; the same words said differently (-old3.png) did no better;
  # the kept words raise the hidden hand of a master that shows one hand each, so every person has exactly two
  "customers-cash": job(CUSTOMERS_AGAIN + GLAZED + ", and every person has now also shot their other arm, the one on the left side of the picture, straight up above the head, in the sleeve of that person's own clothes "
                        "(the first man's grey knitted sleeve, the old man's dark-red cardigan sleeve, the woman's mustard-yellow sweater sleeve, the young man's olive-green hoodie sleeve). "
                        "Every one of the four raised mitten hands grips one flat green banknote between its thumb and fingers and holds it up high, so that there are four banknotes in all, one in each raised hand "
                        "(each banknote a plain flat green rectangle with a thin black outline, as wide as the hand, completely blank: no numbers, no symbols, no portrait and no text on it). "
                        "The hand that was already down stays exactly where it was and holds the same thing: every person has exactly two arms and two hands, one raised with its banknote and one down, and nobody has a third hand; "
                        "the whole of every raised arm, hand and banknote stays inside the picture. "
                        f"Nothing else is changed. {LOOK_CUST} {FIT_ROW_UP} Horizontal frame.", ["customers"], res="1344x768"),
  # ---- the props (the tablet, the stroller and the rack 1344 x 768, the rest 1024 x 1024; no reference)
  # shots 1, 6, 10, 13: the tablet (its screen is plain black: the code draws the cartoon sun, the volume bars, the finger)
  "prop-tablet": job("One tablet computer in a thick bright-orange rubber case, seen exactly from the front, standing upright and wider than it is tall, drawn flat: a thick rounded bright-orange case frame with big rounded corners and, inside it, "
                     "one big flat rectangular screen with sharp straight edges, a plain pure flat black, completely blank: no reflection, no glare, no icons, no clock, no battery symbol, no lines and no picture on it. "
                     f"Nothing else is on the front: no buttons, no camera and no logo. {PROP.replace('A single object, centered', 'A single tablet, centered')} Horizontal frame.", res="1344x768"),
  # shots 3, 6: the muffin (it hops across its plate: the muffin and the plate are two separate shapes)
  "prop-muffin": job("One blueberry muffin on a small white plate, seen exactly from the front and a little from above: a tall puffed round golden-brown muffin top with seven small flat dark-blue blueberry dots on it, bulging out over the rim of a flat pleated light-brown paper cup, "
                     "standing in the middle of a flat white round plate (a thin wide white oval, much wider than the muffin, with a thin black outline and a thin inner ring line). The muffin and the plate are two separate flat shapes. Nothing is written on anything. "
                     f"{PROP.replace('A single object, centered', 'A single muffin on its plate, centered')} Square frame."),
  # shots 5, 6: the stroller parked beside the mom (from the side; the words ask for the hood folded down, the model drew the ordinary open hood, which reads as a parked stroller)
  "prop-stroller": job(f"One {STROLLER}, seen exactly from the side with its push bar at the left and its front at the right, standing upright on its wheels (only the two near wheels show), "
                       "with its big sky-blue canopy (a half-dome hood of fabric) folded down over the front half of the seat; nothing is in the seat. "
                       f"{PROP.replace('A single object, centered', 'A single stroller, centered')} Horizontal frame.", res="1344x768"),
  # shots 17, 18, 21, 24, 25, 30: the stroller with its giant TV (the code draws the cartoon sun, the red battery and the black on the screen); the first take (-old) had a near-square screen inside the canopy, as wide as the stroller
  "prop-stroller-tv": job(f"{cap(STROLLER_TV)}. The viewer looks at the stroller's front, so its push bar is hidden behind it; the whole stroller and the whole TV fit inside the picture. "
                          f"{PROP.replace('A single object, centered', 'A single stroller, centered')} Square frame."),
  # shots 8, 28: the little rack of phone chargers by the till (it rattles; Ross takes one off it)
  "prop-rack": job("One small counter display rack seen exactly from the front: a flat dark-grey rectangular backboard (wider than it is tall, with a thin black outline) standing upright on a small flat dark-grey foot, "
                   "with a straight row of four small silver hooks along its middle, and from each hook hangs one phone charger: a white cable loop over the hook and, below it, a small white rectangular plug block (a flat white rounded rectangle with a thin black outline, with two short flat silver prongs at its bottom). "
                   "The four chargers are exact copies of each other, evenly spaced in one row; the backboard is plain: no sign, no label and no text. "
                   f"{PROP.replace('A single object, centered', 'A single rack, centered')} Horizontal frame.", res="1344x768"),
  # shots 28, 30: the charger Ross slides across the counter (a white brick with a coiled cable)
  "prop-charger": job("One white phone charger seen exactly from the front: a small white rectangular plug block (a flat white rounded square with a thin black outline) with two short flat silver prongs sticking out of its top edge, "
                      "and from its bottom edge a long white cable that winds into a neat spiral coil of four round loops like an old telephone cord and ends in a small white connector (a flat white rounded rectangle with a thin black outline). Nothing is written on it. "
                      f"{PROP.replace('A single object, centered', 'A single charger, centered')} Square frame."),
  # shots 20, 21, 22: the striped popcorn bucket full of popcorn
  "prop-popcorn": job(f"{cap(POPCORN)}, seen exactly from the front, standing upright. {PROP.replace('A single object, centered', 'A single bucket, centered')} Square frame."),
  # shot 19: the light switch on its wall plate (Ross's hand flips it; the plate is on white, the wall is the build's)
  "prop-switch": job("One light switch on its wall plate, seen exactly from the front: a flat white rectangular wall plate (taller than it is wide, with rounded corners and a thin black outline) with one small round grey screw near its top edge and one near its bottom edge, "
                     "and in the middle of the plate one rocker switch (a flat ivory rounded rectangle, taller than it is wide, with a thin black outline, inside a slightly bigger rounded rectangular opening). Completely plain: no text and no symbols. "
                     f"{PROP.replace('A single object, centered', 'A single wall plate, centered')} Square frame."),
  # ---- the pointing hands, 1024 x 1024: the arm comes in from one edge and is cut off by it (the build's volume taps 10 and 13, the light switch 19, the charger slide 28 and her plug 30, instead of a fist)
  # Ross's: x16's hand-ross and his avatar are the references, so the skin, the tattoo sleeve and the smartwatch are his (x15's ins-invoice and x16's hand-ross do the same with x08's ross-hand); his forearm lies horizontal and the finger points to the right;
  # the first take (-old, without the last background sentence) had faint warm streaks in the white (47 specks that the build's white rule leaves, 2,600 px); with the sentence 15 specks (1,000 px); the x16 hand as the only reference did the same, so both references stay
  "hand-ross-point": job("The same forearm and hand as in the first picture, with the same black smartwatch, the same colourful tattoo sleeve and the same light peach skin, but now seen from the side: the forearm comes in horizontally from the left edge of the picture and is cut off by that edge, "
                         f"with the tattoo sleeve on it and the black smartwatch at the wrist, and at its right end the hand is {POINT_HAND} straight out to the right of the picture, as if about to press a button. "
                         f"The stick is gone: nothing is held in the hand and nothing else is in the picture. The whole background is one perfectly flat plain white, with no streaks, no marks and no texture on it. {ARM} Square frame.", [ROSS_HAND, AVATAR]),
  # the mom's: x18's mom-phone is the only reference (the lavender sleeve, her skin; x16's hand-kenzie does the same with Kenzie's master); her forearm lies horizontal and the finger points to the left
  "hand-mom-point": job("A close view of just one arm of the same woman as in the picture, with nothing else of her: no head, no face and no body. The arm is the sleeve of her same lavender zip-up athletic jacket, exactly the same flat pale purple with a thin darker-purple seam line, "
                        "seen from the side, a plain sleeve tube that comes in horizontally from the right edge of the picture and is cut off by that edge, with a plain ribbed lavender cuff at the wrist; "
                        f"at its left end her hand is {POINT_HAND} straight out to the left of the picture. "
                        f"Nothing is held in the hand and nothing else is in the picture. {ARM} Square frame.", [MOM_MASTER]),
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
