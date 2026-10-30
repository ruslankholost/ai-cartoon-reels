# Prep for x13 "Cheaper" (docs/x13-cheaper.md): cuts the pictures of out/x13-cast (scripts/x13-art-gen.py; the kept seed of each name is its SEEDS entry, else 61) into the props and puppets the scenes use (src/x13-scenes.tsx)
# and measures what the code needs. The recipe of scripts/x12-prep.py (it reuses x10-prep.py's patched copy of tip-prep.py's puppet() and finders). Reused, not cut again: x10's plates (bg-counter, bg-window, bg-front), its counterFront crop and its Ross poses
# (wide, till, apron: src/x10-rig.json), x12's Chuck (latte, point, cup, hold with their purple heads) and the cup-and-mitten sprite (src/x12-rig.json); the code reads those rigs itself.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x13-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x13-prep.py props ross chuck     -> only those parts (src/x13-rig.json keeps the others); `repaint` = Ross's added bodies (armless wide, the apron on) and the cleaned cup sprite
# Writes public/sp/x13-*.png, src/x13-rig.json (px of the pictures, y down), scratch/x13-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the one new body (drawer: both hands under the till drawer, shoving it) is the pose picture registered on it; the purple copy of his plugless head (the next-day spit-take) is cut from x08's 'none' head.
# Chuck: three pictures, each its own puppet with its own head (phone, drawer, apron). The props are the apron and the register's customer display (its screen box is measured: the digits are drawn on it in code).
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x10p', os.path.join(HERE, 'x10-prep.py'))
x10p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x10p)   # (its patches of tip-prep's finders are applied on import)
x8, tp, nvp, fxp = x10p.x8, x10p.tp, x10p.nvp, x10p.fxp
spp_cutout = nvp.spp.cutout
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x13-cast', 'x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x13-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x13-rig.json')


def kept_seeds():
    """SEEDS of scripts/x13-art-gen.py (name -> the seeds painted; the last is the kept one), read without running the file (it starts the GPU)"""
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', open(os.path.join(HERE, 'x13-art-gen.py'), encoding='utf-8').read(), re.M)
    return ast.literal_eval(m.group(1)) if m else {}


SEEDS = kept_seeds()


