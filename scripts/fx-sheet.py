# The stills sheet of the effects test: before (commit ad2ed65) above after for the named moments, then the grain off | on pairs at 100 %.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/fx-sheet.py        (reads scratch/fx/stills/{before,after,grain}/*.png, writes out/fx-test-stills.jpg)
# The moments (frame numbers) are the ones scripts/render-fx-test.sh renders; keep the two lists the same.
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'scratch', 'fx', 'stills')
MOMENTS = [('stream full', 4), ('the cold hit', 9), ('steam breaking up', 14), ('icicle grown', 50), ('flip mid-turn', 1279), ('phone down', 1290)]
GRAIN = [('shot 1, grain off | on', 'shot1', (300, 560, 840, 960)), ('shot 8c, grain off | on', 'premier', (80, 300, 620, 700))]  # crops at 100 %

try:
    F = ImageFont.truetype('arialbd.ttf', 22); F2 = ImageFont.truetype('arial.ttf', 18)
except Exception:
    F = F2 = ImageFont.load_default()

W = 330  # a frame is 1080 x 1920, shown 330 px wide
H = int(1920 * W / 1080)
G = 8
cols = len(MOMENTS)
gw = 540  # a grain crop, 100 %
gh = 400
width = max(cols * (W + G) + G, 2 * (gw + G) * 2 + G)
height = G + 34 + 2 * (H + 30) + 34 + (gh + 40) + G
sheet = Image.new('RGB', (width, height), (22, 24, 30))
d = ImageDraw.Draw(sheet)
d.text((G, G), 'before = commit ad2ed65 (above)   after = the kit src/sp-fx.tsx + painted props (below)', fill=(255, 255, 255), font=F)
y = G + 34
for r, which in enumerate(('before', 'after')):
    for c, (label, f) in enumerate(MOMENTS):
        im = Image.open(os.path.join(D, which, f'{f:04d}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
        x = G + c * (W + G)
        sheet.paste(im, (x, y + 26))
        d.text((x + 2, y + 2), f'{which}: {label} (f{f})', fill=(255, 220, 140) if which == 'before' else (150, 230, 170), font=F2)
    y += H + 30
d.text((G, y + 4), 'grain: a very light seeded grain (Grain in src/sp-fx.tsx, NobodyV3 grain prop), shown at 100 % so it can be judged; it is OFF in the episode', fill=(255, 255, 255), font=F2)
y += 34
x = G
for label, name, box in GRAIN:
    for state in ('off', 'on'):
        im = Image.open(os.path.join(D, 'grain', f'{name}-{state}.png')).convert('RGB').crop(box)
        sheet.paste(im, (x, y + 22))
        d.text((x + 2, y + 2), f'{label.split(",")[0]}: grain {state}', fill=(255, 255, 255), font=F2)
        x += gw + G
sheet.save(os.path.join(ROOT, 'out', 'fx-test-stills.jpg'), quality=90)
print('out/fx-test-stills.jpg', sheet.size)
