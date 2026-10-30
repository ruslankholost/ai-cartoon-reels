# Where do the captions sit? Compares scratch/caps/NN-on.png with NN-off.png and prints the rows the captions cover.
# python scripts/caps-check.py [top=250] [bottom=1500]   (the pictures are rendered at scale 1; run caps-job.mts + still.mjs first)
import json, sys
from PIL import Image, ImageChops
lo, hi = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (250, 1500)
texts = json.load(open('scratch/caps-text.json', encoding='utf-8'))
bad = 0
for i, t in enumerate(texts):
    a = Image.open(f'scratch/caps/{i + 1:02d}-on.png').convert('RGB')
    b = Image.open(f'scratch/caps/{i + 1:02d}-off.png').convert('RGB')
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 12 else 0)
    box = d.getbbox()
    if not box:
        print(f'{i + 1:2d}  no caption pixels  {t}'); bad += 1; continue
    x0, y0, x1, y1 = box
    ok = y0 >= lo and y1 <= hi and x0 >= 20 and x1 <= 955  # the right ~130 px are the Instagram buttons
    bad += not ok
    print(f'{"ok " if ok else "BAD"} {i + 1:2d}  y {y0:4d}-{y1:4d}  x {x0:4d}-{x1:4d}  {t}')
print('captions inside the safe area' if not bad else f'{bad} caption(s) outside y {lo}..{hi}')
