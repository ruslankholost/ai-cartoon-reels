#!/bin/sh
# sh scripts/render-ep.sh be-chad BeChad  ->  out/be-chad-v1.mp4, from the clips made by scripts/shots.py <episode> keys, then clips:
# edit list + cue file -> audio mix (lines + table-read sounds + public/music/<episode>-bed.mp3) -> silent render -> mux (metadata stripped)
set -e
cd "$(dirname "$0")/.."
EP=$1; COMP=$2
PY=E:/talking-reel/.venv/Scripts/python.exe
E:/Wan2GP/env_uv/Scripts/python.exe scripts/shots.py "$EP" edit
$PY -I scripts/mix.py "public/music/$EP-bed.mp3" "scratch/mix-$EP.wav" "scratch/cues-$EP.json"
npx remotion render src/index.ts "$COMP" "out/$EP-v1-silent.mp4" --concurrency=6 --codec=h264 --crf=15 --muted --gl=angle --image-format=jpeg --jpeg-quality=95 --pixel-format=yuv420p --log=warn
ffmpeg -v error -y -i "out/$EP-v1-silent.mp4" -i "scratch/mix-$EP.wav" -map 0:v -map 1:a -c:v copy \
  -bsf:v "filter_units=remove_types=6,h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact -movflags +faststart "out/$EP-v1.mp4"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "out/$EP-v1.mp4"
sh scripts/loud.sh "out/$EP-v1.mp4"
