# Reference photos for the realistic "Cold Lips" v8 test (LTX-2.5 MSR, scripts/lips8real-shots.py): the three people and the café from both sides, Qwen Image 2.1 Turbo 7B.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/lips8real-refs.py [name[:seed,seed] ...]     -> out/lips8-real/refs/<name>-<seed>.png   (704x1280, the shots' size: MSR stretches a ref to the video's size)
# The looks are the cartoon's (scripts/lips-art-gen.py, scripts/tip-art-gen.py) in photo words. Head to waist, so the face is big enough to survive the VAE. No text and no brand anywhere.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\lips8-real\refs"); OUT.mkdir(parents=True, exist_ok=True)
PERSON = ("Soft even studio light, a plain light grey seamless backdrop behind the person, nothing else in the picture. Natural skin texture, shot on a 50mm lens, sharp focus. "
          "No text, no letters, no logos anywhere. Vertical frame.")
PLACE = "No people. No text, no letters, no logos and no writing anywhere. Vertical frame, eye level, shot on a 35mm lens, natural colours."
JOBS = {
  "customer": ("A photorealistic portrait photograph of a real woman in her early 50s, seen from the front from the top of her head down to her waist. She has bright golden blonde hair cut in a sharp, sleek, "
               "straight bob that ends at her jaw, with straight-cut bangs, and big black sunglasses pushed up on top of her head. Small round white pearl earrings, thin dark eyebrows, light makeup, a stiff, sour, "
               "unimpressed face with her lips pressed together, looking straight at the camera. She wears a long pale beige trench coat buttoned up to the neck with the collar closed. On her left forearm hangs a small "
               "tan leather handbag with an open top, and a tiny tan chihuahua pokes its head out of the bag, its big ears up. " + PERSON),
  "denise": ("A photorealistic portrait photograph of a real woman in her early 40s, a coffee shop barista, seen from the front from the top of her head down to her waist. Messy brown hair pulled up in a loose bun "
             "on top of her head with a few strands falling around her face, no makeup, a tired, flat, deadpan face, looking straight at the camera. She wears a baggy heather grey hoodie with long sleeves and over it "
             "a plain bright green apron with a neck strap, with nothing written on it. " + PERSON),
  "todd": ("A photorealistic portrait photograph of a real man in his mid 30s, a coffee shop manager, seen from the front from the top of his head down to his waist. He is chubby with a round soft face, pale skin, "
           "a shiny sweaty forehead and thin, messy light brown hair receding at the temples. A nervous, eager, worried face, eyebrows raised, looking straight at the camera. He wears a white short-sleeved button-up "
           "dress shirt with damp sweat patches under the arms, a bright red necktie that is far too short, ending high on his belly, and a plain black rectangular name badge on his chest with nothing written on it. " + PERSON),
  "bg-counter": ("A photorealistic photograph of the inside of a small independent coffee shop in the morning, seen from the customer side, looking straight at the service counter. A light wood counter top with a dark "
                 "wood front panel runs across the lower part of the picture. Behind the counter: a chrome espresso machine, stacks of white paper cups, a glass pastry case with croissants, a glass jar with coins and "
                 "dollar bills in it on the counter, shelves with mugs, cream walls and a dark green tiled back wall, warm round pendant lamps. Warm morning sunlight comes in from a window on the left. " + PLACE),
  "bg-room": ("A photorealistic photograph of the inside of a small independent coffee shop in the morning, seen from behind the service counter, looking out across the room toward the front of the shop. In the "
              "foreground the edge of a light wood counter top runs across the bottom of the picture. In the middle of the front wall is a glass front door with a dark wooden frame, and beside it a big window onto a "
              "sunny street. A few small round wooden tables with chairs, a light wood floor, cream walls, warm round pendant lamps. Bright morning daylight. " + PLACE),
}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [11, 12]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": "704x1280", "seed": seed})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"{name}-{seed}.png")
