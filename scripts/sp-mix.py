# The audio of SpCallTest: voices (take 9 trimmed to start at "Yeah."), a ringback, the pickup click, the engine at the end. Mastered to -14 LUFS,
# true peak <= -1.5 dBTP. node scripts/sp-cues.mts first, then:
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/sp-mix.py [out.wav]       (default scratch/sp-mix.wav; reads scratch/cues.json)
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode

SR = 48000
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(root, 'scratch', 'cues.json'), encoding='utf-8'))
out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'scratch', 'sp-mix.wav')
TOTAL = J['total']
end_i = int(round(TOTAL * SR))
N = end_i + SR // 2
db = lambda d: 10 ** (d / 20)

def put(buf, x, at):
    i = int(round(at * SR))
    j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[:j - i]

def bandpass(x, lo, hi, gain=1.4):
    """a voice that comes through a phone (x15 "Bleep Fee", the robocall): everything under `lo` and over `hi` Hz is cut (two poles of each filter twice over, 24 dB per octave), a little gain makes up for what the filter took"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'highpass=f={lo},highpass=f={lo},lowpass=f={hi},lowpass=f={hi},volume={gain}', '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()

def voice_file(v):  # a voice take as it is heard: from `skip` seconds in, through a band-pass if the cue has `bp` [lo, hi]
    x = decode(os.path.join(root, 'public', v['file']), SR)[int(v.get('skip', 0) * SR):]
    return bandpass(x, *v['bp']) if v.get('bp') else x

def seg(arr, i, n):
    y = arr[i:i + n]
    return np.pad(y, (0, n - len(y)))

def boom_layer(x):
    """x19's `boom`: the clip an octave down at its own speed (asetrate to half, back to SR, atempo 2) and low-passed at 300 Hz: the bass that a toy song does not have (its 250-500 Hz body moves to 125-250 Hz)"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'asetrate={SR // 2},aresample={SR},atempo=2.0,lowpass=f=300,lowpass=f=300', '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(p.stdout, dtype=np.float32).copy()
    return np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]

voice = np.zeros(N, dtype=np.float32)
for v in J['voices']:
    put(voice, voice_file(v), v['at'] + v.get('skip', 0))
duck_a = None
if J.get('duck'):  # the sounds sit 'duck' dB lower while somebody talks (fast attack, slow release), the voices stay where they are
    hop = 0.01; h = int(hop * SR); nf = N // h
    env = np.array([np.sqrt(np.mean(voice[i * h:(i + 3) * h] ** 2)) for i in range(nf)])
    act = (env > db(-50)).astype(float)
    duck = np.zeros(nf)
    for i in range(nf):
        prev = duck[i - 1] if i else 0.0
        a = 1 - np.exp(-hop / 0.03) if act[i] > prev else 1 - np.exp(-hop / 0.25)
        duck[i] = prev + (act[i] - prev) * a
    duck_a = np.interp(np.arange(N) / SR, (np.arange(nf) + 0.5) * hop, duck).astype(np.float32)

mix = np.zeros(N, dtype=np.float32)
own = np.zeros(N, dtype=np.float32)  # cues with a duck of their own (x19's song): ducked by it, not by the global duck
for v in J['voices']:  # the file starts `skip` seconds in; the first 12 ms fade in so the cut does not click
    x = voice_file(v)
    f = int(0.012 * SR)
    if v.get('skip'): x[:f] *= np.linspace(0, 1, f)
    put(mix, x, v['at'] + v.get('skip', 0))
