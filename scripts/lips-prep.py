# Prep for "Cold Lips" (docs/x06-cold-lips.md): cuts the Qwen pictures of out/sp-cast7 (scripts/lips-art-gen.py) into puppet parts, props and a plate the way scripts/pen-prep.py cuts "I'm Just Not a Sales Person"
# (this script reuses tip-prep.py's puppet(), prop() and finders with its own source folder, debug folder and file prefix, and patches five of its functions in its own namespace), and measures what the code needs.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-prep.py            -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-prep.py todd       -> only that puppet (customer | todd), without the extras: src/lips-rig-part.json (it rewrites that puppet's layers without the extras, e.g. the dryer pose's
#                                                                            waist cut: run the whole script again before using the files)
# Writes public/sp/lips-*.png|jpg, src/lips-rig.json (px of the 768x1344 pictures, y down), scratch/lips-prep/* (the debug sheets: cast-sheet.jpg, plate-numbers.jpg), and out/lips-cast/sheet.jpg (every new piece on grey, named) and
# out/lips-cast/composite.jpg (the customer in 'rat' with the sour dog in her purse and Todd in 'beg' over the wide plate of "Tip?", with Denise: the sizes side by side), out/lips-cast/side.jpg (the two profile pieces of the kiss, public/sp/lips-customer-side.png and lips-todd-side.png, with the points of the `side` block of src/lips-rig.json, and the pair in position at the kneeling shot's scales over the plate) and out/lips-cast/side-composite.jpg (that frame in full).
# Every character with poses has ONE head, the master's (tip-prep.py); the others are pictures with one cut each. Faces are done the way tip-prep.py does them: the drawn mouth (and the drawn brows) are painted out of the head,
# the eye whites and pupils are measured, and the code draws mouths, lids, pupils and brows (src/sp-puppet.tsx).
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('tp', os.path.join(HERE, 'tip-prep.py'))
tp = importlib.util.module_from_spec(spec); spec.loader.exec_module(tp)
spp, nvp, fxp = tp.spp, tp.nvp, tp.fxp
ROOT, OUT, K3 = tp.ROOT, tp.OUT, tp.K3
SRC = os.path.join(ROOT, 'out', 'sp-cast7')
DBG = os.path.join(ROOT, 'scratch', 'lips-prep')
os.makedirs(DBG, exist_ok=True)


LOADED, KEEP = {}, []  # id of a loaded picture -> its name (register() below looks a pose's shift up by it); KEEP holds the arrays so that an id is never reused


def load7(name):
    a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)
    if name == 'customer-rat-72': a = soft_white(a, CUP_BOX)
    a = ivory(a) if name.startswith('customer') else a
    LOADED[id(a)] = name; KEEP.append(a)
    return a


CUP_BOX = (0, 480, 260, 780)  # the rat pose's cup and the hand that holds it (the head is above and to the right of this box)


tp.DBG, tp.PFX, tp.load3 = DBG, 'lips', load7

# Two poses reach out so far that registering them on the master's head puts a hand or a cup past the frame of the 768x1344 picture, which cuts it off: the rat's cup (3.5 px past the left edge) and Todd's right hand in 'beg' (7 px past
# the right edge). Their pictures are registered 4.5 % smaller than their heads say (about the head, which stays where the master's is): the body's own head is cut away anyway, and the arms are 4.5 % shorter, which nobody can
# see; the cup ends 9 px and the hand 9 px inside the frame
SCALE = {'customer-rat-72': 0.955, 'todd-beg-73': 0.955}
register0 = tp.register


def register(a, disc_a, disc_m, k=1.0, shift=(0, 0)):
    return register0(a, disc_a, disc_m, k * SCALE.get(LOADED.get(id(a)), 1.0), shift)


tp.register = register


