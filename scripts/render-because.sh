#!/bin/sh
# sh scripts/render-because.sh  ->  out/because-v1.mp4 (+ out/because-v1-phone.mp4, out/because-v1-cover.jpg, out/because-v1-sheet.jpg)
# "Because" in the South Park puppet look (src/Because.tsx, docs/x03-because.md, script v5). Art and rig prep is a separate step, run it when the pictures or the rigs change:
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/because-art-gen.py   then   E:/Invoke/.venv/Scripts/python.exe -I scripts/because-prep.py   then   E:/Invoke/.venv/Scripts/python.exe -I scripts/because-upscale.py
# (the last one makes the 4x crop of the customer-facing screen that the insert shows at about 1.5 times: public/sp/because-screen-r4.png, src/because-crops.json)
# Here: timeline check -> pupils check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover ->
# loudness, speech check (stt-lines.py: every line heard over the mix) and the contact sheet. If a voice take or a gap changes: scripts/voice-build.py because, then scripts/amp-build.py because first.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/because-check.mts
node scripts/eyes-check.mts
node scripts/because-cues.mts
$PY -I scripts/sp-mix.py scratch/because-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Because out/because-v1-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/because-v1-silent.mp4 -i scratch/because-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/because-v1.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio
ffmpeg -v error -y -i out/because-v1.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/because-v1-phone.mp4
# the cover: frame 780 (Denise wide-eyed in the paper hat) with the final total over her head and "Just a cheeseburger." under it (Cover in src/because-ui.tsx)
echo '[{"id":"Because","props":{"noCaps":true,"noShare":true,"noHud":true,"cover":true},"frame":780,"out":"scratch/because-cover.png"}]' > scratch/because-cover-job.json
node scripts/still.mjs scratch/because-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/because-cover.png -q:v 2 out/because-v1-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/because-v1.mp4
sh scripts/loud.sh out/because-v1.mp4
ls -l out/because-v1.mp4 out/because-v1-phone.mp4 out/because-v1-cover.jpg
$PY -I scripts/stt-lines.py out/because-v1.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/because-v1.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/because-v1-sheet.jpg 8 270 scratch/mp4-labels.json
