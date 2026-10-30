# Prep for "I'm Just Not a Sales Person" (docs/x04-sell-me-this-pen.md): cuts the Qwen pictures of out/sp-cast5 (scripts/pen-art-gen.py; the masters of Denise and Rhonda are in out/sp-cast3 and
# out/sp-cast4) into puppet parts, props and plates the way scripts/because-prep.py does for "Because" (this script reuses tip-prep.py's puppet(), prop() and finders with its own source
# folders, debug folder and file prefix), and measures what the code needs.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/pen-prep.py
# Writes public/sp/pen-*.png|jpg, src/pen-rig.json (px of the 768x1344 pictures, y down) and scratch/pen-prep/* (debug sheets).
# Every character with poses has ONE head, the master's (tip-prep.py); the others are puppets with one body picture each.
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('tp', os.path.join(HERE, 'tip-prep.py'))
tp = importlib.util.module_from_spec(spec); spec.loader.exec_module(tp)
spp, nvp, fxp = tp.spp, tp.nvp, tp.fxp
ROOT, OUT, K3 = tp.ROOT, tp.OUT, tp.K3
SRCS = [os.path.join(ROOT, 'out', d) for d in ('sp-cast5', 'sp-cast4', 'sp-cast3')]  # the new pictures first, then the masters of Rhonda (cast4) and Denise (cast3)
DBG = os.path.join(ROOT, 'scratch', 'pen-prep')
os.makedirs(DBG, exist_ok=True)


CUP = (134, 526, 252, 640)  # the box of Rhonda's master picture where her coffee cup hides some of her curls (the cup's lower part and her hand are below it)


def no_cup(a):
    """Rhonda's master holds a coffee cup and no pose does: the box CUP is painted with the curls of her other side (mirrored about the middle of her head, x 383.25), with white where the other side has
    no curl. The light comes from one side, so the mirrored curls take the colour of the curls round the box (their blurred colour is swapped for the surround's, spread inwards), and they are feathered in"""
    x0, y0, x1, y1 = CUP
    m = a[y0:y1][:, np.round(766.5 - np.arange(x0, x1)).astype(int)]
    hair = (m[..., 0] - m[..., 1] > 70) & (m[..., 0] > 90)
    red = (a[..., 0] - a[..., 1] > 70) & (a[..., 0] > 90)
    known = red.astype(np.float32); known[y0:y1, x0:x1] = 0
    spread = lambda img, w: ndi.gaussian_filter(img * w, 16) / np.maximum(ndi.gaussian_filter(w, 16), 1e-4)
    here = np.stack([spread(a[..., c], known) for c in range(3)], axis=-1)[y0:y1, x0:x1]
    there = np.stack([spread(m[..., c], hair.astype(np.float32)) for c in range(3)], axis=-1)
    yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0]
    w = np.clip(np.minimum(np.minimum(yy, xx), x1 - x0 - 1 - xx) / 10.0, 0, 1)[..., None]
    out = a.copy()
    edge = ndi.binary_dilation(hair) & ~hair & ~((m[..., 2] > m[..., 1] + 30) & (m[..., 0] < 160))  # (the soft pixels along a curl's outline keep their colour; the jacket's purple does not)
    out[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - w) + np.where(hair[..., None], np.clip(m + here - there, 0, 255), np.where(edge[..., None], m, 253.0)) * w
    return out


def load5(name):
    for d in SRCS:
        f = os.path.join(d, name + '.png')
        if os.path.exists(f):
            a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
            return no_cup(a) if name == 'rhonda-71' else a
    raise FileNotFoundError(name)


tp.DBG, tp.PFX, tp.load3 = DBG, 'pen', load5


face_of0 = tp.face_of


def face_of(a):
    """tip-prep's face_of; when the frames of a pair of glasses are too thick for it to close over (guest2's cat-eye frames reach out past her cheeks), the two lenses are taken into the face"""
    blob, skin, (L, R), disc = face_of0(a)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    for e in (L, R):
        if not blob[int(e['cy']), int(e['cx'])]: blob = blob | (((xx - e['cx']) / e['rx']) ** 2 + ((yy - e['cy']) / e['ry']) ** 2 <= 1)
    return blob, skin, (L, R), disc


tp.face_of = face_of


