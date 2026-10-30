# Prep for x08 "Just Let Me Pay" (docs/x08-just-let-me-pay.md): cuts the Qwen pictures of out/x08-cast (scripts/x08-art-gen.py) into puppet parts, props and a plate the way scripts/lips-prep.py cuts "Cold Lips"
# (this script reuses tip-prep.py's puppet(), prop() and finders, through lips-prep.py's patched copy of them: its find_eyes and its brow finder for brows that are not black), and measures what the code needs.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x08-prep.py            -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x08-prep.py ross       -> only that puppet (ross | rossPeel), without the extras: src/x08-rig-part.json
# Writes public/sp/x08-*.png|jpg, src/x08-rig.json (px of the padded pictures, y down), scratch/x08-prep/* (the debug sheets) and out/x08-cast/prep-sheet.jpg (every new piece on grey, named).
# Ross has ONE head, the master's (ross-sit-61); his sit, up and fly bodies are the pose pictures registered on it (the pictures are 1024 x 1024 and the standing ones draw the head 0.6-0.7 times as big as the master's, so
# every picture sits on a canvas padded by PAD px to leave room for the enlarged arms and legs). The peel pose (both hands on his cheeks) is a puppet of its own, rossPeel: the hands lie over the face, so its head is its own
# picture's (hands and all). The drawn mouth and brows are painted out of the heads, the eye whites and pupils are measured, and the code draws mouths, lids, pupils and brows (src/sp-puppet.tsx).
# His ear tunnels (round black plugs in both earlobes) are cut out of the head in two more copies, for the shots after they have shot out: public/sp/x08-ross-head-{l,none}.png (l = only the left plug of the picture is
# gone, none = both); the ear is a lobe with a hole through it. A third copy, x08-ross-head-red.png, has the skin turned red (shots 7-16).
# Also cut here: the hand with the phone for the inserts (x08-hand.png and x08-hand-screen.png, the glass as a mask), the glass masks of the two phones Ross holds (x08-ross-screen-sit.png, -up.png), the living room plate
# (x08-bg-living.jpg) and the Ross-shaped hole of the ceiling (x08-fly-sil.png, x08-fly-sky.png).
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lp', os.path.join(HERE, 'lips-prep.py'))
lp = importlib.util.module_from_spec(spec); spec.loader.exec_module(lp)
tp, spp, nvp, fxp = lp.tp, lp.spp, lp.nvp, lp.fxp
ROOT, OUT, K3 = tp.ROOT, tp.OUT, tp.K3
SRC = os.path.join(ROOT, 'out', 'x08-cast')
DBG = os.path.join(ROOT, 'scratch', 'x08-prep')
os.makedirs(DBG, exist_ok=True)
PAD = 320  # white border round every picture of Ross (the up and fly pictures are registered 1.45 and 1.65 times bigger, and their hands and feet would be cut off by the 1024 x 1024 canvas)

LOADED, KEEP = {}, []


def load8(name):
    a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    if name == 'ross-up-61': a = grey_screen(a)
    LOADED[id(a)] = name; KEEP.append(a)
    return a


def grey_screen(a):
    """the blank white screen of the phone held above his head is a near-white blob inside a thick black bezel; tip-prep's pocket rule (white above the head is background) would cut it out, so its white is made light grey (the code draws
    the screen over it anyway). The blob is the biggest enclosed near-white one above the head (y < 330 of the 1024 picture)"""
    out = a.copy()
    lab, n = ndi.label(a.min(axis=2) >= 238)
    H, W, _ = a.shape
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W: continue
        m = (lab[sl] == i).sum()
        if sl[0].stop < PAD + 330 and m > 4000 and (best is None or m > best[0]): best = (m, i)
    out[lab == best[1]] = (232, 233, 236)
    return out


tp.DBG, tp.PFX, tp.load3 = DBG, 'x08', load8
lp.BROWS = 'ink'  # the brow finder of lips-prep.py for brows that are not black (Todd's): Ross's are brown strokes on skin

