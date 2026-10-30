# Art for x17 "Seat Swap" (docs/x17-seat-swap.md): Ross (belted in his window seat, crammed into the middle seat, clinging spread-eagled, pointing and yelling), the honeymoon couple (popping up over a seat top, kissing in profile),
# the flight attendant (leaning in, presenting with an open palm), the peacock man and his peacock (tail closed on his back, tail fanned), the pilot (standing with a drink, sitting with his legs out, and a bare-headed copy of the sitting one),
# the captain's cap alone, and the five plates (the cabin by window 12A, the seat in front with the bins, row 47, the wing outside the windows, the cockpit): 19 pictures.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x16-art-gen.py, scripts/x15-art-gen.py and scripts/x10-art-gen.py (the LOOK, FIT, SET, PROP and SCENE words and the YELL face are theirs; the seat "with him in it" is x11's ross-bed idea).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x17-art-gen.py [name[:seed,seed] ...]     -> out/x17-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call. One seed per picture: a name gets 61; a second seed only if the first is broken, and SEEDS names the kept one.
# References and sizes (a "KI" reference makes the first reference set the shape, a square one gives 1024 x 1024; "I" and no reference give the size in the job):
#   ross-seat, ross-cram, ross-cling, ross-point: the x08 master and the avatar, "KI", 1024 x 1024.
#   couple-pop, fa, peacock-man, pilot-stand: no reference (the masters of their characters), 1024 x 1024. couple-kiss takes couple-pop, fa-present takes fa, peacock-fan takes peacock-man, pilot-sit takes pilot-stand, pilot-sit-bare takes pilot-sit: "KI", 1024 x 1024.
#   pilot-hat takes pilot-stand in the "I" mode (the reference only gives the look; in "KI" it came back as the whole pilot), 1024 x 1024. The five plates: no reference, 768 x 1344.
# Text is never painted (the prompts say so; the couple's caps stay blank and the code letters JUST MARRIED on them, the plates have no sign, seat number, logo or exit lettering; the "12A" by the window, the passes and the captions are drawn in code).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, the other seeds drew a smaller head, so every Ross picture is seed 61), the second his avatar.
# His x10 ross-point-61 was looked at and not reused: its brows are raised (a scream of fright, not of fury), it points to the right and the shout at the window needs the furious steep V of x16's ross-thumb (YELL) and the arm out to the left, toward window 12A at the middle-left of bg-wing.
# The seat is part of the picture of ross-seat and ross-cram ("the whole seat with him in it"): one description (SEAT) and one belt (BELT) for both, blue-grey like the seats of the plates.
# The couple, the attendant, the peacock man and the pilot are new: ONE description each (BRIDE and GROOM, FA, PEAMAN with PEACOCK, PILOT); the first picture of each is the master and its seed is in PICK; the later pictures take it as the only reference (the _AGAIN words).
# The plates are in the flat paper words (SET; SCENE for row 47, which has two men in it) and take no reference. Nobody stands in them but the two men of row 47 (the middle seat there is empty): the code puts the people, the clouds and the lettering in.
# pilot-sit-bare is an extra that the builder did not ask for: the sitting pilot without his cap, to swap in when the cap leaves his head for Ross's (shot 20).
# The files are what WanGP saves (JPEG data under a .png name, as in every earlier episode; PIL and cv2 read them by content). A picture that was painted again keeps its first take as <name>-<seed>-old.png (a third as -old2); SEEDS names the kept seed of a name.
# The same prompt and seed give the same picture again.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x17-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
# the kept master of each picture that others take as a reference (name -> seed); a reference named here is out/x17-cast/<name>-<seed>.png
PICK = {"couple-pop": 61, "fa": 61, "peacock-man": 61, "pilot-stand": 61, "pilot-sit": 61}

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
LOOK_HEADS = LOOK.replace("The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands.", "The shoulders are narrow and the hands are simple mittens.")
LOOK_BIG = LOOK.replace("The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands.",
                        "The body is huge, very wide and heavy with a big round belly, about two heads tall, with thick short arms and simple mitten hands.")
