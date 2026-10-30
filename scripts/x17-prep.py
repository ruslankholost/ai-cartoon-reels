# Prep for x17 "Seat Swap" (docs/x17-seat-swap.md): cuts the pictures of out/x17-cast (scripts/x17-art-gen.py; the kept file of each name is the one DONE.txt names, else its SEEDS entry, else 61) into the puppets, props and plates the
# scenes use (src/x17-scenes.tsx) and measures what the code needs. The recipe of scripts/x16-prep.py (it chains that script, and through it x15, x14, x10, nv3 and tip-prep, so the shared kit is the same files as before). Reused, not cut again:
# x08's Ross head and x15's purple copies of it (the code reads src/x08-rig.json and src/x15-rig.json itself).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x17-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x17-prep.py ross people plates     -> only those parts (src/x17-rig.json keeps the others)
# Writes public/sp/x17-*.png|jpg, src/x17-rig.json (px of the pictures, y down), scratch/x17-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the four new bodies (seat: belted into a plane seat, the seat is part of the picture; cram: the same seat, hands clasped, hunched; cling: spread-eagled; point: pointing and yelling) are the pose
# pictures registered on it. The people (the couple over a seat top and kissing, the attendant, the peacock man and his fanned peacock, the pilot standing and sitting, the captain's cap) are flat cut-outs: a picture, a mouth to draw over the
# painted one (a patch of skin and an open mouth, measured), the eyes of the couple (for the bride's lashes). The plates are pictures as painted (jpg) with what the code needs measured: the cabin's window glass, the seat in front, row 47's two men,
# the toilet door and the exit, the wing and its windows (the sky is cut out of the wing's plate: the code draws a sky with racing clouds behind it), the cockpit's seat.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x16p', os.path.join(HERE, 'x16-prep.py'))
x16p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x16p)   # (its patches of tip-prep's finders are applied on import)
x15p, x14p, x8, tp, nvp, fxp = x16p.x15p, x16p.x14p, x16p.x8, x16p.tp, x16p.nvp, x16p.fxp
spp = tp.spp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
CAST_DIR = os.path.join(ROOT, 'out', 'x17-cast')
DIRS = [CAST_DIR] + [os.path.join(ROOT, 'out', d) for d in ('x16-cast', 'x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x17-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x17-rig.json')


def kept_files():
    """name -> the kept picture's file name (without .png): the files DONE.txt of the art agent names (a line like `name -> name-62.png ...`), else the last seed of SEEDS in scripts/x17-art-gen.py, else 61 (read without running the file: it starts the GPU)"""
    kept = {}
    done = os.path.join(CAST_DIR, 'DONE.txt')
    if os.path.exists(done):
        for line in open(done, encoding='utf-8', errors='replace'):
            m = re.match(r'\s*([a-z0-9-]+)\s*(?:->|=>|:)\s*([a-z0-9-]+-\d\d)(?:\.png)?', line)
            if m: kept[m[1]] = m[2]
    src = open(os.path.join(HERE, 'x17-art-gen.py'), encoding='utf-8').read()
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', src, re.M)
    seeds = ast.literal_eval(m.group(1)) if m else {}
    for n, s in seeds.items(): kept.setdefault(n, f'{n}-{s[-1]}')
    return kept


KEPT = kept_files()


def find(name):
    """a picture by its name: out/x17-cast/<kept file>.png; a name that already ends in a seed (ross-sit-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name):
        name = KEPT.get(name, f'{name}-61')
        if not os.path.exists(os.path.join(CAST_DIR, name + '.png')):   # (the kept seed is not painted (yet): the newest picture of that name that is not an -old one)
            cand = [f for f in os.listdir(CAST_DIR) if re.fullmatch(re.escape(name.rsplit('-', 1)[0]) + r'-\d\d\.png', f)]
            if cand: name = max(cand, key=lambda f: os.path.getmtime(os.path.join(CAST_DIR, f)))[:-4]
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def have(name):
    try: find(name); return True
    except StopIteration: return False


def load17(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if 'bare' in name:   # the bareheaded pilot was painted on a grainy off-white ground (a texture of 225-250 that the flood fill's 238 cannot take): every pale, hardly coloured pixel becomes white (his shirt and the ground; the outlines keep them apart)
        a[(a.min(axis=2) >= 222) & (a.max(axis=2) - a.min(axis=2) < 16)] = 255
        lab, n = ndi.label(a.min(axis=2) < 222, structure=np.ones((3, 3)))   # (and the specks of the grain that are darker than that: a speck smaller than 40 px is paper, not ink)
        small = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))) if v < 40])
        a[small] = 255
    if name == 'ross-cling': a = np.ascontiguousarray(a[:, ::-1])   # his watch was painted on the wrong wrist (the master's is on his left, the picture's right): mirrored, it is on the right one
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x17', load17
x14p.DBG = DBG   # (x14's debug sheet is written here, not over x14's)

ROSS_POSES = {'seat': 'ross-seat', 'cram': 'ross-cram', 'cling': 'ross-cling', 'point': 'ross-point'}


def patch_gaps(name, L, chair):
    """where the master's head does not cover what the pose's own head took away, the plate showed through: a crescent between the chin and the shirt's collar (all four poses) and, in the two seat poses, slivers of the seat's back beside the ears. The pixels that are
    transparent in the body (the head is drawn over them, so it hides what it covers at rest and the fill shows when it tilts) are filled: under the chin (rows 735-812, 150 px either side of the neck) with his skin; in the seat poses, inside the hull of the seat's blue-grey pixels and above the chin line, with the seat's colour. Written over
    the body's file (the layer grows to take them)"""
    S = 1664
    body = np.zeros((S, S, 4), np.uint8)
    b = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA')); body[L['y']:L['y'] + b.shape[0], L['x']:L['x'] + b.shape[1]] = b
    yy, xx = np.mgrid[0:S, 0:S]
    rgb0 = body[..., :3].astype(int)   # bits of the painting's white ground that the cut left on the shoulders (and the grey edge pixels round them)
    white = cv2.dilate(((body[..., 3] > 0) & (rgb0.min(axis=2) > 205) & (yy < 760)).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2) > 0
    body[white & (yy < 760), 3] = 0
    gap = body[..., 3] < 128   # all of the body's hole, not only what the master head leaves open at rest: the head tilts and dips and then the plate would show round it
    skin = np.array([0xfe, 0xd3, 0x8d], np.uint8)
    fill = np.zeros((S, S), bool); col = np.zeros((S, S, 3), np.uint8)
    neck = gap & (yy >= 735) & (yy <= 812) & (np.abs(xx - 837) <= 150)
    fill |= neck; col[neck] = skin
    if chair:
        rgb = body[..., :3].astype(int)
        ch = (body[..., 3] > 200) & (rgb[..., 2] - rgb[..., 0] > 18) & (rgb[..., 0] < 150) & (yy < 780)
        pts = np.argwhere(ch)[:, ::-1].astype(np.int32)
        hull = np.zeros((S, S), np.uint8); cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
        blue = np.median(rgb[ch], axis=0).astype(np.uint8)
        sides = gap & (hull > 0) & (yy < 740) & ((xx - 837) ** 2 + (yy - 581) ** 2 <= (1.7 * 195) ** 2)
        fill |= sides; col[sides] = blue
    # the neck: in all four pictures the inside of the collar is painted black (a U, flat on top where the head's cut ended), so a head that tilts or goes over to the window had a black hole under it: a column of skin from behind the head down into the U,
    # darker under the jaw, with a thin line down its sides as round the hands
    cx, top = 834, 731
    u = np.clip((yy - 660) / 71.0, 0, 1); hw = 80 + 38 * u * u * (3 - 2 * u)   # a neck that flares into the collar
    col_m = (np.abs(xx - cx) <= hw) & (yy >= 640) & (yy <= top)
    nk = col_m | ((yy > top) & (((xx - cx) / 118.0) ** 2 + ((yy - top) / 64.0) ** 2 <= 1))
    t = np.clip((yy - 700) / 50.0, 0, 1)[..., None]
    fill |= nk; col[nk] = (np.array([0xe3, 0xa9, 0x62], float) * (1 - t) + skin * t)[nk].astype(np.uint8)
    col[col_m & (np.abs(xx - cx) >= hw - 3)] = (0x7d, 0x4a, 0x1a)
    n = int(fill.sum())
    if n:
        out = body.copy(); out[fill, :3] = col[fill]; out[fill, 3] = 255
        ys, xs = np.where(out[..., 3] > 0)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        Image.fromarray(out[y0:y1, x0:x1], 'RGBA').save(os.path.join(ROOT, 'public', L['file']), optimize=True)
        L.update(x=int(x0), y=int(y0), w=int(x1 - x0), h=int(y1 - y0))
    print(f'  ross {name}: {n} px of gap filled (neck {int(neck.sum())})')


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    x15rig = json.load(open(os.path.join(ROOT, 'src', 'x15-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES); cfg['pockets'] = ()
        x14p.NOPOCKET[0] = True
        new = tp.puppet('ross', cfg)[0]
        x14p.NOPOCKET[0] = False
        r = json.loads(json.dumps(x8rig['ross']))   # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        for pn in r['bodies']: print(f'  ross {pn}: {x15p.drop_islands(r["bodies"][pn])} px of loose pieces cleared')
        for pn in r['bodies']: patch_gaps(pn, r['bodies'][pn], pn in ('seat', 'cram'))
        r['layers']['body'] = r['bodies'][next(iter(r['bodies']))]
        r.pop('flySil', None); r.pop('screens', None)
        r['purple'] = x15rig['puppets']['ross']['purple']   # (x15's purple copies of the master head: plugs in, the left one gone, both gone)
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    return rigs


# ------------------------------------------------------------------ the people: flat cut-outs with a mouth to draw over the painted one
def box_of(m):
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def mouth_of(a, zone, skin_zone, thr=34):
    """a painted mouth (a grin: red lips, teeth, a dark inside, its outline): the pixels in `zone` (x0, y0, x1, y1) that are not skin, where the skin is the median colour of `skin_zone` (a stretch of plain cheek or chin next to it); returns the
    box of the biggest piece, its middle and its width in the picture's px, and the skin colour as hex"""
    skin = tp.med(a, *skin_zone)
    x0, y0, x1, y1 = zone
    z = np.zeros(a.shape[:2], bool); z[y0:y1, x0:x1] = True
    m = (np.abs(a - skin).max(axis=2) > thr) & z
    lab, n = ndi.label(ndi.binary_closing(m, structure=K3, iterations=2))
    j = 1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1))))
    b = box_of(lab == j)
    return dict(box=b, cx=(b[0] + b[2]) / 2, cy=(b[1] + b[3]) / 2, w=b[2] - b[0], h=b[3] - b[1], skin=tp.hexc(skin))