# ------------------------------------------------------------------ the hair rule: reddish-brown top hair and the tan undercut at the sides, inside the hull of face and hair (the tattooed arms of the up and fly pictures lie beside the head, outside it)
head_pix0 = tp.head_pix


def head_pix(a, face, disc, how, limit=None):
    if how != 'ross': return head_pix0(a, face, disc, how, limit)
    cx, cy, r = disc
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    skin = np.median(a[int(cy + 0.5 * r):int(cy + 0.7 * r), int(cx - 0.2 * r):int(cx + 0.2 * r)].reshape(-1, 3), axis=0)
    red = (a[..., 0] - a[..., 2] > 85) & (a[..., 0] > 100) & (a[..., 0] < 215) & (a[..., 1] < a[..., 0] - 45) & (np.abs(xx - cx) < 1.05 * r) & (yy < cy - 0.4 * r) & (yy > cy - 1.45 * r)
    lab, n = ndi.label(ndi.binary_closing(red, structure=K3, iterations=2))
    if n == 0: raise RuntimeError('no hair found')
    sizes = ndi.sum(red, lab, range(1, n + 1))
    hair = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.05 * max(sizes)]) & red
    pts = np.argwhere(face | hair)[:, ::-1].astype(np.int32)
    hull = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
    tan = (a[..., 0] - a[..., 2] > 40) & (a[..., 0] - a[..., 2] < 125) & (a[..., 1] - a[..., 2] > 15) & (a[..., 1] - a[..., 2] < 75) & (a[..., 0] > 105) & (a[..., 0] < 225) & (np.abs(a - skin).max(axis=2) > 24)
    under = tan & (hull > 0) & (yy < cy + 0.55 * r)
    return ndi.binary_dilation(hair | under, structure=K3, iterations=3) | ndi.binary_dilation(face, structure=K3, iterations=3)


tp.head_pix = head_pix

def halo(a, disc):
    """the background pockets between the raised arms and the head (white that the flood fill of the border cannot reach: the outlines of the arm, the shoulder and the head close them in, and tip-prep's pocket rule stops at the head's circle):
    near-white pixels round the head, above the chin and outside the face blob (grown by 8 px, which keeps the eye whites and the ears' skin)"""
    cx, cy, r = disc
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    keep = ndi.binary_dilation(tp.face_of(a)[0], structure=K3, iterations=8)
    return (yy < cy + 0.9 * r) & (np.abs(xx - cx) < 1.5 * r) & ~keep


# ------------------------------------------------------------------ the cast
CAST = {
    # Ross: the master is the sitting picture (seed 61); the up (61) and fly (61) pictures are registered on its head. The mouth zone is the faint closed line under the nose, above the stubble; the hair rule is 'ross' (above)
    'ross': dict(master='ross-sit-61', poses={'sit': 'ross-sit-61', 'up': 'ross-up-61', 'fly': 'ross-fly-61'}, mouth=(PAD + 470, PAD + 366, PAD + 548, PAD + 394, 195), mouthW=100, code_brows=True, hair='ross', pockets=(halo,), specks=200),
    # the peel pose: one picture, its own head (hands on the cheeks, in front of the face)
    'rossPeel': dict(master='ross-peel-62', mouth=(PAD + 470, PAD + 366, PAD + 548, PAD + 394, 195), mouthW=100, code_brows=True),
}

