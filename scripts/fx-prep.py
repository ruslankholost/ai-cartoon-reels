# Prep for the painted props of the effects test (shot 8c, the phone on the table): cuts the Qwen pictures of scripts/sp-props-gen.py the way scripts/nv3-prep.py
# cuts the cast (flood fill of the white background, matted edge), and measures what the code needs: where the phone's screen is, where the hand's finger tips are.
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/fx-prep.py
# Writes public/sp/fx-{table.jpg,phone-front.png,phone-screen.png,phone-back.png,hand.png,receipt.png}, public/sp/grain.png (a 512 px tile of seeded noise for
# the finishing grain of src/sp-fx.tsx), src/fx-rig.json and scratch/fx/prep-*.png (debug).
import importlib.util, json, os
import numpy as np, scipy.ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('nvp', os.path.join(HERE, 'nv3-prep.py'))
nvp = importlib.util.module_from_spec(spec); spec.loader.exec_module(nvp)
spp = nvp.spp
ROOT, SRC, OUT = spp.ROOT, spp.SRC, spp.OUT
DBG = os.path.join(ROOT, 'scratch', 'fx')
os.makedirs(DBG, exist_ok=True)
PICKS = dict(table='fx-table2-43', front='fx-phone-front-52', back='fx-phone-back-52', hand='fx-hand-big-51', receipt='fx-receipt-41')


def load(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32)


