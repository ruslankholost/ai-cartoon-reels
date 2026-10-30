# Shared audio helpers (numpy + ffmpeg pipes). Run with the talking-reel venv python in isolated mode:
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/<script>.py     (the scripts add scripts/ to sys.path themselves)
import re, subprocess, sys
import numpy as np

SR = 44100

def decode(path, sr=SR, ch=1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    return x if ch == 1 else x.reshape(-1, ch)

def write_wav(path, x, sr=SR, ch=1):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-', path], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)

def envelope(x, sr=SR, hop=0.005, win=0.015):
    h = int(sr * hop); w = int(sr * win)
    n = max(0, (len(x) - w) // h)
    # moving RMS via cumulative sum of squares
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    idx = np.arange(n) * h
    e = np.sqrt((c[idx + w] - c[idx]) / w)
    return e.astype(np.float32), hop

def segments(e, hop, thr_db=-40, min_len=0.03, merge=0.03):
    peak = np.percentile(e, 99)
    thr = peak * 10 ** (thr_db / 20)
    on = e > thr
    segs = []; i = 0; n = len(e)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            segs.append([i * hop, j * hop]); i = j
        else: i += 1
    m = []
    for s in segs:
        if m and s[0] - m[-1][1] < merge: m[-1][1] = s[1]
        else: m.append(s)
    return [s for s in m if s[1] - s[0] >= min_len]

def loudness(x, sr=SR, ch=1):
    """integrated LUFS and true peak (dBTP) via ffmpeg ebur128"""
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True).stderr.decode('utf8', 'replace')
    tail = p[p.rfind('Summary:'):]
    i = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', tail)[-1])
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', tail)
    return i, (float(tp[-1]) if tp else None)

def f0_track(x, sr=SR, lo=60.0, hi=330.0, frame=0.04, hop=0.01):
    """crude autocorrelation pitch track (Hz, 0 where unvoiced); good enough to compare takes of one voice"""
    y = x[:: 2]; s = sr // 2          # work at 22.05 kHz
    fl = int(frame * s); hp = int(hop * s)
    out = []
    kmin = int(s / hi); kmax = int(s / lo)
    gate = np.percentile(np.abs(y), 99) * 0.05
    for a in range(0, len(y) - fl - kmax, hp):
        f = y[a:a + fl + kmax].astype(np.float64)
        w = f[:fl]
        if np.sqrt(np.mean(w ** 2)) < gate: out.append(0.0); continue
        w = w - w.mean()
        den = np.dot(w, w) + 1e-9
        best, bk = 0.0, 0
        for k in range(kmin, kmax):
            seg = f[k:k + fl] - f[k:k + fl].mean()
            r = np.dot(w, seg) / (np.sqrt(den * (np.dot(seg, seg) + 1e-9)))
            if r > best: best, bk = r, k
        out.append(s / bk if best > 0.55 and bk else 0.0)
    return np.array(out)

def pitch_stats(f0):
    v = f0[f0 > 0]
    if len(v) < 5: return dict(n=len(v), med=0.0, std_st=0.0, rng_st=0.0)
    st = 12 * np.log2(v / np.median(v))
    return dict(n=int(len(v)), med=float(np.median(v)), std_st=float(np.std(st)), rng_st=float(np.percentile(st, 95) - np.percentile(st, 5)))
