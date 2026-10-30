#!/bin/sh
# sh scripts/render-lips.sh  ->  out/lips-v2.mp4 (+ out/lips-v2-phone.mp4, out/lips-v2-cover.jpg, out/lips-v2-sheet.jpg); V=v3 sh scripts/render-lips.sh keeps v2 and writes the v3 files
# "Cold Lips" in the South Park puppet look (src/Lips.tsx, docs/x06-cold-lips.md, script v2): the coffee shop from the counter side (her shots, the cafe-back plate) and from the customer side (Denise's and Todd's, the counter plates of
# "Tip?"). Art and rig prep is a separate step, run it when the pictures change: scripts/lips-art-gen.py and scripts/lips-prep.py (the customer, her dog, Todd, the cafe-back plate: src/lips-rig.json, public/sp/lips-*).
# Here: timeline check -> pupils check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover -> loudness, speech check (stt-lines.py: every line
# heard over the mix) and the contact sheet. If a voice take or a gap changes: scripts/voice-build.py lips, then scripts/amp-build.py lips first.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v2}
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/lips-check.mts
node scripts/eyes-check.mts
node scripts/lips-cues.mts
$PY -I scripts/sp-mix.py scratch/lips-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Lips out/lips-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/lips-$V-silent.mp4 -i scratch/lips-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/lips-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (it has to stay under 50 MB)
ffmpeg -v error -y -i out/lips-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/lips-$V-phone.mp4
# the cover: a frame of shot 1 before she speaks (0.2 s, no captions, no share line) with "This is hot." in curly quotes over the top of it (Cover in src/lips-ui.tsx), inside the 3:4 crop of the profile grid (y 240-1680)
LIPS_COVER=1 node scripts/lips-stills.mts
node scripts/still.mjs scratch/lips-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/lips-cover.png -q:v 2 out/lips-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/lips-$V.mp4
sh scripts/loud.sh out/lips-$V.mp4
ls -l out/lips-$V.mp4 out/lips-$V-phone.mp4 out/lips-$V-cover.jpg
$PY -I scripts/stt-lines.py out/lips-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/lips-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/lips-$V-sheet.jpg 7 270 scratch/mp4-labels.json
