# Prep for x09 "Habits of the Rich" (docs/x09-habits-of-the-rich.md): cuts the pictures of out/x09-cast (scripts/x09-art-gen.py, the picks below) into the plates, props, inserts, sprites and puppets the scenes use (src/x09-scenes.tsx),
# and measures what the code needs. The recipe of scripts/x08-prep.py (it reuses tip-prep.py's puppet(), through lips-prep.py's patched copy of it, and the same cutting helpers).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x09-prep.py            -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x09-prep.py plates props inserts crowd guru ross denise     -> only those parts (src/x09-rig.json keeps the others)
# Writes public/sp/x09-*.png|jpg, src/x09-rig.json (px of the pictures, y down), scratch/x09-prep/* (the debug sheets) and out/x09-cast/prep-sheet.jpg (every piece on grey, named).
# The picks (the coordinator's, 10-24): Ross ross-chair-61, ross-board-61, ross-slam-61 (his head is at exactly ross-sit-61's box, so the x08 head sprites register 1:1), ross-headset-g-61 and ross-gold-62 (their own heads); Denise denise-note-63 (a new
# painting of her face: her master head from "Tip?" goes on it); the guru guru-70 (master), guru-cannon-73, guru-smash-71, guru-toast-72, guru-caught-70; the crowd crowd-N-61 seated, crowd-N-up-61 (N=2: -62), crowd-N-turn-62 (N=3: -63);
# plates bg-stage-63, bg-crowd-63, bg-board-61; props prop-tub-66, prop-clock-65, prop-notebook-65; inserts ins-tax-65, ins-wash-62, ins-hit-68.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x8', os.path.join(HERE, 'x08-prep.py'))
x8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(x8)  # (x08-prep.py patches tip-prep's puppet() for Ross's hair and the raised arms' pockets; its __main__ does not run)
lp = x8.lp
tp, spp, nvp, fxp = lp.tp, lp.spp, lp.nvp, lp.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
SRC = os.path.join(ROOT, 'out', 'x09-cast')
SRC8 = os.path.join(ROOT, 'out', 'x08-cast')
SRC3 = os.path.join(ROOT, 'out', 'sp-cast3')
DBG = os.path.join(ROOT, 'scratch', 'x09-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x09-rig.json')
DENISE_SIZE = (768, 1344)  # Denise's master (the "Tip?" picture) is a 768 x 1344 picture: her new pose picture is registered onto its canvas


def load(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)


def save_jpg(name, src, quality=95):
    Image.open(os.path.join(SRC, src + '.png')).convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=quality)
    return f'sp/{name}.jpg'


