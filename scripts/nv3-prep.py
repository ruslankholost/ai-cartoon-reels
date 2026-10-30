# Prep for the whole "Nobody Picks Up" v3 episode in the South Park puppet look (src/NobodyV3.tsx): cuts the other cast pictures in out/sp-cast2 into
# puppet parts like sp-prep.py does for Denise and Gary, and prepares the scene pictures (foreground strips, window holes, pupil-free audience).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/nv3-prep.py
# Writes public/sp/<char>-{body,head}.png, public/sp/<scene>*.{jpg,png}, src/nv3-rig.json (rigs of Marco, the agency guy, Rick, his wife and Denise in
# the robe, plus scene numbers; all in px of the 768x1344 source pictures, y down) and scratch/sp/nv3-*.png (debug overlays).
import importlib.util, json, os, sys
import numpy as np, scipy.ndimage as ndi, cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('spp', os.path.join(HERE, 'sp-prep.py'))
spp = importlib.util.module_from_spec(spec); spec.loader.exec_module(spp)
ROOT, SRC, OUT, DBG, K3 = spp.ROOT, spp.SRC, spp.OUT, spp.DBG, spp.K3
load, med, hexc = spp.load, spp.med, spp.hexc


def local_std(g, k=5):
    m = cv2.blur(g, (k, k)); m2 = cv2.blur(g * g, (k, k))
    return np.sqrt(np.maximum(m2 - m * m, 0))


def texture_mask(a, thr=1.5):
    """where the picture has texture (ink, paper grain): a white shirt or van body on the white background has no outline to flood against"""
    s = local_std(a.mean(axis=2).astype(np.float32), 5)
    m = ndi.binary_closing(s > thr, structure=np.ones((5, 5)), iterations=2)
    m = ndi.binary_fill_holes(m)
    m = ndi.binary_opening(m, structure=np.ones((5, 5)), iterations=1)
    lab, n = ndi.label(m)
    return lab == (np.argmax(ndi.sum(m, lab, range(1, n + 1))) + 1)


def cut(a, protect=False, holes=(), masks=()):
    alpha, rgb = spp.cutout(a, hole_rects=holes, hole_masks=masks)
    if protect:  # put back what the flood fill leaked into (the inside of the texture mask, shrunk by 2 px so the edge stays crisp)
        t = ndi.binary_erosion(texture_mask(a), structure=K3, iterations=2)
        back = (alpha < 1) & t
        alpha = np.where(back, 1.0, alpha).astype(np.float32)
    return alpha, rgb


def column_fill(rgb, alpha, region, y_from, reach=90):
    """fill `region` (the part of the body hidden behind the head) with the colour just under it, column by column: neck skin in the middle,
    collar or shoulder at the sides, so a head that moves a little shows something plausible"""
    H, W = alpha.shape
    out, oa = rgb.copy(), alpha.copy()
    for x in np.where(region.any(axis=0))[0]:
        ys = np.where(region[:, x])[0]
        col = None
        for y in range(y_from, min(H, y_from + reach)):
            if alpha[y, x] > 0.9:
                col = rgb[y, x]; break
        if col is None:  # nothing under this column: reuse the nearest column that had something
            continue
        out[ys, x] = col; oa[ys, x] = 1.0
    # columns that found nothing take the colour of their nearest filled neighbour
    filled = np.zeros_like(region);
    for x in np.where(region.any(axis=0))[0]:
        filled[:, x] = region[:, x] & (oa[:, x] > 0.9) & (np.abs(out[:, x] - rgb[:, x]).sum(axis=1) >= 0)
    missing = region & (oa < 0.9)
    if missing.any():
        idx = ndi.distance_transform_edt(~(region & (oa > 0.9)), return_distances=False, return_indices=True)
        out[missing] = out[idx[0][missing], idx[1][missing]]; oa[missing] = 1.0
    return out, oa


def gen_brows(eyes, thick, lift=1.0):
    """code brows from the eye ovals: a slightly arched polyline [x, y, thickness] over each eye (px of the source picture)"""
    out = []
    for e in eyes:
        pts = []
        for i in range(9):
            t = i / 8
            x = e['cx'] + (t * 2 - 1) * e['rx'] * 1.0
            y = e['cy'] - e['ry'] * (1.32 + 0.14 * np.sin(np.pi * t)) * lift
            pts.append([round(float(x), 1), round(float(y), 1), round(float(thick * (0.6 + 0.4 * np.sin(np.pi * (0.15 + 0.7 * t)))), 1)])
        out.append(pts)
    return out


