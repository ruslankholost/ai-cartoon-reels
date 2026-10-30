# Art for x18 "Unattended" (docs/x18-unattended.md): the mom (at her table on her phone, lowering her sunglasses, walking out with her tote, shocked), the toddler (tipping the oat-milk carton, then in his tiny apron),
# the pigtailed girl licking the glass, the eight kids (the row over the counter, the same row zapped, the cleaning scene), the drop-off mom with three kids, the grandpa, the wagon of triplets,
# Ross in his apron (taping the sign, one finger up, feet up, wiping a cup), the carton, the sign and the espresso cup, and the seating-corner plate: 21 pictures, plus one extra (girl, her plain portrait, the master of girl-lick).
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x17-art-gen.py, scripts/x16-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP and SCENE words, the TABLE words, the sunglasses and Ross's references are theirs;
# the face squashed on the glass is x11's chuck-smush idea, the row of heads over a counter edge is x17's couple-pop idea, the cleaning scene on the café plate is x16's bg-line idea).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x18-art-gen.py [name[:seed,seed] ...]     -> out/x18-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call (a picture takes 20 to 65 s, the model loads once per call). One seed per picture: a name gets 61; a second seed only if the first is broken, and SEEDS names the kept one.
# References and sizes (a "KI" reference makes the first reference set the shape, a square one gives 1024 x 1024; "I" and no reference give the size in the job):
#   mom-phone, toddler-pour, girl, dropoff, grandpa, wagon: no reference (the masters of their characters and the two groups), 1024 x 1024.
#   mom-glasses, mom-walk, mom-shock take mom-phone, toddler-apron takes toddler-pour, girl-lick takes girl: "KI", 1024 x 1024.
#   kids-row: no reference, 1344 x 768 (the row of eight on white, the counter top along its bottom); kids-zap takes kids-row: "KI", 1344 x 768.
#   kids-work takes x10's bg-counter ("KI", so the wall, the machines and the counter stay the plate's): 768 x 1344.
#   ross-tape, ross-finger, ross-feetup, ross-wipe: the x08 master and the avatar, "KI", 1024 x 1024.
#   prop-carton, prop-cup: no reference, 1024 x 1024; prop-sign: no reference, 1344 x 768; bg-seating: no reference, 768 x 1344.
# Text is never painted (the prompts say so; the carton, the sign, the cups and the plates have no letters, the code draws OAT MILK, the sign's lines, NOW HIRING, $6.50 and the captions).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61,
# the other seeds drew a smaller head, so every Ross picture is seed 61: his eye whites sit at the master's exact pixels in all four). He wears x10's brown apron over the black tee (the bib over his chest, the ties round his waist, as x11's ross-pj wears it)
# and his face is calm in all four: Ross does not blow up in this episode.
# The mom, the toddler, the girl and the kids are new: ONE description each (MOM, TODDLER, GIRL, and the CAPBOY, RAINGIRL and HOODIE words that the drop-off shares; the row, the cleaning scene and the wagon say the same things inline);
# the first picture of the mom, the toddler and the girl is the master and its seed is in PICK; the later pictures take it as the only reference (the _AGAIN words).
# The row of eight kids has the counter top along its bottom edge (the heads, the shoulders and the raised arms over it: x17's couple-pop); it is on white so the code can cut it out over the café plates.
# Every face is light peach (the raincoat girl's too: the first two takes of the row drew her medium brown); no face is a solid dark colour.
# Reused, not repainted: x10 bg-counter (with its wall clock), bg-window (the door), ins-till, ross-apron; x11 prop-case (the pastry case); x16 hand-ross (the flip).
# The files are what WanGP saves (JPEG data under a .png name, as in every earlier episode; PIL and cv2 read them by content). A picture that was painted again keeps its first take as <name>-<seed>-old.png (a later one as -old2, -old3, -old4); SEEDS names the kept seed of a name.
# The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x18-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
BG_COUNTER = r"E:\getphantom-toons\out\x10-cast\bg-counter-61.png"
# the kept master of each picture that others take as a reference (name -> seed); a reference named here is out/x18-cast/<name>-<seed>.png
PICK = {"mom-phone": 61, "toddler-pour": 61, "girl": 61, "kids-row": 61}

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
SCENE = ("Drawn exactly in the style of the TV cartoon South Park: a flat paper cut-out collage, every object one simple flat-coloured paper shape with a thin black outline, solid colors with no gradients, no shading, "
         "no lighting effects, no glow, no reflections, no texture and no photographic detail, like a child's drawing; the people with huge round heads, big white oval eyes with small black dot pupils, no noses and mitten hands. "
         "A flat front-on scene filling the whole picture from edge to edge, no border. No text, no letters and no numbers anywhere. Vertical frame.")