def sprite(key, name, pad=3, pockets=(), protect=False):
    """public/sp/x09-<key>.png: the picture `name` cut from its white ground, cropped; {file, w, h, ox, oy}: ox, oy = where the layer sits in the 1024 x 1024 picture"""
    a = load(name)
    alpha, rgb = nvp.cut(a, protect, (), tuple(pockets))
    im, (ox, oy) = fxp.layer(rgb, alpha, pad)
    im.save(os.path.join(OUT, f'x09-{key}.png'), optimize=True)
    return dict(file=f'sp/x09-{key}.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src=name), a, alpha


# ═════════════════════════════════════════════════════ plates (768 x 1344): the pictures as jpgs and the numbers the code needs, read off them
def plates():
    st = np.array(Image.open(os.path.join(SRC, 'bg-stage-63.png')).convert('RGB')).astype(int)
    grey = (np.abs(st[..., 0] - st[..., 1]) < 10) & (np.abs(st[..., 1] - st[..., 2]) < 10) & (st[..., 0] > 45) & (st[..., 0] < 95)
    lab, n = ndi.label(grey)
    ys, xs = np.where(lab == 1 + int(np.argmax(ndi.sum(grey, lab, range(1, n + 1)))))
    screen = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    stage = dict(file=save_jpg('x09-bg-stage', 'bg-stage-63'), screen=screen, floor=950, columns=[[22, 64, 676, 1049], [705, 746, 676, 1049]])  # the screen's glass, the floor's top row, the two pyro columns [x0, x1, top (the ball on it), bottom]
    # the crowd plate: three rows of empty chairs (black backs and seats), measured as blobs
    cr = np.array(Image.open(os.path.join(SRC, 'bg-crowd-63.png')).convert('RGB')).astype(int)
    blk = cr.max(axis=2) < 42; blk[:480] = False
    lab, n = ndi.label(ndi.binary_opening(blk, iterations=2))
    chairs = []
    for j in range(1, n + 1):
        ys, xs = np.where(lab == j)
        if len(ys) > 6000: chairs.append([int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1])
    rows = {}
    for c in sorted(chairs, key=lambda c: (c[1], c[0])): rows.setdefault(c[1] // 120, []).append(c)
    crowd = dict(file=save_jpg('x09-bg-crowd', 'bg-crowd-63'), rows=[sorted(v) for k, v in sorted(rows.items())])  # rows far to near: each chair [x0, y0, x1, y1] (back top .. seat bottom)
    save_jpg('x09-bg-board', 'bg-board-61')
    board = dict(file='sp/x09-bg-board.jpg', surface=[52, 75, 713, 969], tray=[880, 980, 1000], floor=1249, wall='#b0c1c9', floorColour='#76593f')  # the board's white surface [x0, y0, x1, y1], the marker tray's top row, the floor's top row, the colours the plate is carried on in
    return dict(stage=stage, crowd=crowd, board=board)


# ═════════════════════════════════════════════════════ props: the tub, the clock, the notebook
def props():
    out = {}
    # the tub of ice: cut, and the rim: the splash comes out of the ice's lower edge
    d, a, al = sprite('tub', 'prop-tub-66', pad=4)
    ice = (a[..., 2] - a[..., 0] > 18) & (a[..., 2] > 200) & (al > 0.5)
    ys, xs = np.where(ice)
    d.update(ice=[int(xs.min() - d['ox']), int(ys.min() - d['oy']), int(xs.max() + 1 - d['ox']), int(ys.max() + 1 - d['oy'])])  # the ice heap's box in the layer's px
    out['tub'] = d
    # the alarm clock: the red ring's inner white face (the code draws the marks and the hands on it)
    d, a, al = sprite('clock', 'prop-clock-65', pad=4)
    red = (a[..., 0] > 180) & (a[..., 1] < 60) & (a[..., 2] < 60)
    ring = ndi.binary_fill_holes(red) & ~red
    lab, n = ndi.label(ring)
    ys, xs = np.where(lab == 1 + int(np.argmax(ndi.sum(ring, lab, range(1, n + 1)))))
    d.update(face=[round(float((xs.min() + xs.max()) / 2 - d['ox']), 1), round(float((ys.min() + ys.max()) / 2 - d['oy']), 1), round(float((xs.max() - xs.min() + 1) / 2), 1)])  # [cx, cy, r] in the layer's px
    d.update(bells=[round(float(512 - d['ox']), 1), round(float(150 - d['oy']), 1)])
    out['clock'] = d
    # the notebook: its page (cream, between the spirals and the foot), the pink margin line and the ruled lines, in the picture's px (the notebook is cut with its blue edge)
    d, a, al = sprite('notebook', 'prop-notebook-65', pad=3)
    d.update(page=[49 - d['ox'], 162 - d['oy'], 727 - d['ox'], 1185 - d['oy']], margin=153.5 - d['ox'], lines=[273, 325, 374, 424, 473, 523, 574, 623, 673, 724, 774, 825, 875, 925, 974, 1025, 1075, 1125], full=[768, 1344])  # `lines`: the ruled lines' rows in the 768 x 1344 picture
    out['notebook'] = d
    return out


# ═════════════════════════════════════════════════════ the inserts (768 x 1344 pictures): the tax box, the washing machine, the handshake
def inserts():
    save_jpg('x09-ins-tax', 'ins-tax-65'); save_jpg('x09-ins-wash', 'ins-wash-62'); save_jpg('x09-ins-hit', 'ins-hit-68')
    return dict(tax=dict(file='sp/x09-ins-tax.jpg', label=[252, 926, 397, 995]),            # the blank cream panel on the crate's front
                wash=dict(file='sp/x09-ins-wash.jpg', porthole=[375, 848, 140], line=[[30, 140], [768, 140]]),  # [cx, cy, r] of the glass door, the clothesline
                hit=dict(file='sp/x09-ins-hit.jpg'))


# ═════════════════════════════════════════════════════ the crowd (six people, seated / arm up / head turned) and the guru's poses and Ross in gold: sprites (no puppet: they do not talk)
CROWD = {1: ('crowd-1-61', 'crowd-1-up-61', 'crowd-1-turn-62'), 2: ('crowd-2-61', 'crowd-2-up-62', 'crowd-2-turn-62'), 3: ('crowd-3-61', 'crowd-3-up-61', 'crowd-3-turn-63'),
         4: ('crowd-4-61', 'crowd-4-up-61', 'crowd-4-turn-62'), 5: ('crowd-5-61', 'crowd-5-up-61', 'crowd-5-turn-62'), 6: ('crowd-6-61', 'crowd-6-up-61', 'crowd-6-turn-62')}
GURU = {'guru': 'guru-70', 'cannon': 'guru-cannon-73', 'smash': 'guru-smash-71', 'toast': 'guru-toast-72', 'caught': 'guru-caught-70'}


def chair_of(a, al, d):
    """the chair under a seated figure: its silver legs (low saturation, mid grey) in the lowest 13 % of the figure give the chair's width [x0, x1] and the row of the leg tips (`foot`), in the layer's px"""
    ys, xs = np.where(al > 0.5)
    top, bot = ys.min(), ys.max()
    sil = (a.max(axis=2) - a.min(axis=2) < 30) & (a.mean(axis=2) > 135) & (a.mean(axis=2) < 226) & (al > 0.5)
    sil[:int(bot - 0.13 * (bot - top))] = False
    sy, sx = np.where(sil)
    return dict(legs=[int(sx.min() - d['ox']), int(sx.max() + 1 - d['ox'])], foot=int(bot + 1 - d['oy']))


HAND_FIX = {5: [47.0, 72.0, 5000, [4, 26, 105, 135]]}  # crowd-5's raised arm is bare skin down to the shoulder: one big blob, not a hand's size; read off the picture


def crowd():
    out = {}
    for i, (seat, up, turn) in CROWD.items():
        r = {}
        for kind, name in (('seat', seat), ('up', up), ('turn', turn)):
            d, a, al = sprite(f'crowd-{i}-{kind}', name)
            d.update(chair_of(a, al, d))
            ys, xs = np.where(al > 0.5)
            d['head'] = [int(xs.min() - d['ox']), int(ys.min() - d['oy'])]  # (the top left of the figure: for the debug sheet)
            if kind == 'up':  # the raised hand: the highest skin-coloured blob (the face's skin colour) of a hand's size: 1500-12000 px (the face is far bigger); its middle, and its top
                skin = tp.face_of(a)[1]
                m = ndi.binary_opening((np.abs(a - skin).max(axis=2) < 30) & (al > 0.5), iterations=2)
                lab, n = ndi.label(m)
                best = None
                for j in range(1, n + 1):
                    yy, xx = np.where(lab == j)
                    if 1500 <= len(yy) <= 12000 and yy.mean() < ys.min() + 0.45 * (ys.max() - ys.min()) and (best is None or yy.mean() < best[0]): best = (yy.mean(), xx.mean(), len(yy), xx.min(), yy.min(), xx.max(), yy.max())
                if best: d['hand'] = [round(float(best[1] - d['ox']), 1), round(float(best[0] - d['oy']), 1), int(best[2]), [int(best[3] - d['ox']), int(best[4] - d['oy']), int(best[5] + 1 - d['ox']), int(best[6] + 1 - d['oy'])]]
                else: print('   no hand found for', name)
                if i in HAND_FIX: d['hand'] = HAND_FIX[i]
            r[kind] = d
        out[str(i)] = r
    return out


def face_numbers(a, d):
    """the face of a guru picture, in the layer's px: the head disc [cx, cy, r], the two eyes [cx, cy, rx, ry], and the teeth (the biggest near-white blob inside the face under the eyes, with the black outline: its box)"""
    try:
        blob, skin, (EL, ER), disc = tp.face_of(a)
    except Exception as e:  # (the cannonball's eyes are squeezed shut: two black ticks on white ovals; the pair finder may still find the whites)
        print('   face_of failed:', e); return {}
    out = dict(disc=[round(disc[0] - d['ox'], 1), round(disc[1] - d['oy'], 1), round(disc[2], 1)], eyes=[[round(e['cx'] - d['ox'], 1), round(e['cy'] - d['oy'], 1), round(e['rx'], 1), round(e['ry'], 1)] for e in (EL, ER)], skin=spp.hexc(skin))
    near = a.min(axis=2) >= 225
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    inside = ndi.binary_fill_holes(blob)
    zone = inside & (yy > (EL['cy'] + ER['cy']) / 2 + 1.05 * EL['ry'])
    teeth = near & zone
    lab, n = ndi.label(teeth)
    keep = [j for j in range(1, n + 1) if (lab == j).sum() > 120]
    if keep:
        ys, xs = np.where(np.isin(lab, keep))
        out['teeth'] = [int(xs.min() - 3 - d['ox']), int(ys.min() - 3 - d['oy']), int(xs.max() + 4 - d['ox']), int(ys.max() + 4 - d['oy'])]  # the grin's box (all the teeth)
    return out


def guru():
    out = {}
    for key, name in GURU.items():
        d, a, al = sprite(f'guru-{key}', name)
        d.update(face_numbers(a, d))
        if key == 'toast':  # the glass: its yellow liquid's box (R high, G high, B low), the hand above it
            liq = (a[..., 0] > 235) & (a[..., 1] > 190) & (a[..., 2] < 110) & (a[..., 1] - a[..., 2] > 100) & (np.arange(a.shape[0])[:, None] < 330)
            lab, n = ndi.label(liq)
            j = 1 + int(np.argmax(ndi.sum(liq, lab, range(1, n + 1))))
            ys, xs = np.where(lab == j)
            d['liquid'] = [int(xs.min() - d['ox']), int(ys.min() - d['oy']), int(xs.max() + 1 - d['ox']), int(ys.max() + 1 - d['oy'])]
        if key == 'caught':  # the card reader's screen (the light grey LCD inside the black device) and the blue card
            lowv = (np.arange(a.shape[0])[:, None] > 540)
            grey = (a[..., 0] > 105) & (a[..., 0] < 180) & (a[..., 1] > 115) & (a[..., 1] < 190) & (a[..., 2] > 90) & (a[..., 2] < 160) & (a[..., 1] >= a[..., 0] - 3) & (a[..., 1] - a[..., 2] > 10) & lowv & (al > 0.5)  # the LCD's grey-green
            lab, n = ndi.label(ndi.binary_opening(grey, iterations=2))
            best = None
            for j in range(1, n + 1):
                ys, xs = np.where(lab == j)
                if 600 < len(ys) < 9000 and xs.mean() < 0.5 * a.shape[1] and (best is None or len(ys) > best[0]): best = (len(ys), j)
            if best:
                ys, xs = np.where(lab == best[1])
                (cx, cy), (w, h), ang = cv2.minAreaRect(np.stack([xs, ys], 1).astype(np.float32))
                if w < h: w, h, ang = h, w, ang + 90
                d['reader'] = [round(float(cx - d['ox']), 1), round(float(cy - d['oy']), 1), round(float(w), 1), round(float(h), 1), round(float(ang), 1)]  # the LCD: centre, width, height, the turn (degrees, clockwise)
            blue = (a[..., 2] > 150) & (a[..., 0] < 60) & (a[..., 1] > 60) & (a[..., 1] < 140) & lowv
            ys, xs = np.where(blue)
            if len(ys): d['card'] = [int(xs.min() - d['ox']), int(ys.min() - d['oy']), int(xs.max() + 1 - d['ox']), int(ys.max() + 1 - d['oy'])]
        out[key] = d
    d, a, al = sprite('gold', 'ross-gold-62')
    out['gold'] = d
    return out


# ═════════════════════════════════════════════════════ the puppets: Ross (the x08 master head on three new bodies, and a headset Ross with his own head), Denise (her master head from "Tip?" on a new body)
def load9(name):
    """the pictures of out/x09-cast first, then x08's (Ross's master ross-sit-61) and "Tip?"'s (Denise's master denise-neutral-61); Ross's are padded (the arms and legs of a registered pose run past the 1024 x 1024 canvas)"""
    f = next(os.path.join(d, name + '.png') for d in (SRC, SRC8, SRC3) if os.path.exists(os.path.join(d, name + '.png')))
    a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    if name == 'denise-note-63': a = denise_canvas(a)
    return a


_DM = {}
def denise_canvas(a0):
    """denise-note-63 (1024 x 1024) put on the canvas of her master (768 x 1344), scaled and shifted so that its head disc lands on the master's: puppet() then finds nothing left to register"""
    if 'disc' not in _DM:
        m = np.array(Image.open(os.path.join(SRC3, 'denise-neutral-61.png')).convert('RGB')).astype(np.float32)
        _DM['disc'] = tp.face_of(m)[3]
    disc = _DM['disc']
    d_p = tp.face_of(a0)[3]
    k = disc[2] / d_p[2]
    M = np.array([[k, 0, disc[0] - k * d_p[0]], [0, k, disc[1] - k * d_p[1]]], np.float32)
    out = cv2.warpAffine(a0, M, (DENISE_SIZE[0], DENISE_SIZE[1]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
    print(f'  denise-note-63: head disc r {d_p[2]:.0f} -> {disc[2]:.0f} (x{k:.2f})')
    return np.clip(out, 0, 255)


tp.DBG, tp.PFX, tp.load3 = DBG, 'x09', load9


def debug_sheet9(rigs):
    """every puppet and pose on magenta with its eyes (red), pupils (blue), mouth (green), pivot (yellow), disc (orange) and brows (cyan)"""
    tiles = []
    for key, rig in rigs.items():
        for pn in list(rig.get('bodies', {'': 0}).keys()):
            L0 = rig['layers']['head']
            S = (1024 + 2 * PAD, 1024 + 2 * PAD) if key.startswith('ross') else DENISE_SIZE
            bg = Image.new('RGBA', (S[0], S[1]), (255, 0, 255, 255))
            for lk in ('body', 'head'):
                L = rig['bodies'][pn] if (lk == 'body' and 'bodies' in rig) else rig['layers'][lk]
                bg.alpha_composite(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'), (L['x'], L['y']))
            d = ImageDraw.Draw(bg)
            for e in rig['eyes']: d.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0, 255), width=2)
            for q in rig['pupils']: d.ellipse([q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]], outline=(0, 160, 255, 255), width=2)
            m = rig['mouth']; d.rectangle([m['cx'] - m['w'] / 2, m['cy'] - 10, m['cx'] + m['w'] / 2, m['cy'] + 10], outline=(0, 255, 0, 255), width=2)
            px, py = rig['pivot']; d.line([px - 14, py, px + 14, py], fill=(255, 255, 0, 255), width=3)
            c = rig['disc']; d.ellipse([c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]], outline=(255, 160, 0, 255), width=2)
            for b in rig.get('brows', []): d.line([(p[0], p[1]) for p in b], fill=(0, 255, 255, 255), width=2)
            tiles.append((f'{key} {pn}', bg.convert('RGB').crop(bg.getbbox() if False else (0, 0, S[0], S[1])).resize((420, int(420 * S[1] / S[0])), Image.LANCZOS)))
    h = max(t[1].height for t in tiles)
    sheet = Image.new('RGB', (len(tiles) * 426 + 6, h + 34), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        sheet.paste(im, (6 + i * 426, 28)); dr.text((9 + i * 426, 8), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'cast-sheet.jpg'), quality=90)


def defringe(rig):
    """the head of a headset Ross is wider than his neck: a thin white crescent of the background shows between the jaw and the collar, in the head's 3 px ring and in the body's pocket: near-white pixels in the band round the jaw (below the middle of the face, down to a little under the chin) are made transparent"""
    cx, cy, r = rig['disc']
    for lk in ('head', 'body'):
        L = rig['layers'][lk]
        f = os.path.join(ROOT, 'public', L['file'])
        im = np.array(Image.open(f).convert('RGBA'))
        yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        zone = (yy + L['y'] > cy + 0.45 * r) & (yy + L['y'] < cy + 1.25 * r) & (np.abs(xx + L['x'] - cx) < 1.15 * r)
        pale = zone & (im[..., :3].min(axis=2) >= 226) & (im[..., 3] > 0)
        im[pale, 3] = 0
        Image.fromarray(im, 'RGBA').save(f, optimize=True)
        print(f'  defringe {lk}: {int(pale.sum())} px')


def denise_head(rig):
    """her head and her brows are "Tip?"'s own (src/tip-rig.json deniseHood: the same master picture, the same numbers; this prep's brow finder takes a lock of her fringe for her left brow and paints a skin patch over the hair), with the thin light slivers
    along the hair's outer edge (the white of the paper) taken out: near-white pixels above the middle of the face and outside the head's disc are made transparent"""
    t = json.load(open(os.path.join(ROOT, 'src', 'tip-rig.json')))['deniseHood']
    L = t['layers']['head']
    im = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'))
    cx, cy, r = rig['disc'][0] - L['x'], rig['disc'][1] - L['y'], rig['disc'][2]
    yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
    halo = (im[..., :3].min(axis=2) > 178) & (np.hypot(xx - cx, yy - cy) > r * 1.0) & (yy < cy) & (im[..., 3] > 0)
    im[halo, 3] = 0
    Image.fromarray(im, 'RGBA').save(os.path.join(OUT, 'x09-denise-head.png'), optimize=True)
    rig['layers']['head'] = dict(L, file='sp/x09-denise-head.png')
    rig['brows'] = t['brows']; rig['browColour'] = t['browColour']
    print(f'  denise head: {int(halo.sum())} halo px cleared, brows and colour from Tip')


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = {'chair': 'ross-chair-61', 'board': 'ross-board-61', 'slam': 'ross-slam-61'}
        new = tp.puppet('ross', cfg)[0]
        r = json.loads(json.dumps(x8rig['ross']))  # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        r.pop('flySil', None); r.pop('screens', None)
        rigs['ross'] = r
    if 'headset' in which:
        cfg = dict(x8.CAST['rossPeel']); cfg.update(hair='ross', pockets=(x8.halo,), specks=200)
        rigs['rossHeadset'] = tp.puppet('rossHeadset', {**cfg, 'master': 'ross-headset-g-61'})[0]
        defringe(rigs['rossHeadset'])
    if 'denise' in which:
        cfg = dict(tp.CAST['deniseHood']); cfg['poses'] = {'note': 'denise-note-63'}; cfg.pop('apron', None); cfg.pop('keep', None)
        rigs['denise'] = tp.puppet('denise', cfg)[0]
        denise_head(rigs['denise'])
    return rigs


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    todo = {'plates': plates, 'props': props, 'inserts': inserts, 'crowd': crowd, 'guru': guru}
    for k, fn in todo.items():
        if only and k not in only: continue
        rig[k] = fn(); print('  done', k)
    pw = [k for k in ('ross', 'headset', 'denise') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet9(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
