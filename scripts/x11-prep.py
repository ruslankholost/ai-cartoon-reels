# Prep for x11 "Are You Open?" (docs/x11-are-you-open.md): cuts the pictures of out/x11-cast (scripts/x11-art-gen.py, all seed 61) into the plates, props and puppets the scenes use (src/x11-scenes.tsx), and measures what the code needs.
# The recipe of scripts/x10-prep.py (its patches of tip-prep.py's finders are imported, not copied). Reused, not cut again: x10's bg-front, bg-counter and bg-window plates and x10's Chuck (src/x10-rig.json).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x11-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x11-prep.py plates props ross chuck     -> only those parts (src/x11-rig.json keeps the others)
# Writes public/sp/x11-*.png|jpg, src/x11-rig.json (px of the pictures, y down), scratch/x11-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61), the six bodies (sign, drive, bed, bath, pj, point) are the pose pictures registered on it. Chuck: three pictures, each its own puppet with its own head (smushed on the glass, at the curtain,
# with the wallet); the wallet of the third is cut out of the picture (it travels to his pocket in the scene) and the hole it leaves is painted over.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x10p', os.path.join(HERE, 'x10-prep.py'))
x10p = importlib.util.module_from_spec(spec); spec.loader.exec_module(x10p)   # (its patches of tip-prep's finders are applied on import)
x8, tp, nvp, fxp = x10p.x8, x10p.tp, x10p.nvp, x10p.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
DIRS = [os.path.join(ROOT, 'out', d) for d in ('x11-cast', 'x10-cast', 'x08-cast')]
DBG = os.path.join(ROOT, 'scratch', 'x11-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x11-rig.json')
WALLET = {}


def find(name):
    return next(os.path.join(d, name + '.png') for d in DIRS if os.path.exists(os.path.join(d, name + '.png')))


def wallet_cut(a):
    """chuck-wallet: the brown wallet in his mitten is cut out whole (the component of leather colour under the hand, with its ink line) and the hole is painted over with what is round it; returns the picture without it. WALLET holds the sprite"""
    x0, y0, x1, y1 = 290, 585, 450, 740
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    brown = (r > 55) & (r < 150) & (g < 85) & (b < 70) & (r - g > 15)
    box = np.zeros(brown.shape, bool); box[y0:y1, x0:x1] = True
    lab, n = ndi.label(brown & box)
    m = ndi.binary_dilation(lab == lab[675, 365], structure=K3, iterations=3)
    sprite = np.zeros(a.shape[:2] + (4,), np.uint8)
    sprite[..., :3] = a.astype(np.uint8); sprite[..., 3] = (m * 255).astype(np.uint8)
    ys, xs = np.where(m)
    WALLET.update(box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)])
    bx = WALLET['box']
    Image.fromarray(sprite[bx[1]:bx[3], bx[0]:bx[2]]).save(os.path.join(OUT, 'x11-wallet.png'), optimize=True)
    out = cv2.inpaint(a.astype(np.uint8), (ndi.binary_dilation(m, structure=K3, iterations=2) * 255).astype(np.uint8), 7, cv2.INPAINT_TELEA).astype(np.float32)
    return out


def load11(name):
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    if name == 'chuck-wallet-61': a = wallet_cut(a)
    if name == 'chuck-smush-62': a[:4, :] = 255; a[-4:, :] = 255; a[:, :4] = 255; a[:, -4:] = 255   # the picture has a 1 px edge of its own: the background would not touch the border
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    return a


tp.DBG, tp.PFX, tp.load3 = DBG, 'x11', load11
# a close-up (chuck-smush-62) has eye whites over 100 px across, and the picture has a 1 px edge of its own, so the background is a candidate too: the pair of near-equal blobs side by side that are not the background
_find_eyes10 = tp.find_eyes