def chair_inside(a, disc):
    """the white seen through a lawn chair, which its tubes and straps shut in so that the flood fill cannot reach it: the big near-white areas well below the head (the eye whites are above), and the gaps between the green straps
    of the seat and the back (a picture with no green straps has no chair; the white sneakers are small areas shut in by their own outlines)"""
    H, W, _ = a.shape
    out = np.zeros((H, W), bool)
    green = (a[..., 1] - a[..., 0] > 25) & (a[..., 1] - a[..., 2] > 15)
    if green[800:].sum() < 3000: return out
    lab, _ = ndi.label(a.min(axis=2) >= 240)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        y0, y1, x0, x1 = max(sl[0].start - 3, 0), sl[0].stop + 3, max(sl[1].start - 3, 0), sl[1].stop + 3
        m = ndi.binary_opening(lab[y0:y1, x0:x1] == i, iterations=3)  # (opened: a sneaker's thin pale outline must not let the area leak into the shoe)
        if m.sum() < 80: continue
        ring = ndi.binary_dilation(m, iterations=3) & ~m
        if (sl[0].start > disc[1] + disc[2] + 60 and m.sum() >= 3500) or green[y0:y1, x0:x1][ring].mean() > 0.3: out[y0:y1, x0:x1] |= m
    return out


def no_hoops(a, disc):
    """Rhonda's gold hoops are in her head (the master's): the ones in a pose's picture are painted over with what is round them"""
    return spp.inpaint(a, tp.gold_hoops(a, disc))


def bleach_fringe(a, disc):
    """the pale pixels along the outline of Rhonda's curls (the paper shows through the thin ink lines) are made white, so that the cut takes them for background and no white specks hang on the hair"""
    red = (a[..., 0] - a[..., 1] > 70) & (a[..., 0] > 90)
    pale = (a.min(axis=2) >= 172) & (a[..., 0] - a[..., 2] < 60) & ndi.binary_dilation(red, structure=K3, iterations=5)
    out = a.copy()
    out[pale] = 255.0
    return out


def curl_pockets(a, disc):
    """the white of the background seen between Rhonda's outer curls: near-white pixels outside her face and above her chin, and a little lower beside her shoulders (not the beer cans)"""
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = disc
    outside = ((xx - cx) ** 2 + (yy - cy) ** 2) > (r * 1.03) ** 2
    return (a.min(axis=2) >= 228) & outside & ((yy < cy + r) | ((yy < cy + r + 70) & (np.abs(xx - cx) > 1.1 * r)))


def pony(a, disc):
    """guest3's ponytail and its red bow: the black hair and the red ribbon on the left of her face, from just above the bow down"""
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = disc
    return ((a.max(axis=2) < 90) | ((a[..., 0] > 120) & (a[..., 1] < 70) & (a[..., 2] < 90))) & (xx < cx - 0.55 * r) & (yy > cy + 0.1 * r)


