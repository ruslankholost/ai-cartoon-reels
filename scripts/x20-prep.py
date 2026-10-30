# Prep for x20 "One Coffee" (docs/x20-one-coffee.md): cuts the pictures of out/x20-cast (scripts/x20-art-gen.py; the kept file of each name is the one DONE.txt names, else 61) into the people, props and puppets the scenes use (src/x20-scenes.tsx,
# src/x20-scenes-a.tsx) and measures what the code needs. The recipe of scripts/x19-prep.py (it is imported, and through it x18-prep, x17-prep and the chain behind it, so the shared kit is the same files as before: the flood-fill cut, the Ross puppet
# registered on x08's master head, the gap patches under his chin, the pockets and defringe cleaners). Reused, not cut again: x08's Ross head, x10's bg-counter / bg-window / apron body, x16's hand of Ross, x18's bg-seating.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x20-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x20-prep.py props people ross team     -> only those parts (src/x20-rig.json keeps the others)
# Writes public/sp/x20-*.png, src/x20-rig.json (px of the pictures, y down) and scratch/x20-prep/* (the debug sheets).
# people: the camper in seven pictures (sit, sip, wave, call, gong, cup, freeze: flat cut-outs with the eyes, pupils and a mouth box measured so that the code draws lids, pupils and a talking mouth over the painted face), the three guys of the row (one layer each), the
#         long table (four man-and-table units that slide together, the power strip lifted off them) and the same four cheering, Ross soaked in foam (a flat picture: his own painted head, scaled so that his eyes are the master's size).
# props: the tiny cup, the four coins, the open laptop (its screen a hole), the gong (the disc apart from its stand), the tumbleweed, the power strip, the champagne bottle (the foam cloud apart), the two hands.
# ross: the plug pose is registered on x08's master head (disc [837, 581, r 195], neck pivot [837, 782]) with the gap patches of x17; his head is x08's, as painted.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x19p', os.path.join(HERE, 'x19-prep.py'))
x19p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x19p)   # (it chains x18-prep, x17-prep ... and points them at x19's cast: pointed at x20's below)
x18p, x17p, x14p, x15p, x8, tp, nvp, fxp, spp = x19p.x18p, x19p.x17p, x19p.x14p, x19p.x15p, x19p.x8, x19p.tp, x19p.nvp, x19p.fxp, x19p.spp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
CAST_DIR = os.path.join(ROOT, 'out', 'x20-cast')
DIRS = [CAST_DIR] + [os.path.join(ROOT, 'out', d) for d in ('x19-cast', 'x18-cast', 'x17-cast', 'x16-cast', 'x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x20-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x20-rig.json')


def kept_files():
    """name -> the kept picture's file name (without .png): the files DONE.txt of the art agent names (a line like `name -> name-61.png ...`), else the last seed of SEEDS in scripts/x20-art-gen.py, else 61"""
    kept = {}
    done = os.path.join(CAST_DIR, 'DONE.txt')
    if os.path.exists(done):
        for line in open(done, encoding='utf-8', errors='replace'):
            m = re.match(r'\s*([a-z0-9-]+)\s*(?:->|=>|:)\s*([a-z0-9-]+-\d\d)(?:\.png)?', line)
            if m: kept[m[1]] = m[2]
    src = open(os.path.join(HERE, 'x20-art-gen.py'), encoding='utf-8').read()
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', src, re.M)
    seeds = ast.literal_eval(m.group(1)) if m else {}
    for n, s in seeds.items(): kept.setdefault(n, f'{n}-{s[-1]}')
    return kept


# x17-prep's finders look at these names at call time: pointed at x20's cast, they find x20's pictures (and the older casts below them)
x17p.CAST_DIR, x17p.DIRS, x17p.KEPT, x17p.DBG = CAST_DIR, DIRS, kept_files(), DBG
tp.DBG, tp.PFX, tp.load3 = DBG, 'x20', x17p.load17
x14p.DBG = DBG
find, have, load = x17p.find, x17p.have, x17p.load17
hexc, med = tp.hexc, tp.med
sprite, grin_box, save_png, watershed, piece, inpaint, clean_pockets, defringe = x18p.sprite, x18p.grin_box, x18p.save_png, x18p.watershed, x18p.piece, x18p.inpaint, x18p.clean_pockets, x18p.defringe
white_of, eye_in, skin_of, face_of, eyes_pair, drop_whites, screen_hole, black_box = x19p.white_of, x19p.eye_in, x19p.skin_of, x19p.face_of, x19p.eyes_pair, x19p.drop_whites, x19p.screen_hole, x19p.black_box


def yx(H, W):
    return np.mgrid[0:H, 0:W]


def bbox(m):
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def eyes_pair2(a, zone):
    """two eyes whose whites touch and whose pupils sit on the lower edge of the white (the camper looking down at his screen: the dark dot is not shut in by white, so x19's eyes_pair does not find it): the convex hull of the white is the eye, the dark dots inside the hull are the pupils;
    returns the rig's eyes {cx, cy, rx, ry, lid} (to the middle of an outline 1.5 px past the white) and the pupils [cx, cy, r]"""
    x0, y0, x1, y1 = zone
    H, W = a.shape[:2]
    z = np.zeros((H, W), bool); z[y0:y1, x0:x1] = True
    wt = white_of(a, 215) & z
    lab, k = ndi.label(wt)
    sizes = ndi.sum(wt, lab, range(1, k + 1)); big = [1 + i for i, v in enumerate(sizes) if v > 300]
    mask = np.isin(lab, big)
    pts = np.argwhere(mask)[:, ::-1].astype(np.int32)
    hull = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
    dark = (hull > 0) & (a.max(axis=2) < 110)
    lab2, k2 = ndi.label(dark)
    cands = []
    for j in range(1, k2 + 1):
        py, px = np.where(lab2 == j)
        if 40 <= len(px) <= 900: cands.append((float(px.mean()), float(py.mean()), float(np.sqrt(len(px) / np.pi)), j))
    cands = sorted(sorted(cands, key=lambda c: -c[2])[:2])
    assert len(cands) == 2, f'{len(cands)} pupils found'
    cols = mask.sum(axis=0).astype(float)
    lo, hi = int(cands[0][0]) + 6, int(cands[1][0]) - 6
    mid = lo + int(np.argmin(cols[lo:hi]))
    xs_ = np.arange(W)[None, :]
    eyes, pupils = [], []
    for side, cand in zip(((xs_ < mid), (xs_ >= mid)), cands):
        m = (mask | (lab2 == cand[3])) & side
        ys, xs = np.where(m)
        ex0, ex1, ey0, ey1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cx, cy, rx, ry = (ex0 + ex1) / 2, (ey0 + ey1) / 2, (ex1 - ex0) / 2 + 1.5, (ey1 - ey0) / 2 + 1.5
        eyes.append(dict(cx=float(cx), cy=float(cy), rx=float(rx), ry=float(ry), lid=[[int(cx + (rx + 5) * np.cos(t)), int(cy + (ry + 5) * np.sin(t))] for t in np.linspace(0, 2 * np.pi, 28, endpoint=False)]))
        pupils.append([round(cand[0], 1), round(cand[1], 1), round(cand[2], 1)])
    return eyes, pupils


def circle_mask(H, W, cx, cy, r):
    yy, xx = yx(H, W)
    return (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r


def ring_clear(a, al, removed, white=225):
    """the pale ring round pieces that were made transparent (their anti-aliased edge is pale too): near-white pixels that touch them are cleared as well"""
    ring = ndi.binary_dilation(removed, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= white)
    al = al.copy(); al[ring] = 0.0
    return al


# ------------------------------------------------------------------ props
def prop_cup():
    """the camper's tiny paper cup (white on white: the outline is the edge, the flood fill keeps the inside): the foot (the middle of the bottom edge) is the point it stands on"""
    d, alpha, rgb, a = sprite('prop-cup', protect=False)
    ys, xs = np.where(alpha > 0.5)
    y1 = int(ys.max()); row = np.where(alpha[y1 - 6] > 0.5)[0]
    d['foot'] = [float(row.mean()), float(y1)]
    top = np.where(alpha[ys.min() + 4] > 0.5)[0]
    d['rim'] = [float(top.mean()), float(ys.min() + 41), float(top.max() - top.min()) / 2]
    print('  cup:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'foot', 'rim')})
    return d


def prop_coins():
    """the four coins, each its own sprite (two gold on top, two silver below): the coin's middle and radius"""
    a = load('prop-coins')
    alpha, rgb = nvp.cut(a, False)
    alpha = defringe(a, alpha, 215)
    lab, k = ndi.label(alpha > 0.3)
    parts = []
    for j in range(1, k + 1):
        m = lab == j
        if m.sum() < 5000: continue
        x0, y0, x1, y1 = bbox(m)
        parts.append((j, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0 + y1 - y0) / 4))
    parts.sort(key=lambda p: (round(p[2] / 400), p[1]))
    out = {}
    for i, (j, cx, cy, r) in enumerate(parts, 1):
        m = ndi.binary_dilation(lab == j, structure=K3, iterations=3)
        d = save_png(f'coin-{i}', rgb, alpha * m.astype(np.float32))
        d['c'] = [float(cx), float(cy), float(r)]
        out[f'coin_{i}'] = d
    print('  coins:', {k: v['c'] for k, v in out.items()})
    return out


def prop_laptop():
    """the open laptop from the front: the black screen is a hole (the code draws what is on it behind the picture)"""
    d, alpha, rgb, a = sprite('prop-laptop', protect=False)
    hole = screen_hole(a, (680, 280), 40)
    alpha2 = alpha * (~hole).astype(np.float32)
    d = save_png('prop-laptop', rgb, defringe(a, alpha2, 225))
    d['screen'] = bbox(hole)
    print('  laptop:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'screen')})
    return d


GONG_GAIN_DISC, GONG_GAIN_STAND = (0.85, 0.79, 1.03), (1.42, 1.43, 1.03)   # prop-gong is a brighter brass on darker posts than the gong of team-table and team-cheer (the disc's face 236 203 76 against 201 160 78, the posts 57 40 31 against 81 57 32): the shot of the gong (22) must show the gong of 16 and 23


def prop_gong():
    """the gong from the front: the stand (posts, crossbar, feet, the two cords) and the disc as two layers (the disc swings on its cords in the shot); the white that the two cords and the disc shut in is paper"""
    a = load('prop-gong')
    alpha, rgb = nvp.cut(a, False)
    H, W = alpha.shape
    alpha = drop_whites(a, alpha, [(300, 140, 740, 330)], 4000, 40000, white=222)
    alpha = defringe(a, alpha, 215)
    DISC = (510.0, 518.0, 295.0)
    dm = circle_mask(H, W, *DISC).astype(np.float32)
    disc = save_png('gong-disc', rgb, alpha * dm)
    stand = save_png('gong-stand', rgb, alpha * (1 - dm))
    recolour('gong-disc', GONG_GAIN_DISC); recolour('gong-stand', GONG_GAIN_STAND)
    disc['c'] = [DISC[0], DISC[1], DISC[2]]
    disc['hang'] = [510.0, 146.0]
    stand['hang'] = [510.0, 146.0]
    gold = rgb[int(DISC[1]) + 90:int(DISC[1]) + 160, 400:620].reshape(-1, 3)
    disc['gold'] = hexc(np.median(gold, axis=0))
    print('  gong: disc', {k: disc[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'c', 'gold')}, 'stand', {k: stand[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return disc, stand


def prop_tumbleweed():
    """the tumbleweed: the paper that shows through the twigs is made transparent (every enclosed near-white piece: a tumbleweed has no white), its middle and radius for the roll"""
    a = load('prop-tumbleweed')
    alpha, rgb = nvp.cut(a, False)
    alpha = drop_whites(a, alpha, [(0, 0, 1024, 1024)], 1, 80000, white=214)
    alpha = defringe(a, alpha, 215)
    d = save_png('prop-tumbleweed', rgb, alpha)
    x0, y0, x1, y1 = bbox(alpha > 0.3)
    d['c'] = [(x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) + (y1 - y0)) / 4]
    print('  tumbleweed:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'c')})
    return d


STRIP_TOP = 441   # the first row of the strip's own bar (its top outline) in prop-strip: above it the near-white is paper (between the cables and the chargers)


def prop_strip():
    """the power strip with its chargers and the tangle of cables: the paper between the cables is made transparent (the bar's own cream, from its top outline down, stays)"""
    a = load('prop-strip')
    alpha, rgb = nvp.cut(a, False)
    H, W = alpha.shape
    yy, xx = yx(H, W)
    near = (a.min(axis=2) >= 222) & (a.max(axis=2) - a.min(axis=2) < 40) & (alpha > 0.02)
    gone = near & (yy < STRIP_TOP)
    al = alpha.copy(); al[gone] = 0.0
    al = ring_clear(a, al, gone, 215)
    al = defringe(a, al, 215)
    d = save_png('prop-strip', rgb, al)
    bar = (al > 0.5) & (yy >= STRIP_TOP + 10)
    d['bar'] = bbox(bar)
    d['plug'] = [190.0, 520.0]   # (where the strip's own cord leaves it: the code draws the cord and the plug)
    print('  strip:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'bar')})
    return d


FOAM_Y = 392   # prop-champagne: the foam is above this row, the bottle (its gold foil neck) from it down


def prop_champagne():
    """the champagne bottle and, apart, the foam cloud that bursts out of its neck (white with thin outlines on white: the cloud's outline is not closed, so the cloud is filled: its biggest outline piece closed and filled, the drops are small closed shapes of their own)"""
    a = load('prop-champagne')
    alpha, rgb = nvp.cut(a, False)
    H, W = alpha.shape
    yy, xx = yx(H, W)
    ink = (a.min(axis=2) < 205) & (yy < FOAM_Y + 6)
    lab, k = ndi.label(ndi.binary_dilation(ink, structure=K3, iterations=5))
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, k + 1)); big = 1 + int(np.argmax(sizes))
    cloud_ink = ((lab == big) & ink).astype(np.uint8)
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    shape = cv2.morphologyEx(cv2.dilate(cloud_ink, np.ones((3, 3), np.uint8)), cv2.MORPH_CLOSE, disk) > 0
    shape = ndi.binary_fill_holes(shape) & (yy < FOAM_Y)
    shape = cv2.morphologyEx(shape.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))) > 0   # (a drop that the closing joined to the cloud by a bridge is its own again)
    # (a closed outline all round: where the painted one has gaps, a 3 px dark line is drawn on the filled shape's edge)
    edge = ndi.binary_dilation(shape, structure=K3, iterations=2) & ~ndi.binary_erosion(shape, structure=K3, iterations=1) & (alpha < 0.5)
    foam_al = np.maximum(alpha * (yy < FOAM_Y).astype(np.float32), (shape | edge).astype(np.float32))
    foam_rgb = rgb.copy(); foam_rgb[shape & (alpha < 0.5)] = (253, 253, 252); foam_rgb[edge] = (26, 26, 30)
    foam = save_png('champagne-foam', foam_rgb, foam_al)
    bottle = save_png('champagne-bottle', rgb, defringe(a, alpha * (yy >= FOAM_Y).astype(np.float32), 215))
    bx0, by0, bx1, by1 = bbox((alpha > 0.5) & (yy >= FOAM_Y + 30))
    bottle['neck'] = [float((465 + 548) / 2), float(FOAM_Y)]
    bottle['foot'] = [float((bx0 + bx1) / 2), float(by1)]
    foam['base'] = [float((465 + 548) / 2), float(FOAM_Y)]
    print('  champagne: bottle', {k: bottle[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'neck', 'foot')}, 'foam', {k: foam[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return bottle, foam


# ------------------------------------------------------------------ people
def mouth_line(a, zone, thr=150):
    """the drawn mouth (a short dark line) in a zone: its box"""
    x0, y0, x1, y1 = zone
    m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
    dark = m & (a.max(axis=2) < thr)
    assert dark.any(), f'no mouth line in {zone}'
    lab, k = ndi.label(dark, structure=np.ones((3, 3)))
    sizes = ndi.sum(dark, lab, range(1, k + 1)); j = 1 + int(np.argmax(sizes))
    return bbox(lab == j)


# the camper's seven pictures: where his two eye whites are (zone for eyes_pair2), the zone of forehead skin, the box of the mouth to draw over (DONE.txt: the flat line of sit, the smirk of wave, the open mouth of call, the beaming smile of cup), the cheek next to it for the patch's skin
CAMPER = {
    'camper-sit': dict(eyes=(400, 225, 615, 360), skin=(430, 198, 590, 222), grin=[468, 409, 548, 452], cheek=(436, 398, 462, 418)),
    'camper-sip': dict(eyes=(400, 280, 615, 360), skin=(430, 198, 590, 222)),
    'camper-wave': dict(eyes=(400, 220, 615, 360), skin=(430, 190, 590, 215), grin=[470, 399, 555, 444], cheek=(436, 392, 462, 414)),
    'camper-call': dict(eyes=(400, 225, 615, 360), skin=(430, 198, 590, 222), grin=[464, 404, 551, 458], cheek=(432, 400, 456, 420)),
    'camper-gong': dict(eyes=(245, 200, 430, 320), skin=(260, 170, 420, 200)),
    'camper-cup': dict(eyes=(390, 220, 635, 385), skin=(420, 190, 600, 225), grin=[431, 412, 591, 496], cheek=(405, 410, 428, 440)),
    'camper-freeze': dict(eyes=(390, 220, 635, 385), skin=(420, 190, 600, 225)),
}
CAMPER_HAIR = [(380, 30, 660, 200)]


def camper(n):
    """one of the camper's pictures as a sprite with his face measured: the eyes (two ovals that touch) and their pupils, the eye midpoint (the anchor the code places him by), the skin and the white of the eyes, the box of a mouth to draw over the painted one"""
    cfg = CAMPER[n]
    d, alpha, rgb, a = sprite(n, protect=False, pockets=CAMPER_HAIR if n != 'camper-gong' else [(190, 40, 440, 190)])
    eyes, pupils = eyes_pair2(a, cfg['eyes'])
    d['eyes'], d['pupils'] = eyes, pupils
    d['anchor'] = [round((eyes[0]['cx'] + eyes[1]['cx']) / 2, 1), round((eyes[0]['cy'] + eyes[1]['cy']) / 2, 1)]
    d['skin'] = skin_of(a, cfg['skin'])
    e0 = eyes[0]
    d['white'] = hexc(med(a, int(e0['cx'] - 12), int(e0['cy'] - e0['ry'] * 0.7), int(e0['cx'] + 12), int(e0['cy'] - e0['ry'] * 0.5)))
    if cfg.get('grin'):
        d['grin'] = grin_box(a, cfg['grin'], cfg['cheek'])
    print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'skin', 'white')}, 'grin', d.get('grin', {}).get('box'))
    return d, alpha, rgb, a


def cut_thr(a, thr=250):
    """spp.cutout with a stricter white: only the paper itself (every channel at `thr` or more) is background. The team pictures have a man in a white shirt and white sleeves whose outline is a 1 px light-grey line with gaps (the fill is 241-247, the paper 252-255): at spp.cutout's 238 the flood
    fill ran into the sleeve through the gaps and left a stair-stepped edge"""
    near = a.min(axis=2) >= thr
    ink_d = ndi.binary_dilation(~near, structure=K3)
    lab, _ = ndi.label(~ink_d)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgc = np.isin(lab, border[border > 0])
    bg = ndi.binary_dilation(bgc, structure=K3) & near
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


def drop_small(alpha, min_px=400):
    """specks of the cut that float free of the figure (a few px of paper that the flood fill left): every connected piece of the alpha under `min_px` px goes"""
    lab, n = ndi.label(alpha > 0.05, structure=np.ones((3, 3)))
    if n < 2: return alpha
    sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))
    gone = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v < min_px])
    al = alpha.copy(); al[gone] = 0.0
    return al


