#!/bin/sh
# sh scripts/render-x18.sh  ->  out/x18-v1.mp4 (+ out/x18-v1-phone.mp4, out/x18-v1-cover.jpg, out/x18-v1-sheet.jpg, out/x18-v1-first3.jpg); V=v2 sh scripts/render-x18.sh keeps v1 and writes the v2 files
# x18 "Unattended" (src/X18.tsx, docs/x18-unattended.md, the build spec), the shape of scripts/render-x17.sh. The art is scripts/x18-art-gen.py's, cut by scripts/x18-prep.py (src/x18-rig.json); everything else is drawn in code. Here: cues -> audio
# mix (-14 LUFS; every sound is ducked under the voices; scripts/sp-mix.py) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet (a still of every picture at its
# named moment). The last shot (the toddler tips the oat milk over the till again) runs into the first (the drawer springs open): the mix is not faded out in the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel.
# If a voice take or a gap changes: scripts/voice-build.py x18, then scripts/amp-build.py x18 first (and the shots move to the words: src/x18-sched.ts).
# AUDIO=1 stops after the mix (scratch/x18-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
mkdir -p scratch
node scripts/x18-cues.mts
$PY -I scripts/sp-mix.py scratch/x18-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x18-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X18 out/x18-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x18-$V-silent.mp4 -i scratch/x18-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x18-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x18-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x18-$V-phone.mp4
# the cover: the frame of scripts/x18-stills.mts (shot 2, the toddler pouring the oat milk into the till), no captions, "POV: YOU OWN A CAFÉ" in big text (Cover in src/x18-ui.tsx)
X18_COVER=1 node scripts/x18-stills.mts
node scripts/still.mjs scratch/x18-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x18-cover.png -q:v 2 out/x18-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x18-$V.mp4
sh scripts/loud.sh out/x18-$V.mp4
ls -l out/x18-$V.mp4 out/x18-$V-phone.mp4 out/x18-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x18-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x18-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x18-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x18-$V.mp4 out/x18-$V-first3.jpg
