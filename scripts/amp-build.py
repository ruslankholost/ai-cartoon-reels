# Mouth openness per frame from the voice takes: src/amp.json = { "<file>": { "dur": seconds, "amp": [0..1 per 1/30 s] } }
# Run when the voices change:  E:/talking-reel/.venv/Scripts/python.exe -I scripts/amp-build.py [episode]
# (reads public/<episode>/timings.json (default friday) and the mp3s; writes only src/amp.json, or src/amp-<episode>.json)
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode, SR

FPS = 30
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1] if len(sys.argv) > 1 else 'friday'
out_name = 'amp.json' if ep == 'friday' else f'amp-{ep}.json'
tm = json.load(open(os.path.join(root, 'public', ep, 'timings.json'), encoding='utf-8'))
out = {}
for t in tm['takes']:
    x = decode(os.path.join(root, 'public', t['file']))
    dur = len(x) / SR
    n = int(dur * FPS) + 1
    win = int(SR * 0.034)
    rms = np.zeros(n)
    for i in range(n):
        c = int(i / FPS * SR)
        seg = x[max(0, c - win // 2): c + win // 2]
        rms[i] = np.sqrt(np.mean(seg.astype(np.float64) ** 2)) if len(seg) else 0.0
    ref = np.percentile(rms[rms > rms.max() * 0.05], 90) if rms.max() > 0 else 1.0
    v = np.clip(rms / ref, 0, 1) ** 0.75
    v[v < 0.06] = 0.0
    s = np.zeros(n)  # quick to open, slower to close
    for i in range(n):
        s[i] = max(v[i], (s[i - 1] * 0.6) if i else 0.0)
    out[t['file']] = {'dur': round(dur, 3), 'amp': [round(float(a), 2) for a in s]}
json.dump(out, open(os.path.join(root, 'src', out_name), 'w'))
print('src/' + out_name, {k: len(v['amp']) for k, v in out.items()})
