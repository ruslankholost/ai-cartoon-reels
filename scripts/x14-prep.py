# Prep for x14 "Four Stars" (docs/x14-four-stars.md): cuts the pictures of out/x14-cast (scripts/x14-art-gen.py; the kept seed of each name is its SEEDS entry, else 61) into the puppets and props the scenes use (src/x14-scenes.tsx)
# and measures what the code needs. The recipe of scripts/x13-prep.py (it reuses x10-prep.py's patched copy of tip-prep.py's puppet() and finders). Reused, not cut again: x10's plates (bg-counter, bg-window), its counterFront crop and its Ross
# poses (point, wide: src/x10-rig.json), x08's Ross bodies (up, fly) and its hand with the phone (src/x08-rig.json), x13's Chuck with the phone and Ross's armless 'wideBare' body (src/x13-rig.json); the code reads those rigs itself.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x14-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x14-prep.py props ross chuck     -> only those parts (src/x14-rig.json keeps the others)
# Writes public/sp/x14-*.png, src/x14-rig.json (px of the pictures, y down), scratch/x14-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the two new bodies (present: the mug on its saucer held out; kneel: on one knee with the ring box) are the pose pictures registered on it; the purple copy of x08's head (plugs in) is cut from it.
# Chuck: five pictures, each its own puppet with its own head (thumbs, shrug, mug, star, wreck). The props are the latte seen from above and the counter's front face (the plate's rows below its top surface: it goes over a hand that comes down on the counter).
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x10p', os.path.join(HERE, 'x10-prep.py'))
x10p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x10p)   # (its patches of tip-prep's finders are applied on import)
x8, tp, nvp, fxp = x10p.x8, x10p.tp, x10p.nvp, x10p.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x14-cast', 'x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x14-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x14-rig.json')


def kept_seeds():
    """SEEDS of scripts/x14-art-gen.py (name -> the seeds painted; the last is the kept one), read without running the file (it starts the GPU)"""
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', open(os.path.join(HERE, 'x14-art-gen.py'), encoding='utf-8').read(), re.M)
    return ast.literal_eval(m.group(1)) if m else {}


SEEDS = kept_seeds()


def find(name):
    """a picture by its name: out/x14-cast/<name>-<kept seed>.png; a name that already ends in a seed (x10's ross-apron-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name): name = f'{name}-{(SEEDS.get(name) or [61])[-1]}'
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def load14(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x14', load14
# the open mouth of the delighted Chuck (thumbs) is one big dark shape with teeth and a tongue in it: the drawn mouth is found with a bigger upper size limit (set before that puppet is cut)
MOUTH_HI = [2500]
_thin_dark = tp.thin_dark
tp.thin_dark = lambda a, zone, thr, lo=20, hi=2500: _thin_dark(a, zone, thr, lo, MOUTH_HI[0] if hi == 2500 else hi)
# x10-prep's patch of thin_dark (the holes of the found outline are filled) wraps the original; ours wraps it again, so the order is: ours (the limit) -> x10's (fill holes) -> tip-prep's


# tip-prep takes the near-white pixels round the head (outside its circle, above the chin) for pockets of the ground that hair strands shut in. Ross's white fur collar and white robe are exactly there, so for his poses that rule is left out
# (the pose's own head is cut away anyway, and the flood fill from the border still removes the real ground): `masks[0]` of the call is that rule
NOPOCKET = [False]
POCKET_ROWS = [None]   # Chuck: the rule stays for the rows of his ears and curls (above this row) and is left out below it, where his white shirt's shoulders are
def _cut_masks(a, masks):
    if NOPOCKET[0] and masks: return masks[1:]
    if POCKET_ROWS[0] and masks: return (masks[0] & (np.arange(a.shape[0])[:, None] < POCKET_ROWS[0]),) + tuple(masks[1:])
    return masks
_cut = nvp.cut
nvp.cut = lambda a, protect=False, holes=(), masks=(): _cut(a, protect, holes, _cut_masks(a, masks))


def counter_without_jar():
    """x10's counter plate without the glass jar (and its shadow) that stands on the counter's top at the right: the box of 130 x 208 px round it is covered by the same rows of the plate 134 px to the left (the back wall is dark brown and the top light wood
    there, level across, with nothing on them), feathered 8 px at its edges. The jar read as an empty tip jar at the end of Ross's finger (second pass of v1); it is gone from every shot of the episode so that it does not come and go between cuts"""
    a = np.array(Image.open(os.path.join(OUT, 'x10-bg-counter.jpg')).convert('RGB')).astype(np.float32)
    x0, x1, y0, y1, dx = 598, 728, 648, 856, 134
    w = np.ones((y1 - y0, x1 - x0), np.float32)
    ramp = np.minimum(1, np.arange(1, 9) / 8.0)
    w[:, :8] *= ramp[None, :]; w[:, -8:] *= ramp[None, ::-1]; w[:8, :] *= ramp[:, None]; w[-8:, :] *= ramp[::-1, None]
    out = a.copy()
    out[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - w[..., None]) + a[y0:y1, x0 - dx:x1 - dx] * w[..., None]
    return Image.fromarray(out.round().astype(np.uint8), 'RGB')


