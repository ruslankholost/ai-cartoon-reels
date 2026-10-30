# Prep for x16 "Hiring a Zoomer" (docs/x16-hiring-a-zoomer.md): cuts the pictures of out/x16-cast (scripts/x16-art-gen.py; the kept seed of each name is its SEEDS entry, else 61) into the puppets, props and plates the scenes use
# (src/x16-scenes.tsx) and measures what the code needs. The recipe of scripts/x15-prep.py (it reuses x14-prep.py's and x10-prep.py's patched copy of tip-prep.py's puppet() and finders). Reused, not cut again: x10's plates (the window
# plate is Kenzie's side) and the counter's front layer (src/x10-rig.json), x08's Ross head and x15's purple copies of it (src/x15-rig.json), x08's phone-less kit of the steam, the corks and the vein; the code reads those rigs itself.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x16-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x16-prep.py props ross kenzie     -> only those parts (src/x16-rig.json keeps the others)
# Writes public/sp/x16-*.png|jpg, src/x16-rig.json (px of the pictures, y down), scratch/x16-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the two new bodies (table: sitting behind a round café table, the résumé held up; thumb: the thumb jabbed back over his shoulder) are the pose pictures registered on it; the table is part of
# the pictures. The purple copies of the head are x15's. Kenzie: two pictures, each its own puppet with its own head (the master with the tumbler at her chest, and the sip with the straw in her mouth: the lips stay as painted, the code draws no mouth there).
# Props: the two planting hands (cut out, the stick that the nails pinch measured and taken out of the picture: the code draws the stick and the flag), Mom's two screens (the pictures as they are, her lips measured for the talking mouth), her arm (cut
# out, the fist measured), the plate behind Ross with its blank paper sign (measured) and its ducking copy.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x15p', os.path.join(HERE, 'x15-prep.py'))
x15p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x15p)   # (its patches of tip-prep's finders are applied on import)
x14p, x10p, x8, tp, nvp, fxp = x15p.x14p, x15p.x10p, x15p.x8, x15p.tp, x15p.nvp, x15p.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x16-cast', 'x15-cast', 'x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x16-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x16-rig.json')


def kept_seeds():
    """SEEDS of scripts/x16-art-gen.py (name -> the seeds painted; the last is the kept one), read without running the file (it starts the GPU)"""
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', open(os.path.join(HERE, 'x16-art-gen.py'), encoding='utf-8').read(), re.M)
    return ast.literal_eval(m.group(1)) if m else {}


SEEDS = kept_seeds()


def find(name):
    """a picture by its name: out/x16-cast/<name>-<kept seed>.png; a name that already ends in a seed (ross-sit-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name): name = f'{name}-{(SEEDS.get(name) or [61])[-1]}'
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def have(name):
    try: find(name); return True
    except StopIteration: return False


def load16(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x16', load16
x14p.DBG = DBG   # (x14's debug sheet is written here, not over x14's)

ROSS_POSES = {'table': 'ross-table', 'thumb': 'ross-thumb'}


def bake_resume(L):
    """the résumé in his hands is a blank white sheet in the picture; the lines of a résumé (a name bar, a photo square, a few rows of grey bars: no words) are laid on it, only on the sheet's own white pixels, so that his fists over its edges stay. The sheet is the biggest
    white piece of the cut body; returns its box in the rig's px"""
    f = os.path.join(ROOT, 'public', L['file'])
    im = np.array(Image.open(f).convert('RGBA')); rgb = im[..., :3].astype(int)
    white = (im[..., 3] > 200) & (rgb.min(axis=2) >= 244)
    lab, n = ndi.label(white)
    j = 1 + int(np.argmax(ndi.sum(white, lab, range(1, n + 1))))
    sheet = lab == j
    ys, xs = np.where(sheet); x0, x1, y0, y1 = int(xs.min()), int(xs.max() + 1), int(ys.min()), int(ys.max() + 1)
    w, h = x1 - x0, y1 - y0
    bars = Image.new('RGBA', im.shape[1::-1], (0, 0, 0, 0)); d = ImageDraw.Draw(bars)
    def bar(a, b, c, e, col): d.rounded_rectangle([x0 + a * w, y0 + b * h, x0 + c * w, y0 + e * h], radius=max(2, 0.012 * h), fill=col)
    bar(0.10, 0.08, 0.56, 0.135, (96, 108, 126, 255)); bar(0.10, 0.17, 0.44, 0.205, (150, 160, 176, 255)); bar(0.68, 0.07, 0.90, 0.25, (196, 202, 212, 255))
    for i, ln in enumerate((0.80, 0.70, 0.84, 0.62, 0.77, 0.50, 0.72)): bar(0.10, 0.33 + i * 0.085, 0.10 + ln * 0.8, 0.33 + i * 0.085 + 0.032, (176, 182, 194, 255))
    b = np.array(bars)
    paint = sheet & (b[..., 3] > 0)
    im[paint, :3] = b[paint, :3]
    Image.fromarray(im, 'RGBA').save(f, optimize=True)
    print(f'  ross table: the sheet {w} x {h} px at ({x0 + L["x"]}, {y0 + L["y"]}) has its lines')
    return [x0 + L['x'], y0 + L['y'], x1 + L['x'], y1 + L['y']]