CAST = {
    # Denise: Tip's hoodie head (the same cut as deniseHood), in a lawn chair with the phone or with a beer and the bowl of chips, and in the blazer over the hoodie (the resume, hands in the pockets, a fist up).
    # The blazer heads are 7-12 % smaller than the master's: register() scales each pose picture up until its head disc is the master's
    'denisePen': dict(master='denise-neutral-61', poses={'chairPhone': 'denise-chair-phone-61', 'chairBeer': 'denise-chair-beer-61', 'blazer': 'denise-blazer-61', 'blazerPat': 'denise-blazer-pat-61', 'blazerFist': 'denise-blazer-fist-61'},
                      mouth=(350, 560, 435, 580, 190), mouthW=68, code_brows=True, hair='dark', pockets=[chair_inside], specks=250, nearest=30, pinholes=14,
                      pose_holes={'chairPhone': [(188, 936, 214, 984)], 'chairBeer': [(350, 1190, 412, 1255)], 'blazerPat': [(193, 765, 232, 845), (526, 770, 562, 840)]}),
    # Rhonda: all the huge red curls (and her hoops) are in the head, painted over her master's coffee cup (no_cup: no pose holds it); a pose's body keeps its own curls that hang below the face (hair_body)
    'rhondaPen': dict(master='rhonda-71', poses={'chair': 'rhonda-chair-beer-71', 'beers': 'rhonda-beers-71'}, mouth=(340, 478, 430, 495, 190), mouthW=60, hair='red', pockets=[curl_pockets, chair_inside], fleck_x=3.4, fleck_min=172, fleck_y=700, specks=400, pinholes=14, hair_body=0.2, repaint=[no_hoops, bleach_fringe], oval=True, pose_holes={'chair': [(196, 580, 222, 612)]}),
    # (`oval`: a head that is not round: the body behind the chin is filled where the face was, not in the disc of the fitted circle, and eyes outside that circle are not background)
    'brandon': dict(master='brandon-72', poses={'stand': 'brandon-72', 'point': 'brandon-point-72', 'reader': 'brandon-reader-72', 'rip': 'brandon-rip-72'}, mouth=(325, 440, 455, 490, 190), mouthW=100, hair='black', oval=True, fleck_x=0, specks=300, thin=2, pose_holes={'point': [(544, 678, 592, 782)]}),
    'clerk': dict(master='clerk-72', poses={'stand': 'clerk-72', 'bowl': 'clerk-bowl-72'}, mouth=(345, 485, 425, 510, 190), mouthW=70, hair=('dark', 'black'), oval=True, specks=300, pinholes=14),
    'hostess': dict(master='hostess-71', poses={'stand': 'hostess-71', 'bowl': 'hostess-bowl-71', 'box': 'hostess-box-71'}, mouth=(345, 380, 420, 405, 190), mouthW=62, hair='dark', oval=True, protect=True, fleck_y=500, fleck_xmin=0.9, fleck_poses=True, specks=300,
                     # (the white wedges between the jaw and the collar are pockets that the outlines shut in: `master_holes` for the master's own picture, `pose_holes` for the others; and the gaps between an arm and the waist)
                     master_holes=[(322, 424, 345, 443), (420, 423, 448, 443)],
                     pose_holes={'stand': [(288, 598, 316, 702), (446, 598, 478, 702)], 'bowl': [(450, 610, 484, 728), (268, 592, 290, 614), (326, 425, 349, 446), (419, 424, 441, 447)],
                                 'box': [(286, 598, 314, 636), (450, 596, 484, 638), (324, 426, 347, 446), (414, 427, 440, 449)]}),
    'guest1': dict(master='guest1-71', mouth=(350, 466, 430, 494, 190), mouthW=68, oval=True),
    'guest2': dict(master='guest2-71', mouth=(350, 462, 420, 485, 190), mouthW=58, oval=True),
    'guest3': dict(master='guest3-71', mouth=(345, 438, 415, 462, 190), mouthW=56, oval=True, pinholes=14, tail=pony, holes=[(294, 486, 330, 515), (254, 740, 278, 774)]),
}

PLATES = dict(garage='bg-garage-72', office='bg-office-71', officeBack='bg-office-back-71', store='bg-store1949-71', living='bg-living1950-71', hall='bg-hall1950-71')

# numbers read off the plates (scratch/pen-prep/g-*.png: zooms with a grid; the edges settled with luminance profiles across them; scratch/pen-prep/scenes-sheet.jpg draws them over the plates).
# A bare number is a y (a horizontal line), [y0, y1] a band of rows, [x0, y0, x1, y1] a box, [cx, cy, r] a circle; all in px of the 768x1344 plate.
SCENES = {
    # the garage at night: `top` is where the wall ends under the dark ceiling, `floor` the baseboard line where the floor begins; `frame` is the side door's casing and `door` its opening (Rhonda stops in it);
    # `bulb` is the glass at the end of its cord; `wall` is the bare wall between the shelf and the door (the yacht poster, the stacks of boxes); the pegboard, the mini fridge and the shelf unit are at its left
    'garage': dict(top=406, floor=977, frame=[558, 540, 753, 977], door=[575, 559, 737, 977], bulb=[383, 147, 24], wall=[310, 410, 552, 975], pegboard=[3, 580, 116, 756], fridge=[13, 794, 145, 998], shelf=[157, 780, 303, 995]),
    # Brandon's side of the office: the white desk (`deskTop` its far edge, where the foreground strip starts; `deskFront` the near edge of its top; `front` the rows of the panel under the top; `feet` where it
    # stands on the floor), the baseboard's bottom line `floor`, the bare `wall` behind him (the poster), the window with its blinds and the plant at the sides
    'office': dict(deskTop=1022, deskFront=1066, front=[1080, 1289], feet=1324, floor=1188, wall=[150, 0, 556, 1000], window=[0, 155, 137, 770], plant=[565, 653, 768, 1010]),
    # Denise's side: the wall with the frosted-glass door (`frame` its casing, `door` the opening, `glass` the pane) and the line where the carpet begins
    'officeBack': dict(floor=1111, frame=[224, 283, 523, 1111], door=[243, 303, 504, 1111], glass=[273, 341, 475, 1049]),
    # the 1949 store: the counter's far edge `counterTop` (the wall ends there), the lip of its top, the front panel, the dark base, the floor; `piles` is the box round the seven stacks of bowls (they stand on the
    # counter, their bottoms on y 724: the foreground strip starts under them, and `pileStore` below cuts the stacks out as a sprite that goes over the clerk)
    'store': dict(counterTop=713, lip=[755, 772], front=[773, 1062], base=[1063, 1100], floor=1101, piles=[104, 527, 738, 724]),
    # the 1950 living room: the sofa (its whole box, the back's face, the seat's top and the front of its cushion; `armTop` the top of its rolled arms; the foreground strip starts at the cushion's front edge),
    # the coffee table's top and the line where its legs stand, the floor
    'living': dict(floor=760, sofa=[52, 547, 738, 772], back=[126, 547, 664, 666], seat=[102, 667, 686, 692], front=[102, 693, 686, 724], armTop=627, table=[225, 772, 563, 810], tableFeet=918),
    # the 1950 hall: the dark wainscot's cap, the floor, the office door's casing and its leaf
    'hall': dict(wainscot=723, floor=1115, frame=[204, 255, 558, 1115], door=[244, 293, 519, 1114]),
}
BOX_FACE = [71, 549, 707, 1097]    # the front face of box-71 (the top flaps are above it, the tape runs down it to y 658), px of the picture
PALLET_DECK = [30, 441, 741, 691]  # the top of pallet-72's boards, from the far board's far edge to the near board's near edge


