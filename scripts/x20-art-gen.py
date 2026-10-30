# Art for x20 "One Coffee" (docs/x20-one-coffee.md): the camper (the man with the laptop of x19's customers, now in a navy fleece vest and white earbuds: sitting at his laptop, sipping, waving at the room, on his headset call, banging the gong, holding out his tiny cup, the same frozen),
# the three guys from his startup (a row of three standing; then all four typing behind one long table of pushed-together café tables with the gong at its end, and the same four cheering with champagne), Ross in his apron (holding up the pulled plug, soaked in champagne foam),
# two hands (the camper's slapping down, the startup guy's gripping the plug) and seven props (the tiny cup, four coins, the open laptop, the gong, the tumbleweed, the power strip with its tangle of chargers, the champagne bottle): 21 pictures.
# Qwen Image 2.1 Turbo 7B in WanGP with image references, the recipe of scripts/x19-art-gen.py (the LOOK, FIT, PROP, ARM, TABLE and Ross words, the AGAIN idea of a master that later pictures take as their reference, Ross's two references and the seed rules are x19's and x18's;
# the row of men over a long table is x19's customers idea; the whitened reference of team-cheer is new).
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x20-art-gen.py [name[:seed,seed] ...]     -> out/x20-cast/<name>-<seed>.png
# Run it in the foreground, one WanGP job at a time (the GPU is shared), at most 5 pictures per call (a picture takes 20 to 90 s, the model loads once per call). One seed per picture: a name gets 61; a second seed only if the first is broken, and SEEDS names the kept one (none needed: every kept picture is seed 61, painted again with changed words where it was broken).
# References and sizes (a "KI" reference makes the first reference set the shape, a square one gives 1024 x 1024; "I" and no reference give the size in the job):
#   camper-ref (made by this script, out/x20-cast/camper-ref.png): the leftmost man of x19's customers (out/x19-cast/customers-61.png: short dark-brown hair, stubble, grey sweater, his laptop) cropped and set on a square off-white canvas.
#   camper-sit (the master of the camper) takes camper-ref (the only reference): "KI", 1024 x 1024. camper-sip, camper-wave, camper-call, camper-gong, camper-cup, camper-freeze take camper-sit (the only reference): "KI", 1024 x 1024.
#   team-row: no reference (the master of the three guys: three standing men on white), 1344 x 768. team-table takes team-row (first, so it sets the 1344 x 768 shape) and camper-sit: "KI", 1344 x 768.
#   team-cheer takes team-table (first, whitened: see white_copy), camper-sit and team-row: "KI", 1344 x 768.
#   ross-plug, ross-drip: the x08 master and the avatar, "KI", 1024 x 1024.
#   hand-camper, hand-dev: no reference, 1024 x 1024 (the arm comes in from the right edge, resp. the left edge).
#   prop-cup, prop-coins, prop-gong, prop-tumbleweed, prop-champagne: no reference, 1024 x 1024; prop-laptop and prop-strip: no reference, 1344 x 768 (wider than tall).
# Text is never painted (the prompts say so; the code letters "$2.50", the clock, OFFER ACCEPTED and the captions; the laptop's screen is plain flat black so that the code can draw on it).
# Ross: the first reference is his x08 master (out/x08-cast/ross-sit-61.png) so his head keeps the master's size and drawing (src/x08-rig.json registers on that head; this holds only on the master's own seed 61, so every Ross picture is seed 61).
# He wears x10's brown apron over the black tee (the bib over his chest, the ties round his waist) and his face is calm and polite in both: Ross never blows up. ross-plug has the master's head to the pixel; in ross-drip the foam and the drips make the model redraw the head at 0.92 of the master's size (see there).
# The camper and the three guys are new in these words: ONE description each (the camper's clothes: VEST, EARBUDS; the guys: GUY_BLOND, GUY_BUN, GUY_RED, all in the same VEST and EARBUDS, dark-grey trousers and white sneakers); the first picture of the camper is the master and its seed is in PICK, the later ones take it as the only reference (the CAMPER_AGAIN words).
# The camper's sweater is a medium grey (107 on x19's man, 105 on camper-sit); team-table and team-cheer say so, because the first takes drew it as light as the fourth man's hoodie.
# Every face is light peach (no face is a solid dark colour).
# Reused, not repainted: x10 bg-counter, bg-window, ross-apron; x16 hand-ross; x18 bg-seating.
# The files are what WanGP saves (JPEG data under a .png name, as in every earlier episode; PIL and cv2 read them by content; camper-ref.png and ref-white/ are real PNGs made by this script). A picture that was painted again keeps its first take as <name>-<seed>-old.png (a later one as -old2 ... -old5); SEEDS names the kept seed of a name.
# The same prompt and seed give the same picture again (checked pixel for pixel on camper-cup, camper-wave, ross-plug, team-table and an earlier take of team-cheer).
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from PIL import Image
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x20-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
ROSS_MASTER = r"E:\getphantom-toons\out\x08-cast\ross-sit-61.png"
CUSTOMERS = r"E:\getphantom-toons\out\x19-cast\customers-61.png"
CAMPER_REF = OUT / "camper-ref.png"
# the kept master of each picture that others take as a reference (name -> seed); a reference named here is out/x20-cast/<name>-<seed>.png
PICK = {"camper-sit": 61, "team-row": 61, "team-table": 61}

