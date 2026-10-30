# Prep for x15 "Bleep Fee" (docs/x15-bleep-fee.md): cuts the pictures of out/x15-cast (scripts/x15-art-gen.py; the kept seed of each name is its SEEDS entry, else 61) into the puppets, props and plate the scenes use (src/x15-scenes.tsx)
# and measures what the code needs. The recipe of scripts/x14-prep.py (it reuses x10-prep.py's patched copy of tip-prep.py's puppet() and finders). Reused, not cut again: x10's plates and Ross's point and wide bodies (src/x10-rig.json),
# x08's Ross head and his hand with the phone (src/x08-rig.json), x13's armless 'wideBare' body (src/x13-rig.json), x14's counter plate without its jar, its front layer and its face layer (src/x14-rig.json); the code reads those rigs itself.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x15-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x15-prep.py props ross chuck bleep     -> only those parts (src/x15-rig.json keeps the others)
# Writes public/sp/x15-*.png|jpg, src/x15-rig.json (px of the pictures, y down), scratch/x15-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the five new bodies (call: the phone at his ear; lean: bent over, fists down; envelopes: a fistful of them; buried: up to his neck in them with one hand up; receipt: the strip of paper in both hands)
# are the pose pictures registered on it; the purple copies of that head (plugs in, the left one gone, both gone) are cut from the three head files. Chuck: three pictures, each its own puppet with its own head (lick, pluck, plate); the Bleep
# Guy: two (the thumb on the button, the receipt held out: cut, but no shot of the v3 list uses it), each its own puppet. The props: the door seen from inside (its brass slot measured), the hand with the invoice (cut out, the inside box of its paper measured), one envelope, the button insert.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x14p', os.path.join(HERE, 'x14-prep.py'))
x14p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x14p)   # (its patches of tip-prep's finders are applied on import; its `find` looks in x14-cast first, so ours is put in front below)
x10p, x8, tp, nvp, fxp = x14p.x10p, x14p.x8, x14p.tp, x14p.nvp, x14p.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x15-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x15-rig.json')


def kept_seeds():
    """SEEDS of scripts/x15-art-gen.py (name -> the seeds painted; the last is the kept one), read without running the file (it starts the GPU)"""
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', open(os.path.join(HERE, 'x15-art-gen.py'), encoding='utf-8').read(), re.M)
    return ast.literal_eval(m.group(1)) if m else {}


SEEDS = kept_seeds()