def layer(rgb, alpha, pad=4):
    """straight-alpha RGBA of the opaque part, cropped; the colour under transparent pixels is bled from the nearest opaque one"""
    ys, xs = np.where(alpha > 0.02)
    x0, y0, x1, y1 = max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, alpha.shape[1]), min(ys.max() + pad + 1, alpha.shape[0])
    col = spp.bleed(rgb, alpha)
    out = np.zeros(alpha.shape + (4,), np.uint8)
    out[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(out[y0:y1, x0:x1], 'RGBA'), (int(x0), int(y0))


def table():
    a = load(PICKS['table'])
    H, W, _ = a.shape
    m = 14  # the picture has a thin dark rim all round: cut it off so the table runs out of the frame
    Image.fromarray(a[m:H - m, m:W - m].astype(np.uint8)).save(os.path.join(OUT, 'fx-table.jpg'), quality=94)
    return dict(w=W - 2 * m, h=H - 2 * m)


def phones():
    f = load(PICKS['front']); b = load(PICKS['back'])
    af, rf = nvp.cut(f)
    ab, rb = nvp.cut(b)
    imf, of = layer(rf, af)
    imb, ob = layer(rb, ab)
    # the screen: the navy glass inside the bezel (blue over red, dark), the biggest blob of it, in the cropped front picture's px
    fa = np.array(imf).astype(np.float32)
    navy = (fa[..., 2] - fa[..., 0] > 10) & (fa[..., :3].max(axis=2) < 80) & (fa[..., 3] > 200)
    navy = ndi.binary_opening(navy, iterations=2)
    lab, n = ndi.label(navy)
    big = lab == (1 + int(np.argmax(ndi.sum(navy, lab, range(1, n + 1)))))
    big = ndi.binary_fill_holes(big)
    ys, xs = np.where(big)
    screen = dict(x=int(xs.min()), y=int(ys.min()), w=int(xs.max() - xs.min() + 1), h=int(ys.max() - ys.min() + 1))
    # the screen as a soft-edged mask layer (white where the glass is): the code lights it and draws its text on it
    m = ndi.gaussian_filter(big.astype(np.float32), 0.8)
    scr = np.zeros(big.shape + (4,), np.uint8); scr[..., :3] = 255; scr[..., 3] = np.clip(m * 255, 0, 255).astype(np.uint8)
    Image.fromarray(scr, 'RGBA').save(os.path.join(OUT, 'fx-phone-screen.png'), optimize=True)
    # the two pictures were painted at about the same size, not exactly: the front is scaled to the back's (the flip must not change the size)
    imf2 = imf.resize(imb.size, Image.LANCZOS)
    sx, sy = imb.size[0] / imf.size[0], imb.size[1] / imf.size[1]
    Image.fromarray(scr, 'RGBA').resize(imb.size, Image.LANCZOS).save(os.path.join(OUT, 'fx-phone-screen.png'), optimize=True)
    imf2.save(os.path.join(OUT, 'fx-phone-front.png'), optimize=True)
    imb.save(os.path.join(OUT, 'fx-phone-back.png'), optimize=True)
    screen = dict(x=round(screen['x'] * sx), y=round(screen['y'] * sy), w=round(screen['w'] * sx), h=round(screen['h'] * sy))
    # a lighter top rim for nothing: the ink colour of the phone, for the code's rounded-rect plates
    return dict(w=imb.size[0], h=imb.size[1], screen=screen, scale=[round(sx, 4), round(sy, 4)])


def hand():
    a = load(PICKS['hand'])
    al, rgb = nvp.cut(a)
    im, _ = layer(rgb, al)
    im = im.rotate(90, expand=True)  # fingers up -> fingers pointing left; the arm runs off to the right
    arr = np.array(im)
    ys, xs = np.where(arr[..., 3] > 128)
    x0 = xs.min()
    tip_y = float(np.mean(ys[xs <= x0 + 3]))
    im.save(os.path.join(OUT, 'fx-hand.png'), optimize=True)
    # the width of the mitten (the oval, perpendicular to the arm): the rows where the skin colour is
    skin = (arr[..., 0] > 230) & (arr[..., 1] > 170) & (arr[..., 1] < 215) & (arr[..., 2] > 110) & (arr[..., 2] < 170) & (arr[..., 3] > 200)
    sy_, sx_ = np.where(skin)
    return dict(w=im.size[0], h=im.size[1], tip=[int(x0), round(tip_y, 1)], skinBox=[int(sx_.min()), int(sy_.min()), int(sx_.max()), int(sy_.max())])


def receipt():
    """the paper is cream (blue well under red) and has a dark outline, the background is neutral grey-white with a soft photographic shadow: the near-white flood
    fill of the cast leaves the shadow in, so the slip is cut by its colour instead"""
    a = load(PICKS['receipt'])
    paper = ((a[..., 0] - a[..., 2]) > 14) | (a.max(axis=2) < 130)
    paper = ndi.binary_closing(paper, iterations=2)
    lab, n = ndi.label(paper)
    big = lab == (1 + int(np.argmax(ndi.sum(paper, lab, range(1, n + 1)))))
    big = ndi.binary_fill_holes(big)
    big = ndi.binary_opening(big, iterations=2)
    al = ndi.gaussian_filter(big.astype(np.float32), 0.7)
    al[al < 0.04] = 0
    im, _ = layer(a, al)
    im.save(os.path.join(OUT, 'fx-receipt.png'), optimize=True)
    return dict(w=im.size[0], h=im.size[1])


def grain():
    """a seamless 512 px tile of fixed noise, mid grey (128) with +-40 of film-like grain: laid over a picture with mix-blend-mode overlay it changes nothing on average"""
    rng = np.random.RandomState(20261020)
    n = rng.normal(0, 1, (512, 512)).astype(np.float32)
    n = ndi.gaussian_filter(n, 0.7, mode='wrap')
    n /= n.std()
    Image.fromarray(np.clip(128 + 34 * n, 0, 255).astype(np.uint8), 'L').save(os.path.join(OUT, 'grain.png'), optimize=True)


def sheet():
    names = ['fx-phone-front', 'fx-phone-screen', 'fx-phone-back', 'fx-hand', 'fx-receipt']
    tiles = []
    for n in names:
        im = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 0, 255, 255)); bg.alpha_composite(im)
        h = 640; w = max(1, int(im.size[0] * h / im.size[1]))
        tiles.append(bg.convert('RGB').resize((w, h), Image.LANCZOS))
    W = sum(t.size[0] for t in tiles) + 6 * (len(tiles) + 1)
    s = Image.new('RGB', (W, 652), (30, 30, 30))
    x = 6
    for t in tiles:
        s.paste(t, (x, 6)); x += t.size[0] + 6
    s.save(os.path.join(DBG, 'prep-sheet.jpg'), quality=90)


if __name__ == '__main__':
    rig = dict(table=table(), phone=phones(), hand=hand(), receipt=receipt())
    json.dump(rig, open(os.path.join(ROOT, 'src', 'fx-rig.json'), 'w'), indent=1)
    grain()
    sheet()
    print(json.dumps(rig))
