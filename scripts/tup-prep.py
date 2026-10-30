# Prep for "I'm Just Supporting a Friend" (docs/x05-supporting-a-friend.md): cuts the picks of out/sp-cast6 (scripts/tup-art-gen.py) into pieces the way scripts/pen-prep.py cuts its props (this script reuses
# tip-prep.py's prop(), the flood fill of the white, through pen-prep.py, and its enclosed_whites()) and measures the anchor points the code needs.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/tup-prep.py            -> public/sp/tup-*.png, src/tup-props.json, scratch/tup/candidates.jpg (every candidate, the picks marked) and scratch/tup/pieces.jpg (the cut pieces on magenta, the anchors drawn)
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/tup-prep.py analyze    -> prints the numbers of every candidate (to choose the picks)
# Every number in src/tup-props.json is in px of the piece's own png (x right, y down); `ox`, `oy` is where the piece's top left was in the 1344x768 picture.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi
from scipy.optimize import least_squares
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pp', os.path.join(HERE, 'pen-prep.py'))
pp = importlib.util.module_from_spec(spec); spec.loader.exec_module(pp)
tp = pp.tp
ROOT, OUT, K3 = tp.ROOT, tp.OUT, tp.K3
SRC = os.path.join(ROOT, 'out', 'sp-cast6')
DBG = os.path.join(ROOT, 'scratch', 'tup')
os.makedirs(DBG, exist_ok=True)


def load6(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)


tp.DBG, tp.PFX, tp.load3 = DBG, 'tup', load6  # (prop() reads its picture with load3 and writes public/sp/<PFX>-<name>.png)

# the picks (why: the bowl and the lid have the same colour and nearly the same view; the hands are the cleanest drawings of a finger pointing straight down; the man's box and the box alone are the same box,
# the same seed 74 gave the same view, the same lid ledge and the same bow)
PICKS = dict(bowl='bowl-74', lid='lid-71', handShopper='hand-shopper-73', handHostess='hand-hostess-71', handMan='hand-man-74', giftBox='giftbox-74')
CANDIDATES = {k: [n % i for i in (1, 2, 3, 4)] for k, n in dict(bowl='bowl-7%d', lid='lid-7%d', handShopper='hand-shopper-7%d', handHostess='hand-hostess-7%d', handMan='hand-man-7%d', giftBox='giftbox-7%d').items()}


# ------------------------------------------------------------------ measuring
def fit_top_ellipse(sil, trim=0.06):
    """the round rim of a bowl or a lid seen from a little above: its far edge is the top of the silhouette, an arc of an ellipse; the ellipse (cx, cy, rx, ry) is fitted to that arc, without the steep
    ends (the sides of a bowl run down from the ends of the ellipse). Returns the four numbers and the rms of the fit in px"""
    cols = np.where(sil.any(axis=0))[0]
    top = np.array([np.argmax(sil[:, x]) for x in cols], float)
    x0, x1 = cols.min(), cols.max()
    keep = (cols > x0 + trim * (x1 - x0)) & (cols < x1 - trim * (x1 - x0))
    xs, ys = cols[keep].astype(float), top[keep]

    def res(p):
        cx, cy, rx, ry = p
        return ys - (cy - ry * np.sqrt(np.clip(1 - ((xs - cx) / rx) ** 2, 0, None)))

    w = (x1 - x0) / 2
    r = least_squares(res, [(x0 + x1) / 2, ys.min() + 0.25 * w, w, 0.25 * w], bounds=([x0, 0, 20, 5], [x1, sil.shape[0], sil.shape[1], sil.shape[0]]))
    return [float(v) for v in r.x], float(np.sqrt(np.mean(r.fun ** 2)))


def skin_of(a):
    """the light peach skin of the hands"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 225) & (g > 185) & (g < 232) & (b > 120) & (b < 195) & (r - b > 45)


def lowest(sil, rows=3):
    """the lowest point of a silhouette: its lowest row, the middle of the pixels within `rows` rows of it"""
    ys, xs = np.where(sil)
    y = ys.max()
    return float(xs[ys >= y - rows + 1].mean()), float(y + 1)


def bottom_middle(sil):
    """the middle of a box's bottom edge: the column in the middle of the silhouette, its lowest opaque pixel (the box is seen a little from the side, so its bottom edge slants and the lowest corner is not the middle)"""
    xs = np.where(sil.any(axis=0))[0]
    x = (xs.min() + xs.max() + 1) / 2
    col = np.where(sil[:, int(x)])[0]
    return float(x), float(col.max() + 1)


