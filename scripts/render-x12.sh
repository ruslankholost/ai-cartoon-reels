#!/bin/sh
# sh scripts/render-x12.sh  ->  out/x12-v1.mp4 (+ out/x12-v1-phone.mp4, out/x12-v1-cover.jpg, out/x12-v1-sheet.jpg, out/x12-v1-first3.jpg); V=v2 sh scripts/render-x12.sh keeps v1 and writes the v2 files
# x12 "Speak to the Manager" (src/X12.tsx, docs/x12-speak-to-the-manager.md, the build spec), the shape of scripts/render-x11.sh. The art is scripts/x12-art-gen.py's, cut by scripts/x12-prep.py (src/x12-rig.json); everything else is drawn in
# code. Here: God's line 8 with its hall echo -> cues -> audio mix (-14 LUFS, no bed) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet. The last shot runs into the
# first (the bell): the mix is not faded out in the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes: scripts/voice-build.py x12, then scripts/amp-build.py x12 first (and the shots
# move to the words: src/x12-sched.ts).
# AUDIO=1 stops after the mix (scratch/x12-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
mkdir -p scratch
# line 8 is God's: a hall echo and a little more bass over his voice file, at the loudness of the file (scratch/x12-08-echo.wav; scripts/x12-cues.mts points the mix at it)
$PY -I scripts/x12-echo.py
node scripts/x12-cues.mts
$PY -I scripts/sp-mix.py scratch/x12-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x12-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X12 out/x12-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x12-$V-silent.mp4 -i scratch/x12-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x12-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x12-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x12-$V-phone.mp4
# the cover: the frame of src/x12-stills.mts (Chuck's face just snapped to purple, 0.4 s after the snap), no captions, "I WANT THE MANAGER" in big text over the top (Cover in src/x12-ui.tsx)
X12_COVER=1 node scripts/x12-stills.mts
node scripts/still.mjs scratch/x12-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x12-cover.png -q:v 2 out/x12-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x12-$V.mp4
sh scripts/loud.sh out/x12-$V.mp4
ls -l out/x12-$V.mp4 out/x12-$V-phone.mp4 out/x12-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x12-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x12-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x12-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x12-$V.mp4 out/x12-$V-first3.jpg