def debug_sheet8(rigs):
    """tip-prep's debug_sheet draws on a 768 x 1344 canvas; this one is for the padded pictures: every puppet and pose on magenta, its eyes (red), pupils (blue), mouth (green), pivot (yellow), disc (orange) and brows (cyan), cropped to the figure"""
    S = 1024 + 2 * PAD
    tiles = []
    for key, rig in rigs.items():
        for pn in list(rig.get('bodies', {'': 0}).keys()):
            bg = Image.new('RGBA', (S, S), (255, 0, 255, 255))
            for lk in ('body', 'head'):
                L = rig['bodies'][pn] if (lk == 'body' and 'bodies' in rig) else rig['layers'][lk]
                bg.alpha_composite(Image.open(os.path.join(OUT, os.path.basename(L['file']))).convert('RGBA'), (L['x'], L['y']))
            d = ImageDraw.Draw(bg)
            for e in rig['eyes']: d.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0, 255), width=2)
            for q in rig['pupils']: d.ellipse([q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]], outline=(0, 160, 255, 255), width=2)
            m = rig['mouth']; d.rectangle([m['cx'] - m['w'] / 2, m['cy'] - 10, m['cx'] + m['w'] / 2, m['cy'] + 10], outline=(0, 255, 0, 255), width=2)
            px, py = rig['pivot']; d.line([px - 14, py, px + 14, py], fill=(255, 255, 0, 255), width=3)
            c = rig['disc']; d.ellipse([c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]], outline=(255, 160, 0, 255), width=2)
            for b in rig.get('brows', []): d.line([(p[0], p[1]) for p in b], fill=(0, 255, 255, 255), width=2)
            tiles.append((f'{key} {pn}', bg.convert('RGB')))
    cw, ch = 420, 640
    sheet = Image.new('RGB', (len(tiles) * (cw + 6) + 6, ch + 34), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        im = im.crop((PAD - 40, PAD - 40, PAD + 1064, PAD + 1064)).resize((cw, cw), Image.LANCZOS)
        sheet.paste(im, (6 + i * (cw + 6), 28)); dr.text((9 + i * (cw + 6), 8), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'cast-sheet.jpg'), quality=90)


def clean_head(rig):
    """the head sprite takes a 3 px ring round the face blob, which picks up a sliver of the black collar on each side of the jaw: near-black pixels in the lowest sixth of the sprite that are not the ear plugs (those are higher up) are made transparent.
    Stubble is brown, the collar is black"""
    H = rig['layers']['head']
    f = os.path.join(ROOT, 'public', H['file'])
    im = np.array(Image.open(f).convert('RGBA'))
    rows = np.arange(im.shape[0])[:, None]
    dark = (im[..., :3].max(axis=2) < 70) & (rows > 0.85 * im.shape[0]) & (im[..., 3] > 0)
    dark = ndi.binary_dilation(dark, structure=K3, iterations=1) & (im[..., :3].max(axis=2) < 110) & (rows > 0.85 * im.shape[0])
    im[dark, 3] = 0
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    print('  head: cleaned', int(dark.sum()), 'px of collar')


# ------------------------------------------------------------------ the ear tunnels: where they are, and the head with one or both of them gone
def plugs_of(rig):
    """the two black plugs of the master head: [cx, cy, r] in the rig's px, the left one of the picture first (a black disc of about 700 px at the lobe's lower end); the head layer is read back from public/sp"""
    H = rig['layers']['head']
    im = np.array(Image.open(os.path.join(ROOT, 'public', H['file'])).convert('RGBA'))
    black = (im[..., :3].max(axis=2) < 50) & (im[..., 3] > 200)
    lab, n = ndi.label(black)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if not 400 <= len(ys) <= 1500: continue
        w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        if len(ys) / (w * h) < 0.7 or not 0.8 <= w / h <= 1.25: continue
        out.append([round(float(xs.mean() + H['x']), 1), round(float(ys.mean() + H['y']), 1), round(float(np.sqrt(len(ys) / np.pi)) + 0.8, 1)])
    if len(out) != 2: raise RuntimeError(f'expected two plugs, found {out}')
    return sorted(out)


