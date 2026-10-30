# Cuts the realistic "Cold Lips" v8 (scripts/lips8real_shots.py) on the cartoon's clock: the 32 shots of src/lips8-sched.ts taken out of the generated clips, the review as a phone screen drawn here
# (the cartoon's "Write a review" screen of src/lips8-ui.tsx, full frame), "6:00 AM" over the morning. Sound: the cartoon's voice takes, the sound each silent shot made for itself, the café bed and the
# review's pops, ticks, tap and ding from the cartoon's cues, the sounds 8 dB under the voices, -14 LUFS.
#   node scripts/lips8-cues.mts && E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/lips8real-cut.py [v1]   ->  out/lips8-real/lips8-real-<v>.mp4 and -phone.mp4
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lips8real_shots import GENS, ROOT, OUT, FPS, SR, voice_track
from audiolib import decode
V = sys.argv[1] if len(sys.argv) > 1 else "v1"
W, H = 1080, 1920
CUES = json.load(open(ROOT / "scratch" / "cues.json", encoding="utf-8"))
TOTAL = CUES["total"]
starts = [s["start"] for s in CUES["shots"]]
SHOTS = [(s["key"], s["start"], starts[i + 1] if i + 1 < len(starts) else TOTAL) for i, s in enumerate(CUES["shots"])]
GEN_OF = {k: g for g in GENS for k in g[1]}
ZOOM = {"hotClose": (1.35, 0.5, 0.36), "rubFeet": (1.25, 0.5, 0.38)}  # a punch-in makes the second shot of one take: scale, centre x, centre y (fractions of the clip)
OFFSET = {"throw": 0.29, "soaked": 0.17, "vault": 0.25, "bill": 0.08, "turnPost": 0.25, "twitch": 0.2, "windup": 0.25}  # seconds a silent shot starts later inside its clip, read off the clips' frames (the splash, the cup landing, the landing...)
REVIEW_T = dict(s26=29.6667, typeStart=29.8333, postT=30.4, dingT=30.4333, stars=[29.6667 + 0.1 * i for i in range(5)])
REVIEW = "Cold hands. Never coming back."
TMP = OUT / "tmp"; TMP.mkdir(parents=True, exist_ok=True)
F = lambda name, size: ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


def star(d, cx, cy, r, fill, line, width):
    import math
    pts = [(cx + (r if i % 2 == 0 else r * 0.45) * math.sin(math.pi * i / 5), cy - (r if i % 2 == 0 else r * 0.45) * math.cos(math.pi * i / 5)) for i in range(10)]
    d.polygon(pts, fill=fill, outline=line, width=width)