def enclosed_whites(a, min_area=2000):
    """boxes round the near-white areas that a prop's outline shuts in (the floor seen through a pallet), for prop()'s `holes`"""
    lab, n = ndi.label(a.min(axis=2) >= 238)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == a.shape[0] or sl[1].stop == a.shape[1]: continue
        if (lab[sl] == i).sum() >= min_area: out.append((sl[1].start - 1, sl[0].start - 1, sl[1].stop + 1, sl[0].stop + 1))
    return out


def pen_shadow(a):
    """the soft grey shadow painted under the pen: per column everything below the pen's own lower edge (the barrel's last near-black row; where there is none, the chrome's last outline row), the edge
    smoothed over the neighbours' median so that the chrome rings, which cover the barrel's edge, do not leave notches"""
    lum = a.mean(axis=2)
    H, W = lum.shape
    bot = np.full(W, np.nan)
    for x in range(W):
        col = lum[600:720, x]
        dark, mid = np.where(col < 60)[0], np.where(col < 150)[0]
        if len(dark) >= 6: bot[x] = 600 + dark.max()
        elif len(mid): bot[x] = 600 + mid.max()
    ok = ~np.isnan(bot)
    bot = np.interp(np.arange(W), np.where(ok)[0], bot[ok])
    bot = ndi.median_filter(bot, size=31, mode='nearest')
    yy = np.arange(H)[:, None]
    return (yy > bot[None, :] + 1) & (yy < 720)


def strip(name, a, y0):
    """the rows of a plate from y0 down, drawn over the puppets that stand behind what the plate paints there (a counter, a desk, a sofa)"""
    return dict(file=tp.save_png(name, Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[y0:].astype(np.uint8), 'RGBA')), y0=y0)


def pile(a, box, skip):
    """the stacks of bowls on the counter as a sprite of their own (the clerk stands behind them, between the stacks and the wall): everything inside `box` that is light (the dark hutch shows between the
    stacks), as the seven big pieces left after closing the stacks' ink lines and cutting the thin bridges to the hutch's pale bits; `skip` boxes are pale things that touch a stack (a jar)"""
    x0, y0, x1, y1 = box
    H, W, _ = a.shape
    inside = np.zeros((H, W), bool); inside[y0:y1, x0:x1] = True
    for sx0, sy0, sx1, sy1 in skip: inside[sy0:sy1, sx0:sx1] = False
    wall = np.abs(a - np.array([246., 228., 179.])).max(axis=2) <= 36  # (the cream of the wall shows beside the first and the last stack)
    pale = (a.max(axis=2) >= 135) & ~wall & inside
    solid = ndi.binary_opening(ndi.binary_fill_holes(ndi.binary_closing(pale, structure=K3, iterations=1)), structure=K3, iterations=2)
    lab, n = ndi.label(solid)
    big = np.isin(lab, [i + 1 for i, v in enumerate(ndi.sum(solid, lab, range(1, n + 1))) if v > 4000])
    alpha = np.clip(ndi.gaussian_filter((ndi.binary_dilation(big, structure=K3, iterations=2) & inside & ~wall).astype(np.float32), 0.7) * 1.15, 0, 1)
    im, off = fxp.layer(a, alpha, 2)
    return dict(file=tp.save_png('pile', im), x0=off[0], y0=off[1], w=im.size[0], h=im.size[1])