TEAM_GONG_WEDGE = [(1050, 385, 1315, 640)]   # the gong of the long table: the white between its two cords, the crossbar and the disc's top (the pieces are about 1000 px: under drop_paper's size)
TEAM_EYES = [(141, 342, 220, 379), (406, 333, 482, 380), (672, 338, 745, 379), (918, 346, 987, 385)]   # the four men's eye whites in team-table and team-cheer (DONE.txt, grown a little): kept whatever their size


def drop_paper(a, alpha, thr, min_area, keep=()):
    """the paper that the figures shut in (between the raised arms, inside the gong's stand): every connected piece of paper-white (all channels `thr` or more) of at least `min_area` px that the flood fill left opaque is made transparent, except inside the boxes `keep` (the eyes)"""
    near = (a.min(axis=2) >= thr) & (alpha > 0.02)
    lab, k = ndi.label(near)
    sizes = ndi.sum(near, lab, range(1, k + 1))
    gone = np.isin(lab, [1 + i for i, v in enumerate(sizes) if v >= min_area])
    for x0, y0, x1, y1 in keep: gone[y0:y1, x0:x1] = False
    al = alpha.copy(); al[gone] = 0.0
    ring = ndi.binary_dilation(gone, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= thr - 6)
    for x0, y0, x1, y1 in keep: ring[y0:y1, x0:x1] = False
    al[ring] = 0.0
    return al