def head_variants(rig):
    """public/sp/x08-ross-head-{l,none}.png: the master head with its left plug gone (l: the first pop, 7.30 s), both gone (none). A gone plug leaves the lobe stretched round a hole: a ring in the colour of the lobe with the
    ink line round it, and a hole through it (alpha 0) of 0.55 of the plug's radius, so the wall shows through. Returns the files"""
    H = rig['layers']['head']
    base = np.array(Image.open(os.path.join(ROOT, 'public', H['file'])).convert('RGBA'))
    yy, xx = np.mgrid[0:base.shape[0], 0:base.shape[1]]
    files = {}
    ink = np.array([int(rig['ink'][i:i + 2], 16) for i in (1, 3, 5)], dtype=float)
    for name, gone in (('l', (0,)), ('none', (0, 1))):
        im = base.copy()
        for k in gone:
            cx, cy, r = rig['plugs'][k]
            cx, cy = cx - H['x'], cy - H['y']
            d = np.hypot(xx - cx, yy - cy)
            ring = (d >= r + 1) & (d < r + 7) & (base[..., 3] > 200) & (base[..., :3].min(axis=2) > 110)
            lobe = np.median(base[ring][:, :3], axis=0) if ring.sum() > 20 else np.array([254, 205, 140])
            R_out, R_hole = r + 4.5, 0.55 * r
            disc = d < R_out
            im[disc, :3] = lobe.astype(np.uint8); im[disc, 3] = 255
            ring_ink = (d >= R_out - 1.6) & (d < R_out)
            im[ring_ink, :3] = (0.55 * lobe + 0.45 * ink).astype(np.uint8)
            hole_ink = (d >= R_hole) & (d < R_hole + 1.8)
            im[hole_ink, :3] = ink.astype(np.uint8)
            im[d < R_hole, 3] = 0
        Image.fromarray(im, 'RGBA').save(os.path.join(OUT, f'x08-ross-head-{name}.png'), optimize=True)
        files[name] = f'sp/x08-ross-head-{name}.png'
    return files


def head_red(rig):
    """public/sp/x08-ross-head-red.png: the head with no plugs ('none') with every skin-coloured pixel (the face, the ears, the lobes; not the eye whites, the hair, the undercut, the stubble) multiplied into a flat red. The code lays it over the
    head and shows it from the chin up to a rising line (shot 16), or whole, at an opacity (the flush of shots 7-14). Returns the file"""
    im = np.array(Image.open(os.path.join(OUT, 'x08-ross-head-none.png')).convert('RGBA')).astype(np.float32)
    skin = np.array([254, 211, 141], np.float32)
    d = np.abs(im[..., :3] - skin).max(axis=2)
    k = np.clip((62 - d) / 22, 0, 1)[..., None]
    red = im[..., :3] * np.array([1.0, 0.27, 0.22], np.float32)
    out = im.copy(); out[..., :3] = im[..., :3] * (1 - k) + red * k
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'x08-ross-head-red.png'), optimize=True)
    return 'sp/x08-ross-head-red.png'