# the camper's reference: the leftmost man of x19's customers (head, shoulders, his laptop seen from its back, one hand on it; the table strip under it is cut off), scaled up onto a square white canvas (the paper's own off-white)
def make_camper_ref():
    if CAMPER_REF.exists(): return
    im = Image.open(CUSTOMERS).convert("RGB")
    c = im.crop((0, 190, 352, 676))
    s = 940 / c.height
    c = c.resize((round(c.width * s), 940), Image.LANCZOS)
    canvas = Image.new("RGB", (1024, 1024), im.getpixel((5, 5)))
    canvas.paste(c, ((1024 - c.width) // 2, 42))
    canvas.save(CAMPER_REF, format="PNG")
make_camper_ref()

# a "<name>@white" reference is the kept picture with every near-white pixel set to pure white (out/x20-cast/ref-white/<name>.png; the white of a generated picture is 247-249): the first two team-cheer takes, painted on the plain team-table, had a white streaked pale yellow (chroma up to 28 and 185 in the top band); the takes on the whitened copy have a clean white (chroma 5)
def white_copy(path):
    import numpy as np
    d = OUT / "ref-white"; d.mkdir(exist_ok=True)
    out = d / (Path(path).stem + ".png")
    if not out.exists():
        a = np.asarray(Image.open(path).convert("RGB")).copy()
        a[a.min(axis=2) >= 238] = 255
        Image.fromarray(a).save(out, format="PNG")
    return str(out)

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
                          "Every body is short and stubby, with short arms and simple mitten hands. Every face has two big white oval eyes that touch each other, with small black dot pupils, and no nose.")
                 .replace("An original character, not a character from the show.", "Original characters, not characters from the show."))
LOOK_ROW = LOOK_MANY.replace("Every body is short and stubby, with short arms and simple mitten hands.", "The shoulders are narrow, the arms short and the hands simple mittens.")
assert LOOK_MANY != LOOK and "Every body" in LOOK_MANY and "Original characters" in LOOK_MANY and "Every head" in LOOK_MANY
assert LOOK_ROW != LOOK_MANY and "narrow" in LOOK_ROW
FIT_TABLE_MAN = FIT.replace("Full body, the whole figure", "The whole man and the whole table")
# the camper from the waist up (the cup pictures): no table, no legs
FIT_WAIST = FIT.replace("Full body, the whole figure fits inside the square picture with a wide white margin all round",
                        "His huge head, his shoulders, his arms and his body down to the waist fill most of the square picture with a narrow white margin at the top and at the sides, and the bottom edge of the picture cuts through his waist, so no legs and no feet show")
FIT_GONG = FIT.replace("Full body, the whole figure", "The whole man from head to feet and the whole gong beside him")
FIT_THREE = "The three whole men from head to feet fill the picture from the left to the right with a narrow white margin round them, on a plain white background."
# the four at the long table: the heads start a third of the way down, so that the raised arms of team-cheer fit above them in the same picture
FIT_TEAM = ("The four men, the long table and the gong fill the picture from the left edge to the right edge and sit in the lower part of the picture: the bases of the table's columns and the gong's feet are at the very bottom of the picture, "
            "and above the men's heads the whole upper two fifths of the picture is empty plain white, with more empty white above the heads than the height of one head, on a plain white background.")
FIT_CHEER = ("The same framing as the first picture: the four men, the long table and the gong are in the same places, the bases of the table's columns and the gong's feet are at the very bottom of the picture, "
             "and the raised arms, hands, bottles and foam fill part of the empty plain white space above the men's heads, all of it inside the picture, on a plain white background.")
assert FIT_TABLE_MAN != FIT and FIT_WAIST != FIT and FIT_GONG != FIT

# Ross (x19's words)
ROSS_HEAD = ("The same man as in the pictures, redrawn as a full-body puppet, with his head exactly as big and drawn exactly the same as in the first picture: short reddish-brown hair with shaved sides "
             "and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes")
TEE = "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers"
APRON = "a plain brown apron (a flat brown bib shape with a curved neck cutout at the top, a strap loop at each top corner, two long waist ties hanging down, nothing written or drawn on it)"
ROSS_APRON = f"Over the t-shirt he wears {APRON}, the bib over his chest and the ties tied round his waist, the short black sleeves and the tattooed forearms showing on both sides of it."

# the table (x18's and x19's TABLE words), the tiny cup, the laptop, the vest, the earbuds, the headset
TABLE = ("one small round wooden café table seen exactly from the front, flat with no perspective: a thin wide flat light-oak tabletop (a long low flat rounded slab much wider than her shoulders, "
         "a flat muted honey-tan wood colour, a soft light brown like pale cardboard and not bright orange, with a thin black outline and a slightly darker-brown front edge), held up by one thick short plain dark-brown wooden column in the middle that ends in a flat round dark-brown base on the floor")
