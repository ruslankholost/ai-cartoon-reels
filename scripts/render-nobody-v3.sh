#!/bin/sh
# sh scripts/render-nobody-v3.sh  ->  out/nobody-v3.mp4 (+ out/nobody-v3-phone.mp4, out/nobody-v3-cover.jpg, out/nobody-v3-sheet.jpg)
# "Nobody Picks Up" v3 in the South Park puppet look (src/NobodyV3.tsx). Puppet and scene prep is a separate step, run it when the pictures or the rigs change:
#   E:/Invoke/.venv/Scripts/python.exe -I scripts/sp-prep.py && E:/Invoke/.venv/Scripts/python.exe -I scripts/nv3-prep.py
# Here: timeline check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover ->
# loudness, speech check (stt-lines.py: every line heard over the mix) and the contact sheet. If a voice take changes: scripts/amp-build.py nobody first.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/nv3-check.mts
node scripts/eyes-check.mts
node scripts/nv3-cues.mts
$PY -I scripts/sp-mix.py scratch/nv3-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts NobodyV3 out/nobody-v3-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/nobody-v3-silent.mp4 -i scratch/nv3-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/nobody-v3.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio
ffmpeg -v error -y -i out/nobody-v3.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/nobody-v3-phone.mp4
# the cover: shot 1, Denise mid-shout under the ice-cold shower, the icicle grown, no captions
echo '[{"id":"NobodyV3","props":{"noCaps":true,"noCard":true},"frame":50,"out":"scratch/nv3-cover.png"}]' > scratch/nv3-cover-job.json
node scripts/still.mjs scratch/nv3-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/nv3-cover.png -q:v 2 out/nobody-v3-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/nobody-v3.mp4
sh scripts/loud.sh out/nobody-v3.mp4
ls -l out/nobody-v3.mp4 out/nobody-v3-phone.mp4 out/nobody-v3-cover.jpg
$PY -I scripts/stt-lines.py out/nobody-v3.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/nobody-v3.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/nobody-v3-sheet.jpg 8 270 scratch/mp4-labels.json