for c in J['cues']:
    x = decode(os.path.join(root, 'public', 'sfx', c['name'] + '.mp3'), SR)
    x = x[int(c.get('from', 0) * SR):]
    if c.get('len'): x = x[:int(c['len'] * SR)]
    t_x = c['at'] + np.arange(len(x)) / SR  # the clip's samples on the reel's clock
    if c.get('boom'):  # `boom`: [[t, 0 .. 1], ...]: how much of the octave-down bass layer is added to the clip over time
        x = x + 1.4 * boom_layer(x) * np.interp(t_x, [p[0] for p in c['boom']], [p[1] for p in c['boom']]).astype(np.float32)
    x = x * db(c.get('db', 0))
    if 'duck' in c and duck_a is not None:
        # its own duck, and its own level steps: `env`: [[t, dB], ...] the clip's level over time (linear in dB, held before the first point and after the last), and `duck` dB under the voices while somebody talks:
        # the ducked level is capped at `duck` dB under the clip's own level whatever the steps are (a loud step does not make the song louder under a line), and the duck looks 100 ms ahead (its start, not its release) so that the song is down when the voice starts
        i = int(round(c['at'] * SR)); la = int(0.10 * SR); a = np.maximum(seg(duck_a, i, len(x)), seg(duck_a, i + la, len(x)))
        envg = (10 ** (np.interp(t_x, [p[0] for p in c['env']], [p[1] for p in c['env']]) / 20)).astype(np.float32) if c.get('env') else np.ones(len(x), dtype=np.float32)
        x = x * ((1 - a) * envg + a * np.minimum(envg, db(-c['duck'])))
        if c.get('fade'):
            g = min(len(x), int(c['fade'] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
        put(own, x, c['at'])
    else:
        if c.get('env'): x = x * (10 ** (np.interp(t_x, [p[0] for p in c['env']], [p[1] for p in c['env']]) / 20)).astype(np.float32)
        if c.get('fade'):
            g = min(len(x), int(c['fade'] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
        put(mix, x, c['at'])
fo = int(J.get('tail', 0.3) * SR)  # a short fade out: the last sting rings off the end of the picture (x19: 0.08 s, the song's power-up carries into the loop)
mix[end_i - fo:end_i] *= np.linspace(1, 0, fo); own[end_i - fo:end_i] *= np.linspace(1, 0, fo)
mix[end_i:] = 0; own[end_i:] = 0
if duck_a is not None:
    mix = voice + (mix - voice) * (1 - duck_a * (1 - db(-J['duck'])))
mix = mix + own
st = np.stack([mix, mix], axis=1)

def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', path], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)

def measure(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True)
    t = p.stderr.decode(errors='ignore'); s = t[t.rfind('Summary:'):]
    return float(s.split('I:')[1].split('LUFS')[0]), float(s.split('Peak:')[1].split('dBFS')[0])

def limit(x, ceiling_db):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', f'alimiter=limit={db(ceiling_db):.4f}:attack=3:release=60:level=disabled', '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy().reshape(-1, 2)

def aac_peak(x):
    """worst true peak after the AAC encodes of the two files (192k main, 128k phone), made the way render-sp.sh makes them (from a wav file):
    a hard-limited signal can overshoot by more than a dB there"""
    tmp_wav, tmp = os.path.join(root, 'scratch', 'sp-aac-test.wav'), os.path.join(root, 'scratch', 'sp-aac-test.m4a')
    write_wav(tmp_wav, x[:end_i])
    worst = -99.0
    for br in ('192k', '128k'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp_wav, '-c:a', 'aac', '-b:a', br, '-ar', str(SR), '-ac', '2', tmp], check=True)
        t = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True).stderr.decode(errors='ignore')
        worst = max(worst, float(t[t.rfind('Summary:'):].split('Peak:')[1].split('dBFS')[0]))
    return worst

I0, tp0 = measure(st[:end_i])
print(f'pre-master: {I0:.1f} LUFS, peak {tp0:.1f} dBTP')
ceiling = -2.4
for rnd in range(10):  # gain to -14 LUFS under a limiter; then lower the ceiling in 0.3 dB steps until the AAC-encoded files stay under -1.5 dBTP
    gain = -14.0 - I0
    for it in range(5):
        y = st * db(gain)
        over = float((np.abs(y[:end_i]) > db(ceiling)).mean())
        y = limit(y, ceiling)[:len(st)]
        I, tp = measure(y[:end_i])
        print(f'  ceiling {ceiling:.1f}, pass {it}: gain {gain:+.2f} dB ({over * 100:.2f}% of samples over) -> {I:.2f} LUFS, true peak {tp:.2f} dBTP')
        res = y
        if abs(I + 14) < 0.15: break
        gain += (-14.0 - I)
    ta = aac_peak(res)
    print(f'  after AAC (192k and 128k): worst true peak {ta:.2f} dBTP')
    if ta <= -1.5: break
    ceiling -= 0.3
write_wav(out_path, res[:end_i])
print('wrote', out_path)
