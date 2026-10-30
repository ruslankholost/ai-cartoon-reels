# Mouths against the voice, in motion: for a few spots, every second frame of the finished video (cropped to the face),
# with the loudness of the voice at that frame under it and the word being said over it.
#   python scripts/sync-board.py out/friday-lead-v1.mp4 out/friday-lead-v1-sync.jpg
# needs scratch/cues.json and scratch/mix-voice.wav (both left by scripts/cues.mts and scripts/mix.py)
import array, json, math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

video, out = sys.argv[1], sys.argv[2]
J = json.load(open('scratch/cues.json', encoding='utf-8'))
pcm = array.array('h')
pcm.frombytes(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'scratch/mix-voice.wav', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout)
def level(t0, t1):  # voice level 0..1 between t0 and t1 seconds
    a, b = int(t0 * 16000), int(t1 * 16000)
    seg = pcm[a:b]
    if not seg: return 0.0
    rms = math.sqrt(sum(v * v for v in seg) / len(seg)) / 32768
    return max(0.0, min(1.0, (20 * math.log10(max(rms, 1e-5)) + 52) / 40))  # -52 dB .. -12 dB
def word_at(t):
    for v in J['voices']:
        for w in v['words']:
            if v['at'] + w['t'] - 0.02 <= t <= v['at'] + w['e'] + 0.02: return w['d']
    return ''
# (label, start s, crop box in the 1080x1920 frame)
SPOTS = [
    ('Linda "How soon can you"', 5.10, (270, 600, 790, 1000)),
    ('Barb "Dave. Your phone."', 7.30, (330, 700, 850, 1100)),
    ('Dave "It\'s Friday, Barb."', 9.22, (340, 620, 860, 1020)),
    ('Chad "Book it, buddy"', 20.75, (230, 960, 750, 1360)),
    ('Linda "Oh, thank God."', 22.60, (290, 640, 810, 1040)),
]
N, STEP = 12, 2
W, H = 200, 154
font = ImageFont.load_default()
try: font = ImageFont.truetype('arial.ttf', 15)
except Exception: pass
sheet = Image.new('RGB', (N * (W + 4) + 4, len(SPOTS) * (H + 100) + 4), (22, 24, 30))
d = ImageDraw.Draw(sheet)
for r, (label, t0, box) in enumerate(SPOTS):
    y0 = 4 + r * (H + 100)
    d.text((6, y0), label, fill=(255, 255, 255), font=font)
    for i in range(N):
        f = round(t0 * 30) + i * STEP
        t = f / 30
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf', 'select=eq(n\\,%d)' % f, '-frames:v', '1', 'scratch/sync-frame.png'], check=True)
        im = Image.open('scratch/sync-frame.png').convert('RGB').crop(box).resize((W, H))
        x = 4 + i * (W + 4)
        sheet.paste(im, (x, y0 + 22))
        lv = level(t - 1 / 60, t + 1 / 60)
        d.rectangle([x, y0 + 22 + H + 6, x + W, y0 + 22 + H + 46], fill=(40, 44, 54))
        d.rectangle([x, y0 + 22 + H + 46 - int(40 * lv), x + W, y0 + 22 + H + 46], fill=(95, 224, 214))
        d.text((x + 3, y0 + 22 + H + 50), f'{t:.2f}s {word_at(t)}', fill=(230, 230, 230), font=font)
sheet.save(out, quality=88)
print(out, sheet.size)
