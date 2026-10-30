# Painted props for the effects test of "Nobody Picks Up" (shot 8c, the phone on the table): a top-down coffee table, a black smartphone (screen side and
# back), Denise's hand in the light blue robe sleeve, a blank receipt. Qwen Image 2.1 Turbo 7B from the prompt alone, recipe C of E:\Wan2GP\my_tests\sp_cast.py.
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/sp-props-gen.py [name[:seed,seed] ...]     -> out/sp-cast2/fx-<name>-<seed>.png
# Run it in the foreground (a background job is killed when memory runs low), at most 5 images per call.
import shutil, sys, time
from pathlib import Path
sys.path.insert(0, r"E:\Wan2GP")
from shared.api import init
OUT = Path(r"E:\getphantom-toons\out\sp-cast2"); OUT.mkdir(parents=True, exist_ok=True)
STYLE = ("Drawn exactly in the style of the TV cartoon South Park: construction-paper cut-out look, flat colors with no shading, simple "
         "shapes, thin black outlines. No text, no letters, no numbers anywhere. Vertical frame.")
JOBS = {
  "table": f"A wooden coffee table seen from directly above, the top-down view fills the whole frame: wide dark brown wooden planks with a few simple wood grain lines, a thin black outline between the planks, plain and completely empty, nothing on it. Warm evening lamp light. {STYLE}",
  "phones": f"Two identical black smartphones lying flat side by side on a plain white background, seen from directly above, both in portrait orientation and exactly the same size, far apart from each other. The left one is screen side up: a plain black blank screen with a thin bezel and rounded corners, no icons. The right one is turned over, back side up: a plain dark grey back with a square camera bump with two round lenses in the top left corner. {STYLE}",
  "hand": f"A hand and forearm in a fluffy light blue terry cloth bathrobe sleeve with a folded cuff, reaching up from the bottom edge of the frame, seen from directly above, palm down, a flat mitten-style hand with a separate thumb and a few simple finger bumps, light peach skin, on a plain white background. {STYLE}",
  "receipt": f"A single small pale cream paper shop receipt lying flat, seen from directly above, a little curled at the bottom edge, completely blank with no printing, on a plain white background. {STYLE}",
  # second round, after looking at the first: the table read like a chocolate bar, the phones were photographs, the hand had too many fingers
  "table2": f"A wooden coffee table seen from directly above, the top-down view fills the whole frame: a few long dark brown boards side by side, each board with several wavy lighter and darker brown wood grain lines running along it and one or two knots, thin black outlines between the boards, nothing on it. Warm evening lamp light. {STYLE}",
  "phones2": f"Two identical simple black smartphones lying flat side by side on a plain white background, seen from directly above, drawn as flat cartoon cut-outs: plain dark rounded rectangles with a thin black outline, no reflections, no gradients, no realistic details. The left one is screen side up: a flat dark navy screen inside a thin black bezel, nothing on it. The right one is turned over, back side up: a flat dark grey back with a small square camera bump with two black round lenses in the top left corner. {STYLE}",
  "hand2": f"A cartoon hand and forearm in a fluffy light blue terry cloth bathrobe sleeve with a folded cuff, reaching up from the bottom edge of the frame, seen from directly above, palm down. The hand is a simple rounded mitten: one rounded shape for the four fingers with two short lines between them and a separate short thumb, exactly like a South Park character's hand, light peach skin, on a plain white background. {STYLE}",
  # third round: the hand again, a real mitten like Denise's puppet
  "hand3": f"A cartoon hand and forearm in a fluffy light blue terry cloth bathrobe sleeve with a folded cuff, reaching up from the bottom edge of the frame, seen from directly above, palm down. The hand is a plain rounded mitten in light peach skin, like the hand of a South Park character: a smooth oval blob with only a short rounded thumb sticking out at the side, no separate fingers, no finger lines. On a plain white background. {STYLE}",
  # fourth round: every prop big in its own picture, so that it is shown at about the size it was painted (1-1.5x) and its ink line keeps the weight
  # of the rest of the art (a phone painted 150 px wide and shown 450 px wide gets a line three times too thick)
  "phone-front": f"A single flat cartoon smartphone seen from directly above, centered, filling most of the vertical frame, portrait orientation: a plain dark rounded rectangle body with a thin black outline, a flat dark navy screen inside a thin bezel, a small speaker slot at the top, nothing on the screen, no reflections, no gradients, no realistic details. On a plain white background. {STYLE}",
  "phone-back": f"A single flat cartoon smartphone seen from directly above, centered, filling most of the vertical frame, portrait orientation, turned over with its back side up: a plain flat dark grey rounded rectangle back with a thin black outline, a small square camera bump with two black round lenses and a small flash in the top left corner, no reflections, no gradients, no realistic details. On a plain white background. {STYLE}",
  "hand-big": f"An extreme close-up of a cartoon hand and forearm in a fluffy light blue terry cloth bathrobe sleeve with a folded cuff, reaching up from the bottom edge, seen from directly above, palm down. The hand is a plain rounded mitten in light peach skin: a smooth oval with only a short rounded thumb at the side, no fingers, no finger lines. The mitten is large and fills most of the width of the frame. On a plain white background. {STYLE}",
}
want = []
for a in sys.argv[1:] or list(JOBS):
    name, _, seeds = a.partition(":")
    want.append((name, [int(x) for x in seeds.split(",")] if seeds else [41]))
session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
for name, seeds in want:
    for seed in seeds:
        s = session.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": JOBS[name], "resolution": "768x1344", "seed": seed})
        t = time.time()
        r = session.submit_task(s).result()
        print(name, seed, "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / f"fx-{name}-{seed}.png")
