# Fixes to the art of "Cold Lips" that the QA review of v1 found (docs/x06-cold-lips.md, Picture notes, v2). scripts/lips-prep.py is not touched: this script reads public/sp/lips-*.png (what the prep wrote) and out/sp-cast7/
# (the pictures the prep cut them from) and writes NEW files that the prep does not know about, so running the prep again does not undo them:
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-fix-art.py            -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-fix-art.py neck       -> her collar: public/sp/lips-customer-body-<pose>-fix.png (phone, rat)
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-fix-art.py dryer      -> Todd's hair dryer: public/sp/lips-todd-body-dryer-fix.png (his body without the prep's leftovers) and lips-todd-dryer-fg.png (the dryer, drawn over his head)
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-fix-art.py hand       -> the hand with the phone, recoloured to her skin and her coat: public/sp/lips-handphone.png, lips-handphone-hand.png
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/lips-fix-art.py denise     -> Denise's hood: public/sp/lips-denise-body-apron-fix.png (the two holes beside the V of her neck, and the streaks next to them, filled)
# and src/lips-fix.json: where each piece goes, in px of the 768x1344 master picture (y down), the numbers src/lips-layout.ts reads. src/lips-shared.tsx draws a puppet with the repaired bodies (src/sp-puppet.tsx `rig`).
# Previews of every piece over its neighbours: scratch/fix/.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
PUB = os.path.join(ROOT, 'public')
DBG = os.path.join(ROOT, 'scratch', 'fix')
os.makedirs(DBG, exist_ok=True)
RIG = json.load(open(os.path.join(ROOT, 'src', 'lips-rig.json')))
FIX_JSON = os.path.join(ROOT, 'src', 'lips-fix.json')
FIX = json.load(open(FIX_JSON)) if os.path.exists(FIX_JSON) else {}
FIX.pop('neck', None)  # (an earlier layout of this file)


def canvas(file, x, y):
    """a layer of the rig as a full 768x1344 RGBA array (float)"""
    im = np.asarray(Image.open(os.path.join(PUB, file)).convert('RGBA')).astype(np.float32)
    c = np.zeros((1344, 768, 4), np.float32)
    c[y:y + im.shape[0], x:x + im.shape[1]] = im
    return c


def over(bottom, top):
    """top over bottom, straight alpha (0..255)"""
    ta, ba = top[..., 3:] / 255, bottom[..., 3:] / 255
    oa = ta + ba * (1 - ta)
    rgb = (top[..., :3] * ta + bottom[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa * 255], axis=-1)


def poly_mask(pts, ss=4):
    """an antialiased 768x1344 mask (0..1) of a polygon given in master px"""
    im = Image.new('L', (768 * ss, 1344 * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((768, 1344), Image.BOX)).astype(np.float32) / 255


def bbox_of(arr, thr=1):
    ys, xs = np.nonzero(arr[..., 3] >= thr)
    return int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)


def bleed(img):
    """the colour of a transparent pixel is the colour of the nearest opaque one (the pictures of the prep are made so: the renderer filters the colour channels of a pixel and its neighbour separately, so a transparent pixel of
    another colour would draw a fringe of it round the edge)"""
    op = img[..., 3] > 0
    if op.all() or not op.any(): return img
    idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
    out = img.copy()
    out[~op, :3] = img[idx[0][~op], idx[1][~op], :3]
    return out


def save_canvas(arr, path, box=None):
    """write a canvas array cropped to its box (x, y, w, h; default: where it has pixels) as a png (edge colours bled into the transparent pixels); returns the box"""
    x, y, w, h = box or bbox_of(arr)
    Image.fromarray(np.clip(bleed(arr[y:y + h, x:x + w]), 0, 255).astype(np.uint8), 'RGBA').save(path)
    return {'x': x, 'y': y, 'w': w, 'h': h}


