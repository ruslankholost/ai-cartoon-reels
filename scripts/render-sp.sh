#!/bin/sh
# sh scripts/render-sp.sh  ->  out/sp-call-test.mp4 (+ out/sp-call-test-phone.mp4, well under 25 MB, and out/sp-call-test-sheet.jpg): puppet prep is a separate step
# (E:/Invoke/.venv/Scripts/python.exe -I scripts/sp-prep.py). Cues -> audio mix -> silent render -> mux -> phone file -> checks.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/sp-check.mts
node scripts/sp-cues.mts
$PY -I scripts/sp-mix.py
npx remotion render src/index.ts SpCallTest out/sp-call-test-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
ffmpeg -v error -y -i out/sp-call-test-silent.mp4 -i scratch/sp-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/sp-call-test.mp4
# the phone file: the same picture at crf 24 under 5 Mbit (a few MB), 128k audio
ffmpeg -v error -y -i out/sp-call-test.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/sp-call-test-phone.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/sp-call-test.mp4
sh scripts/loud.sh out/sp-call-test.mp4
ls -l out/sp-call-test.mp4 out/sp-call-test-phone.mp4
$PY -I scripts/stt-lines.py out/sp-call-test.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/sp-call-test.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/sp-call-test-sheet.jpg 8 270 scratch/mp4-labels.json
