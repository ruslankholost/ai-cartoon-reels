# Puppet prep for the South Park style call: cuts the Qwen pictures in out/sp-cast2 into transparent parts (digital paper cut-outs).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/sp-prep.py
# Writes public/sp/<char>-{body,head,hand}.png, src/sp-rig.json (pivots, eyes, mouth, colours, all in px of the 768x1344 source picture,
# y down) and scratch/sp/debug-<char>-*.png (rig points drawn on the picture, the parts over magenta, and the parts put back together
# against the original). Coordinates were read off the pictures (scratch/sp/explore*.py shows how); the fits below only refine them.
import json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'out', 'sp-cast2')
OUT = os.path.join(ROOT, 'public', 'sp')
DBG = os.path.join(ROOT, 'scratch', 'sp')
os.makedirs(OUT, exist_ok=True); os.makedirs(DBG, exist_ok=True)
K3 = np.ones((3, 3), bool)


def load(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)


def med(a, x0, y0, x1, y1):
    return np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


# ---------------------------------------------------------------- cut-out
def cutout(a, hole_rects=(), hole_masks=()):
    """Remove the white background: flood from the border (the outline keeps the inner whites: eyes, foam, foil), clear the pockets of
    background between hair strands (hole_rects), then give the 2 px edge ring a real alpha and a clean colour (no white fringe)."""
    near = a.min(axis=2) >= 238
    ink_d = ndi.binary_dilation(~near, structure=K3)  # seals 1 px gaps in the outline
    lab, _ = ndi.label(~ink_d)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgc = np.isin(lab, border[border > 0])
    bg = ndi.binary_dilation(bgc, structure=K3) & near  # (not "all near-white connected to it": that floods into the foam through its pale outline)
    for x0, y0, x1, y1 in hole_rects:
        zone = np.zeros_like(bg); zone[y0:y1, x0:x1] = True
        bg |= near & zone
    for zone in hole_masks:  # (bool masks: the pockets of background between hair strands, outside a head circle, ...)
        bg |= near & zone
    # edge ring: alpha from how far the pixel is from white towards the local darkest colour, colour = that pure colour
    fg = cv2.erode(a.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)
    d_fg, d_px = 253.0 - fg, 253.0 - a
    den = (d_fg ** 2).sum(axis=2)
    num = (d_px * d_fg).sum(axis=2)
    al_r = np.where(den > 3000, np.clip(num / np.maximum(den, 1.0), 0, 1), 1.0)
    dist = ndi.distance_transform_edt(~bg)
    ring = (~bg) & (dist <= 2.2)
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    rgb = a.copy()
    use = ring & (den > 3000)
    rgb[use] = fg[use]
    alpha[ring] = al_r[ring]
    alpha[alpha < 0.04] = 0.0
    return alpha, rgb


def bleed(rgb, alpha):
    """colour under transparent pixels = nearest opaque pixel (so texture filtering never blends in black or white)"""
    solid = alpha > 0.5
    idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    return rgb[idx[0], idx[1]]