def props():
    """the latte seen from above (a plain picture, laid over the whole frame), the counter plate without its jar with its front layer (rows 795 down: it goes over whoever stands behind the counter) and its front face (rows 905 down: it goes over a hand that
    comes down onto the surface)"""
    lat = Image.open(find('ins-latte')).convert('RGB')
    lat.save(os.path.join(OUT, 'x14-latte.jpg'), quality=95)
    plate = counter_without_jar()
    plate.save(os.path.join(OUT, 'x14-bg-counter.jpg'), quality=96)
    W, H = plate.size
    plate.crop((0, 795, W, H)).save(os.path.join(OUT, 'x14-counter-front.jpg'), quality=96)
    plate.crop((0, 905, W, H)).save(os.path.join(OUT, 'x14-counter-face.jpg'), quality=96)
    return dict(latte=dict(file='sp/x14-latte.jpg', w=lat.size[0], h=lat.size[1]), counter=dict(file='sp/x14-bg-counter.jpg'),
                counterFront=dict(file='sp/x14-counter-front.jpg', x0=0, y0=795, w=W, h=H - 795), counterFace=dict(file='sp/x14-counter-face.jpg', x0=0, y0=905, w=W, h=H - 905))


ROSS_POSES = {'present': 'ross-present', 'kneel': 'ross-kneel'}


def box_mask(x0, y0, x1, y1):
    """a rectangle of the picture as a mask: what the cut keeps whole in the body layer (tip-prep's `tail`) and does not take for flecks of the white ground (`apart`)"""
    def f(a, disc):
        m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
        return m
    return f