def preview(layers, box, path, sc=4, bg=(92, 64, 140)):
    """layers drawn in order over a ground colour, cropped to box (x0, y0, x1, y1) and enlarged"""
    c = np.zeros((1344, 768, 4), np.float32); c[..., :3] = bg; c[..., 3] = 255
    for l in layers: c = over(c, l)
    x0, y0, x1, y1 = box
    Image.fromarray(np.clip(c[y0:y1, x0:x1, :3], 0, 255).astype(np.uint8)).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.LANCZOS).save(path)


def load_prep():
    """scripts/lips-prep.py as a module (its main() is not run): its registered() puts an original picture on the master the way the cut-outs were made"""
    spec = importlib.util.spec_from_file_location('lp', os.path.join(HERE, 'lips-prep.py'))
    lp = importlib.util.module_from_spec(spec); spec.loader.exec_module(lp)
    return lp


# ════════════════════════════════════════════════════════════════════ the customer's collar
# Her head is the master's (the standing picture): its hair, the grey inner lining of the collar beside the chin, the V of the neck all belong to the standing body's collar. The phone and rat bodies are other pictures, with a narrower
# collar whose top edge is cut ragged under the head: where the two do not meet there is a channel (the plate shows through between the hair and the collar), a flat-bottomed slot under the chin and a thin sliver of the head's
# lining beside the hair. Each of the two bodies gets the standing body's collar, from the top down to the pose's own sewn base line (the cut falls 2 px above that drawn line, on flat coat: the three bodies' fabric differs by
# 2-3 levels at most): that is the master's own neck again, which the head fits to the pixel. The rat's left shoulder (the right of the picture's cup arm) also had two leftovers of the original's white ground (a hole and a
# white sliver): filled with the fabric next to them.
def trace_line(B, x0, x1, r0, r1, skip=()):
    """the thin dark line along a body's collar base: the darkest opaque pixel of each column between rows r0 and r1 (columns in `skip` are interpolated), smoothed; a list of (x, y)"""
    lum = B[..., :3].mean(axis=-1)
    xs = np.arange(x0, x1 + 1)
    ys = []
    for x in xs:
        col = lum[r0:r1, x].copy(); col[B[r0:r1, x, 3] < 250] = 999
        ys.append(r0 + int(np.argmin(col)))
    ys = np.array(ys, float)
    bad = np.zeros(len(xs), bool)
    for a, b in skip: bad |= (xs >= a) & (xs <= b)
    ys[bad] = np.interp(xs[bad], xs[~bad], ys[~bad])
    ys = ndi.median_filter(ys, 9)
    ys = ndi.uniform_filter1d(ys, 7)
    return list(zip(xs.tolist(), ys.tolist()))


S3 = np.ones((3, 3), bool)


def plug(arr, box=(262, 425, 492, 484), grow=2):
    """the master head's collar band and the body's collar edge do not quite meet along the outer edges (1-2 px of the plate shows through, a thin orange or teal line): the coat's edge is grown 2 px outward inside the window,
    in the coat's fabric colour (the head, drawn over it, has the true rim)"""
    x0, y0, x1, y1 = box
    A = arr[..., 3] > 128
    win = np.zeros_like(A); win[y0:y1, x0:x1] = True
    D = ndi.binary_dilation(A, S3, iterations=grow) & ~A & win
    core = arr[470:480, 330:370]; fab = np.median(core[core[..., 3] > 250][:, :3], axis=0)
    arr[D, :3] = fab; arr[D, 3] = 255
    return arr