def extend_down(d, row, n):
    """the couple's picture ends at the seat's edge (row 752); where there is no seat in front of them (the cockpit) they need a body under it: the row `row` of the picture (above their hands: a white dress and a black tuxedo, flat colours) is repeated `n` times under the sprite"""
    f = os.path.join(ROOT, 'public', d['file'])
    im = np.array(Image.open(f).convert('RGBA'))
    src = im[row - d['oy']]
    ext = np.repeat(src[None, :, :], n, axis=0)
    fade = np.clip(1 - np.arange(n) / (0.62 * n), 0, 1) ** 1.3   # (the body fades into the dark over the first 62 % of it, so no flat cut shows)
    ext[..., 3] = (ext[..., 3] * fade[:, None]).astype(np.uint8)
    out = np.concatenate([im, ext], axis=0)
    Image.fromarray(out, 'RGBA').save(f, optimize=True)
    return dict(d, h=int(out.shape[0]), ext=n, extFrom=int(im.shape[0]))


def drop_pockets(a, alpha, lo=100, hi=2500):
    """the ground that the outlines of an arm and a torso (or the two legs) shut in is still opaque white after the flood fill: the near-white pieces of 100-2500 px are made transparent (not the juice glass's ice, x 160-310, y 330-600, and not the shirt's collar, rows 470-560)"""
    white = (alpha > 0.5) & (a.min(axis=2) >= 236)
    lab, n = ndi.label(white)
    al = alpha.copy()
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i
        if not (lo <= m.sum() <= hi): continue
        cx, cy = (sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2
        if (160 <= cx <= 310 and 330 <= cy <= 600) or 470 <= cy <= 560: continue
        al[sl][m] = 0.0
    return al


def flat(name, protect=True, drop=None, pad=4, out=None, fix=None):
    """a cut-out of the picture `name` (flood fill of the white ground, the texture mask keeps a white shirt, a white cap or a white tank top; `drop(a)` a mask of what is not the prop); returns the layer {file, w, h, ox, oy} (the offset is in the
    picture's px)"""
    d, alpha = tp.prop(out or name, name, protect=protect, drop=drop, pad=pad, fix=fix)
    return d


def seat_mask(a, y0):
    """the blue seat top under the couple (the big blue piece from row y0 down): their hands are over its upper edge, the seat itself is the plate's"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blue = (b > r + 25) & (b > 90) & (r < 150) & (np.arange(a.shape[0])[:, None] >= y0)
    lab, n = ndi.label(blue)
    j = 1 + int(np.argmax(ndi.sum(blue, lab, range(1, n + 1))))
    return ndi.binary_dilation(lab == j, structure=K3, iterations=2)


def caps_of(a, eyes_y, halves):
    """the white caps (the big enclosed near-white pieces above the eyes): per half of the picture (x0, x1) the biggest one; its box in the picture's px"""
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    H, W, _ = a.shape
    out = []
    for x0, x1 in halves:
        best = None
        for i, sl in enumerate(ndi.find_objects(lab), 1):
            if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W: continue
            m = int((lab[sl] == i).sum()); cx = (sl[1].start + sl[1].stop) / 2; cy = (sl[0].start + sl[0].stop) / 2
            if m > 8000 and x0 <= cx < x1 and cy < eyes_y and (best is None or m > best[0]): best = (m, sl)
        out.append([int(best[1][1].start), int(best[1][0].start), int(best[1][1].stop), int(best[1][0].stop)] if best else None)
    return out


def teal_head(a, region):
    """the peacock's head: the teal pixels (green and blue over red) in `region` (x0, y0, x1, y1): their middle and the box"""
    x0, y0, x1, y1 = region
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    t = (g > r + 50) & (b > r + 40) & (g < 200) & (b < 190)
    z = np.zeros(t.shape, bool); z[y0:y1, x0:x1] = True
    t &= z
    ys, xs = np.where(t)
    return dict(cx=float(xs.mean()), cy=float(ys.mean()), box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)])


