# Prep for x18 "Unattended" (docs/x18-unattended.md): cuts the pictures of out/x18-cast (scripts/x18-art-gen.py; the kept file of each name is the one DONE.txt names, else its SEEDS entry, else 61) and a few reused ones into the people, props,
# plates and puppets the scenes use (src/x18-scenes.tsx) and measures what the code needs. The recipe of scripts/x17-prep.py (it is imported, so the shared kit is the same files as before: the flood-fill cut, the Ross puppet registered on x08's master head,
# the gap patches under his chin). Reused, not cut again: x08's Ross head, x10's bg-counter / bg-window / ins-till / apron body, x11's pastry case.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x18-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x18-prep.py door hand ross people props plates     -> only those parts (src/x18-rig.json keeps the others)
# Writes public/sp/x18-*.png|jpg, src/x18-rig.json (px of the pictures, y down) and scratch/x18-prep/* (the debug sheets).
# door: the leaf of the shop's front door, cut out of x10's wall with the window and the door: it swings open on every bell (src/x18-sched.ts doorAt).
# hand: x16's hand of Ross with its stick taken out: the sign he peels off the glass goes through the gap between thumb and finger (shot 20).
# ross: tape, finger, feetup and wipe are the pose pictures registered on x08's master head (disc [837, 581, r 195], neck pivot [837, 782]) with the gap patches of x17; his head is x08's, as painted.
# people: flat cut-outs: the mom at her table (phone, glasses, walking, shocked), the toddler (pouring, in his apron), the girl, the grandpa, the wagon of triplets, the drop-off mom (cut into the mom's upper body, her legs and three kids: they come apart in the shove),
#         the eight kids of the row and of the zap (one layer each, with a bit of body under the counter), the espresso cup, the carton and the sign; a mouth to draw over a painted one where a character talks (a patch of skin and an open mouth), the eyes where the code
#         draws the pupils (the mom's dart, the toddler's buzz), the places the code needs (the carton's cap, its blank face, the sign's corners).
# plates: bg-seating and kids-work as painted (jpg).
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x17p', os.path.join(HERE, 'x17-prep.py'))
x17p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x17p)   # (it chains x16-prep and through it x15, x14, x10, nv3 and tip-prep)
tp, x8, x14p, x15p, spp, nvp, fxp = x17p.tp, x17p.x8, x17p.x14p, x17p.x15p, x17p.spp, x17p.nvp, x17p.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
CAST_DIR = os.path.join(ROOT, 'out', 'x18-cast')
DIRS = [CAST_DIR] + [os.path.join(ROOT, 'out', d) for d in ('x17-cast', 'x16-cast', 'x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x18-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x18-rig.json')


def kept_files():
    """name -> the kept picture's file name (without .png): the files DONE.txt of the art agent names (a line like `name -> name-62.png ...`), else the last seed of SEEDS in scripts/x18-art-gen.py, else 61"""
    kept = {}
    done = os.path.join(CAST_DIR, 'DONE.txt')
    if os.path.exists(done):
        for line in open(done, encoding='utf-8', errors='replace'):
            m = re.match(r'\s*([a-z0-9-]+)\s*(?:->|=>|:)\s*([a-z0-9-]+-\d\d)(?:\.png)?', line)
            if m: kept[m[1]] = m[2]
    src = open(os.path.join(HERE, 'x18-art-gen.py'), encoding='utf-8').read()
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', src, re.M)
    seeds = ast.literal_eval(m.group(1)) if m else {}
    for n, s in seeds.items(): kept.setdefault(n, f'{n}-{s[-1]}')
    return kept


# x17-prep's finders look at these names at call time: pointed at x18's cast, they find x18's pictures (and x08's master)
x17p.CAST_DIR, x17p.DIRS, x17p.KEPT, x17p.DBG = CAST_DIR, DIRS, kept_files(), DBG
tp.DBG, tp.PFX, tp.load3 = DBG, 'x18', x17p.load17
x14p.DBG = DBG
find, have, load = x17p.find, x17p.have, x17p.load17
hexc, med = tp.hexc, tp.med


def clean_pockets(a, alpha, zones, max_area=3000, white=232):
    """the white that hair strands shut in (and the white between a head and its hair) is still opaque after the flood fill: near-white pieces smaller than `max_area` px inside the `zones` (x0, y0, x1, y1: the hair, never the eyes or the teeth) are background"""
    near = (a.min(axis=2) >= white) & (alpha > 0.5)
    z = np.zeros(near.shape, bool)
    for x0, y0, x1, y1 in zones: z[y0:y1, x0:x1] = True
    lab, k = ndi.label(near & z)
    al = alpha.copy()
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i
        if m.sum() < max_area: al[sl][m] = 0.0
    # the ring round a removed pocket: its anti-aliased pixels are pale too
    ring = ndi.binary_dilation(al < 0.02, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= 215) & z
    al[ring] = 0.0
    return al


def defringe(a, alpha, white=205, depth=4):
    """the flood fill of the cut leaves slivers of the paper along the outline (near-white bits just outside the black line, a few px long): a near-white pixel that touches the transparent background is paper; cleared, up to `depth` px in (a white that is shut in
    by the outline, an eye or a tooth, never touches the background and stays)"""
    al = alpha.copy()
    nw = a.min(axis=2) >= white
    for _ in range(depth):
        gone = al < 0.02
        kill = ndi.binary_dilation(gone, structure=K3) & ~gone & nw
        if not kill.any(): break
        al[kill] = 0.0
    return al


def sprite(name, protect=True, holes=(), fix=None, pad=4, out=None, pockets=(), fringe=205):
    """the picture `name` cut out (flood fill of the white; `protect` keeps a white shirt, a white carton: the texture mask; `pockets` the zones of hair whose pockets are cleared), saved as public/sp/x18-<name>.png; returns the layer {file, w, h, ox, oy} (the offset is in
    the picture's px), the alpha, the colours and the picture"""
    a = load(name)
    alpha, rgb = nvp.cut(a, protect, holes)
    if pockets: alpha = clean_pockets(a, alpha, pockets)
    if fix is not None: alpha = fix(a, alpha)
    if fringe: alpha = defringe(a, alpha, fringe)
    im, off = fxp.layer(rgb, alpha, pad)
    d = dict(file=tp.save_png(out or name, im), w=im.size[0], h=im.size[1], ox=off[0], oy=off[1])
    return d, alpha, rgb, a


def eyes_pupils(a, zone):
    eyes = spp.eyes_of(a, zone)
    return eyes, tp.pupils_in(a, eyes, spp.pupils_of(a, eyes))


def two_eyes(eyes, cx0, cx1, cy, rx, ry):
    """two eyes whose whites touch are found as one blob: the two ellipses by hand (the picture's px), with a lid outline each"""
    out = []
    for cx in (cx0, cx1):
        lid = [[int(cx + (rx + 5) * np.cos(t)), int(cy + (ry + 5) * np.sin(t))] for t in np.linspace(0, 2 * np.pi, 28, endpoint=False)]
        out.append(dict(cx=float(cx), cy=float(cy), rx=float(rx), ry=float(ry), lid=lid))
    return out


def grin_box(a, box, skin_zone):
    """the box where a talking mouth is drawn over a painted one (the shape of x17-prep's grin: its box, its middle and size, the skin of the cheek beside it as hex)"""
    x0, y0, x1, y1 = box
    return dict(box=[x0, y0, x1, y1], cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, w=x1 - x0, h=y1 - y0, skin=hexc(med(a, *skin_zone)))


def save_png(name, rgb, alpha, pad=4):
    im, off = fxp.layer(rgb, alpha, pad)
    return dict(file=tp.save_png(name, im), w=im.size[0], h=im.size[1], ox=off[0], oy=off[1])


# ------------------------------------------------------------------ the shop's front door and Ross's hand (reused pictures)
def door():
    """the leaf of the door as a picture (the plate's own pixels, opaque) and the colours of the street behind it, band by band (sky, the building across the road, the pavement, the road, the pavement)"""
    im = Image.open(os.path.join(OUT, 'x10-bg-window.jpg')).convert('RGB')
    leaf = [487, 352, 717, 1130]   # the door's panel inside its frame (plate px): the frame stays, the panel swings
    im.crop(tuple(leaf)).save(os.path.join(OUT, 'x18-door.png'), optimize=True)
    px = lambda x, y: '#%02x%02x%02x' % im.getpixel((x, y))
    # the street as the plate's big window shows it (x 60-410): the same bands as through the door's glass; read from the window pane, away from its frame and the little windows
    bands = [dict(y0=352, y1=585, color=px(300, 300)), dict(y0=585, y1=775, color=px(150, 650)), dict(y0=775, y1=815, color=px(250, 795)), dict(y0=815, y1=960, color=px(250, 880)), dict(y0=960, y1=1130, color=px(250, 975))]
    print('  door leaf', leaf, 'street', [b['color'] for b in bands])
    return dict(file='sp/x18-door.png', w=leaf[2] - leaf[0], h=leaf[3] - leaf[1], leaf=leaf, hinge=leaf[2], street=bands)


def hand():
    """x16's hand-ross without its stick: the stick's wood, its dark edges and the white sliver of the gap are made transparent (the gap shows what is behind the hand); returns the sprite and the point of the gap where a sheet's corner goes (sprite px)"""
    rig16 = json.load(open(os.path.join(ROOT, 'src', 'x16-rig.json')))['props']['hand_ross']
    a = np.array(Image.open(os.path.join(OUT, 'x16-hand-ross.png')).convert('RGBA'))
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    z = np.zeros(al.shape, bool); z[460:565, 368:406] = True
    wood = (al > 200) & (r > 150) & (r < 235) & (g > 105) & (g < 190) & (b > 40) & (b < 135) & (r - b > 45) & z & ~((r > 235) & (g > 190))
    skin = (np.abs(r - 254) < 14) & (np.abs(g - 211) < 18) & (np.abs(b - 141) < 22)
    wood &= ~skin
    m = ndi.binary_dilation(wood, iterations=2) & z & ~skin
    zw = np.zeros(al.shape, bool); zw[460:610, 338:406] = True
    white = (al > 200) & (r > 205) & (g > 205) & (b > 195) & zw   # the sliver of paper-white in the gap (the flood fill of the cut did not reach it)
    m |= ndi.binary_dilation(white, iterations=1) & zw & ~skin
    a[m, 3] = 0
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    halo = (np.minimum(np.minimum(r, g), b) > 205) & ndi.binary_dilation(al < 24, iterations=3) & (al > 0)   # the white fringe that x16's cut left round the hand (it shows on a dark ground)
    a[halo, 3] = 0
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, 'x18-hand-ross.png'), optimize=True)
    ys, xs = np.where(wood)
    print('  hand: stick', int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), 'px cleared', int(m.sum()))
    return dict(file='sp/x18-hand-ross.png', w=a.shape[1], h=a.shape[0], ox=rig16['ox'], oy=rig16['oy'], gap=[int((xs.min() + xs.max()) / 2), int(ys.min() + 22)])


