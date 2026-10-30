# Prep for "Tip?" (src/Tip.tsx, docs/x02-tip.md): cuts the Qwen pictures of out/sp-cast3 into puppet parts and props the way scripts/nv3-prep.py does for
# "Nobody Picks Up", and measures what the code needs (faces, mouths, brows, screens).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/tip-prep.py
# Writes public/sp/tip-*.png|jpg, src/tip-rig.json (px of the 768x1344 pictures, y down) and scratch/tip/* (debug overlays).
# A character with several poses (Denise: bottle, tap, phone, cash; the attendant: thumb at his chest) has ONE head, the master's, and a body per pose:
# every pose picture is registered to the master (a scale and a shift that put its head disc on the master's), its own head (hair and face) is cut away
# and the master's head goes on top, so that a pose change at a cut or mid-shot never changes the face.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, file))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


nvp = _load('nvp', 'nv3-prep.py')
spp = nvp.spp
fxp = _load('fxp', 'fx-prep.py')
ROOT, OUT, K3 = spp.ROOT, spp.OUT, spp.K3
SRC3 = os.path.join(ROOT, 'out', 'sp-cast3')
DBG = os.path.join(ROOT, 'scratch', 'tip')
os.makedirs(DBG, exist_ok=True)
hexc, med = spp.hexc, spp.med
PFX = 'tip'  # the file prefix of everything this module writes: scripts/because-prep.py reuses puppet(), prop() and the finders with its own SRC3, DBG and PFX


def load3(name):
    return np.array(Image.open(os.path.join(SRC3, name + '.png')).convert('RGB')).astype(np.float32)


# ------------------------------------------------------------------ finding the face
def find_eyes(a):
    """the pair of eye whites: two enclosed near-white blobs of about the same size side by side (they nearly touch), the pair with the most area near the top"""
    H, W, _ = a.shape
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 2500 or xs.min() == 0 or ys.min() == 0 or xs.max() == W - 1 or ys.max() == H - 1: continue
        blobs.append(dict(area=len(ys), cx=(xs.min() + xs.max() + 1) / 2, cy=(ys.min() + ys.max() + 1) / 2, rx=(xs.max() - xs.min() + 1) / 2, ry=(ys.max() - ys.min() + 1) / 2))
    best = None
    for p in range(len(blobs)):
        for q in range(p + 1, len(blobs)):
            A, B = blobs[p], blobs[q]
            if min(A['area'], B['area']) / max(A['area'], B['area']) < 0.55: continue
            if abs(A['cy'] - B['cy']) > 0.45 * max(A['ry'], B['ry']): continue
            if abs(A['cx'] - B['cx']) - A['rx'] - B['rx'] > 0.6 * max(A['rx'], B['rx']): continue
            sc = A['area'] + B['area'] - 30000 * A['cy'] / H
            if best is None or sc > best[0]: best = (sc, A, B)
    if best is None:  # the two whites have merged into one blob (no outline between them): split it in the middle
        for B in blobs:
            if 1.5 <= (2 * B['rx']) / (2 * B['ry']) <= 2.8 and B['cy'] < 0.5 * H:
                w, h = 2 * B['rx'], 2 * B['ry']
                return [dict(area=B['area'] // 2, cx=B['cx'] - w / 4, cy=B['cy'], rx=w / 4, ry=h / 2), dict(area=B['area'] // 2, cx=B['cx'] + w / 4, cy=B['cy'], rx=w / 4, ry=h / 2)]
        raise RuntimeError('no eyes found')
    return sorted([best[1], best[2]], key=lambda e: e['cx'])


def face_of(a):
    """(face blob, skin colour, eyes, disc) of a character picture: the skin-coloured blob that holds the eyes, closed over the eyes and mouth, and the circle fitted to its lower arc"""
    L, R = find_eyes(a)
    px, py = int(L['cx'] - 0.2 * L['rx']), int(L['cy'] + 1.25 * L['ry'])
    skin = med(a, px - 3, py - 3, px + 4, py + 4)
    sk = (np.abs(a - skin).max(axis=2) < 30).astype(np.uint8)
    closed = cv2.morphologyEx(sk, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    filled = ndi.binary_fill_holes(closed)
    lab, _ = ndi.label(filled)
    blob = lab == lab[py, px]
    cnts, _ = cv2.findContours(blob.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=len)[:, 0, :].astype(float)
    p = c[c[:, 1] > (L['cy'] + R['cy']) / 2 + 30]
    cx, cy, r = spp.fit_circle(p)
    m = np.abs(np.hypot(p[:, 0] - cx, p[:, 1] - cy) - r) < 3
    cx, cy, r = spp.fit_circle(p[m])
    return blob, skin, (L, R), (float(cx), float(cy), float(r))


def pupils_in(a, eyes, fallback):
    """the pupil of each eye: the dark hole inside its white blob (not the bbox: glasses frames and nose bridges stay out); [x, y, r] like spp.pupils_of"""
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    out = []
    for k, e in enumerate(eyes):
        best = None
        for i in range(1, n + 1):
            ys, xs = np.where(lab == i)
            if len(ys) < 2500: continue
            d = np.hypot((xs.min() + xs.max() + 1) / 2 - e['cx'], (ys.min() + ys.max() + 1) / 2 - e['cy'])
            if best is None or d < best[0]: best = (d, i)
        blob = lab == best[1]
        holes = ndi.binary_fill_holes(blob) & ~blob & (a.max(axis=2) < 110)
        hl, hn = ndi.label(holes)
        if hn == 0: out.append(fallback[k]); continue
        j = 1 + int(np.argmax(ndi.sum(holes, hl, range(1, hn + 1))))
        ys, xs = np.where(hl == j)
        out.append([round(float(xs.mean()), 1), round(float(ys.mean()), 1), round(float(np.sqrt(len(ys) / np.pi)), 1)])
    return out


def thin_dark(a, zone, thr, lo=20, hi=2500):
    """the drawn mouth (or a brow): dark pixels inside zone (x0, y0, x1, y1), components of lo..hi px; returns the mask"""
    x0, y0, x1, y1 = zone
    z = np.zeros(a.shape[:2], bool); z[y0:y1, x0:x1] = True
    dark = (a.max(axis=2) < thr) & z
    lab, k = ndi.label(dark, structure=np.ones((3, 3)))
    keep = [i for i in range(1, k + 1) if lo <= (lab == i).sum() <= hi]
    return np.isin(lab, keep)


def drop_specks(alpha, n):
    """alpha without its pieces smaller than n px: the pale tips of thin curls that no hair rule took are left floating in a pose's body"""
    lab, k = ndi.label(alpha > 0.02, structure=np.ones((3, 3)))
    small = [i + 1 for i, s in enumerate(ndi.sum(alpha > 0.02, lab, range(1, k + 1))) if s < n]
    return np.where(np.isin(lab, small), 0.0, alpha).astype(np.float32)


def hole_fill(rgb, alpha, hole, reach, smooth=False):
    """the pixels of `hole` within `reach` px of a solid pixel outside it (one that is not on the soft edge of the cut, and not an ink line: the nearest dark pixel would smear a black blob) take the colour
    of the nearest one (`smooth`: the average of the solid pixels round it, which has no blocks in it) and become solid: what the body holds behind a head that is cut out of it (a collar, a neck or hair
    next to the jaw shows in a gap the master's head does not cover)."""
    solid = ndi.binary_erosion((alpha > 0.5) & ~hole, structure=K3, iterations=2) & (rgb.max(axis=2) >= 90)
    d, (iy, ix) = ndi.distance_transform_edt(~solid, return_indices=True)
    fill = hole & (d <= reach)
    out, oa = rgb.copy(), alpha.copy()
    out[fill] = rgb[iy[fill], ix[fill]]
    if smooth:
        w = ndi.gaussian_filter(solid.astype(np.float32), reach / 4)
        for c in range(3): out[..., c] = np.where(fill, ndi.gaussian_filter(np.where(solid, rgb[..., c], 0.0), reach / 4) / np.maximum(w, 1e-4), out[..., c])
    oa[fill] = 1.0
    return out, oa


def fill_pinholes(rgb, alpha, n):
    """the holes of fewer than n px that the cut left inside a body (the specks along a white shoe's edge: pale pixels the flood fill took for background) are filled with the colour next to them"""
    solid = alpha > 0.5
    holes = ndi.binary_fill_holes(solid) & ~solid
    lab, k = ndi.label(holes)
    small = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(holes, lab, range(1, k + 1))) if v < n])
    out, oa = rgb.copy(), alpha.copy()
    out[small] = spp.bleed(rgb, alpha)[small]; oa[small] = 1.0
    return out, oa