def table_of(L):
    """the round café table in a Ross body layer (seen from the front): the brown slab of its top, the widest brown rows; (x0, x1, top row, bottom row) in the rig's px (the padded canvas's: the layer's offset is added)"""
    im = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA')).astype(int)
    r, g, b, al = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    brown = (al > 200) & (r > 100) & (r < 220) & (g > 50) & (g < 140) & (b > 15) & (b < 90) & (r - b > 70) & (r - g > 25)
    w = brown.sum(axis=1)
    rows = np.where(w >= 0.7 * w.max())[0]
    top, bot = int(rows.min()), int(rows.max())
    cols = np.where(brown[top:bot + 1].any(axis=0))[0]
    return dict(x0=int(cols.min()) + L['x'], x1=int(cols.max() + 1) + L['x'], top=top + L['y'], bottom=bot + 1 + L['y'])
# Kenzie: her picture has no brows (only half-closed lids), so the cut paints none out and the code draws them (src/x16-stage.tsx KenzieBrows); the drawn mouth of the master is a short flat dark line under the nose; in the sip picture the lips are closed round the straw (their own dark shape is "the mouth" the cut looks for, and its pixels are put back, mouthW 0)
CAST16 = {
    'kenzie': dict(master='kenzie', mouth=(470, 430, 570, 470, 190), mouthW=64),
    'kenzieSip': dict(master='kenzie-sip', mouth=(470, 400, 580, 480, 190), mouthW=0),
}
KEEP_MOUTH = ('kenzieSip',)