def leaf(name, a, box):
    """a door's leaf as a sprite of its own (the plate's pixels inside the opening), to swing over a dark doorway"""
    x0, y0, x1, y1 = box
    return dict(file=tp.save_png(name, Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8), 'RGB').convert('RGBA')), x0=x0, y0=y0, w=x1 - x0, h=y1 - y0)


def props_and_plates():
    out = {}
    # ---- the plates as painted
    for key, pic in PLATES.items():
        Image.fromarray(load5(pic).astype(np.uint8)).save(os.path.join(OUT, f'pen-bg-{key}.jpg'), quality=95)
        SCENES[key]['file'] = f'sp/pen-bg-{key}.jpg'
    # ---- the foreground strips (the clerk stands behind the counter, Brandon behind the desk, the guests behind the sofa's cushion), the bowl stacks as a sprite of their own that goes over the clerk, and the
    # two doors' leaves
    out['stripStore'] = strip('fg-store', load5(PLATES['store']), SCENES['store']['piles'][3] + 1)
    out['pileStore'] = pile(load5(PLATES['store']), [101, 515, 742, SCENES['store']['piles'][3] + 1], [(385, 538, 432, 558)])
    out['stripDesk'] = strip('fg-desk', load5(PLATES['office']), SCENES['office']['deskTop'])
    out['stripSofa'] = strip('fg-sofa', load5(PLATES['living']), SCENES['living']['front'][1])
    out['doorGarage'] = leaf('door-garage', load5(PLATES['garage']), SCENES['garage']['door'])
    out['doorHall'] = leaf('door-hall', load5(PLATES['hall']), SCENES['hall']['door'])
    # ---- the props, cut like the cast (flood fill of the white); the numbers are in layer px. The pen turns about its middle (`pivot`) while it falls; `tip` writes and `end` is the clicker.
    # The box and the pallet land on `pivot` (the middle of their bottom edge); `face` is the box's front (the label goes there), `deck` the top of the pallet's boards
    out['pen'], al = tp.prop('pen', 'pen-71', drop=pen_shadow)
    ys, xs = np.where(al > 0.5)
    ox, oy = out['pen']['ox'], out['pen']['oy']
    out['pen'].update(pivot=[round(float(xs.mean()) - ox, 1), round(float(ys.mean()) - oy, 1)], tip=[float(xs.max() + 1 - ox), round(float(ys[xs >= xs.max() - 2].mean()) - oy, 1)], end=[float(xs.min() - ox), round(float(ys[xs <= xs.min() + 2].mean()) - oy, 1)])
    out['box'], al = tp.prop('box', 'box-71')
    ox, oy = out['box']['ox'], out['box']['oy']
    ys, xs = np.where(al > 0.5)
    out['box'].update(pivot=[round(float(xs.min() + xs.max() + 1) / 2 - ox, 1), float(ys.max() + 1 - oy)], face=[BOX_FACE[0] - ox, BOX_FACE[1] - oy, BOX_FACE[2] - ox, BOX_FACE[3] - oy])
    out['pallet'], al = tp.prop('pallet', 'pallet-72', holes=enclosed_whites(load5('pallet-72')))
    ox, oy = out['pallet']['ox'], out['pallet']['oy']
    ys, xs = np.where(al > 0.5)
    out['pallet'].update(pivot=[round(float(xs.min() + xs.max() + 1) / 2 - ox, 1), float(ys.max() + 1 - oy)], deck=[PALLET_DECK[0] - ox, PALLET_DECK[1] - oy, PALLET_DECK[2] - ox, PALLET_DECK[3] - oy])
    # ---- the poster is the whole picture, a rectangle: the headline's band at its top and the fine print's at its bottom are the rows where the colour jumps near each end (the words are drawn over them in code)
    a = load5('poster-72')
    H, W, _ = a.shape
    jump = np.abs(np.diff(a.mean(axis=1), axis=0)).sum(axis=1)
    top, bottom = int(np.argmax(jump[20:100])) + 20 + 1, int(np.argmax(jump[H - 100:H - 20])) + H - 100 + 1
    out['poster'] = dict(file=tp.save_png('poster', Image.fromarray(np.dstack([a, np.full((H, W), 255, np.float32)]).astype(np.uint8), 'RGBA')), w=W, h=H, ox=0, oy=0, pivot=[W / 2, H / 2], top=[0, 0, W, top], bottom=[0, bottom, W, H])
    return out