assert LOOK_HEADS != LOOK and LOOK_BIG != LOOK
FIT_SEAT = FIT.replace("Full body, the whole figure", "The whole seat with him in it")
FIT_POP = ("The two heads, their shoulders and the seat back fill the square picture, the seat back running from the left edge to the right edge along the bottom, "
           "on a plain white background above it.")
FIT_KISS = FIT.replace("Full body, the whole figure fits inside the square picture with a wide white margin all round", "The two heads and their shoulders fill most of the square picture with a narrow white margin all round")

ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
ROSS_SEATED = ROSS_HEAD.replace("redrawn as a full-body puppet", "redrawn seated in an airline seat")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
# his face while he yells (the steep V of the brows is x13's ANGRY, the open shout is x10's ross-point)
YELL = ("furious and yelling at the top of his lungs: his mouth wide open in a huge shout showing his teeth, the brows pulled down hard in a steep V over his eyes, "
        "the two big white eyes wide open with tiny black pupils")
# the seat the plates share: blue-grey, plain; its belt is in the picture (the code only snaps it open)
SEAT = ("an airline passenger seat seen exactly from the front and drawn in one flat muted blue-grey colour (the colour of grey denim): a tall wide rounded backrest that rises behind him well above his shoulders, "
        "a smaller rounded headrest pad on top of the backrest right behind his huge head, so that only its top and its two ends show above and beside his head, "
        "a flat seat cushion under his thighs, one flat armrest on each side of him and two short thin dark-grey metal legs under the seat; "
        "the seat is plain, with no pattern, no pocket, no logo and nothing written on it")
BELT = "a lap seatbelt fastened across his lap: a flat light-grey fabric strap running over his thighs from one armrest to the other, closed in the middle by one small flat silver rectangular buckle"

# the honeymoon couple: the caps are blank (the code letters JUST MARRIED on the front panel), the grins are painted
BRIDE = ("a young bride of 26 with a huge round head, light peach skin, rosy pink cheeks, long straight dark-brown hair hanging down past her shoulders on both sides of her face, "
         "a plain white baseball cap worn facing forward on top of her hair, a short white veil (a flat white wavy-edged piece of cloth) pinned under the back of the cap and falling behind her shoulders, and a white wedding dress with a round neckline")
GROOM = ("a young groom of 28 with a huge round head, light tan skin, thick black eyebrows, big ears, short black sideburns, a plain white baseball cap worn facing forward on his head, "
         "a black tuxedo jacket over a white shirt and a small black bow tie")
BRIDE_AGAIN = "The same bride as in the picture, with the same long straight dark-brown hair, the same plain white baseball cap, the same short white veil and the same white wedding dress"
GROOM_AGAIN = "the same groom as in the picture, with the same thick black eyebrows, the same big ear, the same short black sideburns, the same plain white baseball cap, the same black tuxedo jacket, white shirt and black bow tie"
CAPS = ("Both white caps are completely plain and blank: a big flat white dome with a wide flat blank white front panel facing the viewer, a small white button on the top and a short curved white visor; "
        "no letters, no logo, no stripes and no drawing on them.")
GRIN = ("a creepy over-wide grin that stretches almost from ear to ear, a huge row of big white upper teeth and a row of lower teeth, "
        "the two big white oval eyes wide open with tiny black dot pupils and staring straight at the viewer without blinking")
SEATTOP = ("the back of an airline seat seen from behind, drawn as one wide flat muted blue-grey slab (the colour of grey denim) with a thin black outline, running from the left edge of the picture to the right edge "
           "and filling the bottom third of the picture, its top edge perfectly flat, straight and horizontal, with nothing sticking up above it")

# the flight attendant
FA = ("A flight attendant, a woman of 34 with a huge round head, light peach skin, bright red lipstick, her dark-brown hair pulled back tight into one small neat round bun on top of her head, "
      "a navy-blue airline uniform jacket (a flat dark navy blazer with a row of small round gold buttons and a white blouse collar showing at the neck), "
      "a small triangular neck scarf knotted at her throat in flat red and white stripes, a navy-blue knee-length skirt and flat black shoes")