def find(name):
    """a picture by its name: out/x15-cast/<name>-<kept seed>.png; a name that already ends in a seed (ross-sit-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name): name = f'{name}-{(SEEDS.get(name) or [61])[-1]}'
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def have(name):
    try: find(name); return True
    except StopIteration: return False


# the pile of envelopes makes the eye finder see whites that are not eyes, so for Ross's buried picture it looks in a window round the head only (padded px; the registered copy sits on the master's head, so its window is round the master's eyes)
WINDOW = {'ross-buried': (PAD + 400, PAD + 690, PAD + 300, PAD + 450)}
SEEN = {'raw': [], 'reg': []}   # [(array, window)]
SAME_HEAD = []                  # the pictures whose face is the Bleep Guy's first (see face_of15)


def load15(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    for k, win in WINDOW.items():
        if name.startswith(k): SEEN['raw'].append((a, win))
    if name.startswith('bleep-guy-receipt'): SAME_HEAD.append(a)
    return a


_register, _find_eyes = tp.register, tp.find_eyes
def register(a, *args, **kw):
    out = _register(a, *args, **kw)
    if any(a is b and win == WINDOW['ross-buried'] for b, win in SEEN['raw']): SEEN['reg'].append((out, (700, 980, 480, 700)))
    return out
def find_eyes(a):
    for b, (x0, x1, y0, y1) in SEEN['raw'] + SEEN['reg']:
        if a is b:
            w = np.full_like(a, 255.0); w[y0:y1, x0:x1] = a[y0:y1, x0:x1]
            return _find_eyes(w)
    return _find_eyes(a)
tp.register, tp.find_eyes = register, find_eyes
# the Bleep Guy holding out the receipt is the same man with the same head as the one with his thumb on the button (394 of 410,000 px of the head differ), but the strip of paper in front of him and the face finder do not get on (its circle
# comes out 407 px): that picture takes the face of the first one
_face_of15 = tp.face_of
FACE = {}
def face_of15(a):
    if any(a is b for b in SAME_HEAD):
        if 'bg' not in FACE: FACE['bg'] = _face_of15(load15('bleep-guy-61'))
        return FACE['bg']
    return _face_of15(a)
tp.face_of = face_of15
_pupils_of = tp.spp.pupils_of
def pupils_of(a, eyes):
    """an eye that is shut (Chuck's wink: the white has a squint in it and no dark pupil) has no pupil to find: it gets the other eye's, mirrored about the middle of the two (tip-prep's pupils_in then takes the squint's own dark mark for it)"""
    try: return _pupils_of(a, eyes)
    except TypeError:
        mid = (eyes[0]['cx'] + eyes[1]['cx']) / 2
        got = []
        for e in eyes:
            try: got.append(_pupils_of(a, [e])[0])
            except TypeError: got.append(None)
        for i, g in enumerate(got):
            if g is None:
                o = got[1 - i]
                got[i] = [round(2 * mid - o[0], 1), round(o[1] + eyes[i]['cy'] - eyes[1 - i]['cy'], 1), o[2]]
        return got
tp.spp.pupils_of = pupils_of
tp.DBG, tp.PFX, tp.load3 = DBG, 'x15', load15
x14p.DBG = DBG   # (x14's debug sheet is written here, not over x14's)

ROSS_POSES = {'call': 'ross-call', 'lean': 'ross-lean', 'envelopes': 'ross-envelopes', 'buried': 'ross-buried', 'receipt': 'ross-receipt'}

# every Chuck is one picture and one puppet; the drawn mouth of each is a dark line or arc in the zone (x0, y0, x1, y1, threshold). The lick: the tongue is out over the plate, only the dark arc at its root is the mouth (the pink tongue stays
# as painted, the code draws no mouth: mouthW 0). The Bleep Guy's mouth is a short flat line
CAST15 = {
    'chuckLick': dict(master='chuck-lick', mouth=(470, 366, 556, 392, 190), mouthW=0),
    'chuckPluck': dict(master='chuck-pluck', mouth=(430, 345, 600, 430, 190), mouthW=84),
    'chuckPlate': dict(master='chuck-plate', mouth=(430, 345, 600, 430, 190), mouthW=84),
    'bleepGuy': dict(master='bleep-guy', mouth=(470, 358, 560, 386, 190), mouthW=60, oval=True),   # (oval: the lenses of his glasses reach out of the circle fitted to his face: what is inside the face blob is never ground)
    'bleepGuyReceipt': dict(master='bleep-guy-receipt', mouth=(470, 358, 560, 386, 190), mouthW=60, oval=True),
}


def purple_variants(rig):
    """the master head's three pictures (plugs in, the left one gone, both gone) with the skin turned the furious purple of x14 (scripts/x14-prep.py purple_head: the shading is kept, the hair and the eye whites stay): written next to them as
    x15-ross-head-<state>-purple.png; returns {state: file}"""
    out = {}
    heads = dict(both=rig['layers']['head']['file'], **rig['headFiles'])
    for st, f in heads.items():
        if st not in ('both', 'l', 'none'): continue
        out[st], n = x14p.purple_head(os.path.join(ROOT, 'public', f), rig['face'], os.path.join(ROOT, 'public', 'sp', f'x15-ross-head-{st}-purple.png'))
        print(f'  ross: purple head {st}: {out[st]} ({n} skin px)')
    return out


def fill_shoulder_bites(L, y0, y1, mid=837):
    """the bites that the pose's own ears left in the tops of its shoulders (cut away with its head) and the scoop of its neckline: the shoulder on each side of the middle column `mid` is replaced by the convex hull of its pixels in the rows y0 .. y1 of the
    padded canvas, so that it rises to its peak in a straight line; what that adds gets the colour of the nearest picture pixel. Written over the file"""
    import cv2
    f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
    a = im[..., 3] > 127
    rows = np.zeros(a.shape, bool); rows[max(0, y0 - L['y']):max(0, y1 - L['y']), :] = True
    add = np.zeros(a.shape, np.uint8)
    for side in (0, 1):
        cols = np.zeros(a.shape, bool); cols[:, :mid - L['x']] = side == 0; cols[:, mid - L['x']:] = side == 1
        pts = np.argwhere(a & rows & cols)[:, ::-1].astype(np.int32)
        if len(pts): cv2.fillConvexPoly(add, cv2.convexHull(pts), 1)
    add = (add > 0) & ~a & rows
    idx = ndi.distance_transform_edt(~a, return_distances=False, return_indices=True)
    im[add, :3] = im[idx[0][add], idx[1][add], :3]; im[add, 3] = 255
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    print(f'  shoulder hull: {int(add.sum())} px added')


def clear_white_pockets(L, min_area=120, any_from=None):
    """the white ground that the outlines of an arm and the torso shut in (a strip between them that the flood fill of the border never reaches) is still opaque white in the cut. The ground is neutral or cool white (blue not below red), the paper of an
    envelope or a receipt is warm (blue 4-6 below red): the neutral white regions of at least `min_area` px (and their soft 2 px rim) are made transparent. `any_from`: from this column of the padded canvas on (the right of the neck) there is no paper,
    and a pocket's white can be a little warm too (240, 241, 235): there every light pixel (min 215) of any size goes. Written over the file"""
    f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
    rgb = im[..., :3].astype(int)
    white = (im[..., 3] > 0) & (rgb.min(axis=2) >= 240) & ((rgb[..., 2] - rgb[..., 0]) >= -2)
    lab, n = ndi.label(white)
    big = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(white, lab, range(1, n + 1))) if v >= min_area]) if n else np.zeros(white.shape, bool)
    if any_from is not None:
        cols = np.arange(im.shape[1])[None, :] + L['x'] >= any_from
        big |= (im[..., 3] > 0) & (rgb.min(axis=2) >= 215) & cols
    rim = ndi.binary_dilation(big, structure=K3, iterations=2) & (rgb.min(axis=2) >= 222) & (im[..., 3] > 0)
    im[rim, 3] = 0
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    return int(rim.sum())


