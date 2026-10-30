# How far over the sounds is each voice line of x19 "Screen Time", and how far over the song is each hit? Builds the voice stem, the sound stem and the song stem the way scripts/sp-mix.py does (the sounds sit `duck` dB lower while somebody talks, the song its own
# 21; the song's level steps and its bass layer are in the cue) from scratch/cues.json (node scripts/x19-cues.mts first) and prints, line by line, the RMS of the voice and of the sounds inside the line's window; then every hit's peak against the song's RMS
# in the 0.2 s round it. The margin to beat is x18's: its voices are at least 16.5 dB over the sounds in every line (scripts/x18-voice-over.py).
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/x19-voice-over.py
import json, os, subprocess, sys
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

def seg(arr, i, n):
    y = arr[i:i + n]
    return np.pad(y, (0, n - len(y)))

def boom_layer(x):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'asetrate={SR // 2},aresample={SR},atempo=2.0,lowpass=f=300,lowpass=f=300', '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(p.stdout, dtype=np.float32).copy()
    return np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]

voice = np.zeros(N, dtype=np.float32)
for v in J['voices']: put(voice, decode(os.path.join(root, 'public', v['file']), SR), v['at'])
hop = 0.01; h = int(hop * SR); nf = N // h
env = np.array([np.sqrt(np.mean(voice[i * h:(i + 3) * h] ** 2)) for i in range(nf)])
act = (env > db(-50)).astype(float); duck = np.zeros(nf)
for i in range(nf):
    prev = duck[i - 1] if i else 0.0
    a = 1 - np.exp(-hop / 0.03) if act[i] > prev else 1 - np.exp(-hop / 0.25)
    duck[i] = prev + (act[i] - prev) * a
duck_a = np.interp(np.arange(N) / SR, (np.arange(nf) + 0.5) * hop, duck).astype(np.float32)
snd = np.zeros(N, dtype=np.float32)    # the sounds under the global duck
song = np.zeros(N, dtype=np.float32)   # the cues with a duck of their own
hits = []
for c in J['cues']:
    x = decode(os.path.join(root, 'public', 'sfx', c['name'] + '.mp3'), SR)[int(c.get('from', 0) * SR):]
    if c.get('len'): x = x[:int(c['len'] * SR)]
    t_x = c['at'] + np.arange(len(x)) / SR
    if c.get('boom'): x = x + 1.4 * boom_layer(x) * np.interp(t_x, [p[0] for p in c['boom']], [p[1] for p in c['boom']]).astype(np.float32)
    x = x * db(c.get('db', 0))
    if 'duck' in c:
        i = int(round(c['at'] * SR)); la = int(0.10 * SR); a = np.maximum(seg(duck_a, i, len(x)), seg(duck_a, i + la, len(x)))
        envg = (10 ** (np.interp(t_x, [p[0] for p in c['env']], [p[1] for p in c['env']]) / 20)).astype(np.float32) if c.get('env') else np.ones(len(x), dtype=np.float32)
        x = x * ((1 - a) * envg + a * np.minimum(envg, db(-c['duck'])))
        if c.get('fade'):
            g = min(len(x), int(c['fade'] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
        put(song, x, c['at'])
    else:
        if c.get('fade'):
            g = min(len(x), int(c['fade'] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
        put(snd, x, c['at'])
        hits.append((c['name'], c['at'], x))
snd = snd * (1 - duck_a * (1 - db(-J['duck'])))
worst = 99
print('line   who      window         voice      sounds     song    all sounds   voice over all sounds')
for i, v in enumerate(J['voices']):
    a = int((v['at'] + v['first']) * SR); e = int((v['at'] + v['end']) * SR)
    rv = np.sqrt(np.mean(voice[a:e] ** 2)); rs = np.sqrt(np.mean(snd[a:e] ** 2)); rg = np.sqrt(np.mean(song[a:e] ** 2)); ra = np.sqrt(np.mean((snd[a:e] + song[a:e]) ** 2))
    worst = min(worst, lev(rv) - lev(ra))
    print(f"{i + 1:2d} {v['who']:5s} {v['at'] + v['first']:6.2f}-{v['at'] + v['end']:6.2f}  {lev(rv):6.1f} dB  {lev(rs):6.1f} dB  {lev(rg):6.1f} dB  {lev(ra):6.1f} dB   {lev(rv) - lev(ra):5.1f} dB   {v['text']}")
print(f'worst voice over all the sounds: {worst:.1f} dB (x18: 16.5 dB)')
# how far each hit stands over the song (the song as it is in the mix, 0.2 s round the hit): the hit's loudest 5 ms against the song's RMS there
print('\nhit          at      peak    song rms   hit over song')
for name, at, x in hits:
    if name == 'song': continue
    a = max(0, int((at - 0.1) * SR)); e = int((at + 0.1) * SR)
    pk = np.abs(x[:int(0.3 * SR)]).max() * (1 - duck_a[min(N - 1, int(at * SR))] * (1 - db(-J['duck'])))
    rg = np.sqrt(np.mean(song[a:e] ** 2)) if e > a else 0
    print(f"{name:10s} {at:6.2f}  {lev(pk):6.1f}  {lev(rg):7.1f}    {lev(pk) - lev(rg):6.1f} dB" + ('   (no song)' if rg < 1e-5 else ''))