TABLE_MAN = TABLE.replace("her shoulders", "his shoulders")
assert TABLE_MAN != TABLE
CUP_DESIGN = ("a flat white paper coffee cup tapering toward the bottom, with a thin black outline, no lid and no sleeve, and in its open top a flat dark-brown oval of coffee, nothing written or printed on it")
TINY_CUP = f"one tiny paper coffee cup ({CUP_DESIGN}), only about as tall as one of his big white eyes"
LAPTOP_BACK = ("one open silver laptop seen from its back (a flat silver-grey rectangle, wider than it is tall, with a thin black outline, standing upright on the tabletop with its lid toward the viewer, "
               "covering his belly and his lower chest but not his face, his shoulders or the top of his chest, with four small plain flat stickers on the lid: a red circle, a yellow star, a green rectangle and a light-blue circle; "
               "the lid is otherwise completely plain: no logo, no text and no mark)")
VEST = ("a navy-blue fleece vest (a flat dark navy-blue sleeveless zip-up vest with a high standing collar, zipped up over his chest, with one thin darker zip line down the middle, completely plain: no logo, no text, no pocket and no pattern)")
EARBUDS = ("a white wireless earbud in each ear (a clearly visible white rounded bud with a thin black outline sitting in the ear opening and a thin white stem hanging down from it past the earlobe, "
           "the whole earbud about as long as his ear, no cable and no text)")
HEADSET = ("a black over-ear headset (a thin black band across the top of his hair, two big round black ear cups over his two ears that hide the earbuds, "
           "and a thin black arm curving down from the ear cup on the right side of the picture to a small black microphone ball in front of the corner of his mouth)")
TROUSERS = "dark-grey trousers and plain white sneakers"

# the camper: the first picture takes the crop of x19's man (CAMPER_SAME), every later one takes camper-sit (CAMPER_AGAIN)
CAMPER_SAME = ("The same man as in the picture, with exactly the same huge round head, the same short messy dark-brown hair, the same light stubble and the same face, all unchanged, "
               "in flat solid colours with no grain, no noise and no texture anywhere")
CAMPER_AGAIN = ("The same man as in the picture, with exactly the same huge round head, the same short messy dark-brown hair, the same light stubble and the same face, the same navy-blue fleece vest over the same grey knitted sweater "
                "and the same white earbuds in his ears, all unchanged, in flat solid colours with no grain, no noise and no texture anywhere")
CAMPER_CALL = CAMPER_AGAIN.replace(" and the same white earbuds in his ears", "")
assert CAMPER_CALL != CAMPER_AGAIN
BEHIND_MAN = (f"He sits behind {TABLE_MAN}, facing the viewer, seen from the front: the tabletop is in front of him at the height of his belly and hides his lap and legs, "
              "so no legs, no chair and no feet are drawn; below the tabletop only the table's column and its round base are seen. ")
SAME_TABLE = ("he still sits behind the same small round wooden café table, seen from the front, with the same open silver laptop standing on it in front of him, its back with the same four stickers toward the viewer "
              "and covering his belly and lower chest")
STAND_MAN = f"he is standing, seen from the front, in {TROUSERS}, with no table, no chair and no laptop in the picture"
GONG = ("one big brass gong on a wooden stand (two plain dark-brown wooden upright posts, each on a flat dark-brown foot, joined at the top by one plain dark-brown wooden crossbar, and hanging from the crossbar by two short thin dark-brown cords "
        "one big round flat brass gong: a big flat golden-yellow disc with a thick darker-gold rim, a few thin concentric ring lines and a round darker-gold boss in the middle, almost as wide as the stand, completely plain: no text, no symbols and no pattern)")
MALLET = "one gong mallet (a long plain wooden stick with a big round padded head at its end, a flat round cream-coloured ball)"
PLUG = ("one electrical plug (a small flat black rounded block with two short flat silver prongs sticking out of its front end and one short thin black cord leaving its back end, completely plain: no text and no logo)")
CHAMPAGNE = ("one champagne bottle (a flat dark bottle-green glass bottle with a long neck and a thin black outline, a gold foil wrapping over the top of the neck and a plain blank cream label on its body) "
             "with a huge burst of white foam bursting out of the top of its neck, spraying up and out: many flat puffy rounded white foam shapes with thin black outlines and a few separate round white drops, completely plain: no text, no letters and no logo")
FOAM = "thick white champagne foam (flat puffy rounded white foam shapes with thin black outlines)"
POWER_STRIP = ("one white power strip (a long low flat white rounded bar with a thin black outline and a row of small black sockets along its front) with a tangle of black chargers plugged into it: "
               "several flat black rectangular charger blocks sitting in its sockets and many thick black cables looping and crossing each other in a messy tangle, completely plain: no text, no logo and no label")
HAND = "a plain rounded mitten in light peach skin with one short fat separate thumb, no finger lines, no knuckles and no fingernails"
PEACH = "a plain rounded mitten in light peach skin"  # x10's word for the hand
FLATWHITE = "The whole background is one perfectly flat plain white, with no streaks, no marks and no texture on it."

# the three guys of his startup (the same vest and earbuds as the camper's), the camper among them, the long table
GUY_BLOND = ("a young man of 27 with short neat bright golden-blond hair (a light yellow blond, not brown), round thin black-rimmed glasses (two thin black circles around his two big white eyes, joined by a thin black bridge) "
             "and a plain light-blue button-up shirt whose collar shows above the vest")