def bbox_of(m):
    ys, xs = np.where(m)
    return dict(cx=float((xs.min() + xs.max() + 1) / 2), cy=float((ys.min() + ys.max() + 1) / 2), w=float(xs.max() - xs.min() + 1))


def brows_of(a, eyes, thr=70):
    """code brows from the drawn ones: per eye a polyline [x, y, thickness] every 4 px, and the mask of the drawn strokes"""
    H, W, _ = a.shape
    out, mask = [], np.zeros((H, W), bool)
    for k, e in enumerate(eyes):
        x0, x1 = (e['cx'] - 1.25 * e['rx'], e['cx'] + 0.8 * e['rx']) if k == 0 else (e['cx'] - 0.8 * e['rx'], e['cx'] + 1.25 * e['rx'])
        m = thin_dark(a, (int(x0), int(e['cy'] - 1.5 * e['ry']), int(x1), int(e['cy'] - 0.9 * e['ry'])), thr, lo=120)
        mask |= m
        cols = np.where(m.any(axis=0))[0]
        pts = []
        for x in cols[::4]:
            ys = np.where(m[:, x])[0]
            pts.append([int(x), round(float(ys.mean()), 1), int(ys.max() - ys.min() + 1)])
        out.append(pts)
    return out, mask


# ------------------------------------------------------------------ the cast
CAST = {
    # the hoodie with the bottle (the store) or without (the supermarket); v3: the green apron over the hoodie (behind the coffee shop's counter), neutral, and one arm out toward the terminal.
    # `apron`: the poses whose apron gets a name tag (measured below). The tap, phone and cash poses of v1 and v2 are not cut any more (their pictures stay in out/sp-cast3)
    'deniseHood': dict(master='denise-neutral-61', poses={'neutral': 'denise-neutral-61', 'bottle': 'denise-bottle-61', 'apron': 'denise-apron-61', 'apronOut': 'denise-apron-out-61'},
                       mouth=(350, 560, 435, 580, 190), mouthW=68, code_brows=True, hair='dark', apron=('apron', 'apronOut'), keep={'bottle': [(30, 470, 180, 660)]}),
    'kyle': dict(master='kyle-73', mouth=(345, 472, 420, 490, 190), mouthW=72),
    # v3: Kyle as a customer: the same head (the master's), a body in a puffy jacket over the polo, one water bottle up (a puppet of its own so that the staff Kyle's cut stays as it was)
    # `keep`: boxes (x0, y0, x1, y1) of a registered pose picture that are never taken for hair (the hand with the bottle)
    'kyleJ': dict(master='kyle-73', poses={'jacket': 'kyle-jacket-74'}, mouth=(345, 472, 420, 490, 190), mouthW=72, hair='dark', keep={'jacket': [(30, 330, 290, 680)]}),
    'attendant': dict(master='attendant-stand-72', poses={'stand': 'attendant-stand-72', 'me': 'attendant-me-72'}, mouth=(352, 493, 428, 503, 190), mouthW=62, protect=True, hair='grey'),
    'lineA': dict(master='line-a-71', mouth=(350, 636, 420, 650, 150), mouthW=64, mouth_lo=30),
    'lineB': dict(master='line-b-71', mouth=(350, 476, 440, 498, 190), mouthW=70),
    'lineC': dict(master='line-c-71', mouth=(360, 606, 436, 626, 190), mouthW=66, no_blink=True),
    'lineD': dict(master='line-d-71', mouth=(340, 412, 404, 432, 215), mouthW=54),
}


