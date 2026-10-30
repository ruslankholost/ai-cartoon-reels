# Where does each sound clip peak? A hit is placed so that its peak lands on the frame of the picture's impact, not its first sample
# (scripts/nv3-cues.mts through src/nv3-sched.ts onPeak). Measured on the clips in public/sfx: the peak of the 3 ms RMS envelope, hop 1 ms, in seconds from the clip's start.
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/sfx-peaks.py      -> src/sfx-peaks.json
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode, envelope

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = {}
for f in sorted(os.listdir(os.path.join(root, 'public', 'sfx'))):
    if not f.endswith('.mp3'): continue
    x = decode(os.path.join(root, 'public', 'sfx', f), 44100, 1)
    e, hop = envelope(x, 44100, 0.001, 0.003)
    out[f[:-4]] = round(float(int(np.argmax(e)) * hop), 3)
json.dump(out, open(os.path.join(root, 'src', 'sfx-peaks.json'), 'w'), indent=1)
print(len(out), 'clips;', {k: out[k] for k in ('thud', 'flip', 'tap', 'pickup', 'ring', 'buzz') if k in out})
