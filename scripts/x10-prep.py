# Prep for x10 "My Own Business" (docs/x10-my-own-business.md): cuts the pictures of out/x10-cast (scripts/x10-art-gen.py, the kept list is the coordinator's, all seed 61) into the plates, props, arms, sprites and puppets the scenes use
# (src/x10-scenes.tsx), and measures what the code needs. The recipe of scripts/x09-prep.py (it reuses tip-prep.py's puppet() through x08-prep.py's patched copy, and the same cutting helpers).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x10-prep.py                 -> everything
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/x10-prep.py plates props arms ross chuck tyler guy     -> only those parts (src/x10-rig.json keeps the others)
# Writes public/sp/x10-*.png|jpg, src/x10-rig.json (px of the pictures, y down), scratch/x10-prep/* (the debug sheets).
# Ross: his head is x08's (the master ross-sit-61; every x10 pose was painted with it as the first reference), the seven bodies are the pose pictures registered on it; Chuck (dry and wet), Tyler (phone and selfie) and the guy (waving)
# are one puppet each with their own head: the pictures of one person are the same size and place but not the same pixels, so no pose of one is registered on another's head.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('x8', os.path.join(HERE, 'x08-prep.py'))
x8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(x8)
lp = x8.lp
tp, spp, nvp, fxp = lp.tp, lp.spp, lp.nvp, lp.fxp
ROOT, OUT, K3, PAD = tp.ROOT, tp.OUT, tp.K3, x8.PAD
SRC = os.path.join(ROOT, 'out', 'x10-cast')
SRC8 = os.path.join(ROOT, 'out', 'x08-cast')
DBG = os.path.join(ROOT, 'scratch', 'x10-prep')
os.makedirs(DBG, exist_ok=True)
RIG = os.path.join(ROOT, 'src', 'x10-rig.json')


def load(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)


def load10(name):
    """the pictures of out/x10-cast first, then x08's (Ross's master ross-sit-61); Ross's are padded (the arms and legs of a registered pose run past the 1024 x 1024 canvas)"""
    f = next(os.path.join(d, name + '.png') for d in (SRC, SRC8) if os.path.exists(os.path.join(d, name + '.png')))
    a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
    if name.startswith('ross'): a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    if name == 'ross-flood-61': FLOOD.append(a)
    return a


FLOOD = []  # the flood picture (Ross's head tilted 15 degrees, a phone clamped under it): the circle fitted to its jaw comes out 141 px (the phone is in the contour); the head is as big as the master's

# an open mouth (the guy's) is a closed outline with teeth and a tongue in it: the whole inside goes with the outline (a frown, a line: no holes, nothing changes)
_thin_dark = tp.thin_dark
tp.thin_dark = lambda a, zone, thr, lo=20, hi=2500: ndi.binary_fill_holes(_thin_dark(a, zone, thr, lo, hi))
# the face finder takes the raised hand of the selfie for part of the face (its circle comes out 91 px, Tyler's is 134 px and the same place in both pictures): Tyler's own circle is used for both
_face_of = tp.face_of
TYLER_DISC = None


def face_of(a):
    global TYLER_DISC
    r = _face_of(a)
    if any(a is f for f in FLOOD) and r[3][2] < 160:  # the circle of the master's size round the middle of his eyes (the master's centre is 8 px above that)
        E = r[2]; mx, my = (E[0]['cx'] + E[1]['cx']) / 2, (E[0]['cy'] + E[1]['cy']) / 2
        return r[0], r[1], r[2], (mx, my - 8, 190.0)
    if 120 < r[3][2] < 150 and TYLER_DISC is None and abs(r[3][0] - 503) < 10: TYLER_DISC = r
    if r[3][2] < 105 and TYLER_DISC is not None and abs(r[3][0] - 502) < 10: return TYLER_DISC  # (his face, eyes and circle: the master's)
    return r


tp.face_of = face_of
# a head tilted 15 degrees (Ross with the phone clamped on his shoulder) has one eye higher than the other: the eye finder's pair rule allows twice the difference when the strict rule finds none
_find_eyes = tp.find_eyes