GUY_BUN = ("a young man of 30 with long dark-brown hair pulled up into a small round man bun on top of his head, a clean-shaven face and a plain white shirt whose collar shows above the vest")
GUY_RED = ("a young man of 25 with short bright-red hair and a short neat bright-red beard along his chin and cheeks, and a plain light-grey hoodie whose hood lies in a soft bunch behind his neck above the vest")
# (the first team-table and team-cheer takes drew his sweater light grey, 178 to 204 against 105 on camper-sit, as light as the fourth man's hoodie: kept as -old3; "dark medium-grey ... charcoal" then gave 69, too dark: -old4; the words now say a medium grey, clearly darker than the hoodie)
CAMPER_TEAM = ("the camper, the same man as in the second picture, with exactly his face, his short messy dark-brown hair and his light stubble, in the same navy-blue fleece vest over his grey knitted sweater "
               "(the same flat medium grey as in the second picture, clearly darker than the light-grey hoodie of the fourth man), the grey sleeves showing")
LAPTOP_UNDER = ("one closed silver laptop (a thin flat silver-grey rectangle with a thin black outline, completely plain: no logo, no sticker and no mark) clamped flat under his arm, pressed against his side")
LAPTOP_OPEN_BACK = ("one open silver laptop seen from its back (a flat silver-grey rectangle with a thin black outline, standing upright on the tabletop with its lid toward the viewer, completely plain: no logo, no text and no mark)")
LONG_TABLE = ("The table is one long table made of four small round wooden café tables pushed together in one straight line: its top is a row of four flat round honey-tan tabletops touching each other side by side "
              "(each a thin wide flat rounded slab seen exactly from the front, a flat muted honey-tan wood colour, a soft light brown like pale cardboard and not bright orange, with a thin black outline and a slightly darker-brown front edge), "
              "and under each tabletop stands one thick short plain dark-brown wooden column that ends in a flat round dark-brown base on the floor. ")
TEAM_MEN = ("Exactly four young men sitting in one straight row side by side behind one long table, all facing the viewer, hidden from the waist down behind the table's tops, so that only their huge heads, their shoulders and their chests show above it. "
             f"From the left to the right the four are: first, {GUY_BLOND}; second, {CAMPER_TEAM}; third, {GUY_BUN}; and fourth, {GUY_RED}. "
             f"All four wear exactly the same {VEST} over their shirts, their sweater and their hoodie, and exactly the same {EARBUDS}. Every one of the four has exactly the same light peach skin, and every face is light peach. ")
TEAM_GAZE = ("All four are busy and none of them looks at the viewer: every man's head is bent down a little and his two big white oval eyes look down at his own laptop's screen, with the upper third of each white covered by a flat skin-coloured eyelid "
             "and each small black dot pupil sitting at the very bottom of its white oval, touching its bottom edge, exactly like the camper in the second picture; every mouth is a short flat straight line. ")
TEAM_FOUR = TEAM_MEN + TEAM_GAZE
TEAM_LAPTOPS = f"In front of each of the four men, in the middle of his place, stands {LAPTOP_OPEN_BACK}, covering his belly and his lower chest but not his face or his shoulders. "
TEAM_STRIP = f"On the tabletop between the second man's laptop and the third man's laptop, in front of them, lies {POWER_STRIP}. "
TEAM_GONG = (f"At the right end of the table, on the floor beyond the last tabletop, at the right edge of the picture, stands {GONG}; "
             "it is a big gong, as tall as the seated men are from the tabletop up to the tops of their heads, its crossbar level with the tops of their heads. ")
# the cheer: exactly two bottles, the first man's and the fourth man's (the outer two; a camper's-and-third-man's version gave one man holding both)
CHEER_MOUTHS = ("Every one of the four men shouts with joy: all four mouths are big wide open shouting mouths showing the upper teeth and a pink tongue, the camper's mouth and the mouth of the man with the man bun as well as the first man's and the fourth man's; none of the four mouths is closed. ")
CHEER_ARMS = ("All four are cheering: every man has both arms stretched straight up above his head, every man's two big white oval eyes are wide open and look straight at the viewer, "
              "each small black dot pupil in the exact vertical centre of its white oval, and every man's brows are raised high. ")
CHEER_BOTTLES = (f"Exactly two champagne bottles are in the picture, both the same: {CHAMPAGNE}. The blond man with the round glasses, the first man, holds one in his raised hand on the left side of the picture, and the red-haired bearded man, the fourth man, holds the other in his raised hand on the right side of the picture. "
                 "The two men in the middle, the camper and the man with the man bun, hold nothing: both their raised hands are empty open mittens with the fingers spread, and so is the other raised hand of the first man and of the fourth man. "
                 "The fourth man holds his bottle high above his head, clear of the gong. The whole of every raised arm, hand, bottle and burst of foam stays inside the picture, in the empty space above the men's heads. ")
# the raised sleeves keep their own colours (the fourth take drew the camper's sleeves white, like the third man's shirt)
CHEER_SLEEVES = ("All four still wear their navy-blue fleece vests over their shirts, the camper too: his navy vest covers his chest over his grey sweater, and only the sleeves of the sweater show beyond it. "
                 "The raised sleeves keep their own colours: the first man's are light blue, the camper's are the medium grey of his knitted sweater as in the second picture and not white, the third man's are white and the fourth man's are the light grey of his hoodie. ")
