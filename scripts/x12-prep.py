# Prep for x12 "Speak to the Manager" (docs/x12-speak-to-the-manager.md): cuts the pictures of out/x12-cast (scripts/x12-art-gen.py; the kept seed of each name is its SEEDS entry, else 61) into the props and puppets the scenes use (src/x12-scenes.tsx)
# and measures what the code needs. The recipe of scripts/x11-prep.py (it reuses x10-prep.py's patched copy of tip-prep.py's puppet() and finders). Reused, not cut again: x10's bg-counter and bg-window plates, its counterFront crop and its Ross poses
# (the apron, from out/x10-cast); the plates and crops are read from src/x10-rig.json by the code.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x12-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x12-prep.py props ross chuck     -> only those parts (src/x12-rig.json keeps the others)
# Writes public/sp/x12-*.png, src/x12-rig.json (px of the pictures, y down), scratch/x12-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the four bodies (tie, king, god, apron) are the pose pictures registered on it. Chuck: five pictures, each its own puppet with its own head (latte, point, scream, cup, hold); the three that go purple (latte, point, scream) also get a
# purple copy of the head (the skin recoloured, the shading kept: the code fades it in over the head, as src/lips8-shared.tsx does for "Cold Lips"). The crown and the beard are sprites.
import ast, importlib.util, json, os, re, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x10p', os.path.join(HERE, 'x10-prep.py'))
x10p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x10p)   # (its patches of tip-prep's finders are applied on import)
x8, tp, nvp, fxp = x10p.x8, x10p.tp, x10p.nvp, x10p.fxp
spp_cutout = nvp.spp.cutout
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x12-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x12-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x12-rig.json')


def kept_seeds():
    """SEEDS of scripts/x12-art-gen.py (name -> the seeds painted; the last is the kept one), read without running the file (it starts the GPU)"""
    m = re.search(r'^SEEDS\s*=\s*(\{.*\})\s*(?:#.*)?$', open(os.path.join(HERE, 'x12-art-gen.py'), encoding='utf-8').read(), re.M)
    return ast.literal_eval(m.group(1)) if m else {}


SEEDS = kept_seeds()