def keep_painted_mouth(key, cfg, rig):
    """x15's rule (the cut paints the drawn mouth out of the head so that the code can draw one; here the master's own pixels are copied back into the head sprite over the mouth's box, 8 px more on every side, and mouthW is 0, so that the code
    draws nothing over them), with the box kept inside the head sprite: the sip's lips and straw reach down to the chin line, where the head sprite ends"""
    m, L = rig['mouth'], rig['layers']['head']
    f = os.path.join(ROOT, 'public', L['file']); head = np.array(Image.open(f).convert('RGBA'))
    src = load16(cfg['master']).astype(np.uint8)
    x0, x1, y0, y1 = int(m['cx'] - m['w'] / 2 - 8), int(m['cx'] + m['w'] / 2 + 8), int(m['cy'] - 40), int(m['cy'] + 40)
    x0, x1, y0, y1 = max(x0, L['x']), min(x1, L['x'] + L['w']), max(y0, L['y']), min(y1, L['y'] + L['h'])
    reg = head[y0 - L['y']:y1 - L['y'], x0 - L['x']:x1 - L['x']]
    keep = reg[..., 3] > 200   # (only where the head sprite is: the face)
    reg[..., :3][keep] = src[y0:y1, x0:x1][keep]
    Image.fromarray(head, 'RGBA').save(f, optimize=True)
    rig['mouthW'] = 0
    print(f'  {key}: the painted mouth put back into the head ({x1 - x0} x {y1 - y0} px)')


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
        for pn, L in r['bodies'].items():   # the pose's own hair is taller than the master's: what is left of it above the master's head (row 345 of the padded canvas) floats there
            if L['y'] >= 340: continue
            f = os.path.join(ROOT, 'public', L['file']); im = np.array(Image.open(f).convert('RGBA'))
            n = int((im[:340 - L['y'], :, 3] > 0).sum()); im[:340 - L['y'], :, 3] = 0
            Image.fromarray(im, 'RGBA').save(f, optimize=True); print(f'  ross {pn}: {n} px above the head cleared')
        r.pop('flySil', None); r.pop('screens', None)
        r['table'] = {pn: table_of(r['bodies'][pn]) for pn in ROSS_POSES}
        r['paper'] = bake_resume(r['bodies']['table'])
        print('  ross tables', r['table'])
        r['purple'] = x15rig['puppets']['ross']['purple']   # (x15's purple copies of the master head: plugs in, the left one gone, both gone)
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    for key, cfg in CAST16.items():
        if not (key in which or 'kenzie' in which): continue
        if not have(cfg['master']): print(f'  {key}: {cfg["master"]} is not painted yet, skipped'); continue
        cfg = dict(cfg)
        rig = tp.puppet(key, cfg)[0]
        print(f'  {key}: grey fringe cleared on', x14p.defringe(os.path.join(ROOT, 'public', rig['layers']['body']['file'])), 'px of the body')
        if key in KEEP_MOUTH: keep_painted_mouth(key, cfg, rig)
        rigs[key] = rig
    return rigs


def debug_sheet16(rigs):
    return x14p.debug_sheet14(rigs)


# ------------------------------------------------------------------ props
def stick_of(layer_file, ox, oy):
    """the thin stick that the nails pinch (the painted one stands upright above the pinch): in the cut picture the rows from the top down while the opaque part is a few px wide are the stick; returns its rows and x, the pinch row (where the nails
    begin) and its width, in the SOURCE picture's px; the stick's rows are made transparent in the file"""
    im = np.array(Image.open(layer_file).convert('RGBA')); a = im[..., 3] > 40
    rows = np.where(a.any(axis=1))[0]
    top = int(rows[0]); w = a.sum(axis=1)
    sw = int(np.median(w[top:top + 20]))
    y = top
    while y < a.shape[0] and w[y] <= max(3 * sw, sw + 14): y += 1
    xs = np.where(a[top + 2])[0]
    pinch = y - 1
    im[top:pinch - 2, :, 3] = 0   # (the stick itself goes: the code draws it, with the flag; the nails keep their tips)
    Image.fromarray(im, 'RGBA').save(layer_file, optimize=True)
    print(f'    stick: top row {top}, pinch row {pinch}, {sw} px wide, x {int(xs.mean())}')
    return dict(x=int(xs.mean()) + ox, top=top + oy, pinch=pinch + oy, w=sw)


def hand(name):
    d, alpha = tp.prop(name, name, pad=4)
    d['stick'] = stick_of(os.path.join(OUT, os.path.basename(d['file'])), d['ox'], d['oy'])
    return d


