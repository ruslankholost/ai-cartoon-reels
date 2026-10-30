# One-frame pops in a rendered cut: a frame that differs from the frame before AND the frame after while those two are alike (a flash, a thing that is there for exactly one frame). A cut is not one (the picture after it stays).
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/pops-check.py out/<ep>.mp4 [min_diff, default 1.2 grey levels (of 255) of mean change] [ratio, default 3]
# The picture is read at 135 x 240, grey. Prints the flagged frames (number, time, how much it differs from its neighbours, how much the neighbours differ from each other).
import subprocess, sys
import numpy as np

src = sys.argv[1]
lo = float(sys.argv[2]) if len(sys.argv) > 2 else 1.2
ratio = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
W, H = 135, 240
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
n = len(F)
D = np.r_[0, np.abs(F[1:] - F[:-1]).mean(axis=(1, 2))]   # D[i]: frame i against frame i-1
flag = []
for i in range(1, n - 1):
    e = float(np.abs(F[i + 1] - F[i - 1]).mean())          # the neighbours against each other
    a = min(D[i], D[i + 1])
    if a > lo and a > ratio * (e + 0.05): flag.append((i, a, e))
print(f'{n} frames, {len(flag)} one-frame pops (min change {lo}, ratio {ratio})')
for i, a, e in flag: print(f'  frame {i} ({i / 30:.2f} s): differs {a:.1f} from both neighbours, they differ {e:.2f} from each other')