# ------------------------------------------------------------------ finders (tip-prep.py's, with the changes this cast needs)
def find_eyes(a):
    """tip-prep's find_eyes, but a blob taller or wider than 90 px (a half-eye is 55-70) is not an eye: Todd's white shirt, cut in two by his red tie, is a pair of two big similar blobs side by side
    that beats the eyes on area"""
    H, W, _ = a.shape
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    blobs, every = [], []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 2500 or xs.min() == 0 or ys.min() == 0 or xs.max() == W - 1 or ys.max() == H - 1: continue
        rx, ry = (xs.max() - xs.min() + 1) / 2, (ys.max() - ys.min() + 1) / 2
        B = dict(area=len(ys), cx=(xs.min() + xs.max() + 1) / 2, cy=(ys.min() + ys.max() + 1) / 2, rx=rx, ry=ry)
        every.append(B)
        if rx <= 90 and ry <= 90: blobs.append(B)
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
        for B in every:
            if 1.5 <= (2 * B['rx']) / (2 * B['ry']) <= 2.8 and B['cy'] < 0.5 * H:
                w, h = 2 * B['rx'], 2 * B['ry']
                return [dict(area=B['area'] // 2, cx=B['cx'] - w / 4, cy=B['cy'], rx=w / 4, ry=h / 2), dict(area=B['area'] // 2, cx=B['cx'] + w / 4, cy=B['cy'], rx=w / 4, ry=h / 2)]
        raise RuntimeError('no eyes found')
    return sorted([best[1], best[2]], key=lambda e: e['cx'])


tp.find_eyes = find_eyes


def brows_of_ink(a, eyes, lo=60):
    """Todd's brows are tapered strokes whose tips are lighter than tip-prep's dark limit and curl down onto the eye's outline, so the dark-pixel rule left their outer tails in the head. Here a stroke is every pixel that differs from the skin
    between the brows by more than 40 in some channel, in a zone from 1.9 to 0.55 eye heights above the eye's centre (and up to 1.15 eye widths outward) and outside the eye's own outline (its ellipse grown by 4 px); returns the polylines [x, y, thickness] every 4 px and the mask,
    like tip-prep's brows_of"""
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    L, R = eyes
    mx, cy, ry = (L['cx'] + R['cx']) / 2, (L['cy'] + R['cy']) / 2, (L['ry'] + R['ry']) / 2
    skin = np.median(a[int(cy - 1.75 * ry):int(cy - 1.45 * ry), int(mx - 10):int(mx + 10)].reshape(-1, 3), axis=0)
    ink = np.abs(a - skin).max(axis=2) > 40
    out, mask = [], np.zeros((H, W), bool)
    for k, e in enumerate(eyes):
        x0, x1 = (e['cx'] - 1.15 * e['rx'], e['cx'] + 0.95 * e['rx']) if k == 0 else (e['cx'] - 0.95 * e['rx'], e['cx'] + 1.15 * e['rx'])
        zone = (xx >= x0) & (xx < x1) & (yy >= e['cy'] - 1.9 * e['ry']) & (yy < e['cy'] - 0.55 * e['ry']) & (((xx - e['cx']) / (e['rx'] + 4)) ** 2 + ((yy - e['cy']) / (e['ry'] + 4)) ** 2 > 1)
        lab, n = ndi.label(ink & zone, structure=np.ones((3, 3)))
        keep = []
        for i, sl in enumerate(ndi.find_objects(lab), 1):
            if lo <= (lab[sl] == i).sum() <= 3000 and (sl[0].stop - sl[0].start) < 0.8 * e['ry']: keep.append(i)  # (a brow is a flat stroke: a hair strand or a sweat drop's line that runs up the temple is taller)
        sizes = [(lab == i).sum() for i in keep]
        m = np.isin(lab, [keep[int(np.argmax(sizes))]])  # (the brow is the biggest flat stroke of the zone)
        mask |= m
        cols = np.where(m.any(axis=0))[0]
        pts = []
        for x in cols[::4]:
            ys = np.where(m[:, x])[0]
            pts.append([int(x), round(float(ys.mean()), 1), int(ys.max() - ys.min() + 1)])
        out.append(pts)
    return out, mask


def brows_of(a, eyes, thr=70):
    """tip-prep's brows_of for the customer (dark brown strokes), brows_of_ink for Todd (BROWS is set per puppet)"""
    return brows_of_ink(a, eyes) if BROWS == 'ink' else brows_of0(a, eyes, 70)


brows_of0, BROWS = tp.brows_of, 'dark'
tp.brows_of = brows_of


# ------------------------------------------------------------------ the hair rules (tip-prep.py's head_pix knows brown, red, black and grey)
def pearls_of(a, disc):
    """the customer's pearl earrings: small enclosed near-white discs beside the jaw (an eye white is 10 times bigger, a fleck of the background is not round): [x0, y0, x1, y1] boxes, left one first"""
    cx, cy, r = disc
    H, W, _ = a.shape
    lab, n = ndi.label(a.min(axis=2) >= 200)  # (a pearl has a grey shading and a grey outline: its white is 200-255)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        m = lab[sl] == i
        if not (150 <= m.sum() <= 2000 and 0.6 <= w / h <= 1.5 and m.sum() >= 0.55 * w * h): continue
        px, py = (sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2
        if 0.55 * r <= abs(px - cx) <= 1.5 * r and cy - 0.5 * r <= py <= cy + 1.0 * r: out.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    return sorted(out)


def ivory(a):
    """the customer's pearls: their white is a small bright highlight (240-255) inside a grey ball. The pocket rule and the fleck rule take any near-white spot outside the face for the background, which left a hole in each highlight,
    so the highlights are made ivory (about 245, 242, 224): not near-white for any rule, and still a white-looking pearl"""
    out = a.copy()
    disc = tp.face_of(a)[3]
    for x0, y0, x1, y1 in pearls_of(a, disc):
        sub = out[y0 - 1:y1 + 1, x0 - 1:x1 + 1]
        white = sub.min(axis=2) >= 226
        sub[white] = sub[white] * np.array([0.96, 0.95, 0.88])
    return out


def soft_white(a, box):
    """the white paper cup of the rat pose: its outline is a faint grey line, and registering the picture (a scale and a shift) thins it until the flood fill of the white background gets through it, so the cup came out hollow.
    The white inside every enclosed near-white blob in `box` (x0, y0, x1, y1) is made 5 % darker (about 235): not near-white, so nothing can take it for the background"""
    out = a.copy()
    x0, y0, x1, y1 = box
    lab, n = ndi.label(a.min(axis=2) >= 238)
    H, W, _ = a.shape
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W: continue  # (the background touches the border)
        m = lab == i
        if m.sum() < 300 or not (x0 <= (sl[1].start + sl[1].stop) / 2 <= x1 and y0 <= (sl[0].start + sl[0].stop) / 2 <= y1): continue
        out[m] = out[m] * 0.945
    return out


head_pix0 = tp.head_pix


def head_pix(a, face, disc, how, limit=None):
    """tip-prep's head_pix plus two rules. 'yellow': the customer's golden bob (a saturated yellow, red far over blue; the skin is red only 100 over blue, the coat 30 and the leather purse is far from yellow in green), down to
    the ends of the bob under the chin, with her pearl earrings taken whole. 'brown': Todd's light brown hair, sampled from the top of the head (tip-prep's 'dark' is for Denise's dark brown: Todd's is lighter than its limit)"""
    if isinstance(how, tuple) or how not in ('yellow', 'brown'): return head_pix0(a, face, disc, how, limit)
    cx, cy, r = disc
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    whole = np.zeros((H, W), bool)
    if how == 'yellow':
        rows = yy < cy + 1.3 * r
        m = (a[..., 0] - a[..., 2] > 120) & (a[..., 1] > 110) & (a[..., 1] - a[..., 2] > 60) & (np.abs(xx - cx) < 1.9 * r)
        for x0, y0, x1, y1 in pearls_of(a, disc): whole[y0:y1, x0:x1] = True
        whole &= a.min(axis=2) >= 150
    else:
        rows = yy < cy + 0.55 * r
        top = np.zeros((H, W), bool); top[max(0, int(cy - 1.3 * r)):int(cy - 0.55 * r), int(cx - 0.9 * r):int(cx + 0.9 * r)] = True
        skin = np.median(a[int(cy):int(cy + 0.3 * r), int(cx - 0.2 * r):int(cx + 0.2 * r)].reshape(-1, 3), axis=0)
        pick = top & (a[..., 0] - a[..., 2] > 40) & (a.max(axis=2) < 215) & (np.abs(a - skin).max(axis=2) > 45) & (a.min(axis=2) > 25)
        col = np.median(a[pick], axis=0) if pick.sum() > 50 else np.array([160., 112., 62.])
        m = (np.abs(a - col).max(axis=2) < 60) & (a[..., 0] - a[..., 2] > 30) & (np.abs(xx - cx) < 1.4 * r)
        pink = (a[..., 0] > 170) & (a[..., 0] - a[..., 1] > 60) & (a[..., 2] - a[..., 1] > 20)  # the hair dryer's dark outline is brown-red like the hair: nothing within 6 px of its hot pink is hair
        m &= ~ndi.binary_dilation(pink, structure=K3, iterations=6)
    if limit is not None: rows = rows & (yy < limit)
    hair = (ndi.binary_dilation(m, structure=K3, iterations=3) & rows) | ndi.binary_dilation(whole, structure=K3, iterations=2)
    return hair | ndi.binary_dilation(face, structure=K3, iterations=3)


tp.head_pix = head_pix


# ------------------------------------------------------------------ the cast
MASTER_CUSTOMER, MASTER_TODD = 'customer-stand-71', 'todd-kneel-73'
CAST = {
    # the customer: seed 71 in all three poses (the head is r 132, 134 and 133 px in them). The head is the master's (the standing picture): the golden bob, the sunglasses on top of it (the 'black' rule takes them with the temples),
    # the pearl earrings (taken whole by the 'yellow' rule; ivory() keeps their highlights from the pocket and fleck rules, which take any white spot outside the face for background). `oval`: her face is bounded by the bob's straight sides
    'customer': dict(master=MASTER_CUSTOMER, poses={'stand': 'customer-stand-71', 'rat': 'customer-rat-72', 'phone': 'customer-phone-71'}, mouth=(340, 410, 420, 440, 190), mouthW=58, code_brows=True, hair=('yellow', 'black'), oval=True, specks=1500, thin=3),
    # Todd: seed 73 in all five poses (the costume is drawn alike in them: the same stubby tie, the same big dark patches). The master is the kneeling picture, its head is r 181 px: beg (173), jump (171) and dryer (174) register
    # 1.05, 1.06 and 1.04 times bigger, the pointing picture (r 220) 0.82 times (a smaller body never cuts a foot off). The standing picture (r 195) is not used. `oval`: the white collar and shoulders touch the head (tip-prep's pocket
    # rule takes white next to a round head for background); `fleck_y`, `fleck_min`: the white flecks of the hair are only in the rows of the hair and are pale (Todd's white shirt is not a fleck); brows: brows_of_ink
    'todd': dict(master=MASTER_TODD, poses={'point': 'todd-point-73', 'beg': 'todd-beg-73', 'kneel': 'todd-kneel-73', 'jump': 'todd-jump-73', 'dryer': 'todd-dryer-73'}, mouth=(350, 530, 430, 562, 190), mouthW=64, code_brows=True, hair='brown', oval=True, thin=2, specks=1500, fleck_y=480, fleck_min=205),
}



# ------------------------------------------------------------------ what the code needs besides the puppets
def registered(cfg, pfile):
    """a pose's picture as tip-prep's puppet() puts it on the master: scaled and shifted so that its head lands on the master's (the same calls, so the numbers measured here are in the rig's px)"""
    master = load7(cfg['master'])
    if pfile == cfg['master']: return master
    face_m, _, _, disc = tp.face_of(master)
    a0 = load7(pfile)
    blob0, _, _, d_p = tp.face_of(a0)
    return tp.register(a0, d_p, disc, *(tp.refit(blob0, d_p, disc, face_m) if cfg.get('oval') else ()))


def purse_of(a, disc):
    """where the dog goes: the customer's purse is a caramel-brown leather bucket (red far over blue, green well under red) with a long strap and a wide open top; the open top shows a dark brown ellipse (the inside: warm, red over blue,
    so not the black of the phone or the sunglasses). Looked for under the head and on her left side (the right of the picture). Returns, in px of the registered picture: `x`, `y` = the middle of the opening's front edge (the dog's paws
    rest on it), `w` = the bag's outer width just under that edge, `inner` = [x0, back, x1, front] of the dark inside"""
    H, W, _ = a.shape
    cx, cy, r = disc
    yy, xx = np.mgrid[0:H, 0:W]
    leather = (a[..., 0] - a[..., 2] > 70) & (a[..., 0] > 110) & (a[..., 1] < a[..., 0] - 35) & (a[..., 1] > 35) & (yy > cy + 1.4 * r) & (xx > cx - 0.2 * r)
    lab, n = ndi.label(ndi.binary_closing(leather, structure=K3, iterations=2))
    big = 1 + int(np.argmax(ndi.sum(leather, lab, range(1, n + 1))))
    bag = lab == big
    ys, xs = np.where(bag)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    box = np.zeros((H, W), bool); box[by0 - 4:by1 + 4, bx0 - 4:bx1 + 4] = True
    inside = ndi.binary_opening((a.max(axis=2) < 115) & (a[..., 0] - a[..., 2] >= 8) & box, structure=np.ones((7, 7), bool))  # (opened: the bag's dark outline strokes are 2-3 px and would join the ellipse to the strap and the seams)
    il, k = ndi.label(inside, structure=K3)
    sizes = ndi.sum(inside, il, range(1, k + 1))
    cand = [i + 1 for i, v in enumerate(sizes) if v > 200]
    # the opening is the dark blob whose middle is highest in the bag (the strap's shadows and the bag's seams are lower or thinner)
    best = min(cand, key=lambda i: np.where(il == i)[0].mean())
    iy, ix = np.where(il == best)
    x0, x1 = int(ix.min()), int(ix.max() + 1)
    mid = int(round((x0 + x1) / 2))
    col = np.where(il[:, mid] == best)[0]
    rim = int(col.max() + 1)
    row = np.where(bag[min(rim + 3, H - 1)])[0]  # the bag's leather just under the opening's front edge: its outer width there (the strap is not at this row)
    return dict(x=round((x0 + x1) / 2, 1), y=rim, w=int(row.max() - row.min() + 1), inner=[x0, int(col.min()), x1, rim])


def badge_of(a, disc):
    """Todd's badge: a plain flat black rectangle (about 60 x 40 px) on his chest with a small clip tab on top; the code writes TODD / MANAGER on it. The neutral-black blobs under the chin (not the brown belt and shoes, not the
    cable of the hair dryer, which is thin), the biggest one that is a filled rectangle; its main rectangle is the rows that are nearly as wide as the widest one (the tab is narrower). Returns [cx, cy, w, h, angle] in px of the
    registered picture, w along the long side, angle in degrees (0 = level, positive turns it clockwise on the picture)"""
    H, W, _ = a.shape
    cx, cy, r = disc
    yy, xx = np.mgrid[0:H, 0:W]
    black = (a.max(axis=2) < 60) & (np.abs(a[..., 0] - a[..., 1]) < 20) & (np.abs(a[..., 1] - a[..., 2]) < 20) & (yy > cy + r + 15) & (yy < cy + r + 600)
    black = ndi.binary_opening(black, structure=np.ones((7, 7), bool))
    lab, n = ndi.label(black)
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i
        h, w = m.shape
        if m.sum() < 1200 or m.sum() < 0.6 * w * h or not 1.1 <= max(w, h) / max(min(w, h), 1) <= 3.0: continue
        if best is None or m.sum() > best[0]: best = (m.sum(), i)
    if best is None: raise RuntimeError('no badge found')
    m = lab == best[1]
    rows = np.where(m.any(axis=1))[0]
    widths = np.array([m[y].sum() for y in rows])
    main = rows[widths >= 0.85 * widths.max()]
    mm = np.zeros_like(m); mm[main.min():main.max() + 1] = m[main.min():main.max() + 1]
    ys, xs = np.where(mm)
    (bx, by), (w, h), ang = cv2.minAreaRect(np.stack([xs, ys], axis=1).astype(np.float32))
    if h > w: w, h, ang = h, w, ang + 90
    ang = ((ang + 45) % 90) - 45
    return [round(float(bx), 1), round(float(by), 1), round(float(w), 1), round(float(h), 1), round(float(ang), 1)]


def waist_of(a, disc):
    """the row just under Todd's belt (a band of dark brown across his middle, nearer the middle than the shoes): the dryer pose is cut off there, 'from the waist up'"""
    H, W, _ = a.shape
    cx, cy, r = disc
    belt = (a.max(axis=2) < 110) & (a[..., 0] - a[..., 2] > 15)
    rows = [y for y in range(int(cy + r + 120), H) if belt[y, int(cx - 100):int(cx + 100)].sum() > 80]
    if not rows: raise RuntimeError('no belt found')
    first = rows[0]
    band = [y for y in rows if y - first < 40]  # (the belt is 10-25 px tall; the shoes are far below)
    return int(max(band) + 4)


def cut_below(layer, y):
    """a body layer without everything under row y (px of the master picture): the pixels go transparent and the layer is cropped again; `layer` (x, y, w, h) is updated"""
    f = os.path.join(ROOT, 'public', layer['file'])
    im = np.array(Image.open(f).convert('RGBA'))
    im[max(y - layer['y'], 0):, :, 3] = 0
    ys, xs = np.where(im[..., 3] > 0)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    Image.fromarray(im[y0:y1, x0:x1], 'RGBA').save(f, optimize=True)
    layer.update(x=layer['x'] + int(x0), y=layer['y'] + int(y0), w=int(x1 - x0), h=int(y1 - y0))


# ------------------------------------------------------------------ the dog: three pictures of one size and one place
DOG_SEED = 74
DOG_STATES = ('neutral', 'sour', 'gasp')


def iou_fit(base, mov, scales=np.arange(0.90, 1.101, 0.02), reach=14, down=4):
    """the similarity transform (scale about the middle of the shape, then a shift) that puts the mask `mov` on the mask `base` best (intersection over union): searched on masks shrunk `down` times, then refined at full size.
    Returns the 2x3 matrix for cv2.warpAffine (full-size px)"""
    H, W = base.shape
    def centroid(m): ys, xs = np.where(m); return xs.mean(), ys.mean()
    (bx, by), (mx, my) = centroid(base), centroid(mov)
    def warp(m, s, dx, dy, size=None):
        M = np.array([[s, 0, bx + dx - s * mx], [0, s, by + dy - s * my]], np.float32)
        return M, cv2.warpAffine(m.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    def score(a, b): return np.minimum(a, b).sum() / max(np.maximum(a, b).sum(), 1)
    sb = cv2.resize(base.astype(np.float32), (W // down, H // down), interpolation=cv2.INTER_AREA)
    best = (-1, 1.0, 0.0, 0.0)
    for s in scales:
        for dy in range(-reach, reach + 1):
            for dx in range(-reach, reach + 1):
                M = np.array([[s, 0, (bx + dx * down - s * mx) / down], [0, s, (by + dy * down - s * my) / down]], np.float32)
                sm = cv2.warpAffine(cv2.resize(mov.astype(np.float32), (W // down, H // down), interpolation=cv2.INTER_AREA), M, (W // down, H // down), flags=cv2.INTER_LINEAR)
                sc = score(sb, sm)
                if sc > best[0]: best = (sc, s, dx * down, dy * down)
    sc0, s0, dx0, dy0 = best
    bf = base.astype(np.float32)
    for s in np.arange(s0 - 0.02, s0 + 0.0201, 0.005):
        for dy in range(int(dy0) - 5, int(dy0) + 6):
            for dx in range(int(dx0) - 5, int(dx0) + 6):
                M, w = warp(mov, s, dx, dy)
                sc = score(bf, w)
                if sc > best[0]: best = (sc, s, dx, dy)
    M, _ = warp(mov, best[1], best[2], best[3])
    return M, best[0]


def dog():
    """the chihuahua's head and the tops of its front paws in three faces, as three pictures of exactly the same size, each registered on the neutral one (the shape of the whole cut-out matched, so that the ears, the head and the paws
    stay where they were when the code swaps one picture for another). Returns the three files, the size and `anchor` = [x, y]: the middle of the paws' span and the bottom edge of the paws (where the purse's rim goes)"""
    cuts = {}
    for st in DOG_STATES:
        a = np.array(Image.open(os.path.join(SRC, f'dog-{st}-{DOG_SEED}.png')).convert('RGB')).astype(np.float32)
        alpha, rgb = nvp.cut(a)
        cuts[st] = (alpha, rgb)
    base = cuts['neutral'][0] > 0.5
    placed = {'neutral': cuts['neutral']}
    fits = {}
    for st in ('sour', 'gasp'):
        alpha, rgb = cuts[st]
        M, sc = iou_fit(base, alpha > 0.5)
        H, W = alpha.shape
        al = cv2.warpAffine(alpha, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=0)
        col = cv2.warpAffine(spp.bleed(rgb, alpha), M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        placed[st] = (np.clip(al, 0, 1).astype(np.float32), col)
        fits[st] = dict(iou=round(float(sc), 3), scale=round(float(M[0, 0]), 3), shift=[round(float(M[0, 2]), 1), round(float(M[1, 2]), 1)])
    union = np.zeros(base.shape, bool)
    for st in DOG_STATES: union |= placed[st][0] > 0.02
    ys, xs = np.where(union)
    pad = 3
    x0, y0, x1, y1 = max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, base.shape[1]), min(ys.max() + pad + 1, base.shape[0])
    files = {}
    for st in DOG_STATES:
        alpha, rgb = placed[st]
        out = np.zeros(alpha.shape + (4,), np.uint8)
        out[..., :3] = np.clip(spp.bleed(rgb, alpha), 0, 255).astype(np.uint8)
        out[..., 3] = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
        Image.fromarray(out[y0:y1, x0:x1], 'RGBA').save(os.path.join(OUT, f'lips-dog-{st}.png'), optimize=True)
        files[st] = f'sp/lips-dog-{st}.png'
    nb = placed['neutral'][0] > 0.5
    bys, bxs = np.where(nb)
    bottom = int(bys.max() + 1)
    low = nb[bottom - 40:bottom]  # the bottom 40 rows: the paws (and the chest between them)
    pxs = np.where(low.any(axis=0))[0]
    paws = [int(pxs.min() - x0), int(pxs.max() + 1 - x0)]
    res = dict(files=files, w=int(x1 - x0), h=int(y1 - y0), anchor=[round((paws[0] + paws[1]) / 2, 1), float(bottom - y0)], paws=paws, fit=fits)
    print('  dog', res)
    return res


# ------------------------------------------------------------------ the plate for the customer's close-ups
PLATE = 'bg-cafe-back-73'
# numbers read off the plate (the doorway's frame and opening, the window, where the floor meets the wall panelling, the counter's far edge and its front lip), px of the 768x1344 plate; scratch/lips-prep/plate-numbers.jpg draws them
SCENES = {'cafeBack': dict(frame=[267, 375, 512, 931], door=[293, 403, 485, 925], window=[0, 299, 162, 741], floor=930, counterTop=1024, lip=1095)}


def plate():
    a = load7(PLATE)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(OUT, 'lips-bg-cafeBack.jpg'), quality=95)
    y0 = SCENES['cafeBack']['counterTop']
    strip = Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[y0:].astype(np.uint8), 'RGBA')
    SCENES['cafeBack']['file'] = 'sp/lips-bg-cafeBack.jpg'
    im = Image.fromarray(a.astype(np.uint8)); d = ImageDraw.Draw(im)
    c = SCENES['cafeBack']
    d.rectangle(c['frame'], outline=(255, 0, 0), width=2); d.rectangle(c['door'], outline=(0, 255, 255), width=2); d.rectangle(c['window'], outline=(0, 255, 0), width=2)
    for y, col in ((c['floor'], (0, 0, 255)), (c['counterTop'], (255, 255, 0)), (c['lip'], (255, 0, 255))): d.line([0, y, 768, y], fill=col, width=2)
    im.resize((384, 672), Image.LANCZOS).save(os.path.join(DBG, 'plate-numbers.jpg'), quality=90)
    return dict(stripBack=dict(file=tp.save_png('fg-cafeBack', strip), y0=y0))


def dryer_of(layer):
    """Todd's hot-pink hair dryer in his 'dryer' body layer (what is left of it after the head is cut out of the body): its box and the nozzle's tip = the pink pixel furthest toward the face (the dryer points at his mouth from the
    side, so the furthest right), in px of the rig (picture px of the master): [x, y]"""
    im = np.array(Image.open(os.path.join(ROOT, 'public', layer['file'])).convert('RGBA')).astype(np.float32)
    pink = (im[..., 0] > 190) & (im[..., 1] < 150) & (im[..., 2] > 90) & (im[..., 0] - im[..., 1] > 70) & (im[..., 3] > 128)
    lab, n = ndi.label(pink)
    big = lab == (1 + int(np.argmax(ndi.sum(pink, lab, range(1, n + 1)))))
    ys, xs = np.where(big)
    xt = xs.max()
    tip = [round(float(xt + 1 + layer['x']), 1), round(float(ys[xs >= xt - 6].mean() + layer['y']), 1)]
    return dict(tip=tip, box=[int(xs.min() + layer['x']), int(ys.min() + layer['y']), int(xs.max() + 1 + layer['x']), int(ys.max() + 1 + layer['y'])])


# ------------------------------------------------------------------ the contact sheet of every piece and the test composite (out/lips-cast/)
CAST_OUT = os.path.join(ROOT, 'out', 'lips-cast')
GREY = (128, 128, 128)


def layers_of(rig, pose):
    return [rig['bodies'][pose] if 'bodies' in rig else rig['layers']['body'], rig['layers']['head']]


def sprite(L):
    return Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA')


def puppet_image(rig, pose, flip=False):
    """a puppet as one RGBA picture in rig px (the body, then the head over it) and where its neck pivot lies in it; `flip` mirrors the body about the neck and not the head (as src/sp-puppet.tsx does)"""
    px, py = rig['pivot']
    body, head = layers_of(rig, pose)
    bx = 2 * px - body['x'] - body['w'] if flip else body['x']
    x0, y0 = min(bx, head['x']), min(body['y'], head['y'])
    x1, y1 = max(bx + body['w'], head['x'] + head['w']), max(body['y'] + body['h'], head['y'] + head['h'])
    im = Image.new('RGBA', (int(x1 - x0), int(y1 - y0)), (0, 0, 0, 0))
    b = sprite(body)
    if flip: b = b.transpose(Image.FLIP_LEFT_RIGHT)
    im.paste(b, (int(bx - x0), int(body['y'] - y0)), b)
    h = sprite(head)
    im.paste(h, (int(head['x'] - x0), int(head['y'] - y0)), h)
    return im, (px - x0, py - y0)


def scaled(im, k):
    return im.convert('RGBa').resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS).convert('RGBA')


def cast_sheet(rigs, props):
    """every new piece on a mid-grey ground with its name under it: the two master heads, every pose assembled (body with the master's head on it), the three dog faces and the plate"""
    tiles = []
    for key in ('customer', 'todd'):
        rig = rigs[key]
        h = sprite(rig['layers']['head'])
        tiles.append((f'{key} head (master)', h))
        for pn in rig['bodies']: tiles.append((f'{key} {pn}', puppet_image(rig, pn)[0]))
    for st in DOG_STATES: tiles.append((f'dog {st}', Image.open(os.path.join(OUT, f'lips-dog-{st}.png')).convert('RGBA')))
    tiles.append(('plate cafe-back', Image.open(os.path.join(OUT, 'lips-bg-cafeBack.jpg')).convert('RGBA')))
    cw, ch, cols = 330, 460, 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * ch), GREY)
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        k = min((cw - 24) / im.size[0], (ch - 56) / im.size[1])
        t = scaled(im, k)
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(t, (x + (cw - t.size[0]) // 2, y + 12 + (ch - 56 - t.size[1]) // 2), t)
        d.text((x + cw // 2 - 3 * len(name), y + ch - 34), name, fill=(255, 255, 255))
    os.makedirs(CAST_OUT, exist_ok=True)
    sheet.save(os.path.join(CAST_OUT, 'sheet.jpg'), quality=92)
    print('  sheet', sheet.size)


def draw_face(canvas, rig, X, Y, k):
    """a neutral face on a puppet of the composite, so that it reads like a face (the real ones are drawn by src/sp-puppet.tsx): the measured brows as they are painted in the rig and a closed flat mouth; (X, Y) = the neck pivot on the canvas, k = canvas px per rig px"""
    px, py = rig['pivot']
    d = ImageDraw.Draw(canvas)
    for b in rig.get('brows', []):
        pts = [(X + (x - px) * k, Y + (y - py) * k, t * k) for x, y, t in b]
        for (x0, y0, t0), (x1, y1, t1) in zip(pts, pts[1:]): d.line([(x0, y0), (x1, y1)], fill=rig['browColour'], width=max(2, round((t0 + t1) / 2 + 1)))
    m, w = rig['mouth'], rig['mouthW']
    mx, my = X + (m['cx'] - px) * k, Y + (m['cy'] - py) * k
    d.line([(mx - 0.42 * w * k, my), (mx + 0.42 * w * k, my)], fill='#2b0e0e', width=max(2, round(0.07 * w * k)))


def composite(rigs, props):
    """the test composite: over the wide coffee-shop plate of "Tip?", at the frame's scale (the plate at 1.4286 times, as src/tip-scenes.tsx shows it), Denise in her apron behind the counter (the same place and scale as the
    wide shot: feet (265, 885) at 0.43), the customer in 'rat' with the sour dog laid in her purse and Todd in 'beg' next to her, in front of the counter, all three at the same scale 0.43 of their own px, so that the sizes can be
    compared. The faces are a neutral stand-in (draw_face): the brows as measured and a flat mouth"""
    tip = json.load(open(os.path.join(ROOT, 'src', 'tip-rig.json')))
    cust, todd = rigs['customer'], rigs['todd']
    S = 1.4286
    plate_im = Image.open(os.path.join(ROOT, 'public', 'sp', 'tip-bg-cafeWide.jpg')).convert('RGB')
    canvas = plate_im.resize((round(768 * S), round(1344 * S)), Image.LANCZOS).convert('RGBA')
    K = 0.43 * S  # puppet px -> canvas px

    def put(rig, pose, u, v_feet, flip=False, k=K):
        im, (ox, oy) = puppet_image(rig, pose, flip)
        t = scaled(im, k)
        body = layers_of(rig, pose)[0]
        below = body['y'] + body['h'] - rig['pivot'][1]  # how far the feet are under the neck pivot, in rig px
        X, Y = u * S, v_feet * S - below * k  # the neck pivot on the canvas
        canvas.paste(t, (round(X - ox * k), round(Y - oy * k)), t)
        draw_face(canvas, rig, X, Y, k)
        return X, Y

    put(tip['deniseHood'], 'apron', 265, 885)
    cc = tip['props']['counterCafe']
    strip = Image.open(os.path.join(ROOT, 'public', 'sp', 'tip-fg-cafe-counter.png')).convert('RGBA')
    st = scaled(strip, S)
    canvas.paste(st, (round(cc['x0'] * S), round(cc['y0'] * S)), st)
    put(todd, 'beg', 605, 1065)  # (drawn before the customer: his hand goes behind her purse, not over her dog)
    pu, pv = put(cust, 'rat', 462, 1065)
    # the dog: its anchor (the middle of its paws' bottom edge) on the middle of the purse's front edge; its paws' span is three quarters of the purse's outer width, so its head is about as wide as the purse's inside
    P = cust['purse']['rat']
    kd = 0.75 * P['w'] / (props['dog']['paws'][1] - props['dog']['paws'][0])  # dog px -> rig px
    dim = Image.open(os.path.join(OUT, 'lips-dog-sour.png')).convert('RGBA')
    t = scaled(dim, kd * K)
    ax, ay = props['dog']['anchor']
    tx = pu + (P['x'] - cust['pivot'][0]) * K - ax * kd * K
    ty = pv + (P['y'] + 4 - cust['pivot'][1]) * K - ay * kd * K
    canvas.paste(t, (round(tx), round(ty)), t)
    os.makedirs(CAST_OUT, exist_ok=True)
    canvas.convert('RGB').save(os.path.join(CAST_OUT, 'composite.jpg'), quality=92)
    print('  composite', canvas.size)


# ------------------------------------------------------------------ the side views of the kiss (docs/x06-cold-lips.md, shot 13)
# From the front a viewer sees Todd kiss her hip. So the smooch cuts to two whole-body cut-outs in full profile, both facing the LEFT of the picture (she faces left, he kneels behind her and leans to her seat), faces painted (neither
# speaks in that shot). Each comes out the size of its front master's pictures (the faces' heights within 2 %, Todd's head circle within 5 %), so the code draws it at the scale of the front puppet of the shot. Pictures: scripts/lips-art-gen.py customer-side (seed 71), todd-side (73).
SIDE_PICKS = dict(customer='customer-side-71', todd='todd-side-73')
PEACH = np.array([254., 219., 157.])  # the cast's skin
# src/lips-layout.ts KNEEL (read, not changed): the film's view of the kiss: the frame (1080 x 1920) is the café-back plate at s times from (u0, v0); her neck pivot is (500, 478) in it at her scale E, Todd's scale is tE
KNEEL = dict(s=2, u0=228, v0=330, neck=(500, 478), E=1.05, tE=0.85, W=1080, H=1920)


def face_blob(a, alpha):
    """the face of a picture, front or profile: the biggest skin-coloured blob in the top 45 % of the figure (its holes, the eyes and brows, filled)"""
    sil = alpha > 0.5
    ys = np.where(sil.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    sk = ndi.binary_closing((np.abs(a - PEACH).max(axis=2) < 26) & sil, structure=K3, iterations=2)
    lab, n = ndi.label(sk)
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = int((lab[sl] == i).sum())
        if m < 3000 or sl[0].start > top + 0.45 * (bot - top): continue
        if best is None or m > best[0]: best = (m, i)
    return ndi.binary_fill_holes(lab == best[1])


def face_height(blob):
    rows = np.where(blob.any(axis=1))[0]
    return int(rows.max() - rows.min() + 1)


def profile_circle(blob):
    """a circle through the front outline of a profile face (the leftmost skin pixel of each row, the side the face looks to), refitted on its inliers. It means something for Todd's round head only: the customer's profile is
    not a disc (r 166 against her front disc's 132), which is why the heads are compared by the face's height (bangs' edge or hairline to chin)"""
    rows = np.where(blob.any(axis=1))[0]
    pts = np.array([[np.where(blob[y])[0].min(), y] for y in rows], float)
    cx, cy, r = spp.fit_circle(pts)
    keep = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r) < 4
    cx, cy, r = spp.fit_circle(pts[keep])
    return float(cx), float(cy), float(r)


def master_face(name):
    """the face's height in a front master, measured the way a profile's is (face_blob)"""
    a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)
    return face_height(face_blob(a, nvp.cut(a)[0]))


def side_seat(rgb, alpha):
    """where the lips land: the coat is the big pale grey-beige area (collar, belt and all); her seat is its rearmost point (she faces left, so the right-most) in the lower 60 % of the coat, from the belt down to the hem.
    Returns [x, y] in px of the picture: the right edge of the coat at its apex and the middle of the rows within 3 px of it"""
    coat = (np.abs(rgb - np.array([210., 202., 183.])).max(axis=2) < 34) & (alpha > 0.5)
    lab, n = ndi.label(ndi.binary_closing(coat, structure=K3, iterations=2))
    coat = ndi.binary_fill_holes(lab == 1 + int(np.argmax(ndi.sum(coat, lab, range(1, n + 1)))))
    rows = np.where(coat.any(axis=1))[0]
    y0, y1 = rows.min(), rows.max()
    zone = [y for y in rows if y >= y0 + 0.4 * (y1 - y0)]
    right = {y: np.where(coat[y])[0].max() + 1 for y in zone}
    xm = max(right.values())
    ys = [y for y in zone if right[y] >= xm - 3]
    return [float(xm), float(np.mean(ys))]


def side_lips(rgb, alpha, head):
    """the front of Todd's pucker: the pink lips are the salmon pixels near the head (redder than the skin by 55 or more in red over green; the tie's red has no green at all and lies under the chin); the point is the leftmost of
    them, at the height of their middle. Returns [x, y]"""
    H, W, _ = rgb.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = head
    pink = (rgb[..., 0] > 190) & (rgb[..., 0] - rgb[..., 1] > 55) & (rgb[..., 1] > 100) & (rgb[..., 2] > 80) & (alpha > 0.5) & (np.hypot(xx - cx, yy - cy) < 1.45 * r)
    lab, n = ndi.label(pink)
    big = lab == 1 + int(np.argmax(ndi.sum(pink, lab, range(1, n + 1))))
    ys, xs = np.where(big)
    x0 = xs.min()
    return [float(x0), float(ys[xs <= x0 + 3].mean())]


def side_purse(rgb, alpha):
    """the purse of the profile, as purse_of() finds it in the front pictures: the caramel-brown leather (the biggest piece of it: the bag and its strap), the dark inside of its open top (opened with a 5 px square: the bag is seen
    from the side and its opening is thin) and the leather's outer width just under the opening's front edge. Returns x, y (the middle of that front edge: where the dog's paws go), w, inner [x0, back, x1, front] in px of the picture"""
    H, W, _ = rgb.shape
    leather = (rgb[..., 0] - rgb[..., 2] > 70) & (rgb[..., 0] > 110) & (rgb[..., 1] < rgb[..., 0] - 35) & (rgb[..., 1] > 35) & (alpha > 0.5)
    lab, n = ndi.label(ndi.binary_closing(leather, structure=K3, iterations=2))
    bag = lab == 1 + int(np.argmax(ndi.sum(leather, lab, range(1, n + 1))))
    ys, xs = np.where(bag)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    box = np.zeros((H, W), bool); box[by0 - 4:by1 + 4, bx0 - 4:bx1 + 4] = True
    inside = ndi.binary_opening((rgb.max(axis=2) < 115) & (rgb[..., 0] - rgb[..., 2] >= 8) & box & (alpha > 0.5), structure=np.ones((5, 5), bool))
    il, k = ndi.label(inside, structure=K3)
    sizes = ndi.sum(inside, il, range(1, k + 1))
    cand = [i + 1 for i, v in enumerate(sizes) if v > 120]
    best = min(cand, key=lambda i: np.where(il == i)[0].mean())  # the opening is the highest dark blob in the bag
    ix = np.where(il == best)[1]
    x0, x1 = int(ix.min()), int(ix.max() + 1)
    mid = int(round((x0 + x1) / 2))
    col = np.where(il[:, mid] == best)[0]
    rim = int(col.max() + 1)
    row = np.where(bag[min(rim + 3, H - 1)])[0]
    return dict(x=round((x0 + x1) / 2, 1), y=rim, w=int(row.max() - row.min() + 1), inner=[x0, int(col.min()), x1, rim])


def side_piece(key, rigs):
    """cut one profile picture (the flood fill of the white), save public/sp/lips-<key>-side.png at the picture's own scale and measure it, in px of that png. No resampling: the profiles come out the size of the front pictures
    (her body is 1225 px tall against 1226, the faces' heights are within 2 %). The head is compared with the front master's by the height of the face's skin (and, for Todd's round head, by the circle through its front outline as well)"""
    a = np.array(Image.open(os.path.join(SRC, SIDE_PICKS[key] + '.png')).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a)
    blob = face_blob(a, alpha)
    face, front = face_height(blob), master_face(MASTER_CUSTOMER if key == 'customer' else MASTER_TODD)
    im, (ox, oy) = fxp.layer(rgb, alpha, 3)
    ys = np.where(alpha > 0.5)[0]
    res = dict(file=tp.save_png(f'{key}-side', im), w=im.size[0], h=im.size[1], feet=int(ys.max() + 1 - oy), height=int(ys.max() + 1 - ys.min()), src=SIDE_PICKS[key],
               head=dict(face=face, faceFront=front, ratio=round(face / front, 3)))
    sh = lambda p: [round(float(p[0]) - ox, 1), round(float(p[1]) - oy, 1)]
    if key == 'customer':
        res['seat'] = sh(side_seat(rgb, alpha))
        pu = side_purse(rgb, alpha)
        res['purse'] = dict(x=round(pu['x'] - ox, 1), y=int(pu['y'] - oy), w=pu['w'], inner=[pu['inner'][0] - ox, pu['inner'][1] - oy, pu['inner'][2] - ox, pu['inner'][3] - oy])
    else:
        cx, cy, r = profile_circle(blob)
        rf = rigs['todd']['disc'][2]
        res['head'].update(circle=[round(cx - ox, 1), round(cy - oy, 1), round(r, 1)], rFront=round(rf, 1), ratioCircle=round(r / rf, 3))
        res['lips'] = sh(side_lips(rgb, alpha, (cx, cy, r)))
    return res


def kneel_of(rigs, side):
    """what the two pieces make at the scales of the kneeling shot (KNEEL), in frame px: her feet (her neck pivot + the stand body's depth under it, times E: as the front puppet's), how far her seat is above them, how far his
    lips are above his feet, floorDelta = his floor minus hers when his lips are on her seat (positive = his feet lower), and tEOneFloor = the Todd scale that puts his lips on her seat with both on one floor"""
    K, c, t = KNEEL, side['customer'], side['todd']
    st = rigs['customer']['bodies']['stand']
    hs, hl = (c['feet'] - c['seat'][1]) * K['E'], (t['feet'] - t['lips'][1]) * K['tE']
    return dict(E=K['E'], tE=K['tE'], herFeet=round(K['neck'][1] + (st['y'] + st['h'] - rigs['customer']['pivot'][1]) * K['E'], 1), herSeatUp=round(hs, 1), hisLipsUp=round(hl, 1),
                floorDelta=round(hl - hs, 1), tEOneFloor=round(hs / (t['feet'] - t['lips'][1]), 3))


def side_frame(props, side):
    """the pair in position at the scales of the kiss shot: the café-back plate as the shot shows it, her piece with her feet where the front puppet's are, the dog (gasping: on the peak of the smooch only the dog moves) in her purse,
    Todd's piece with his lips on her seat, the counter's strip in front. The pair is centred sideways in the frame (it is wider than her front puppet: the film has to move her to the left)"""
    K, c, t, kn = KNEEL, side['customer'], side['todd'], side['kneel']
    E, tE = K['E'], K['tE']
    big = Image.open(os.path.join(OUT, 'lips-bg-cafeBack.jpg')).convert('RGB').resize((768 * K['s'], 1344 * K['s']), Image.LANCZOS)
    frame = big.crop((K['u0'] * K['s'], K['v0'] * K['s'], K['u0'] * K['s'] + K['W'], K['v0'] * K['s'] + K['H'])).convert('RGBA')
    ci, ti = Image.open(os.path.join(OUT, 'lips-customer-side.png')).convert('RGBA'), Image.open(os.path.join(OUT, 'lips-todd-side.png')).convert('RGBA')
    cy0 = kn['herFeet'] - c['feet'] * E          # the top of her piece in the frame
    seat_y = cy0 + c['seat'][1] * E
    ty0 = seat_y - t['lips'][1] * tE             # the top of his: his lips on her seat
    xc0, seat_x = 0.0, c['seat'][0] * E
    xt0 = seat_x - t['lips'][0] * tE
    dx = K['W'] / 2 - (min(xc0, xt0) + max(xc0 + ci.size[0] * E, xt0 + ti.size[0] * tE)) / 2
    xc0, xt0 = xc0 + dx, xt0 + dx
    ct = scaled(ci, E)
    frame.paste(ct, (round(xc0), round(cy0)), ct)
    # the dog: its paws' span three quarters of the purse's outer width, its anchor on the middle of the purse's front edge (4 px under it, as in the front composite)
    P = c['purse']
    kd = 0.75 * P['w'] / (props['dog']['paws'][1] - props['dog']['paws'][0])
    dg = scaled(Image.open(os.path.join(OUT, 'lips-dog-gasp.png')).convert('RGBA'), kd * E)
    ax, ay = props['dog']['anchor']
    frame.paste(dg, (round(xc0 + P['x'] * E - ax * kd * E), round(cy0 + (P['y'] + 4) * E - ay * kd * E)), dg)
    tt = scaled(ti, tE)
    frame.paste(tt, (round(xt0), round(ty0)), tt)
    strip = scaled(Image.open(os.path.join(OUT, 'lips-fg-cafeBack.png')).convert('RGBA'), K['s'])
    frame.paste(strip, (0, round((props['stripBack']['y0'] - K['v0']) * K['s'])), strip)
    return frame.convert('RGB')


def side_sheet(props, side):
    """out/lips-cast/side.jpg: both pieces on grey at the relative scales of the kiss shot (hers E, his tE, times 0.7), named, with their points marked (the seat cyan, the purse's front edge yellow with the dark inside in green, the lips
    magenta, the feet line red) and, at the right, the pair in position over the plate (the frame at half size); out/lips-cast/side-composite.jpg is that frame in full"""
    frame = side_frame(props, side)
    os.makedirs(CAST_OUT, exist_ok=True)
    frame.save(os.path.join(CAST_OUT, 'side-composite.jpg'), quality=92)
    kz = 0.7
    pieces = (('customer', 'customer side', kz * KNEEL['E']), ('todd', 'todd side', kz * KNEEL['tE']))
    pw = int(sum(side[k]['w'] * s for k, _, s in pieces) + 90)
    ph = int(side['customer']['h'] * pieces[0][2]) + 90
    panel = Image.new('RGB', (pw, ph), GREY)
    d = ImageDraw.Draw(panel)
    base, x = ph - 50, 30  # the feet line of both
    for key, nm, k in pieces:
        S = side[key]
        im = Image.open(os.path.join(OUT, f'lips-{key}-side.png')).convert('RGBA')
        t = scaled(im, k)
        y = base - S['feet'] * k
        panel.paste(t, (round(x), round(y)), t)

        def cross(p, col, r=12):
            px_, py_ = x + p[0] * k, y + p[1] * k
            d.line([px_ - r, py_, px_ + r, py_], fill=col, width=2); d.line([px_, py_ - r, px_, py_ + r], fill=col, width=2)

        d.line([x - 10, base, x + im.size[0] * k + 10, base], fill=(255, 40, 40), width=2)
        if key == 'customer':
            cross(S['seat'], (0, 255, 255)); cross((S['purse']['x'], S['purse']['y']), (255, 255, 0))
            i0, i1, i2, i3 = S['purse']['inner']
            d.rectangle([x + i0 * k, y + i1 * k, x + i2 * k, y + i3 * k], outline=(0, 255, 0), width=2)
            d.text((x + S['seat'][0] * k + 14, y + S['seat'][1] * k - 6), 'seat', fill=(0, 255, 255))
            d.text((x + S['purse']['x'] * k - 70, y + S['purse']['y'] * k + 14), 'purse (dog)', fill=(255, 255, 0))
        else:
            cross(S['lips'], (255, 0, 255))
            d.text((x + S['lips'][0] * k, y + S['lips'][1] * k + 16), 'lips', fill=(255, 0, 255))
        d.text((x, base + 12), f"{nm} ({S['file'].split('/')[-1]})", fill=(255, 255, 255))
        d.text((x, base + 28), f"{S['w']} x {S['h']} px, feet line y {S['feet']}, face {S['head']['ratio']} of its front master's", fill=(255, 255, 255))
        x += im.size[0] * k + 30
    half = frame.resize((frame.size[0] // 2, frame.size[1] // 2), Image.LANCZOS)
    sheet = Image.new('RGB', (pw + half.size[0] + 30, max(ph, half.size[1] + 40)), (24, 24, 28))
    sheet.paste(panel, (0, 0))
    sheet.paste(half, (pw + 30, 24))
    ImageDraw.Draw(sheet).text((pw + 32, 6), f"the pair in position at the kiss shot (E {KNEEL['E']}, tE {KNEEL['tE']}), his lips on her seat", fill=(255, 255, 255))
    sheet.save(os.path.join(CAST_OUT, 'side.jpg'), quality=92)
    print('  side sheet', sheet.size, side['kneel'])


# ------------------------------------------------------------------ main
DOC = ("Pieces of \"Cold Lips\" (scripts/lips-art-gen.py, scripts/lips-prep.py); this text is props.doc. Puppets (customer, todd) are cut like tip-rig.json's: ONE head (the master's) and a body picture per pose, all in px of the 768x1344 master picture, y down; pivot = the neck. "
       "customer.purse[pose] = where the dog goes, in the same px: x, y = the middle of the front edge of the purse's opening (the dog's paws rest on it), w = the purse's outer width just under that edge, inner = [x0, back, x1, front] of the dark inside. "
       "todd.badge[pose] = [cx, cy, w, h, angle] of the plain black badge (angle in degrees, 0 = level, clockwise positive; the code writes TODD / MANAGER on it); todd.dryer = box and tip = the nozzle's furthest visible pink pixel in the 'dryer' body "
       "(the dryer points at his mouth from the side, so toward +x), waist = the row where that body ends: it is cut off under his belt, 'from the waist up'. props.dog = three pictures of one size and one place (files.neutral, sour, gasp; w, h = their size; anchor = [x, y] in their px: the middle of the paws' span and the bottom edge "
       "of the paws, which goes on purse.x, purse.y; paws = [x0, x1] the paws' span at the bottom; fit = how sour and gasp were registered on neutral). props.stripBack = the counter of the plate as a foreground strip (from y0). "
       "side = the two profile pieces of the kiss (shot 13), both facing the LEFT of the picture, each one whole-body cut-out in px of its own png (y down), as big as its front master's pictures, so draw it at the scale of the front puppet of the shot: side.customer, side.todd = file, w, h, feet = the y of the feet / floor line, height = the silhouette's, src = the picture it was cut from, head = {face, faceFront, ratio}: the height of the face's skin against the front master's (1 = the same; draw the piece at scale / ratio to match the heads), todd.head also circle [cx, cy, r] through the front outline and rFront, ratioCircle against the master's disc; customer.seat = [x, y] the rearmost point of her coat, where the lips land; customer.purse = {x, y, w, inner} like customer.purse[pose] (the dog goes there: props.dog.anchor on x, y); todd.lips = [x, y] the front tip of his pucker; side.kneel = what that makes at the kneeling shot's scales (src/lips-layout.ts KNEEL, read when this was made), in frame px: herFeet, herSeatUp, hisLipsUp = the heights above the feet of her seat and of his lips, floorDelta = his floor minus hers with his lips on her seat, tEOneFloor = the Todd scale that puts them on one floor. "
       "scenes.cafeBack = the plate lips-bg-cafeBack.jpg: frame and door = the doorway's outer frame and its empty opening [x0, y0, x1, y1] (the glass door is drawn in code, as in src/tip-scenes.tsx CafeDoor), window, floor = where the floor meets the "
       "wall panelling, counterTop = the counter's far edge (the foreground strip starts there), lip = its front edge.")


if __name__ == '__main__':
    only = sys.argv[1:]
    rigs = {}
    for key, cfg in CAST.items():
        if only and key not in only: continue
        BROWS = 'ink' if key == 'todd' else 'dark'
        try:
            rigs[key] = tp.puppet(key, cfg)[0]
        except Exception as e:  # keep going: the debug sheet shows what did work
            import traceback; traceback.print_exc()
            print('  FAILED', key, e)
    tp.debug_sheet(rigs)
    if only:
        json.dump({'src': [768, 1344], **rigs}, open(os.path.join(ROOT, 'src', 'lips-rig-part.json'), 'w'), indent=1)
        print('wrote the puppets (src/lips-rig-part.json)')
        sys.exit()
    # what the code needs besides the puppets
    cfg = CAST['customer']
    master = load7(cfg['master']); disc = tp.face_of(master)[3]
    rigs['customer']['purse'] = {pn: purse_of(registered(cfg, pf), disc) for pn, pf in cfg['poses'].items()}
    cfg = CAST['todd']
    master = load7(cfg['master']); disc = tp.face_of(master)[3]
    rigs['todd']['badge'] = {pn: badge_of(registered(cfg, pf), disc) for pn, pf in cfg['poses'].items()}
    waist = waist_of(registered(cfg, cfg['poses']['dryer']), disc)
    cut_below(rigs['todd']['bodies']['dryer'], waist)  # the dryer pose is from the waist up
    rigs['todd']['dryer'] = dict(dryer_of(rigs['todd']['bodies']['dryer']), waist=waist)
    props = dict(doc=DOC, dog=dog(), **plate())  # (the doc is in props, so that merging the puppets into RIG the way src/sp-puppet.tsx does with the other rigs (everything but src, props and scenes) does not take it for a puppet)
    side = {k: side_piece(k, rigs) for k in ('customer', 'todd')}
    side['kneel'] = kneel_of(rigs, side)
    json.dump({'src': [768, 1344], **rigs, 'side': side, 'props': props, 'scenes': SCENES}, open(os.path.join(ROOT, 'src', 'lips-rig.json'), 'w'), indent=1)
    cast_sheet(rigs, props)
    composite(rigs, props)
    side_sheet(props, side)
    print('wrote the puppets, the dog, the plate, the side views, src/lips-rig.json and out/lips-cast/')