def find(name):
    """a picture by its name: out/x13-cast/<name>-<kept seed>.png; a name that already ends in a seed (x10's ross-apron-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name): name = f'{name}-{(SEEDS.get(name) or [61])[-1]}'
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def load13(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x13', load13
# the open mouth of the screaming Chuck is one big dark shape with a tongue in it: the drawn mouth is found with a bigger upper size limit (set before that puppet is cut)
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


def enclosed_white(a, min_area=1500):
    """the near-white areas that an outline shuts in and that do not touch the picture's edge (the inside of the apron's neck loop): pockets of the ground, as a mask"""
    lab, n = ndi.label(a.min(axis=2) >= 235)
    H, W = a.shape[:2]
    out = np.zeros((H, W), bool)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) >= min_area and ys.min() > 0 and xs.min() > 0 and ys.max() < H - 1 and xs.max() < W - 1: out |= lab == i
    return out


def sprite(key, name, pad=4, protect=False, pockets=False):
    """public/sp/x13-<key>.png: the picture `name` cut from its white ground, cropped; {file, w, h, ox, oy}. `pockets`: the white that an outline shuts in (the apron's loop) is ground too"""
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a, protect, (), (enclosed_white(a),) if pockets else ())
    im, (ox, oy) = fxp.layer(rgb, alpha, pad)
    im.save(os.path.join(OUT, f'x13-{key}.png'), optimize=True)
    return dict(file=f'sp/x13-{key}.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src=name)


def display_screen(sp):
    """the dark-green screen of the customer display: the biggest connected area of dark green pixels of the cut sprite, as a box in the sprite's px (x0, y0, x1, y1); the digits are drawn on it in code"""
    im = np.array(Image.open(os.path.join(ROOT, 'public', sp['file'])).convert('RGBA')).astype(int)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    green = (g > r + 18) & (g > b + 18) & (g < 150) & (a > 200)
    lab, n = ndi.label(green)
    best = max(range(1, n + 1), key=lambda i: int((lab == i).sum()))
    ys, xs = np.where(lab == best)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def props():
    out = dict(apron=sprite('apron', 'prop-apron', pad=4, pockets=True), display=sprite('display', 'ins-display', pad=4))
    out['display']['screen'] = display_screen(out['display'])
    print('  display screen', out['display']['screen'], 'of', out['display']['w'], 'x', out['display']['h'])
    return out


ROSS_POSES = {'drawer': 'ross-drawer'}


def box_mask(x0, y0, x1, y1):
    """a rectangle of the picture as a mask: what the cut keeps whole in the body layer (tip-prep's `tail`) and does not take for flecks of the white ground (`apart`): the raised phone and the mitten that holds it, whose white would otherwise be cut away"""
    def f(a, disc):
        m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
        return m
    return f


CAST13 = {
    # the drawn mouth of each Chuck is a dark line (the phone's smile, the apron's flat line) or a small dark round (the surprised one) in the zone
    'chuckPhone': dict(master='chuck-phone', mouth=(430, 355, 590, 420, 190), mouthW=84, apart=[(180, 300, 345, 500)], tail=box_mask(180, 300, 345, 500)),
    'chuckDrawer': dict(master='chuck-drawer', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'chuckApron': dict(master='chuck-apron', mouth=(430, 355, 590, 420, 190), mouthW=84),
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


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES); cfg['pockets'] = ()   # (x8's own pocket rule `halo` is for the raised arms of its up and fly poses and takes the white fur and robe too)
        NOPOCKET[0] = True
        new = tp.puppet('ross', cfg)[0]
        NOPOCKET[0] = False
        r = json.loads(json.dumps(x8rig['ross']))  # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the body is new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        r.pop('flySil', None); r.pop('screens', None)
        # the plugless head, purple: the next-day spit-take (his skin recoloured as Chuck's is, the code fades it in over the head)
        none = os.path.join(ROOT, 'public', r['headFiles']['none'])
        r['purpleNone'], n = purple_head(none, r['face'], os.path.join(ROOT, 'public', 'sp', 'x13-ross-head-none-purple.png'))
        print(f'  ross: purple head {r["purpleNone"]} ({n} skin px)')
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])   # (tip-prep also writes the head of the pose set it cut; Ross's head is x08's and this copy is never loaded)
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    for key, cfg in CAST13.items():
        if key in which or 'chuck' in which:
            cfg = dict(cfg); cfg['fleck_y'] = 372; POCKET_ROWS[0] = 372; cfg['fill_pad'] = -16   # (as x12: the white shoulders of his shirt come up beside his head and are not flecks or pockets of the ground; his jaw is narrower than the circle fitted to his head)
            rig = tp.puppet(key, cfg)[0]
            POCKET_ROWS[0] = None
            rigs[key] = rig
    return rigs


def tee_component(body, seeds, x_lim=None, y_max=None):
    """the dark clothes of a Ross body picture (RGBA array: the near-black T-shirt, the navy jeans, the shoes: no channel above 70) as a mask: the connected areas of dark pixels round the seed points, limited to the columns `x_lim` and the rows above `y_max` so
    that the dark inks of the tattoos on the arms do not join in"""
    r, g, b, a = (body[..., i].astype(int) for i in range(4))
    dark = (np.maximum(np.maximum(r, g), b) < 70) & (a > 128)
    if x_lim: dark[:, :x_lim[0]] = False; dark[:, x_lim[1]:] = False
    if y_max: dark[y_max:] = False
    lab, _ = ndi.label(dark)
    out = np.zeros(dark.shape, bool)
    for sx, sy in (seeds if isinstance(seeds[0], tuple) else [seeds]):
        assert dark[sy, sx], f'the seed {(sx, sy)} is not on the clothes'
        out |= lab == lab[sy, sx]
    return out


