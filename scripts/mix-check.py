# Voice against everything else, line by line, from the stems the mixer leaves in scratch/ (mix-voice.wav, mix-bed.wav)
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/mix-check.py
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode

SR = 48000
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(root, 'scratch', 'cues.json'), encoding='utf-8'))
v = decode(os.path.join(root, 'scratch', 'mix-voice.wav'), SR, 2).mean(axis=1)
b = decode(os.path.join(root, 'scratch', 'mix-bed.wav'), SR, 2).mean(axis=1)
db = lambda x: 20 * np.log10(max(1e-9, x))
worst = 99
for i, t in enumerate(J['voices']):
    a = int((t['at'] + t['first']) * SR); e = int((t['at'] + t['end']) * SR)
    rv = np.sqrt(np.mean(v[a:e] ** 2)); rb = np.sqrt(np.mean(b[a:e] ** 2))
    pb = np.abs(b[a:e]).max()
    worst = min(worst, db(rv) - db(rb))
    print(f"{i + 1:2d} {t['who']:6s} {t['at'] + t['first']:6.2f}-{t['at'] + t['end']:6.2f}  voice {db(rv):6.1f} dB  rest {db(rb):6.1f} dB  voice over rest {db(rv) - db(rb):5.1f} dB  (loudest bit of the rest {db(pb):6.1f} dBFS)  {t['text']}")
print(f'worst voice over rest: {worst:.1f} dB')
