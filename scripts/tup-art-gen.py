# Art for "I'm Just Supporting a Friend" (docs/x05-supporting-a-friend.md): the bowl and its lid, three hands that reach in to press a lid or hold out a gift, and the gift box. Qwen Image 2.1 Turbo 7B from the prompt alone,
# recipe C of E:\Wan2GP\my_tests\sp_cast.py (the South Park look), modeled on scripts/pen-art-gen.py.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/tup-art-gen.py [name[:seed,seed] ...]     -> out/sp-cast6/<name>-<seed>.png   (1344x768, horizontal: the arms come in from the side)
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call. Without a seed list a name gets the seed in SEEDS (71 if it is not there).
# Four candidates of each (seeds 71-74); the picks are in SEEDS and scripts/tup-prep.py cuts them (public/sp/tup-*.png, src/tup-props.json).
# Text is never painted. Normal colours: the sepia is put on in code. A flat white background, so that the flood fill of scripts/tip-prep.py prop() cuts them cleanly.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast6"); OUT.mkdir(parents=True, exist_ok=True)
RES = "1344x768"
PROP = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "shapes, thin black outlines. A single object, centered, filling most of the frame, on a plain white background. No text, no letters, no numbers and no logos anywhere. Horizontal frame.")
ARM = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. A single arm and hand, large, filling most of the frame, on a plain white background. No text, no letters, no numbers and no logos anywhere. Horizontal frame.")
# the bowl and its lid: the same colour (the hostess's lidded bowl of out/sp-cast5 is pastel turquoise too) and the same view, so that the lid sits on the bowl
VIEW = "seen from the front and a little above, tilted down about 30 degrees, so that the round rim appears as a wide ellipse about half as tall as it is wide"
BOX = "a small square gift box wrapped in plain pastel-blue paper, with a wide red satin ribbon running around it and crossing on top, and a big red ribbon bow on top"
PEACH = "a plain rounded mitten in light peach skin"
# the pressing hands. The first wording ("... the index finger is stretched out straight down, as if pressing a button", the arm straight in from the side) pointed the finger sideways along the arm every time; an arm slanting
# down from a corner pointed it down-left along the arm; the wrist bent down at the end of a level forearm gives the finger straight down. The sleeve is cut off by the picture's edge (the code slides the piece in from that side)
PRESS = ("The hand is bent down at the wrist, so that it hangs down below the end of the sleeve; it is " + PEACH + ", and its index finger points straight down towards the bottom of the picture, as if poking a button below it, "
         "with the other fingers curled into a loose fist and the thumb tucked in. ")
JOBS = {
  "bowl": f"A 1950s plastic mixing bowl in pale turquoise, empty and with no lid: a round, wide, shallow bowl with a smooth thick rounded lip around its wide open top and a small flat base, {VIEW}, and the empty inside of the bowl is visible. Plain smooth plastic with no pattern, no handle, no text and no logo. {PROP}",
  "lid": f"The matching round lid of a 1950s pale turquoise plastic bowl, lying flat on its own: a flat round disc in the same pale turquoise with a slightly raised ring along its edge, a short thin vertical rim band under the edge, and one small round raised dimple in the exact center, {VIEW}, so that the lid is a wide ellipse. Plain smooth plastic with no pattern, no handle, no text and no logo. {PROP}",
  "hand-shopper": ("A cartoon woman's arm and hand reaching into the picture from the right edge, seen from the side. The sleeve is a 1950s camel-brown wool coat sleeve with a wide turned-back forest-green cuff; "
                   "it comes in horizontally from the right edge of the picture and is cut off by that edge. " + PRESS + ARM),
  "hand-hostess": ("A cartoon woman's arm and hand reaching into the picture from the left edge, seen from the side. The sleeve is a fitted pastel-pink long sleeve with a white cuff at the wrist; "
                   "it comes in horizontally from the left edge of the picture and is cut off by that edge. " + PRESS + ARM),
  "hand-man": ("A cartoon man's arm and hand reaching into the picture from the left edge, seen from the side and slightly above. The sleeve is a dark grey suit jacket sleeve with a white shirt cuff showing at the wrist; "
               f"it comes in horizontally from the left edge of the picture and is cut off by that edge. The hand is {PEACH}, open with the palm up, holding out {BOX}, which rests on the hand at the right end of the arm. The whole gift box is in the picture. {ARM}"),
  "giftbox": f"{BOX[0].upper() + BOX[1:]}, seen from the front and a little above, standing alone. {PROP}",
}
# the seeds of the picks (the candidates are on scratch/tup/candidates.jpg): the bowl 74 and the lid 71 have the same colour and nearly the same view; the shopper's hand 73 and the hostess's 71 are the cleanest fingers
# pointing straight down; the man's hand 74 and the gift box 74 are the same box (the same seed gave the same view, lid ledge and bow)
SEEDS = {"bowl": 74, "lid": 71, "hand-shopper": 73, "hand-hostess": 71, "hand-man": 74, "giftbox": 74}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [SEEDS.get(name, 71)]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": RES, "seed": seed})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