def find_eyes11(a):
    try: return _find_eyes10(a)
    except RuntimeError: pass
    H, W, _ = a.shape
    lab, n = ndi.label(a.min(axis=2) >= 238)
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 2500 or len(ys) > 120000 or xs.min() <= 2 or ys.min() <= 2 or xs.max() >= W - 3 or ys.max() >= H - 3: continue
        blobs.append(dict(area=len(ys), cx=(xs.min() + xs.max() + 1) / 2, cy=(ys.min() + ys.max() + 1) / 2, rx=(xs.max() - xs.min() + 1) / 2, ry=(ys.max() - ys.min() + 1) / 2))
    best = None
    for p in range(len(blobs)):
        for q in range(p + 1, len(blobs)):
            A, B = blobs[p], blobs[q]
            if min(A['area'], B['area']) / max(A['area'], B['area']) < 0.55 or abs(A['cy'] - B['cy']) > 0.45 * max(A['ry'], B['ry']): continue
            if abs(A['cx'] - B['cx']) - A['rx'] - B['rx'] > 0.6 * max(A['rx'], B['rx']): continue
            sc = A['area'] + B['area'] - 30000 * A['cy'] / H
            if best is None or sc > best[0]: best = (sc, A, B)
    if best is None: raise RuntimeError('no eyes found')
    return sorted([best[1], best[2]], key=lambda e: e['cx'])


tp.find_eyes = find_eyes11


def save_jpg(name, src, quality=95):
    Image.open(find(src)).convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=quality)
    return f'sp/{name}.jpg'