CAST14 = {
    # the drawn mouth of each Chuck is a dark line (shrug, mug) or a small dark round (star, wreck) in the zone; the delighted one (thumbs) is a whole open mouth with teeth and a tongue (a bigger size limit)
    'chuckThumbs': dict(master='chuck-thumbs', mouth=(430, 345, 600, 430, 190), mouthW=100, big_mouth=True),
    'chuckShrug': dict(master='chuck-shrug', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'chuckMug': dict(master='chuck-mug', mouth=(478, 380, 548, 410, 190), mouthW=84, mouth_lo=60),   # (the frown is an arc under the foam mustache: a tight zone and a size floor, so that the mustache's own outline is not taken for the mouth and painted over)
    'chuckStar': dict(master='chuck-star', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'chuckWreck': dict(master='chuck-wreck', mouth=(430, 355, 590, 420, 190), mouthW=84),
}


def purple_head(path, skin_hex, dst, fury=(176, 70, 138)):
    """the head's skin recoloured to a furious purple, the shading kept (scripts/lips8-art.py: a pixel counts as skin by the direction of its colour, so the soft edge where the skin meets an ink line is recoloured as much as it is skin).
    The hair, the eye whites and the ink stay as painted. Written to `dst` (public/sp/...)"""
    SKIN = np.array([int(skin_hex[i:i + 2], 16) for i in (1, 3, 5)], float)
    im = np.asarray(Image.open(path).convert('RGBA')).astype(float)
    rgb, a = im[..., :3], im[..., 3]
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    d = rgb / np.maximum(np.linalg.norm(rgb, axis=-1, keepdims=True), 1e-6)
    cos = (d * (SKIN / np.linalg.norm(SKIN))).sum(-1)
    w = np.clip((cos - 0.991) / (0.997 - 0.991), 0, 1) * np.clip((lum - 40) / 60, 0, 1) * (a > 0)
    k = lum / (SKIN @ np.array([0.3, 0.59, 0.11]))
    out = rgb * (1 - w[..., None]) + np.clip(np.array(fury)[None, None, :] * k[..., None], 0, 255) * w[..., None]
    Image.fromarray(np.dstack([out, a]).round().astype(np.uint8), 'RGBA').save(dst)
    return f'sp/{os.path.basename(dst)}', int((w > 0.5).sum())


def defringe(path, thr=150, hi_max=228, spread=28, depth=7):
    """the light grey fringe that the cut leaves round a picture (the painted soft ground shadow: a 4-6 px grey line under the shorts' hem and round the soles): opaque pixels that are light and hardly coloured (grey, not the white of the socks and the tee,
    which is above `hi_max`) and that the empty ground reaches through such pixels alone (`depth` px) are cleared, and the new edge is feathered. Written over the file; returns the number of pixels cleared"""
    im = np.array(Image.open(path).convert('RGBA'))
    rgb = im[..., :3].astype(int); a = im[..., 3].astype(float)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    cand = (a > 0) & (lo >= thr) & (hi <= hi_max) & ((hi - lo) <= spread)
    ground = a == 0
    reach = ground.copy()
    for _ in range(depth): reach = ndi.binary_dilation(reach, structure=np.ones((3, 3), bool)) & (ground | cand)
    kill = cand & reach
    a2 = a.copy(); a2[kill] = 0
    edge = ndi.binary_dilation(kill, structure=np.ones((3, 3), bool)) & (a2 > 0)
    a2 = np.where(edge, np.minimum(a2, ndi.gaussian_filter(a2, 0.8) * 1.15), a2)
    im[..., 3] = np.clip(a2, 0, 255).astype(np.uint8)
    Image.fromarray(im, 'RGBA').save(path)
    return int(kill.sum())


def clean_fly():
    """public/sp/x14-ross-body-fly.png: x08's fly picture (the superman pose of the dive, shot 17) with its torn edges mended. The cut left the sleeves' inner edges (where the head was cut out between the arms) and the hole in the shirt with stair-stepped, outline-less
    edges, which showed as jagged bites in the dive. The silhouette is smoothed (the alpha blurred 2.2 px and cut at one half: the steps and the small tears go, a straight edge stays where it is), what the smoothing adds takes the colour of the nearest picture pixel,
    and a thin dark-brown outline is laid along the whole new edge where it is not already dark. Same size and place as x08's body picture; returns its layer"""
    src = os.path.join(ROOT, 'public', 'sp', 'x08-ross-body-fly.png')
    im = np.array(Image.open(src).convert('RGBA'))
    rgb = im[..., :3].astype(np.float32); a = im[..., 3] > 127
    disk = lambda r: (np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r)
    sm = ndi.binary_closing(np.pad(a, 16), structure=disk(10))[16:-16, 16:-16]   # (the bites that the cut left in the sleeves, up to 20 px across, are filled)
    sm = ndi.binary_opening(sm, structure=disk(4))                                  # (the spurs go)
    sm = ndi.gaussian_filter(sm.astype(np.float32), 2.4) > 0.5                      # (the steps)
    lab, n = ndi.label(sm)
    if n > 1: sm = lab == (1 + int(np.argmax(ndi.sum(sm, lab, range(1, n + 1)))))   # (one piece: the specks that the smoothing cut loose go)
    # the colour of the pixels the smoothing added: the nearest opaque one
    idx = ndi.distance_transform_edt(~a, return_distances=False, return_indices=True)
    rgb = rgb[idx[0], idx[1]] * (~a)[..., None] + rgb * a[..., None]
    lum = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
    ink = np.array([44, 31, 22], np.float32)
    d_in = ndi.distance_transform_edt(sm)
    w = 0.9 * np.clip(1 - (d_in - 0.5) / 1.7, 0, 1) * (d_in > 0) * np.clip((lum - 40) / 60, 0, 1)
    out = rgb * (1 - w[..., None]) + ink[None, None, :] * w[..., None]
    alpha = ndi.gaussian_filter(sm.astype(np.float32), 0.7)
    alpha = np.where(sm, np.maximum(alpha, 0.6), alpha) * (alpha > 0.05)
    res = np.dstack([np.clip(out, 0, 255), np.clip(alpha * 255, 0, 255)]).round().astype(np.uint8)
    Image.fromarray(res, 'RGBA').save(os.path.join(ROOT, 'public', 'sp', 'x14-ross-body-fly.png'), optimize=True)
    print(f'  fly: edges mended, silhouette {int(a.sum())} -> {int(sm.sum())} px')
    return dict(json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))['ross']['bodies']['fly'], file='sp/x14-ross-body-fly.png')


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES); cfg['pockets'] = ()   # (x8's own pocket rule `halo` is for the raised arms of its up and fly poses and takes the white fur and robe too)
        NOPOCKET[0] = True
        new = tp.puppet('ross', cfg)[0]
        NOPOCKET[0] = False
        r = json.loads(json.dumps(x8rig['ross']))  # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        r.pop('flySil', None); r.pop('screens', None)
        # the master head with its plugs in, purple: the snap of shot 2 (his skin recoloured as Chuck's is, the code fades it in over the head)
        r['purpleBoth'], n = purple_head(os.path.join(ROOT, 'public', r['layers']['head']['file']), r['face'], os.path.join(ROOT, 'public', 'sp', 'x14-ross-head-purple.png'))
        print(f'  ross: purple head {r["purpleBoth"]} ({n} skin px)')
        r['bodies']['fly'] = clean_fly()   # (x08's fly body with its torn edges mended: the dive)
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])   # (tip-prep also writes the head of the pose set it cut; Ross's head is x08's and this copy is never loaded)
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    for key, cfg in CAST14.items():
        if key in which or 'chuck' in which:
            cfg = dict(cfg); cfg['fleck_y'] = 372; POCKET_ROWS[0] = 372; cfg['fill_pad'] = -16   # (as x12 and x13: the white shoulders of his shirt come up beside his head and are not flecks or pockets of the ground; his jaw is narrower than the circle fitted to his head)
            MOUTH_HI[0] = 30000 if cfg.pop('big_mouth', False) else 2500
            rig = tp.puppet(key, cfg)[0]
            MOUTH_HI[0] = 2500; POCKET_ROWS[0] = None
            print(f'  {key}: grey fringe cleared on', defringe(os.path.join(ROOT, 'public', rig['layers']['body']['file'])), 'px of the body')   # (Ross's bodies keep theirs: the light line under his sneakers reads as their sole)
            rigs[key] = rig
    return rigs