ROW_X = [0, 505, 835, 1344]   # team-row: the three men are cut apart through the empty columns between them (x 470-540 and 800-870 are clear); each keeps the closed laptop under his arm
ROW_EYES = [((291, 166, 334, 209), (357, 166, 399, 209)), ((625, 161, 672, 210), (678, 161, 723, 210)), ((957, 165, 1003, 214), (1010, 165, 1056, 214))]   # the eye whites of DONE.txt
ROW_SKIN = [(300, 213, 328, 236), (640, 213, 662, 236), (968, 212, 992, 234)]
ROW_MOUTH = [(318, 236, 376, 258), (650, 234, 700, 256), (980, 238, 1034, 258)]   # where each man's drawn mouth (a short level line) is searched
ROW_HAIR = [(230, 50, 450, 200), (560, 20, 790, 160), (880, 50, 1130, 210)]


def team_row():
    """the three guys of the startup standing in a row (deadpan, a closed laptop under the left arm): one layer each with his eyes and pupils, the eye midpoint, the skin, a mouth box over the drawn level line"""
    a = load('team-row')
    alpha, rgb = cut_thr(a, 248)
    alpha = clean_pockets(a, alpha, ROW_HAIR, max_area=1500, white=248)
    alpha = drop_small(defringe(a, alpha, 244, 4))
    H, W = alpha.shape
    yy, xx = yx(H, W)
    out = {}
    for i in range(3):
        mk = ((xx >= ROW_X[i]) & (xx < ROW_X[i + 1])).astype(np.float32)
        face, masks = face_of(a, ROW_EYES[i], ROW_SKIN[i])
        for m in masks: alpha[ndi.binary_dilation(m, structure=K3, iterations=1) & (mk > 0)] = 1.0
        d = save_png(f'row-{i + 1}', rgb, alpha * mk)
        d.update(face)
        x0, y0, x1, y1 = mouth_line(a, ROW_MOUTH[i])
        cx = (x0 + x1) / 2
        d['grin'] = grin_box(a, [int(cx - 25), y0 - 6, int(cx + 25), y0 + 20], (int(cx - 36), y0 - 6, int(cx - 24), y0 + 4))
        d['mouth_line'] = [x0, y0, x1, y1]
        out[f'row_{i + 1}'] = d
        print(f'  row {i + 1}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'skin')}, 'mouth', d['mouth_line'], 'pupils', d['pupils'])
    return out


def table_joins(a, alpha):
    """the x of the three joints of the long table (where two round tops touch): the columns where the table tops' tan is thinnest near x 310, 568 and 826"""
    tan = (alpha > 0.5) & (a[..., 0] > 170) & (a[..., 0] < 235) & (a[..., 1] > 120) & (a[..., 1] < 190) & (a[..., 2] > 60) & (a[..., 2] < 140)
    cnt = tan[540:600].sum(axis=0).astype(float)
    cnt = ndi.uniform_filter1d(cnt, 5)
    joins = []
    for c in (310, 568, 826):
        lo, hi = c - 25, c + 25
        joins.append(lo + int(np.argmin(cnt[lo:hi])))
    return joins


def team_table():
    """the long table of four pushed-together café tables with the four at it typing and the gong at the right end: three layers, the left table with its man (A), the two middle tables with their men and the power strip lying across their joint (B) and the right table with its man and the gong (C):
    A and C slide in against B on the shove (src/x20-scenes.tsx TeamTable)"""
    a = load('team-table')
    alpha, rgb = cut_thr(a, 246)
    alpha = clean_pockets(a, alpha, [(110, 250, 270, 340), (360, 240, 520, 330), (640, 220, 780, 320), (880, 240, 1030, 330)], max_area=1500, white=246)
    alpha = drop_paper(a, alpha, 246, 1200, TEAM_EYES)
    alpha = drop_whites(a, alpha, TEAM_GONG_WEDGE, 60, 8000, 228)
    alpha = drop_small(defringe(a, alpha, 236, 12))
    H, W = alpha.shape
    yy, xx = yx(H, W)
    j1, j2, j3 = table_joins(a, alpha)
    out = {}
    for name, m in (('A', xx < j1), ('B', (xx >= j1) & (xx < j3)), ('C', xx >= j3)):
        out[f'table_{name}'] = save_png(f'table-{name}', rgb, alpha * m.astype(np.float32))
    print('  team-table: joins', (j1, j2, j3), {k: (v['w'], v['h'], v['ox'], v['oy']) for k, v in out.items() if v['file']})
    return out


CHEER_FOAM = [(15, 120, 155, 252), (965, 120, 1115, 250)]   # the foam clouds and drops over the two bottles' necks in team-cheer (DONE.txt x 25-145 / 978-1102, y 144-252): the bottles pop in the next picture, so here they are corked


def team_cheer():
    """the same four with both arms up and two bottles in the outer men's hands (heads, laptops, tables and gong at the same pixels as team-table): the painted foam over the bottles' necks is taken off, the bottles pop in shot 24"""
    a = load('team-cheer')
    alpha, rgb = cut_thr(a, 246)
    alpha = clean_pockets(a, alpha, [(110, 230, 270, 330), (360, 220, 520, 320), (640, 200, 780, 310), (880, 220, 1030, 320)], max_area=1500, white=246)
    for x0, y0, x1, y1 in CHEER_FOAM: alpha[y0:y1, x0:x1] = 0.0
    alpha = drop_paper(a, alpha, 246, 1200, TEAM_EYES)
    alpha = drop_whites(a, alpha, TEAM_GONG_WEDGE, 60, 8000, 228)
    alpha = drop_small(defringe(a, alpha, 236, 12))
    d = save_png('team-cheer', rgb, alpha)
    print('  team-cheer:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return d


GONG_MAN = {   # watershed seeds on camper-gong (picture px): label 1 is the man with the mallet, label 2 the painted gong (stand, disc), which the scene replaces by prop-gong
    1: [('disk', 338, 262, 70), ('disk', 300, 540, 55), ('disk', 262, 760, 35), ('disk', 225, 905, 14), ('disk', 330, 920, 12), ('line', [(634, 472), (532, 530)], 3), ('line', [(470, 570), (434, 585)], 3), ('disk', 665, 457, 24), ('disk', 480, 545, 12)],
    2: [('disk', 830, 560, 60), ('disk', 780, 330, 40), ('disk', 700, 610, 40), ('disk', 727, 446, 20), ('line', [(610, 220), (610, 330)], 5), ('line', [(883, 640), (883, 900)], 6), ('line', [(610, 700), (610, 900)], 6), ('line', [(600, 182), (900, 182)], 8), ('disk', 600, 900, 10), ('disk', 890, 900, 10)],
}


def gong_man(a, alpha, rgb, d):
    """camper-gong without its painted gong: the man, the mallet's stick and its cream head (what the watershed gives label 1) as one layer; the mallet head's middle and the stick's butt are measured"""
    ws = watershed(a, alpha, GONG_MAN)
    H, W = alpha.shape
    yy, xx = yx(H, W)
    man = (alpha > 0.02) & ((xx < 556) | (ws == 1))   # (the man, his arms and the stick's near end are all left of the painted gong's disc; right of it only what the watershed gives label 1: the stick and its head)
    lab, k = ndi.label(man)
    sizes = ndi.sum(man, lab, range(1, k + 1)); man = lab == (1 + int(np.argmax(sizes)))
    man = ndi.binary_fill_holes(man) & (alpha > 0.02)
    m = save_png('camper-gong-man', rgb, defringe(a, alpha * man.astype(np.float32), 205))
    for key in ('eyes', 'pupils', 'anchor', 'skin', 'white'): m[key] = d[key]
    m['head'] = [665.0, 457.0]    # the middle of the mallet's cream head (DONE.txt x 628-702, y 418-497)
    print('  gong man:', {k: m[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return m


def ross_drip():
    """Ross soaked in foam: his own painted head (the foam on his hair, the drips down his face) as a flat picture. The painter drew the head at 0.92 of the master's size: `ek` scales it so that the eye whites are the master's size (the eyes are 97.5 px apart against the master's 106: 1.087),
    and the code places it by the middle of the eyes, which is the shift of 2 px right and 21 px down that DONE.txt names. A mouth box over the painted polite smile for his one line"""
    n = 'ross-drip'
    a = np.array(Image.open(find(n)).convert('RGB')).astype(np.float32)
    face, masks = face_of(a, [(420, 195, 511, 303), (516, 195, 610, 303)], (440, 308, 500, 336))
    alpha, rgb = cut_thr(a, 244)
    alpha = drop_small(defringe(a, alpha, 245, 3))
    for m in masks: alpha[ndi.binary_dilation(m, structure=K3, iterations=1)] = 1.0
    d = save_png(n, rgb, alpha)
    d.update(face)
    sp_ = float(np.hypot(face['eyes'][1]['cx'] - face['eyes'][0]['cx'], face['eyes'][1]['cy'] - face['eyes'][0]['cy']))
    d['ek'] = round(106.0 / sp_, 4)
    x0, y0, x1, y1 = mouth_line(a, (460, 336, 560, 362), 170)
    cx = (x0 + x1) / 2
    d['grin'] = grin_box(a, [int(cx - 40), y0 - 8, int(cx + 40), y0 + 22], (int(cx - 62), y0 - 10, int(cx - 46), y0 + 6))
    d['mouth_line'] = [x0, y0, x1, y1]
    print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'ek', 'skin')}, 'eyes spacing', round(sp_, 1), 'mouth', d['mouth_line'], 'pupils', d['pupils'])
    return d


ROSS_POSES = {'plug': 'ross-plug'}


def puppets(which):
    """Ross's plug pose registered on x08's master head (the picture's head is the master's to the pixel): the body of the picture, the head x08's as painted; the other poses of this episode are x10's apron body and the flat soaked picture"""
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    x15rig = json.load(open(os.path.join(ROOT, 'src', 'x15-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES); cfg['pockets'] = ()
        x14p.NOPOCKET[0] = True
        new = tp.puppet('ross', cfg)[0]
        x14p.NOPOCKET[0] = False
        r = json.loads(json.dumps(x8rig['ross']))   # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the body is new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        for pn in r['bodies']: print(f'  ross {pn}: {x15p.drop_islands(r["bodies"][pn])} px of loose pieces cleared')
        for pn in r['bodies']: x17p.patch_gaps(pn, r['bodies'][pn], False)
        r['layers']['body'] = r['bodies'][next(iter(r['bodies']))]
        r.pop('flySil', None); r.pop('screens', None)
        r['purple'] = x15rig['puppets']['ross']['purple']
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    return rigs


def people_team():
    out = {}
    out.update(team_row())
    out.update(team_table())
    out['team_cheer'] = team_cheer()
    out['ross_drip'] = ross_drip()
    return out


WAVE_PIVOT = [405.0, 545.0]   # camper-wave: where the raised arm swings from (inside his vest, which is drawn in front of the arm)


def wave_split(a, alpha, rgb, d):
    """camper-wave in two layers, the raised arm (the grey sleeve and the open hand: everything left of the vest from row 395 down to the table, the laptop's lid not included) and the rest of him; the arm is drawn behind the rest and swings about WAVE_PIVOT, so the wave is the whole arm rocking; the arm's layer reaches 3 px under
    the vest so that no seam shows, the rest's picture keeps the vest's outline"""
    H, W = alpha.shape
    yy, xx = yx(H, W)
    navy = (a[..., 2] - a[..., 0] > 25) & (a[..., 0] < 90) & (a.max(axis=2) < 140) & (alpha > 0.5)
    xv = np.full(H, 420)
    for y in range(395, 700):
        xs = np.where(navy[y])[0]
        if len(xs): xv[y] = xs.min()
    xv = ndi.minimum_filter1d(xv, 9)
    arm = (alpha > 0.02) & (yy >= 395) & (yy < 700) & (xx < xv[:, None] - 2) & ~((xx >= 340) & (yy >= 592))
    lab, k = ndi.label(arm, structure=np.ones((3, 3)))
    sizes = ndi.sum(arm, lab, range(1, k + 1)); arm = lab == (1 + int(np.argmax(sizes)))
    under = ndi.binary_dilation(arm, structure=K3, iterations=3) & (alpha > 0.02)
    a_arm = save_png('camper-wave-arm', rgb, defringe(a, alpha * under.astype(np.float32), 205))
    a_body = save_png('camper-wave-body', rgb, defringe(a, alpha * (~arm).astype(np.float32), 205))
    for key in ('eyes', 'pupils', 'anchor', 'skin', 'white', 'grin'): a_body[key] = d[key]
    a_arm['pivot'] = WAVE_PIVOT
    a_arm['elbow'] = [215.0, 615.0]
    print('  wave arm:', {k: a_arm[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'body:', {k: a_body[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return a_arm, a_body


def recolour(name, gains):
    """a saved layer's colours multiplied by `gains` (r, g, b; transparent pixels and black outlines stay as they are): the gong of shot 22 is matched to the gong of the long table (16 and 23), which is a duller, darker brass"""
    f = os.path.join(ROOT, 'public', 'sp', f'x20-{name}.png')
    im = np.array(Image.open(f).convert('RGBA')).astype(np.float32)
    im[..., :3] = np.clip(im[..., :3] * np.array(gains, np.float32), 0, 255)
    Image.fromarray(im.astype(np.uint8), 'RGBA').save(f, optimize=True)


def people_camper():
    out = {}
    for n in CAMPER:
        if not have(n): continue
        d, alpha, rgb, a = camper(n)
        if n == 'camper-gong':   # (the man with his mallet only: the painted gong is replaced by prop-gong, so the whole picture is not kept)
            out['camper_gong_man'] = gong_man(a, alpha, rgb, d)
            os.remove(os.path.join(ROOT, 'public', d['file']))
        elif n == 'camper-wave':   # (in two layers, the raised arm and the rest)
            out['camper_wave_arm'], out['camper_wave_body'] = wave_split(a, alpha, rgb, d)
            os.remove(os.path.join(ROOT, 'public', d['file']))
        else:
            out[n.replace('-', '_')] = d
    return out


def hands():
    out = {}
    d, alpha, rgb, a = sprite('hand-camper', protect=False)
    m = alpha > 0.5
    ys, xs = np.where(m & (np.arange(m.shape[1])[None, :] < 468))
    d['palm'] = [float(xs.mean()), float(ys.mean())]   # the middle of the mitten
    d['edge'] = [float(m.shape[1] - 1), float(np.where(m[:, -1])[0].mean())]   # where the sleeve leaves the picture (right edge)
    d['sleeve'] = hexc(med(a, 700, 540, 760, 620)); d['sleeve_edge'] = [int(np.where(m[:, -1])[0].min()), int(np.where(m[:, -1])[0].max())]   # (the code carries the sleeve on to the frame's edge in this colour)
    out['hand_camper'] = d
    print('  hand-camper:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'palm', 'edge')})
    def no_cord(a, alpha):   # the short cord that hangs from the fist is taken off: the code draws the cord of the plug that the hand carries (the machine's, then the power strip's)
        al = alpha.copy(); al[669:, 520:600] = 0.0
        return al
    d, alpha, rgb, a = sprite('hand-dev', protect=False, fix=no_cord)
    m = alpha > 0.5
    # the plug: the black block with its two light-grey prongs pointing right; the cord hangs from the fist
    d['tip'] = [756.0, 474.0]    # the prongs' tips (x 598-715 is the block, the prongs reach 756)
    d['cord_from'] = [556.0, 664.0]   # where the cord left the fist (the code's cords start here)
    d['edge'] = [0.0, float(np.where(m[:, 0])[0].mean())]
    d['sleeve'] = hexc(med(a, 60, 520, 200, 580)); d['sleeve_edge'] = [int(np.where(m[:, 0])[0].min()), int(np.where(m[:, 0])[0].max())]
    out['hand_dev'] = d
    print('  hand-dev:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'tip', 'cord_from', 'edge')})
    return out


def props():
    out = {}
    out['cup'] = prop_cup()
    out.update(prop_coins())
    out['laptop'] = prop_laptop()
    out['gong_disc'], out['gong_stand'] = prop_gong()
    out['tumbleweed'] = prop_tumbleweed()
    out['strip'] = prop_strip()
    out['champagne_bottle'], out['champagne_foam'] = prop_champagne()
    out.update(hands())
    return out


def debug_sheet(rig, names, path, cols=4, tile=460):
    """the cut pictures over a grey ground with what was measured drawn on them (eyes red, pupils green, the mouth's box cyan, the anchor yellow, the tip magenta)"""
    tiles = []
    for n in names:
        d = rig.get(n)
        if not d or not d.get('file'): continue
        im = Image.open(os.path.join(ROOT, 'public', d['file'])).convert('RGBA')
        bg = Image.new('RGBA', im.size, (110, 110, 150, 255)); bg.alpha_composite(im)
        dr = ImageDraw.Draw(bg); ox, oy = d['ox'], d['oy']
        for e in d.get('eyes', []): dr.ellipse([e['cx'] - ox - e['rx'], e['cy'] - oy - e['ry'], e['cx'] - ox + e['rx'], e['cy'] - oy + e['ry']], outline=(255, 0, 0, 255), width=2)
        for q in d.get('pupils', []): dr.ellipse([q[0] - ox - q[2], q[1] - oy - q[2], q[0] - ox + q[2], q[1] - oy + q[2]], outline=(0, 255, 0, 255), width=2)
        if d.get('grin'): b = d['grin']['box']; dr.rectangle([b[0] - ox, b[1] - oy, b[2] - ox, b[3] - oy], outline=(0, 255, 255, 255), width=2)
        if d.get('anchor'): ax, ay = d['anchor']; dr.ellipse([ax - ox - 4, ay - oy - 4, ax - ox + 4, ay - oy + 4], fill=(255, 255, 0, 255))
        for key in ('tip', 'foot', 'neck', 'hang', 'palm', 'cord_from', 'base'):
            if d.get(key): tx, ty = d[key][:2]; dr.ellipse([tx - ox - 5, ty - oy - 5, tx - ox + 5, ty - oy + 5], fill=(255, 0, 255, 255))
        if d.get('screen'): b = d['screen']; dr.rectangle([b[0] - ox, b[1] - oy, b[2] - ox, b[3] - oy], outline=(0, 255, 255, 255), width=3)
        s_ = tile / max(bg.size); tiles.append((n, bg.convert('RGB').resize((max(1, int(bg.width * s_)), max(1, int(bg.height * s_))))))
    rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (cols * (tile + 10) + 10, rows * (tile + 30) + 10), (30, 30, 30)); dr = ImageDraw.Draw(sh)
    for i, (n, im) in enumerate(tiles):
        x, y = 10 + (i % cols) * (tile + 10), 10 + (i // cols) * (tile + 30)
        sh.paste(im, (x, y + 20)); dr.text((x, y + 4), n, fill=(255, 255, 255))
    sh.save(path, quality=88)


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    rig.setdefault('people', {}); rig.setdefault('props', {}); rig.setdefault('plates', {}); rig.setdefault('puppets', {'ross': {'bodies': {}}})
    for k in ('camper_gong', 'camper_wave', 'table_meta'): rig['people'].pop(k, None)   # (earlier versions of this script kept them)
    if not only or 'people' in only or 'camper' in only:
        rig['people'].update(people_camper()); print('  done camper')
        debug_sheet(rig['people'], [n.replace('-', '_') for n in CAMPER if n not in ('camper-gong', 'camper-wave')] + ['camper_gong_man', 'camper_wave_arm', 'camper_wave_body'], os.path.join(DBG, 'camper-sheet.jpg'), cols=4, tile=440)
    if not only or 'people' in only or 'team' in only:
        rig['people'].update(people_team()); print('  done team')
        debug_sheet(rig['people'], ['row_1', 'row_2', 'row_3', 'table_A', 'table_B', 'table_C', 'team_cheer', 'ross_drip'], os.path.join(DBG, 'team-sheet.jpg'), cols=3, tile=620)
    if not only or 'props' in only:
        rig['props'].update(props()); print('  done props')
        debug_sheet(rig['props'], ['cup', 'coin_1', 'coin_2', 'coin_3', 'coin_4', 'laptop', 'gong_disc', 'gong_stand', 'tumbleweed', 'strip', 'champagne_bottle', 'champagne_foam', 'hand_camper', 'hand_dev'], os.path.join(DBG, 'props-sheet.jpg'), cols=5, tile=380)
    pw = [k for k in ('ross',) if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        x17p.debug_sheet17(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