def people(which):
    out = {}
    # the couple over a seat top (1024 x 1024): two heads (the eyes of each, for the bride's lashes), two grins (the mouths to draw over), the two caps (the lettering), the hands stay on the seat's edge
    if have('couple-pop'):
        a = load17('couple-pop')
        d = flat('couple-pop', drop=lambda a: seat_mask(a, 735) | (np.arange(a.shape[0])[:, None] >= 752))
        d = extend_down(d, 700, 600)
        eyes = {'bride': spp.eyes_of(a, (150, 395, 500, 480)), 'groom': spp.eyes_of(a, (512, 320, 1024, 500))}
        pupils = {k: tp.pupils_in(a, v, spp.pupils_of(a, v)) for k, v in eyes.items()}
        grin = {'bride': mouth_of(a, (190, 485, 445, 615), (270, 622, 380, 636)), 'groom': mouth_of(a, (580, 478, 850, 612), (650, 615, 760, 628))}
        caps = caps_of(a, 400, [(0, 512), (512, 1024)])
        out['couple_pop'] = dict(d, eyes=eyes, pupils=pupils, grin=grin, caps=caps, seat=735)
        print('  couple-pop:', d, 'grins', {k: (v['box'], v['skin']) for k, v in grin.items()}, 'caps', caps, 'eyes', {k: [(round(e['cx']), round(e['cy'])) for e in v] for k, v in eyes.items()})
    if have('couple-kiss'):
        a = load17('couple-kiss')
        d = flat('couple-kiss', drop=lambda a: np.arange(a.shape[0])[:, None] >= 700)
        out['couple_kiss'] = dict(d, caps=caps_of(a, 420, [(0, 512), (512, 1024)]))
        print('  couple-kiss:', d, out['couple_kiss']['caps'])
    # the attendant: her grin is red lips and teeth; a scarf at her neck
    for n in ('fa', 'fa-present'):
        if have(n):
            a = load17(n)
            d = flat(n)
            g = mouth_of(a, (395, 395, 625, 490), (440, 486, 560, 498))
            sc = (a[..., 0] > 190) & (a[..., 1] < 90) & (a[..., 2] < 90); sc[:495] = False; sc[620:] = False
            out[n.replace('-', '_')] = dict(d, grin=g, scarf=box_of(sc))
            print(f'  {n}:', d, 'grin', g['box'], g['skin'], 'scarf', box_of(sc))
    # the peacock man (no mouth: his beard hides it) with the peacock on his shoulder, and the fanned peacock (its head, to put the fan where the bird sat)
    if have('peacock-man'):
        a = load17('peacock-man')
        d = flat('peacock-man')
        out['peacock_man'] = dict(d, bird=teal_head(a, (230, 80, 420, 330)))
        print('  peacock-man:', d, 'bird', out['peacock_man']['bird'])
    if have('peacock-fan'):
        a = load17('peacock-fan')
        d = flat('peacock-fan', protect=False)
        out['peacock_fan'] = dict(d, bird=teal_head(a, (440, 540, 590, 700)))
        print('  peacock-fan:', d, 'bird', out['peacock_fan']['bird'])
    # the pilot standing and sitting: a small smile under the moustache is the mouth; the cap alone
    for n in ('pilot-stand', 'pilot-sit', 'pilot-sit-bare'):
        if have(n):
            a = load17(n)
            d = flat(n, fix=drop_pockets)
            g = dict(box=[494, 444, 534, 458], cx=514.0, cy=451.0, w=40, h=14, skin=tp.hexc(tp.med(a, 470, 466, 550, 478)))
            out[n.replace('-', '_')] = dict(d, grin=g)
            print(f'  {n}:', d, 'mouth', g['box'], g['skin'])
    if have('pilot-hat'):
        d = flat('pilot-hat', protect=False)
        out['pilot_hat'] = d
        print('  pilot-hat:', d)
    return out