CHEER = CHEER_MOUTHS + CHEER_ARMS + CHEER_SLEEVES + CHEER_BOTTLES
CUP_OPEN = f"{CAMPER_AGAIN}, but now he is standing, seen from the front, with no table, no chair and no laptop in the picture, and the picture shows him only from the waist up. "
CUP_ARM = (f"His arm on the left side of the picture is stretched forward toward the viewer and bent a little at the elbow, and its mitten hand holds out {TINY_CUP} in front of his chest, as if asking for a refill; his other arm hangs relaxed at his side. ")

def cap(s): return s[0].upper() + s[1:]
def job(prompt, refs=(), res="1024x1024", mode="KI"): return dict(prompt=prompt, refs=list(refs), res=res, mode=mode if refs else "")
ROSS = [ROSS_MASTER, AVATAR]
JOBS = {
  # ---- the camper, 1024 x 1024: the master (the crop of x19's man is the only reference), then the six on it
  # shots 3, 4, 5: sitting at his laptop by the window, eyes on the screen, a blank calm face (the cobwebs, the dust and the talking mouth are code)
  # three takes, all with the camper's face from the crop (the likeness is strong, the three are nearly the same picture): the first (-old) had tiny earbuds; the second (-old2, the EARBUDS words as now) drew both hands at the sides of the laptop,
  # and on it camper-wave and camper-call drew a raised arm AND a third hand at the laptop's side (those takes are the -old files of the two); the kept third says both hands are under the table: small bits of both hands still show at the laptop's lower corners,
  # but wave and call then have two hands. Sip, wave, call, gong and cup were painted again on this master.
  "camper-sit": job(f"{CAMPER_SAME}, except for these changes: over his grey knitted sweater he now wears {VEST}, the grey sleeves with their ribbed cuffs showing on both sides of the vest, and he has {EARBUDS}. "
                    f"{BEHIND_MAN}On the tabletop in front of him, in the middle of the picture, stands {LAPTOP_BACK}; and on the tabletop at the right side of the picture, beside the laptop, stands {TINY_CUP}. "
                    "Both his arms hang down in front of his body, the sleeves going down behind the laptop to the tabletop, and both his mitten hands are under the table, out of sight: no hand, no finger and no thumb is seen anywhere in the picture. His head is tilted down a little and his two big white oval eyes look down at the laptop's screen, the small black dot pupils at the bottom of the eyes; "
                    "his mouth is a short flat straight line, neither smiling nor frowning, and his brows are flat and relaxed: a blank calm face. "
                    f"Nothing else is in the picture. {LOOK} {FIT_TABLE_MAN}", ["camper-ref"]),
  # shot 4: "Still drinking it." (the tiny cup at his lips; the cobweb from the cup is code)
  "camper-sip": job(f"{CAMPER_AGAIN}, except for these changes: {SAME_TABLE}, but now he is sipping: his arm on the right side of the picture is bent and raised so that its mitten hand holds {TINY_CUP} up at his mouth, "
                    "the rim of the cup touching his lips, and no cup stands on the tabletop any more. His two big white oval eyes are half shut: each is half covered from the top by a flat skin-coloured eyelid, so that only the lower half of each white shows, "
                    "with the small black dot pupil at the bottom of it, a calm unbothered face, the brows flat and relaxed. His other hand is under the table, out of sight, and no other hand is seen anywhere in the picture. "
                    f"Nothing else is in the picture. {LOOK} {FIT_TABLE_MAN}", ["camper-sit"]),
  # shot 6: "Who?" (one hand waves out at the room)
  # the first take kept the master's calm face; the kept one has the smirk and the high arched brows, but the pupils still sit at the bottom of the whites (the master's gaze is strong), so he looks at his screen, not at the room
  "camper-wave": job(f"{CAMPER_AGAIN}, except for these changes: {SAME_TABLE}, and the same tiny paper cup still stands on the tabletop at the right side of the picture, beside the laptop, but now he waves at the whole room: "
                     "his arm on the left side of the picture is stretched out sideways to the left of the picture at the height of his shoulder, its mitten hand open with the fingers spread wide and the palm toward the viewer, in a big sweeping wave. "
                     "He has looked up from the screen, his chin lifted, smug and superior like someone who has just won an argument: his mouth is a closed smirk curved up into a small crooked smile, higher at one corner, his two thin dark eyebrows are lifted high above his eyes in two tall arches, "
                     "and his two big white oval eyes are wide open and look straight at the viewer, each small black dot pupil in the exact vertical centre of its white oval, halfway between the top and the bottom edge of the white. "
                     f"His other hand is under the table, out of sight, and no other hand is seen anywhere in the picture. Nothing else is in the picture. {LOOK} {FIT_TABLE_MAN}", ["camper-sit"]),
  # shot 12: "When we sell the company." (headset on, mid-call)
  "camper-call": job(f"{CAMPER_CALL}, except for these changes: {SAME_TABLE}, and the same tiny paper cup still stands on the tabletop at the right side of the picture, beside the laptop, but now he is on a call and wears {HEADSET}. "
                     "His head is held up straight and his two big white oval eyes are wide open looking straight at the viewer, each small black dot pupil in the exact vertical centre of its white oval; his mouth is open mid-word, a wide open oval showing his upper teeth, the brows raised a little. "
                     "His arm on the left side of the picture is bent and raised so that its mitten hand is held up open at the height of his shoulder beside his head, the palm up and the fingers spread, as if explaining something; his other hand is under the table, out of sight, and no other hand is seen anywhere in the picture. "
                     f"Nothing else is in the picture. {LOOK} {FIT_TABLE_MAN}", ["camper-sit"]),
  # shot 14: "SOLD! FORTY MILLION!" (he bangs the gong; the gong's shake and the sound are code)
  "camper-gong": job(f"{CAMPER_AGAIN}, but now {STAND_MAN}, and the picture shows the whole man from head to feet. "
                     f"He stands at the left side of the picture, beside {GONG}, which stands at the right side of the picture and is about as tall as he is himself. "
                     f"He is banging it: both his arms are stretched out to the right at the height of his chest, his two mitten hands gripping the long stick of {MALLET} so that its big padded head strikes the middle of the gong's disc, and he leans a little toward the gong. "
                     "His mouth is wide open in a joyful shout showing his teeth, his brows are raised high and his two big white oval eyes are wide open and look straight at the viewer, each small black dot pupil in the exact vertical centre of its white oval. "
                     f"Nothing else is in the picture. {LOOK} {FIT_GONG}", ["camper-sit"]),
  # shot 16: "Refills are free, right?" (he holds out the tiny cup)
  "camper-cup": job(CUP_OPEN + "He is beaming: a huge happy open smile showing a row of white teeth, his cheeks lifted, his brows raised, and his two big white oval eyes wide and bright looking straight at the viewer, each small black dot pupil in the exact vertical centre of its white oval. "
                    + CUP_ARM + f"Nothing else is in the picture. {LOOK} {FIT_WAIST}", ["camper-sit"]),
  # shot 17: "...Forty million." (his smile freezes: the same pose and words as camper-cup, the grin stiff and too wide, the eyes staring)
  # the first two takes took camper-cup and camper-sit ("the same picture exactly", then again with the clean-white sentence): the white was streaked pink and yellow (up to 41 in chroma, 3,300 px in a 200 x 300 corner; -old and -old2);
  # the kept one takes camper-sit alone like the others and says only the face differently, so the pose is camper-cup's and the white is clean
  "camper-freeze": job(CUP_OPEN + "His smile has frozen: his mouth is stretched into a stiff, far too wide grin showing two clenched rows of white teeth from one cheek to the other, his cheeks pushed up hard, his brows raised high and stiff, "
                       "and his two big white oval eyes are stretched wide open and stare straight at the viewer, each with a tiny black pin-dot pupil in the middle. "
                       + CUP_ARM + f"Nothing else is in the picture. {LOOK} {FIT_WAIST}", ["camper-sit"]),
  # ---- the three guys of his startup, 1344 x 768: the row of three standing (no reference), then the four at the long table
  # shot 8: they line up at the counter ("One small drip." "Small drip." "...Just water."), each with a laptop under one arm
  # the first take (-old, "a small closed flat line") had curved-down mouths (the fourth man looked sad), a brown "blond" and tall slim bodies; the kept one says the mouths are level, the blond is golden and the men are short and stubby
  # (the bodies are still about four heads tall, not three: the model does not take the number)
  "team-row": job("Exactly three young men standing in one straight row side by side from the left of the picture to the right, close together with their shoulders nearly touching, all facing the viewer, the whole of each man from head to feet in the picture. "
                  f"From the left to the right the three are: first, {GUY_BLOND}; second, {GUY_BUN}; and third, {GUY_RED}. "
                  f"All three wear exactly the same {VEST} over their shirts and their hoodie, exactly the same {EARBUDS}, the same {TROUSERS}, and each of the three holds {LAPTOP_UNDER} on the left side of the picture, while his other arm hangs at his side. "
                  "Every one of the three has exactly the same light peach skin, and every face is light peach. All three are calm and deadpan, waiting in line: every mouth is a short perfectly straight horizontal line with both ends level, neither curved up nor curved down, every man's two brows are flat and level, "
                  "and the two big white oval eyes of every man look straight at the viewer, each small black dot pupil in the exact vertical centre of its white oval. "
                  "Every man is drawn very short and stubby: his huge round head is nearly as wide as his shoulders, and his whole body, from the top of his head to the soles of his sneakers, is only about three heads tall, with a short torso and short legs. "
                  f"Nothing else is in the picture. {LOOK_MANY} {FIT_THREE} Horizontal frame.", res="1344x768"),
  # shot 10: the café turned into their office (the tables shoved into one long table, the laptops open, the power strip with its chargers, the gong at the right end); the four typing, eyes on their screens
  # six takes: the first (-old) had the heads too high for the cheer's raised arms (tops at 14 percent) and the gaze straight at the viewer; the second (-old2) the same gaze, heads lower; the third (-old3) a gaze down but the camper's sweater light grey (178);
  # the fourth (-old4) a charcoal sweater (69); the fifth (-old5) the right grey (107 on his right sleeve) but three of the four looking straight ahead; the kept sixth opens with the gaze sentence: all four look down, the sweater is 118 to 121, the heads' tops are at 248 to 283 of 768
  "team-table": job("Four men are working at their laptops, all four looking down at their own laptop screens and none of them looking at the viewer. " + TEAM_FOUR + LONG_TABLE + TEAM_LAPTOPS + "All four are typing and their hands are out of sight behind the laptops. " + TEAM_STRIP + TEAM_GONG +
                    f"Nothing else is in the picture. {LOOK_ROW} {FIT_TEAM} Horizontal frame.", ["team-row", "camper-sit"], res="1344x768"),
  # shot 14: "SOLD!" (champagne: the same picture as team-table, all four cheering with both arms up, two bottles foaming; the spray over Ross is code)
  # six takes (the earlier ones on earlier takes of team-table): the first ("The same picture exactly: ..." on the plain team-table) had the faces cheering but three bottles and a white streaked pale yellow (-old);
  # the second (the scene said again in team-table's own words, the camper's and the third man's bottles) had flat mouths, one man holding both bottles and the streaks again (-old2);
  # the third (team-table whitened as the first reference, the bottles for the two outer men) had the right bottles and a clean white, but the camper's and the third man's mouths stayed shut and his sleeves light grey (-old3);
  # the fourth (CHEER_MOUTHS first) had all four shouting and the two bottles, but the camper's raised sleeves white and the fourth man's bottle touching the gong's crossbar (-old4);
  # the fifth (the sleeves' colours, a bottle held high) had his sleeves grey but his vest gone (-old5); the kept sixth says that all four, the camper too, keep the vest
  # (the heads and eye whites sit at the same pixels as in the kept team-table, so the two can be swapped)
  "team-cheer": job("The same picture exactly: the same four men in the same places in the same order, with the same hair, glasses, beard, vests, shirts, sweater, hoodie and earbuds, behind the same long table of four café tables pushed together, "
                    "with the same open silver laptop standing on it in front of each man, the same white power strip with its tangle of black chargers between the second and the third man's laptops and the same brass gong at the right end of the table, on the same plain white background, "
                    "but now they are all cheering. " + CHEER + f"Nothing else is changed. {FLATWHITE} {LOOK_ROW} {FIT_CHEER} Horizontal frame.", ["team-table@white", "camper-sit", "team-row"], res="1344x768"),
  # ---- Ross in his apron, 1024 x 1024 (only the master's own seed 61 keeps his head's size); calm and polite in both
  # shot 11: "...When are you leaving?" (he holds up the espresso machine's pulled plug)
  "ross-plug": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, calm and polite: a small polite closed-mouth smile held steady, the brows relaxed (not angry), the two big white eyes open looking straight ahead. "
                   f"His right arm, the one on the left side of the picture, is bent at the elbow and raised so that its mitten hand holds up {PLUG} at the height of his chest, in front of the bib of his apron and below his chin, "
                   "the plug held upright with its two silver prongs pointing up and its short black cord hanging down loosely from it, its lower end hanging free; his other arm hangs relaxed at his side. "
                   f"Nothing else is in the picture. {LOOK} {FIT}", ROSS),
  # shot 15: soaked in champagne, calm
  # the first take (-old) had the master's head to the pixel (eye whites x 412-514 and 519-620, y 209-330), foam on the hair and shoulders, drips on the face and a clean apron (the alternative if the exact head matters more than the wet apron);
  # the second (-old2) put the apron words in the middle: a soaked apron, the head at 0.92 of the master's size and 20 to 30 px higher (eye whites x 420-513 and 518-610, y 188-298); the kept third puts them last and has the same head scale
  # (eye whites x 420-511 and 516-610, y 195-303): a soaked apron needs the head at 0.92, so the build scales and shifts it (x 1.09 about the eye midpoint, 2 px right and 21 px down) to register on the x08 head
  "ross-drip": job(f"{ROSS_HEAD}, {TEE}. {ROSS_APRON} He stands facing the viewer, seen from the front, soaked and calm: a small polite closed-mouth smile held steady, the brows relaxed (not angry), the two big white eyes open looking straight ahead, both fully visible. "
                   f"He has just been sprayed with champagne: {FOAM} sits in clumps on top of his hair and on both of his shoulders, and long thin pale-yellow drips run down his forehead, his cheeks, his chin and down the bib of his apron, "
                   "with a few flat pale-yellow drops falling from his chin and from his elbows. Both his arms hang at his sides with the mitten hands open. "
                   "His brown apron is soaked too: a big darker wet patch spreads over its bib and five long pale-yellow drip lines run down the bib and the skirt, with one clump of white foam on the waist tie. "
                   f"Nothing else is in the picture: no bottle. {LOOK} {FIT}", ROSS),
  # ---- the hands, 1024 x 1024 (the arm comes in from one edge and is cut off by it)
  # shots 1, 18: the camper's hand slaps the counter (the coins are prop-coins)
  # the first two takes (-old, -old2: the arm from the bottom edge, a hand with four finger lines, the second with "all four fingers joined" words) were ordinary cartoon hands; the kept third comes in from the right edge with x10's PEACH words and is a mitten
  "hand-camper": job("A cartoon man's arm and hand reaching into the picture from the right edge, seen from above and cut off by that edge: the sleeve is a plain grey knitted sweater sleeve (a flat mid-grey tube with a thin darker-grey ribbed cuff at the wrist) coming in horizontally from the right edge of the picture, "
                     f"and at its left end the hand is {PEACH}, held flat and stretched out to the left with the back of the hand toward the viewer and a short thumb at its upper side, as if slapping a counter. "
                     f"Nothing is held in the hand and nothing else is in the picture. {FLATWHITE} {ARM} Square frame."),
  # shot 11: the startup guy's arm yanks the plug (the espresso machine's cord is code)
  "hand-dev": job("A cartoon man's arm and hand reaching into the picture from the left edge, seen from the side and cut off by that edge: the sleeve is a plain light-blue button-up shirt sleeve (a flat pale-blue tube with a thin white cuff closed by one small round white button at the wrist) coming in horizontally from the left edge, "
                  f"and at its right end the hand is {HAND}, closed in a fist that grips {PLUG}: the plug's black body is held in the fist, its two short silver prongs stick out to the right of the fist, and its short black cord hangs down from the fist. "
                  f"Nothing else is in the picture. {FLATWHITE} {ARM} Square frame."),
  # ---- the props (the laptop and the strip 1344 x 768, the rest 1024 x 1024; no reference)
  # shots 1, 2, 3, 12, 16, 18: the tiny paper cup (the cobwebs and the "$2.50" are code)
  "prop-cup": job(f"One tiny paper coffee cup seen exactly from the front and a little from above ({CUP_DESIGN}). {PROP.replace('A single object, centered', 'A single cup, centered')} Square frame."),
  # shots 1, 18: the coins that slap down on the counter
  "prop-coins": job("Four coins lying apart from each other, seen exactly from above as four flat round discs that do not touch or overlap, spread loosely in the middle of the picture: two bright golden-yellow coins and two silver-grey coins, "
                    "each a flat round disc with a thick darker rim ring, a thin black outline and one thin inner circle line, completely plain: no numbers, no letters, no faces and no symbols on any coin. "
                    f"{PROP.replace('A single object, centered', 'Four separate coins, spread out and centered')} Square frame."),
  # shot 13: the laptop screen (the code draws OFFER ACCEPTED and the amount on its black screen)
  "prop-laptop": job("One open laptop seen exactly from the front, with its screen facing the viewer, standing upright and wider than it is tall, drawn flat: a flat silver-grey base (a wide low slab with a thin black outline and a darker-grey keyboard area of small flat rounded keys in neat rows with nothing written on them, and a flat trackpad below the keys) "
                     "and above it the open lid standing upright, a flat silver-grey frame with a thin black outline round one big flat rectangular screen with sharp straight edges, a plain pure flat black, completely blank: no reflection, no glare, no icons, no logo, no text and no picture on it. "
                     f"Nothing else is on it. {PROP.replace('A single object, centered', 'A single laptop, centered')} Horizontal frame.", res="1344x768"),
  # shots 10, 13, 14: the big brass gong on its wooden stand
  "prop-gong": job(f"{cap(GONG)}, seen exactly from the front, the whole stand with its two feet in the picture. {PROP.replace('A single object, centered', 'A single gong on its stand, centered')} Square frame."),
  # shot 6: the tumbleweed that rolls across the empty café
  # the first take (-old, "many thin dry curved twigs") was a pen sketch of hundreds of fine lines; the kept second has thick black outlines but is still a dense tangle (the model does not take "fifteen")
  "prop-tumbleweed": job("One dry tumbleweed seen exactly from the front: a big round ball made of only about fifteen thick curved twigs in light brown and tan, each twig a chunky flat strip with a thick black outline, looping round each other loosely into a round shape "
                         "with big gaps between them so that the white background shows through, and a few twig ends sticking out at its edge; simple, bold and chunky like clip art, with no fine lines and no fine detail. "
                         f"{PROP.replace('A single object, centered', 'A single tumbleweed, centered')} Square frame."),
  # shot 10: the power strip with the tangle of chargers (it also lies on team-table's tabletop)
  "prop-strip": job(f"{cap(POWER_STRIP)}, seen exactly from the front, lying flat, wider than it is tall, the strip along the lower middle of the picture and the tangle of chargers and cables rising above and hanging in front of it. "
                    f"{PROP.replace('A single object, centered', 'A single power strip with its chargers, centered')} Horizontal frame.", res="1344x768"),
  # shot 14: the champagne bottle with the foam bursting out of its neck
  "prop-champagne": job(f"{cap(CHAMPAGNE)}, seen exactly from the front, standing upright, the whole bottle and the whole burst of foam in the picture. {PROP.replace('A single object, centered', 'A single bottle, centered')} Square frame."),
}
# the kept picture of each name (a name not here has the seed 61; a second seed is painted only if the first is broken, and its number goes here)
SEEDS = {}
# a reference name is a file path or a kept master (PICK)
def ref(r):
    if r.endswith("@white"): return white_copy(ref(r[:-6]))
    return r if ("\\" in r or "/" in r) else (str(CAMPER_REF) if r == "camper-ref" else str(OUT / f"{r}-{PICK[r]}.png"))

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