def save_layer(name, rgb, alpha, mask=None, pad=3):
    """crop to the mask (or alpha) and write a straight-alpha RGBA png; returns {file, x, y, w, h} in source px"""
    al = alpha * (mask if mask is not None else 1.0)
    ys, xs = np.where(al > 0.02)
    x0, y0, x1, y1 = max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, al.shape[1]), min(ys.max() + pad + 1, al.shape[0])
    col = bleed(rgb, al)
    out = np.zeros(al.shape + (4,), np.uint8)
    out[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(al * 255 + 0.5, 0, 255).astype(np.uint8)
    out = out[y0:y1, x0:x1]
    Image.fromarray(out, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    return {'file': f'sp/{name}.png', 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}


def fit_circle(pts):
    x, y = pts[:, 0], pts[:, 1]
    c, *_ = np.linalg.lstsq(np.c_[2 * x, 2 * y, np.ones(len(x))], x ** 2 + y ** 2, rcond=None)
    return c[0], c[1], float(np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2))


def head_interior(a, skin_box, seed):
    """the face as one blob: skin-coloured pixels, closed over the eyes/stubble/mouth"""
    skin = med(a, *skin_box)
    sk = (np.abs(a - skin).max(axis=2) < 30).astype(np.uint8)
    closed = cv2.morphologyEx(sk, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    filled = ndi.binary_fill_holes(closed)
    lab, _ = ndi.label(filled)
    return lab == lab[seed[1], seed[0]], skin


def circle_of(comp, keep):
    cnts, _ = cv2.findContours(comp.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=len)[:, 0, :].astype(float)
    p = c[keep(c)]
    cx, cy, r = fit_circle(p)
    m = np.abs(np.hypot(p[:, 0] - cx, p[:, 1] - cy) - r) < 3
    return fit_circle(p[m])


def inpaint(rgb, mask, radius=4):
    m = ndi.binary_dilation(mask, structure=K3, iterations=2).astype(np.uint8) * 255
    return cv2.inpaint(np.clip(rgb, 0, 255).astype(np.uint8), m, radius, cv2.INPAINT_TELEA).astype(np.float32)


def flat(rgb, mask, colour):
    out = rgb.copy()
    out[ndi.binary_dilation(mask, structure=K3, iterations=2)] = colour
    return out


def ellipse_box(mask_comp):
    ys, xs = np.where(mask_comp)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def eyes_of(a, region, face=None):
    """the two eye whites: enclosed near-white blobs inside region (x0,y0,x1,y1) (and, when `face` is given, with their centre inside that mask: it
    keeps a white shirt or a white cap logo out), the two biggest, left one first. `lid` is the outline of the blob grown by 5 px (past the soft
    3 px drawn outline), which is what an eyelid has to cover."""
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    cand = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 3000 or xs.min() == 0 or ys.min() == 0 or xs.max() == a.shape[1] - 1 or ys.max() == a.shape[0] - 1: continue  # (the background touches the border)
        cx, cy = xs.mean(), ys.mean()
        if not (region[0] <= cx <= region[2] and region[1] <= cy <= region[3]): continue
        if face is not None and not face[int(cy), int(cx)]: continue
        cand.append((len(ys), i, xs, ys))
    cand.sort(key=lambda c: -c[0])
    out = []
    for _, i, xs, ys in cand[:2]:
        grown = ndi.binary_dilation(lab == i, structure=K3, iterations=5).astype(np.uint8)
        cnts, _ = cv2.findContours(grown, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = cv2.approxPolyDP(max(cnts, key=len), 0.8, True)[:, 0, :]
        out.append(dict(cx=float(xs.min() + xs.max() + 1) / 2, cy=float(ys.min() + ys.max() + 1) / 2, rx=float(xs.max() - xs.min() + 1) / 2 + 1.5, ry=float(ys.max() - ys.min() + 1) / 2 + 1.5, lid=[[int(x), int(y)] for x, y in c]))
    out.sort(key=lambda e: e['cx'])
    return out


def pupils_of(a, eyes):
    dark = a.max(axis=2) < 60
    res = []
    for e in eyes:
        x0, y0, x1, y1 = int(e['cx'] - e['rx']), int(e['cy'] - e['ry']), int(e['cx'] + e['rx']), int(e['cy'] + e['ry'])
        lab, k = ndi.label(dark[y0:y1, x0:x1])
        best = None
        for i in range(1, k + 1):
            ys, xs = np.where(lab == i)
            if len(ys) > 30 and (best is None or len(ys) > best[2]): best = (xs.mean() + x0, ys.mean() + y0, len(ys))
        res.append([round(float(best[0]), 1), round(float(best[1]), 1), round(float(np.sqrt(best[2] / np.pi)), 1)])
    return res


def eye_white(a, eye):
    return hexc(med(a, int(eye['cx']) - 15, int(eye['cy']) + 25, int(eye['cx']) + 5, int(eye['cy']) + 45))


def pupil_ink(a, pupil):
    return hexc(med(a, int(pupil[0]) - 2, int(pupil[1]) - 2, int(pupil[0]) + 3, int(pupil[1]) + 3))


def outline_colour(a, eye):
    t = np.linspace(0, 2 * np.pi, 360, endpoint=False)
    px = [a[int(round(eye['cy'] + (eye['ry'] - 1.5 + d) * np.sin(u))), int(round(eye['cx'] + (eye['rx'] - 1.5 + d) * np.cos(u)))] for u in t for d in (-1, 0, 1)]
    px = np.array(px)
    dark = px[np.argsort(px.sum(axis=1))[: len(px) // 4]]
    return hexc(np.median(dark, axis=0))


def ink_colour(rgb, alpha, mask):
    """the art's line colour: the darkest quarter of the pixels on the silhouette edge of a part"""
    a = (alpha * mask) > 0.9
    px = rgb[a & ~ndi.binary_erosion(a, iterations=2)]
    return hexc(np.median(px[np.argsort(px.sum(axis=1))[: len(px) // 4]], axis=0))


def draw_debug(name, a, rig):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGB')
    d = ImageDraw.Draw(im)
    for e in rig['eyes']:
        d.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0), width=2)
    for p in rig['pupils']:
        d.ellipse([p[0] - p[2], p[1] - p[2], p[0] + p[2], p[1] + p[2]], outline=(0, 160, 255), width=2)
    m = rig['mouth']
    d.rectangle([m['cx'] - m['w'] / 2, m['cy'] - 14, m['cx'] + m['w'] / 2, m['cy'] + 14], outline=(0, 200, 0), width=2)
    px, py = rig['pivot']
    d.line([px - 14, py, px + 14, py], fill=(255, 0, 255), width=3); d.line([px, py - 14, px, py + 14], fill=(255, 0, 255), width=3)
    c = rig['disc']
    d.ellipse([c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]], outline=(255, 160, 0), width=2)
    for b in rig.get('brows', []):
        d.line([(p[0], p[1]) for p in b], fill=(255, 0, 255), width=2)
    im.save(os.path.join(DBG, f'debug-{name}-rig.png'))


def put_together(name, a, layers, order):
    """the parts at rest over white, differenced against the original: should be black except where the face was retouched"""
    H, W, _ = a.shape
    canvas = np.full((H, W, 3), 255.0)
    for key in order:
        L = layers[key]
        im = np.array(Image.open(os.path.join(OUT, os.path.basename(L['file']))).convert('RGBA')).astype(np.float32)
        x, y, w, h = L['x'], L['y'], L['w'], L['h']
        al = im[..., 3:4] / 255.0
        canvas[y:y + h, x:x + w] = im[..., :3] * al + canvas[y:y + h, x:x + w] * (1 - al)
    Image.fromarray(canvas.astype(np.uint8)).save(os.path.join(DBG, f'debug-{name}-rest.png'))
    diff = np.abs(canvas - a).max(axis=2)
    Image.fromarray(np.clip(diff * 4, 0, 255).astype(np.uint8)).save(os.path.join(DBG, f'debug-{name}-diff.png'))
    mg = np.zeros((H, W, 3)); mg[...] = (255, 0, 255)
    for key in order:
        L = layers[key]
        im = np.array(Image.open(os.path.join(OUT, os.path.basename(L['file']))).convert('RGBA')).astype(np.float32)
        x, y, w, h = L['x'], L['y'], L['w'], L['h']
        al = im[..., 3:4] / 255.0
        mg[y:y + h, x:x + w] = im[..., :3] * al + mg[y:y + h, x:x + w] * (1 - al)
    Image.fromarray(mg.astype(np.uint8)).save(os.path.join(DBG, f'debug-{name}-magenta.png'))
    print(f'  {name}: put-back diff mean {diff.mean():.3f}, px over 40: {(diff > 40).sum()}')


# ---------------------------------------------------------------- Denise
def denise():
    a0 = load('denise-neutral-22')
    H, W, _ = a0.shape
    alpha, rgb = cutout(a0, hole_rects=[(180, 520, 600, 800)])
    yy, xx = np.mgrid[0:H, 0:W]

    interior, skin = head_interior(a0, (400, 310, 440, 335), (391, 330))
    cx, cy, r = circle_of(interior, lambda c: (c[:, 1] < 600) & (c[:, 1] > 330))
    eyes = eyes_of(a0, (250, 340, 530, 500))
    pupils = pupils_of(a0, eyes)
    print('  Denise face circle', round(cx, 1), round(cy, 1), round(r, 1), 'eyes', [(round(e['cx'], 1), round(e['cy'], 1), round(e['rx'], 1), round(e['ry'], 1)) for e in eyes], 'pupils', pupils)

    # the drawn brows and the drawn mouth are painted out (code draws them); brow = dark brown pixels above each eye
    dark = a0.max(axis=2) < 215
    brows, bm = [], np.zeros((H, W), bool)
    for x0, x1 in [(290, 378), (403, 497)]:
        zone = np.zeros((H, W), bool); zone[340:369, x0:x1] = True
        m = dark & zone
        lab, k = ndi.label(m)
        big = [i for i in range(1, k + 1) if (lab == i).sum() > 150]
        comp = np.isin(lab, big)
        wide = np.zeros((H, W), bool); wide[343:372, 283:505] = True
        tips = ndi.binary_dilation(comp, structure=K3, iterations=3) & wide & (np.abs(a0 - np.array([255., 225., 172.])).max(axis=2) > 10)  # the pale ends of the stroke
        bm |= comp | tips
        cols = np.where(comp.any(axis=0))[0]
        pts = []
        for x in cols[::4]:
            ys = np.where(comp[:, x])[0]
            pts.append([int(x), round(float(ys.mean()), 1), int(ys.max() - ys.min() + 1)])
        brows.append(pts)
    bpx = a0[bm]
    brow_col = hexc(np.median(bpx[np.argsort(bpx.sum(axis=1))[: len(bpx) // 3]], axis=0))
    mouth_m = np.zeros((H, W), bool); mouth_m[538:552, 368:410] = a0.max(axis=2)[538:552, 368:410] < 200
    ys, xs = np.where(mouth_m)
    mouth = dict(cx=float((xs.min() + xs.max() + 1) / 2), cy=float((ys.min() + ys.max() + 1) / 2), w=float(xs.max() - xs.min() + 1))
    face = hexc(skin)
    rgb_h = flat(rgb, bm | mouth_m, skin)  # Denise's face is one flat colour: no blending of hair into the patch

    Y_CUT, BAND, R_FILL = 602, 553, r + 4
    px, py = float(round(cx)), 604.0
    # HEAD: everything above the neck line (foam, hair, face)
    head_mask = (yy < Y_CUT).astype(np.float32)
    # BODY: everything from the band down, minus the face disc; the disc part is filled (hair behind the head, the neck column in neck shade)
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= R_FILL ** 2
    body_rgb = rgb.copy()
    band_disc = disc & (yy >= BAND) & (yy < Y_CUT + 1)
    neck_col = (xx >= px - 42) & (xx <= px + 42)
    body_rgb[band_disc] = med(a0, 280, 560, 330, 590)
    body_rgb[band_disc & neck_col] = med(a0, 365, 600, 415, 608)
    body_alpha = alpha.copy()
    body_alpha[band_disc] = 1.0
    body_mask = ((yy >= BAND) & ~(disc & ~band_disc)).astype(np.float32)
    body_mask[(yy < Y_CUT + 1) & disc & ~band_disc] = 0
    # (the disc above the band is not in the body at all; the band keeps the hair on both sides, which the head layer also has)
    L = {}
    L['body'] = save_layer('denise-body', body_rgb, body_alpha, body_mask)
    L['head'] = save_layer('denise-head', rgb_h, alpha, head_mask)
    rig = dict(
        pivot=[px, py], disc=[round(cx, 1), round(cy, 1), round(r, 1)], layers=L, eyes=eyes, pupils=pupils, mouth=mouth, brows=brows, browColour=brow_col, face=face, white=eye_white(a0, eyes[0]), pupilInk=pupil_ink(a0, pupils[0]),
        outline=outline_colour(a0, eyes[0]), ink=ink_colour(rgb, alpha, head_mask), hair=hexc(med(a0, 215, 560, 245, 600)), hairDark=hexc(med(a0, 280, 560, 330, 590)), towel=hexc(med(a0, 350, 800, 420, 900)),
    )
    draw_debug('denise', a0, rig)
    put_together('denise', a0, L, ['body', 'head'])
    return rig


# ---------------------------------------------------------------- Gary
def gary():
    a0 = load('gary-22')
    H, W, _ = a0.shape
    alpha, rgb = cutout(a0)
    yy, xx = np.mgrid[0:H, 0:W]
    interior, skin = head_interior(a0, (380, 250, 420, 290), (391, 300))
    cx, cy, r = circle_of(interior, lambda c: ~((c[:, 0] < 262) & (c[:, 1] > 380)) & ~((c[:, 0] > 520) & (c[:, 1] > 540)) & (c[:, 1] < 640))
    eyes = eyes_of(a0, (240, 320, 550, 500))
    pupils = pupils_of(a0, eyes)
    print('  Gary head circle', round(cx, 1), round(cy, 1), round(r, 1), 'eyes', [(round(e['cx'], 1), round(e['cy'], 1), round(e['rx'], 1), round(e['ry'], 1)) for e in eyes], 'pupils', pupils)

    # the drawn mouth (the dark lens above the hot-sauce drop) is painted out
    lens = np.zeros((H, W), bool)
    box = (slice(550, 569), slice(360, 430))
    sub = a0[box]
    lens[box] = (sub.max(axis=2) < 150) & ~((sub[..., 0] > 150) & (sub[..., 1] < 90))
    lens = ndi.binary_dilation(lens, structure=K3)
    lens[569:, :] = False
    ys, xs = np.where(lens)
    mouth = dict(cx=float((xs.min() + xs.max() + 1) / 2), cy=float((ys.min() + ys.max() + 1) / 2), w=float(xs.max() - xs.min() + 1))
    rgb_h = inpaint(rgb, lens)

    R_CUT = r + 6
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= R_CUT ** 2
    # FRONT: phone + hand + cuff, drawn over the head and fixed to the body. The polygon runs along the phone's top and right edge
    # (read off a 6x zoom), outside the tan shadow stripe beside it; the hand's fingers touch the cheek, so skin colour cannot split them.
    poly = Image.new('L', (W, H), 0)
    ImageDraw.Draw(poly).polygon([(56, 440), (116, 440), (155, 411), (172, 409), (181, 416), (189, 430), (199, 455), (209, 478), (217, 497), (224, 507), (232, 521), (240, 541),
                                  (248, 561), (256, 579), (260, 593), (263, 603), (263, 655), (56, 655)], fill=255)
    front = (np.array(poly) > 0) & (alpha > 0)
    # HEAD: the disc minus the front; the hole under the hand/phone is filled with skin so a small move shows no gap
    head_alpha = alpha.copy(); head_rgb = rgb_h.copy()
    hole = (((xx - cx) ** 2 + (yy - cy) ** 2) <= (r - 1) ** 2) & front  # only inside the true head, so no skin halo on the phone's edge
    head_rgb[hole] = skin; head_alpha[hole] = 1.0
    head_mask = ((disc & ~front) | hole).astype(np.float32)
    # BODY: everything outside the disc, plus hoodie grey behind the head's lower half
    body_rgb = rgb.copy(); body_alpha = alpha.copy()
    grey = med(a0, 300, 760, 360, 800)
    fill = ((xx - cx) ** 2 + (yy - cy) ** 2 <= (r + 1) ** 2) & (yy >= 540)
    body_rgb[fill] = grey; body_alpha[fill] = 1.0
    body_mask = (~(disc & ~fill)).astype(np.float32)
    L = {}
    L['body'] = save_layer('gary-body', body_rgb, body_alpha, body_mask)
    L['head'] = save_layer('gary-head', head_rgb, head_alpha, head_mask)
    L['hand'] = save_layer('gary-hand', rgb, alpha, front.astype(np.float32))
    px, py = float(round(cx)), 630.0
    rig = dict(
        pivot=[px, py], disc=[round(cx, 1), round(cy, 1), round(r, 1)], layers=L, eyes=eyes, pupils=pupils, mouth=mouth, face=hexc(skin), white=eye_white(a0, eyes[0]), pupilInk=pupil_ink(a0, pupils[0]),
        outline=outline_colour(a0, eyes[0]), ink=ink_colour(rgb, alpha, head_mask), hoodie=hexc(grey), sauce=hexc(med(a0, 398, 574, 402, 580)),
    )
    draw_debug('gary', a0, rig)
    put_together('gary', a0, L, ['body', 'head', 'hand'])
    return rig


def backgrounds():
    for n in ('bathroom', 'van'):
        Image.open(os.path.join(SRC, f'bg-{n}-21.png')).convert('RGB').save(os.path.join(OUT, f'bg-{n}.jpg'), quality=95)


if __name__ == '__main__':
    backgrounds()
    print('Denise'); d = denise()
    print('Gary'); g = gary()
    json.dump({'src': [768, 1344], 'denise': d, 'gary': g}, open(os.path.join(ROOT, 'src', 'sp-rig.json'), 'w'), indent=1)
    print('wrote src/sp-rig.json and public/sp/*.png')