# numbers read off the set pictures (2x zooms with a grid: scratch/tip/g-*.png)
SCENES = {
    'store': dict(counterTop=750, counterFront=800, floor=1100),  # bg-store: the counter's back edge, the brown front and the floor
    'fridges': dict(floor=890, counter=[[0, 715], [122, 700], [122, 740], [100, 1000], [0, 1230]]),  # bg-store-fridges: the cashier's counter at the left edge
    'selfcheck': dict(sign=[250, 305, 495, 400], vanish=[360, 640]),  # the hanging sign (blank: "SELF-CHECKOUT" is drawn) and the vanishing point of the aisle
    # v3: the coffee shop. cafe: the counter plate (the light wood top's back edge, the lip, the floor, the chalkboard's dark area); cafeWide: the flat wide plate (the counter's front panel to cut as a
    # foreground strip, the doorway's outer frame and its opening, the chalkboard, the table that stands in front of the doorway's right half)
    'cafe': dict(counterTop=754, lip=803, front=826, floor=1140, chalk=[177, 255, 538, 492]),
    'cafeWide': dict(counter=[8, 771, 427, 969], frame=[470, 515, 644, 911], door=[494, 539, 614, 911], chalk=[185, 385, 418, 577], tableLeft=533),
}


def disc_mask(shape, c, r):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return (xx - c[0]) ** 2 + (yy - c[1]) ** 2 <= r ** 2


