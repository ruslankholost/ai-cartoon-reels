# E:/Invoke/.venv/Scripts/python.exe -I scripts/lip-lag.py key [key ...]  (mediapipe; reads out/lips8-real/shots/<key>.mp4 and the voice it was given, out/lips8-real/audio/<key>.wav)  ->  per clip: the frames with voice and the frames with an open mouth as two strips, and the shift where they agree best
# (lag > 0: the lips move first and the sound comes later). Made for the realistic Cold Lips test (docs/x06-cold-lips.md, "Realistic test"): one face per clip, 24 fps.
import subprocess, sys
import numpy as np
import mediapipe as mp
D = "E:/getphantom-toons/out/lips8-real/"; FPS, SR, W, H = 24, 16000, 704, 1280
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
for key in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", D + f"shots/{key}.mp4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W, 3)
    m = []
    for f in fr:
        r = fm.process(f)
        if not r.multi_face_landmarks: m.append(np.nan); continue
        p = r.multi_face_landmarks[0].landmark; m.append(abs(p[13].y - p[14].y) / (abs(p[10].y - p[152].y) + 1e-6))
    m = np.array(m); ok = ~np.isnan(m); m = np.interp(np.arange(len(m)), np.flatnonzero(ok), m[ok])
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", D + f"audio/{key}.wav", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout, dtype=np.int16).astype(np.float32) / 32768
    hop = SR // FPS; e = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(len(m))])
    speech = 20 * np.log10(e) > 20 * np.log10(e.max()) - 25
    opn = m > np.percentile(m, 20) + 0.35 * (np.percentile(m, 95) - np.percentile(m, 20))
    print(f"{key:10s} speech {''.join('#' if s else '.' for s in speech)}")
    print(f"{'':10s} mouth  {''.join('#' if s else '.' for s in opn)}")
    sc = []
    for lag in range(-15, 16):
        a, b = (opn[:len(opn) - lag], speech[lag:]) if lag >= 0 else (opn[-lag:], speech[:len(speech) + lag])
        sc.append((np.mean(a == b), lag))
    best = max(sc)
    print(f"{'':10s} best lag {best[1]:+d} fr ({best[1] * 1000 / FPS:+.0f} ms), agreement {best[0]:.2f} (at lag 0: {dict((l, s) for s, l in sc)[0]:.2f})")