# the words for the pictures that are not one short standing figure (only the body sentence or the margin changes; the white background stays)
BODY = "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands."
LOOK_MANY = (LOOK.replace("The head is huge,", "Every head is huge,")
                 .replace(BODY + " Two big white oval eyes touch each other, with small black dot pupils. No nose.",
                          "Every body is short and stubby, with short arms and simple mitten hands, the children's bodies even shorter than the grown-ups'. Every face has two big white oval eyes that touch each other, with small black dot pupils, and no nose.")
                 .replace("An original character, not a character from the show.", "Original characters, not characters from the show."))
LOOK_ROW = LOOK_MANY.replace("Every body is short and stubby, with short arms and simple mitten hands, the children's bodies even shorter than the grown-ups'.", "The shoulders are narrow, the arms short and the hands simple mittens.")
assert LOOK_MANY != LOOK and "Every body" in LOOK_MANY and "Original characters" in LOOK_MANY and "Every head" in LOOK_MANY
assert LOOK_ROW != LOOK_MANY and "narrow" in LOOK_ROW
FIT_TABLE = FIT.replace("Full body, the whole figure", "The whole woman and the whole table")
FIT_HEAD = FIT.replace("Full body, the whole figure fits inside the square picture with a wide white margin all round", "The head, the shoulders and the two hands fill most of the square picture with a narrow white margin all round")
FIT_GROUP = FIT.replace("Full body, the whole figure", "The whole group, every person from head to toe,")
FIT_WAGON = FIT.replace("Full body, the whole figure", "The whole wagon with the three boys in it")
FIT_CHAIR = FIT.replace("Full body, the whole figure", "The whole chair with him in it")
FIT_ROW = ("The eight heads, their shoulders and their raised arms fill the picture, and the flat light-wood counter top (a long flat orange-tan strip with a thin black outline and a darker-brown front edge) "
           "runs from the left edge to the right edge along the very bottom of the picture, on a plain white background above it.")
assert FIT_TABLE != FIT and FIT_HEAD != FIT and FIT_GROUP != FIT and FIT_WAGON != FIT and FIT_CHAIR != FIT

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
ROSS_CHAIR = ROSS_HEAD.replace("redrawn as a full-body puppet", "redrawn seated in a chair")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
APRON = "a plain brown apron (a flat brown bib shape with a curved neck cutout at the top, a strap loop at each top corner, two long waist ties hanging down, nothing written or drawn on it)"
ROSS_APRON = f"Over the t-shirt he wears {APRON}, the bib over his chest and the ties tied round his waist, the short black sleeves and the tattooed forearms showing on both sides of it."
SHEET = ("one sheet of plain blank white paper (a flat white rectangle wider than it is tall, with a thick black outline, completely blank: "
         "no text, no lines, no drawings, no numbers, no logo and nothing printed on it)")
MUG = "one white ceramic coffee cup (a flat white cup a little wider at the top, with one small handle on its side and a thin black outline, nothing written on it)"
CHAIR = ("a plain wooden café chair seen exactly from the front and drawn in flat dark-brown wood: a tall straight backrest with two flat horizontal slats that rises behind his shoulders and head, "
         "a flat seat under him and the tops of the front legs at the sides; the chair is plain, with no cushion and no pattern")

# the mom: the sunglasses sit on her head (never over her eyes), the table hides her lap and legs when she sits
MOM = ("A young mother of 34 with a huge round head, light peach skin, blond hair gathered into one big messy bun on top of her head (a big flat golden-yellow round knot with a few loose strands sticking out of it) and two loose blond strands hanging down in front of her ears, "
       "a pair of big oversized black sunglasses pushed up and resting on top of her head in front of the bun (two big flat black rounded lenses joined by a thin black bridge, not over her eyes: both of her big white eyes are fully visible), "
       "a soft lavender zip-up athletic jacket (a flat pale-purple jacket with a high collar and one thin darker-purple zipper line down the middle) over a white tank top")
