# Prep for x19 "Screen Time" (docs/x19-screen-time.md): cuts the pictures of out/x19-cast (scripts/x19-art-gen.py; the kept file of each name is the one DONE.txt names, else its SEEDS entry, else 61) and a few reused ones into the people, props,
# plates and puppets the scenes use (src/x19-scenes.tsx) and measures what the code needs. The recipe of scripts/x18-prep.py (it is imported, and through it x17-prep and the chain behind it, so the shared kit is the same files as before: the flood-fill
# cut, the Ross puppet registered on x08's master head, the gap patches under his chin, the pockets and defringe cleaners). Reused, not cut again: x08's Ross head, x10's bg-counter / bg-window / apron body, x16's hand, x18's mom-phone / mom-shock / bg-seating.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x19-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x19-prep.py pane people props     -> only those parts (src/x19-rig.json keeps the others)
# Writes public/sp/x19-*.png|jpg, src/x19-rig.json (px of the pictures, y down) and scratch/x19-prep/* (the debug sheets).
# pane: the glass of the big window of x18's seating plate as a picture of its own: the wide shots draw it again on a grid that bulges with the sound (src/x19-draw.tsx PaneBulge) over the plate's own pane.
# people: flat cut-outs: the mom at her table (panic, proud, plead) and standing by the stroller, the toddler at his table (sit, popcorn), the four customers in each of their three states (plain, glazed, cash: one layer per person, the table strip on each),
#         Ross blown by the wind and in his usher's hat (his own painted heads: scaled so that the eyes are the master's size) and the two pointing hands; with the measured eyes (the code draws lids and pupils over them), a mouth to draw over a painted one,
#         the skin and the white of the eyes.
# props: the tablet (its screen's corners), the muffin and its plate (two layers), the stroller from the side, the stroller TV (the TV and the stroller, two layers, the TV's hinge and screen), the rack of chargers, one charger, the popcorn bucket and the light switch.
# ross: the headphones pose is registered on x08's master head (disc [837, 581, r 195], neck pivot [837, 782]) with the gap patches of x17; his head is x08's, as painted.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x18p', os.path.join(HERE, 'x18-prep.py'))
x18p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x18p)   # (it chains x17-prep, x16-prep ... and points them at x18's cast: pointed at x19's below)
x17p, x14p, x15p, x8, tp, nvp, fxp, spp = x18p.x17p, x18p.x14p, x18p.x15p, x18p.x8, x18p.tp, x18p.nvp, x18p.fxp, x18p.spp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
CAST_DIR = os.path.join(ROOT, 'out', 'x19-cast')
DIRS = [CAST_DIR] + [os.path.join(ROOT, 'out', d) for d in ('x18-cast', 'x17-cast', 'x16-cast', 'x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x19-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x19-rig.json')


def kept_files():
    """name -> the kept picture's file name (without .png): the files DONE.txt of the art agent names (a line like `name -> name-61.png ...`), else the last seed of SEEDS in scripts/x19-art-gen.py, else 61"""
    kept = {}
    done = os.path.join(CAST_DIR, 'DONE.txt')
    if os.path.exists(done):
        for line in open(done, encoding='utf-8', errors='replace'):
            m = re.match(r'\s*([a-z0-9-]+)\s*(?:->|=>|:)\s*([a-z0-9-]+-\d\d)(?:\.png)?', line)
            if m: kept[m[1]] = m[2]
    src = open(os.path.join(HERE, 'x19-art-gen.py'), encoding='utf-8').read()
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', src, re.M)
    seeds = ast.literal_eval(m.group(1)) if m else {}
    for n, s in seeds.items(): kept.setdefault(n, f'{n}-{s[-1]}')
    return kept


# x17-prep's finders look at these names at call time: pointed at x19's cast, they find x19's pictures (and x18's, x10's, x08's below them)
x17p.CAST_DIR, x17p.DIRS, x17p.KEPT, x17p.DBG = CAST_DIR, DIRS, kept_files(), DBG
tp.DBG, tp.PFX, tp.load3 = DBG, 'x19', x17p.load17
x14p.DBG = DBG
find, have, load = x17p.find, x17p.have, x17p.load17
hexc, med = tp.hexc, tp.med
sprite, eyes_pupils, two_eyes, grin_box, save_png, watershed, piece, inpaint, clean_pockets, defringe = x18p.sprite, x18p.eyes_pupils, x18p.two_eyes, x18p.grin_box, x18p.save_png, x18p.watershed, x18p.piece, x18p.inpaint, x18p.clean_pockets, x18p.defringe


def pane():
    """the window's glass of the seating plate, cut out opaque (the plate's own pixels): the street seen through the café's big window"""
    im = Image.open(os.path.join(OUT, 'x18-bg-seating.jpg')).convert('RGB')
    box = [80, 180, 690, 745]
    im.crop(tuple(box)).save(os.path.join(OUT, 'x19-pane.png'), optimize=True)
    print('  pane', box)
    return dict(file='sp/x19-pane.png', w=box[2] - box[0], h=box[3] - box[1], box=box)


def white_of(a, thr=215):
    """the near-white, hardly coloured pixels of a picture (the eyes' whites, the shirt, the paper)"""
    return (a.min(axis=2) >= thr) & (a.max(axis=2) - a.min(axis=2) < 40)


def eye_in(a, box, pad=7):
    """one painted eye: the white shut in by the outline inside `box` (x0, y0, x1, y1 of DONE.txt's eye whites, grown by `pad`): the biggest near-white piece that holds the box's middle; returns the eye {cx, cy, rx, ry, lid} (the rig's rx and ry run to the middle of the
    3 px outline, 1.5 px past the white) and the pupil [cx, cy, r] (the dark piece inside the white)"""
    x0, y0, x1, y1 = box
    H, W = a.shape[:2]
    z = np.zeros((H, W), bool); z[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
    lab, k = ndi.label(white_of(a, 215) & z)
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    pick = lab[my, mx]
    if not pick:   # (the middle is the pupil: the biggest piece near it)
        sizes = ndi.sum(np.ones_like(lab), lab, range(1, k + 1)); pick = 1 + int(np.argmax(sizes))
    white = ndi.binary_fill_holes(lab == pick)
    ys, xs = np.where(white)
    ex0, ex1, ey0, ey1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    cx, cy, rx, ry = (ex0 + ex1) / 2, (ey0 + ey1) / 2, (ex1 - ex0) / 2 + 1.5, (ey1 - ey0) / 2 + 1.5
    lid = [[int(cx + (rx + 5) * np.cos(t)), int(cy + (ry + 5) * np.sin(t))] for t in np.linspace(0, 2 * np.pi, 28, endpoint=False)]
    dark = white & (a.max(axis=2) < 110)
    lab2, k2 = ndi.label(dark)
    if k2:
        sizes = ndi.sum(dark, lab2, range(1, k2 + 1)); j = 1 + int(np.argmax(sizes)); py, px = np.where(lab2 == j)
        pupil = [float(px.mean()), float(py.mean()), float(np.sqrt(len(px) / np.pi))]
    else:
        pupil = [cx, cy, 8.0]
    return dict(cx=float(cx), cy=float(cy), rx=float(rx), ry=float(ry), lid=lid), pupil, white


def skin_of(a, zone):
    """the skin colour of a face: the median of the skin-like pixels (peach: R 235+, G 195-235, B 135-190) in the zone (hair and brows are not skin)"""
    x0, y0, x1, y1 = zone
    z = a[y0:y1, x0:x1].reshape(-1, 3)
    m = (z[:, 0] >= 235) & (z[:, 1] >= 195) & (z[:, 1] <= 238) & (z[:, 2] >= 130) & (z[:, 2] <= 195)
    return hexc(np.median(z[m], axis=0)) if m.sum() > 50 else hexc(np.median(z, axis=0))


def face_of(a, whites, skin_zone):
    """the eyes (two whites, by their boxes) with their pupils, the middle between them (the anchor the code places the person by), the skin colour and the white's colour"""
    eyes, pupils, masks = [], [], []
    for b in whites:
        e, p, m = eye_in(a, b)
        eyes.append(e); pupils.append(p); masks.append(m)
    anchor = [round((eyes[0]['cx'] + eyes[1]['cx']) / 2, 1), round((eyes[0]['cy'] + eyes[1]['cy']) / 2, 1)]
    e0 = eyes[0]
    white = hexc(med(a, int(e0['cx'] - 12), int(e0['cy'] - e0['ry'] * 0.7), int(e0['cx'] + 12), int(e0['cy'] - e0['ry'] * 0.5)))
    return dict(eyes=eyes, pupils=[[round(v, 1) for v in p] for p in pupils], anchor=anchor, skin=skin_of(a, skin_zone), white=white), masks


def eyes_pair(a, zone):
    """two eyes whose whites touch (the man's, the woman's, the young man's): the white in the zone, split by a vertical line half way between the two pupils; each half is an eye {cx, cy, rx, ry, lid} (the rig's convention) with its pupil [cx, cy, r]"""
    x0, y0, x1, y1 = zone
    H, W = a.shape[:2]
    z = np.zeros((H, W), bool); z[y0:y1, x0:x1] = True
    wt = white_of(a, 215) & z
    lab, k = ndi.label(wt)
    sizes = ndi.sum(wt, lab, range(1, k + 1)); big = [1 + i for i, v in enumerate(sizes) if v > 300]
    mask = ndi.binary_fill_holes(np.isin(lab, big))
    dark = mask & (a.max(axis=2) < 110)
    lab2, k2 = ndi.label(dark)
    cands = []
    for j in range(1, k2 + 1):
        py, px = np.where(lab2 == j)
        if 40 <= len(px) <= 900: cands.append((float(px.mean()), float(py.mean()), float(np.sqrt(len(px) / np.pi))))
    cands = sorted(sorted(cands, key=lambda c: -c[2])[:2])
    cols = mask.sum(axis=0).astype(float)
    lo, hi = int(cands[0][0]) + 6, int(cands[1][0]) - 6
    mid = lo + int(np.argmin(cols[lo:hi]))   # the neck where the two whites touch: the narrowest column between the pupils
    eyes, pupils = [], []
    for side, cand in zip((mask & (np.arange(W)[None, :] < mid), mask & (np.arange(W)[None, :] >= mid)), cands):
        ys, xs = np.where(side)
        ex0, ex1, ey0, ey1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cx, cy, rx, ry = (ex0 + ex1) / 2, (ey0 + ey1) / 2, (ex1 - ex0) / 2 + 1.5, (ey1 - ey0) / 2 + 1.5
        eyes.append(dict(cx=float(cx), cy=float(cy), rx=float(rx), ry=float(ry), lid=[[int(cx + (rx + 5) * np.cos(t)), int(cy + (ry + 5) * np.sin(t))] for t in np.linspace(0, 2 * np.pi, 28, endpoint=False)]))
        pupils.append([round(cand[0], 1), round(cand[1], 1), round(cand[2], 1)])
    return eyes, pupils


STRIP_Y = 677   # the first row of the table's strip (its top outline) in the customers' pictures
CUST_X = [0, 352, 667, 1010, 1344]   # where the four customers are cut apart (picture x): through the empty columns between them; the table's strip stays on each
CUST_HAIR = [(40, 140, 340, 330), (400, 230, 640, 400), (700, 200, 960, 540), (1040, 230, 1290, 440)]   # the zones of hair (the man's, the old man's ring, the woman's curls, the beanie's rim) whose white pockets are cleared
CUST_EYES = [(110, 330, 250, 412), (430, 352, 572, 424), (765, 345, 895, 424), (1085, 340, 1215, 425)]   # each customer's two eye whites (DONE.txt), glazed state


def customers():
    """the row of four in each of its three states (customers, customers-glazed, customers-cash): the flood-fill cut of the whole picture, one layer per person (a column slice through the empty columns between them: x 352, 667 and 1010 are clear above the
    table in all three; each keeps the strip of the table in front of him, so that a person swaps from one state to another and the table does not change); the eyes of the glazed row are measured (the code draws the pupils that tick over in shot 25)"""
    out = {}
    for state, n in (('plain', 'customers'), ('glazed', 'customers-glazed'), ('cash', 'customers-cash')):
        if not have(n): continue
        a = load(n)
        alpha, rgb = nvp.cut(a, False)
        alpha = clean_pockets(a, alpha, CUST_HAIR, max_area=1500, white=226)   # (only the hair and the beanie: the newspaper and the mug are white too)
        alpha = defringe(a, alpha, 205)
        yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
        for i in range(4):
            mk = ((xx >= CUST_X[i]) & (xx < CUST_X[i + 1]) & (alpha > 0.02)).astype(np.float32)
            # the person and the table's strip (with what lies over it: the laptop, a hand) are two layers: the person stretches when he turns, the table does not move
            out[f'cust_{state}_{i + 1}'] = save_png(f'cust-{state}-{i + 1}', rgb, alpha * mk * (yy < STRIP_Y).astype(np.float32))
            out[f'cust_{state}_{i + 1}_tab'] = save_png(f'cust-{state}-{i + 1}-tab', rgb, alpha * mk * (yy >= STRIP_Y).astype(np.float32))
        print(f'  {n}: 4 layers', [out[f'cust_{state}_{i + 1}']['w'] for i in range(4)])
        if state == 'glazed':
            for i, zone in enumerate(CUST_EYES):
                if i != 1: eyes, pupils = eyes_pair(a, zone)
                else:   # (the old man's two whites are apart, inside his glasses)
                    eyes, pupils = [], []
                    for b in ((439, 361, 488, 416), (509, 361, 562, 416)):
                        e, p, _ = eye_in(a, b); eyes.append(e); pupils.append([round(v, 1) for v in p])
                out[f'cust_glazed_{i + 1}'].update(eyes=eyes, pupils=pupils, white='#fdfdfb')
                print(f'    glazed {i + 1}: eyes', [(round(e['cx']), round(e['cy']), round(e['rx']), round(e['ry'])) for e in eyes], 'pupils', pupils)
    out['cust_meta'] = dict(file='', w=1344, h=768, ox=0, oy=0, cuts=CUST_X, table=[0, STRIP_Y, 1344, 752])
    return out


def flat_ross(n, whites, mouth=None):
    """one of Ross's own painted heads (the wind-blown hair, the usher's hat): the picture cut out as it is (no body or head registered on x08's: the hair and the hat are painted), with `ek`, how much it must be scaled so that its eye whites are the master's size
    (the master's are 106 px apart, centre to centre), the middle between the eyes (the anchor) and, for a mouth to draw over the painted smile, its box"""
    a = np.array(Image.open(find(n)).convert('RGB')).astype(np.float32)
    face, masks = face_of(a, whites, (440, 250, 560, 340))
    alpha, rgb = nvp.cut(a, True)
    alpha = clean_pockets(a, alpha, [(300, 0, 800, 300)], max_area=1500, white=226)
    for m in masks: alpha[ndi.binary_dilation(m, structure=K3, iterations=1)] = 1.0
    alpha = defringe(a, alpha, 205)
    im, off = fxp.layer(rgb, alpha, 4)
    d = dict(file=tp.save_png(n, im), w=im.size[0], h=im.size[1], ox=off[0], oy=off[1])
    d.update(face)
    sp_ = float(np.hypot(face['eyes'][1]['cx'] - face['eyes'][0]['cx'], face['eyes'][1]['cy'] - face['eyes'][0]['cy']))
    d['ek'] = round(106.0 / sp_, 4)
    d['skin'] = '#fed38d'
    if mouth: d['grin'] = grin_box(a, mouth, (470, 300, 490, 320)); d['grin']['skin'] = '#fed38d'
    print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'ek')}, 'eyes spacing', round(sp_, 1))
    return d