def box_of(a, alpha):
    """the gift box in a picture of the man's hand: the pastel-blue paper and the red ribbon (the hand is peach, the sleeve dark grey, the cuff white); all the pieces of it, so that the loops of the bow count"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((b > r + 25) & (b > 170) & (g > 140)) | ((r > 140) & (g < 90) & (b < 90))
    m = ndi.binary_closing(m & (alpha > 0.5), structure=K3, iterations=2)
    lab, n = ndi.label(m)
    keep = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(m, lab, range(1, n + 1))) if v >= 300])
    return ndi.binary_fill_holes(keep)


def mean_colour(a, sil):
    return [int(v) for v in np.median(a[sil], axis=0)]


def analyze():
    for key, names in CANDIDATES.items():
        for n in names:
            a = load6(n)
            alpha, rgb = tp.nvp.cut(a, key in ('handHostess', 'handMan'))
            sil = alpha > 0.5
            ys, xs = np.where(sil)
            s = f'{n:18s} bbox {xs.min()}-{xs.max()} x {ys.min()}-{ys.max()}  colour {mean_colour(a, sil)}'
            if key in ('bowl', 'lid'):
                (cx, cy, rx, ry), rms = fit_top_ellipse(sil)
                s += f'  ellipse cx {cx:.0f} cy {cy:.0f} rx {rx:.0f} ry {ry:.0f} ratio {ry / rx:.2f} rms {rms:.1f}  bottom {ys.max() + 1}  front of the ellipse {cy + ry:.0f}'
            elif key.startswith('hand'):
                tx, ty = lowest(sil)
                s += f'  tip ({tx:.0f}, {ty:.0f})'
                if key == 'handMan':
                    bx = box_of(a, alpha); by, bxs = np.where(bx)
                    s += f'  box {bxs.min()}-{bxs.max()} x {by.min()}-{by.max()}'
            else:
                bx, by = bottom_middle(sil)
                s += f'  bottom middle ({bx:.0f}, {by:.0f})'
            print(s)


# ------------------------------------------------------------------ the pieces
def r1(v):
    return round(float(v), 1)


def to_layer(p, layer):
    """a point (x, y) of the 1344x768 picture in the px of its layer"""
    return [r1(p[0] - layer['ox']), r1(p[1] - layer['oy'])]


def cut_edge(layer, side):
    """where the sleeve leaves the picture: the layer's own edge (the arm is cut off by the picture's) and the rows of the sleeve on it: the code slides the piece in from that side and keeps the edge off screen"""
    im = np.array(Image.open(os.path.join(OUT, os.path.basename(layer['file']))).convert('RGBA'))
    col = im[:, -1 if side == 'right' else 0, 3] > 128
    ys = np.where(col)[0]
    return [layer['w'] if side == 'right' else 0, int(ys.min()), int(ys.max() + 1)]


def finger_width(piece, up=35):
    """the width of the pressing finger `up` px above its tip, in px of the piece (to bring two hands to one scale if wanted)"""
    al = np.array(Image.open(os.path.join(OUT, os.path.basename(piece['file']))).convert('RGBA'))[..., 3] > 128
    tx, ty = piece['tip']
    row = al[int(ty - up)]
    near = np.where(row[max(int(tx) - 40, 0):int(tx) + 41])[0] + max(int(tx) - 40, 0)
    x = int(near[np.argmin(np.abs(near - tx))])
    x0 = x1 = x
    while x0 > 0 and row[x0 - 1]: x0 -= 1
    while x1 < len(row) - 1 and row[x1 + 1]: x1 += 1
    return int(x1 - x0 + 1)


def props():
    out = {}
    # ---- the bowl: the far edge of its rim is an ellipse; `rim` = [cx, cy, rx, ry] of it, `rimFront` its lowest point, `pivot` the middle of the bottom of the foot, `width` the lip's widest
    out['bowl'], al = tp.prop('bowl', PICKS['bowl'])
    sil = al > 0.5
    (cx, cy, rx, ry), rms = fit_top_ellipse(sil)
    xs = np.where(sil.any(axis=0))[0]
    bowl_w = xs.max() + 1 - xs.min()
    out['bowl'].update(rim=[r1(v) for v in to_layer((cx, cy), out['bowl']) + [rx, ry]], rimFront=r1(cy + ry - out['bowl']['oy']), pivot=to_layer(lowest(sil), out['bowl']), width=int(bowl_w))
    # ---- the lid, cut and then resampled so that it sits on that bowl at scale 1: its widest is the lip's widest, its top ellipse has the bowl's rim's proportions
    out['lid'], al = tp.prop('lid', PICKS['lid'])
    sil = al > 0.5
    (lcx, lcy, lrx, lry), _ = fit_top_ellipse(sil)
    xs = np.where(sil.any(axis=0))[0]
    sx = bowl_w / (xs.max() + 1 - xs.min())
    sy = sx * (ry / rx) / (lry / lrx)
    f = os.path.join(OUT, 'tup-lid.png')
    im = Image.open(f).convert('RGBa')
    w, h = max(1, round(im.size[0] * sx)), max(1, round(im.size[1] * sy))
    im.resize((w, h), Image.LANCZOS).convert('RGBA').save(f, optimize=True)
    al2 = np.array(Image.open(f))[..., 3] > 128
    (lcx, lcy, lrx, lry), _ = fit_top_ellipse(al2)
    lid_bottom = float(np.where(al2.any(axis=1))[0].max() + 1)
    seat = [r1(out['bowl']['rim'][0] - lcx), r1(out['bowl']['rim'][1] - lcy)]
    out['lid'] = dict(file='sp/tup-lid.png', w=w, h=h, centre=[r1(lcx), r1(lcy)], rx=r1(lrx), ry=r1(lry), bottom=r1(lid_bottom), seat=seat, resampled=[round(float(sx), 3), round(float(sy), 3)],
                      pressEdge=[r1(lcx + 0.85 * lrx), r1(lcy + 0.3 * lry)], pressMiddle=[r1(lcx), r1(lcy)])
    # ---- the hands: `tip` is the fingertip (the lowest point), `side` the side the sleeve comes in from and `cut` the edge it is cut off by: [x, y0, y1]
    for key, side in (('handShopper', 'right'), ('handHostess', 'left'), ('handMan', 'left')):
        pic = PICKS[key]
        a = load6(pic)
        out[key], al = tp.prop(key, pic)
        sil = al > 0.5
        out[key].update(side=side, cut=cut_edge(out[key], side))
        if key != 'handMan':
            out[key]['tip'] = to_layer(lowest(sil), out[key])
            out[key]['fingerW'] = finger_width(out[key])
        else:
            # the man's hand holds out the box: `box` is its bounding box (the bow's top to the lowest corner), `boxBottom` the middle of its bottom edge, `grip` the middle of where the skin touches the box
            bx = box_of(a, al)
            ys, xs = np.where(bx)
            touch = ndi.binary_dilation(bx, structure=K3, iterations=3) & skin_of(a) & (al > 0.5)
            ty, tx = np.where(touch)
            out[key].update(box=[int(xs.min() - out[key]['ox']), int(ys.min() - out[key]['oy']), int(xs.max() + 1 - out[key]['ox']), int(ys.max() + 1 - out[key]['oy'])],
                            boxBottom=to_layer(bottom_middle(bx), out[key]), grip=to_layer((tx.mean(), ty.mean()), out[key]))
    # ---- the gift box alone: `pivot` is the middle of its bottom edge; `scaleInHand` is the factor that makes it as big as the box in the man's hand (their bottom middles then coincide)
    out['giftBox'], al = tp.prop('giftBox', PICKS['giftBox'], holes=pp.enclosed_whites(load6(PICKS['giftBox']), 300))
    sil = al > 0.5
    ys, xs = np.where(sil)
    out['giftBox'].update(pivot=to_layer(bottom_middle(sil), out['giftBox']), box=[int(xs.min() - out['giftBox']['ox']), int(ys.min() - out['giftBox']['oy']), int(xs.max() + 1 - out['giftBox']['ox']), int(ys.max() + 1 - out['giftBox']['oy'])])
    hb, gb = out['handMan']['box'], out['giftBox']['box']
    out['giftBox']['scaleInHand'] = r1(np.sqrt((hb[2] - hb[0]) / (gb[2] - gb[0]) * (hb[3] - hb[1]) / (gb[3] - gb[1])) * 1000) / 1000
    return out


# ------------------------------------------------------------------ the sheets
def piece_of(piece):
    return Image.open(os.path.join(OUT, os.path.basename(piece['file']))).convert('RGBA')


def tile_of(piece):
    im = piece_of(piece)
    bg = Image.new('RGBA', (im.size[0] + 20, im.size[1] + 20), (255, 0, 255, 255)); bg.alpha_composite(im, (10, 10))
    return bg


def cross(d, x, y, col, r=12, w=3):
    d.line([x - r, y, x + r, y], fill=col, width=w); d.line([x, y - r, x, y + r], fill=col, width=w)


def debug_pieces(P):
    tiles = []
    Y, C, G, O, R = (255, 255, 0, 255), (0, 255, 255, 255), (0, 255, 0, 255), (255, 150, 0, 255), (255, 0, 0, 255)
    for key in ('bowl', 'lid', 'handShopper', 'handHostess', 'handMan', 'giftBox'):
        p = P[key]
        bg = tile_of(p); d = ImageDraw.Draw(bg)
        if key == 'bowl':
            cx, cy, rx, ry = p['rim']; d.ellipse([cx + 10 - rx, cy + 10 - ry, cx + 10 + rx, cy + 10 + ry], outline=G, width=3); cross(d, cx + 10, cy + 10, Y)
            d.line([0, p['rimFront'] + 10, bg.size[0], p['rimFront'] + 10], fill=O, width=3); cross(d, p['pivot'][0] + 10, p['pivot'][1] + 10, C)
        elif key == 'lid':
            cx, cy = p['centre']; d.ellipse([cx + 10 - p['rx'], cy + 10 - p['ry'], cx + 10 + p['rx'], cy + 10 + p['ry']], outline=G, width=3); cross(d, cx + 10, cy + 10, Y)
            d.line([0, p['bottom'] + 10, bg.size[0], p['bottom'] + 10], fill=O, width=3)
        elif key == 'giftBox':
            cross(d, p['pivot'][0] + 10, p['pivot'][1] + 10, Y); x0, y0, x1, y1 = p['box']; d.rectangle([x0 + 10, y0 + 10, x1 + 10, y1 + 10], outline=G, width=3)
        else:
            x, y0, y1 = p['cut']; d.line([x + 10, y0 + 10, x + 10, y1 + 10], fill=R, width=6)
            if 'tip' in p: cross(d, p['tip'][0] + 10, p['tip'][1] + 10, C, 16, 4)
            else:
                x0, y0, x1, y1 = p['box']; d.rectangle([x0 + 10, y0 + 10, x1 + 10, y1 + 10], outline=G, width=3)
                cross(d, p['grip'][0] + 10, p['grip'][1] + 10, C, 16, 4); cross(d, p['boxBottom'][0] + 10, p['boxBottom'][1] + 10, Y, 16, 4)
        tiles.append((key + ('  (the anchors)'), bg))
    # the check: the lid on the bowl, the shopper's finger on the lid's edge, the hostess's on its middle, the box alone beside the man's hand at the size and place of the box in it
    B, L = P['bowl'], P['lid']
    MAG = (255, 0, 255, 255)

    def trim(im, m=24):
        a = np.array(im.convert('RGB')).astype(int)
        ys, xs = np.where(np.abs(a - np.array(MAG[:3])).sum(axis=2) > 30)
        return im.crop((max(xs.min() - m, 0), max(ys.min() - m, 0), min(xs.max() + m, im.size[0]), min(ys.max() + m, im.size[1])))

    for title, who in (('lid on the bowl, the shopper presses its edge', 'handShopper'), ('lid on the bowl, the hostess presses its middle', 'handHostess')):
        ox, oy = 900, 400
        bg = Image.new('RGBA', (B['w'] + 1900, B['h'] + 900), MAG)
        bg.alpha_composite(piece_of(B), (ox, oy))
        bg.alpha_composite(piece_of(L), (ox + int(round(L['seat'][0])), oy + int(round(L['seat'][1]))))
        press = L['pressEdge'] if who == 'handShopper' else L['pressMiddle']  # (the shopper's finger is on the edge of the lid, the hostess's on its middle)
        target = (ox + L['seat'][0] + press[0], oy + L['seat'][1] + press[1])
        tip = P[who]['tip']
        bg.alpha_composite(piece_of(P[who]), (int(round(target[0] - tip[0])), int(round(target[1] - tip[1]))))
        tiles.append((title, trim(bg)))
    h, g = P['handMan'], P['giftBox']
    k = g['scaleInHand']
    gi = piece_of(g); gi = gi.convert('RGBa').resize((int(gi.size[0] * k), int(gi.size[1] * k)), Image.LANCZOS).convert('RGBA')
    bg = Image.new('RGBA', (tile_of(h).size[0] + 700, tile_of(h).size[1]), MAG); bg.alpha_composite(piece_of(h), (10, 10))
    bg.alpha_composite(gi, (int(h['boxBottom'][0] + 10 + 420 - g['pivot'][0] * k), int(h['boxBottom'][1] + 10 - g['pivot'][1] * k)))
    tiles.append(('the box alone beside the hand, at the size and place of the box in it', bg))
    cols = 3
    sc = [min(1.0, 640 / t[1].size[0]) for t in tiles]
    ims = [(n, im.convert('RGB').resize((int(im.size[0] * s), int(im.size[1] * s)), Image.LANCZOS)) for (n, im), s in zip(tiles, sc)]
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    heights = [max(i.size[1] for _, i in r) + 26 for r in rows]
    sheet = Image.new('RGB', (cols * 648 + 8, sum(heights) + 8), (24, 24, 28)); d = ImageDraw.Draw(sheet)
    y = 8
    for r, hh in zip(rows, heights):
        for c, (n, im) in enumerate(r):
            sheet.paste(im, (8 + c * 648, y + 22)); d.text((12 + c * 648, y + 5), n, fill=(255, 255, 255))
        y += hh
    sheet.save(os.path.join(DBG, 'pieces.jpg'), quality=90)


def candidates_sheet():
    W, TH = 330, 188
    rows = list(CANDIDATES.items())
    sheet = Image.new('RGB', (4 * (W + 6) + 6, len(rows) * (TH + 28) + 6), (24, 24, 28)); d = ImageDraw.Draw(sheet)
    for r, (key, names) in enumerate(rows):
        for c, n in enumerate(names):
            x, y = 6 + c * (W + 6), 6 + r * (TH + 28)
            im = Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((W, TH), Image.LANCZOS)
            pick = PICKS[key] == n
            if pick:
                d.rectangle([x - 3, y + 21, x + W + 2, y + 24 + TH], fill=(0, 200, 90))
            sheet.paste(im, (x, y + 24)); d.text((x + 3, y + 5), n + ('   << PICK' if pick else ''), fill=(120, 255, 160) if pick else (255, 255, 255))
    sheet.save(os.path.join(DBG, 'candidates.jpg'), quality=90)


if __name__ == '__main__':
    if sys.argv[1:] == ['analyze']:
        analyze(); sys.exit()
    P = props()
    debug_pieces(P)
    candidates_sheet()
    doc = ('Pieces of "I\'m Just Supporting a Friend" (scripts/tup-prep.py). Every number is in px of the piece\'s own png (x right, y down); ox, oy = where the piece\'s top left was in its 1344x768 picture. '
           'bowl: rim = [cx, cy, rx, ry] of the ellipse of its far rim (the lip), rimFront = the y of that ellipse\'s lowest point, pivot = the middle of the foot, width = the lip\'s widest. '
           'lid: already resampled to sit on the bowl at scale 1 (resampled = the factors); centre, rx, ry = its top ellipse, bottom = its lowest edge, seat = where the lid png\'s top left goes in the bowl png\'s px so that the lid sits on the bowl '
           '(the two top ellipses coincide; the lid\'s skirt then covers the lip), pressEdge = where the shopper\'s fingertip lands (on the lid, near its right edge), pressMiddle = where the hostess\'s does (on the dimple). '
           'handShopper, handHostess: tip = the fingertip, fingerW = the finger\'s width 35 px above it (the two hands are drawn at one scale), side = where the sleeve comes in from, cut = [x, y0, y1] the edge it is cut off by (keep it off screen). '
           'handMan: box = the box\'s bounding box, boxBottom = the middle of its bottom edge, grip = where the skin touches it, cut as above. giftBox: pivot = the middle of its bottom edge, box = its bounding box, '
           'scaleInHand = the scale that makes it the box in the man\'s hand (put its pivot on handMan.boxBottom).')
    json.dump({'doc': doc, 'src': [1344, 768], 'picks': PICKS, 'props': P}, open(os.path.join(ROOT, 'src', 'tup-props.json'), 'w'), indent=1)
    print('wrote the pieces')