def sprite(key, name, pad=3, protect=False):
    """public/sp/x11-<key>.png: the picture `name` cut from its white ground, cropped; {file, w, h, ox, oy}"""
    a = np.array(Image.open(find(name)).convert('RGB')).astype(np.float32)
    alpha, rgb = nvp.cut(a, protect, (), ())
    im, (ox, oy) = fxp.layer(rgb, alpha, pad)
    im.save(os.path.join(OUT, f'x11-{key}.png'), optimize=True)
    return dict(file=f'sp/x11-{key}.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src=name)


def measure_plates():
    """the numbers the scenes need from the new plates (px of the 768 x 1344 pictures): the bedroom's window and its bedside clock, the car's rear window"""
    out = {}
    bed = np.array(Image.open(find('bg-bedroom-62')).convert('RGB')).astype(int)
    white = (bed.min(axis=2) > 170) & (np.arange(1344)[:, None] < 800)
    ys, xs = np.where(white); out['bedWindow'] = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    dark = (bed.max(axis=2) < 60) & (np.arange(1344)[:, None] > 700) & (np.arange(1344)[:, None] < 840) & (np.arange(768)[None, :] > 560)
    lab, n = ndi.label(dark)
    sizes = ndi.sum(dark, lab, range(1, n + 1)); j = 1 + int(np.argmax(sizes))
    ys, xs = np.where(lab == j); out['bedClock'] = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    car = np.array(Image.open(find('bg-car-63')).convert('RGB')).astype(int)
    navy = (car[..., 2] > car[..., 0] + 25) & (car[..., 2] > 50) & (np.arange(1344)[:, None] < 800)
    lab, n = ndi.label(navy)
    sizes = ndi.sum(navy, lab, range(1, n + 1)); j = 1 + int(np.argmax(sizes))
    ys, xs = np.where(lab == j); out['carRear'] = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    return out


def hole_plate(name, src, mask):
    """the plate as a png with the pane `mask` transparent: drawn over the face on the glass, so that the window's frame (and the cross bars) hide its edges: public/sp/<name>.png"""
    a = np.array(Image.open(find(src)).convert('RGB'))
    al = np.where(mask, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([a, al])).save(os.path.join(OUT, name + '.png'), optimize=True)
    return f'sp/{name}.png'


def holes(m):
    """the panes: the bedroom window's four panes (everything inside its frame that is not the light frame and its bars), the car's rear window (the navy pane with its two street lamps)"""
    bed = np.array(Image.open(find('bg-bedroom-62')).convert('RGB')).astype(int)
    x0, y0, x1, y1 = m['bedWindow']
    box = np.zeros(bed.shape[:2], bool); box[y0 + 10:y1 - 10, x0 + 10:x1 - 10] = True
    light = (bed.min(axis=2) > 165) & ((bed.max(axis=2) - bed.min(axis=2)) < 30)
    pane = box & ~ndi.binary_dilation(light, structure=K3, iterations=1)
    lab, n = ndi.label(pane)
    keep = [i + 1 for i, v in enumerate(ndi.sum(pane, lab, range(1, n + 1))) if v > 4000]
    pane = ndi.binary_fill_holes(np.isin(lab, keep))   # (the pale rim of the moon is inside a pane: filled)
    car = np.array(Image.open(find('bg-car-63')).convert('RGB')).astype(int)
    navy = (car[..., 2] > car[..., 0] + 25) & (car[..., 2] > 50) & (np.arange(1344)[:, None] < 800)
    navy = ndi.binary_closing(navy, structure=K3, iterations=6)
    lab, n = ndi.label(navy); j = 1 + int(np.argmax(ndi.sum(navy, lab, range(1, n + 1))))
    rear = ndi.binary_fill_holes(lab == j)
    for y in range(rear.shape[0]):   # the street lamps and their poles stand in the pane: every row from the pane's left edge to its right edge is pane
        xs = np.where(rear[y])[0]
        if len(xs) > 40: rear[y, xs.min():xs.max() + 1] = True
    return dict(bedHole=hole_plate('x11-bg-bedroom-hole', 'bg-bedroom-62', pane), carHole=hole_plate('x11-bg-car-hole', 'bg-car-63', rear))


def plates():
    return dict(
        car=dict(file=save_jpg('x11-bg-car', 'bg-car-63')), bedroom=dict(file=save_jpg('x11-bg-bedroom', 'bg-bedroom-62')),
        bathroom=dict(file=save_jpg('x11-bg-bathroom', 'bg-bathroom-61')), bathdoor=dict(file=save_jpg('x11-bg-bathdoor', 'bg-bathdoor-61')), **(lambda m: dict(m, **holes(m)))(measure_plates()))


def props():
    return dict(dash=sprite('dash', 'prop-dash-62', pad=4, protect=True), case=sprite('case', 'prop-case-62', pad=4, protect=True), curtain=sprite('curtain', 'prop-curtain-62', pad=4, protect=True))


ROSS_POSES = {'sign': 'ross-sign-61', 'drive': 'ross-drive-61', 'bed': 'ross-bed-61', 'bath': 'ross-bath-61', 'pj': 'ross-pj-61', 'point': 'ross-point-61'}
CAST11 = {
    # (the pockets rule: near-white above row 330 of the picture, between the sunglasses and the head, is background)
    'chuckSmush': dict(master='chuck-smush-62', mouth=(440, 650, 620, 715, 190), mouthW=130, protect=True, pockets=(lambda a, disc: (a.min(axis=2) >= 232) & (np.arange(a.shape[0])[:, None] < 330),)),
    'chuckCurtain': dict(master='chuck-curtain-61', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'chuckWallet': dict(master='chuck-wallet-61', mouth=(430, 355, 590, 420, 190), mouthW=84),
}


def defringe(path, reach=2.0, light=215, rounds=2):
    """the light fringe that the cut leaves outside a dark outline (pale pixels within `reach` px of transparency) is made transparent: on a dark night plate it would show as a dotted white line round the head"""
    im = np.array(Image.open(path).convert('RGBA'))
    for _ in range(rounds):
        T = im[..., 3] < 8
        d = ndi.distance_transform_edt(~T)
        fr = (d <= reach) & (im[..., 3] >= 8) & (im[..., :3].min(axis=2) >= light)
        im[fr, 3] = 0
    Image.fromarray(im).save(path, optimize=True)


def puppets(which):
    rigs = {}
    x8rig = json.load(open(os.path.join(ROOT, 'src', 'x08-rig.json')))
    if 'ross' in which:
        cfg = dict(x8.CAST['ross']); cfg['poses'] = dict(ROSS_POSES)
        new = tp.puppet('ross', cfg)[0]
        r = json.loads(json.dumps(x8rig['ross']))  # x08's Ross: his head (the master's), the plugs, the head variants, the numbers of his face; only the bodies are new
        for k in ('disc', 'pivot', 'eyes', 'pupils', 'mouth'):
            if json.dumps(new[k]) != json.dumps(r[k]): print(f'  NOTE ross {k} differs from x08: {new[k]} vs {r[k]}')
        r['bodies'] = new['bodies']; r['layers'] = dict(head=r['layers']['head'], body=new['layers']['body'])
        r.pop('flySil', None); r.pop('screens', None)
        rigs['ross'] = r
    for key in CAST11:
        if key in which or 'chuck' in which:
            rigs[key] = tp.puppet(key, CAST11[key])[0]
            if key == 'chuckSmush':
                for lk in ('head', 'body'): defringe(os.path.join(ROOT, 'public', rigs[key]['layers'][lk]['file']))
    return rigs


def debug_sheet11(rigs):
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
    todo = {'plates': plates, 'props': props}
    for k, fn in todo.items():
        if only and k not in only: continue
        rig[k] = fn(); print('  done', k)
    pw = [k for k in ('ross', 'chuck') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        if WALLET: rig['wallet'] = dict(file='sp/x11-wallet.png', **WALLET)
        debug_sheet11(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