# ------------------------------------------------------------------ the people
MOMZ =[(300, 20, 700, 300), (300, 300, 400, 520), (575, 300, 700, 520)]   # the zones of hair and shoulders whose white pockets are cleared (x18's)


def drop_whites(a, alpha, boxes, amin, amax, white=215):
    """near-white pieces that are the paper of the picture shut in by the figure (between the legs and the table's foot, inside a handle): every piece of at least `amin` and at most `amax` px whose box lies inside one of `boxes` (x0, y0, x1, y1, picture px) is made
    transparent, with the pale ring round it; a white that belongs to the figure (a shoe's sole, the tumbler's lid, a dinosaur) is a different size or place and stays"""
    near = (a.min(axis=2) >= white) & (a.max(axis=2) - a.min(axis=2) < 40) & (alpha > 0.02)
    lab, k = ndi.label(near)
    al = alpha.copy()
    for j in range(1, k + 1):
        ys, xs = np.where(lab == j)
        if not (amin <= len(ys) <= amax): continue
        if any(xs.min() >= x0 and xs.max() <= x1 and ys.min() >= y0 and ys.max() <= y1 for x0, y0, x1, y1 in boxes):
            al[lab == j] = 0.0
    removed = (al < 0.02) & (alpha > 0.02)
    ring = ndi.binary_dilation(removed, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= 225)
    al[ring] = 0.0
    return al