MOM_AGAIN = ("The same woman as in the picture, with exactly the same blond messy bun and loose strands, the same big black oversized sunglasses, the same lavender zip-up jacket over the white tank top and the same face, "
             "all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
MOM_STAND = "standing, seen from the front, the whole woman from head to feet, in black leggings and white sneakers, with no table and no chair in the picture"
TUMBLER = ("one huge insulated tumbler (a very tall wide flat pale mint-green cylinder as tall as her whole head and a little narrower at the bottom, one big flat mint-green handle loop on its right side, "
           "a flat white lid on top and one short thin white straw sticking up out of the lid, completely plain: no logo, no text, no pattern)")
TOTE = "one big plain beige canvas tote bag (a flat tan rectangle with two flat handle loops, nothing printed on it)"
PHONE_BACK = "one black smartphone (a flat black rounded rectangle, its plain black back toward the viewer with one small round camera lens on it)"
# the table: x16's TABLE words in the café's wood colours (light oak top, dark-brown column)
TABLE = ("one small round wooden café table seen exactly from the front, flat with no perspective: a thin wide flat light-oak tabletop (a long low flat rounded slab much wider than her shoulders, "
         "a flat muted honey-tan wood colour, a soft light brown like pale cardboard and not bright orange, with a thin black outline and a slightly darker-brown front edge), held up by one thick short plain dark-brown wooden column in the middle that ends in a flat round dark-brown base on the floor")
BEHIND = (f"She sits behind {TABLE}, facing the viewer, seen from the front: the tabletop is in front of her at the height of her belly and hides her lap and legs, "
          "so no legs, no chair and no feet are drawn; below the tabletop only the table's column and its round base are seen. ")
# her face while she is outraged (the steep V of the brows is x13's ANGRY, the open shout is x10's ross-point)
OUTRAGED = ("outraged and shouting at the top of her lungs: her mouth wide open in a huge shout showing her teeth, the brows pulled down hard in a steep V over her eyes, "
            "the two big white eyes wide open with tiny black dot pupils")

# the toddler, the girl and the other kids (the same words in every picture they are in)
TODDLER = ("A toddler boy of 3 with a huge round head, light peach skin, wild messy brown hair sticking out in big uneven tufts in all directions, "
           "a bright green t-shirt with one small plump white cartoon dinosaur on its chest (a round white body, a long tail, a small head and three little plates along its back), blue denim shorts and small red sneakers")
TODDLER_AGAIN = ("The same toddler boy as in the picture, with exactly the same huge round head, the same wild messy brown hair in big uneven tufts, the same bright green t-shirt, the same blue denim shorts and the same small red sneakers, "
                 "all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
CARTON = ("one huge milk carton (a tall flat white rectangular box with a thin black outline, a pitched light-blue roof on top of it like the roof of a little house, a short flat light-blue band round its bottom "
          "and one small round light-blue screw cap on the slope of the roof), its big front panel completely blank: no text, no letters, no logo, no picture and no marks on it")
COFFEE = ("one paper takeaway coffee cup (a flat white cup tapering toward the bottom, a plain brown cardboard sleeve around its middle and a flat white lid with a small sip hole, nothing written or printed on it)")
GIRL = ("A girl of 6 with a huge round head, light peach skin, rosy cheeks, blond hair in two pigtails (each pigtail a short flat golden-yellow bunch tied with a small red bobble, sticking out sideways from the side of her head) "
        "and a plain pink dress with a round white collar")
GIRL_AGAIN = ("The same girl as in the picture, with exactly the same huge round head, the same blond pigtails tied with small red bobbles, the same rosy cheeks and the same pink dress with the round white collar, "
              "all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
CAPBOY = "a boy of 7 with short brown hair under a red baseball cap worn facing forward, a blue-and-white horizontally striped shirt, blue jeans and sneakers"
RAINGIRL = "a girl of 6 with exactly the same light peach skin as the other children, a big round puff of curly black hair, a bright yellow raincoat with its hood down and red rain boots"
HOODIE = "a boy of 8 with short dark-blond hair, a blue hoodie with its hood down, grey trousers and sneakers"
HAIRDRYER = "one pink hair dryer (a flat pink body with a black handle and a short black cord)"
MOP = "one big mop (a long plain wooden handle with a flat grey mop head made of thick grey strings at its end)"
CHAIRS = "small plain wooden café chairs (flat brown chairs with a straight backrest, a flat seat and four thin legs)"

# the brunette mom at the door
MOM2 = ("a brunette mother of 35 with a huge round head, light peach skin, long dark-brown hair pulled into a high ponytail, a flat teal-green button-up coat, blue jeans and brown boots, "
        "and one brown leather shoulder bag hanging on one shoulder")
# the grandpa
GRANDPA = ("An old man of 72 with a huge round head, light peach skin, thick fluffy white hair on top and at the sides, big bushy white eyebrows, "
           "small round thin-rimmed black glasses (two thin black circles around his two big white eyes, joined by a thin black bridge), "
           "a beige knitted cardigan with three flat brown buttons over a white collared shirt, dark brown trousers and brown shoes")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- the mom, 1024 x 1024: the master (no reference), then the three on it
  # shots 3, 5, 8: at her table by the window, on her phone, never looking up (her talking mouth is code; shot 5's raised brow is code)
  # the first take (seed 61, "orange-tan" tabletop, "one corner a little higher", "the brows flat and relaxed") had the face right (a flat mouth, no brows) but a bright orange table (252,161,66; the café's counter top is 233,179,109): kept as mom-phone-61-old.png;
  # the second (the table in muted honey-tan, the face words as before) drew thin brows and a sad mouth (-old2); the kept third has the muted table and the face words "a short flat straight line ... no eyebrows at all"
  "mom-phone": job(f"{MOM}. {BEHIND}"
                   "She is distracted and a little smug: a small closed mouth drawn as a short flat straight line, neither smiling nor frowning, and no eyebrows at all, her head tilted down a little, "
                   "the two big white oval eyes looking down at her phone, the small black pupils at the bottom of the eyes. "
                   f"Both her arms are bent and raised in front of her chest, and her two mitten hands hold {PHONE_BACK} upright at the height of her chest, below her chin so that her face stays uncovered. "
                   f"On the tabletop at the right side of the picture, beside her, stands {TUMBLER}. "
                   f"Nothing else is in the picture. {LOOK} {FIT_TABLE}"),
  # shots 11, 12: she lowers the sunglasses onto her nose and looks up for the first time (her pupils dart: code)
  # the first take ("looking straight at the viewer", brows raised) and the second ("exactly in the middle of the white", kept as -old and -old2) had the pupils at the bottom of the whites, as on the master, whose gaze the reference keeps;
  # seed 62 (mom-glasses-62-old.png) was no better; the kept third words say "the exact vertical centre", and the pupils still sit a little low in the whites (the code draws the darting pupils)
  "mom-glasses": job(f"{MOM_AGAIN}, except for these changes: she still sits behind the same small round wooden café table with the same mint-green tumbler on it at the right side of the picture, seen from the front, but she has looked up from her phone for the first time. "
                     "Her right hand, the one on the left side of the picture, is raised to her face and pinches the middle of her big black sunglasses between the thumb and a finger, pulling them down so that they sit low on the tip of her nose; "
                     "they are no longer on top of her head, where only the bun is now. Her head is held up straight and no longer tilted down. Above the top rims of the sunglasses her two big white oval eyes are seen, wide open and looking straight at the viewer, "
                     "each small black dot pupil sitting in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white, with two thin brown eyebrows raised high above them; her mouth is a small flat closed line. "
                     f"Her other hand, the one on the right side of the picture, holds {PHONE_BACK} lowered, resting on the tabletop. "
                     f"Nothing else is in the picture. {LOOK} {FIT_TABLE}", ["mom-phone"]),
  # shot 13: out of the door with a voice note (the walk is the build's slide; the phone is in front of her mouth, which it covers, held upright against her chin)
  # the first take ("excited scheming" brows, kept as -old) and the second (-old2) drew worried brows and pupils at the bottom of the whites; seed 62 (-62-old) was no better; the kept third has no brows and the "exact vertical centre" words (the pupils still sit a little low);
  # the model hung the tote on the left of the picture, the side of the arm that holds the phone
  "mom-walk": job(f"{MOM_AGAIN}, but now she is {MOM_STAND}, hurrying, her two sneakers flat on the ground a little apart. "
                  f"On her shoulder on the right side of the picture hangs {TOTE}, hanging at her hip, and her arm on that side hangs down holding its strap. "
                  f"Her other arm, the one on the left side of the picture, is bent and raised so that its mitten hand holds {PHONE_BACK} flat and horizontal right in front of her mouth, at the height of her chin, "
                  "as if talking into it to record a voice note, the phone covering her mouth. Her head is held up straight and her two big white oval eyes are wide open and bright and look straight at the viewer, "
                  "each small black dot pupil sitting in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white; she has no eyebrows. "
                  f"The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT}", ["mom-phone"]),
  # shots 24: back from the café, "WHO GAVE HIM ESPRESSO?!"
  "mom-shock": job(f"{MOM_AGAIN}, but now she is {MOM_STAND}, her two sneakers flat on the ground a little apart, and she is {OUTRAGED}. "
                   "Both her elbows stick out to the sides and both her mitten hands are pressed flat against her cheeks, one on each side of her face, in horror. "
                   f"Nothing is in her hands. The sunglasses are on top of her head. Nothing else is in the picture. {LOOK} {FIT}", ["mom-phone"]),
  # ---- the toddler, 1024 x 1024: the master (no reference), then the apron on it
  # shots 2, 25: on the counter, tipping the carton into the till (OAT MILK on the blank side and the stream are code, from the cap at the lower left; flip the picture if the till is on the other side)
  # the first two takes (seed 61, "tips it over sideways ... its roof end pointing down") drew the carton roof-up, hugged slanted at his chest (toddler-pour-61-old.png, -old2); the third ("turned almost upside down like a bottle") had the cap low but the carton only half his height (-old3);
  # the fourth ("taller than he is", both arms up) held it above his head with the cap at his face (-old4); the kept fifth holds it by its base in front of his chest and lets it slant down to the lower left, the cap at knee height beside his body
  "toddler-pour": job(f"{TODDLER}. He stands facing the viewer, seen from the front, his two little legs a little apart with both small red sneakers flat on the ground, "
                      "a huge cheeky delighted grin showing a row of small white baby teeth, the two big white oval eyes wide open and gleeful, looking straight at the viewer. "
                      f"He is emptying {CARTON}, which is as tall as he is himself and much wider than his body: he holds it by its flat base end with both mitten hands in front of his chest and lets it slant down and away to the lower left of the picture like a pouring jug, "
                      "so that the carton is turned upside down and seen beside his body, not in front of it: the spout end with the little cap is the lowest end, pointing down at the lower left of the picture at the height of his knees, "
                      "and the flat base end in his hands is the highest end; nothing comes out of it. "
                      f"Nothing else is in the picture. {LOOK} {FIT}"),
  # shot 23: behind the till, slamming the coffee down (the $6.50 and the buzz are code)
  # the first take ("very wide open, nearly round" eyes, kept as -old) and the kept one ("huge ... half of his face") both keep the master's eyes: the reference's face is strong; the flat deadpan stare suits "Six fifty."
  "toddler-apron": job(f"{TODDLER_AGAIN}, but now he wears over the t-shirt a tiny plain brown toddler-sized apron (a small flat brown bib shape with a curved neck cutout, a strap loop at each top corner and two short waist ties, nothing written or drawn on it), "
                       "the bib covering the middle of his chest. He stands facing the viewer, seen from the front, holding out "
                       f"{COFFEE} with both mitten hands at the height of his chest, his arms stretched forward. "
                       "His two big white eyes are stretched huge and nearly round, much bigger than before, taking up half of his face, each with a tiny black pinpoint pupil in the middle, "
                       "a manic buzzing stare straight at the viewer, and his mouth is a small tight flat line. "
                       f"Nothing else is in the picture. {LOOK} {FIT}", ["toddler-pour"]),
  # ---- the girl, 1024 x 1024: her plain portrait (an extra, the master), then the squashed one on it
  # the first takes of girl-lick (no reference, her description alone with the squash words, seed 61 three times and seed 62 once; kept as girl-lick-61-old.png, -old2, -old3 and girl-lick-62-old.png) drew a plain round-headed portrait with the tongue hanging out and the hands up, the head never squashed,
  # as with x11's first chuck-smush: so the plain portrait is now a picture of its own (girl, an extra the builder did not ask for) and girl-lick takes it as its reference (KI), as Chuck's master was, and the words squash her
  "girl": job(f"{GIRL}. A close-up: her huge head, her shoulders and her two hands fill the picture, and the bottom edge of the picture cuts through the middle of her chest, so no belly, no legs and no feet show. "
              "She faces the viewer, seen from the front, cheeky: her two big white oval eyes with small black dot pupils looking sideways, her mouth open with a long pink tongue stuck out, and both hands raised beside her face with the palms toward the viewer and the fingers spread. "
              f"Nothing else is in the picture. {LOOK} {FIT_HEAD}"),
  # shot 7: her face squashed on the glass of the pastry case, licking it (the glass, the lick smear and the squeak are code)
  # with the plain portrait as its reference, seeds 61 and 62 on the first squash words ("twice as wide as it is tall"; girl-lick-61-old4.png, girl-lick-62-old2.png) stayed nearly round; on the kept words ("one and a half times as wide ... like dough")
  # seed 62 squashed the most (a head about 1.3 times as wide as tall, about what x11's chuck-smush is) and seed 63 (girl-lick-63-old.png) was rounder, so SEEDS keeps 62; the hands have separate fingers, flat and spread, palms to the viewer
  "girl-lick": job(f"{GIRL_AGAIN}, but now her face is mashed flat against a pane of glass, and she is licking it, like a kid squashing her face on a shop window. "
                   "A very tight close-up: only her huge head, her shoulders and her two hands are in the picture, and the bottom edge of the picture cuts through the middle of her chest, so no belly, no legs and no feet show. "
                   "The head is no longer round: it is squashed flat like a pancake into a wide low oval, one and a half times as wide as it is tall, the top of the head pressed down flat, the chin flattened and the cheeks bulging out sideways like dough, "
                   "so that the head fills the whole width of the picture; her big white oval eyes are squeezed wider and flatter but both fully visible with their small black dot pupils looking sideways in a cheeky way, "
                   "her mouth is open with a long wide flat pink tongue stuck out of it and pressed flat against the glass, spreading over her chin, "
                   "her two pigtails are squashed up flat and bent out sideways, and both hands are spread flat and wide on either side of her face at the height of her cheeks with the palms pressed on the glass. "
                   f"No glass is drawn. Nothing else is in the picture. {LOOK} {FIT_HEAD}", ["girl"]),
  # ---- the eight kids, 1344 x 768: the row (no reference), then the same row zapped
  # shot 16: they chant at the puppy on the sign (the mouths' pumping is code)
  # eight kids on every take (toddler, pigtail girl, cap boy, raincoat girl, hoodie boy, the three triplets, each with one arm up and one pointing finger); the first two takes (kids-row-61-old.png, -old2; the first without skin words, the second with "light tan skin")
  # drew the raincoat girl medium brown (the model reads the black puff that way), so the kept third says "exactly the same light peach skin as the other children"; the counter top is at y 565-612 of 768, with a white strip under it
  "kids-row": job("Exactly eight children standing in one straight row side by side from the left edge of the picture to the right edge, their shoulders touching, all facing the viewer, hidden from the chest down behind the edge of a counter, "
                  "so that only their huge heads, their shoulders and their raised arms show above it. From the left to the right the eight are: "
                  "first, a toddler boy with wild messy brown hair and a bright green t-shirt; second, a girl with two blond pigtails tied with small red bobbles and a pink dress; third, a boy with a red baseball cap and a blue-and-white striped shirt; "
                  "fourth, a girl with exactly the same light peach skin as the other children, a big round puff of curly black hair and a bright yellow raincoat; fifth, a boy with short dark-blond hair and a blue hoodie; "
                  "and then the sixth, the seventh and the eighth, three identical four-year-old boys, exact copies of each other, each with the same round face, the same flat dark-brown bowl haircut and the same bright orange t-shirt. "
                  "All eight are chanting at the top of their voices: every child's mouth is wide open in a big shout, every child's two big white eyes look straight up, and every child has one arm, the one on the left side of the picture, "
                  "stretched straight up above the head with the mitten hand a fist and one stiff index finger pointing at the ceiling; the other arm is hidden behind the counter. "
                  f"Nothing else is in the picture. {LOOK_ROW} {FIT_ROW} Horizontal frame.", res="1344x768"),
  # shot 19: after the espresso, ZAP (the white flash and the buzz are code)
  # the first take (hair "stands straight up" in general words; kids-zap-61-old.png) had it up on four of the eight, the second (-old2; each child's hair named) on all but the toddler, whose tufts are already wild;
  # the kept third adds "the arms hang straight down, hidden behind the counter": it is much the same, and the raincoat girl's hood and the toddler's shoulder still bump up beside their heads (no arm or hand shows)
  "kids-zap": job("The same picture exactly: the same eight children in the same places in the same order, with the same faces, the same hair colours and the same clothes, behind the same flat light-wood counter top along the bottom, on the same plain white background, "
                  "but now they have all been zapped by a jolt of caffeine: every child's two big white oval eyes are stretched huge and wide open, nearly round, taking up much of the face, each with a tiny black pin-dot pupil, "
                  "every child's hair stands straight up on end like the bristles of a brush: the toddler's tufts all point straight up, the pigtail girl's blond hair and both her pigtails stick straight up like antennas, "
                  "the red cap sits on top of its boy's spiky brown hair, which stands straight up out of it, the curly black puff is a tall spiky tower, the blue-hoodie boy's hair is a tall spiky brush, and the three identical boys' dark-brown hair stands straight up in tall spikes above their flat bowl haircuts; "
                  "and every child's mouth is a tense wide grin showing clenched teeth. Every child's two arms now hang straight down, hidden behind the counter: every shoulder is low and sloping, "
                  "no arm, no sleeve and no hand rises beside any head or above any shoulder, and only the eight heads and the eight pairs of shoulders are seen above the counter. "
                  f"Nothing else is changed. {LOOK_ROW} {FIT_ROW} Horizontal frame.", ["kids-row"]),
  # ---- the cleaning scene, 768 x 1344: x10's bg-counter on the first reference, the kids in words
  # shot 21: the café in a blur (the speed lines, the shake and Ross's feet up on the counter are code)
  # the first take (kids-work-61-old.png) put the pigtailed girl on the back counter blow-drying the espresso machine; the kept second says "on the front counter beside the cash register" and adds the flat-colour words;
  # the wall's faint paper grain is the same as x16's accepted bg-line (std 2.8 against 3.1; the original bg-counter is 0.6); the triplets each hold a chair in front of them, there is no tall stack; the middle of the front counter is left free for Ross's feet
  "kids-work": job("The same coffee shop as in the picture, drawn in the same flat paper cut-out style, with the same beige back wall, the same chalkboard and round clock, the same back counter with the espresso machine and the panini press, "
                   "the same front counter with the cash register at its left and the glass jar at its right and the same wooden floor strip, all kept exactly the same and in the same places, but now nobody works behind the counter and six children are busy cleaning the café, "
                   "each one a whole standing child with a huge round head, big white oval eyes with small black dot pupils, no nose and mitten hands, all with busy, determined, wide-eyed faces: "
                   f"standing on top of the front counter (the light-wood counter top in the lower middle of the picture, not on the back counter), at its left end right beside the grey cash register that stands on it, is a girl with two blond pigtails and a pink dress, "
                   f"her feet on the counter top, aiming {HAIRDRYER} at the cash register as if blow-drying it; "
                   f"in the lower left, in front of the counter, a boy with short dark-blond hair and a blue hoodie pushes {MOP} across the floor; "
                   "in the lower right, in front of the counter, a girl with a big round puff of curly black hair and a bright yellow raincoat wipes the top of one small round wooden café table with a flat white rag; "
                   f"and in the lower middle, in front of the counter, three identical four-year-old boys in bright orange t-shirts with the same flat dark-brown bowl haircuts stand side by side, each holding one of {CHAIRS} up in both hands, with one tall stack of the same chairs beside them. "
                   "The whole picture, the wall, the counters and the children, is in flat solid colours with no grain, no noise and no texture anywhere, exactly as flat as the first picture. "
                   f"Nothing else is in the picture and no grown-up is in it. {SCENE}", [BG_COUNTER]),
  # ---- the drop-off, the grandpa and the wagon, 1024 x 1024 (no reference)
  # shot 14: another mom shoves three kids through the door (the door is bg-window's; the thud and the bell are code)
  # the first take is kept: the mom stands behind the three with her hands on the cap boy's cap and the hoodie boy's head, a calm smile (not hurried), the raincoat girl in front of her legs; no door is painted (white background, cut it out)
  "dropoff": job("Four people seen from the front. At the back, taller than the others, stands "
                 f"{MOM2}, in a great hurry: her two big white oval eyes wide open with small black dot pupils, her mouth a tight forced smile, her two arms stretched out forward and down so that her two mitten hands rest on the shoulders of the two outer children from behind. "
                 "In front of her, in one row side by side and leaning forward as if she has just pushed them ahead of her, stand three children, each a whole standing child with a huge round head, big white oval eyes and mitten hands, all three surprised, with small open mouths and the arms out a little for balance: "
                 f"on the left, {CAPBOY}; in the middle, {RAINGIRL}; on the right, {HOODIE}. "
                 f"Nothing else is in the picture: no door and no doorway. {LOOK_MANY} {FIT_GROUP}"),
  # shot 15: "See you Tuesday!" (he pushes the wagon in, lets go and waves; the wagon is its own picture)
  "grandpa": job(f"{GRANDPA}. He stands facing the viewer, seen from the front, his two short stubby legs side by side with both shoes flat on the ground, a warm cheerful smile, the two big white oval eyes behind the glasses looking straight at the viewer. "
                 "His right arm, the one on the left side of the picture, is raised and bent at shoulder height with the mitten hand open and the fingers spread, waving goodbye; his other arm hangs relaxed at his side. "
                 f"Nothing else is in the picture. {LOOK} {FIT}"),
  # shot 15: the triplets ride in (it rolls on into the café after he lets go; the wagon is seen from the side, the boys face the viewer, no handle)
  "wagon": job("One red children's pull wagon seen exactly from the front and drawn flat: a bright flat red rectangular wagon box with rounded corners and a thin darker-red rim along its top edge, two small round black wheels with light-grey hubs under its bottom corners, "
               "its pull handle folded down out of sight so that no handle is seen. In the wagon sit three identical four-year-old boys side by side, exact copies of each other, facing the viewer, "
               "only their huge round heads and the tops of their bright orange t-shirts showing above the front wall of the wagon, their small mitten hands gripping its rim; each boy has the same round face, the same flat dark-brown bowl haircut with a straight fringe, "
               "two big white oval eyes with small black dot pupils looking straight at the viewer and a calm happy closed-mouth smile. "
               f"Nothing else is in the picture. {LOOK_MANY} {FIT_WAGON}"),
  # ---- Ross in his apron, 1024 x 1024 (only the master's own seed 61 keeps his head's size); calm in all four
  # shot 9: he slaps the sign onto the licked glass (the tape, the sign's drawing and its letters are code; the sheet is blank, nearly square, about x 395-610, y 518-728)
  "ross-tape": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, a small calm closed-mouth smile, the brows relaxed, the two big white eyes open looking straight ahead. "
                   f"Both his arms are stretched forward and bent a little at the elbows, and his two mitten hands are spread flat on the upper two corners of {SHEET}, pressing it flat in front of his chest as if pressing it onto a pane of glass (no glass is drawn); "
                   "the sheet faces the viewer and covers his belly but not his face. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 17: "Espresso first." (a waiter's one finger)
  "ross-finger": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, polite and calm like a waiter taking an order: a small pleasant closed-mouth smile, the brows relaxed, the two big white eyes open looking straight ahead. "
                     "His right arm, the one on the left side of the picture, is bent at the elbow and raised so that its mitten hand is held up beside his shoulder at the height of his chin, a closed fist with one stiff index finger pointing straight up, the palm facing the viewer; "
                     f"his other arm hangs relaxed at his side. Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 21: feet up on the counter with a coffee while the kids work (the counter, the steam and the cut-in are code; the chair is part of the picture, his legs come toward the viewer and end in two black soles at the bottom)
  "ross-feetup": job(f"{ROSS_CHAIR}, {TEE}. {ROSS_APRON} He sits leaning back in {CHAIR}, seen exactly from the front, relaxed and content: a calm contented closed-mouth smile, the brows relaxed, the two big white eyes open looking straight ahead, his huge head upright. "
                     "His two legs are stretched straight out in front of him toward the viewer and raised up, side by side, drawn foreshortened: the two dark-blue jeans legs come toward the viewer and end in his two black sneakers at the bottom of the picture, the soles of the sneakers toward the viewer. "
                     f"His right arm, the one on the left side of the picture, is bent and raised so that its mitten hand holds {MUG} at the height of his chest; his other arm rests on his belly. "
                     f"Nothing else is in the picture: no counter and no table. {LOOK} {FIT_CHAIR}", ROSS),
  # shot 25: "He was exploring." (calm, wiping a cup; the towel hangs from his hand beside the cup rather than going into it)
  "ross-wipe": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, calm and dry: a small flat polite smile, the brows relaxed, the two big white eyes open looking straight ahead. "
                   f"Both his arms are bent in front of his chest: his right hand, the one on the left side of the picture, holds {MUG} upright at the height of his chest, "
                   "and his other hand, the one on the right side of the picture, holds a plain white dish towel (a flat white cloth) pushed into the cup, wiping it. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- the props, 1024 x 1024 (the sign 1344 x 768)
  # shots 2, 25 and the insert 1: the oat-milk carton (the code letters OAT MILK on its blank front panel)
  "prop-carton": job(f"{CARTON[0].upper() + CARTON[1:]}, seen exactly from the front, standing upright. {PROP.replace('A single object, centered', 'A single carton, centered')} Square frame."),
  # shots 9, 10, 20: the sign (the code letters the lines; the back's NOW HIRING is code too)
  "prop-sign": job(f"{SHEET[0].upper() + SHEET[1:]}, seen exactly from the front, with only two small drawings on it, both in the bottom corners: in the bottom left corner one little coffee cup (a small flat brown cup with a handle on a flat tan saucer), "
                   "and in the bottom right corner one little happy sitting puppy (a round tan body, a round tan head with two floppy dark-brown ears, a small black nose and a small pink tongue hanging out); "
                   "all the rest of the sheet, its whole upper part and its middle, stays completely blank for lettering. "
                   f"{PROP.replace('A single object, centered', 'A single sheet, centered')} Horizontal frame.", res="1344x768"),
  # shot 18: the eight espresso cups that slide down the counter
  "prop-cup": job("One tiny white espresso cup on a saucer, seen from the front and a little from above: a small flat white cup with a thin black outline and a small ear-shaped handle on its right side, "
                  "standing on a flat white round saucer (a thin wide white oval plate wider than the cup, with a thin black outline), and inside the cup's round opening a flat dark-brown oval of espresso. "
                  f"{PROP.replace('A single object, centered', 'A single cup on its saucer, centered')} Square frame."),
  # ---- the plate, 768 x 1344
  # shots 3, 5, 8, 11, 12, 24: the seating corner by the front window (the mom's picture brings her own table; the people, the clock and the lettering are code)
  # the first take ("the colour of milky coffee", "orange-tan light-oak") had an ochre wall (203,166,98) and a bright orange table (217,139,59): kept as bg-seating-61-old.png;
  # the kept second has the wall at 236,211,145 (bg-counter's is 235,208,155) and a honey-tan table at 198,156,94 (the mom's table is 228,183,118); the table and the chair are drawn a little in perspective
  "bg-seating": job("The seating corner of a small coffee shop, looking at its front wall from the inside, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                    "the wall is a flat pale warm beige, light and creamy like pale sand, much lighter than mustard or ochre; across the middle of the wall one big wide window, a thin dark-brown wooden frame around one huge flat clear glass pane with a plain dark-brown window sill under it, "
                    "and through the glass a sunny street outside: a flat pale-blue sky, a flat light-grey sidewalk, a flat dark-grey road and across the street a flat pale-yellow building with a row of plain dark windows; "
                    "in front of the window on the floor stand one small round wooden café table seen exactly from the front (a thin wide flat muted honey-tan tabletop, a soft light brown like pale cardboard and not bright orange, one thick short dark-brown wooden column and a flat round dark-brown base), empty, "
                    "and beside it on its left one plain wooden café chair seen from the front (a flat dark-brown wooden chair with a tall backrest with two flat horizontal slats, a flat seat and four thin legs), empty; "
                    "a flat medium-brown wooden floor with thin plank lines across the lower fifth of the picture and a flat beige ceiling strip across the very top. "
                    f"Nothing and nobody else is in the picture. {SET}", res="768x1344"),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"girl-lick": [62]}
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