def fly_silhouette(rig):
    """public/sp/x08-fly-sil.png: the flying Ross (his fly body with the master head on it) from his raised hands down to his belly as one white silhouette, smoothed (the hair's spikes and the fingers' notches go), for the Ross-shaped hole in the
    ceiling (the wall below the ceiling's edge cuts the rest off), and public/sp/x08-fly-sky.png: the same shape filled with a sky (deep blue at the top, pale at the bottom) and two clouds. [w, h] of the pictures and where his neck pivot is in them"""
    H, B = rig['layers']['head'], rig['bodies']['fly']
    x0, y0 = min(H['x'], B['x']), min(H['y'], B['y'])
    x1, y1 = max(H['x'] + H['w'], B['x'] + B['w']), max(H['y'] + H['h'], B['y'] + B['h'])
    sil = np.zeros((y1 - y0, x1 - x0), np.float32)
    for L in (B, H):
        a = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'))[..., 3].astype(np.float32) / 255
        sil[L['y'] - y0:L['y'] - y0 + L['h'], L['x'] - x0:L['x'] - x0 + L['w']] = np.maximum(sil[L['y'] - y0:L['y'] - y0 + L['h'], L['x'] - x0:L['x'] - x0 + L['w']], a)
    cut = int(rig['pivot'][1] - y0 + 330)
    sil = sil[:cut]
    pad = 12
    m = np.pad(sil, ((0, 0), (pad, pad)))
    m = ndi.gaussian_filter(ndi.binary_closing(m > 0.5, structure=K3, iterations=6).astype(np.float32), 3.2)
    m = np.clip((m - 0.5) * 6 + 0.5, 0, 1)  # a crisp edge with a 1-2 px soft border
    out = np.zeros(m.shape + (4,), np.uint8); out[..., :3] = 255; out[..., 3] = (m * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(OUT, 'x08-fly-sil.png'), optimize=True)
    h, w = m.shape
    yy, xx = np.mgrid[0:h, 0:w]
    u = (yy / h)[..., None]
    top, bot = np.array([70, 150, 240], np.float32), np.array([196, 230, 255], np.float32)
    sky = top * (1 - u) + bot * u
    for cx, cy, rx, ry in ((0.35 * w, 0.36 * h, 0.2 * w, 0.03 * h), (0.65 * w, 0.62 * h, 0.22 * w, 0.035 * h)):
        cloud = np.clip(1.4 - np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2), 0, 1)[..., None]
        sky = sky * (1 - cloud) + 255 * cloud
    sk = np.zeros(m.shape + (4,), np.uint8); sk[..., :3] = np.clip(sky, 0, 255).astype(np.uint8); sk[..., 3] = out[..., 3]
    Image.fromarray(sk, 'RGBA').save(os.path.join(OUT, 'x08-fly-sky.png'), optimize=True)
    return dict(file='sp/x08-fly-sil.png', sky='sp/x08-fly-sky.png', w=int(w), h=int(h), pivot=[rig['pivot'][0] - x0 + pad, rig['pivot'][1] - y0])


# ------------------------------------------------------------------ the hand with the phone (the inserts) and the screens of the painted phones
def hand_insert():
    """public/sp/x08-hand.png: ross-hand-62 cut out (its forearm runs off the bottom of the picture), and public/sp/x08-hand-screen.png: the phone's white screen as a mask (white, alpha) of exactly the same size, so that the
    code can draw a screen on the glass and clip it to the glass (rounded corners, the notch). `screen` = the glass's box in the layer's px, `ox`, `oy` = where the layer sits in the 1024 x 1024 picture"""
    a = np.array(Image.open(os.path.join(SRC, 'ross-hand-62.png')).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a)
    im, (ox, oy) = fxp.layer(rgb, alpha, 3)
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    sizes = [(int((lab == i).sum()), i) for i in range(1, n + 1) if i not in border]
    glass = lab == max(sizes)[1]
    glass = ndi.binary_fill_holes(ndi.binary_closing(glass, structure=K3, iterations=2))
    ys, xs = np.where(glass)
    box = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    m = np.zeros(a.shape[:2] + (4,), np.uint8); m[..., :3] = 255; m[..., 3] = (ndi.gaussian_filter(glass.astype(np.float32), 0.8) * 255).astype(np.uint8)
    w, h = im.size
    Image.fromarray(m[oy:oy + h, ox:ox + w], 'RGBA').save(os.path.join(OUT, 'x08-hand-screen.png'), optimize=True)
    im.save(os.path.join(OUT, 'x08-hand.png'), optimize=True)
    skin = [int(v) for v in np.median(a[600:660, 300:330].reshape(-1, 3), axis=0)]
    ink = [int(v) for v in np.median(a[np.where(alpha > 0.9)][np.argsort(a[np.where(alpha > 0.9)].sum(axis=1))[:2000]], axis=0)]
    res = dict(file='sp/x08-hand.png', screenFile='sp/x08-hand-screen.png', w=w, h=h, ox=ox, oy=oy, screen=[box[0] - ox, box[1] - oy, box[2] - ox, box[3] - oy], skin=skin, ink=ink)
    print('  hand', res)
    return res


