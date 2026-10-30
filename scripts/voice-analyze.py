# One row per raw take: where speech sits, how fast, how flat, how bright, how loud. (No ears here, so these numbers stand in for them.)
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/voice-analyze.py [substring ...]     (filters "<episode>/<char>-<cand>-<voice>/L<nn>-t<k>": all args must match, a comma inside one arg means or, e.g. be-chad/ dave- L04,L06)
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from audiolib import SR, decode, envelope, segments, loudness, f0_track, pitch_stats

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scratch', 'voice-raw')


def brightness(x, segs):
    """mean spectral centroid (Hz) over voiced frames: higher = brighter, smiling; lower = dull, sleepy"""
    fl, hp = int(0.025 * SR), int(0.01 * SR)
    win = np.hanning(fl)
    cs = []
    for a, b in segs:
        for s in range(int(a * SR), max(int(a * SR) + 1, int(b * SR) - fl), hp):
            f = x[s:s + fl]
            if len(f) < fl: break
            m = np.abs(np.fft.rfft(f * win))
            if m.sum() > 1e-6: cs.append(float((m * np.fft.rfftfreq(fl, 1 / SR)).sum() / m.sum()))
    return float(np.median(cs)) if cs else 0.0


def analyze(path):
    x = decode(path)
    e, hop = envelope(x)
    segs = segments(e, hop, thr_db=-40, min_len=0.04, merge=0.06)
    lufs, _ = loudness(x)
    f0 = f0_track(x)
    ps = pitch_stats(f0)
    v = 12 * np.log2(f0[f0 > 0] / max(ps['med'], 1e-6)) if ps['n'] > 5 else np.zeros(1)
    end = float(np.median(v[-max(3, len(v) // 5):]))            # pitch of the last fifth vs the whole line (st): + rises like a question, - falls like a verdict
    vo = np.concatenate([e[int(a / hop):int(b / hop)] for a, b in segs])
    fade = float(20 * np.log10(np.median(vo[-len(vo) // 4:]) / np.median(vo[:-len(vo) // 4]))) if len(vo) > 8 else 0.0   # last quarter vs the rest (dB): negative = trails off
    gaps = [round(segs[i + 1][0] - segs[i][1], 2) for i in range(len(segs) - 1)]
    return dict(dur=len(x) / SR, a=segs[0][0], b=segs[-1][1], gaps=[g for g in gaps if g > 0.15], lufs=lufs, f0=ps['med'], sd=ps['std_st'], rg=ps['rng_st'], br=brightness(x, segs), end=end, fade=fade)


if __name__ == '__main__':
    flt = sys.argv[1:]
    for jf in sorted(glob.glob(os.path.join(RAW, '*', '*', 'L*-t*.json'))):
        rel = os.path.relpath(jf, RAW).replace('\\', '/')[:-5]
        if not all(any(o in rel for o in f.split(',')) for f in flt): continue
        meta = json.load(open(jf, encoding='utf-8'))
        r = analyze(jf[:-5] + '.mp3')
        letters = sum(c.isalpha() for c in meta['text'])
        print(f"{rel:<36} dur {r['dur']:4.2f} speech {r['a']:.2f}-{r['b']:.2f} ({r['b'] - r['a']:.2f}s, {letters / (r['b'] - r['a']):4.1f} ch/s) lufs {r['lufs']:6.1f} f0 {r['f0']:4.0f}Hz sd {r['sd']:.2f}st rg {r['rg']:4.1f}st br {r['br']:5.0f}Hz end {r['end']:+4.1f}st fade {r['fade']:+5.1f}dB gaps {r['gaps']}  {meta['say'][:34]}")