def neck():
    st = RIG['customer']['bodies']['stand']
    S = canvas(st['file'], st['x'], st['y'])
    out = {}
    # the standing body, too: the same gap along its collar's edges
    box = save_canvas(plug(S.copy()), os.path.join(PUB, 'sp', 'lips-customer-body-stand-fix.png'), (st['x'], st['y'], st['w'], st['h']))
    out['stand'] = {'file': 'sp/lips-customer-body-stand-fix.png', **box}
    for pose in ('phone', 'rat'):
        b = RIG['customer']['bodies'][pose]
        B = canvas(b['file'], b['x'], b['y'])
        if pose == 'phone':
            line = trace_line(B, 306, 466, 480, 512, skip=[(368, 402)])
            q = [(240, 398), (520, 398), (520, line[-1][1] - 2)] + [(x, y - 2) for x, y in line[::-1]] + [(240, line[0][1] - 2)]
        else:
            line = [(330, 483), (345, 487), (360, 491), (372, 494), (390, 494), (405, 493), (420, 490), (435, 485), (447, 479)]
            q = [(240, 398), (520, 398), (520, 479), (470, 479)] + [(x, y - 2) for x, y in line[::-1]] + [(313, 481), (313, 472), (240, 472)]
        m = poly_mask(q)
        sp = S.copy(); sp[..., 3] = S[..., 3] * m
        if pose == 'rat':
            nb = B[480:492, 270:292]; fab = np.median(nb[nb[..., 3] > 250][:, :3], axis=0).astype(np.float32)  # the fabric next to the hole
            hole = (B[..., 3] < 250); hole[:, :250] = False; hole[:, 268:] = False; hole[:474] = False; hole[491:] = False
            white = (B[..., 3] >= 250) & (B[..., :3].min(axis=-1) > 235); white[:, :264] = False; white[:, 301:] = False; white[:464] = False; white[479:] = False
            fill = hole | white
            sp[fill, :3] = fab; sp[fill, 3] = 255
        body = plug(over(B, sp))  # the pose's body with the collar on it: one picture, still under the head
        box = save_canvas(body, os.path.join(PUB, 'sp', f'lips-customer-body-{pose}-fix.png'))
        out[pose] = {'file': f'sp/lips-customer-body-{pose}-fix.png', **box}
        hd = RIG['customer']['layers']['head']
        H = canvas(hd['file'], hd['x'], hd['y'])
        preview([body, H], (240, 400, 520, 540), os.path.join(DBG, f'neckfix-{pose}.png'))
    FIX['customer'] = {'bodies': out}
    print('neck: wrote', ', '.join(v['file'] for v in out.values()))


# ════════════════════════════════════════════════════════════════════ Todd's hair dryer
# The prep cut the dryer pose's body out from under the head: what lies inside the master's head disc is the prep's own fill (streaks bled out from the edges), the dryer's nozzle is cut off by the disc's edge (a hard
# curved edge) and a tab of pink is left above it. The picture it was cut from (out/sp-cast7/todd-dryer-73.png, put on the master by the prep's own registered()) has all of it: the dryer, whole, with its nozzle in front of
# the cheek. So: (1) the dryer pose's body loses the fill where the slid head no longer covers the disc, and the pink tab; (2) the dryer (barrel, handle,
# nozzle) is cut out of the original as its own picture, with the nozzle made longer by repeating its last columns, so that it ends a few px short of his puckered lips: this one is drawn over his head.
def pink(a):
    return (a[..., 0] > 170) & (a[..., 0] - a[..., 1] > 60) & (a[..., 2] - a[..., 1] > 20)


DRYER_GAP = 18      # master px between the end of the nozzle and the left edge of his puckered lips
DRYER_HDX = -20     # how far his head slides toward the dryer (puppet px): src/lips-sched.ts reads it from src/lips-fix.json
S3 = np.ones((3, 3), bool)


