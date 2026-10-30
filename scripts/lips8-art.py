# E:/Invoke/.venv/Scripts/python.exe -I scripts/lips8-art.py  ->  public/sp/lips8-customer-head-purple.png
# "Cold Lips" v8 (docs/x06-cold-lips.md, Script v8): her face goes purple with fury. Her master head (public/sp/lips-customer-head.png) with the skin recoloured to a furious magenta-purple, the shading kept: a pixel counts as
# skin by its colour's direction (its chroma), not by a hard threshold, so the soft edge where the skin meets the ink line is recoloured as much as it is skin. The hair (no blue in it), the ivory pearls (a paler direction: cos 0.989) and the eye whites
# (grey, no chroma) and the ink (too dark to have a direction) stay as painted. The code lays it over the head and fades it in and out (src/lips8-shared.tsx PurpleFace).
import os
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'public', 'sp', 'lips-customer-head.png')
DST = os.path.join(ROOT, 'public', 'sp', 'lips8-customer-head-purple.png')
SKIN = np.array([255, 213, 152], float)     # the rig's face colour (src/lips-rig.json customer.face)
PURPLE = np.array([176, 70, 138], float)    # the fury

im = np.asarray(Image.open(SRC).convert('RGBA')).astype(float)
rgb, a = im[..., :3], im[..., 3]
lum = rgb @ np.array([0.3, 0.59, 0.11])
d = rgb / np.maximum(np.linalg.norm(rgb, axis=-1, keepdims=True), 1e-6)
skin_d = SKIN / np.linalg.norm(SKIN)
cos = (d * skin_d).sum(-1)
w = np.clip((cos - 0.991) / (0.997 - 0.991), 0, 1) * np.clip((lum - 40) / 60, 0, 1) * (a > 0)
k = lum / (SKIN @ np.array([0.3, 0.59, 0.11]))
out = rgb * (1 - w[..., None]) + np.clip(PURPLE[None, None, :] * k[..., None], 0, 255) * w[..., None]
Image.fromarray(np.dstack([out, a]).round().astype(np.uint8), 'RGBA').save(DST)
print('skin px', int((w > 0.5).sum()), 'of', int((a > 0).sum()), '->', DST)