FA_AGAIN = ("The same flight attendant as in the picture, with the same face, the same tight round bun, the same bright red lipstick, the same navy-blue uniform jacket with its gold buttons, "
            "the same red-and-white striped neck scarf, the same navy skirt and the same black shoes")
FA_SMILE = ("a frozen huge fixed smile: a very wide grin showing every tooth, a long row of upper teeth and a row of lower teeth stretched across her whole face, "
            "the two big white oval eyes wide open and unblinking with small black dot pupils")

# the peacock man and his peacock (the tail is closed on his back in the first picture, fanned in the second)
PEAMAN = ("A huge man of 45 with a huge round head, light peach skin, short messy dark-brown hair and a big thick bushy dark-brown beard that covers his whole chin and cheeks and hangs down onto his chest, "
          "a tight white ribbed tank top stretched over a big round belly, bare shoulders and thick bare arms, faded blue jeans and brown work boots")
PEACOCK = ("one big peacock (a flat bright blue-green teal body and a long curved teal neck, a small head with a tiny crest of three thin feathers each tipped with a little round blue dot, "
           "a short yellow-orange beak and a round black dot eye with a white patch round it on each side of the head)")

# the pilot, his drink and his cap (the cap is painted on him and alone; no letters on its badge)
PILOT = ("An airline pilot, a man of 54 with a huge round head, light peach skin, a thick bushy grey mustache and thick grey eyebrows, short grey hair at the sides, "
         "a navy-blue captain's cap (a flat flared navy crown with a black band round it, a short flat black peak at the front and one round gold badge with two little gold wings in the middle of the front, nothing written on it), "
         "a white short-sleeved uniform shirt with a flat navy epaulette on each shoulder carrying four thin gold stripes, a plain black necktie, navy-blue uniform trousers and black shoes")
PILOT_AGAIN = ("The same pilot as in the picture, with the same face, the same thick grey mustache and eyebrows, the same navy captain's cap with its round gold badge, the same white short-sleeved shirt with the gold-striped shoulder epaulettes, "
               "the same black necktie, the same navy trousers and the same black shoes")
DRINK = ("one tall clear glass of a bright orange drink (a flat pale blue-grey tall glass with three small pale-blue ice cubes floating at the top of the drink, a thin red-and-white straw and a small orange slice on its rim, "
         "nothing written on it)")

