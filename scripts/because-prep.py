# Prep for "Because" (src/Because.tsx, docs/x03-because.md): cuts the Qwen pictures of out/sp-cast4 (scripts/because-art-gen.py) into puppet parts and props the way
# scripts/tip-prep.py does for "Tip?" (this script reuses its puppet(), prop() and finders with its own source folder and file prefix), and measures what the code needs.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/because-prep.py
# Writes public/sp/because-*.png|jpg, src/because-rig.json (px of the 768x1344 pictures, y down) and scratch/because/* (debug sheets).
# Denise is Tip's hoodie puppet (tip-deniseHood-*, src/tip-rig.json), not made here. The cashier and Rhonda are puppets with ONE body picture each (a hat and a headset go on in code).
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('tp', os.path.join(HERE, 'tip-prep.py'))
tp = importlib.util.module_from_spec(spec); spec.loader.exec_module(tp)
spp, nvp, fxp = tp.spp, tp.nvp, tp.fxp
ROOT, OUT = tp.ROOT, tp.OUT
SRC4 = os.path.join(ROOT, 'out', 'sp-cast4')
DBG = os.path.join(ROOT, 'scratch', 'because')
os.makedirs(DBG, exist_ok=True)
tp.SRC3, tp.DBG, tp.PFX = SRC4, DBG, 'because'
load4 = tp.load3

CUP = (140, 535, 260, 700)  # Rhonda's coffee cup in her picture: it belongs to her body, and its white lid is put back after the cut


def curl_pockets(a, disc):
    """the white of the background seen between Rhonda's outer curls: everything near-white outside her face, outside her cup (CUP) and above her cardigan's hem"""
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = CUP
    return (a.min(axis=2) >= 228) & (((xx - disc[0]) ** 2 + (yy - disc[1]) ** 2) > (disc[2] * 1.03) ** 2) & (yy < 640) & ~((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1))


CAST = {
    # the cashier: seed 72 (the head of seed 71 was 30 % smaller than the cast's); no hat and no headset in the picture, both go on in code
    'cashier': dict(master='cashier-72', mouth=(340, 488, 430, 508, 190), mouthW=72, fill_pad=-9),
    # Rhonda: the huge red hair is part of the head sprite (the part above the neck cut); what hangs below it belongs to the body
    'rhonda': dict(master='rhonda-71', mouth=(340, 478, 430, 495, 190), mouthW=60, pockets=[lambda a, disc: curl_pockets(a, disc)], fleck_x=3.4, fleck_min=172, fleck_y=640, apart=[CUP], protect_boxes=[CUP]),
}

# numbers read off the pictures (scratch/because/g-*.png: zooms with a grid)
SCENES = {
    # plate A, the counter from the dining room: the board's frame and its dark inside, the counter's top edge, its front panel, the floor, the swing door
    'counter': dict(board=[35, 100, 735, 475], boardIn=[60, 125, 710, 450], counterTop=800, front=[840, 1065], floor=1100, door=[503, 526, 703, 800]),
    # plate B, the same counter from behind: the counter's far edge (what stands beyond it is hidden below), the top of its front panel, the base, the floor
    'back': dict(far=722, panel=[812, 1000], base=1035),
}