def screen_of(rig, pose, key):
    """the white glass of the phone that Ross holds, in the layer of his body picture `pose`: a mask file (white, alpha = the glass: the fingers that cover part of it stay out) of the layer's size and the rectangle of
    the glass (centre, width, height, turn in degrees, clockwise, in the layer's px). The up pose's glass was greyed in grey_screen(); the sit pose's is near-white"""
    L = rig['bodies'][pose]
    im = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA')).astype(int)
    if pose == 'up': g = (np.abs(im[..., :3] - np.array([232, 233, 236])).max(axis=2) < 6) & (im[..., 3] > 200)
    else: g = (im[..., :3].min(axis=2) >= 244) & (im[..., 3] > 200)
    lab, n = ndi.label(g)
    best = 1 + int(np.argmax(ndi.sum(g, lab, range(1, n + 1))))
    blob = ndi.binary_fill_holes(lab == best)
    ys, xs = np.where(blob)
    (cx, cy), (w, h), ang = cv2.minAreaRect(np.stack([xs, ys], 1).astype(np.float32))
    if w > h: w, h, ang = h, w, ang - 90
    ang = ((ang + 45) % 90) - 45
    m = np.zeros(blob.shape + (4,), np.uint8); m[..., :3] = 255; m[..., 3] = (ndi.gaussian_filter(blob.astype(np.float32), 0.7) * 255).astype(np.uint8)
    Image.fromarray(m, 'RGBA').save(os.path.join(OUT, f'x08-{key}-screen-{pose}.png'), optimize=True)
    return dict(file=f'sp/x08-{key}-screen-{pose}.png', cx=round(float(cx), 1), cy=round(float(cy), 1), w=round(float(w), 1), h=round(float(h), 1), turn=round(float(ang), 1), area=int(blob.sum()))


def plate():
    """the living room plate as a jpg, and what the code needs of it: the picture's numbers (px of the 768 x 1344 plate, read off the picture)"""
    Image.open(os.path.join(SRC, 'bg-living-61.png')).convert('RGB').save(os.path.join(OUT, 'x08-bg-living.jpg'), quality=95)
    return dict(file='sp/x08-bg-living.jpg', ceiling=170, window=[197, 306, 567, 776], panes=[[230, 351, 373, 542], [389, 351, 532, 542], [231, 560, 532, 736]], backTop=790, seatTop=962, seatFront=1042, floor=1116, wallFloor=1085, lamp=[33, 469, 199, 611])