def find(name):
    """a picture by its name: out/x12-cast/<name>-<kept seed>.png; a name that already ends in a seed (x10's ross-apron-61) is looked up as it is"""
    if not re.search(r'-\d\d$', name): name = f'{name}-{(SEEDS.get(name) or [61])[-1]}'
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def load12(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x12', load12
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


def sprite(key, name, pad=4, protect=False):
    """public/sp/x12-<key>.png: the picture `name` cut from its white ground, cropped; {file, w, h, ox, oy}"""
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a, protect, (), ())
    im, (ox, oy) = fxp.layer(rgb, alpha, pad)
    im.save(os.path.join(OUT, f'x12-{key}.png'), optimize=True)
    return dict(file=f'sp/x12-{key}.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src=name)


def cup_hand():
    """the cup with the khaki mitten that holds it, cut out of chuck-cup: the cup's silhouette (drawn by hand, as in fill_cup) and the khaki of the mitten (its fingers, thumb and knitted cuff: not skin, not white) in the boxes where it is;
    not the forearm, the sleeve or the ear. The sip's cup rises on a forearm that the code draws"""
    a = np.array(Image.open(find('chuck-cup')).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a, False, (), ())
    poly = np.zeros(a.shape[:2], np.uint8)
    cv2.fillPoly(poly, [np.array([(226, 306), (321, 308), (329, 343), (324, 350), (314, 466), (241, 464), (224, 350), (217, 343)], np.int32)], 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skin = (r > 222) & (g > 180) & (b > 110) & (b < 200) & (r - b > 45)
    cupm = (cv2.dilate(poly, np.ones((3, 3), np.uint8)) > 0) & ~skin
    white = a.min(axis=2) >= 222
    zone = np.zeros(a.shape[:2], bool); zone[360:478, 196:264] = True; zone[368:452, 296:356] = True; zone[448:476, 232:322] = True
    mitten = zone & (alpha > 0.5) & ~skin & ~white
    mitten = cv2.dilate(cv2.morphologyEx(mitten.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)), np.ones((3, 3), np.uint8)) > 0
    keep = (cupm | mitten).astype(np.float32)
    keep[:331, 322:] = 0; keep[450:, 332:] = 0; keep[300:314, 312:322] = 0   # (a tick of the ear's outline above the lid, a dash of the sleeve's below the thumb)
    lab, n = ndi.label(keep > 0)
    if n > 1:   # (only the biggest piece is the cup and its mitten: the specks of the sleeve and the ear are other pieces)
        big = 1 + int(np.argmax(ndi.sum(keep > 0, lab, range(1, n + 1))))
        keep = (lab == big).astype(np.float32)
    im, (ox, oy) = fxp.layer(rgb, alpha * keep, 3)
    im.save(os.path.join(OUT, 'x12-cupHand.png'), optimize=True)
    return dict(file='sp/x12-cupHand.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src='chuck-cup')


def props():
    return dict(crown=sprite('crown', 'prop-crown', pad=4), beard=sprite('beard', 'prop-beard', pad=4), cupHand=cup_hand())


def measure_tag(ross):
    """the blank white name tag painted on the tie picture: the biggest near-white blob of the tie body, as a box in rig px (the padded picture's px)"""
    L = ross['bodies']['tie']
    im = np.array(Image.open(os.path.join(ROOT, 'public', L['file'])).convert('RGBA'))
    white = (im[..., :3].min(axis=2) > 232) & (im[..., 3] > 200)
    lab, n = ndi.label(white)
    best = max(range(1, n + 1), key=lambda i: int((lab == i).sum()))
    ys, xs = np.where(lab == best)
    return [int(xs.min() + L['x']), int(ys.min() + L['y']), int(xs.max() + 1 + L['x']), int(ys.max() + 1 + L['y'])]


ROSS_POSES = {'tie': 'ross-tie', 'king': 'ross-king', 'god': 'ross-god', 'apron': 'ross-apron-61'}
def pocket_poly(pts):
    """a pocket of the ground that the arm, the head and the shoulder shut in, as a polygon of the picture (the cut keeps only the near-white pixels of it as ground)"""
    def f(a, disc):
        m = np.zeros(a.shape[:2], np.uint8)
        cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
        return m > 0
    return f


def box_mask(x0, y0, x1, y1):
    """a rectangle of the picture as a mask: what the cut keeps whole in the body layer (tip-prep's `tail`) and does not take for flecks of the white ground (`apart`): the raised cup and the mitten that holds it, whose white would otherwise be cut away"""
    def f(a, disc):
        m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
        return m
    return f


CAST12 = {
    # the drawn frown of each Chuck is a dark line in the zone; the screaming one is a whole open mouth (a big dark shape, bigger than the usual limit)
    'chuckLatte': dict(master='chuck-latte', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'chuckPoint': dict(master='chuck-point', mouth=(430, 355, 590, 420, 190), mouthW=84, apart=[(135, 412, 350, 508)], tail=box_mask(135, 412, 350, 508)),
    'chuckScream': dict(master='chuck-scream', mouth=(438, 231, 592, 425, 190), mouthW=130, big_mouth=True),
    'chuckCup': dict(master='chuck-cup', mouth=(430, 355, 590, 420, 190), mouthW=84, apart=[(195, 305, 345, 480)], tail=box_mask(195, 305, 345, 480), pockets=(pocket_poly([(327, 352), (346, 352), (350, 364), (366, 364), (368, 378), (396, 378), (409, 417), (381, 428), (360, 443), (340, 454), (333, 458), (326, 458), (334, 440), (341, 424), (344, 412), (343, 400), (327, 398)]),)),
    'chuckHold': dict(master='chuck-hold', mouth=(430, 355, 590, 420, 190), mouthW=84, apart=[(135, 318, 345, 495)], tail=box_mask(135, 318, 345, 495)),
}


def fill_cup(rig):
    """the white of the raised cup that tip-prep takes for a pocket of the ground (the right of the cup is within 1.3 radii of the head's circle): the cup's silhouette, drawn by hand on the picture (px of chuck-cup), is made solid again
    in the body layer, in the picture's own colours"""
    L = rig['layers']['body']
    path = os.path.join(ROOT, 'public', L['file'])
    im = np.array(Image.open(path).convert('RGBA'))
    src = np.array(Image.open(find('chuck-cup')).convert('RGB'))
    poly = np.zeros(src.shape[:2], np.uint8)
    cv2.fillPoly(poly, [np.array([(229, 308), (324, 309), (333, 343), (324, 348), (312, 462), (243, 460), (227, 348), (220, 343)], np.int32)], 1)
    m = cv2.erode(poly, np.ones((7, 7), np.uint8)) > 0
    ys, xs = np.where(m)
    n = 0
    for y, x in zip(ys, xs):
        ly, lx = y - L['y'], x - L['x']
        if 0 <= ly < im.shape[0] and 0 <= lx < im.shape[1] and im[ly, lx, 3] < 200:
            im[ly, lx] = [*src[y, x], 255]; n += 1
    Image.fromarray(im).save(path, optimize=True)
    return n


PURPLE_HEADS = ('chuckLatte', 'chuckPoint', 'chuckScream')   # the three that are ever purple (the cup and the hold pictures are the calm Chuck)


EAR_ZONE = {'chuckCup': (318, 300, 346, 415), 'chuckHold': (318, 310, 346, 415)}   # picture px (x0, y0, x1, y1): the lower part of his left ear and its tuft


def patch_ear(key, rig):
    """the box that belongs to the body (the raised cup and its arm: `apart`) also took the lower part of his left ear out of the head layer, and the body layer starts below it: a rectangular notch in the side of his head. The pixels of the zone that the head layer lacks
    are put back from a plain cut-out of the picture (the ground flood-filled away, nothing else)"""
    a = np.array(Image.open(find(CAST12[key]['master'])).convert('RGB')).astype(np.float32)
    alpha, rgb = spp_cutout(a)
    L = rig['layers']['head']; path = os.path.join(ROOT, 'public', L['file'])
    im = np.array(Image.open(path).convert('RGBA'))
    x0, y0, x1, y1 = EAR_ZONE[key]
    zy, zx = slice(y0 - L['y'], y1 - L['y']), slice(x0 - L['x'], x1 - L['x'])
    sub = im[zy, zx]; al = alpha[y0:y1, x0:x1]; col = rgb[y0:y1, x0:x1]
    miss = (sub[..., 3] < 128) & (al > 0.5) & (col.min(axis=-1) < 225)   # (not the near-white: the white between the arm, the head and the shoulder is background that the cut-out keeps because the outlines shut it in)
    sub[miss] = np.dstack([np.clip(col, 0, 255).astype(np.uint8), (al * 255).astype(np.uint8)])[miss]
    Image.fromarray(im).save(path, optimize=True)
    return int(miss.sum())


def purple_head(path, skin_hex, fury=(176, 70, 138)):
    """the head's skin recoloured to a furious purple, the shading kept (scripts/lips8-art.py: a pixel counts as skin by the direction of its colour, so the soft edge where the skin meets an ink line is recoloured as much as it is skin).
    The grey curls, the black glasses, the eye whites and the ink stay as painted. Written next to the head as <name>-purple.png"""
    SKIN = np.array([int(skin_hex[i:i + 2], 16) for i in (1, 3, 5)], float)
    im = np.asarray(Image.open(path).convert('RGBA')).astype(float)
    rgb, a = im[..., :3], im[..., 3]
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    d = rgb / np.maximum(np.linalg.norm(rgb, axis=-1, keepdims=True), 1e-6)
    cos = (d * (SKIN / np.linalg.norm(SKIN))).sum(-1)
    w = np.clip((cos - 0.991) / (0.997 - 0.991), 0, 1) * np.clip((lum - 40) / 60, 0, 1) * (a > 0)
    k = lum / (SKIN @ np.array([0.3, 0.59, 0.11]))
    out = rgb * (1 - w[..., None]) + np.clip(np.array(fury)[None, None, :] * k[..., None], 0, 255) * w[..., None]
    dst = path.replace('.png', '-purple.png')
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
        r = json.loads(json.dumps(x8rig['ross']))  # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        r.pop('flySil', None); r.pop('screens', None)
        rigs['ross'] = r
        orphan = os.path.join(ROOT, 'public', new['layers']['head']['file'])   # (tip-prep also writes the head of the pose set it cut; Ross's head is x08's and this copy is never loaded)
        if os.path.exists(orphan) and new['layers']['head']['file'] != r['layers']['head']['file']: os.remove(orphan)
    for key, cfg in CAST12.items():
        if key in which or 'chuck' in which:
            cfg = dict(cfg); cfg['fleck_y'] = 372; POCKET_ROWS[0] = 372; cfg['fill_pad'] = -16   # (the white shoulders of his shirt come up beside his head and are not flecks or pockets of the ground; his jaw is narrower than the circle fitted to his head, and the fill behind the head, the circle's size, showed as a white wedge beside the jaw: a smaller one, his head never moves on his body)
            MOUTH_HI[0] = 30000 if cfg.pop('big_mouth', False) else 2500
            rig = tp.puppet(key, cfg)[0]
            MOUTH_HI[0] = 2500; POCKET_ROWS[0] = None
            if key == 'chuckCup': print('  cup pixels restored:', fill_cup(rig))
            if key in EAR_ZONE: print(f'  {key}: ear pixels put back:', patch_ear(key, rig))
            if key in PURPLE_HEADS:
                rig['purple'], n = purple_head(os.path.join(ROOT, 'public', rig['layers']['head']['file']), rig['face'])
                print(f'  {key}: purple head {rig["purple"]} ({n} skin px)')
            rigs[key] = rig
    return rigs


def debug_sheet12(rigs):
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
            tiles.append((f'{key} {pn}', bg.convert('RGB').resize((340, 340), Image.LANCZOS)))
    cols = min(len(tiles), 6)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 346 + 6, rows * 370 + 6), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        x, y = 6 + (i % cols) * 346, 6 + (i // cols) * 370
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
        debug_sheet12(rp); print('  done puppets', list(rp))
    if 'ross' in rig.get('puppets', {}):
        rig['tag'] = measure_tag(rig['puppets']['ross']); print('  tag box', rig['tag'])
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
