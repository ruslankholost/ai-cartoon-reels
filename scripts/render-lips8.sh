#!/bin/sh
# sh scripts/render-lips8.sh  ->  out/lips8-v1.mp4 (+ out/lips8-v1-phone.mp4, out/lips8-v1-cover.jpg, out/lips8-v1-sheet.jpg); V=v2 sh scripts/render-lips8.sh keeps v1 and writes the v2 files
# "Cold Lips" v8 (src/Lips8.tsx, docs/x06-cold-lips.md, Script v8), the shape of scripts/render-lips.sh (v2). The art is v2's (scripts/lips-art-gen.py, scripts/lips-prep.py, scripts/lips-fix-art.py) plus her purple face
# (scripts/lips8-art.py); everything else new is drawn in code. Here: cues -> audio mix (-14 LUFS) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet.
# If a voice take or a gap changes: scripts/voice-build.py lips8, then scripts/amp-build.py lips8 first.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/lips8-cues.mts
$PY -I scripts/sp-mix.py scratch/lips8-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Lips8 out/lips8-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/lips8-$V-silent.mp4 -i scratch/lips8-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/lips8-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/lips8-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/lips8-$V-phone.mp4
# the cover: her purple face in shot 3, no captions, "TOO HOT!" in curly quotes over the top (Cover in src/lips8-ui.tsx)
LIPS_COVER=1 node scripts/lips8-stills.mts
node scripts/still.mjs scratch/lips8-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/lips8-cover.png -q:v 2 out/lips8-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/lips8-$V.mp4
sh scripts/loud.sh out/lips8-$V.mp4
ls -l out/lips8-$V.mp4 out/lips8-$V-phone.mp4 out/lips8-$V-cover.jpg
$PY -I scripts/stt-lines.py out/lips8-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/lips8-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/lips8-$V-sheet.jpg 8 240 scratch/mp4-labels.json