def register(a, disc_a, disc_m, k=1.0, shift=(0, 0)):
    """the picture `a` scaled and shifted so that its head disc lands on the master's (white where nothing was); `k` and `shift` move it from there (see refit)"""
    s = k * disc_m[2] / disc_a[2]
    M = np.array([[s, 0, disc_m[0] - s * disc_a[0] + shift[0]], [0, s, disc_m[1] - s * disc_a[1] + shift[1]]], np.float32)
    out = cv2.warpAffine(a, M, (a.shape[1], a.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
    return np.clip(out, 0, 255)


def refit(blob_a, disc_a, disc_m, face_m):
    """for a head that is not round the circle of the lower arc is a poor guide: the scale (x0.92 to x1.08) and the shift (12 px across, 20 px up or down) of register() that make the face blob of the
    picture, from the cheeks to the chin line, differ least from the master's; returns k and shift for register()"""
    cx, cy, r = disc_m
    y0, y1 = int(cy + 0.15 * r), int(cy + r)
    target = face_m[y0:y1]
    s0 = r / disc_a[2]
    best = None
    for k in np.arange(0.92, 1.081, 0.01):
        for dx in range(-12, 13, 2):
            for dy in range(-20, 21, 2):
                s = k * s0
                M = np.array([[s, 0, cx - s * disc_a[0] + dx], [0, s, cy - s * disc_a[1] + dy - y0]], np.float32)
                w = cv2.warpAffine(blob_a.astype(np.uint8), M, (blob_a.shape[1], y1 - y0), flags=cv2.INTER_NEAREST) > 0
                c = (w ^ target).sum()
                if best is None or c < best[0]: best = (c, float(k), (dx, dy))
    return best[1], best[2]


def gold_hoops(a, disc):
    """Rhonda's gold hoop earrings: the gold ring (red over green over blue, not skin) that hangs beside the face from just above the ear to below the jaw"""
    cx, cy, r = disc
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    return (a[..., 0] > 150) & (a[..., 1] > 95) & (a[..., 2] < 120) & (a[..., 1] - a[..., 2] > 40) & (np.abs(np.abs(xx - cx) - 1.2 * r) < 0.45 * r) & (yy > cy - 0.1 * r) & (yy < cy + 0.9 * r)


def head_pix(a, face, disc, how, limit=None):
    """what the head sprite holds: the face blob (skin, closed over the eyes, mouth, moustache and ears) and the hair, each grown by 3 px to take the ink line with it.
    The hair rule: brown (red over blue) for Denise, whose hoodie is grey and whose jeans are blue; grey for the attendant, whose vest is blue and shirt white;
    red for Rhonda (red far over green, down to the last curl; her gold hoops are taken whole); black for Brandon (black, but not the dark blue of the folds of his suit). `how` can be a tuple of rules:
    what any of them takes (the clerk: brown hair and the black arms of his glasses). `limit`: no hair below this row (a pose's body keeps the hair that hangs below the master's head)"""
    if isinstance(how, tuple): return np.maximum.reduce([head_pix(a, face, disc, h, limit) for h in how])
    cx, cy, r = disc
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    whole = np.zeros((H, W), bool)  # what is taken whatever the rows are
    if how == 'dark':
        rows = yy < cy + 0.85 * r
        top = np.zeros((H, W), bool); top[max(0, int(cy - 1.3 * r)):int(cy - 0.7 * r), int(cx - 0.8 * r):int(cx + 0.8 * r)] = True
        sample = a[top & (a.max(axis=2) < 150) & (a[..., 0] - a[..., 2] > 12)]
        col = np.median(sample, axis=0) if len(sample) else np.array([84., 58., 33.])
        m = (np.abs(a - col).max(axis=2) < 48) & (a[..., 0] - a[..., 2] > 14) & rows  # (the hoodie's dark grey outlines are not hair)
    elif how == 'red':
        rows = np.ones((H, W), bool)
        m = (a[..., 0] - a[..., 1] > 70) & (a[..., 0] > 90) & (np.abs(xx - cx) < 3.4 * r)
        whole = gold_hoops(a, disc)
    elif how == 'black':
        rows = yy < cy + 0.35 * r
        m = (a.max(axis=2) < 100) & (a[..., 2] - a[..., 0] < 40) & (np.abs(xx - cx) < 1.3 * r)
    else:  # 'grey'
        rows = yy < cy + 0.35 * r
        g = (np.abs(a[..., 0] - a[..., 1]) < 14) & (np.abs(a[..., 1] - a[..., 2]) < 16) & (a[..., 1] > 55) & (a[..., 1] < 215)
        m = g & rows & (np.abs(xx - cx) < 1.3 * r)
    if limit is not None: rows = rows & (yy < limit)
    hair = (ndi.binary_dilation(m, structure=K3, iterations=3) & rows) | ndi.binary_dilation(whole, structure=K3, iterations=3)
    return hair | ndi.binary_dilation(face, structure=K3, iterations=3)


def puppet(key, cfg):
    master = load3(cfg['master'])
    H, W, _ = master.shape
    yy, xx = np.mgrid[0:H, 0:W]
    face_m, skin, (EL, ER), disc = face_of(master)
    cx, cy, r = disc
    oval = cfg.get('oval')  # a head that is not round (the hostess, Brandon, Rhonda's big hair): see face_in, tidy, chin_cut, band_of, refit and hole_fill
    chin = cy + r
    # the background pockets that hair strands close in: near-white pixels outside the head circle and above the chin are background
    face_in = ndi.binary_dilation(face_m, structure=K3, iterations=3) if oval else np.zeros((H, W), bool)  # `oval`: a face that is not a circle (the hostess's eyes reach out of the fitted one): what is inside it is never background
    pocket = ~disc_mask((H, W), (cx, cy), r * 1.015) & (yy < cy + r - 2) & (np.abs(xx - cx) < 1.3 * r) & ~face_in  # (not further out: a bottle or a hand beside the head must keep its whites)
    if oval and 'hair' in cfg: pocket &= ndi.binary_dilation(head_pix(master, np.zeros((H, W), bool), disc, cfg['hair']), structure=K3, iterations=8)  # (an oval head is narrower than the circle: its collar is outside it, so only what is near the hair counts)
    def tidy(alpha, a, face, boxes):
        """`oval`: the near-white pixels in a ring 2-7 px outside the face (down to 0.78 r under its centre: below that are a necklace and a collar) are the halo that the flood fill leaves along an outline, and `boxes` are pockets that the outlines shut in
        (master_holes, pose_holes: x0, y0, x1, y1 of the picture whose near-white is background): both are made transparent"""
        alpha = alpha.copy()
        if oval: alpha[ndi.binary_dilation(face, structure=K3, iterations=7) & ~ndi.binary_dilation(face, structure=K3, iterations=2) & (yy < cy + 0.78 * r) & (a.min(axis=2) >= 232)] = 0.0
        for x0, y0, x1, y1 in boxes: alpha[y0:y1, x0:x1][a[y0:y1, x0:x1].min(axis=2) >= 238] = 0.0
        return alpha
    alpha_m, rgb_m = nvp.cut(master, cfg.get('protect', False), cfg.get('holes', ()), (pocket,) + tuple(m(master, disc) for m in cfg.get('pockets', ())))  # `pockets`: functions (picture, head circle) -> mask of more background pockets (Rhonda's curls)
    for x0, y0, x1, y1 in cfg.get('protect_boxes', ()):  # a white body inside such a box (Rhonda's cup lid) that the flood fill leaked into is put back (the inside of the texture mask, 2 px shrunk)
        back = (alpha_m < 1) & ndi.binary_erosion(nvp.texture_mask(master), structure=K3, iterations=2)
        sel = np.zeros_like(back); sel[y0:y1, x0:x1] = True
        alpha_m = np.where(back & sel, 1.0, alpha_m).astype(np.float32)
    # flecks of the white background left between and beside hair strands: pale pixels outside the face are not part of the head
    def de_fleck(alpha, a):
        fleck = (alpha > 0) & (a.min(axis=2) >= cfg.get('fleck_min', 228)) & ~disc_mask((H, W), (cx, cy), r * 1.01) & (yy < cfg.get('fleck_y', cy + r)) & (np.abs(xx - cx) < cfg.get('fleck_x', 1.7) * r) & (np.abs(xx - cx) >= cfg.get('fleck_xmin', 0) * r) & ~face_in
        for x0, y0, x1, y1 in cfg.get('apart', ()): fleck[y0:y1, x0:x1] = False  # (not in a box that belongs to the body: Rhonda's white cup lid)
        return np.where(fleck, 0.0, alpha).astype(np.float32)
    alpha_m = tidy(de_fleck(alpha_m, master), master, face_m, cfg.get('master_holes', ()))
    eyes = spp.eyes_of(master, (0, 0, W, H), face_m)
    pupils = pupils_in(master, eyes, spp.pupils_of(master, eyes))
    x0, y0, x1, y1, thr = cfg['mouth']
    mm = thin_dark(master, (x0, y0, x1, y1), thr, lo=cfg.get('mouth_lo', 20))
    if not mm.any(): raise RuntimeError(f'{key}: no drawn mouth found in the zone {cfg["mouth"]}')
    mouth = bbox_of(mm)
    paint = mm.copy()
    brows = None
    if cfg.get('code_brows'):
        brows, bmask = brows_of(master, eyes)
        paint |= bmask
        bpx = master[bmask]
        browc = hexc(np.median(bpx[np.argsort(bpx.sum(axis=1))[: max(1, len(bpx) // 3)]], axis=0))
    rgb_h = spp.flat(rgb_m, paint, skin)
    Y_CUT = int(round(chin)) + 6
    BAND = Y_CUT - 50
    px, py = float(round(cx)), float(Y_CUT)
    R_FILL = r + cfg.get('fill_pad', 4)  # (a head whose jaw is narrower than its fitted circle shows the fill's corners: Because's cashier takes a smaller one)
    disc_fill = (xx - cx) ** 2 + (yy - cy) ** 2 <= R_FILL ** 2
    band_disc = disc_fill & (yy >= BAND) & (yy < Y_CUT + 9)  # (the face cut away from a pose body reaches 6 px below the chin line)

    def chin_cut(face):  # `oval`: the face down to the chin line; the neck, a collar or a necklace below it are each pose's own (the neck of one picture is not the neck of another)
        return face & (yy < chin) if oval else face

    def band_of(face):  # what a single body is filled with behind the chin: the disc, or (`oval`: a jaw narrower than the circle shows the disc's corners) the face itself
        return ndi.binary_dilation(chin_cut(face), structure=K3, iterations=3) & (yy >= BAND) & (yy < Y_CUT + 9) if oval else band_disc
    multi = 'poses' in cfg
    if multi:
        # mask mode: the head sprite is ONLY the head (hair and face), so that no piece of the master's clothes sits over a pose's own and shows a seam
        HM = head_pix(master, chin_cut(face_m), disc, cfg['hair'])
        L = {'head': spp.save_layer(f'{PFX}-{key}-head', rgb_h, alpha_m * HM.astype(np.float32), None)}
    else:
        apart = np.zeros((H, W), bool)
        for x0, y0, x1, y1 in cfg.get('apart', ()): apart[y0:y1, x0:x1] = True  # boxes that belong to the body only (Rhonda's cup: its lid starts above the neck cut and must not tilt with the head)
        core = cfg['tail'](master, disc) if 'tail' in cfg else np.zeros((H, W), bool)  # `tail`: function (picture, head circle) -> the pixels of a strand that hangs from the head over the body (guest3's ponytail and bow): it is cut whole into the body, so that no tilt of the head splits it
        tail = ndi.binary_dilation(core, structure=K3, iterations=2) & ~ndi.binary_dilation(face_m, structure=K3, iterations=4)  # (with the ink line round it, but not the face's)
        L = {'head': spp.save_layer(f'{PFX}-{key}-head', rgb_h, alpha_m, ((yy < Y_CUT) & ~apart & ~tail).astype(np.float32))}
    bodies, tags = {}, {}
    poses = cfg.get('poses') or {'body': cfg['master']}
    for pname, pfile in poses.items():
        if pfile == cfg['master']:
            a_p, alpha_p, rgb_p, face_p = master, alpha_m, rgb_m, face_m
        else:
            a0 = load3(pfile)
            blob0, _, _, d_p = face_of(a0)
            a_p = register(a0, d_p, disc, *(refit(blob0, d_p, disc, face_m) if oval else ()))
            for f in cfg.get('repaint', ()): a_p = f(a_p, disc)  # `repaint`: functions (picture, head circle) -> the picture with something painted out (Rhonda's hoops, which her head has)
            alpha_p, rgb_p = nvp.cut(a_p, cfg.get('protect', False), cfg.get('holes', ()), (pocket,) + tuple(m(a_p, disc) for m in cfg.get('pockets', ())))
            face_p = face_of(a_p)[0]
        alpha_p = tidy(de_fleck(alpha_p, a_p) if cfg.get('fleck_poses') else alpha_p, a_p, face_p, cfg.get('pose_holes', {}).get(pname, ()))  # `fleck_poses`: the pose pictures have the same specks beside the hair (not for Rhonda: her cans are as pale as the specks)
        if pname in cfg.get('apron', ()):  # the bib of the green apron: its top edge (the first row wider than the straps) and the middle of its width, in the master's px
            g = (a_p[..., 1] - a_p[..., 0] > 45) & (a_p[..., 1] - a_p[..., 2] > 45)
            wid = g.sum(axis=1)
            top = int(np.argmax(wid > 150))
            cols = np.where(g[top + 12:top + 50].any(axis=0))[0]
            tags[pname] = dict(x=round(float(cols.mean()), 1), top=top, w=int(wid[top + 30]))
        if multi:
            HP = head_pix(a_p, chin_cut(face_p), disc, cfg['hair'], cy + cfg['hair_body'] * r if 'hair_body' in cfg else None)
            for x0, y0, x1, y1 in cfg.get('keep', {}).get(pname, ()):  # the dark outline of a hand that the hair rule took by mistake leaves square pinholes between the fingers and the bottle
                HP[y0:y1, x0:x1] = False
            keep_pale = (a_p.min(axis=2) >= 200) & ~chin_cut(face_p) if oval else np.zeros((H, W), bool)  # `oval`: a pearl or a collar next to the jaw is not part of the head: the 3 px ring takes only its ink, not its white
            HP &= ~keep_pale
            al = alpha_p * (~HP).astype(np.float32)
            if cfg.get('specks'): al = drop_specks(al, cfg['specks'])
            if cfg.get('thin'):  # `thin`: lines thinner than 2 * thin + 1 px that hang in the air next to the master's head (the grey arc of Brandon's own jaw, left of the cut) are dropped
                solid = al > 0.5
                keep = ndi.binary_opening(solid, structure=K3, iterations=cfg['thin'])
                gone = solid & ~keep & disc_mask((H, W), (cx, cy), 1.5 * r)
                al = np.where(ndi.binary_dilation(gone, structure=K3, iterations=3) & ~keep, 0.0, al).astype(np.float32)
            if oval: body_rgb, body_alpha = hole_fill(rgb_p, al, ndi.binary_dilation(chin_cut(face_p), structure=K3, iterations=3) & (alpha_p > 0.5) & ~keep_pale & ndi.binary_dilation(chin_cut(face_m), structure=K3, iterations=40), cfg.get('fill_reach', 24))  # (filled only near the master's head; a gap next to it would show the background)
            elif cfg.get('nearest'): body_rgb, body_alpha = hole_fill(rgb_p, al, (band_disc | (ndi.binary_dilation(face_p, structure=K3, iterations=3) & (yy >= cy + 0.45 * r) & ndi.binary_dilation(face_m, structure=K3, iterations=22))) & (al < 0.5), cfg['nearest'], True)  # `nearest`: the hole behind the head (and the slivers round the master's face that its outline does not cover) is filled with the smoothed colours round it (px of reach), not column by column: no streaks where a drawstring or a fold is under a column
            else: body_rgb, body_alpha = nvp.column_fill(rgb_p, al, band_disc & (al < 0.5), Y_CUT + 10)
            near_head = disc_mask((H, W), (cx, cy), 1.4 * r)  # thin channels where hair strands crossed the clothes: closed, with the colour of what is next to them
            closed = ndi.binary_closing(body_alpha > 0.5, structure=K3, iterations=3) & near_head & (body_alpha <= 0.5)
            body_rgb = np.where(closed[..., None], spp.bleed(body_rgb, body_alpha), body_rgb)
            body_alpha = np.where(closed, 1.0, body_alpha).astype(np.float32)
            bmask = np.ones((H, W), np.float32)
        else:
            body_rgb, body_alpha = nvp.column_fill(rgb_p, alpha_p, band_of(face_p) & ((alpha_p > 0.5) | (not oval)), Y_CUT + 10)
            bmask = ((yy >= BAND) & ~(disc_fill & ~band_disc)).astype(np.float32)
            bmask[(yy < Y_CUT + 1) & disc_fill & ~band_disc] = 0
            bmask[tail] = 1.0
            if core.any():  # the end of the strand that goes behind the face is carried on 10 px under the face (the head hides it) in its own colours, so that a head that tilts opens no gap beside it
                under = ndi.binary_dilation(core, structure=K3, iterations=10) & ndi.binary_dilation(face_m, structure=K3, iterations=2) & ~core
                iy, ix = ndi.distance_transform_edt(~core, return_indices=True)[1]
                body_rgb = np.where(under[..., None], body_rgb[iy, ix], body_rgb); body_alpha = np.where(under, 1.0, body_alpha).astype(np.float32); bmask[under | core] = 1.0  # (the whole strand is in the body, also the pixels the head has too where it touches the face)
        if cfg.get('pinholes'): body_rgb, body_alpha = fill_pinholes(body_rgb, body_alpha, cfg['pinholes'])  # `pinholes`: see fill_pinholes
        name = f'{PFX}-{key}-body' + ('' if not multi else '-' + pname)
        bodies[pname] = spp.save_layer(name, body_rgb, body_alpha, bmask)
    L['body'] = bodies[next(iter(bodies))]
    rig = dict(pivot=[px, py], disc=[round(cx, 1), round(cy, 1), round(r, 1)], layers=L, eyes=eyes, pupils=pupils, mouth=mouth, mouthW=cfg['mouthW'], face=hexc(skin),
               white=spp.eye_white(master, eyes[0]), pupilInk=spp.pupil_ink(master, pupils[0]), outline=spp.outline_colour(master, eyes[0]), ink=spp.ink_colour(rgb_m, alpha_m, (yy < Y_CUT).astype(np.float32)))
    if multi: rig['bodies'] = bodies
    if tags: rig['tags'] = tags
    if cfg.get('no_blink'): rig['noBlink'] = True
    if brows: rig['brows'] = brows; rig['browColour'] = browc
    print(f'  {key}: disc {cx:.0f} {cy:.0f} r {r:.0f}, chin {chin:.0f}, eyes', [(round(e["cx"]), round(e["cy"])) for e in eyes], 'pupils', pupils, 'mouth', {k: round(v) for k, v in mouth.items()}, 'bodies', list(bodies))
    return rig, master, dict(poses=poses, disc=disc, skin=skin)


def debug_sheet(rigs):
    tiles = []
    for key, rig in rigs.items():
        names = list(rig.get('bodies', {'': 0}).keys())
        for pn in names:
            ims = []
            for lk in ('body', 'head'):
                L = rig['bodies'][pn] if (lk == 'body' and 'bodies' in rig) else rig['layers'][lk]
                ims.append((L, Image.open(os.path.join(OUT, os.path.basename(L['file']))).convert('RGBA')))
            bg = Image.new('RGBA', (768, 1344), (255, 0, 255, 255))
            for L, im in ims:
                bg.alpha_composite(im, (L['x'], L['y']))
            d = ImageDraw.Draw(bg)
            for e in rig['eyes']: d.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0, 255), width=2)
            for q in rig['pupils']: d.ellipse([q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]], outline=(0, 160, 255, 255), width=2)
            m = rig['mouth']; d.rectangle([m['cx'] - m['w'] / 2, m['cy'] - 10, m['cx'] + m['w'] / 2, m['cy'] + 10], outline=(0, 255, 0, 255), width=2)
            px, py = rig['pivot']; d.line([px - 14, py, px + 14, py], fill=(255, 255, 0, 255), width=3)
            c = rig['disc']; d.ellipse([c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]], outline=(255, 160, 0, 255), width=2)
            for b in rig.get('brows', []): d.line([(p[0], p[1]) for p in b], fill=(0, 255, 255, 255), width=2)
            tiles.append((f'{key} {pn}', bg.convert('RGB').resize((300, 525), Image.LANCZOS)))
    cols = min(len(tiles), 7)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 306 + 6, rows * 549 + 6), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        x, y = 6 + (i % cols) * 306, 6 + (i // cols) * 549
        sheet.paste(im, (x, y + 22)); d.text((x + 3, y + 4), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'cast-sheet.jpg'), quality=88)


# ------------------------------------------------------------------ props and sets
def save_png(name, im):
    im.save(os.path.join(OUT, f'{PFX}-{name}.png'), optimize=True)
    return f'sp/{PFX}-{name}.png'


def prop(name, pic, protect=False, holes=(), drop=None, pad=4, keep_big=0, fix=None):
    """a prop cut like the cast: flood fill of the white (the texture mask keeps a white body), `drop(a)` removes what is not the prop (a wooden board); the layer is cropped,
    its offset is in px of the source picture"""
    a = load3(pic)
    alpha, rgb = nvp.cut(a, protect, holes)
    if drop is not None: alpha = alpha * (~drop(a)).astype(np.float32)
    if keep_big:  # specks and left-over feet of what was dropped
        lab, k = ndi.label(alpha > 0.5, structure=np.ones((3, 3)))
        big = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(alpha > 0.5, lab, range(1, k + 1))) if v >= keep_big])
        alpha = alpha * big
    if fix is not None: alpha = fix(a, alpha)
    im, off = fxp.layer(rgb, alpha, pad)
    return dict(file=save_png(name, im), w=im.size[0], h=im.size[1], ox=off[0], oy=off[1]), alpha


