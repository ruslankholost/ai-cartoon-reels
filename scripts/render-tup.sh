#!/bin/sh
# sh scripts/render-tup.sh  ->  out/tup-v1.mp4 (+ out/tup-v1-phone.mp4, out/tup-v1-cover.jpg, out/tup-v1-sheet.jpg)
# "I'm Just Supporting a Friend" in the South Park puppet look (src/Tup.tsx, docs/x05-supporting-a-friend.md, script v4): the garage in colour, the Tupperware story in sepia. Art and rig prep is a separate step, run it when the
# pictures change: scripts/tup-art-gen.py and scripts/tup-prep.py (the bowl, the lid, the hands, the gift box), scripts/tup-plates.py (the cuts of existing pictures), and Pen's rig prep (src/pen-rig.json, public/sp/pen-*).
# Here: timeline check -> pupils check -> cues -> audio mix (-14 LUFS, true peak under -1.5 dBTP after the AAC encodes) -> silent render -> mux -> phone file -> cover ->
# loudness, speech check (stt-lines.py: every line heard over the mix) and the contact sheet. If a voice take or a gap changes: scripts/voice-build.py tup, then scripts/amp-build.py tup first.
set -e
cd "$(dirname "$0")/.."
V=v1
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/tup-check.mts
node scripts/eyes-check.mts
node scripts/tup-cues.mts
$PY -I scripts/sp-mix.py scratch/tup-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts Tup out/tup-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/tup-$V-silent.mp4 -i scratch/tup-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/tup-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio
ffmpeg -v error -y -i out/tup-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/tup-$V-phone.mp4
# the cover: a frame of the last shot (the wide with Denise and Rhonda in their chairs), 0.2 s before the end, with "I'm just supporting a friend." in quotes over their heads (Cover in src/tup-ui.tsx)
TUP_COVER=1 node scripts/tup-stills.mts
node scripts/still.mjs scratch/tup-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/tup-cover.png -q:v 2 out/tup-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/tup-$V.mp4
sh scripts/loud.sh out/tup-$V.mp4
ls -l out/tup-$V.mp4 out/tup-$V-phone.mp4 out/tup-$V-cover.jpg
$PY -I scripts/stt-lines.py out/tup-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/tup-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/tup-$V-sheet.jpg 8 270 scratch/mp4-labels.json