def dryer():
    lp = load_prep()
    reg = lp.registered(lp.CAST['todd'], 'todd-dryer-73').astype(np.float32)
    td = RIG['todd']
    bd = td['bodies']['dryer']
    B = canvas(bd['file'], bd['x'], bd['y'])
    cx, cy, r = td['disc']
    yy, xx = np.mgrid[0:1344, 0:768]
    inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= (r + 3) ** 2
    P = pink(reg)
    lab, n = ndi.label(P, structure=S3)
    P = lab == (1 + int(np.argmax(ndi.sum(P, lab, range(1, n + 1)))))  # the dryer: its biggest pink piece
    D = ndi.binary_fill_holes(ndi.binary_closing(P, S3, iterations=3))  # with the grille
    lum = reg.mean(axis=-1)
    ring = ndi.binary_dilation(D, S3, iterations=2) & ~D & (lum < 170)  # its thin dark outline
    M = D | ring
    Md = ndi.binary_dilation(M, S3, iterations=2)
    # (1) the body: nothing of the prep's fill is left where the head's slide (DRYER_HDX) could show it (the crescent of the master's disc that the slid head no longer covers), and no pink tab outside the disc
    Bf = B.copy()
    shifted = (xx - (cx + DRYER_HDX)) ** 2 + (yy - cy) ** 2 <= (r - 1) ** 2
    crescent = inside & ~shifted; crescent[:bd['y']] = False
    Bf[crescent, 3] = 0
    stray = (B[..., 3] > 0) & pink(B[..., :3]) & ~ndi.binary_dilation(M, S3, iterations=3) & (yy < 500) & (xx > 150) & ~inside  # the pink tab above the nozzle, outside the disc
    stray = ndi.binary_dilation(stray, S3, iterations=2) & (B[..., 3] > 0) & (yy < 500) & (xx > 150) & ~inside
    Bf[stray, 3] = 0
    save_canvas(Bf, os.path.join(PUB, 'sp', 'lips-todd-body-dryer-fix.png'), (bd['x'], bd['y'], bd['w'], bd['h']))
    body_box = {'file': 'sp/lips-todd-body-dryer-fix.png', 'x': bd['x'], 'y': bd['y'], 'w': bd['w'], 'h': bd['h']}
    # (2) the dryer itself, with its nozzle made longer
    x_last = max(x for x in range(215, 268) if M[:, x].any())  # the original's nozzle end
    mouth = td['mouth']
    lips_left = mouth['cx'] + DRYER_HDX - 0.4 * td['mouthW']  # the left edge of the pucker (src/sp-puppet.tsx puckerPts: half its width is 0.4 w)
    x_end = int(round(lips_left - DRYER_GAP))
    n = x_end - x_last
    src = np.zeros((1344, 768, 4), np.float32); src[..., :3] = reg; src[..., 3] = M * 255
    ext = np.zeros_like(src)
    ext[:, :247] = src[:, :247]
    for x in range(247, x_last - 9 + n):
        ext[:, x] = src[:, 246]                        # the last columns of the collar, again
    for k in range(10):
        ext[:, x_last - 9 + n + k] = src[:, x_last - 9 + k]  # its rounded end, moved out
    x0, y0, w0, h0 = bbox_of(ext)
    fg = save_canvas(ext, os.path.join(PUB, 'sp', 'lips-todd-dryer-fg.png'), (x0, y0, w0, h0))
    colA = ext[:, x_end - 12, 3] > 128
    top, bot = int(np.nonzero(colA)[0].min()), int(np.nonzero(colA)[0].max())
    FIX['todd'] = {'bodies': {'dryer': body_box}, 'dryer': {'file': 'sp/lips-todd-dryer-fg.png', **fg, 'endX': x_end, 'endY': (top + bot) / 2, 'endH': bot - top, 'hdx': DRYER_HDX, 'gap': DRYER_GAP}}
    hd = td['layers']['head']
    H = canvas(hd['file'], hd['x'], hd['y'])
    Hs = np.roll(H, DRYER_HDX, axis=1)  # the head slid toward the dryer
    preview([Bf, Hs, ext], (60, 380, 560, 640), os.path.join(DBG, 'dryer-fix.png'), sc=3, bg=(60, 70, 90))
    print('dryer: the nozzle ends at x', x_end, 'y', (top + bot) / 2, 'height', bot - top, '; the original ended at', x_last, '; extended by', n)