CHARS = {
    # key: source picture, skin probe box, seed inside the face, the drawn mouth's rough centre/width, extras
    'marco': dict(src='marco-21', skin=(300, 470, 340, 500), seed=(390, 480), mouth=(386, 533, 72), protect=True),
    'agency': dict(src='agency-21', skin=(300, 560, 340, 590), seed=(390, 570), mouth=(388, 633, 72), brows=('#6a4a2c', 13)),
    'rick': dict(src='rick-21', skin=(250, 480, 290, 510), seed=(300, 500), mouth=(386, 530, 50)),
    'wife': dict(src='wife-21', skin=(300, 560, 340, 590), seed=(390, 600), mouth=(388, 633, 78)),
    'deniseRobe': dict(src='denise-robe-22', skin=(300, 520, 340, 550), seed=(390, 540), mouth=(396, 546, 52), holes=[(100, 560, 270, 650), (500, 560, 680, 650)]),  # white pockets between the hair tips
}


def char(key, cfg, denise_rig=None):
    a0 = load(cfg['src'])
    H, W, _ = a0.shape
    yy, xx = np.mgrid[0:H, 0:W]
    alpha, rgb = cut(a0, cfg.get('protect', False), cfg.get('holes', ()))
    interior, skin = spp.head_interior(a0, cfg['skin'], cfg['seed'])
    eyes = spp.eyes_of(a0, (100, 150, 700, 800), interior)
    ecy = float(np.mean([e['cy'] for e in eyes]))
    cnts, _ = cv2.findContours(interior.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cc = max(cnts, key=len)[:, 0, :].astype(float)
    p = cc[cc[:, 1] > ecy + 40]
    cx, cy, r = spp.fit_circle(p)
    m = np.abs(np.hypot(p[:, 0] - cx, p[:, 1] - cy) - r) < 3
    cx, cy, r = spp.fit_circle(p[m])
    pupils = spp.pupils_of(a0, eyes)
    print(f'  {key}: face circle {cx:.1f} {cy:.1f} r {r:.1f}, eyes', [(round(e["cx"], 1), round(e["cy"], 1)) for e in eyes], 'pupils', pupils)

    # the drawn mouth: the thin dark curve near its rough position (the mustache of Rick is brown and big, so only small components count)
    mx, my, mw = cfg['mouth']
    zone = np.zeros((H, W), bool); zone[int(my - 16):int(my + 16), int(mx - mw / 2 - 14):int(mx + mw / 2 + 14)] = True
    dark = (a0.max(axis=2) < 175) & zone
    lab, k = ndi.label(dark)
    keep = [i for i in range(1, k + 1) if 25 < (lab == i).sum() < 900]
    mm = np.isin(lab, keep)
    if key == 'rick':  # the mustache's lower fringe reaches into the zone: keep only the comps whose centre is below its notch
        mm = np.isin(lab, [i for i in keep if np.where(lab == i)[0].mean() > my - 6])
    ys, xs = np.where(mm)
    mouth = dict(cx=float((xs.min() + xs.max() + 1) / 2), cy=float((ys.min() + ys.max() + 1) / 2), w=float(xs.max() - xs.min() + 1))
    rgb_h = spp.flat(rgb, mm, skin)

    chin = cy + r
    Y_CUT = int(round(chin)) + 6
    BAND = Y_CUT - 50
    px, py = float(round(cx)), float(Y_CUT)
    R_FILL = r + 4
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= R_FILL ** 2
    head_mask = (yy < Y_CUT).astype(np.float32)
    band_disc = disc & (yy >= BAND) & (yy < Y_CUT + 1)
    body_rgb, body_alpha = column_fill(rgb, alpha, band_disc, Y_CUT + 6)
    body_mask = ((yy >= BAND) & ~(disc & ~band_disc)).astype(np.float32)
    body_mask[(yy < Y_CUT + 1) & disc & ~band_disc] = 0
    name = {'deniseRobe': 'denise-robe'}.get(key, key)
    L = {'body': spp.save_layer(f'{name}-body', body_rgb, body_alpha, body_mask), 'head': spp.save_layer(f'{name}-head', rgb_h, alpha, head_mask)}

    rig = dict(pivot=[px, py], disc=[round(cx, 1), round(cy, 1), round(r, 1)], layers=L, eyes=eyes, pupils=pupils, mouth=mouth, mouthW=round(0.44 * r), face=hexc(skin),
               white=spp.eye_white(a0, eyes[0]), pupilInk=spp.pupil_ink(a0, pupils[0]), outline=spp.outline_colour(a0, eyes[0]), ink=spp.ink_colour(rgb, alpha, head_mask))
    if 'brows' in cfg:
        rig['brows'] = gen_brows(eyes, cfg['brows'][1]); rig['browColour'] = cfg['brows'][0]
    if key == 'deniseRobe' and denise_rig:  # Denise's code brows, moved over this picture's eyes and scaled by the size of the eyes
        k = np.mean([e['ry'] for e in eyes]) / np.mean([e['ry'] for e in denise_rig['eyes']])
        nb = []
        for b, e0, e1 in zip(denise_rig['brows'], denise_rig['eyes'], eyes):
            nb.append([[round(e1['cx'] + (x - e0['cx']) * k, 1), round(e1['cy'] + (y - e0['cy']) * k, 1), round(t * k, 1)] for x, y, t in b])
        rig['brows'] = nb; rig['browColour'] = denise_rig['browColour']
    spp.draw_debug(f'nv3-{name}', a0, dict(rig, brows=rig.get('brows', [])))
    spp.put_together(f'nv3-{name}', a0, L, ['body', 'head'])
    return rig


# ---------------------------------------------------------------- scenes
def load_rgb(name):
    return np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB'))


def save_jpg(name, arr):
    Image.fromarray(arr).save(os.path.join(OUT, name + '.jpg'), quality=95)


def save_png(name, arr_rgba):
    Image.fromarray(arr_rgba, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)


def strip(arr, y0):
    """the rows y0.. of a picture as a transparent-topped layer: drawn over the puppets it hides everything of them below y0 (they sit behind a table, a seat, a sofa)"""
    out = np.zeros(arr.shape[:2] + (4,), np.uint8)
    out[..., :3] = arr; out[y0:, :, 3] = 255
    return out[y0:]


def audience(rig):
    """the audience: the pupils of every face are found and painted out (the code draws them again, looking at Rick); the front-row chairs are cut as a strip"""
    arr = load_rgb('bg-audience-32')
    a = arr.astype(np.float32)
    near = a.min(axis=2) >= 212  # the eye whites of this picture are slightly grey
    lab, n = ndi.label(near)
    dark = a.max(axis=2) < 85
    pupil_mask = np.zeros(near.shape, bool)
    eyes = []
    for i in range(1, n + 1):
        blob = lab == i
        cnt = int(blob.sum())
        if not (120 < cnt < 7000): continue
        ys, xs = np.where(blob)
        w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        if ys.min() < 420 or ys.max() > 880 or w / h > 2.6 or w / h < 0.5: continue
        inner = ndi.binary_fill_holes(blob)
        hole = inner & ~blob  # the pupil and its soft edge: whatever is inside the white that is not white
        lab2, k2 = ndi.label(hole)
        ps = []
        for j in range(1, k2 + 1):
            py, px = np.where(lab2 == j)
            if 5 <= len(py) < 300 and (a[py, px].max(axis=1) < 150).any():
                ps.append((float(px.mean()), float(py.mean()), len(py), j))
        if not ps or len(ps) > 2: continue
        ps.sort()
        cuts = [xs.min()] + ([(ps[0][0] + ps[1][0]) / 2] if len(ps) == 2 else []) + [xs.max() + 1]
        for q, (qx, qy, qn, j) in enumerate(ps):
            x0, x1 = cuts[q], cuts[q + 1]
            pupil_mask |= ndi.binary_dilation(lab2 == j, structure=K3, iterations=2) & inner
            eyes.append(dict(cx=round(float(x0 + x1) / 2, 1), cy=round(float(ys.min() + ys.max() + 1) / 2, 1), rx=round(float(x1 - x0) / 2, 1), ry=round(h / 2, 1), px=round(qx, 1), py=round(qy, 1), pr=round(float(np.sqrt(qn / np.pi)) + 0.5, 1)))
    print(f'  audience: {len(eyes)} eyes with a pupil')
    core = near & ~ndi.binary_dilation(~near, iterations=3)
    white = np.median(a[core], axis=0) if core.any() else np.array([228., 228., 222.])
    np_arr = arr.copy(); np_arr[pupil_mask] = white.astype(np.uint8)
    save_jpg('bg-audience', arr); save_jpg('bg-audience-np', np_arr)
    save_png("fg-audience", strip(arr, 972))
    vis = arr.copy()
    for e in eyes:
        cv2.circle(vis, (int(e['px']), int(e['py'])), int(e['pr']) + 3, (255, 0, 0), 1)
    Image.fromarray(vis).save(os.path.join(DBG, 'nv3-audience-eyes.png'))
    Image.fromarray(np_arr).save(os.path.join(DBG, 'nv3-audience-np.png'))
    return dict(eyes=eyes, white=hexc(white), seatY=972)


def office():
    arr = load_rgb('bg-office-21')
    save_jpg('bg-office', arr); save_png('fg-office', strip(arr, 700))
    return dict(tableY=700)


def tony():
    arr = load_rgb('tony-sink-34')
    save_jpg('bg-tony', arr)
    quad = [[452, 738], [517, 745], [514, 797], [447, 798]]
    # the phone in his back pocket as a layer of its own, so the code can make it buzz: the quad grown by 2 px, soft-edged
    m = Image.new('L', (768, 1344), 0)
    cx = np.mean([q[0] for q in quad]); cy = np.mean([q[1] for q in quad])
    ImageDraw.Draw(m).polygon([(q[0] + np.sign(q[0] - cx) * 2, q[1] + np.sign(q[1] - cy) * 2) for q in quad], fill=255)
    al = cv2.GaussianBlur(np.array(m).astype(np.float32), (0, 0), 0.8)
    x0, y0, x1, y1 = 440, 730, 526, 806
    out = np.dstack([arr, al.clip(0, 255).astype(np.uint8)])[y0:y1, x0:x1]
    save_png('tony-phone', out)
    return dict(phone=quad, box=[x0, y0, x1 - x0, y1 - y0])


def living():
    arr = load_rgb('bg-living-21')
    save_jpg('bg-living', arr)
    rgba = np.dstack([arr, np.full(arr.shape[:2], 255, np.uint8)])
    glass = [(113, 294, 238, 567), (253, 294, 369, 567)]  # the two panes (px of the picture), measured on a 2.2x zoom
    for x0, y0, x1, y1 in glass:
        rgba[y0:y1, x0:x1, 3] = 0
    save_png('bg-living-frame', rgba)
    save_png('fg-living', strip(arr, 772))
    # the van of the last shot: a side view on white; the body is white too, so the texture mask finds it
    van = load_rgb('van-side-32').astype(np.float32)
    alpha, rgb = cut(van, protect=True)
    ys, xs = np.where(alpha > 0.5)
    x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
    out = np.dstack([spp.bleed(rgb, alpha).clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
    save_png('van-side', out)
    return dict(glass=glass, seatY=772, van=dict(w=int(x1 - x0), h=int(y1 - y0)))


def bathroom():
    arr = load_rgb('bg-bathroom-21')
    save_png('fg-bathroom-tub', strip(arr, 985))
    return dict(tubY=985, nozzle=[556, 186], head=[[548, 168], [572, 164], [598, 190], [592, 208], [570, 212], [551, 196]])


if __name__ == '__main__':
    denise_rig = json.load(open(os.path.join(ROOT, 'src', 'sp-rig.json')))['denise']
    rigs = {}
    for key, cfg in CHARS.items():
        print(key)
        rigs[key] = char(key, cfg, denise_rig)
    scenes = {}
    print('scenes')
    scenes['audience'] = audience(rigs)
    scenes['office'] = office(); scenes['tony'] = tony(); scenes['living'] = living(); scenes['bathroom'] = bathroom()
    json.dump({'src': [768, 1344], **rigs, 'scenes': scenes}, open(os.path.join(ROOT, 'src', 'nv3-rig.json'), 'w'), indent=1)
    print('wrote src/nv3-rig.json')
