# How far over the sounds is each voice line of x14 "Four Stars"? Builds the voice stem and the sound stem the way scripts/sp-mix.py does (the sounds sit `duck` dB lower while somebody talks) from scratch/cues.json
# (node scripts/x14-cues.mts first) and prints, line by line, the RMS of the voice and of the sounds inside the line's window.
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/x14-voice-over.py
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode

SR = 48000
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(root, 'scratch', 'cues.json'), encoding='utf-8'))
N = int(round(J['total'] * SR)) + SR // 2
db = lambda d: 10 ** (d / 20)
lev = lambda x: 20 * np.log10(max(1e-9, x))

def put(buf, x, at):
    i = int(round(at * SR)); j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[:j - i]

voice = np.zeros(N, dtype=np.float32)
for v in J['voices']: put(voice, decode(os.path.join(root, 'public', v['file']), SR), v['at'])
snd = np.zeros(N, dtype=np.float32)
for c in J['cues']:
    x = decode(os.path.join(root, 'public', 'sfx', c['name'] + '.mp3'), SR)[int(c.get('from', 0) * SR):]
    if c.get('len'): x = x[:int(c['len'] * SR)]
    if c.get('fade'):
        g = min(len(x), int(c['fade'] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
    put(snd, x * db(c.get('db', 0)), c['at'])
hop = 0.01; h = int(hop * SR); nf = N // h
env = np.array([np.sqrt(np.mean(voice[i * h:(i + 3) * h] ** 2)) for i in range(nf)])
act = (env > db(-50)).astype(float); duck = np.zeros(nf)
for i in range(nf):
    prev = duck[i - 1] if i else 0.0
    a = 1 - np.exp(-hop / 0.03) if act[i] > prev else 1 - np.exp(-hop / 0.25)
    duck[i] = prev + (act[i] - prev) * a
duck_a = np.interp(np.arange(N) / SR, (np.arange(nf) + 0.5) * hop, duck).astype(np.float32)
snd = snd * (1 - duck_a * (1 - db(-J['duck'])))
worst = 99
for i, v in enumerate(J['voices']):
    a = int((v['at'] + v['first']) * SR); e = int((v['at'] + v['end']) * SR)
    rv = np.sqrt(np.mean(voice[a:e] ** 2)); rs = np.sqrt(np.mean(snd[a:e] ** 2)); ps = np.abs(snd[a:e]).max()
    worst = min(worst, lev(rv) - lev(rs))
    print(f"{i + 1:2d} {v['who']:6s} {v['at'] + v['first']:6.2f}-{v['at'] + v['end']:6.2f}  voice {lev(rv):6.1f} dB  sounds {lev(rs):6.1f} dB  voice over sounds {lev(rv) - lev(rs):5.1f} dB  (loudest sound {lev(ps):6.1f} dBFS)  {v['text']}")
print(f'worst voice over sounds: {worst:.1f} dB')