def people(which):
    out = {}
    # the mom at x18's table: panic (head snapped up, hands out), proud (pointing right), plead (hands clasped). The mouths are painted (open in a shout, in a big smile, small and wobbling): they stay as painted; the code draws her lids (a blink) over the
    # painted eyes. Her eye whites (DONE.txt) are measured here
    for n, whites, big in (('mom-panic', [(403, 300, 484, 405), (487, 300, 570, 405)], [(570, 430, 720, 760)]), ('mom-proud', [(405, 300, 491, 404), (492, 300, 577, 404)], [(590, 560, 720, 760)]), ('mom-plead', [(392, 309, 485, 420), (487, 309, 580, 420)], [])):
        if not have(n): continue
        face, masks = face_of(load(n), whites, (380, 240, 600, 500))
        def fix(a, alpha, masks=masks, big=big):   # the white wedge between her arm, the jacket and the tumbler is paper (shut in); the eyes' whites that the flood fill leaked into at their outer edges are put back
            al = clean_pockets(a, alpha, big, max_area=40000, white=232) if big else alpha.copy()
            al = drop_whites(a, al, [(780, 590, 830, 690)], 1800, 2500)   # (the white inside the tumbler's handle)
            for m in masks: al[ndi.binary_dilation(m, structure=K3, iterations=1)] = 1.0
            return al
        d, alpha, rgb, a = sprite(n, pockets=MOMZ, fix=fix)
        d.update(face)
        out[n.replace('-', '_')] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'skin', 'white')}, 'pupils', d['pupils'])
    # the toddler at his table (the master's head to the pixel: the eyes and pupils are x18's), sitting and with the popcorn
    for n, mouth in (('toddler-sit', [492, 440, 536, 482]), ('toddler-popcorn', [488, 420, 544, 452])):
        if not have(n): continue
        def temples(a, alpha):   # the white that the hair shuts in at the two temples (outside the eyes' x range and above the cheeks)
            yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
            z = (yy >= 235) & (yy < 420) & ((xx < 392) | (xx > 640))
            w = (a.min(axis=2) >= 200) & (a.max(axis=2) - a.min(axis=2) < 36) & z & (alpha > 0.02)
            al = alpha.copy(); al[w] = 0.0
            al[ndi.binary_dilation(al < 0.02, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= 185) & z] = 0.0
            return drop_whites(a, al, [(360, 740, 662, 925)], 1500, 4500)   # (the paper between each leg and the table's foot: two pieces of about 3800 px, x 374-481 and 547-645; the shoes' soles, 1000 px, are wider than this box or lie outside it)
        d, alpha, rgb, a = sprite(n, pockets=[(200, 0, 840, 292), (456, 690, 575, 900)], fix=temples)
        d['eyes'] = two_eyes([], 465, 564, 347, 50, 54)
        d['pupils'] = [[491.0, 346.3, 9.0], [539.0, 346.6, 9.0]]
        d['anchor'] = [514.5, 347.0]
        d['skin'] = skin_of(a, (370, 360, 650, 470))
        d['white'] = '#fdfdfb'
        d['grin'] = grin_box(a, mouth, (440, 440, 470, 455)); d['grin']['skin'] = d['skin']
        out[n.replace('-', '_')] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'skin')}, 'grin', d['grin']['box'])
    # the mom standing by the stroller (the TV and the stroller of that picture are not used: the stroller TV is prop-stroller-tv's): only her, with the hand that rested on the TV's rim (the skin round it goes with her, the blue rim does not)
    n = 'mom-stroller'
    if have(n):
        face, masks = face_of(load(n), [(740, 229, 786, 280), (789, 229, 836, 280)], (735, 215, 845, 330))
        def only_her(a, alpha, masks=masks):
            yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
            skin = (a[..., 0] >= 235) & (a[..., 1] >= 190) & (a[..., 1] <= 238) & (a[..., 2] >= 120) & (a[..., 2] <= 195)
            hand = ndi.binary_dilation(skin & (xx >= 600) & (xx < 700) & (yy >= 360) & (yy < 460), structure=K3, iterations=3)
            al = alpha.copy(); al[((xx < 636) | ((xx < 690) & (yy >= 480))) & ~hand] = 0.0
            for m in masks: al[ndi.binary_dilation(m, structure=K3, iterations=1)] = 1.0
            return al
        d, alpha, rgb, a = sprite(n, pockets=[(700, 60, 900, 340), (780, 540, 880, 840)], fix=only_her)
        d.update(face)
        d['hand'] = [636, 400]
        out['mom_stroller'] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'anchor', 'skin')}, 'pupils', d['pupils'])
    out.update(customers())
    if have('ross-blown'): out['ross_blown'] = flat_ross('ross-blown', [(418, 194, 510, 292), (514, 199, 607, 302)])
    if have('ross-usher'): out['ross_usher'] = flat_ross('ross-usher', [(416, 212, 501, 302), (505, 217, 589, 311)], mouth=[470, 330, 530, 362])
    # the two pointing hands: Ross's (his tattoo sleeve and watch come in from the left, the finger points right) and the mom's (her lavender sleeve from the right, the finger points left)
    for n, tip in (('hand-ross-point', (738, 530)), ('hand-mom-point', (145, 520))):
        if not have(n): continue
        d, alpha, rgb, a = sprite(n, protect=False, fringe=215)
        d['tip'] = list(tip)
        out[n.replace('-', '_')] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'tip', d['tip'])
    return out


