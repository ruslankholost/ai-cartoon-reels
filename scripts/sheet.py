# python scripts/sheet.py out.jpg cols tileWidth labels.json  (tiles stills with a label strip; labels.json: [{label, path}])
import json, sys
from PIL import Image, ImageDraw, ImageFont
out, cols, W, lab = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
items = json.load(open(lab, encoding='utf8'))
ims = []
for it in items:
    try:
        im = Image.open(it['path']).convert('RGB')
    except Exception:
        im = Image.new('RGB', (1080, 1920), (90, 0, 0))
    ims.append((it['label'], im.resize((W, int(im.height * W / im.width)), Image.LANCZOS)))
rows = (len(ims) + cols - 1) // cols
H = max(i.height for _, i in ims)
sheet = Image.new('RGB', (cols * W + (cols + 1) * 6, rows * (H + 34) + 6), (22, 24, 30))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('arial.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for n, (label, im) in enumerate(ims):
    x, y = 6 + (n % cols) * (W + 6), 6 + (n // cols) * (H + 34)
    sheet.paste(im, (x, y + 30))
    d.text((x + 4, y + 3), label, fill=(255, 255, 255), font=font)
sheet.save(out, quality=88)
print(out, sheet.size)
