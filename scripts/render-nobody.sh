#!/bin/sh
# sh scripts/render-nobody.sh  ->  out/nobody-v1.mp4 (+ out/nobody-v1-phone.mp4, out/nobody-cover.jpg): amp -> cues -> audio mix -> silent render -> mux
# Needs public/music/nobody-bed.mp3 and the clips in public/sfx (scripts/sfx-build.py). If the voices change: amp-build.py nobody first.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/nb-cues.mts
$PY -I scripts/mix.py public/music/nobody-bed.mp3
npx remotion render src/index.ts Nobody out/nobody-v1-silent.mp4 --concurrency=8 --codec=h264 --crf=15 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
# the film grain does not compress: the main file is crf 21, the phone file a 2-pass 7 Mbit encode (under 45 MB)
ffmpeg -v error -y -i out/nobody-v1-silent.mp4 -i scratch/mix.wav -map 0:v -map 1:a -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p   -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact -movflags +faststart out/nobody-v1.mp4
ffmpeg -v error -y -i out/nobody-v1.mp4 -c:v libx264 -b:v 7000k -preset slow -pix_fmt yuv420p -pass 1 -passlogfile scratch/ff2 -an -f null -
ffmpeg -v error -y -i out/nobody-v1.mp4 -c:v libx264 -b:v 7000k -preset slow -pix_fmt yuv420p -pass 2 -passlogfile scratch/ff2 -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/nobody-v1-phone.mp4
echo '[{"id":"Nobody","props":{"noCaps":true},"frame":35,"out":"scratch/cover.png"}]' > scratch/cover-job.json
node scripts/still.mjs scratch/cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/cover.png -q:v 2 out/nobody-cover.jpg
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/nobody-v1.mp4
sh scripts/loud.sh out/nobody-v1.mp4
ls -l out/nobody-v1-phone.mp4