def debug_props(props):
    names = ['pen', 'box', 'pallet', 'poster']
    tiles = []
    for n in names:
        im = Image.open(os.path.join(OUT, f'pen-{n}.png')).convert('RGBA')
        bg = Image.new('RGBA', (im.size[0] + 20, im.size[1] + 20), (255, 0, 255, 255)); bg.alpha_composite(im, (10, 10))
        d = ImageDraw.Draw(bg)
        p = props[n]
        cx, cy = p['pivot']; d.line([cx + 10 - 14, cy + 10, cx + 10 + 14, cy + 10], fill=(255, 255, 0, 255), width=3); d.line([cx + 10, cy + 10 - 14, cx + 10, cy + 10 + 14], fill=(255, 255, 0, 255), width=3)
        for k in ('face', 'deck', 'top', 'bottom'):
            if k in p: x0, y0, x1, y1 = p[k]; d.rectangle([x0 + 10, y0 + 10, x1 + 10, y1 + 10], outline=(0, 255, 0, 255), width=3)
        for k in ('tip', 'end'):
            if k in p: d.ellipse([p[k][0] + 10 - 6, p[k][1] + 10 - 6, p[k][0] + 10 + 6, p[k][1] + 10 + 6], outline=(0, 255, 255, 255), width=3)
        k = 360 / max(bg.size)
        tiles.append((n, bg.convert('RGB').resize((int(bg.size[0] * k), int(bg.size[1] * k)), Image.LANCZOS)))
    sheet = Image.new('RGB', (len(names) * 370, 400), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        sheet.paste(im, (6 + i * 370, 30)); d.text((10 + i * 370, 8), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'props-sheet.jpg'), quality=90)


def draw_numbers(d, v, label, W=768):
    """SCENES numbers over a plate: a y is a line, [y0, y1] a band, [x0, y0, x1, y1] a box, [cx, cy, r] a circle (a dict is drawn entry by entry)"""
    if isinstance(v, dict):
        for k, w in v.items():
            if k != 'file': draw_numbers(d, w, k, W)
    elif isinstance(v, int): d.line([0, v, W, v], fill=(255, 0, 0), width=2); d.text((4, v - 12), label, fill=(255, 255, 0))
    elif len(v) == 2: d.rectangle([0, v[0], W, v[1]], outline=(255, 160, 0), width=2); d.text((4, v[0] - 12), label, fill=(255, 255, 0))
    elif len(v) == 3: d.ellipse([v[0] - v[2], v[1] - v[2], v[0] + v[2], v[1] + v[2]], outline=(0, 255, 255), width=2); d.text((v[0] + v[2] + 3, v[1]), label, fill=(255, 255, 0))
    else: d.rectangle(v, outline=(0, 255, 0), width=2); d.text((v[0] + 3, v[1] + 2), label, fill=(255, 255, 0))


def debug_scenes():
    tiles = []
    for key in PLATES:
        im = Image.open(os.path.join(OUT, f'pen-bg-{key}.jpg')).convert('RGB')
        draw_numbers(ImageDraw.Draw(im), SCENES[key], key)
        tiles.append((key, im.resize((384, 672), Image.LANCZOS)))
    sheet = Image.new('RGB', (3 * 390 + 6, 2 * 700 + 6), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        x, y = 6 + (i % 3) * 390, 6 + (i // 3) * 700
        sheet.paste(im, (x, y + 22)); d.text((x + 3, y + 4), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'scenes-sheet.jpg'), quality=90)


if __name__ == '__main__':
    only = sys.argv[1:]
    rigs = {}
    for key, cfg in CAST.items():
        if only and key not in only: continue
        try:
            rigs[key] = tp.puppet(key, cfg)[0]
        except Exception as e:  # keep going: the debug sheet shows what did work
            print('  FAILED', key, e)
    tp.debug_sheet(rigs)
    extra = {} if only else {'props': props_and_plates(), 'scenes': SCENES}
    if extra: debug_props(extra['props']); debug_scenes()
    json.dump({'src': [768, 1344], **rigs, **extra}, open(os.path.join(ROOT, 'src', 'pen-rig.json' if not only else 'pen-rig-part.json'), 'w'), indent=1)
    print('wrote the puppets, props and plates')
