# python scripts/mp4-frames.py video.mp4 [fps, default 30]  ->  scratch/mp4/NN-key.png (the middle frame of every shot, taken from the video itself) + scratch/mp4-labels.json
import json, os, subprocess, sys
J = json.load(open('scratch/cues.json', encoding='utf-8'))
os.makedirs('scratch/mp4', exist_ok=True)
labels = []
for i, s in enumerate(J['shots']):
    t = (s['start'] + s['end']) / 2
    frame = round(t * (float(sys.argv[2]) if len(sys.argv) > 2 else 30))
    out = f"scratch/mp4/{i + 1:02d}-{s['key']}.png"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-vf', 'select=eq(n\,%d)' % frame, '-frames:v', '1', out], check=True)
    labels.append({'label': f"{i + 1} {s['key']} {t:.2f}s", 'path': out})
json.dump(labels, open('scratch/mp4-labels.json', 'w'))
print(len(labels), 'frames')