def wide_bare():
    """public/sp/x13-ross-body-wideBare.png: x10's wide body (arms flung out) without the arms: the T-shirt as it is, the sleeves ending in their own hem. For the shots where he sits at the window with his cup in his hand (the cup sprite brings the hand), where the right arm
    came into the frame's edge. Same size and place as the wide body"""
    im = np.array(Image.open(os.path.join(OUT, 'x10-ross-body-wide.png')).convert('RGBA'))
    tee = tee_component(im, [(385, 260)], (150, 610), 335)
    for y in range(335):
        xs = np.where(tee[y])[0]
        if len(xs) == 0: im[y, :, 3] = 0
        else: im[y, :xs.min(), 3] = 0; im[y, xs.max() + 1:, 3] = 0
    Image.fromarray(im, 'RGBA').save(os.path.join(OUT, 'x13-ross-body-wideBare.png'), optimize=True)
    return dict(file='sp/x13-ross-body-wideBare.png')


APRON_TOP, APRON_S, APRON_END = 809.0, 0.6, 1176   # where the apron hangs on Ross (the rig's px, the pivot of his neck is at (837, 782)): the row of the bib's top edge (as x10's apron picture has it, 27 px under the pivot), the prop's scale, and the row where it ends (x10's apron picture has its hem there)
APRON_BODIES = {   # body -> the picture, its place in the rig px, seeds on the T-shirt, the columns its dark clothes lie in, the row where the T-shirt ends (below it the apron lies on whatever is there), the columns of the hips, the row of the bib's top edge
    'wide': dict(file='x10-ross-body-wide.png', xy=(453, 614), seeds=[(385, 260)], x_lim=(150, 610), hem=410, cols=(235, 510), top=APRON_TOP),
    'till': dict(file='x10-ross-body-till.png', xy=(606, 725), seeds=[(231, 150)], x_lim=(0, 450), hem=298, cols=(95, 356), top=APRON_TOP),
    'drawer': dict(file='x13-ross-body-drawer.png', xy=(551, 705), seeds=[(150, 60)], x_lim=None, hem=312, cols=(125, 430), top=APRON_TOP - 20),   # (the tray hides the bib: a little higher, so that its top edge shows between the straps over the tray's rim)
}