# ------------------------------------------------------------------ the plates (768 x 1344 pictures as painted, jpg) and what the code needs measured on them
def comp_box(m, pick='biggest'):
    lab, n = ndi.label(m)
    j = 1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1))))
    return lab == j


def rgba_png(name, a, alpha, crop=True, pad=2):
    """a layer from a plate: the plate's own pixels with `alpha`; cropped to its opaque part; returns {file, w, h, ox, oy}"""
    ys, xs = np.where(alpha > 0.02)
    x0, y0, x1, y1 = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, a.shape[1]), min(ys.max() + pad + 1, a.shape[0])) if crop else (0, 0, a.shape[1], a.shape[0])
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    out[..., :3] = np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(alpha[y0:y1, x0:x1] * 255 + 0.5, 0, 255).astype(np.uint8)
    f = os.path.join(OUT, f'x17-{name}.png'); Image.fromarray(out, 'RGBA').save(f, optimize=True)
    return dict(file=f'sp/x17-{name}.png', w=int(x1 - x0), h=int(y1 - y0), ox=int(x0), oy=int(y0))


def jpg(name, src):
    im = Image.open(find(src)).convert('RGB')
    im.save(os.path.join(OUT, f'x17-{name}.jpg'), quality=96)
    return dict(file=f'sp/x17-{name}.jpg', w=im.size[0], h=im.size[1])


