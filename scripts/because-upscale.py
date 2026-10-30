# "Because": the insert on the customer-facing screen (shot 16) shows the painted monitor at 2-3 times. That prop is upscaled 4x with RealESRGAN_x4plus (E:/Invoke, spandrel, the GPU) so the paint
# stays crisp next to the totals drawn in code, the way scripts/tip-upscale.py does it for the card terminal and the kiosk. The puppets are never upscaled or regenerated.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/because-upscale.py
# The painted layer has a binary alpha whose first opaque pixel is a 1 px white fringe, so before the upscale the mask loses that ring, the colour under it is bled from the nearest inside pixel,
# and the alpha is smoothed again at 4x -> public/sp/because-<name>-r4.png. Writes src/because-crops.json: {name: {file, box: [x0, y0, x1, y1] in px of the layer, k: 4}}, read by src/because-scenes.tsx.
import json, os
import cv2
import numpy as np
import torch
from PIL import Image
from spandrel import ModelLoader

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "E:/Invoke/models/53add48b-a5c7-41cc-958e-d6d87b26f6ff/RealESRGAN_x4plus.pth"
PROPS = {  # name: (painted layer, box of the layer that the insert shows)
    "screen": ("sp/because-screen.png", (0, 0, 681, 647)),  # the whole monitor: its glass, bezel and stand (shot 16, about 1.6-2.2 times)
}
K = 4
TILE, PAD = 400, 16

m = ModelLoader().load_from_file(MODEL).cuda().eval()


def esr(rgb: np.ndarray) -> np.ndarray:
    """4x of an RGB uint8 image, in overlapping tiles (the whole picture does not fit in 12 GB of memory)"""
    h, w = rgb.shape[:2]
    out = np.zeros((h * K, w * K, 3), np.uint8)
    for y0 in range(0, h, TILE):
        for x0 in range(0, w, TILE):
            ya, yb, xa, xb = max(0, y0 - PAD), min(h, y0 + TILE + PAD), max(0, x0 - PAD), min(w, x0 + TILE + PAD)
            t = torch.from_numpy(rgb[ya:yb, xa:xb].astype(np.float32) / 255).permute(2, 0, 1)[None].cuda()
            with torch.no_grad():
                y = m(t)
            o = (y[0].clamp(0, 1).permute(1, 2, 0).cpu().numpy() * 255).round().astype(np.uint8)
            ys, xs = (y0 - ya) * K, (x0 - xa) * K
            hh, ww = min(TILE, h - y0) * K, min(TILE, w - x0) * K
            out[y0 * K:y0 * K + hh, x0 * K:x0 * K + ww] = o[ys:ys + hh, xs:xs + ww]
    return out


out = {}
for name, (src, box) in PROPS.items():
    rgba = np.asarray(Image.open(os.path.join(root, "public", src)).convert("RGBA"))
    x0, y0, x1, y1 = box
    mask = (rgba[..., 3] > 127).astype(np.uint8)
    # the white fringe: bright pixels on the edge, outside the painted dark outline. Peel them off, a ring at a time, until the outline (or anything darker) shows
    white = rgba[..., :3].min(axis=2) >= 236
    cross = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    inner = mask.copy()
    for _ in range(5):
        edge = (inner == 1) & (cv2.erode(inner, cross) == 0)
        drop = edge & white
        if not drop.any():
            break
        inner[drop] = 0
    # the colour of everything outside the mask: the nearest inside pixel (so the upscaler sees the outline's dark colour next to the edge, not white)
    dist, lab = cv2.distanceTransformWithLabels(1 - inner, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    zy, zx = np.nonzero(inner == 1)
    table = np.zeros((lab.max() + 1, 3), np.uint8)
    table[lab[zy, zx]] = rgba[zy, zx, :3]
    rgb = table[lab]
    rgb[inner == 1] = rgba[..., :3][inner == 1]
    big = esr(np.ascontiguousarray(rgb[y0:y1, x0:x1]))
    a = cv2.resize(inner[y0:y1, x0:x1].astype(np.float32), None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), 1.8)
    a = np.clip((a - 0.35) / 0.3, 0, 1)
    a = a * a * (3 - 2 * a)
    file = f"sp/because-{name}-r4.png"
    Image.fromarray(np.dstack([big, (a * 255).round().astype(np.uint8)])).save(os.path.join(root, "public", file), optimize=True)
    out[name] = {"file": file, "box": list(box), "k": K}
    print(file, big.shape)
json.dump(out, open(os.path.join(root, "src", "because-crops.json"), "w"), indent=1)