def review_frame(t):
    im = Image.new("RGB", (W, H), "#f6f7f9"); d = ImageDraw.Draw(im)
    d.text((70, 40), "7:58", font=F("seguisb.ttf", 44), fill="#1b2430")
    d.rounded_rectangle((930, 52, 1010, 88), 8, outline="#1b2430", width=4); d.rectangle((938, 60, 990, 80), fill="#1b2430")
    d.rectangle((0, 120, W, 300), fill="#f4f5f7"); d.rectangle((0, 300, W, 306), fill="#cfd5dc")
    d.line([(100, 170), (65, 210), (100, 250)], fill="#2f7df6", width=12, joint="curve")
    d.text((W / 2, 212), "Write a review", font=F("segoeuib.ttf", 66), fill="#1b2430", anchor="mm")
    d.text((70, 400), "Your rating", font=F("seguisb.ttf", 48), fill="#6a7686")
    for i, t0 in enumerate(REVIEW_T["stars"]):
        a = t - t0
        if a < 0: continue
        s = 1.15 * min(1, a / 0.07) if a < 0.07 else 1.15 - 0.15 * min(1, (a - 0.07) / 0.1)
        star(d, 150 + 195 * i, 560, 78 * s, "#f5b50a" if i == 0 else None, "#b27d00" if i == 0 else "#b4bcc7", 7)
    d.text((70, 740), "Your review", font=F("seguisb.ttf", 48), fill="#6a7686")
    d.rounded_rectangle((50, 810, W - 50, 1400), 34, fill="#fbfbfc", outline="#cfd5dc", width=5)
    n = 0 if t < REVIEW_T["typeStart"] else min(len(REVIEW), int((t - REVIEW_T["typeStart"]) * 60) + 2)
    font, lines, cur = F("segoeui.ttf", 72), [], ""
    for w in REVIEW[:n].split(" "):
        if cur and d.textlength(cur + " " + w, font=font) > 900: lines.append(cur); cur = w
        else: cur = (cur + " " + w) if cur else w
    lines.append(cur)
    for i, l in enumerate(lines): d.text((95, 860 + 100 * i), l, font=font, fill="#101418")
    if 0 < n < len(REVIEW): d.rectangle((95 + d.textlength(lines[-1], font=font) + 6, 870 + 100 * (len(lines) - 1), 101 + d.textlength(lines[-1], font=font) + 6, 950 + 100 * (len(lines) - 1)), fill="#2f7df6")
    press = 1 if REVIEW_T["postT"] - 0.02 <= t < REVIEW_T["postT"] + 0.1 else 0
    y = 1520 + 14 * press
    posted = t >= REVIEW_T["dingT"]
    d.rounded_rectangle((50, y, W - 50, y + 170), 85, fill="#2a9d5c" if posted else "#e3121b" if n >= len(REVIEW) else "#c4ccd6")
    d.text((W / 2, y + 85), "Posted" if posted else "POST", font=F("segoeuib.ttf", 76), fill="#ffffff", anchor="mm")
    if REVIEW_T["postT"] - 0.06 <= t < REVIEW_T["postT"] + 0.16:  # the finger's tap
        o = Image.new("RGBA", (W, H)); ImageDraw.Draw(o).ellipse((W / 2 - 80, y + 5, W / 2 + 80, y + 165), fill=(60, 60, 60, 90)); im = Image.alpha_composite(im.convert("RGBA"), o).convert("RGB")
    return im


def card(text):  # "6:00 AM", big white letters with a dark edge, as a transparent overlay
    im = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(im)
    d.text((W / 2, 330), text, font=F("segoeuib.ttf", 190), fill="white", anchor="mm", stroke_width=12, stroke_fill=(20, 20, 20, 255))
    p = TMP / "card.png"; im.save(p); return p


def segment(i, key, t0, t1):
    f0, f1 = round(t0 * FPS), round(t1 * FPS); n = f1 - f0
    out = TMP / f"seg{i:02d}.mp4"
    enc = ["-c:v", "libx264", "-crf", "14", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an", str(out)]
    if key == "review":
        raw = b"".join(review_frame((f0 + k) / FPS).tobytes() for k in range(n))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", *enc], input=raw, check=True)
        return out, n
    g = GEN_OF[key]
    src = OUT / "shots" / f"{g[0]}.mp4"
    a = f0 - round(g[2] * FPS) + round(OFFSET.get(key, 0) * FPS)
    z, cx, cy = ZOOM.get(key, (1.0, 0.5, 0.45))
    cw = 704 / z; ch = cw * H / W
    x, y = min(max(cx * 704 - cw / 2, 0), 704 - cw), min(max(cy * 1280 - ch / 2, 0), 1280 - ch)
    vf = f"select='between(n\\,{a}\\,{a + n - 1})',setpts=N/{FPS}/TB,crop={cw:.0f}:{ch:.0f}:{x:.0f}:{y:.0f},scale={W}:{H}:flags=lanczos,tpad=stop_mode=clone:stop={n}"
    if key == "morning":
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-i", str(card("6:00 AM")), "-filter_complex", f"[0:v]{vf}[v];[v][1:v]overlay=0:0", "-frames:v", str(n), *enc], check=True)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", vf, "-frames:v", str(n), *enc], check=True)
    return out, n


