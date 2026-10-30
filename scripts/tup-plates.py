# Pieces of "I'm Just Supporting a Friend" that are cut from existing pictures (docs/x05-supporting-a-friend.md). Run: python -I scripts/tup-plates.py
#   public/sp/tup-bowl-front.png     the front lip and wall of public/sp/tup-bowl.png (everything below the inner edge of its opening): drawn over the chips, so the chips sit INSIDE the bowl
#   public/sp/tup-stack-1..7.png     the seven stacks of the 1949 store, cut from public/sp/pen-pile.png at the gaps between them, so that each can leave the shelf alone
#   public/sp/tup-bg-storeEmpty.jpg  the store's plate (public/sp/pen-bg-store.jpg) with the stacks taken away: the shelf's dark back, the posts, the wall and the counter's top, each column extended from the pixels
#                                    just above the stack's top (and, below the counter's back edge, just under its foot)
#   src/tup-plates.json              where everything goes (px of the plate / of the png)
import json, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SP = os.path.join(ROOT, 'public', 'sp')

# ── the bowl: the opening is an ellipse (centre 488.5, 131.5; rx 443, ry 107.5 in the bowl's px, measured on its pixels); the front piece is what lies below its lower edge
bowl = Image.open(os.path.join(SP, 'tup-bowl.png')).convert('RGBA')
W, H = bowl.size
cx, cy, rx, ry = 488.5, 131.5, 443.0, 107.5
a = np.array(bowl)
yy, xx = np.mgrid[0:H, 0:W]
edge = cy + ry * np.sqrt(np.clip(1 - ((xx - cx) / rx) ** 2, 0, 1))
keep = (yy >= edge - 3) | (np.abs(xx - cx) > rx)  # below the opening's lower edge (the dark line of the front lip included), and everything outside its width
front = a.copy()
front[~keep, 3] = 0
Image.fromarray(front).save(os.path.join(SP, 'tup-bowl-front.png'))

# ── the stacks: the pile picture is 645 x 206 at plate (100, 522); the seven stacks are cut at the gaps between them
pile = Image.open(os.path.join(SP, 'pen-pile.png')).convert('RGBA')
PX0, PY0 = 100, 522
cuts = [0, 97, 191, 282, 368, 457, 548, pile.width]
stacks = []
for i in range(7):
    x0, x1 = cuts[i], cuts[i + 1]
    s = pile.crop((x0, 0, x1, pile.height))
    sa = np.array(s)[:, :, 3] > 20
    ys = np.where(sa.any(axis=1))[0]
    s.save(os.path.join(SP, f'tup-stack-{i + 1}.png'))
    stacks.append({'file': f'sp/tup-stack-{i + 1}.png', 'x0': PX0 + x0, 'y0': PY0, 'w': x1 - x0, 'h': pile.height, 'top': PY0 + int(ys.min()), 'bottom': PY0 + int(ys.max())})

# ── the empty plate
plate = np.array(Image.open(os.path.join(SP, 'pen-bg-store.jpg')).convert('RGB')).astype(np.float32)
mask = np.zeros(plate.shape[:2], dtype=bool)
pa = np.array(pile)[:, :, 3] > 8
mask[PY0:PY0 + pile.height, PX0:PX0 + pile.width] = pa
mask = np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(11))) > 0  # the outlines too
mask = mask | np.roll(mask, 5, axis=0) | np.roll(mask, 9, axis=0)  # and the feet's shadows under them
COUNTER = 713  # the counter's back edge: above it the shelf and the wall, below it the counter's top
INT = (162, 682)  # the shelf's inside, between its two posts
out = plate.copy()
# the shelf's back: one colour from the unobstructed rows above the tallest stack (the glass jars behind the stacks stay out of the median); the counter's top: from the rows under the stacks' feet
shelf = np.median(plate[524:530, 170:670].reshape(-1, 3), axis=0)  # the back wall of the shelf just under the tallest stack's top (above it, under the plank, lies a shadow)
shelf_low = np.array([60.0, 40.0, 13.0])  # and near the counter, as the plate has it there
yb = int(np.where(mask.any(axis=1))[0].max())
wood = np.median(plate[yb + 9:yb + 12, 0:768].reshape(-1, 3), axis=0)
for x in range(plate.shape[1]):
    ys = np.where(mask[:, x])[0]
    if not len(ys):
        continue
    y0 = int(ys.min())
    above = plate[max(0, y0 - 6):max(1, y0 - 3), x].mean(axis=0)  # the posts and the wall: just above the stack's top
    for y in ys:
        if y >= COUNTER:
            out[y, x] = wood
        elif INT[0] <= x <= INT[1]:
            u = min(1.0, max(0.0, (y - 530) / (COUNTER - 530)))
            out[y, x] = shelf * (1 - u) + shelf_low * u
        else:
            out[y, x] = above
# the columns differ a little: smooth the filled bits sideways so that no streaks show
blur = np.array(Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32)
m3 = np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
out[m3] = blur[m3]
Image.fromarray(out.astype(np.uint8)).save(os.path.join(SP, 'tup-bg-storeEmpty.jpg'), quality=93)

# the short stack that the clerk carries out on his bowl (shot 18): the bottom 52 rows of the third stack, foot ring included
c3 = stacks[2]
carry = Image.open(os.path.join(SP, 'tup-stack-3.png')).convert('RGBA')
y1 = c3['bottom'] - PY0 + 1
carry.crop((0, y1 - 52, carry.width, y1)).save(os.path.join(SP, 'tup-stack-carry.png'))
json.dump({'doc': 'Cut from existing pictures by scripts/tup-plates.py. bowlFront: the front lip of public/sp/tup-bowl.png (same size, same place). stacks: the seven stacks of the 1949 store, plate px (x0, y0 = the top left of the picture, top/bottom = the stack\'s own rows).',
           'bowlFront': {'file': 'sp/tup-bowl-front.png', 'opening': [cx, cy, rx, ry]}, 'stacks': stacks, 'emptyPlate': 'sp/tup-bg-storeEmpty.jpg', 'counter': COUNTER, 'carry': {'file': 'sp/tup-stack-carry.png', 'w': stacks[2]['w'], 'h': 52}},
          open(os.path.join(ROOT, 'src', 'tup-plates.json'), 'w'), indent=1)
print('ok', [s['x0'] for s in stacks])