# ════════════════════════════════════════════════════════════════════ her hand with the phone (the review insert)
# The hand and the phone of "Tip?" and "I'm Just Not a Sales Person" (public/sp/tip-handPhone.png and pen-handphone-hand.png, drawn for Denise: her skin, a grey knit cuff and a grey hoodie sleeve), recoloured to the customer: her
# skin (#ffd598) and her coat's greige. Only the skin and the grey fabric change; the dark outlines and the black phone stay.
def hand():
    skin_from = np.array([254, 220, 163], np.float32); skin_to = np.array([255, 213, 152], np.float32)
    fab_mul = np.array([206, 196, 177], np.float32) / 165.0  # the hoodie's mid grey (about 165) -> the coat's fabric
    out = {}
    for name, dst in (('tip-handPhone', 'lips-handphone'), ('pen-handphone-hand', 'lips-handphone-hand')):
        im = np.asarray(Image.open(os.path.join(PUB, 'sp', name + '.png')).convert('RGBA')).astype(np.float32)
        rgb = im[..., :3]
        mx, mn = rgb.max(axis=-1), rgb.min(axis=-1)
        lum = rgb.mean(axis=-1)
        skin = (rgb[..., 0] > 215) & (rgb[..., 1] > 185) & (rgb[..., 2] > 120) & (rgb[..., 2] < 200) & (rgb[..., 0] - rgb[..., 2] > 45)
        grey = (mx - mn < 22) & (lum > 95) & (lum < 215) & ~skin
        yy = np.mgrid[0:im.shape[0], 0:im.shape[1]][0]
        grey &= yy > 500  # the sleeve and its cuff (the phone's body, black, is above)
        res = rgb.copy()
        res[skin] = np.clip(rgb[skin] * (skin_to / skin_from), 0, 255)
        res[grey] = np.clip(rgb[grey] * fab_mul, 0, 255)
        im2 = im.copy(); im2[..., :3] = res
        Image.fromarray(im2.astype(np.uint8), 'RGBA').save(os.path.join(PUB, 'sp', dst + '.png'))
        out[name] = f'sp/{dst}.png'
    base = Image.new('RGBA', (401, 1067), (60, 60, 70, 255))
    for f in out.values(): base.alpha_composite(Image.open(os.path.join(PUB, f)).convert('RGBA'))
    base.convert('RGB').save(os.path.join(DBG, 'handphone-fix.png'))
    FIX['hand'] = {'phone': out['tip-handPhone'], 'fingers': out['pen-handphone-hand']}
    print('hand: wrote', ', '.join(out.values()))


