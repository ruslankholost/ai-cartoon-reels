# usage: E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/<ep>.mp4 out/<ep>-first3.jpg
# The first 2.8 s of a cut as one strip, a frame every 0.4 s, for the test viewers (docs/format.md, "The first 3 seconds").
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
TS = [0.0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8]
W, H, G = 270, 480, 6
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
strip = Image.new("RGB", (len(TS) * (W + G) + G, H + 2 * G + 28), (235, 235, 230))
draw = ImageDraw.Draw(strip)
with tempfile.TemporaryDirectory() as tmp:
    for i, t in enumerate(TS):
        png = os.path.join(tmp, f"{i}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", SRC, "-frames:v", "1", "-vf", f"scale={W}:{H}", png], check=True)
        strip.paste(Image.open(png).convert("RGB"), (G + i * (W + G), G))
        draw.text((G + 6 + i * (W + G), G + H + 4), f"{t:.1f} s", font=font, fill=(90, 90, 90))
strip.save(OUT, quality=88)
print(OUT, strip.size)