def clear_halo(L, thr=205, reach=4):
    """the light halo along the outline of a body (the ground's white mixed with the ink line: neutral, light, 1-3 px wide) and the slivers of ground between an arm and the torso that clear_white_pockets leaves (they are smaller than its size limit):
    light, hardly coloured pixels (the paper of an envelope is warm, its blue is 4-6 under its red: not these) that the empty ground reaches through such pixels alone within `reach` px are cleared. Written over the file"""
    f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
    rgb = im[..., :3].astype(int); a = im[..., 3]
    cand = (a > 0) & (rgb.min(axis=2) >= thr) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 24) & ((rgb[..., 2] - rgb[..., 0]) >= -3)
    reach_m = a == 0
    for _ in range(reach): reach_m = ndi.binary_dilation(reach_m, structure=K3) & ((a == 0) | cand)
    kill = cand & reach_m
    im[kill, 3] = 0
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    return int(kill.sum())


def drop_islands(L, min_px=1500):
    """pieces of a body layer that float free of the figure and are small (the rest of the pose's own ear that its head's cut left beside the phone): every connected piece of the alpha under `min_px` px is made transparent. Returns the pixels cleared"""
    f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
    lab, n = ndi.label(im[..., 3] > 20, structure=np.ones((3, 3)))
    if n < 2: return 0
    sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))
    gone = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v < min_px])
    im[gone, 3] = 0
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    return int(gone.sum())