def glass(pic, thr, opening=21):
    a = load3(pic)
    dark = (a.max(axis=2) < thr).astype(np.uint8)
    op = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((opening, opening), np.uint8))
    lab, k = ndi.label(op)
    m = ndi.binary_fill_holes(lab == (1 + int(np.argmax(ndi.sum(op, lab, range(1, k + 1))))))
    m = ndi.binary_dilation(m, iterations=opening // 2) & (dark > 0)
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def jar():
    """v3's tip jar (a clear glass jar, a black lid with a slot, a blank label, two gold coins): the silhouette is the closed outline of the jar, the glass is a thin white veil
    (alpha 0.22, so the counter shows through), the outline, the lid, the label and the coins are opaque; the outline is redrawn in the ink colour. The label's text is drawn in code
    over `label` (layer px: the paper, which the code covers with clean white)"""
    a = load3('tip-jar-71')
    H, W, _ = a.shape
    mark = ndi.binary_closing(a.min(axis=2) < 244, np.ones((5, 5), bool), iterations=2)
    lab, n = ndi.label(ndi.binary_fill_holes(mark))
    sil = lab == (1 + int(np.argmax(ndi.sum(lab > 0, lab, range(1, n + 1)))))
    lid = ndi.binary_opening(a.max(axis=2) < 70, np.ones((5, 5), bool)) & sil
    gold = (a[..., 0] > 150) & (a[..., 1] > 110) & (a[..., 2] < 120) & (a[..., 0] - a[..., 2] > 70) & sil
    pale = (a.min(axis=2) >= 222) & (a.min(axis=2) < 246) & sil & ~lid  # the label is a flat pale grey-white; the glass is brighter
    pl, pn = ndi.label(ndi.binary_opening(pale, np.ones((9, 9), bool)))
    big = pl == (1 + int(np.argmax(ndi.sum(pale, pl, range(1, pn + 1)))))
    ys, xs = np.where(big)
    label = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    gold = ndi.binary_dilation(gold, np.ones((3, 3), bool), iterations=3) & sil  # (the coins' milled edges are paler than the gold: grown so that no jagged veil is left round them)
    edge = sil & ~ndi.binary_erosion(sil, np.ones((3, 3), bool), iterations=4)
    keep = lid | gold | big | edge
    alpha = np.where(sil, np.where(keep, 1.0, 0.24), 0.0).astype(np.float32)
    rgb = a.copy()
    rgb[sil & ~keep] = 255
    rgb[edge & ~lid] = (62, 74, 86)
    for hx0, hx1, hy0, hy1 in ((164, 180, 430, 985), (164, 172, 1010, 1062)):  # two slim glints down the left of the glass, so that it reads as glass and not as a tinted blob
        gl = np.zeros((H, W), bool); gl[hy0:hy1, hx0:hx1] = True
        gl &= sil & ~keep
        alpha[gl] = 0.62
    ys, xs = np.where(alpha > 0.02)  # (not fxp.layer: its bleed would paint the veil of the glass with the colours of the nearest opaque pixels; here the whole silhouette counts as solid)
    x0, y0, x1, y1 = max(xs.min() - 4, 0), max(ys.min() - 4, 0), min(xs.max() + 5, W), min(ys.max() + 5, H)
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = np.clip(spp.bleed(rgb, sil.astype(np.float32)), 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    im, off = Image.fromarray(out[y0:y1, x0:x1], 'RGBA'), (int(x0), int(y0))
    layer = dict(file=save_png('jar', im), w=im.size[0], h=im.size[1], ox=off[0], oy=off[1])
    layer['label'] = [label[0] - off[0], label[1] - off[1], label[2] - off[0], label[3] - off[1]]
    print('  jar', layer)
    return layer


def props_and_sets():
    out = {}
    # the sets as jpgs (the pictures as painted)
    for n, f in (('store', 'bg-store-71'), ('fridges', 'bg-store-fridges-71'), ('selfcheck', 'bg-selfcheck-71')):
        Image.open(os.path.join(SRC3, f + '.png')).convert('RGB').save(os.path.join(OUT, f'tip-bg-{n}.jpg'), quality=95)
    # the card terminal on its swivel: the glass is the big dark rounded rectangle; the coil runs off the bottom of the picture (the pivot of the swing)
    t, _ = prop('terminal', 'terminal-71')
    g = glass('terminal-71', 36)
    t['screen'] = [g[0] - t['ox'], g[1] - t['oy'], g[2] - t['ox'], g[3] - t['oy']]
    t['pivot'] = [380 - t['ox'], 1343 - t['oy']]
    out['terminal'] = t
    # the self-checkout kiosk: front view, the pole and bulb on top; the screen is dark grey in a pale bezel; the bulb is drawn (red) over the painted one
    k, _ = prop('kiosk', 'kiosk-71', protect=True)
    g = glass('kiosk-71', 85)
    k['screen'] = [g[0] - k['ox'], g[1] - k['oy'], g[2] - k['ox'], g[3] - k['oy']]
    k['bulb'] = [412 - k['ox'], 62 - k['oy'], 27]
    out['kiosk'] = k
    for n, pic in (('bag', 'bag-71'), ('hand', 'hand-point-71')):  # the grocery bag on the kiosk's shelf; the pointing hand in the hoodie's sleeve
        out[n], _ = prop(n, pic, protect=(n == 'bag'))
    # the counter of the corner store as a foreground strip: Kyle stands behind it
    a = load3('bg-store-71')
    strip = np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[750:]
    out['stripStore'] = dict(file=save_png('fg-store', Image.fromarray(strip.astype(np.uint8), 'RGBA')), y0=750)
    # v3: the coffee shop. The two plates as jpgs; the counter plate's counter and floor as a foreground strip (the barista stands behind it), the wide plate's counter front as a
    # cut of its own (the floor to the right of it is where Kyle walks); the tip jar and the hand in the jacket's sleeve (its fingertip, the topmost opaque point, is measured)
    for n, f in (('cafe', 'bg-cafe-71'), ('cafeWide', 'bg-cafe-wide2-73')):
        Image.open(os.path.join(SRC3, f + '.png')).convert('RGB').save(os.path.join(OUT, f'tip-bg-{n}.jpg'), quality=95)
    a = load3('bg-cafe-71')
    y0 = SCENES['cafe']['counterTop']
    out['stripCafe'] = dict(file=save_png('fg-cafe', Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[y0:].astype(np.uint8), 'RGBA')), y0=y0)
    a = load3('bg-cafe-wide2-73')
    cx0, cy0, cx1, cy1 = SCENES['cafeWide']['counter']
    out['counterCafe'] = dict(file=save_png('fg-cafe-counter', Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[cy0:cy1, cx0:cx1].astype(np.uint8), 'RGBA')), x0=cx0, y0=cy0, w=cx1 - cx0, h=cy1 - cy0)
    out['jar'] = jar()
    out['handJ'], _ = prop('handJ', 'hand-jacket-71')
    al = np.array(Image.open(os.path.join(OUT, 'tip-handJ.png')))[..., 3]
    ty = int(np.where(al > 128)[0].min())
    out['handJ']['tip'] = [round(float(np.where(al[ty:ty + 3] > 128)[1].mean()), 1), float(ty)]
    return out


if __name__ == '__main__':
    only = sys.argv[1:]
    rigs = {}
    for key, cfg in CAST.items():
        if only and key not in only: continue
        try:
            rigs[key] = puppet(key, cfg)[0]
        except Exception as e:  # keep going: the debug sheet shows what did work
            print('  FAILED', key, e)
    debug_sheet(rigs)
    extra = {} if only else {'props': props_and_sets(), 'scenes': SCENES}
    json.dump({'src': [768, 1344], **rigs, **extra}, open(os.path.join(ROOT, 'src', 'tip-rig.json' if not only else 'tip-rig-part.json'), 'w'), indent=1)
    print('wrote the puppets')