# ------------------------------------------------------------------ the debug sheet of every new piece
def cast_sheet(rigs, props):
    tiles = [('head', rigs['ross']['layers']['head']['file'])] + [(f'head {k}', f) for k, f in rigs['ross']['headFiles'].items()]
    tiles += [(f'ross {p}', None) for p in rigs['ross']['bodies']] + [('rossPeel', None), ('hand', props['hand']['file']), ('hand screen', props['hand']['screenFile']), ('plate', props['plate']['file'])]
    cw, ch, cols = 300, 420, 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * ch), (128, 128, 128))
    d = ImageDraw.Draw(sheet)
    for i, (name, f) in enumerate(tiles):
        if f: im = Image.open(os.path.join(ROOT, 'public', f)).convert('RGBA')
        else:
            key, pose = ('ross', name.split()[1]) if name.startswith('ross ') else ('rossPeel', 'body')
            R = rigs[key]; S = 1024 + 2 * PAD
            im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
            for lk in ('body', 'head'):
                L = R['bodies'][pose] if (lk == 'body' and 'bodies' in R) else R['layers'][lk]
                im.alpha_composite(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'), (L['x'], L['y']))
            im = im.crop(im.getbbox())
        k = min((cw - 20) / im.size[0], (ch - 44) / im.size[1])
        t = lp.scaled(im, k)
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(t, (x + (cw - t.size[0]) // 2, y + 8 + (ch - 44 - t.size[1]) // 2), t)
        d.text((x + 8, y + ch - 26), name, fill=(255, 255, 255))
    os.makedirs(os.path.join(ROOT, 'out', 'x08-cast'), exist_ok=True)
    sheet.save(os.path.join(ROOT, 'out', 'x08-cast', 'prep-sheet.jpg'), quality=92)


DOC = ("Pieces of x08 \"Just Let Me Pay\" (scripts/x08-art-gen.py, scripts/x08-prep.py); this text is props.doc. Puppets (ross, rossPeel) are cut like tip-rig.json's, in px of the picture PADDED by `pad` on every side (1024 + 2 pad square, y down); pivot = the neck. "
       "ross: ONE head (the master's, ross-sit-61) and a body per pose (sit, up, fly: the pose pictures registered on the head, which is why the standing ones are 1.45 and 1.65 times bigger than they were painted); plugs = the two ear tunnels [cx, cy, r], the picture's left one first; "
       "headFiles = the head with the left plug gone (l), both gone (none): the lobe is a ring with a hole through it; red = the 'none' head with the skin turned red; flySil = a white silhouette of the flying Ross from his raised hands to his belly, and the same shape filled with a sky (file, sky, w, h, pivot). screens.sit / screens.up = the glass of the phone in that body picture: file (a mask of the body layer's size), cx, cy, w, h, turn (px of the layer, turn clockwise in degrees). "
       "rossPeel: the peel picture (both hands on his cheeks), its own head, one body. props.hand = the hand with the phone for the inserts (file, screenFile = the glass as a mask of the same size, screen = [x0, y0, x1, y1] of the glass in the layer's px, ox, oy = the layer's place in the 1024 picture, skin, ink). "
       "scenes.living = the plate x08-bg-living.jpg (768 x 1344): ceiling = the row where the ceiling band ends, window = the frame's box, panes = the three panes of its glass, backTop = the couch back's top, seatTop and seatFront = the cushion's top and its front edge, floor = where the couch stands, wallFloor = where the wall meets the floor, lamp = the lamp shade's box.")


if __name__ == '__main__':
    only = sys.argv[1:]
    rigs = {}
    for key, cfg in CAST.items():
        if only and key not in only: continue
        try:
            rigs[key] = tp.puppet(key, cfg)[0]
        except Exception as e:
            import traceback; traceback.print_exc()
            print('  FAILED', key, e)
    debug_sheet8(rigs)
    if only:
        json.dump({'src': [1024 + 2 * PAD, 1024 + 2 * PAD], 'pad': PAD, **rigs}, open(os.path.join(ROOT, 'src', 'x08-rig-part.json'), 'w'), indent=1)
        print('wrote the puppets (src/x08-rig-part.json)')
        sys.exit()
    clean_head(rigs['ross'])
    rigs['ross']['plugs'] = plugs_of(rigs['ross'])
    rigs['ross']['headFiles'] = head_variants(rigs['ross'])
    rigs['ross']['headFiles']['red'] = head_red(rigs['ross'])
    rigs['ross']['flySil'] = fly_silhouette(rigs['ross'])
    rigs['ross']['screens'] = {p: screen_of(rigs['ross'], p, 'ross') for p in ('sit', 'up')}
    props = dict(doc=DOC, hand=hand_insert(), plate=plate())
    json.dump({'src': [1024 + 2 * PAD, 1024 + 2 * PAD], 'pad': PAD, **rigs, 'props': props, 'scenes': {'living': props['plate']}}, open(os.path.join(ROOT, 'src', 'x08-rig.json'), 'w'), indent=1)
    cast_sheet(rigs, props)
    print('wrote the puppets, the head variants, the hand, the plate, src/x08-rig.json and out/x08-cast/prep-sheet.jpg')