# ════════════════════════════════════════════════════════════════════ Denise's hood
# Her body picture (src/tip-rig.json deniseHood, "Tip?") has two small holes beside the V of her neck (the plate shows through: two cream slivers) and streaks of pale grey above them, where the cut bled; they are under her chin
# while she faces the camera, and show when her head turns. Filled with the hood's own grey (the median of the fabric next to them).
def denise():
    td = json.load(open(os.path.join(ROOT, 'src', 'tip-rig.json')))['deniseHood']
    bd = td['bodies']['apron']; hd = td['layers']['head']
    B = canvas(bd['file'], bd['x'], bd['y']); H = canvas(hd['file'], hd['x'], hd['y'])
    A = np.maximum(B[..., 3], H[..., 3]) > 128
    win = np.zeros_like(A); win[610:655, 305:435] = True
    hole = ~A & win
    lab, n = ndi.label(hole)
    keep = np.zeros_like(A)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) >= 20: keep |= lab == i  # (the two real holes; a stray pixel or two is not)
    lum = B[..., :3].mean(axis=-1)
    streak = (B[..., 3] > 128) & (lum > 172) & ((B[..., :3].max(axis=-1) - B[..., :3].min(axis=-1)) < 14)
    zone = np.zeros_like(A); zone[608:634, 310:332] = True; zone[612:636, 392:412] = True
    streak &= zone
    fill = ndi.binary_dilation(keep | streak, S3, iterations=1) & ~(H[..., 3] > 128)
    fabric = (B[..., 3] > 250) & (lum > 110) & (lum < 165) & (np.abs(B[..., 0] - B[..., 2]) < 12)
    ref = np.zeros_like(A); ref[600:660, 290:440] = True
    col = np.median(B[fabric & ref][:, :3], axis=0)
    Bf = B.copy(); Bf[fill, :3] = col; Bf[fill, 3] = 255
    # the white of her shirt inside the V (under the head's neck: a white sliver shows beside the neck when the head turns): her neck's skin there
    sk = np.median(H[640:650, 375:392][H[640:650, 375:392, 3] > 250][:, :3], axis=0)
    white = (B[..., 3] > 128) & (B[..., :3].min(axis=-1) > 160) & (B[..., :3].max(axis=-1) - B[..., :3].min(axis=-1) < 40); vwin = np.zeros_like(A); vwin[598:668, 350:412] = True
    Bf[white & vwin, :3] = sk
    # the prep's bleed under the head left flat patches of one grey (and faint vertical streaks) beside the V: they have no grain, and the fabric around them has; they are covered while she faces the camera, and show when her head
    # moves. Repainted with a tile of plain hood fabric (the left shoulder, under the collar's edge)
    from numpy.lib.stride_tricks import sliding_window_view as swv
    g = Bf[..., :3].mean(axis=-1)
    pad = np.pad(g, 2, mode='edge'); sd = swv(pad, (5, 5)).std(axis=(2, 3))
    flat = (Bf[..., 3] > 250) & (sd < 0.9) & (g > 128) & (g < 165) & (np.abs(Bf[..., 0] - Bf[..., 2]) < 6)
    zone = np.zeros_like(A); zone[580:645, 250:350] = True; zone[580:648, 395:482] = True
    flat &= zone
    flat = ndi.binary_dilation(ndi.binary_opening(flat, S3), S3, iterations=1) & (Bf[..., 3] > 250) & zone & (g > 125) & ~(H[..., 3] > 250)
    tile = Bf[668:700, 255:300, :3]
    yy, xx = np.nonzero(flat)
    Bf[yy, xx, :3] = tile[yy % tile.shape[0], xx % tile.shape[1]]
    # the lighter strip (x 313-318, 2-4 px wide, one level up) at the lining's end: a hard vertical edge in the middle of the fabric; the hood's own grey
    strip = np.zeros_like(A); strip[606:642, 311:320] = True
    strip &= (Bf[..., 3] > 250) & (g > 144) & (g < 160) & (np.abs(Bf[..., 0] - Bf[..., 2]) < 6)
    Bf[strip, :3] = col
    box = save_canvas(Bf, os.path.join(PUB, 'sp', 'lips-denise-body-apron-fix.png'), (bd['x'], bd['y'], bd['w'], bd['h']))
    FIX['denise'] = {'bodies': {'apron': {'file': 'sp/lips-denise-body-apron-fix.png', **box}}}
    preview([Bf, H], (250, 560, 520, 720), os.path.join(DBG, 'denise-fix.png'), sc=5, bg=(255, 0, 255))
    print('denise: filled', int(fill.sum()), 'px with', col.round(1).tolist(), ', the V with', sk.round(1).tolist(), ', repainted', int(flat.sum()), 'flat px')


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('neck', 'all'): neck()
    if what in ('dryer', 'all'): dryer()
    if what in ('hand', 'all'): hand()
    if what in ('denise', 'all'): denise()
    json.dump(FIX, open(FIX_JSON, 'w'), indent=1)
    print('wrote src/lips-fix.json')
