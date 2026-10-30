# python scripts/pen-handphone.py  ->  public/sp/pen-handphone-hand.png: the hand of public/sp/tip-handPhone.png (Denise's hand in the grey sleeve of her hoodie holding a phone) on its own, with soft edges, to be
# laid over the screen that src/pen-stage.tsx useHandPhone draws on the phone (so that the fingers and the palm stay in front of it). The screen itself is not traced from the painting: it is a clean
# rounded rectangle laid just inside the painted bezel; this script fits that rectangle to the phone's straight edges (the stretches that no finger covers) and prints its numbers for HAND_PHONE.
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

im = Image.open("public/sp/tip-handPhone.png").convert("RGBA")
a = np.array(im).astype(int)
H, W = a.shape[:2]
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
dark = (lum < 70) & (a[..., 3] > 200)
lab, n = ndimage.label(dark)
body = lab == int(np.argmax(ndimage.sum(dark, lab, range(1, n + 1)))) + 1  # the phone's black: bezel and screen


def edge(rows_or_cols, axis, side):
    out = []
    for k in rows_or_cols:
        idx = np.where(body[k] if axis == "row" else body[:, k])[0]
        if len(idx):
            out.append((k, idx.min() if side == "lo" else idx.max()))
    return np.polyfit(*np.array(out, float).T, 1)


# the four straight edges, on the stretches that no finger or palm covers: x = p0*y + p1 (left, right), y = p0*x + p1 (top, bottom)
left = edge(range(30, 110), "row", "lo")
right = edge(range(40, 215), "row", "hi")
top = edge(range(130, 250), "col", "lo")
bottom = edge(range(90, 190), "col", "hi")
tilt = np.degrees(np.mean([np.arctan(-left[0]), np.arctan(-right[0]), np.arctan(top[0]), np.arctan(bottom[0])]))  # clockwise: the top leans right
ca = np.cos(np.radians(tilt))
# the body's width and height across its own axes: between the left and right lines (at the middle row) and the top and bottom lines (at the middle column)
ym = 215.0
xl, xr = left[0] * ym + left[1], right[0] * ym + right[1]
bw = (xr - xl) * ca
xm = (xl + xr) / 2
yt, yb = top[0] * xm + top[1], bottom[0] * xm + bottom[1]
bh = (yb - yt) * ca
cx, cy = xm, (yt + yb) / 2

# the hand: skin, grown by 3 px (it takes the thin ink line round a finger with it), soft edge
skin = (a[..., 0] > 170) & (a[..., 1] > 130) & (a[..., 2] > 70) & (a[..., 0] - a[..., 2] > 45) & (a[..., 3] > 128)
skin = ndimage.binary_opening(skin, iterations=1)
hand = ndimage.binary_dilation(skin, iterations=3)
alpha = Image.fromarray((hand * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
out = im.copy()
out.putalpha(Image.fromarray(np.minimum(np.array(alpha), a[..., 3]).astype(np.uint8)))
out.save("public/sp/pen-handphone-hand.png")
print(f"HAND_PHONE: picture {W}x{H}, the phone's body centre ({cx:.1f}, {cy:.1f}), turned {tilt:.2f} deg clockwise, {bw:.0f} x {bh:.0f} px; the screen is that less 9 px a side")
