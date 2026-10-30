# Where is the 1 kHz bleep tone in each voice file of x15 "Bleep Fee"? (scripts/voice-build.py puts each bleeped word under a 1 kHz sine, so the mosaics, the red pops and the counter must sit on the tone's own start and end.)
# For every take of public/x15/timings.json: the tone is found by its tonality (the share of a 20 ms window's energy that sits at 1 kHz: about 1 for the sine, well under 0.5 for speech) and checked against the spans that voice-build's formula
# gives for the same words (80 ms before the word's onset to the next word's onset); the formula's spans go to src/x15-tones.json: { "<file>": [[t0, t1], ...] } in the file's own seconds.
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/x15-tones.py
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode

SR = 44100
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tm = json.load(open(os.path.join(root, 'public', 'x15', 'timings.json'), encoding='utf-8'))
HOP, WIN = int(0.005 * SR), int(0.02 * SR)
out = {}
for t in tm['takes']:
    x = decode(os.path.join(root, 'public', t['file']), SR)
    n = max(0, (len(x) - WIN) // HOP)
    w = np.hanning(WIN)
    k = 2 * np.pi * 1000 * np.arange(WIN) / SR
    ref = np.exp(-1j * k)
    ton = np.zeros(n)
    for i in range(n):
        s = x[i * HOP:i * HOP + WIN].astype(np.float64)
        e = np.sum((s * w) ** 2)
        if e < 1e-9: continue
        c = np.abs(np.sum(s * w * ref)) ** 2 * 2 / np.sum(w ** 2)   # the energy of a 1 kHz sine of that amplitude
        ton[i] = min(1.0, c / (e * 1.0 + 1e-12) * 1.0)
    on = ton > 0.55
    spans, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            if (j - i) * HOP / SR >= 0.05: spans.append([round(i * HOP / SR, 3), round((j * HOP + WIN) / SR, 3)])
            i = j
        else: i += 1
    ws = t['words']
    f = []
    for i, w_ in enumerate(ws):
        if w_.get('bleep'):
            a = max(0.0, w_['t'] - 0.08) if i else max(0.0, min(w_['t'] - 0.08, t['voiced'][0][0]))
            b = ws[i + 1]['t'] if i + 1 < len(ws) else t['voiced'][-1][1]
            f.append([round(a, 3), round(b, 3)])
    out[t['file']] = f   # (the formula's spans are the file's own: the measured ones are smeared by the 20 ms window and only check them to 15 ms)
    for a, b in zip(spans, f): assert abs(a[0] - b[0]) < 0.02 and abs(a[1] - 0.015 - b[1]) < 0.02, (t['n'], a, b)
    assert len(spans) == len(f), (t['n'], spans, f)
    print(f"{t['n']} {t['file']}: heard {spans}   formula {f}")
json.dump(out, open(os.path.join(root, 'src', 'x15-tones.json'), 'w'))
print('wrote src/x15-tones.json')