def clear_painted_curl(key, box):
    """the grey curl that the painter put on Chuck's plate (a faint squiggle that does not read at phone size; the code draws a bigger one over the same spot, src/x15-scenes.tsx Curl): the pixels in `box` (x0, y0, x1, y1 of the 1024 x 1024 picture)
    that are darker than the plate's white are inpainted from the plate round them, so that the painted one does not show beside the drawn one. Written over the body file"""
    import cv2
    rig = RIG_NOW[key]; L = rig['layers']['body']
    f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
    x0, y0, x1, y1 = box
    sub = im[y0 - L['y']:y1 - L['y'], x0 - L['x']:x1 - L['x']]
    mask = ((sub[..., :3].max(axis=2) < 236) & (sub[..., 3] > 0)).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    sub[..., :3] = cv2.inpaint(np.ascontiguousarray(sub[..., :3]), mask, 7, cv2.INPAINT_TELEA)
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    print(f'  {key}: {int((mask > 0).sum())} px of the painted curl inpainted')


RIG_NOW = {}
KEEP_MOUTH = ('chuckPluck',)   # Chuck's pained grimace (clenched teeth) is worth more than a code mouth: his painted mouth is put back into the head and the code draws none (mouthW 0); he does not talk in that shot


def keep_painted_mouth(key, cfg, rig):
    """the cut paints the drawn mouth out of the head (skin over it) so that the code can draw one. Here the master's own pixels are copied back into the head sprite over the mouth's box (the rig's mouth, 8 px more on every side) and mouthW is
    set to 0, so that the code draws nothing over them"""
    m, L = rig['mouth'], rig['layers']['head']
    f = os.path.join(ROOT, 'public', L['file']); head = np.array(Image.open(f).convert('RGBA'))
    src = load15(cfg['master']).astype(np.uint8)
    x0, x1, y0, y1 = int(m['cx'] - m['w'] / 2 - 8), int(m['cx'] + m['w'] / 2 + 8), int(m['cy'] - 40), int(m['cy'] + 40)
    reg = head[y0 - L['y']:y1 - L['y'], x0 - L['x']:x1 - L['x']]
    keep = reg[..., 3] > 200   # (only where the head sprite is: the face)
    reg[..., :3][keep] = src[y0:y1, x0:x1][keep]
    Image.fromarray(head, 'RGBA').save(f, optimize=True)
    rig['mouthW'] = 0
    print(f'  {key}: the painted mouth put back into the head ({x1 - x0} x {y1 - y0} px)')


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES); cfg['pockets'] = ()
        x14p.NOPOCKET[0] = True
        new = tp.puppet('ross', cfg)[0]
        x14p.NOPOCKET[0] = False
        r = json.loads(json.dumps(x8rig['ross']))   # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        fill_shoulder_bites(r['bodies']['lean'], 560, 790)   # (the lean pose's own ears bit round notches out of the tops of its shoulders when its head was cut away; the master's level head does not cover the right one)
        for pn in r['bodies']: print(f'  ross {pn}: {drop_islands(r["bodies"][pn])} px of loose pieces cleared')
        for pn, from_x in (('call', 0), ('lean', 0), ('envelopes', 760)): print(f'  ross {pn}: {clear_white_pockets(r["bodies"][pn], any_from=from_x)} px of white ground between the arm and the torso cleared, {clear_halo(r["bodies"][pn])} px of light halo')
        for pn, L in r['bodies'].items():   # the pose's own hair is taller than the master's: what is left of it above the master's head (row 345 of the padded canvas) floats there; nothing of a body goes above it (the buried pose's raised envelope does)
            if pn == 'buried' or L['y'] >= 340: continue
            f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
            n = int((im[:340 - L['y'], :, 3] > 0).sum()); im[:340 - L['y'], :, 3] = 0
            Image.fromarray(im, 'RGBA').save(f, optimize=True); print(f'  ross {pn}: {n} px above the head cleared')
        r.pop('flySil', None); r.pop('screens', None)
        r['purple'] = purple_variants(r)
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    for key, cfg in CAST15.items():
        want = key in which or ('chuck' in which and key.startswith('chuck')) or ('bleep' in which and key.startswith('bleep'))
        if not want: continue
        if not have(cfg['master']): print(f'  {key}: {cfg["master"]} is not painted yet, skipped'); continue
        cfg = dict(cfg)
        if key.startswith('chuck'): cfg['fleck_y'] = 372; x14p.POCKET_ROWS[0] = 372; cfg['fill_pad'] = -16   # (as x14: the white shoulders of his shirt come up beside his head and are not flecks or pockets of the ground)
        rig = tp.puppet(key, cfg)[0]
        x14p.POCKET_ROWS[0] = None
        print(f'  {key}: grey fringe cleared on', x14p.defringe(os.path.join(ROOT, 'public', rig['layers']['body']['file'])), 'px of the body')
        if key in KEEP_MOUTH: keep_painted_mouth(key, cfg, rig)
        rigs[key] = rig; RIG_NOW[key] = rig
        if key == 'chuckPlate': clear_painted_curl(key, (305, 566, 400, 612))
    return rigs


