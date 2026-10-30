# The audio of "Friday Night Lead": voices + sound cues + a comedic music bed, ducked under the voices, mastered to -14 LUFS.
#   node scripts/cues.mts                      (writes scratch/cues.json from the timeline)
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/mix.py [music.mp3] [out.wav] [cues.json]
# Episode 2 on: scripts/shots.py <episode> edit writes scratch/cues-<episode>.json (its cues carry their own "db").
# Writes out.wav (default scratch/mix.wav): 48 kHz stereo, integrated -14 LUFS, true peak <= -1.5 dBFS (a margin for the AAC encode).
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode

SR = 48000
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(sys.argv[3] if len(sys.argv) > 3 else os.path.join(root, 'scratch', 'cues.json'), encoding='utf-8'))
music_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'public', 'music', 'bed.mp3')
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'scratch', 'mix.wav')
TOTAL = J['total']
N = int(round(TOTAL * SR)) + SR // 2  # a short tail, cut by the muxer
rng = np.random.default_rng(7)

# loudness of the pieces, relative (dB): tuned by ear-proxy (voice-to-bed ratios checked in scripts/stt-check.py)
HIT_DB = {'burst': -4, 'buzz': -6, 'whoosh': -8, 'thud': -4, 'blub': -5, 'ding': -5, 'engine': -8, 'splash': -5, 'clank': -4, 'glug': -7, 'flip': -8, 'pop': -9, 'wipe': -10, 'ice': -4, 'tap': -9, 'plop': -6, 'drip': -6, 'drive': -6, 'kick': -4, 'ring': -8, 'pickup': -8, 'flush': -6}
BED_DB = {'spraybed': -4, 'rain': 2, 'snore': -7, 'filmbed': -8}
TICK_DB = -19
MUSIC_DB = -10
DUCK_HIT_DB, DUCK_BED_DB, DUCK_MUSIC_DB = 9, 14, 9

def dec(path, ch=1):
    return decode(path, SR, ch)

def put(buf, x, at):
    i = int(round(at * SR))
    if i >= len(buf): return
    a = max(0, -i)
    j = min(len(buf), i + len(x))
    if j > i + a: buf[i + a:j] += x[a:j - i]

def rate_change(x, r):
    if abs(r - 1) < 1e-3: return x
    t = np.arange(0, len(x) - 1, r)
    return np.interp(t, np.arange(len(x)), x).astype(np.float32)

def fade(x, fi, fo):
    x = x.copy()
    f, g = min(len(x), int(fi * SR)), min(len(x), int(fo * SR))
    if f: x[:f] *= np.linspace(0, 1, f)
    if g: x[-g:] *= np.linspace(1, 0, g)
    return x

def loop_to(x, length, xf=0.12):
    n = int(length * SR); c = int(xf * SR)
    if n <= len(x): return x[:n].copy()
    out = np.zeros(n, dtype=np.float32)
    ramp = np.linspace(0, np.pi / 2, c)
    fin, fout = np.sin(ramp), np.cos(ramp)  # equal power: the beds are noise
    pos = 0
    while pos < n:
        seg = x.copy()
        if pos > 0: seg[:c] *= fin
        if pos + len(seg) < n: seg[-c:] *= fout
        k = min(len(seg), n - pos)
        out[pos:pos + k] += seg[:k]
        pos += len(x) - c
    return out

db = lambda d: 10 ** (d / 20)

# 1) voices
voice = np.zeros(N, dtype=np.float32)
for v in J['voices']:
    put(voice, dec(os.path.join(root, 'public', v['file'])), v['at'])

# 2) the duck curve from the voice track: 1 while someone talks, with a fast attack and a slow release
hop = 0.01
h = int(hop * SR)
nf = N // h
env = np.array([np.sqrt(np.mean(voice[i * h:(i + 3) * h] ** 2)) for i in range(nf)])
act = (env > db(-50)).astype(float)
duck = np.zeros(nf)
for i in range(nf):
    prev = duck[i - 1] if i else 0.0
    a = 1 - np.exp(-hop / 0.03) if act[i] > prev else 1 - np.exp(-hop / 0.25)
    duck[i] = prev + (act[i] - prev) * a
duck_a = np.interp(np.arange(N) / SR, (np.arange(nf) + 0.5) * hop, duck).astype(np.float32)
def ducked(x, depth_db):
    return x * (1 - duck_a * (1 - db(-depth_db)))

# 3) sound cues
clips = {}
def clip(name):
    if name not in clips:
        clips[name] = dec(os.path.join(root, 'public', 'sfx', name + '.mp3'))
    return clips[name]
