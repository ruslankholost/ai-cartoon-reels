#!/bin/sh
# sh scripts/render-v1.sh  ->  out/friday-lead-v1.mp4: timeline cues -> audio mix -> silent render -> mux (metadata stripped)
# After a voice swap run  E:/talking-reel/.venv/Scripts/python.exe -I scripts/amp-build.py  first (mouths follow the new takes).
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/cues.mts
$PY -I scripts/mix.py
npx remotion render src/index.ts FridayNightLead out/friday-lead-v1-silent.mp4 --concurrency=8 --codec=h264 --crf=15 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
ffmpeg -v error -y -i out/friday-lead-v1-silent.mp4 -i scratch/mix.wav -map 0:v -map 1:a -c:v copy \
  -bsf:v "filter_units=remove_types=6,h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact -movflags +faststart out/friday-lead-v1.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/friday-lead-v1.mp4
sh scripts/loud.sh out/friday-lead-v1.mp4