def red_lips(a):
    """Mom's painted lips: the red lipstick (red high, green and blue low); the middle and width of the biggest red blob, and the skin colour beside it"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = (r > 150) & (g < 70) & (b < 80)
    lab, n = ndi.label(red)
    if n == 0: raise RuntimeError('no lipstick found')
    j = 1 + int(np.argmax(ndi.sum(red, lab, range(1, n + 1))))
    ys, xs = np.where(lab == j)
    cx, cy, w = float((xs.min() + xs.max() + 1) / 2), float((ys.min() + ys.max() + 1) / 2), float(xs.max() - xs.min() + 1)
    sx, sy = int(xs.min() - 0.4 * w), int(cy)   # (the cheek beside the lips)
    skin = tp.med(a, sx - 3, sy - 3, sx + 4, sy + 4)
    return dict(cx=round(cx, 1), cy=round(cy, 1), w=round(w, 1)), tp.hexc(skin)


def mom(name):
    """one of Mom's screens: the picture as it is (the beige wall is the video's), a jpg; her lips measured"""
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    mouth, skin = red_lips(a)
    Image.open(find(name)).convert('RGB').save(os.path.join(OUT, f'x16-{name}.jpg'), quality=95)
    print(f'    {name}: lips {mouth}, skin {skin}')
    return dict(file=f'sp/x16-{name}.jpg', w=a.shape[1], h=a.shape[0], mouth=mouth, skin=skin)


def fist_of(layer_file, ox, oy):
    """the fist of Mom's arm (it comes in from the left edge): the biggest skin-coloured piece of the cut picture (the cuff is white and the sleeve purple; the nails and the ring are on it): (x0, y0, x1, y1) in the SOURCE picture's px"""
    im = np.array(Image.open(layer_file).convert('RGBA')).astype(int)
    r, g, b, al = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    skin = (al > 200) & (r > 215) & (g > 170) & (g < 235) & (b > 110) & (b < 190) & (r - b > 40)
    lab, n = ndi.label(skin)
    j = 1 + int(np.argmax(ndi.sum(skin, lab, range(1, n + 1))))
    ys, xs = np.where(lab == j)
    return [int(xs.min()) + ox, int(ys.min()) + oy, int(xs.max() + 1) + ox, int(ys.max() + 1) + oy]


def sign_of(a):
    """the blank paper sign on the counter: the biggest enclosed near-white rectangle in the middle third of the picture (the clock's face is at the right); (x0, y0, x1, y1) of its inside"""
    near = a.min(axis=2) >= 236
    lab, n = ndi.label(near)
    H, W, _ = a.shape
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W: continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        m = int((lab[sl] == i).sum())
        if 0.5 < w / h < 2.0 and m > 6000 and 0.3 * W < (sl[1].start + sl[1].stop) / 2 < 0.7 * W and (best is None or m > best[0]): best = (m, sl)
    if best is None: raise RuntimeError('no blank sign found')
    sl = best[1]
    return [int(sl[1].start), int(sl[0].start), int(sl[1].stop), int(sl[0].stop)]


def props():
    out = {}
    for n in ('hand-ross', 'hand-kenzie'):
        if have(n): out[n.replace('-', '_')] = hand(n)
    for n in ('mom-live', 'mom-glasses'):
        if have(n): out[n.replace('-', '_')] = mom(n)
    if have('mom-arm'):
        d, alpha = tp.prop('mom-arm', 'mom-arm', pad=4)
        d['fist'] = fist_of(os.path.join(OUT, os.path.basename(d['file'])), d['ox'], d['oy'])
        print('    mom-arm: fist', d['fist'])
        out['mom_arm'] = d
    for n in ('bg-line', 'bg-line-duck'):
        if have(n):
            im = Image.open(find(n)).convert('RGB')
            im.save(os.path.join(OUT, f'x16-{n}.jpg'), quality=96)
            out[n.replace('-', '_')] = dict(file=f'sp/x16-{n}.jpg', w=im.size[0], h=im.size[1], **({'sign': sign_of(np.array(im).astype(np.float32))} if n == 'bg-line' else {}))
            print(f'    {n}: {out[n.replace("-", "_")]}')
    return out


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    if not only or 'props' in only:
        rig['props'] = props(); print('  done props')
    pw = [k for k in ('ross', 'kenzie') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet16(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