def mix_audio():
    N = int((TOTAL + 0.5) * SR); end_i = round(round(TOTAL * FPS) / FPS * SR)
    voice = voice_track()[:N]; voice = np.pad(voice, (0, N - len(voice)))
    fx = np.zeros(N, dtype=np.float32)
    def put(x, at, gain_db=0.0):
        i = int(round(at * SR)); j = min(N, i + len(x))
        if j > i: fx[i:j] += x[:j - i] * 10 ** (gain_db / 20)
    for c in CUES["cues"]:  # the café bed under everything and the review screen's sounds
        if c["name"] == "cafebed" or (c["name"] in ("pop", "tick", "tap", "ding") and 29.5 < c["at"] < 30.6):
            x = decode(str(ROOT / "public" / "sfx" / f"{c['name']}.mp3"), SR)[int(c.get("from", 0) * SR):]
            if c.get("len"): x = x[:int(c["len"] * SR)]
            if c.get("fade"): g = min(len(x), int(c["fade"] * SR)); x = x.copy(); x[-g:] *= np.linspace(1, 0, g)
            put(x, c["at"], c.get("db", 0))
    for key, t0, t1 in SHOTS:  # the sound a silent shot made for itself, with 15 ms fades at the cuts
        g = GEN_OF.get(key)
        if g is None or g[5]: continue
        x = decode(str(OUT / "shots" / f"{g[0]}.mp4"), SR)
        s = int(round((t0 - g[2] + OFFSET.get(key, 0)) * SR)); x = x[s:s + int(round((t1 - t0) * SR))].copy()
        k = min(len(x) // 2, int(0.015 * SR)); x[:k] *= np.linspace(0, 1, k); x[len(x) - k:] *= np.linspace(1, 0, k)
        put(x, t0, -3)
    hop = 0.01; h = int(hop * SR); nf = N // h  # the sounds sit 8 dB lower while somebody talks (sp-mix.py's duck)
    env = np.sqrt(np.convolve(voice[:nf * h] ** 2, np.ones(3 * h) / (3 * h), "same")[::h])
    act = (env > 10 ** (-50 / 20)).astype(float); duck = np.zeros(nf)
    for i in range(nf):
        prev = duck[i - 1] if i else 0.0
        duck[i] = prev + (act[i] - prev) * ((1 - np.exp(-hop / 0.03)) if act[i] > prev else (1 - np.exp(-hop / 0.25)))
    mix = voice + fx * (1 - np.interp(np.arange(N) / SR, (np.arange(nf) + 0.5) * hop, duck) * (1 - 10 ** (-8 / 20))).astype(np.float32)
    fo = int(0.05 * SR); mix[end_i - fo:end_i] *= np.linspace(1, 0, fo); mix = mix[:end_i]
    st = np.ascontiguousarray(np.stack([mix, mix], axis=1), dtype=np.float32)
    def lufs(x):
        t = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "ebur128=peak=true", "-f", "null", "-"], input=x.tobytes(), capture_output=True).stderr.decode(errors="ignore")
        s = t[t.rfind("Summary:"):]; return float(s.split("I:")[1].split("LUFS")[0])
    st *= 10 ** ((-14 - lufs(st)) / 20)
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "alimiter=limit=0.8:attack=3:release=60:level=disabled", "-f", "f32le", "-"], input=st.tobytes(), capture_output=True, check=True)
    st = np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2)
    wav = TMP / "mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(wav)], input=st.tobytes(), check=True)
    return wav


segs = [segment(i, k, t0, t1) for i, (k, t0, t1) in enumerate(SHOTS)]
(TMP / "concat.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p, _ in segs), encoding="utf-8")
silent = TMP / "silent.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(TMP / "concat.txt"), "-c", "copy", str(silent)], check=True)
wav = mix_audio()
final = OUT / f"lips8-real-{V}.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", str(final)], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-c:v", "libx264", "-crf", "24", "-maxrate", "5000k", "-bufsize", "10000k", "-preset", "slow", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart", str(OUT / f"lips8-real-{V}-phone.mp4")], check=True)
print("frames", sum(n for _, n in segs), "->", final)
