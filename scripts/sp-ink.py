# How thick is the ink line of the painted South Park art? Code-drawn shapes (water, steam, phones, hands) use the same weight (src/sp-fx.tsx INK_W).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/sp-ink.py
# Method: the silhouette of every character picture (flood fill of the white background, as scripts/sp-prep.py does it) is walked; at each boundary
# pixel the luminance is sampled every 0.5 px along the inward normal. The line is the dip between the white background and the light fill inside
# (skin, towel, shirt: at least 150 at 9 px depth); its equivalent width is the area of the dip, with the darkest value counted as full ink:
#     width = sum over the profile of clip((L_fill - L(x)) / (L_fill - L_min), 0, 1) * 0.5 px
# which is what a box-shaped black line of that width would be. Pictures are 768 wide, so the numbers are in px of the source picture.
import os
import numpy as np, scipy.ndimage as ndi
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'out', 'sp-cast2')
PICS = ['denise-neutral-22', 'denise-robe-22', 'gary-22', 'marco-21', 'rick-21', 'wife-21', 'agency-21']


def profile_widths(path):
    a = np.array(Image.open(path).convert('RGB')).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
    near = a.min(axis=2) >= 238
    ink_d = ndi.binary_dilation(~near, structure=np.ones((3, 3)))
    lab, _ = ndi.label(~ink_d)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = ndi.binary_dilation(np.isin(lab, border[border > 0]), structure=np.ones((3, 3))) & near
    din = ndi.distance_transform_edt(~bg)  # distance from the background, inside the character
    gy, gx = np.gradient(ndi.gaussian_filter(din, 1.2))
    ring = (din > 0.5) & (din < 1.6)
    ys, xs = np.where(ring)
    n = np.hypot(gx[ys, xs], gy[ys, xs])
    keep = n > 0.3
    ys, xs, nx, ny = ys[keep], xs[keep], gx[ys, xs][keep] / n[keep], gy[ys, xs][keep] / n[keep]
    # start 1.5 px outside the boundary pixel (white), walk 11 px inward
    steps = np.arange(-1.5, 9.5, 0.5)
    px = xs[:, None] + nx[:, None] * steps[None, :]
    py = ys[:, None] + ny[:, None] * steps[None, :]
    prof = ndi.map_coordinates(lum, [py.ravel(), px.ravel()], order=1, mode='nearest').reshape(px.shape)
    fill = prof[:, -3:].mean(axis=1)  # about 8.5-9 px inside
    lo = prof.min(axis=1)
    ok = (fill > 150) & (lo < 110) & (fill - lo > 60)
    d = np.clip((fill[:, None] - prof) / np.maximum(fill - lo, 1)[:, None], 0, 1)
    w = d.sum(axis=1) * 0.5
    return w[ok]


if __name__ == '__main__':
    allw = []
    for n in PICS:
        w = profile_widths(os.path.join(SRC, n + '.png'))
        allw.append(w)
        print(f'{n:20s} median {np.median(w):4.2f}  p25 {np.percentile(w, 25):4.2f}  p75 {np.percentile(w, 75):4.2f}  boundary px {len(w)}')
    w = np.concatenate(allw)
    print(f'all characters: median {np.median(w):.2f} px of the 768 px picture (p25 {np.percentile(w, 25):.2f}, p75 {np.percentile(w, 75):.2f})')