def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- Ross, 1024 x 1024 (only the master's own seed 61 keeps his head's size)
  # shot 1: drops into window seat 12A, belted, cheek on the window (the window, the clouds and the click are the plate and the code; his eyes and the lean are code)
  # the first take (seed 61, without the last sentence) drew a tall backrest with a rounded top and no headrest pad of its own: kept as ross-seat-61-old.png; the headrest sentence is now in the words (head, seat and belt as before)
  "ross-seat": job(f"{ROSS_SEATED}, {TEE}. He sits upright in {SEAT}, seen exactly from the front, his knees toward the viewer and both black sneakers flat on the floor. "
                   f"He wears {BELT}. A relaxed blissful face: a calm contented closed-mouth smile, the two big white eyes open looking straight ahead. "
                   "His two mitten hands rest on his thighs, one on each side of the buckle, with nothing in them. "
                   "The headrest pad is clearly seen as its own rounded rectangle with a thin black outline, standing up above the top of the backrest on both sides of his head. "
                   f"Nothing else is in the picture: no window, no wall and no other seat. {LOOK} {FIT_SEAT}", ROSS),
  # shots 7, 10, 11, 14: row 47, the middle seat between the two men of bg-row47 (the sweat drops, the vein and the feathers are code)
  # the first take (seed 61, "his shoulders are hunched up as high as his ears ... his huge head is pulled down a little between his shoulders") had the shoulders only a little raised, the shirt's shoulder line about 100 px under his ears:
  # kept as ross-cram-61-old.png; the words now bring the tops of the shoulders up to the bottom of his ears
  "ross-cram": job(f"{ROSS_SEATED}, {TEE}. He is squeezed into {SEAT}, seen exactly from the front, his knees pressed tight together toward the viewer and both black sneakers flat on the floor. "
                   "He is crammed in: both shoulders are shrugged up as high as they go, right up to his ears, so that the tops of his shoulders touch the bottom of his ears and there is no gap between his shoulders and his huge head, "
                   "his two arms are pressed flat against his sides with the elbows tucked in, and his two mitten hands are clasped together on his lap, small and tight. "
                   f"He wears {BELT}. A miserable face: the brows slanting up in the middle in a pained pitiful look, the two big white eyes looking down and to the side, the mouth a small wobbly frown. "
                   f"Nothing else is in the picture: no other seat, no people and no wall. {LOOK} {FIT_SEAT}", ROSS),
  # shot 15: on the wing, spread-eagled (the wing is bg-wing; the wind and the flapping are code); his smartwatch is on the wrist at the left of the picture (his right), the other way round from the master's, and it was not repainted
  "ross-cling": job(f"{ROSS_HEAD}, {TEE}. He clings on for dear life, seen exactly from the front and spread-eagled like a starfish: both arms are stretched up and out to the sides in a wide V above his shoulders, "
                    "each mitten hand a tight clenched fist gripping something that is not in the picture; his two legs are spread wide apart in an upside-down V with the knees a little bent and both black sneakers dangling, "
                    "pointing down and outward, with no ground under them. A terrified face: the two big white eyes wide open with tiny black pupils, the brows raised high, the mouth stretched in a tight grimace of clenched teeth. "
                    f"Nothing is in his hands and nothing else is in the picture: no wing, no plane, no sky and no rope. {LOOK} {FIT}", ROSS),
  # shot 16: "I PAID FOR THAT WINDOW!" (the vein and the shout lines are code; window 12A is at the middle-left of the plate, so he points left; his index finger is the one stiff finger of the fist)
  "ross-point": job(f"{ROSS_HEAD}, {TEE}. He stands leaning forward, seen from the front, {YELL}. "
                    "His right arm, the one on the left side of the picture, is stretched straight out to the left at shoulder height, its mitten hand a fist with one stiff index finger pointing straight out, "
                    "as if pointing hard at something outside the picture on his left. His other arm hangs at his side with the fist clenched. "
                    f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # ---- the honeymoon couple, 1024 x 1024: the master (no reference), then the kiss on it
  # shots 3, 4, 5, 22: they pop up over the seat in front (the caps' lettering is code; the four hands grip the seat top, which is flat and runs from edge to edge)
  "couple-pop": job(f"Two people side by side, seen exactly from the front, peeking over the back of the seat in front of them, as if seen from the next row. On the left side of the picture {BRIDE}. On the right side of the picture {GROOM}. "
                    f"Both of them have {GRIN}. {CAPS} Their two huge heads sit close together, nearly touching, in the upper two thirds of the picture, with a little of their shoulders and chests below the heads. "
                    f"They lean on {SEATTOP}. The bride's two mitten hands and the groom's two mitten hands, four hands in all, grip that top edge, each hand a plain rounded mitten with the fingers curled over the edge of the seat. "
                    f"Nothing else is in the picture. {LOOK_HEADS} {FIT_POP}"),
  # shot 15: seen through window 12A (it is cut to the window's size by the code); both eyes are the big white ovals with a thin closed lid line across each
  "couple-kiss": job(f"{BRIDE_AGAIN} and {GROOM_AGAIN}, now seen from the side in profile, kissing: the bride on the left side of the picture faces right and the groom on the right side of the picture faces left, "
                     "both huge round heads turned fully sideways, the whole picture a side view, their faces close together in the middle of the picture with their lips pressed together in a kiss, "
                     "the one visible big white oval eye of each of them closed, drawn as a thin curved line with a small crease; the two white caps tilted a little upward so that their short visors pass above each other. "
                     "Their heads, their shoulders and the upper part of their chests are in the picture, the veil and the hair hanging down behind the bride. Nothing else is in the picture: no seat and no hands. "
                     f"{LOOK_HEADS} {FIT_KISS}", ["couple-pop"]),
  # ---- the flight attendant, 1024 x 1024: the master (no reference), then the waiter's palm on it
  # shots 8, 15: leans in with the frozen smile (the scarf's whipping and the talking mouth are code)
  # the first take (seed 61, "bent forward at the waist and leaning toward the viewer with her huge head thrust forward ... her two mitten hands are clasped together in front of her at belly height") stood almost upright:
  # kept as fa-61-old.png; the words now bend her far forward (the head drops toward her chest, the shoulders hunch) and put her hands on her knees (they come out at her hips)
  "fa": job(f"{FA}. She stands facing the viewer, seen from the front, bent far forward at the waist and leaning in toward the viewer: her upper body is tipped forward so that her huge head is thrust out toward the viewer, "
            "her shoulders hunched and her chin pushed out, her two short stubby legs side by side with both shoes flat on the ground. "
            f"She has {FA_SMILE}. Both her arms are straight and her two mitten hands rest on her knees. "
            f"Nothing else is in the picture. {LOOK} {FIT}"),
  # shot 13: presenting the open exit like a waiter
  "fa-present": job(f"{FA_AGAIN}. She stands facing the viewer, seen from the front, upright with a slight bow of her body, with the same frozen huge fixed smile showing every tooth, the two big white oval eyes wide open and unblinking. "
                    "Her left arm, the one on the right side of the picture, is stretched out to the right at waist height with the mitten hand open and flat, the palm turned up and the fingers together, "
                    "presenting something to her side like a waiter showing a table, while her other hand is held behind her back, out of sight. "
                    f"Nothing is in her open hand and nothing else is in the picture. {LOOK} {FIT}", ["fa"]),
  # ---- the peacock man, 1024 x 1024: the master (no reference), then the peacock's fan on it
  # shots 8, 9: behind the attendant, both look at Ross
  # the first take (seed 61, "turned toward the viewer, its small head and its one round eye looking straight at the viewer") drew the bird's head in profile looking to the right: kept as peacock-man-61-old.png;
  # the words (and PEACOCK's two eyes) now turn its head to face the viewer; peacock-fan was painted again on the new master and its first take is peacock-fan-61-old.png
  "peacock-man": job(f"{PEAMAN}. He stands facing the viewer, seen from the front, his two thick legs side by side with both boots flat on the ground, a flat calm blank face, the two big white oval eyes with small black dot pupils looking straight at the viewer. "
                     f"On his shoulder on the left side of the picture sits {PEACOCK}, perched on top of his shoulder with its small head turned to face the viewer, seen from the front: both of its round eyes and its short beak point straight at the viewer, "
                     "and it stares at the viewer without blinking, like the man; "
                     "its long tail is closed: a long narrow drooping bundle of green and bronze feathers, each with a small round blue-and-gold eye spot near its tip, hanging straight down behind his back, "
                     "the long strip of the closed tail seen beside his arm on that side, down to his hip. Both of his arms hang straight down at his sides. "
                     f"Nothing else is in the picture. {LOOK_BIG} {FIT}"),
  # shots 9, 10: the tail fans in Ross's face (the squawk's open beak is painted)
  "peacock-fan": job("The same peacock as in the picture, now alone, with no man and no shoulder, seen exactly from the front, standing with its small body and its long curved teal neck at the bottom middle of the picture, "
                     "its small head with the same tiny crest and the same short yellow-orange beak held up and looking straight at the viewer with the beak wide open in a loud squawk; "
                     "its tail is fanned out wide open behind it in one huge perfect circle of feathers that fills the whole picture: dozens of long green feathers radiating out from the bird like the rays of a sun, "
                     "each feather ending in a big round eye spot, a gold ring round a blue ring round a dark-blue centre. "
                     f"{PROP.replace('A single object, centered', 'A single bird with its fanned tail, centered')} Square frame.", ["peacock-man"]),
  # ---- the pilot, 1024 x 1024: the master (no reference), then the one sitting and the cap on it
  # shot 18: steps out onto the wing with his drink
  "pilot-stand": job(f"{PILOT}. He stands facing the viewer, seen from the front, his two short stubby legs side by side with both black shoes flat on the ground, a calm relaxed half-smile under the mustache, "
                     "the two big white oval eyes looking straight ahead. "
                     f"His right arm, the one on the left side of the picture, is bent and raised so that its mitten hand holds {DRINK} up at chest height; his other arm hangs relaxed at his side. "
                     f"Nothing else is in the picture. {LOOK} {FIT}"),
  # shots 19, 20: sits on the wing, legs out, "Ahh. Legroom."
  "pilot-sit": job(f"{PILOT_AGAIN}. Now he sits on the ground facing the viewer, seen from the front, blissfully relaxed: the two big white oval eyes half closed, each covered from the top by a flat skin-coloured eyelid, a content smile under the mustache. "
                   "His two legs are stretched straight out in front of him toward the viewer, side by side, drawn foreshortened: the two navy trouser legs come toward the viewer and end in his two black shoes at the bottom of the picture, the toes pointing up. "
                   "He leans back with his upper body, his left arm, the one on the right side of the picture, straight down behind him with the mitten hand flat on the ground holding him up; "
                   f"his right arm, the one on the left side of the picture, is bent and raised so that its mitten hand holds {DRINK} at chest height. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ["pilot-stand"]),
  # shot 20 (an extra, not on the builder's list): the same sitting picture with the cap gone, to swap in when the cap leaves his head for Ross's
  # the first takes (seed 61, without and with the "no grain" words; the second is kept as pilot-sit-bare-61-old.png) had felt-like vertical streaks over the white background and a darker orange skin, as in x16's first mom-glasses;
  # seed 62 with the same words was clean but the eyes came out wide open (pilot-sit-bare-62-old.png); the words now say the eyes stay half closed under flat lids, and the kept picture is seed 62
  "pilot-sit-bare": job("The same picture exactly: the same pilot sitting on the ground in the same pose with the same drink in his raised hand, the same face with the same thick grey mustache and content smile, the two big white oval eyes still half closed, the top half of each covered by a flat skin-coloured eyelid, "
                        "the same white short-sleeved shirt with the gold-striped epaulettes, the same black necktie, navy trousers and black shoes, but his navy captain's cap is gone: "
                        "his huge round head is bare on top, a smooth peach-skinned dome with a few thin short grey strands combed across it and the same short grey hair at the sides above his ears; no cap and no hat anywhere in the picture. "
                        "Nothing else is changed, all in flat solid colours with no grain, no noise and no texture anywhere, on a clean plain white background. "
                        f"{LOOK} {FIT}", ["pilot-sit"]),
  # shots 20-22: the cap dropped on Ross's head, worn in the cockpit
  # the first take (seed 61, "KI", "The same navy captain's cap as on the pilot's head in the picture, alone") came back as the whole pilot with the gold badge rubbed off: kept as pilot-hat-61-old.png;
  # the second (seed 61, the "I" mode, "a short flat black peak hanging as a crescent under the band") was the cap alone but with no peak, only the black band (pilot-hat-61-old2.png);
  # the words now describe the peak as a flat black half-oval under the band, and the kept picture is seed 62 (the pilot's painted cap has the same dome, band and gold wings, and no separate peak)
  "pilot-hat": job("One single airline captain's cap on its own, with no man, no head and no body, copied from the cap on the pilot's head in the picture, seen exactly from the front: the same flat flared navy crown, the same black band round its bottom, "
                   "a wide flat black peak (the visor), a flat black half-oval sticking out toward the viewer from the bottom edge of the band, and the same small gold winged badge in the middle of the front, nothing written on it. "
                   f"{PROP.replace('A single object, centered', 'A single cap, centered')} Square frame.", ["pilot-stand"], mode="I"),
  # ---- the plates, 768 x 1344 (the code puts the people, the clouds and the lettering in)
  # shots 1, 2, 6: the window seat 12A; the clouds in the pane, the "12A" and the people are code
  # the first take (seed 61, "on the left half of the picture, in the middle of the wall") had the window frame at x 110-600 of 768: kept as bg-cabin-61-old.png; the words now say the far left (the kept frame is x 108-528, the pane x 165-472 and y 428-956)
  "bg-cabin": job("The inside of a passenger jet's cabin at a window seat, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                  "the cabin wall is one flat pale cream panel, and on the far left of the picture, in the middle of the wall, is one big oval airplane window with rounded corners, taller than it is wide, its left edge close to the left edge of the picture and its right edge about halfway across the picture, the right half of the wall plain cream, "
                  "set in a thick flat cream plastic frame with a thin dark outline, the window pane a flat pale sky-blue with nothing in it (no clouds, no sun, no birds), the window shade pushed up out of sight; "
                  "across the very top of the picture a long overhead luggage bin, a flat pale-grey rounded box running from the left edge to the right edge, closed, with a thin darker-grey latch strip along its lower edge, "
                  "and above it a thin flat cream ceiling strip; below the window the cream wall continues down to a flat dark-navy carpet strip along the very bottom; "
                  "at the bottom right corner the rounded top edge of a flat muted blue-grey seat headrest pokes up into the picture, cut off by the bottom edge. "
                  f"Nothing and nobody else is in the picture, no person and no seat apart from that headrest edge. {SET}", res="768x1344"),
  # shot 3: the seat in front across the bottom, the couple pops up over it; the bins above
  # the first take (seed 61, "one wide flat ... slab ... fills the bottom third") had an arched top and filled 62% of the height, with a tray latch and a pocket (bg-seatback-61-old.png); the second (seed 62, "a plain wide flat rectangle with square corners") had a straight top
  # but 54% of the height, with the tray and the pocket (bg-seatback-62-old.png); the kept third (seed 63, a plain blank rectangle, no tray) has the straight top at y 717 of 1344 (53%): the model kept the seat tall, the builder can scale the plate down from its top
  "bg-seatback": job("The view from an airline seat looking forward at the seat in front, drawn as a flat front-on set with hardly any perspective, filling the whole picture from edge to edge with no border: "
                     "the back of the seat in front is one plain blank flat muted blue-grey rectangle (the colour of grey denim) with square corners and a thin black outline, as wide as the whole picture and short: only the lowest third of the picture is the seat, "
                     "its top edge is a perfectly straight horizontal line two thirds of the way down the picture, with no headrest, no rounded top, no tray table and no other seat beside it, and the whole upper two thirds of the picture is the cabin above it; "
                     "above the seat, the cabin's ceiling and overhead bins seen in flat perspective: a long flat pale-grey overhead luggage bin along the left side and another along the right side of the picture, "
                     "each drawn as a flat trapezoid slanting in toward the middle, between them a flat pale cream ceiling that narrows toward the middle and, at the far end of the cabin in the middle, a small flat cream wall. "
                     f"Nothing and nobody is in the picture. {SET}", res="768x1344"),
  # shots 7-14: the back of the plane (Ross goes in the middle seat; the toilet door bangs open; the red handle is yanked and the door pops out: code)
  "bg-row47": job("The back of an airplane's passenger cabin, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border: "
                  "a flat pale cream back wall and a flat dark-navy carpet strip along the very bottom; "
                  "in the lower middle of the picture a row of three muted blue-grey airline seats side by side seen exactly from the front (each a flat blue-grey backrest with a headrest pad on top, a seat cushion and armrests); "
                  "in the left seat sits a huge very wide bald man in a stretched-tight light-blue short-sleeved shirt with big dark damp sweat patches on it, a flushed red face and a grumpy flat mouth, his thick arms bulging over the armrests and his big belly pressing out; "
                  "in the right seat sits another huge very wide man with a short black crew cut and a bushy black mustache, in a stretched-tight olive-green t-shirt with big dark damp sweat patches, a flushed red face and a grumpy flat mouth, also bulging over the armrests; "
                  "the MIDDLE seat between them is completely empty: just the plain blue-grey seat with its headrest, nobody and nothing on it; "
                  "at the left of the row a narrow tall plain closed lavatory door, a flat cream door with a thin grey frame and a small silver latch, nothing written or drawn on it; "
                  "at the right of the row a big tall emergency exit door, a flat light-grey door with rounded corners, a thick dark-grey frame, a small round window near its top and, in the middle of it, one big flat red pull handle "
                  f"(a thick red horizontal bar on two small brackets), nothing written on it. {SCENE}", res="768x1344"),
  # shots 15-20: outside, the fuselage with its windows and the wing (the clouds, the wind and "12A" are code)
  # the first take (seed 61, "the third window ... a little bigger", "a big flat light-grey wing ... narrow where it meets the fuselage") had the bigger window fifth of eight (x 414) and a narrow tower-like wing, about 255 px wide at the top and 450 at the bottom:
  # kept as bg-wing-61-old.png; the words now make the third window much bigger and the wing very wide; the kept picture is seed 62: eight windows, the big one is the fourth (x 324-402, y 501-578), the fuselage band is y 407-733, the wing is x 189-573 at y 640 and x 53-722 at y 1160
  "bg-wing": job("The outside of a passenger jet flying high in a clear sky, drawn as a flat side-on set with no perspective, filling the whole picture from edge to edge with no border: "
                 "the whole background is a flat plain light-blue sky with nothing in it (no clouds, no sun, no birds); "
                 "across the upper part of the picture, from the left edge to the right edge, the white side of the plane's fuselage, a flat white band with a thin black outline, "
                 "with one straight row of seven small oval windows, each a flat light-grey glass pane with a thin darker-grey frame, all empty, the third window from the left much bigger than the other six, about twice their size; "
                 "below the fuselage the plane's wing comes toward the viewer and fills the lower half of the picture: a very wide flat light-grey wing seen from above, starting narrow right under the lower edge of the fuselage and widening to nearly the full width of the picture at the bottom edge, "
                 "like a wide flat grey platform sloping toward the viewer, with a thin black outline and two or three thin darker-grey panel lines, its flat top surface completely empty. "
                 f"Nobody is in the picture: no people, no clouds, no letters, no numbers and no airline logo. {SET}", res="768x1344"),
  # shots 21, 22: looking in through the windshield at the captain's empty seat (the glass, its frame, Ross and the couple are code)
  "bg-cockpit": job("The inside of an airliner's cockpit seen from the front, as if looking in through the windshield from outside the nose, drawn as a flat front-on set with no perspective, filling the whole picture from edge to edge with no border, with no window frame and no glass: "
                    "the cockpit's dark-grey back wall fills the picture; in the middle stands the captain's empty seat seen from the front (a dark-navy pilot seat with a wide backrest, a tall rounded headrest on top that reaches high up the picture, "
                    "a flat seat cushion and two flat dark-grey armrests), nobody sitting in it; behind the seat on the back wall the closed cockpit door, a flat dark-grey door with a thin silver frame and one small silver handle; "
                    "on the left and on the right of the seat two small side windows in thick dark-grey frames, each pane a flat pale sky-blue; "
                    "along the bottom of the picture the top of the instrument panel, a wide flat dark-grey panel with a row of round blank dials (flat white circles with a dark rim and nothing on them: no numbers and no needles) and a few small flat red, green and amber round buttons. "
                    f"Nobody is in the picture: no pilot, no windshield and no text. {SET}", res="768x1344"),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {"pilot-sit-bare": [62], "pilot-hat": [62], "bg-cabin": [62], "bg-seatback": [63], "bg-wing": [62]}
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
