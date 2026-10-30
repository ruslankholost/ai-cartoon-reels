#!/bin/sh
# sh scripts/render-tip.sh  ->  out/tip-v3.mp4 (+ out/tip-v3-phone.mp4, out/tip-v3-cover.jpg, out/tip-v3-sheet.jpg); the v1 and v2 files in out/ are left alone
# "Tip?" in the South Park puppet look (src/Tip.tsx, docs/x02-tip.md, script v3). Art and rig prep is a separate step, run it when the pictures or the rigs change:
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/tip-art-gen.py   then   E:/Invoke/.venv/Scripts/python.exe -I scripts/tip-prep.py   then   E:/Invoke/.venv/Scripts/python.exe -I scripts/tip-upscale.py
# (the last one makes the 4x crops of the terminal and the kiosk that the inserts show larger than 1.6 times: public/sp/tip-*-r4.*, src/tip-crops.json)
# Here: timeline check -> pupils check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover ->
# loudness, speech check (stt-lines.py: every line heard over the mix) and the contact sheet. If a voice take or a gap changes: scripts/voice-build.py tip, then scripts/amp-build.py tip first.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/tip-check.mts
node scripts/eyes-check.mts
node scripts/tip-cues.mts
$PY -I scripts/sp-mix.py scratch/tip-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Tip out/tip-v3-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/tip-v3-silent.mp4 -i scratch/tip-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/tip-v3.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio
ffmpeg -v error -y -i out/tip-v3.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/tip-v3-phone.mp4
# the cover: frame 0 (the terminal mid-swing, the screen readable), no captions
echo '[{"id":"Tip","props":{"noCaps":true,"noShare":true},"frame":0,"out":"scratch/tip-cover.png"}]' > scratch/tip-cover-job.json
node scripts/still.mjs scratch/tip-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/tip-cover.png -q:v 2 out/tip-v3-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/tip-v3.mp4
sh scripts/loud.sh out/tip-v3.mp4
ls -l out/tip-v3.mp4 out/tip-v3-phone.mp4 out/tip-v3-cover.jpg
$PY -I scripts/stt-lines.py out/tip-v3.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/tip-v3.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/tip-v3-sheet.jpg 8 270 scratch/mp4-labels.json