hits = np.zeros(N, dtype=np.float32); beds = np.zeros(N, dtype=np.float32); ticks = np.zeros(N, dtype=np.float32)
for c in J['cues']:
    n = c['name']; at = c['at']; vol = c.get('vol') or 1.0
    if 'db' in c:  # a sound at its own level, as in an episode's table read
        put(hits, clip(n) * db(c['db']), at)
    elif n == 'tick':
        x = rate_change(clip('tick'), float(rng.uniform(0.9, 1.1)))
        put(ticks, x * float(rng.uniform(0.6, 1.0)) * vol, at)
    elif n in BED_DB:
        x = clip(n)
        x = rate_change(x, c.get('rate') or 1.0)
        if c.get('len'): x = loop_to(x, c['len']); x = fade(x, 0.12, 0.2)
        put(beds, x * db(BED_DB[n]) * vol, at)
    elif n in HIT_DB:
        x = clip(n)
        if c.get('len'): x = fade(x[:int(c['len'] * SR)], 0.002, 0.15)
        put(hits, x * db(HIT_DB[n]) * vol, at)
    else:
        print('no sound for cue', n)

# 4) music, with its last hit laid on the end card
mus = decode(music_path, SR, 2)
mus = mus.reshape(-1, 2)
mono = mus.mean(axis=1)
e = np.array([np.sqrt(np.mean(mono[i:i + 480] ** 2)) for i in range(0, len(mono) - 480, 480)])
edb = 20 * np.log10(np.maximum(e, 1e-6))
alive = np.where(edb > -45)[0]
tail_end = alive[-1] * 0.01
cand = [i for i in range(int((tail_end - 2.6) / 0.01), int(tail_end / 0.01)) if edb[i + 3] - edb[i] > 14]
print('music: onsets in the last 2.6 s:', [round(i * 0.01, 2) for i in cand])
t_hit = cand[-1] * 0.01 + 0.02 if cand else None
target = J['endcard'] + 0.04
tempo = 1.0
if t_hit:
    tempo = t_hit / target
    print(f'music: last hit at {t_hit:.2f} s, wanted {target:.2f} s -> atempo {tempo:.4f}')
if not t_hit or not (0.93 < tempo < 1.07): tempo = 1.0
if abs(tempo - 1) > 1e-3:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', music_path, '-af', f'atempo={tempo:.5f}', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    mus = np.frombuffer(raw, dtype=np.float32).copy().reshape(-1, 2)
music = np.zeros((N, 2), dtype=np.float32)
k = min(N, len(mus)); music[:k] = mus[:k]
# a short fade in, and out at the very end of the picture
fo = int(0.25 * SR); end_i = int(TOTAL * SR)
music[end_i - fo:end_i] *= np.linspace(1, 0, fo)[:, None]; music[end_i:] = 0
music *= db(MUSIC_DB)
music = music * (1 - duck_a * (1 - db(-DUCK_MUSIC_DB)))[:, None]

# 5) sum
bus_hits = ducked(hits, DUCK_HIT_DB); bus_beds = ducked(beds, DUCK_BED_DB); bus_ticks = ducked(ticks, 4) * db(TICK_DB)
sfx = bus_hits + bus_beds + bus_ticks
mix = np.stack([voice + sfx, voice + sfx], axis=1) + music
mix[end_i:] = 0

def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', path], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)

def measure(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True)
    t = p.stderr.decode(errors='ignore')
    s = t[t.rfind('Summary:'):]
    I = float(s.split('I:')[1].split('LUFS')[0]); tp = float(s.split('Peak:')[1].split('dBFS')[0])
    return I, tp

def limit(x, ceiling_db):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', f'alimiter=limit={db(ceiling_db):.4f}:attack=3:release=60:level=disabled', '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy().reshape(-1, 2)

# 6) master: gain to -14 LUFS, a limiter under -1.5 dBTP, repeat until both hold
I0, tp0 = measure(mix[:end_i])
print(f'pre-master: {I0:.1f} LUFS, peak {tp0:.1f} dBTP')
gain = -14.0 - I0
res = None
for it in range(5):
    y = mix * db(gain)
    y = limit(y, -2.4)[:len(mix)]
    I, tp = measure(y[:end_i])
    print(f'  pass {it}: gain {gain:+.2f} dB -> {I:.2f} LUFS, true peak {tp:.2f} dBTP')
    res = y
    if abs(I + 14) < 0.15 and tp <= -1.5: break
    gain += (-14.0 - I)
write_wav(out_path, res[:end_i])
J2 = {'integrated': I, 'true_peak': tp, 'music_tempo': tempo}
json.dump(J2, open(os.path.join(root, 'scratch', 'mix-stats.json'), 'w'))
print('wrote', out_path)

# also the stems for the checks: voice only, and everything but the voice
write_wav(os.path.join(root, 'scratch', 'mix-voice.wav'), np.stack([voice, voice], axis=1)[:end_i])
write_wav(os.path.join(root, 'scratch', 'mix-bed.wav'), (np.stack([sfx, sfx], axis=1) + music)[:end_i])