def debug_sheet14(rigs):
    tiles = []
    for key, rig in rigs.items():
        for pn in list(rig.get('bodies', {'': 0}).keys()):
            S = (1024 + 2 * PAD) if key == 'ross' else 1024
            bg = Image.new('RGBA', (S, S), (255, 0, 255, 255))
            for lk in ('body', 'head'):
                L = rig['bodies'][pn] if (lk == 'body' and 'bodies' in rig) else rig['layers'][lk]
                bg.alpha_composite(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'), (L['x'], L['y']))
            d = ImageDraw.Draw(bg)
            for e in rig['eyes']: d.ellipse([e['cx'] - e['rx'], e['cy'] - e['ry'], e['cx'] + e['rx'], e['cy'] + e['ry']], outline=(255, 0, 0, 255), width=2)
            for q in rig['pupils']: d.ellipse([q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]], outline=(0, 160, 255, 255), width=2)
            m = rig['mouth']; d.rectangle([m['cx'] - m['w'] / 2, m['cy'] - 10, m['cx'] + m['w'] / 2, m['cy'] + 10], outline=(0, 255, 0, 255), width=2)
            px, py = rig['pivot']; d.line([px - 14, py, px + 14, py], fill=(255, 255, 0, 255), width=3)
            c = rig['disc']; d.ellipse([c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]], outline=(255, 160, 0, 255), width=2)
            tiles.append((f'{key} {pn}', bg.convert('RGB').resize((460, 460), Image.LANCZOS)))
    cols = min(len(tiles), 4)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 466 + 6, rows * 490 + 6), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        x, y = 6 + (i % cols) * 466, 6 + (i // cols) * 490
        sheet.paste(im, (x, y + 22)); dr.text((x + 3, y + 4), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'cast-sheet.jpg'), quality=90)


if __name__ == '__main__':
    only = sys.argv[1:]
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    if not only or 'props' in only:
        rig['props'] = props(); print('  done props')
    pw = [k for k in ('ross', 'chuck') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet14(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
