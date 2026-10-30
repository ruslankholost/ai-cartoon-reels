# The machine part of the five yes/no questions of the effects test (scripts/render-fx-test.sh renders the stills it reads):
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/fx-check.py
#   2. hand count right?      in shot 8c there is one mitten at most (skin-coloured blobs of a hand's size, counted in scratch/fx/scan/p*.png)
#   4. blown whites?          the share of near-white pixels (every channel >= 250) of an after still may not exceed its before still's by more than 0.5 points
#   6. the thunk on its peak  the loudest sample of the episode mix near the landing is within 5 ms of the landing frame
#   5. stray outlines?        no blob of the steam's ink without a cloud inside it in shot 1 (scratch/fx/scan/s*.png against the before stills in scratch/fx/scanb)
# (1. pupils inside the whites is scripts/eyes-check.mts; 3. text on text is checked from the layout numbers below.) Exits non-zero when a check fails.
import glob, os, sys
import numpy as np, scipy.ndimage as ndi
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad = 0


def load(p):
    return np.array(Image.open(p).convert('RGB')).astype(np.int16)


def check(ok, msg):
    global bad
    print(('ok   ' if ok else 'FAIL ') + msg)
    bad += 0 if ok else 1


# 2. hand count in 8c
skin = lambda a: (a[..., 0] >= 238) & (a[..., 1] >= 190) & (a[..., 1] <= 228) & (a[..., 2] >= 130) & (a[..., 2] <= 185)
worst = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'scratch/fx/scan/p*.png'))):
    a = load(f)
    lab, n = ndi.label(skin(a))
    sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1)) if n else []
    hands = int(sum(1 for s in sizes if s >= 2500))
    worst = max(worst, hands)
    if hands > 1: print('   ', os.path.basename(f), hands, 'hand-sized skin blobs')
check(worst <= 1, f'hand count: at most {worst} hand(s) in any 8c still')

# 4. blown whites, before vs after
D = os.path.join(ROOT, 'scratch/fx/stills')
for f in sorted(glob.glob(os.path.join(D, 'after', '*.png'))):
    n = os.path.basename(f)
    a, b = load(f), load(os.path.join(D, 'before', n))
    sa, sb = (a.min(axis=2) >= 250).mean() * 100, (b.min(axis=2) >= 250).mean() * 100
    check(sa - sb <= 0.5, f'blown whites {n}: before {sb:.2f} %, after {sa:.2f} %')

# 5. stray outlines: ink of a cloud with no cloud inside it. Pixels of the steam's ink colour that the effect added to shot 1 (a pixel counts only where it differs from
# the before still: the painted art has colours like it) form blobs; a blob of 10 px or more with no cloud fill (the steam's fill colour, changed too) within 5 px is a
# stray outline. (The goo shader draws a fill wherever its field has a core, so a bare ink dot would mean a bug.)
ink = np.array([52, 65, 75]); cloud = np.array([238, 246, 249])
bare, scan = 0, sorted(glob.glob(os.path.join(ROOT, 'scratch/fx/scan/s*.png')))
for f in scan:
    a = load(f)
    b = load(os.path.join(ROOT, 'scratch/fx/scanb', os.path.basename(f)))
    ch = np.abs(a - b).max(axis=2) > 6
    ik = (np.abs(a - ink).max(axis=2) <= 14) & ch
    fl = ndi.binary_closing((np.abs(a - cloud).max(axis=2) <= 6) & ch, iterations=1)
    lab, n = ndi.label(ik, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        mine = lab == i
        if mine.sum() >= 10 and not (fl & ndi.binary_dilation(mine, iterations=5)).any():
            bare += 1; ys, xs = np.where(mine); print('   ', os.path.basename(f), 'bare ink at', int(xs.mean()), int(ys.mean()), int(mine.sum()), 'px')
check(bare == 0, f'stray outlines: {bare} blobs of cloud ink without a cloud over {len(scan)} stills of shot 1')

# 3. text on text, from the layout numbers of src/nv3-scenes.tsx (px of the phone / receipt pictures: baseline y, font px, cap height ~0.72 font, descender ~0.21 font)
def boxes(lines):
    return [(n, y - 0.72 * s, y + 0.21 * s) for n, y, s in lines]
for name, lines in (('phone screen', [('6:47 PM', 34 + 150, 46), ('calling...', 34 + 372, 44), ('Premier', 34 + 480, 86), ('Plumbing', 34 + 576, 86)]),
                    ('receipt', [("GARY'S", 128, 46), ('PLUMBING', 184, 46), ('Water heater', 296, 38), ('$1,500', 432, 80), ('CASH', 530, 64)])):
    b = boxes(lines)
    clash = [(b[i][0], b[i + 1][0]) for i in range(len(b) - 1) if b[i][2] > b[i + 1][1]]
    check(not clash, f'text on text, {name}: {"lines overlap " + str(clash) if clash else "no two lines overlap"}')
# 6. the thunk lands on its peak: the loudest sample of the mix around the landing (T.thunkP = 42.8 s, frame 1284) is within 5 ms of that frame's start
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from audiolib import decode
mix = decode(os.path.join(ROOT, 'scratch', 'nv3-mix.wav'), 48000, 1)
lo, hi = int(42.70 * 48000), int(42.95 * 48000)
peak_t = (lo + int(np.argmax(np.abs(mix[lo:hi])))) / 48000
check(abs(peak_t - 42.8) <= 0.005, f'thunk: the mix peaks at {peak_t:.4f} s, the phone lands on frame 1284 = 42.8000 s')
print(f'{bad} check(s) failed' if bad else 'all checks passed')
sys.exit(1 if bad else 0)
