#!/bin/sh
# sh scripts/render-x08.sh  ->  out/x08-v1.mp4 (+ out/x08-v1-phone.mp4, out/x08-v1-cover.jpg, out/x08-v1-sheet.jpg); V=v2 sh scripts/render-x08.sh keeps v1 and writes the v2 files
# x08 "Just Let Me Pay" (src/X08.tsx, docs/x08-just-let-me-pay.md, the build spec), the shape of scripts/render-lips8.sh. The art is scripts/x08-art-gen.py's, cut by scripts/x08-prep.py; everything else is drawn in code. Here: cues -> audio mix
# (-14 LUFS, no bed) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet. The last shot runs into the first: the mix is not faded out in the last 0.1 s but for the
# 0.3 s tail that scripts/sp-mix.py always puts on a reel (the tap at 27.02 s is before it).
# If a voice take or a gap changes: scripts/voice-build.py x08, then scripts/amp-build.py x08 first.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
node scripts/x08-cues.mts
$PY -I scripts/sp-mix.py scratch/x08-mix.wav
t1=$(date +%s)
npx remotion render src/index.ts X08 out/x08-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x08-$V-silent.mp4 -i scratch/x08-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x08-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x08-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x08-$V-phone.mp4
# the cover: frame 2.77 s (his face buried under the pop-ups, three frames after the 4th slap's flash), no captions, "Just let me pay." over the top (Cover in src/x08-ui.tsx)
X08_COVER=1 node scripts/x08-stills.mts
node scripts/still.mjs scratch/x08-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x08-cover.png -q:v 2 out/x08-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x08-$V.mp4
sh scripts/loud.sh out/x08-$V.mp4
ls -l out/x08-$V.mp4 out/x08-$V-phone.mp4 out/x08-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x08-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x08-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x08-$V-sheet.jpg 8 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x08-$V.mp4 out/x08-$V-first3.jpg