def find_eyes(a):
    try: return _find_eyes(a)
    except RuntimeError: pass
    H, W, _ = a.shape
    lab, n = ndi.label(a.min(axis=2) >= 238)
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 2500 or xs.min() == 0 or ys.min() == 0 or xs.max() == W - 1 or ys.max() == H - 1: continue
        rx, ry = (xs.max() - xs.min() + 1) / 2, (ys.max() - ys.min() + 1) / 2
        if rx <= 90 and ry <= 90: blobs.append(dict(area=len(ys), cx=(xs.min() + xs.max() + 1) / 2, cy=(ys.min() + ys.max() + 1) / 2, rx=rx, ry=ry))
    best = None
    for p in range(len(blobs)):
        for q in range(p + 1, len(blobs)):
            A, B = blobs[p], blobs[q]
            if min(A['area'], B['area']) / max(A['area'], B['area']) < 0.55 or abs(A['cy'] - B['cy']) > 0.95 * max(A['ry'], B['ry']): continue
            if abs(A['cx'] - B['cx']) - A['rx'] - B['rx'] > 0.6 * max(A['rx'], B['rx']): continue
            sc = A['area'] + B['area'] - 30000 * A['cy'] / H
            if best is None or sc > best[0]: best = (sc, A, B)
    if best is None: raise RuntimeError('no eyes found')
    return sorted([best[1], best[2]], key=lambda e: e['cx'])


tp.find_eyes = find_eyes
tp.DBG, tp.PFX, tp.load3 = DBG, 'x10', load10


def save_jpg(name, src, quality=95):
    Image.open(os.path.join(SRC, src + '.png')).convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=quality)
    return f'sp/{name}.jpg'