def plates():
    out = {}
    if have('bg-cabin'):   # the cabin by window 12A: the glass is the flat light-blue blob (its mask is a layer: the code draws the sky and the clouds through it)
        a = load17('bg-cabin'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        glass = comp_box((b > 225) & (r < 190) & (b - r > 45))
        glass = ndi.binary_dilation(glass, structure=K3, iterations=1)
        out['cabin'] = dict(jpg('bg-cabin', 'bg-cabin'), glass=dict(rgba_png('cabin-glass', a, glass.astype(np.float32)), box=box_of(glass)))
        print('  cabin:', out['cabin']['glass'])
    if have('bg-seatback'):   # the seat in front: its blue back is the occluder (the couple pops up from behind it); its top edge is measured per column
        a = load17('bg-seatback'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        seat = (b - r > 25) & (r < 135) & (np.arange(a.shape[0])[:, None] >= 650)
        seat = comp_box(ndi.binary_closing(seat, structure=np.ones((5, 5), bool), iterations=2))
        seat = ndi.binary_fill_holes(ndi.binary_dilation(seat, structure=K3, iterations=2))
        top = [int(np.argmax(seat[:, x])) if seat[:, x].any() else -1 for x in range(0, a.shape[1], 8)]
        out['seatback'] = dict(jpg('bg-seatback', 'bg-seatback'), front=rgba_png('seatback-front', a, seat.astype(np.float32), crop=False), box=box_of(seat), top=top)
        print('  seatback: seat box', out['seatback']['box'], 'top edge', top[::12])
    if have('bg-row47'):   # row 47: two huge men, the empty middle seat, the toilet door and the exit (its red handle)
        a = load17('bg-row47'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        red = (r > 170) & (g < 45) & (b < 45)
        handle = box_of(comp_box(red))
        # the two doors come out of the plate as sprites (the toilet's swings open, the exit's pops out and the sky shows through its doorway): the panel of each is its colours inside its frame, kept clear of the men (salmon skin, black hair, olive shirt)
        skin = (r - b > 70) & (r > 200) & (g > 100)
        mn = a.min(axis=2)
        yy, xx = np.mgrid[0:r.shape[0], 0:r.shape[1]]
        heads = ((xx - 172) ** 2 + (yy - 718) ** 2 <= 90 ** 2) | ((xx - 606) ** 2 + (yy - 725) ** 2 <= 91 ** 2)   # (the two men's heads: their eye whites are as pale as a door; the heads and everything below them are the men's)
        def panel(rect, ok):
            z0 = np.zeros(r.shape, bool); z0[rect[1]:rect[3], rect[0]:rect[2]] = True
            z0 &= yy < 800
            z = z0 & ~heads
            m = ndi.binary_closing(ok & z, structure=np.ones((5, 5), bool), iterations=2) & z
            m = ndi.binary_fill_holes(m) & z & ~skin
            m = ndi.binary_opening(m, structure=np.ones((3, 3), bool), iterations=1)
            # the ring of door between a head's outline and the circle that keeps the head whole: the door's colours that reach the rest of the door (the eye whites are shut in by the outline and do not)
            lab, n = ndi.label(ok & z0 & ~skin)
            big = np.isin(lab, [i for i, a in enumerate(ndi.sum(np.ones(lab.shape), lab, range(1, n + 1)), 1) if a > 4000])
            return m | (big & heads & z0)
        exit_rect = [520, 178, 727, 850]
        exit_ok = ((mn >= 170) & (np.abs(r - g) < 10) & (np.abs(g - b) < 16)) | ((b > 225) & (r > 150)) | ((r > 150) & (g < 70) & (b < 70)) | ((mn >= 120) & (mn < 200) & (np.abs(r - g) < 10) & (np.abs(g - b) < 16))
        ex = panel(exit_rect, exit_ok)
        toi_rect = [34, 320, 170, 838]
        toi_ok = (mn >= 190) & (r - b < 70) & (r - b > 8)
        toi = panel(toi_rect, toi_ok)
        plate = a.copy()
        # the exit's painted pull handle is part of the picture; the code draws its own (it is yanked down), so the painted one is painted out of the door's own grey (the median of the door round it)
        hx0, hy0, hx1, hy1 = 530, 426, 718, 506
        plate[hy0:hy1, hx0:hx1] = tp.med(a, 560, 385, 690, 420)
        exit_grey = tp.hexc(tp.med(a, 560, 385, 690, 420))
        out['row47'] = dict(jpg('bg-row47', 'bg-row47'), handle=handle, exitRect=exit_rect, toiRect=toi_rect, exitGrey=exit_grey,
                            exitPanel=rgba_png('exit-panel', plate, ndi.gaussian_filter(ex.astype(np.float32), 0.6), crop=False), toiPanel=rgba_png('toilet-panel', plate, ndi.gaussian_filter(toi.astype(np.float32), 0.6), crop=False),
                            noDoors=rgba_png('row47-nodoors', plate, 1.0 - ndi.gaussian_filter((ex | toi).astype(np.float32), 0.6), crop=False))
        print('  row47: exit handle', handle, 'exit panel px', int(ex.sum()), 'toilet panel px', int(toi.sum()))
    if have('bg-wing'):   # the wing outside the plane's windows: the sky is cut out (the code draws a sky behind it); the windows and the wing are measured
        a = load17('bg-wing'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        sky = (b - r > 40) & (b > 175)
        lab, n = ndi.label(sky)
        border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); border = border[border > 0]
        sky = np.isin(lab, border)
        keep = ~ndi.binary_dilation(sky, structure=K3, iterations=1) | ~sky
        alpha = (~sky).astype(np.float32)
        alpha = np.where(ndi.binary_dilation(~sky, structure=K3, iterations=0) & ~sky, 1.0, 0.0).astype(np.float32)
        al = ndi.gaussian_filter(alpha, 0.6)
        al[~sky] = 1.0
        grey = (np.abs(r - g) < 9) & (np.abs(g - b) < 14) & (r > 140) & (r < 215)
        band = np.zeros(grey.shape, bool); band[430:640, :] = True
        wl, wn = ndi.label(grey & band)
        wins = []
        for i, sl in enumerate(ndi.find_objects(wl), 1):
            m = int((wl[sl] == i).sum())
            if 600 < m < 12000: wins.append([int(sl[1].start), int(sl[0].start), int(sl[1].stop), int(sl[0].stop)])
        wins.sort()
        big = max(wins, key=lambda w: (w[2] - w[0]) * (w[3] - w[1])) if wins else None
        wing = comp_box(grey & (np.arange(a.shape[0])[:, None] >= 610) & ~band)
        cnt, _ = cv2.findContours(wing.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        poly = cv2.approxPolyDP(max(cnt, key=cv2.contourArea), 8, True)[:, 0, :].tolist()
        out['wing'] = dict(jpg('bg-wing', 'bg-wing'), front=rgba_png('wing-front', a, al, crop=False), windows=wins, big=big, wing=poly, skyTop=tp.hexc(tp.med(a, 20, 20, 120, 120)), skyBottom=tp.hexc(tp.med(a, 640, 1260, 760, 1330)))
        print('  wing: windows', wins, 'big', big, 'wing polygon', poly)
    if have('bg-cockpit'):   # the cockpit: the captain's seat (navy), the two side windows, the row of gauges
        a = load17('bg-cockpit'); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        seat = comp_box((r < 45) & (g < 55) & (b > 40) & (b < 110) & (b - r > 20))
        wl = (b > 200) & (r < 190) & (b - r > 40)
        lab, n = ndi.label(wl)
        wins = sorted([box_of(lab == i) for i in range(1, n + 1) if (lab == i).sum() > 3000])
        out['cockpit'] = dict(jpg('bg-cockpit', 'bg-cockpit'), seat=box_of(seat), windows=wins)
        print('  cockpit: seat', out['cockpit']['seat'], 'windows', wins)
    return out


def debug_sheet17(rigs):
    return x14p.debug_sheet14(rigs)


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    if not only or 'plates' in only:
        rig['plates'] = plates(); print('  done plates')
    if not only or 'people' in only:
        rig['people'] = people(only); print('  done people')
    pw = [k for k in ('ross',) if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet17(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
