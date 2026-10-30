# Art for x08 "Just Let Me Pay" (docs/x08-just-let-me-pay.md): Ross as a South Park puppet in his poses, his hand with the phone for the inserts, and the living room plate. Qwen Image 2.1 Turbo 7B;
# Ross's pictures take his approved avatar (E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png, made from his photo 10-24) as the main reference ("KI"), so the face, hair, ear tunnels and tattoos stay his.
# The LOOK words are scripts/lips-art-gen.py's. The ghost is drawn in code (a plain navy blob with two eyes), so it is not here.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/x08-art-gen.py [name[:seed,seed] ...]     -> out/x08-cast/<name>-<seed>.png   (768x1344)
# Run it in the foreground, one WanGP job at a time. Text is never painted: the phone screen is blank, the code draws it.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\x08-cast"); OUT.mkdir(parents=True, exist_ok=True)
AVATAR = r"E:\Wan2GP\my_tests\avatar\ross-avatar-southpark.png"
LOOK = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
        "geometric shapes, thin black outlines. The head is huge, about as wide as the shoulders, and sits right on the body with no neck. "
        "The body is short and stubby, about one and a half heads tall, with short arms and simple mitten hands. Two big white oval eyes "
        "touch each other, with small black dot pupils. No nose. No text, no letters and no numbers anywhere. An original character, not a "
        "character from the show. Front view, full body, on a plain white background. Vertical frame.")
SET = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
       "shapes, thin black outlines. Background only, no people, no text, no letters, no numbers, no logos and no symbols anywhere. Front-on view. Vertical frame.")
ROSS = ("The same man as in the picture, redrawn as a full-body puppet: short reddish-brown hair with shaved sides and a longer swept top, light stubble, round black flesh-tunnel plugs in both earlobes, "
        "a plain black t-shirt, colourful tattoo sleeves on both forearms, a black smartwatch on his left wrist, dark blue jeans and black sneakers, his mouth closed in a flat line, eyes open")
PHONE = "one black smartphone with a plain blank white screen"
JOBS = {
  # the master: every pose gets this picture's head in the prep
  "ross-sit": f"{ROSS}, looking down. He sits on an invisible seat, seen from the front, his knees toward the viewer, and holds {PHONE} in both hands at chest height, looking at it. {LOOK}",
  "ross-up": f"{ROSS}. He sits on an invisible seat, seen from the front, and holds {PHONE} up high above his head in both hands, his arms raised, the screen facing him. {LOOK}",
  "ross-peel": f"{ROSS}. He sits on an invisible seat, seen from the front, both hands raised to his face with the fingers spread on his cheeks, as if peeling something off his face. {LOOK}",
  "ross-fly": f"{ROSS}. He flies straight up like a rocket, seen from the front, both arms stretched straight up above his head with the hands together, his legs straight and together, his body stiff. {LOOK}",
  "ross-hand": ("A close view of one hand holding " + PHONE + " upright, seen from the front, the screen facing the viewer and filling the middle of the picture, the thumb resting on the lower part of the screen; "
                "the wrist with a black smartwatch and the forearm with a colourful tattoo sleeve come in from the bottom of the picture. Drawn exactly in the style of the TV cartoon South Park: construction-paper "
                "cut-out look, flat colors with no shading, simple shapes, thin black outlines, a simple mitten-like hand, on a plain white background. No text, no letters and no numbers anywhere. Vertical frame."),
  "bg-living": ("The inside of a small living room at night, drawn as a flat front-on stage set with no perspective, filling the whole picture from edge to edge with no border: a dark grey fabric couch facing the "
                "viewer in the middle of the picture, its seat at about two thirds of the way down, a tall floor lamp with a warm yellow shade beside it, a window in the wall behind the couch showing a dark blue "
                "night sky with a few stars, plain beige walls, a light cream ceiling across the top quarter of the picture, a wooden floor at the bottom. " + SET),
}
REF = {k: [AVATAR] for k in JOBS if k.startswith("ross")}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [61, 62]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": "768x1344", "seed": seed})
        if name in REF: s.update({"video_prompt_type": "KI", "image_refs": REF[name]})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
