#!/bin/sh
# sh scripts/render-pen.sh  ->  out/pen-v2.mp4 (+ out/pen-v2-phone.mp4, out/pen-v2-cover.jpg, out/pen-v2-sheet.jpg); v1 (the story cut, 67 s) stays as out/pen-v1.*
# "I'm Just Not a Sales Person" v2, the satire cut (about 40 s, 29 shots), in the South Park puppet look (src/Pen.tsx, docs/x04-sell-me-this-pen.md). Art and rig prep is a separate step, run it when the pictures or the rigs change:
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/pen-art-gen.py   then the rig prep that cuts the pictures into src/pen-rig.json and public/sp/pen-*
# Here: timeline check -> pupils check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover ->
# loudness, speech check (stt-lines.py: every line heard over the mix) and the contact sheet. If a voice take or a gap changes: scripts/voice-build.py pen, then scripts/amp-build.py pen first.
set -e
cd "$(dirname "$0")/.."
V=v2
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/pen-check.mts
node scripts/eyes-check.mts
node scripts/pen-cues.mts
$PY -I scripts/sp-mix.py scratch/pen-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Pen out/pen-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/pen-$V-silent.mp4 -i scratch/pen-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/pen-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio
ffmpeg -v error -y -i out/pen-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/pen-$V-phone.mp4
# the cover: a frame of the last shot (the wide with Denise and Rhonda), 0.2 s before the end, with "I'm just not a sales person." in quotes over their heads (Cover in src/pen-ui.tsx)
PEN_COVER=1 node scripts/pen-stills.mts
node scripts/still.mjs scratch/pen-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/pen-cover.png -q:v 2 out/pen-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/pen-$V.mp4
sh scripts/loud.sh out/pen-$V.mp4
ls -l out/pen-$V.mp4 out/pen-$V-phone.mp4 out/pen-$V-cover.jpg
$PY -I scripts/stt-lines.py out/pen-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/pen-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/pen-$V-sheet.jpg 8 270 scratch/mp4-labels.json