def wear_apron(key):
    """public/sp/x13-ross-body-<key>A.png: Ross's body picture with the apron on (x13's prop-apron, cut sprite), for the shots where he is still in it after the shots of x10's apron picture: FREE (wide), the bill and the first half of the corks (till), the drawer.
    The apron is laid on his clothes only (the T-shirt above its hem, below it the hips), so everything that is in front of them in the picture stays in front: the hand and the bill, the tray and his hands on it, the lines of the outline (the mask is
    eroded by 3 px). It is as wide at the chest as the apron of x10's picture, its top edge hangs where that one's does, and it ends where that one does. Same size and place as the body picture"""
    c = APRON_BODIES[key]
    bx, by = c['xy']
    body = np.array(Image.open(os.path.join(OUT, c['file'])).convert('RGBA'))
    h, w = body.shape[:2]
    rows, cols = np.arange(h)[:, None], np.arange(w)[None, :]
    upper = tee_component(body, c['seeds'], c['x_lim']) & (rows < c['hem'])
    lower = ndi.binary_dilation((body[..., 3] > 128) & (rows >= c['hem']), structure=np.ones((1, 17), bool)) & (rows >= c['hem']) & (cols >= c['cols'][0]) & (cols < c['cols'][1] + 8)   # (the hips a little wider than the legs: no step at the T-shirt's hem)
    mask = np.clip(ndi.distance_transform_edt((upper | lower) & (rows <= APRON_END - by)) - 3, 0, 1)
    P = Image.open(os.path.join(OUT, 'x13-apron.png')).convert('RGBA')
    pa = np.array(P)[..., 3] > 128
    ptop = int(np.argmax(pa.sum(axis=1) > 150))
    xs = np.where(pa[ptop + 40])[0]
    pcx = (xs.min() + xs.max()) / 2
    P = P.resize((round(P.width * APRON_S), round(P.height * APRON_S)), Image.LANCZOS)
    ox, oy = round(837.0 - pcx * APRON_S - bx), round(c['top'] - ptop * APRON_S - by)   # the prop's top left corner in the body picture's px
    layer = np.zeros((h, w, 4), np.uint8)
    pa = np.array(P)
    y0, x0 = max(0, oy), max(0, ox); y1, x1 = min(h, oy + pa.shape[0]), min(w, ox + pa.shape[1])
    layer[y0:y1, x0:x1] = pa[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    layer[..., 3] = (layer[..., 3] * mask).astype(np.uint8)
    out = Image.alpha_composite(Image.fromarray(body, 'RGBA'), Image.fromarray(layer, 'RGBA'))
    out.save(os.path.join(OUT, f'x13-ross-body-{key}A.png'), optimize=True)
    return dict(file=f'sp/x13-ross-body-{key}A.png')


def clean_cuphand():
    """public/sp/x13-cupHand.png: x12's cup-and-mitten sprite (src/x12-rig.json cupHand, 140 x 178) without the white that was cut with it: the halo of pure white outside its ink line on the right (the cup's side, the thumb) and the right end of the
    lid's skirt, which had no outline and stuck out past the cup as a white flap; that end is redrawn as the left end (the skirt is symmetric about the column 69.5). Same size and same picture, so the code only swaps the file"""
    im = np.array(Image.open(os.path.join(OUT, 'x12-cupHand.png')).convert('RGBA'))
    # the skirt's right end: the left end (columns 12-27) mirrored over it, rows 25-45
    for y in range(25, 46):
        for x in range(12, 28): im[y, 139 - x] = im[y, x]
    a = im[..., 3].copy()
    rgb = im[..., :3].astype(int)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    zone = (np.arange(im.shape[0])[:, None] >= 46) & (np.arange(im.shape[1])[None, :] >= 90)   # (the halo is on the right side only, below the lid)
    # the halo: bright, hardly coloured pixels that the empty ground reaches through bright pixels alone (3 deep; the ink line stops it), then the light-grey fringe left outside the ink line (2 deep)
    for thr, spread, depth in [(215, 40, 3), (140, 16, 2)]:
        ground = a == 0
        cand = (a > 0) & (lo >= thr) & (hi - lo <= spread) & zone
        reach = ground.copy()
        for _ in range(depth): reach = ndi.binary_dilation(reach, structure=np.ones((3, 3), bool)) & (ground | cand)
        a[cand & reach] = 0
    lab, n = ndi.label(a > 0, structure=np.ones((3, 3), bool))
    for i in range(1, n + 1):
        if (lab == i).sum() < 40: a[lab == i] = 0   # (specks of the ink line that the cleaning cut loose)
    im[..., 3] = a
    Image.fromarray(im, 'RGBA').save(os.path.join(OUT, 'x13-cupHand.png'), optimize=True)
    print('  cupHand: halo removed,', int(((np.array(Image.open(os.path.join(OUT, 'x12-cupHand.png')).convert('RGBA'))[..., 3] > 0) & (a == 0)).sum()), 'px cleared')


def repaint_bodies(rig):
    """the Ross bodies this episode adds to the cut ones, made from x10's wide and till bodies and x13's drawer body (their layers are theirs): wideBare (the arms gone, for the cup shots), wideA, tillA, drawerA (the apron on). Returns {name: layer}"""
    x10 = json.load(open(os.path.join(ROOT, 'src', 'x10-rig.json')))['puppets']['ross']['bodies']
    own = rig['puppets']['ross']['bodies']
    base = {'wide': x10['wide'], 'till': x10['till'], 'drawer': own['drawer']}
    out = {'wideBare': dict(base['wide'], file=wide_bare()['file'])}
    for key in ('wide', 'till', 'drawer'): out[key + 'A'] = dict(base[key], file=wear_apron(key)['file'])
    print('  ross bodies:', ', '.join(out))
    return out


def debug_sheet13(rigs):
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
        debug_sheet13(rp); print('  done puppets', list(rp))
    if not only or 'ross' in only or 'repaint' in only:
        rig['puppets']['ross']['bodies'].update(repaint_bodies(rig)); print('  done ross bodies')
    if not only or 'repaint' in only:
        clean_cuphand(); print('  done cup sprite')
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
