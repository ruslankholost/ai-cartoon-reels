# analyze the raw takes: voiced stretches, gaps, loudness, pitch spread (flatter = more deadpan)
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import *
pat = sys.argv[1] if len(sys.argv) > 1 else 'scratch/vo-raw/s*-t*.mp3'
for f in sorted(glob.glob(pat)):
    x = decode(f)
    e, hop = envelope(x)
    segs = segments(e, hop, thr_db=-40, min_len=0.04, merge=0.06)
    lufs, tp = loudness(x)
    ps = pitch_stats(f0_track(x))
    gaps = [round(segs[i + 1][0] - segs[i][1], 2) for i in range(len(segs) - 1)]
    voiced = sum(b - a for a, b in segs)
    print(f"{os.path.basename(f)[:-4]:<10} dur {len(x)/SR:5.2f}  speech {segs[0][0]:.2f}-{segs[-1][1]:.2f}  voiced {voiced:4.2f}  gaps>0.12 {[g for g in gaps if g > 0.12]}  lufs {lufs:6.1f}  f0 med {ps['med']:5.0f}Hz std {ps['std_st']:.2f}st rng {ps['rng_st']:.1f}st")
