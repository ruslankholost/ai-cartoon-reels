# E:/talking-reel/.venv/Scripts/python.exe -I scripts/x12-echo.py  ->  scratch/x12-08-echo.wav
# x12 "Speak to the Manager": line 8 ("...Speaking.") is God's. His file (public/x12/08-ross.mp3) goes through a hall echo (three repeats at 110, 230 and 370 ms, each quieter: close repeats smeared the K of "Speaking" into "Speeding" for Whisper) and a little more bass,
# at the loudness of the file before it plus 1.5 dB (the echo adds energy: the gain brings the line back to it, the 1.5 dB keep the dry word above its own echoes), with half a second of silence after it for the repeats to ring out; scripts/x12-cues.mts points the mix at the result (a rebuild of the voices cannot undo it). Whisper must still hear the word in the final mix.
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode, loudness, write_wav

SR = 48000
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
x = decode(os.path.join(root, 'public', 'x12', '08-ross.mp3'), SR)
pad = np.concatenate([x, np.zeros(int(0.5 * SR), dtype=np.float32)])
p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', 'aecho=0.9:1.0:110|230|370:0.4|0.28|0.18,bass=g=3:f=180', '-f', 'f32le', '-'], input=pad.tobytes(), capture_output=True, check=True)
y = np.frombuffer(p.stdout, dtype=np.float32).copy()
lx, ly = loudness(x, SR)[0], loudness(y, SR)[0]
g = 10 ** ((lx - ly + 1.5) / 20)
y = y * g
peak = float(np.abs(y).max())
if peak > 0.95: y = y * (0.95 / peak)
os.makedirs(os.path.join(root, 'scratch'), exist_ok=True)
write_wav(os.path.join(root, 'scratch', 'x12-08-echo.wav'), y, SR)
print(f'x12-08-echo.wav: {len(y) / SR:.2f} s, file {lx:.1f} LUFS, echoed {ly:.1f} LUFS, gain {20 * np.log10(g):+.1f} dB, peak {np.abs(y).max():.2f}')