def props_and_plates():
    out = {}
    # ---- plate A: as painted; its counter (the top edge down) is a foreground strip, the door is a sprite of its own over a dark doorway
    a = load4('bg-counter-71')
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(OUT, 'because-bg-counter.jpg'), quality=95)
    y0 = SCENES['counter']['counterTop']
    out['stripCounter'] = dict(file=tp.save_png('fg-counter', Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.float32)])[y0:].astype(np.uint8), 'RGBA')), y0=y0)
    dx0, dy0, dx1, dy1 = SCENES['counter']['door']
    out['door'] = dict(file=tp.save_png('door', Image.fromarray(a[dy0:dy1, dx0:dx1].astype(np.uint8), 'RGB').convert('RGBA')), x0=dx0, y0=dy0, w=dx1 - dx0, h=dy1 - dy0)
    # ---- plate B: the little framed notice on the left wall is painted with scribbles for text; it is covered with the colour of the wall under it
    b = load4('bg-counter-back-73')
    wall = np.median(b[420:520, 0:60].reshape(-1, 3), axis=0)
    b[168:402, 0:62] = wall
    Image.fromarray(b.astype(np.uint8)).save(os.path.join(OUT, 'because-bg-back.jpg'), quality=95)
    y0 = SCENES['back']['far']
    out['stripBack'] = dict(file=tp.save_png('fg-back', Image.fromarray(np.dstack([b, np.full(b.shape[:2], 255, np.float32)])[y0:].astype(np.uint8), 'RGBA')), y0=y0)
    # ---- the props, cut like the cast (flood fill of the white; `protect` puts back the white bodies the fill leaked into)
    for name, pic, protect in (('tray', 'tray-71', False), ('cup', 'cup-71', True), ('pies', 'pies-71', True), ('hat', 'hat-boat-71', True), ('headset', 'headset-73', False), ('screen', 'screen-71', True)):
        out[name], _ = tp.prop(name, pic, protect=protect)
    # the headset is worn on two different heads (Denise's and the cashier's), and its painted band is much taller than a head is wide, so the code draws the band and the painted
    # pieces are the two ear cups, the left one with its microphone boom (the band's legs above y 440 are dropped); the anchors are the cups' centres in each piece's own px
    out['headset'].update(headset_parts())
    # the monitor's glass (the dark screen) in layer px
    g = tp.glass('screen-71', 70)
    out['screen']['screen'] = [g[0] - out['screen']['ox'], g[1] - out['screen']['oy'], g[2] - out['screen']['ox'], g[3] - out['screen']['oy']]
    return out


def headset_parts():
    im = np.array(Image.open(os.path.join(OUT, 'because-headset.png')).convert('RGBA'))
    al = im[..., 3] > 128
    res = {}
    # the band: its thickness and colour where it is topmost (the column of the arch's top)
    ys, xs = np.where(al)
    top_x = int(xs[ys == ys.min()].mean())
    col = np.where(al[:, top_x])[0]
    run = col[col < col.min() + 120]
    res['band'] = dict(w=int(run.max() - run.min() + 1), colour=spp.hexc(np.median(im[run.min() + 8:run.max() - 7, top_x - 10:top_x + 10, :3].reshape(-1, 3), axis=0)))
    for name, (xa, xb), cup in (('l', (0, 360), (88.0, 609.5)), ('r', (360, im.shape[1]), (603.6, 609.5))):
        part = np.zeros_like(im); sel = np.zeros(al.shape, bool); sel[440:, xa:xb] = True
        part[sel] = im[sel]
        yy, xx = np.where(part[..., 3] > 8)
        x0, y0, x1, y1 = xx.min() - 2, yy.min() - 2, xx.max() + 3, yy.max() + 3
        Image.fromarray(part[y0:y1, x0:x1], 'RGBA').save(os.path.join(OUT, f'because-headset-{name}.png'), optimize=True)
        res[name] = dict(file=f'sp/because-headset-{name}.png', w=int(x1 - x0), h=int(y1 - y0), cx=round(cup[0] - x0, 1), cy=round(cup[1] - y0, 1))
    return res


def debug_props(props):
    names = ['tray', 'cup', 'pies', 'hat', 'headset', 'screen']
    tiles = []
    for n in names:
        im = Image.open(os.path.join(OUT, f'because-{n}.png')).convert('RGBA')
        bg = Image.new('RGBA', (im.size[0] + 20, im.size[1] + 20), (255, 0, 255, 255)); bg.alpha_composite(im, (10, 10))
        k = 360 / max(bg.size)
        tiles.append((n, bg.convert('RGB').resize((int(bg.size[0] * k), int(bg.size[1] * k)), Image.LANCZOS)))
    sheet = Image.new('RGB', (6 * 370, 400), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(tiles):
        sheet.paste(im, (6 + i * 370, 30)); d.text((10 + i * 370, 8), n, fill=(255, 255, 255))
    sheet.save(os.path.join(DBG, 'props-sheet.jpg'), quality=90)


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
    if extra: debug_props(extra['props'])
    json.dump({'src': [768, 1344], **rigs, **extra}, open(os.path.join(ROOT, 'src', 'because-rig.json' if not only else 'because-rig-part.json'), 'w'), indent=1)
    print('wrote the puppets, props and plates')
