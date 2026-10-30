#!/bin/sh
# sh scripts/render-x16.sh  ->  out/x16-v1.mp4 (+ out/x16-v1-phone.mp4, out/x16-v1-cover.jpg, out/x16-v1-sheet.jpg, out/x16-v1-first3.jpg); V=v2 sh scripts/render-x16.sh keeps v1 and writes the v2 files
# x16 "Hiring a Zoomer" (src/X16.tsx, docs/x16-hiring-a-zoomer.md, the build spec), the shape of scripts/render-x15.sh. The art is scripts/x16-art-gen.py's, cut by scripts/x16-prep.py (src/x16-rig.json); everything else is drawn in code. Here: cues -> audio
# mix (-14 LUFS, no bed; Mom's first two lines through a phone's band-pass, scripts/sp-mix.py) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet (a still of every shot at
# its named moment). The last shot (the ring light blazes, the frame blooms white) runs into the first: the mix is not faded out in the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes:
# scripts/voice-build.py x16, then scripts/amp-build.py x16 first (and the shots move to the words: src/x16-sched.ts).
# AUDIO=1 stops after the mix (scratch/x16-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
mkdir -p scratch
node scripts/x16-cues.mts
$PY -I scripts/sp-mix.py scratch/x16-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x16-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X16 out/x16-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x16-$V-silent.mp4 -i scratch/x16-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x16-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x16-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x16-$V-phone.mp4
# the cover: the frame of scripts/x16-stills.mts (shot 20 three frames after the THUNK: Ross with the flagpole on his head, his eyes bulging), no captions, "POV: HIRING A ZOOMER" in big text under his chin (Cover in src/x16-ui.tsx)
X16_COVER=1 node scripts/x16-stills.mts
node scripts/still.mjs scratch/x16-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x16-cover.png -q:v 2 out/x16-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x16-$V.mp4
sh scripts/loud.sh out/x16-$V.mp4
ls -l out/x16-$V.mp4 out/x16-$V-phone.mp4 out/x16-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x16-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x16-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x16-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x16-$V.mp4 out/x16-$V-first3.jpg