def debug_sheet15(rigs):
    return x14p.debug_sheet14(rigs)


def paper_box(a):
    """the inside of the sheet of paper in the invoice picture: the biggest near-white region that the border's white does not reach (the outline shuts it in); (x0, y0, x1, y1) in the picture's px"""
    near = a.min(axis=2) >= 238
    lab, n = ndi.label(near)
    H, W, _ = a.shape
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W: continue
        m = int((lab[sl] == i).sum())
        if best is None or m > best[0]: best = (m, sl)
    sl = best[1]
    return [int(sl[1].start), int(sl[0].start), int(sl[1].stop), int(sl[0].stop)]


def brass_parts(a):
    """the brass mail slot and the door knob of the door plate (768 x 1344): the biggest piece of brass-coloured pixels is the slot, the biggest one right of it the knob; (x0, y0, x1, y1) of the plate"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    brass = (r > 170) & (g > 130) & (b < 110) & (r - b > 90) & (g - b > 50)
    lab, n = ndi.label(brass)
    pieces = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        pieces.append((len(ys), [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]))
    pieces.sort(key=lambda p: -p[0])
    slot = pieces[0][1]
    knob = next(p[1] for p in pieces[1:] if p[1][0] > slot[2] and p[0] > 300)
    print('  door: slot', slot, 'knob', knob)
    return dict(slot=slot, knob=knob)


def props():
    """the door seen from inside (a plate, 768 x 1344, as a jpg; the numbers are read off the picture), the hand with the invoice (cut from its ground, the paper's inside measured for the text), one envelope (cut), the button insert (cut)"""
    out = {}
    if have('bg-door'):
        Image.open(find('bg-door')).convert('RGB').save(os.path.join(OUT, 'x15-bg-door.jpg'), quality=96)
        out['door'] = dict(file='sp/x15-bg-door.jpg', **brass_parts(np.array(Image.open(find('bg-door')).convert('RGB')).astype(int)))
    if have('ins-invoice'):
        a = load15('ins-invoice-61')
        d, alpha = tp.prop('ins-invoice', 'ins-invoice-61', protect=True, pad=4)
        d['paper'] = paper_box(a)
        print('  invoice: layer', d, 'alpha in the paper', float(alpha[(d['paper'][1] + d['paper'][3]) // 2, (d['paper'][0] + d['paper'][2]) // 2]))
        out['invoice'] = d
    if have('prop-envelope'):
        d, alpha = tp.prop('envelope', 'prop-envelope-61', protect=True, pad=4)
        print('  envelope: layer', d, 'alpha in the middle', float(alpha[512, 512]))
        out['envelope'] = d
    if have('ins-button'):
        d, alpha = tp.prop('ins-button', 'ins-button-61', pad=4)
        out['button'] = d
    return out


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    if not only or 'props' in only:
        rig['props'] = props(); print('  done props')
    pw = [k for k in ('ross', 'chuck', 'bleep') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet15(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