# ------------------------------------------------------------------ Ross: four poses on x08's master head
ROSS_POSES = {'tape': 'ross-tape', 'finger': 'ross-finger', 'feetup': 'ross-feetup', 'wipe': 'ross-wipe'}


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
        for pn in r['bodies']: x17p.patch_gaps(pn, r['bodies'][pn], False)
        r['layers']['body'] = r['bodies'][next(iter(r['bodies']))]
        r.pop('flySil', None); r.pop('screens', None)
        r['purple'] = x15rig['puppets']['ross']['purple']
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    return rigs


# ------------------------------------------------------------------ the people
def watershed(a, alpha, seeds):
    """split a cut picture into the pieces that stand in front of each other (outlines are what the watershed climbs): `seeds` is {label: [shape]} with shapes ('disk', x, y, r) and ('line', [(x, y) ...], r); label 0 is the background (alpha 0 is
    seeded too); returns the label picture (the 1 px boundaries are given to the nearest piece)"""
    H, W = alpha.shape
    mk = np.zeros((H, W), np.int32)
    for lbl, shapes in seeds.items():
        for s in shapes:
            if s[0] == 'disk': cv2.circle(mk, (int(s[1]), int(s[2])), int(s[3]), lbl, -1)
            else:
                pts = s[1]
                for p, q in zip(pts, pts[1:]): cv2.line(mk, tuple(map(int, p)), tuple(map(int, q)), lbl, int(2 * s[2]))
    BG = max(seeds) + 1
    mk[alpha < 0.02] = BG
    img = np.clip(a, 0, 255).astype(np.uint8)[:, :, ::-1].copy()
    ws = cv2.watershed(img, mk.copy())
    bad = ws < 0
    if bad.any():
        idx = ndi.distance_transform_edt(bad, return_distances=False, return_indices=True)
        ws = ws[idx[0], idx[1]]
    ws[ws == BG] = 0
    return ws