def sprite(key, name, pad=3, pockets=(), protect=False, close_bottom=False):
    """public/sp/x10-<key>.png: the picture `name` cut from its white ground, cropped; {file, w, h, ox, oy}: ox, oy = where the layer sits in the picture.
    `close_bottom`: a white sleeve that runs off the bottom edge (the tiny hand's): its two outlines are joined along the last row, so that the white between them is part of the arm and not the ground"""
    a = load(name)
    alpha, rgb = nvp.cut(a, protect, (), tuple(pockets))
    if close_bottom:
        row = (alpha[-3] > 0.5)
        xs = np.where(row)[0]
        if len(xs):
            solid = alpha > 0.5; solid[-3:, xs.min():xs.max() + 1] = True
            filled = ndi.binary_fill_holes(solid) & ~solid
            alpha = np.where(filled, 1.0, alpha).astype(np.float32); rgb = np.where(filled[..., None], a, rgb)
            alpha[-3:, xs.min():xs.max() + 1] = 1.0; rgb[-3:, xs.min():xs.max() + 1] = np.where((alpha[-3:, xs.min():xs.max() + 1] > 0.5)[..., None], a[-3:, xs.min():xs.max() + 1], rgb[-3:, xs.min():xs.max() + 1])
    im, (ox, oy) = fxp.layer(rgb, alpha, pad)
    im.save(os.path.join(OUT, f'x10-{key}.png'), optimize=True)
    return dict(file=f'sp/x10-{key}.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, src=name), a, alpha


# ═════════════════════════════════════════════════════ plates (768 x 1344): the pictures as jpgs and the numbers the code needs (the painter's notes, px of the plates)
def plates():
    return dict(
        front=dict(file=save_jpg('x10-bg-front', 'bg-front-61'), sign=[63, 306, 703, 447], housing=[51, 472, 717, 529], slats=[68, 536, 700, 580], window=[90, 600, 449, 967], door=[497, 612, 669, 1053], sidewalk=1088, shutter=[56, 536, 712, 1085]),
        counter=dict(file=save_jpg('x10-bg-counter', 'bg-counter-61'), chalk=[0, 52, 412, 366], clock=[587, 197, 88], espresso=[18, 412, 208, 615], panini=[544, 520, 722, 608], register=[48, 682, 262, 852], jar=[611, 658, 712, 840], jarMouth=665, top=[795, 905]),
        window=dict(file=save_jpg('x10-bg-window', 'bg-window-61'), window=[55, 168, 414, 995], door=[517, 385, 686, 1054], handle=[510, 770], slot=[549, 1073, 659, 1105], walk=[958, 995], floor=1125),
        till=dict(file=save_jpg('x10-ins-till', 'ins-till-61')),
    )


def crops():
    """pieces of the plates that go over the people: the front counter of bg-counter from its top (y 795) down hides the legs of whoever stands behind it, the three bits of wall of bg-window (left of the window, between window and door, right of the door)
    go over the guy outside so that he is seen only through the glass; each is the plate's own pixels, placed back at the same place (x0, y0 in plate px)"""
    def crop(name, src, x0, y0, x1, y1):
        im = Image.open(os.path.join(SRC, src + '.png')).convert('RGB').crop((x0, y0, x1, y1))
        im.save(os.path.join(OUT, f'x10-{name}.jpg'), quality=95)
        return dict(file=f'sp/x10-{name}.jpg', x0=x0, y0=y0, w=x1 - x0, h=y1 - y0)
    return dict(counterFront=crop('counter-front', 'bg-counter-61', 0, 795, 768, 1344), wallL=crop('wall-l', 'bg-window-61', 0, 0, 55, 1344), wallM=crop('wall-m', 'bg-window-61', 414, 0, 517, 1344),
                wallR=crop('wall-r', 'bg-window-61', 686, 0, 768, 1344), glassTop=crop('glass-top', 'bg-window-61', 0, 0, 768, 168), floor=crop('floor', 'bg-window-61', 0, 995, 768, 1344))


# ═════════════════════════════════════════════════════ props and arms: sprites cut from their white ground
def props():
    out = {}
    out['boxes'] = sprite('boxes', 'prop-boxes-61', pad=4)[0]
    out['courier'] = sprite('courier', 'courier-61', pad=4)[0]
    out['cup'] = sprite('cup', 'ross-cup-61', pad=4)[0]
    out['guyWalk'] = sprite('guy-walk', 'guy-walk-61', pad=4)[0]
    for k, n in (('suit', 'hand-suit-61'), ('work', 'hand-work-61'), ('tiny', 'hand-tiny-61'), ('grey', 'hand-grey-61')):
        out['hand' + k.capitalize()] = sprite('hand-' + k, n, pad=2, protect=True, close_bottom=(k == 'tiny'))[0]
    return out


def apron():
    """the brown apron that Ross holds up (ross-apron-61): the biggest brown blob (its outline with it), cut out as a sprite of its own; it goes onto Tyler"""
    a = load('ross-apron-61')
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    brown = (r > 95) & (r < 200) & (g > 55) & (g < 140) & (b > 20) & (b < 90) & (r - g > 25) & (g - b > 15) & (r - b > 60)
    lab, n = ndi.label(ndi.binary_closing(brown, structure=K3, iterations=2))
    sizes = ndi.sum(brown, lab, range(1, n + 1))
    m = ndi.binary_fill_holes(lab == 1 + int(np.argmax(sizes)))
    m = ndi.binary_dilation(m, structure=K3, iterations=2)
    alpha = m.astype(np.float32)
    im, (ox, oy) = fxp.layer(a, alpha, 3)
    im.save(os.path.join(OUT, 'x10-apron.png'), optimize=True)
    ys, xs = np.where(m)
    return dict(file='sp/x10-apron.png', w=im.size[0], h=im.size[1], ox=ox, oy=oy, box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)])