# ------------------------------------------------------------------ props
def black_box(a, thr=40, region=None):
    """the box of the biggest nearly black piece (a screen)"""
    m = a.max(axis=2) < thr
    if region is not None:
        z = np.zeros(m.shape, bool); x0, y0, x1, y1 = region; z[y0:y1, x0:x1] = True; m &= z
    lab, k = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, k + 1)); j = 1 + int(np.argmax(sizes))
    ys, xs = np.where(lab == j)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def screen_hole(a, seed, thr):
    """the black screen of a picture as a mask: the piece of nearly black pixels (all channels under `thr`) that holds the picture point `seed`, its holes filled"""
    lab, k = ndi.label(a.max(axis=2) < thr)
    pick = lab[seed[1], seed[0]]
    assert pick, f'no black screen at {seed}'
    return ndi.binary_fill_holes(lab == pick)


def muffin():
    """the muffin and its plate as two layers. The muffin is what is coloured (the dome, the liner and the berries, closed over their dark lines) with the black outline just outside it; the plate is the rest. The plate's far half is behind the muffin in the picture, so
    the plate is made from its near half and the same half turned over about the ellipse's middle row (a plate is symmetric, and a far rim drawn in the near rim's own line makes no seam); the cup's footprint in the near half is the well's plain white"""
    n = 'prop-muffin'
    a = load(n)
    alpha, rgb = nvp.cut(a, False)
    H, W = alpha.shape
    yy, xx = np.mgrid[0:H, 0:W]
    sat = ((a.max(axis=2).astype(int) - a.min(axis=2)) > 45) & (alpha > 0.5)
    core = ndi.binary_fill_holes(ndi.binary_closing(sat, structure=K3, iterations=6))
    lab, k = ndi.label(core)
    body = lab == (1 + int(np.argmax(ndi.sum(core, lab, range(1, k + 1)))))
    ring = (ndi.binary_dilation(body, structure=K3, iterations=7) | (ndi.binary_dilation(body, structure=K3, iterations=10) & (yy >= 715))) & (alpha > 0.02) & (a.max(axis=2) < 150)   # (its black outline, thicker under the liner, and the hairline between the stripes of the liner)
    mm = body | ring
    d_m = save_png('muffin', rgb, defringe(a, alpha * mm.astype(np.float32)))
    C = 697   # the plate's middle row: its outline's top and bottom at x = 130 ... 300 (642 / 748, 612 / 780, 591 / 805) are 697 +- 2 either side
    near_al = alpha * (~ndi.binary_dilation(mm, structure=K3, iterations=1)).astype(np.float32)
    foot = ndi.binary_dilation(mm, structure=K3, iterations=6) & (yy >= C) & (yy <= 745)
    near_rgb = rgb.copy(); near_rgb[foot] = (255, 255, 255); near_al[foot] = 1.0
    near_al = defringe(a, near_al)
    y1 = int(np.where((near_al[:, 100:900] > 0.5).any(axis=1))[0].max())
    out_rgb, out_al = np.zeros_like(rgb), np.zeros_like(alpha)
    for y in range(2 * C - y1, y1 + 1):
        src = y if y >= C else 2 * C - y
        out_rgb[y], out_al[y] = near_rgb[src], near_al[src]
    shut = ndi.binary_fill_holes(out_al > 0.5) & (out_al <= 0.5)   # (a hairline at the middle row where the footprint's two halves meet)
    out_rgb[shut] = (255, 255, 255); out_al[shut] = 1.0
    d_p = save_png('muffin-plate', out_rgb, out_al)
    print('  muffin:', {k: d_m[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'plate:', {k: d_p[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'middle row', C, 'bottom', y1)
    ys, xs = np.where(body)
    d_m['foot'] = [int((xs.min() + xs.max()) / 2), int(ys.max()) + 8]
    d_p['mid'] = C
    return d_m, d_p


def props():
    out = {}
    if have('prop-tablet'):
        d, alpha, rgb, a = sprite('prop-tablet', protect=False)
        hole = screen_hole(a, (673, 380), 40)
        alpha = alpha * (~hole).astype(np.float32)   # the screen is a hole in the case: the scenes draw its content behind the picture
        d = save_png('prop-tablet', rgb, alpha)
        ys, xs = np.where(hole)
        d['screen'] = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
        d['case'] = [192, 28, 1153, 730]
        d['keys'] = [[1153, 250], [1153, 330]]
        out['tablet'] = d
        print('  tablet:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'screen')})
    if have('prop-muffin'): out['muffin'], out['muffin_plate'] = muffin()
    if have('prop-stroller'):
        d, alpha, rgb, a = sprite('prop-stroller', protect=False)
        out['stroller'] = d
        print('  stroller:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('prop-stroller-tv'):
        a = load('prop-stroller-tv')
        alpha, rgb = nvp.cut(a, False)
        alpha = defringe(a, alpha, 215)
        yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
        hole = screen_hole(a, (500, 300), 26)
        tv = save_png('stv-tv', rgb, alpha * ((yy <= 532) & ~hole).astype(np.float32))
        st = save_png('stv-stroller', rgb, alpha * (yy > 532).astype(np.float32))
        ys, xs = np.where(hole)
        tv.update(screen=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)], hinge=[514, 532], rim=[116, 60, 913, 532])
        st.update(foot=[510, 945])
        out['stv_tv'], out['stv_stroller'] = tv, st
        print('  stroller TV:', {k: tv[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'screen')}, '| stroller', {k: st[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('prop-rack'):
        d, alpha, rgb, a = sprite('prop-rack', protect=False)
        d['backboard'] = [272, 18, 1072, 660]
        d['board_colour'] = hexc(med(a, 280, 560, 300, 600))
        d['hooks'] = [385, 573, 762, 947]
        d['plugs'] = [[322, 345, 448, 511], [514, 345, 640, 511], [703, 345, 828, 511], [887, 345, 1013, 511]]
        d['unit_y'] = [172, 572]
        # the rack with its first charger taken off (loop, brick and prongs painted over with the board's colour; the hook bar stays): shot 28
        ox, oy = d['ox'], d['oy']
        zone = np.zeros(alpha.shape, bool); zone[oy + 158:oy + 574, ox + 55:ox + 226] = True
        board = np.median(rgb[oy + 250:oy + 500, ox + 36:ox + 56].reshape(-1, 3), axis=0)
        rgb2 = rgb.copy(); rgb2[zone] = board
        gone = save_png('prop-rack-gone', rgb2, alpha)
        d['board'] = hexc(board); d['gone'] = gone
        out['rack'] = d
        print('  rack:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy', 'board_colour')})
    if have('prop-charger'):
        d, alpha, rgb, a = sprite('prop-charger', protect=False)
        d['block'] = [400, 142, 622, 358]
        out['charger'] = d
        print('  charger:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('prop-switch'):
        d, alpha, rgb, a = sprite('prop-switch', protect=False)
        d['rocker'] = [475, 420, 549, 609]; d['opening'] = [458, 400, 566, 628]
        d['rocker_colour'] = hexc(med(a, 500, 480, 520, 540)); d['plate_colour'] = hexc(med(a, 700, 300, 740, 340)) if a.shape[1] > 740 else '#fdfdf8'
        out['switch'] = d
        print('  switch:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return out


ROSS_POSES = {'headphones': 'ross-headphones'}


def puppets(which):
    """Ross's headphones pose registered on x08's master head (the picture's head is the master's to the pixel): the body of the picture, the head x08's as painted; the other poses of this episode are x10's apron body and the two flat pictures"""
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


def debug_sheet(rig, names, path):
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
        if d.get('tip'): tx, ty = d['tip']; dr.ellipse([tx - ox - 5, ty - oy - 5, tx - ox + 5, ty - oy + 5], fill=(255, 0, 255, 255))
        s_ = 460 / max(bg.size); tiles.append((n, bg.convert('RGB').resize((max(1, int(bg.width * s_)), max(1, int(bg.height * s_))))))
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (cols * 470 + 10, rows * 490 + 10), (30, 30, 30)); dr = ImageDraw.Draw(sh)
    for i, (n, im) in enumerate(tiles):
        x, y = 10 + (i % cols) * 470, 10 + (i // cols) * 490
        sh.paste(im, (x, y + 20)); dr.text((x, y + 4), n, fill=(255, 255, 255))
    sh.save(path, quality=88)


def debug_customers(rig, path):
    """the four layers of each state put back together on a grey ground, the cut lines in yellow and the glazed row's eyes and pupils on it"""
    rows = []
    for state in ('plain', 'glazed', 'cash'):
        bg = Image.new('RGBA', (1344, 768), (110, 110, 150, 255))
        for i in range(4):
            d = rig.get(f'cust_{state}_{i + 1}')
            if not d: continue
            bg.alpha_composite(Image.open(os.path.join(ROOT, 'public', d['file'])).convert('RGBA'), (d['ox'], d['oy']))
            t = rig.get(f'cust_{state}_{i + 1}_tab')
            if t: bg.alpha_composite(Image.open(os.path.join(ROOT, 'public', t['file'])).convert('RGBA'), (t['ox'], t['oy']))
        dr = ImageDraw.Draw(bg)
        for x in CUST_X[1:-1]: dr.line([x, 0, x, 768], fill=(255, 255, 0, 255), width=1)
        if state == 'glazed':
            for i in range(4):
                d = rig.get(f'cust_glazed_{i + 1}')
                for e in d.get('eyes', []): dr.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0, 255), width=2)
                for q in d.get('pupils', []): dr.ellipse([q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]], outline=(0, 255, 0, 255), width=2)
        rows.append(bg.convert('RGB').resize((1000, 571)))
    sh = Image.new('RGB', (1000, 571 * 3 + 20), (30, 30, 30))
    for i, r in enumerate(rows): sh.paste(r, (0, i * 581))
    sh.save(path, quality=88)


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    rig.setdefault('people', {}); rig.setdefault('props', {}); rig.setdefault('plates', {}); rig.setdefault('puppets', {'ross': {'bodies': {}}})
    if not only or 'pane' in only:
        rig['plates']['pane'] = pane(); print('  done pane')
    if not only or 'people' in only:
        rig['people'].update(people(only)); print('  done people')
        debug_sheet(rig['people'], ['mom_panic', 'mom_proud', 'mom_plead', 'mom_stroller', 'toddler_sit', 'toddler_popcorn', 'ross_blown', 'ross_usher', 'hand_ross_point', 'hand_mom_point'], os.path.join(DBG, 'people-sheet.jpg'))
        debug_customers(rig['people'], os.path.join(DBG, 'customers-sheet.jpg'))
    if not only or 'props' in only:
        rig['props'].update(props()); print('  done props')
        debug_sheet(rig['props'], ['tablet', 'muffin', 'muffin_plate', 'stroller', 'stv_tv', 'stv_stroller', 'rack', 'charger', 'switch'], os.path.join(DBG, 'props-sheet.jpg'))
    pw = [k for k in ('ross',) if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        x17p.debug_sheet17(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