def piece(name, a, rgb, alpha, mask, pad=4):
    """one piece of a split picture as a layer: its own mask over the cut's colours (the slivers of paper along its outline cleared: defringe)"""
    return save_png(name, rgb, defringe(a, alpha * mask.astype(np.float32)), pad)


def inpaint(rgb, hole):
    """what a hand or a head hid, painted in from its surroundings (flat colours: Telea's fill is enough)"""
    out = cv2.inpaint(np.clip(rgb, 0, 255).astype(np.uint8), hole.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
    return out.astype(np.float32)


def people(which):
    out = {}
    # the mom at her table: the table, the tumbler and the phone are in the picture. Her mouth is a short flat line; the code draws its open mouths over a patch of her skin (the box is a little bigger than the line), her eyes are painted looking down at
    # the phone: the code draws the lids, the brows (she has none painted) and, in the glasses picture and the walking one, the pupils
    MOMZ = {'mom-phone': [(300, 20, 680, 300), (300, 300, 400, 500), (575, 300, 680, 500)], 'mom-glasses': [(300, 20, 680, 290), (300, 290, 400, 500), (575, 290, 680, 500)], 'mom-walk': [(300, 20, 700, 235), (300, 235, 420, 420), (565, 235, 700, 420)],
            'mom-shock': [(300, 20, 700, 280), (300, 280, 400, 480), (575, 280, 700, 480)]}
    for n, zone, box in (('mom-phone', (390, 300, 580, 420), [457, 438, 517, 476]), ('mom-glasses', (395, 295, 580, 400), [472, 447, 504, 476]), ('mom-walk', (410, 235, 580, 335), None), ('mom-shock', (395, 285, 580, 400), None)):
        if not have(n): continue
        d, alpha, rgb, a = sprite(n, pockets=MOMZ[n])
        d['eyes'], d['pupils'] = eyes_pupils(a, zone)
        d['skin'] = hexc(med(a, 420, 410, 450, 430)) if n != 'mom-shock' else hexc(med(a, 430, 330, 470, 350))
        d['white'] = hexc(med(a, int(d['eyes'][0]['cx']) - 12, int(d['eyes'][0]['cy']) - 12, int(d['eyes'][0]['cx']) + 12, int(d['eyes'][0]['cy']) - 4)) if d['eyes'] else '#fdfdfd'
        if box: d['grin'] = grin_box(a, box, (415, 415, 450, 435))
        out[n.replace('-', '_')] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'eyes', [(round(e['cx']), round(e['cy'])) for e in d['eyes']], 'pupils', [[round(v) for v in p] for p in d['pupils']], 'grin', d.get('grin', {}).get('box'))
    # the toddler: pouring (the carton is painted, its cap at about (290, 820)) and in his apron (a flat deadpan face, the mouth a short line at about (515, 455), the eyes drawn by the code: the buzz)
    for n, zone, box in (('toddler-pour', (405, 280, 625, 410), None), ('toddler-apron', (400, 280, 630, 415), [489, 441, 543, 471])):
        if not have(n): continue
        def temples(a, alpha):   # the white that the hair shuts in at the two temples (outside the eyes' x range and above the cheeks)
            yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
            z = (yy >= 235) & (yy < 420) & ((xx < 392) | (xx > 640))
            w = (a.min(axis=2) >= 200) & (a.max(axis=2) - a.min(axis=2) < 36) & z & (alpha > 0.02)
            al = alpha.copy(); al[w] = 0.0
            al[ndi.binary_dilation(al < 0.02, structure=K3, iterations=1) & (al >= 0.02) & (a.min(axis=2) >= 185) & z] = 0.0
            return al
        d, alpha, rgb, a = sprite(n, pockets=[(200, 0, 840, 292)], fix=temples)
        d['eyes'], d['pupils'] = eyes_pupils(a, zone)
        d['eyes'] = two_eyes(d['eyes'], 465, 564, 347, 50, 54)
        d['pupils'] = [[491.0, 346.3, 9.0], [539.0, 346.6, 9.0]]   # (both pupils: the finder saw one in each picture)   # (the two whites touch: one blob; the eyes are split at the nose line)
        d['skin'] = hexc(med(a, 450, 430, 480, 445)) if n == 'toddler-apron' else hexc(med(a, 380, 380, 410, 400))
        if box: d['grin'] = grin_box(a, box, (440, 440, 470, 455))
        out[n.replace('-', '_')] = d
        print(f'  {n}:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'eyes', [(round(e['cx']), round(e['cy'])) for e in d['eyes']], 'pupils', [[round(v) for v in p] for p in d['pupils']])
    # the girl at the glass (her tongue is at the lower right of the picture) and the grandpa (a small smile at about (515, 505), his eyes inside the glasses)
    if have('girl-lick'):
        d, alpha, rgb, a = sprite('girl-lick', pockets=[(0, 100, 1024, 350)])
        d['tongue'] = [530, 745]   # the tip of the tongue (the picture's px, by eye: the lower edge of the pink tongue, x 440-620, y 595-745)
        out['girl_lick'] = d
        print('  girl-lick:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('grandpa'):
        d, alpha, rgb, a = sprite('grandpa', fringe=0)   # (his white hair touches the paper: no defringe)
        d['eyes'], d['pupils'] = eyes_pupils(a, (390, 270, 645, 420))
        d['skin'] = hexc(med(a, 440, 470, 470, 485))
        d['grin'] = grin_box(a, [481, 487, 551, 527], (440, 470, 470, 485))
        out['grandpa'] = d
        print('  grandpa:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')}, 'eyes', [(round(e['cx']), round(e['cy'])) for e in d['eyes']], 'grin', d['grin']['box'])
    if have('wagon'):
        d, alpha, rgb, a = sprite('wagon')
        d['wheels'] = [[175, 765, 38], [843, 765, 38]]
        out['wagon'] = d
        print('  wagon:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('dropoff'):
        out.update(dropoff())
    for n in ('kids-row', 'kids-zap'):
        if have(n): out.update(kids(n))
    return out


def dropoff():
    """the drop-off mom with three kids, one picture of four people: cut into pieces so that the kids can lurch forward without her. The watershed climbs the outlines from seeds in each person (the mom's hands on the cap boy's cap and on the hoodie boy's hair belong to
    her); what the pieces hid is painted in: the cap and the hair under her hands (a flat colour), her coat behind the girl's curls (teal), her jeans behind the girl (blue)"""
    n = 'dropoff'
    a = load(n)
    alpha, rgb = nvp.cut(a, False, [(628, 570, 712, 760)])
    alpha[752:796, 170:306] = np.where(a[752:796, 170:306].min(axis=2) >= 200, 1.0, alpha[752:796, 170:306])   # (the cap boy's last stripe is white and has no hem line under it: the flood fill took it)
    MOM, CAP, GIRL, HOOD = 1, 2, 3, 4
    seeds = {
        MOM: [('disk', 510, 260, 40), ('disk', 480, 430, 50), ('disk', 520, 90, 30), ('disk', 600, 160, 20), ('line', [(300, 440), (340, 400), (430, 330)], 6), ('line', [(700, 440), (660, 400), (580, 330)], 6), ('disk', 250, 447, 12), ('disk', 757, 452, 12),
              ('disk', 610, 500, 18), ('line', [(588, 320), (595, 420), (620, 520)], 4), ('line', [(381, 620), (384, 760)], 3), ('line', [(604, 705), (606, 760)], 4), ('line', [(405, 830), (405, 880)], 10), ('line', [(603, 830), (603, 880)], 9), ('disk', 415, 900, 16), ('disk', 597, 895, 16)],
        CAP: [('disk', 230, 500, 12), ('disk', 230, 600, 40), ('disk', 230, 720, 30), ('disk', 230, 830, 16), ('disk', 185, 925, 14), ('disk', 285, 925, 14), ('disk', 150, 580, 10), ('disk', 320, 580, 10), ('line', [(120, 755), (160, 725), (190, 690)], 6),
              ('line', [(355, 755), (320, 725), (285, 690)], 6), ('line', [(190, 772), (285, 772)], 6)],
        GIRL: [('disk', 520, 650, 50), ('disk', 515, 790, 40), ('disk', 480, 925, 16), ('disk', 550, 925, 16), ('disk', 420, 640, 14), ('disk', 630, 640, 14), ('disk', 500, 560, 18), ('disk', 560, 550, 18), ('disk', 420, 590, 12), ('disk', 470, 520, 12), ('disk', 600, 520, 12),
               ('disk', 640, 610, 12), ('disk', 610, 590, 14), ('disk', 620, 650, 14), ('disk', 400, 600, 12), ('disk', 430, 560, 12), ('disk', 520, 505, 12), ('disk', 580, 530, 12), ('disk', 447, 540, 10), ('disk', 405, 640, 8), ('line', [(398, 795), (420, 760), (450, 745)], 6),
               ('line', [(642, 795), (620, 760), (585, 745)], 6), ('line', [(470, 865), (470, 890)], 8), ('line', [(545, 865), (545, 890)], 8)],
        HOOD: [('disk', 800, 490, 16), ('disk', 800, 590, 40), ('disk', 790, 730, 30), ('disk', 790, 830, 16), ('disk', 750, 925, 14), ('disk', 850, 925, 14), ('disk', 715, 590, 10), ('disk', 890, 590, 10), ('line', [(670, 755), (700, 725), (730, 690)], 6),
               ('line', [(925, 755), (895, 725), (865, 690)], 6)],
    }
    ws = watershed(a, alpha, seeds)
    yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
    # the girl's black curls that the watershed gave to the mom's blue jeans: dark pixels inside her head's circle are hers
    dark = (a.max(axis=2) < 70) & ((xx - 520) ** 2 + (yy - 600) ** 2 < 150 ** 2) & (ws == MOM) & (a[..., 2] - a[..., 0] < 40)
    ws[dark] = GIRL
    rgbf = rgb.copy(); alf = alpha.copy()
    res = {}
    for lbl, name in ((CAP, 'cap'), (GIRL, 'girl'), (HOOD, 'hood')):
        m = ws == lbl
        lab, k = ndi.label(m)
        if k > 1: m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, k + 1)))))
        res[name] = m
    mom = ws == MOM
    # her hands over the kids' heads: the colours under them, painted in from the heads' own
    holes = {}
    for name, box in (('cap', (200, 425, 310, 482)), ('hood', (715, 430, 810, 480))):
        z = np.zeros(mom.shape, bool); z[box[1]:box[3], box[0]:box[2]] = True
        under = z & mom & (a[..., 0] > 200) & (a[..., 1] > 170) & (a[..., 2] > 100) & (a[..., 2] < 190)   # the skin of her hand
        under = ndi.binary_dilation(under, structure=K3, iterations=3) & z & mom
        holes[name] = under
    out = {}
    for name in ('cap', 'girl', 'hood'):
        rgb_k = rgbf
        mk = res[name].copy()
        if name in holes:
            fill = holes[name] & (ndi.binary_dilation(res[name], structure=K3, iterations=10))
            around = ndi.binary_dilation(fill, structure=K3, iterations=6) & res[name] & ~fill
            col = np.median(rgbf[around], axis=0)
            rgb_k = np.where(fill[..., None], col, rgbf)
            mk = res[name] | fill
        out['dropoff_' + name] = piece(f'dropoff-{name}', a, rgb_k, alf, mk)
    # the mom's upper body (the coat's hem is at about y 575), with her coat painted in behind the girl's curls; her legs below it, with her jeans painted in behind the girl
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    coat = mom & (g_ > r_ + 40) & (g_ > b_ + 10) & (yy > 380) & (yy < 570)
    tint = np.median(a[coat], axis=0)
    legs_z = yy >= 575
    mom_up = mom & ~legs_z
    curls = ndi.binary_dilation(res['girl'] & (yy < 640), structure=K3, iterations=3) & (yy < 580) & (xx > 380) & (xx < 660)
    rgb_u = np.where(curls[..., None], tint, rgbf)
    mom_up |= curls
    jeans_px = mom & legs_z & (b_ > r_ + 40) & (yy > 640)
    jt = np.median(a[jeans_px], axis=0)
    vee = np.zeros(mom.shape, np.uint8)
    cv2.fillPoly(vee, [np.array([[412, 575], [602, 575], [602, 700], [508, 770], [412, 700]], np.int32)], 1)   # (the hips and the crotch: where the legs meet; below it the gap between them is open)
    gap = (vee > 0) & ((ws == GIRL) | (ws == MOM))
    rgb_l = np.where(gap[..., None], jt, rgbf)
    mom_lo = (mom & legs_z) | gap
    out['dropoff_mom'] = piece('dropoff-mom', a, rgb_u, alf, mom_up)
    out['dropoff_legs'] = piece('dropoff-legs', a, rgb_l, alf, mom_lo)
    for k, v in out.items(): print('  ', k, {q: v[q] for q in ('file', 'w', 'h', 'ox', 'oy')})
    # the people's places (picture px): heads and feet, for the shot's staging
    out['dropoff'] = dict(file='', w=a.shape[1], h=a.shape[0], ox=0, oy=0, mom_head=[515, 240, 135], cap=[230, 570], girl=[520, 640], hood=[800, 570], hand_l=[250, 450], hand_r=[757, 452], feet=[515, 955])
    return out