# ═════════════════════════════════════════════════════ the puppets
ROSS_POSES = {'wide': 'ross-wide-61', 'till': 'ross-till-61', 'apron': 'ross-apron-61', 'point': 'ross-point-61', 'flood': 'ross-flood-61', 'coin': 'ross-coin-61', 'mop': 'ross-mop-61'}
CAST10 = {
    # mouth zones: the drawn mouth is the dark line (a frown, Tyler's tiny dash) or the whole open mouth (the guy's smile) in the zone; mouthW is the nominal open mouth, about half the head's radius
    'chuck': dict(master='chuck-61', mouth=(430, 355, 590, 415, 190), mouthW=84),
    'chuckWet': dict(master='chuck-wet-61', mouth=(430, 355, 590, 420, 190), mouthW=84),
    'tyler': dict(master='tyler-61', mouth=(482, 362, 530, 392, 190), mouthW=62),
    'tylerSelfie': dict(master='tyler-selfie-61', mouth=(482, 362, 530, 392, 190), mouthW=62),
    'guy': dict(master='guy-wave-61', mouth=(455, 345, 575, 420, 230), mouthW=88),
}


def debug_sheet10(rigs):
    """every puppet and pose on magenta with its eyes (red), pupils (blue), mouth (green), pivot (yellow), disc (orange): cropped to the picture"""
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
            tiles.append((f'{key} {pn}', bg.convert('RGB').resize((340, int(340 * S / S)), Image.LANCZOS)))
    cols = min(len(tiles), 6)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 346 + 6, rows * 370 + 6), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        x, y = 6 + (i % cols) * 346, 6 + (i // cols) * 370
        sheet.paste(im, (x, y + 22)); dr.text((x + 3, y + 4), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'cast-sheet.jpg'), quality=90)


def clean_wide_collar():
    """Ross's 'wide' body is seen 4.2 times as big in shot 3. The painted neck left slivers of skin in the shirt's collar and a ragged hole under the chin: the master head covers most of it, but not its lower edge, where the wall colour showed through as a tan strip.
    The skin in the collar band becomes shirt colour and the holes in the shirt are filled with it (the file is written in place; run again after cutting the ross bodies)."""
    f = os.path.join(ROOT, 'public', 'sp', 'x10-ross-body-wide.png')
    im = np.array(Image.open(f).convert('RGBA'))
    x0, x1, y0, y1 = 250, 480, 100, 200   # px of the picture: the collar band under the chin
    reg = im[y0:y1, x0:x1].copy()
    rgb = reg[..., :3].astype(int); lum = rgb.sum(axis=2) / 3; op = reg[..., 3] > 128
    shirt = np.median(rgb[op & (lum < 40) & (rgb[..., 2] >= rgb[..., 0])], axis=0).astype(np.uint8)   # the shirt is a cool near-black; anything warm in the band is the neck, or its antialiased edge
    skin = op & (rgb[..., 0] > 45) & (rgb[..., 0] > rgb[..., 2] + 10)
    reg[skin] = [*shirt, 255]
    op = reg[..., 3] > 128
    holes = ndi.binary_fill_holes(op) & ~op
    reg[holes] = [*shirt, 255]
    im[y0:y1, x0:x1] = reg
    Image.fromarray(im).save(f)
    print(f'  wide collar: {int(skin.sum())} skin px and {int(holes.sum())} hole px now shirt {tuple(int(v) for v in shirt)}')


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
        clean_wide_collar()
    for key in ('chuck', 'chuckWet', 'tyler', 'tylerSelfie', 'guy'):
        if key in which: rigs[key] = tp.puppet(key, CAST10[key])[0]
    return rigs


if __name__ == '__main__':
    only = sys.argv[1:]
    if only == ['cleanwide']:
        clean_wide_collar(); sys.exit(0)
    rig = json.load(open(RIG)) if os.path.exists(RIG) else {}
    todo = {'plates': plates, 'crops': crops, 'props': props, 'apron': apron}
    for k, fn in todo.items():
        if only and k not in only: continue
        rig[k] = fn(); print('  done', k)
    pw = [k for k in ('ross', 'chuck', 'chuckWet', 'tyler', 'tylerSelfie', 'guy') if not only or k in only]
    if pw:
        rp = puppets(pw)
        rig.setdefault('puppets', {}).update(rp)
        debug_sheet10(rp); print('  done puppets', list(rp))
    json.dump(rig, open(RIG, 'w'), indent=1)
    print('wrote', RIG)