KIDS = [(97, 400), (255, 395), (418, 390), (587, 380), (757, 385), (920, 395), (1085, 390), (1250, 395)]   # head centres of the row (and of the zap): where the bolts start, where the cups go
FISTS = [(30, 262), (190, 262), (350, 262), (510, 262), (685, 262), (855, 262), (1015, 262), (1180, 262)]


def kids(n):
    """the row of eight (or the same eight zapped): one layer per kid, cut where the bodies are apart: a column slice (the minimum of the opaque pixels of each column near the middle between two heads) for most of it, and the watershed's labels (it climbs the
    outlines from seeds in each kid) where two bodies touch; the counter's strip is a layer of its own; each kid gets the rows under the counter's top from the last clean row (so that a kid who pumps up shows no gap under him); the white that an arm and a head
    shut in is cleared; the mouths' places are measured (the dark red of an open "o")"""
    a = load(n)
    alpha, rgb = nvp.cut(a, False)
    alpha = clean_pockets(a, alpha, [(0, 150, 1344, 380)], max_area=1500, white=226)
    yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
    TOP = 565
    # every near-white piece outside a face's centre (the eyes' whites, the teeth) and the cap boy's striped shirt is the paper (a pocket that touching heads and shoulders shut in, a sliver between two bodies): cleared, whatever its size
    face = np.zeros(alpha.shape, bool)
    for hx, hy in KIDS:
        face[hy - 28:hy + 48, hx - 52:hx + 52] = True      # the eyes
        face[hy + 48:hy + 95, hx - 46:hx + 46] = True      # the teeth of the zap
    stripes = np.zeros(alpha.shape, bool); stripes[462:TOP, 352:482] = True
    white = (a.min(axis=2) >= 222) & (a.max(axis=2) - a.min(axis=2) < 40)
    alpha[white & (alpha > 0.02) & ~face & ~stripes & (yy < TOP - 2)] = 0.0
    alpha[ndi.binary_dilation(alpha < 0.02, structure=K3, iterations=2) & (alpha >= 0.02) & (a.min(axis=2) >= 205) & ~face & ~stripes & (yy < TOP - 2)] = 0.0
    seeds = {}
    COUNTER = 9
    for i, (hx, hy) in enumerate(KIDS):
        fx, fy = FISTS[i]
        seeds[i + 1] = [('disk', hx, hy + 20, 38), ('disk', hx, 535, 18), ('disk', hx, hy - 60, 14), ('line', [(fx, fy + 10), (fx + 8, fy + 60), (hx - 60, hy - 30)], 5), ('line', [(hx - 70, 540), (hx + 70, 540)], 6), ('line', [(hx + 62, 495), (hx + 70, 555)], 4),
                        ('line', [(hx - 58, 470), (hx - 62, 550)], 4)]
    seeds[COUNTER] = [('line', [(5, 585), (1338, 585)], 8), ('line', [(5, 604), (1338, 604)], 3)]
    ws = watershed(a, alpha, seeds)
    colcount = (alpha[250:560] > 0.5).sum(axis=0)
    nominal = [172, 342, 492, 682, 838, 1002, 1168]
    cuts = [0]
    for b in nominal:
        w = colcount[b - 32:b + 32]
        cuts.append(int(b - 32 + np.where(w == w.min())[0][len(np.where(w == w.min())[0]) // 2]))
    cuts.append(alpha.shape[1])
    out = {}
    name = n.replace('-', '_')
    boxes = []
    for i in range(len(KIDS)):
        x0, x1 = cuts[i], cuts[i + 1]
        sl = np.zeros(alpha.shape, bool); sl[:, x0:x1] = True
        others = np.isin(ws, [j + 1 for j in range(len(KIDS)) if j != i])
        mk = (alpha > 0.02) & (yy < TOP - 8) & ((ws == i + 1) | (sl & ~others))
        # the biggest piece (and what touches it): a strap or a curl of the neighbour that the labels gave to this kid goes
        lab, k = ndi.label(mk)
        if k > 1:
            sizes = ndi.sum(mk, lab, range(1, k + 1)); mk = lab == (1 + int(np.argmax(sizes)))
            mk = ndi.binary_dilation(mk, structure=K3, iterations=2) & (alpha > 0.02) & ((ws == i + 1) | (sl & ~others)) & (yy < TOP - 8)
        # the kid's own whites (the eyes, the teeth, the cap boy's stripes) are shut in by his outline; a white that is not (a sliver of paper between him and his neighbour, a pocket between his arm and his head) is not his
        wk = (a.min(axis=2) >= 222) & (a.max(axis=2) - a.min(axis=2) < 40)
        mk = mk & ndi.binary_fill_holes(mk & ~wk)
        rgbk, alk = rgb.copy(), alpha.copy()
        ref = TOP - 12   # the shirt just above the counter's edge: its colours are repeated under the counter
        row = mk[ref]
        for yy_ in range(ref + 1, TOP + 50):
            mk[yy_] = row; rgbk[yy_] = rgb[ref]; alk[yy_] = np.where(row, 1.0, 0.0)
        ys, xs = np.where(mk)
        boxes.append([int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)])
        out[f'{name}_{i + 1}'] = piece(f'{n}-{i + 1}', a, rgbk, alk, mk)
    cm = np.zeros(alpha.shape, bool); cm[TOP - 8:625] = alpha[TOP - 8:625] > 0.02
    out[f'{name}_counter'] = piece(f'{n}-counter', a, rgb, alpha, cm)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mouths = []
    for i, (hx, hy) in enumerate(KIDS):
        z = np.zeros(r.shape, bool); z[430:500, hx - 40:hx + 40] = True
        m = z & (r > 100) & (r - g > 35) & (g < 120) & (b < 140) & (r < 215)
        ys, xs = np.where(m)
        mouths.append([float(xs.mean()), float(ys.mean())] if len(xs) > 30 else [float(hx), 462.0])
    out[f'{name}_meta'] = dict(file='', w=a.shape[1], h=a.shape[0], ox=0, oy=0, cuts=cuts, kids=[dict(head=list(KIDS[i]), mouth=[round(mouths[i][0], 1), round(mouths[i][1], 1)], box=boxes[i]) for i in range(len(KIDS))], counter_top=TOP)
    print(f'  {n}: 8 kids, cuts', cuts, 'mouths', [(round(m[0]), round(m[1])) for m in mouths])
    return out


# ------------------------------------------------------------------ props
def props():
    out = {}
    if have('prop-carton'):
        d, alpha, rgb, a = sprite('prop-carton')
        d['face'] = [405, 220, 715, 910]   # the blank front face (the picture's px, by eye: x 405-715, y 220-910; a narrow side face at x 310-405)
        d['cap'] = [532, 148]
        out['carton'] = d
        print('  carton:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('prop-cup'):
        d, alpha, rgb, a = sprite('prop-cup')
        d['box'] = [207, 349, 820, 759]
        out['cup'] = d
        print('  cup:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    if have('prop-sign'):
        d, alpha, rgb, a = sprite('prop-sign')
        d['sheet'] = [127, 18, 1240, 741]; d['cup'] = [145, 605, 290, 715]; d['puppy'] = [1035, 525, 1215, 725]
        out['sign'] = d
        print('  sign:', {k: d[k] for k in ('file', 'w', 'h', 'ox', 'oy')})
    return out


# ------------------------------------------------------------------ the plates (768 x 1344 pictures as painted, jpg)
def clear_seating(im):
    """the seating plate without its table and chair (the mom brings her own table): each row of the boxes that held them is filled with that row's colour from a clean strip of the same plate (x 610-760, right of the table), so that the wall's and the floor's
    horizontal bands carry on unbroken"""
    a = np.array(im).astype(np.float32)
    clean = np.median(a[:, 610:760], axis=1)                       # one colour per row
    for x0, y0, x1, y1 in ((50, 812, 312, 1250), (238, 892, 592, 1250)):
        a[y0:y1, x0:x1] = clean[y0:y1, None, :]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def plates():
    out = {}
    for n, key in (('bg-seating', 'seating'), ('kids-work', 'work')):
        if not have(n): continue
        im = Image.open(find(n)).convert('RGB')
        if key == 'seating': im = clear_seating(im)
        im.save(os.path.join(OUT, f'x18-{n}.jpg'), quality=96)
        out[key] = dict(file=f'sp/x18-{n}.jpg', w=im.size[0], h=im.size[1])
        if key == 'work':   # the counter's front: the plate's own pixels from the counter's top edge (row 795) down, the layer that goes over whoever sits behind the counter (the same cut as x10's counter-front)
            im.crop((0, 795, im.size[0], im.size[1])).save(os.path.join(OUT, 'x18-kids-work-front.jpg'), quality=96)
            out[key]['front'] = dict(file='sp/x18-kids-work-front.jpg', x0=0, y0=795, w=im.size[0], h=im.size[1] - 795)
        print(f'  {key}:', out[key])
    out['seating'].update(window=[50, 155, 720, 770], pane=[80, 180, 690, 745], sill=[775, 808], floor=1155, table_removed=True)
    out['work'].update(register=[50, 680, 262, 850], girl=[10, 590, 160, 845], counter_free=[270, 800, 600, 900], mop=[185, 1235], triplets=[190, 925, 545, 1215], raincoat=[560, 875, 750, 1200])
    return out


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    rig.setdefault('plates', {}); rig.setdefault('props', {}); rig.setdefault('people', {})
    if not only or 'door' in only:
        rig['plates']['door'] = door(); print('  done door')
    if not only or 'hand' in only:
        rig['props']['hand_ross'] = hand(); print('  done hand')
    if not only or 'plates' in only:
        rig['plates'].update(plates()); print('  done plates')
    if not only or 'props' in only:
        rig['props'].update(props()); print('  done props')
    if not only or 'people' in only:
        rig['people'].update(people(only)); print('  done people')
    pw = [k for k in ('ross',) if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        x17p.debug_sheet17(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
