#!/bin/sh
# sh scripts/render-x20.sh  ->  out/x20-v1.mp4 (+ out/x20-v1-phone.mp4, out/x20-v1-cover.jpg, out/x20-v1-sheet.jpg, out/x20-v1-first3.jpg); V=v2 sh scripts/render-x20.sh keeps v1 and writes the v2 files
# x20 "One Coffee" (src/X20.tsx, docs/x20-one-coffee.md, the build spec), the shape of scripts/render-x19.sh. The art is scripts/x20-art-gen.py's, cut by scripts/x20-prep.py (src/x20-rig.json); everything else is drawn in code. Here: cues -> audio
# mix (-14 LUFS; every sound is ducked 6 dB under the voices, the radio 12 dB and the gong and the cheer their own: those are cue fields, scripts/sp-mix.py) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard
# over the mix) and the contact sheet (a still of every picture at its named moment). The last shot (his hand slaps coins on the counter) runs into the first (his hand slaps coins on the counter): the mix is faded out for the last 0.08 s only,
# so that the coins' ring carries into the loop (scripts/sp-mix.py `tail`).
# If a voice take or a gap changes: scripts/voice-build.py x20, then scripts/amp-build.py x20 first (and the shots move to the words: src/x20-sched.ts).
# AUDIO=1 stops after the mix (scratch/x20-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
mkdir -p scratch
node scripts/x20-check.mts
node scripts/x20-cues.mts
$PY -I scripts/sp-mix.py scratch/x20-mix.wav
$PY -I scripts/x20-voice-over.py
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x20-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X20 out/x20-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x20-$V-silent.mp4 -i scratch/x20-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x20-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x20-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x20-$V-phone.mp4
# the cover: the frame of scripts/x20-stills.mts (shot 3, the camper at his laptop in his cobwebs), no captions, "POV: YOU OWN A CAFÉ" in big letters (Cover in src/x20-ui.tsx)
X20_COVER=1 node scripts/x20-stills.mts
node scripts/still.mjs scratch/x20-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x20-cover.png -q:v 2 out/x20-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x20-$V.mp4
sh scripts/loud.sh out/x20-$V.mp4
ls -l out/x20-$V.mp4 out/x20-$V-phone.mp4 out/x20-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x20-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x20-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x20-$V-sheet.jpg 6 270 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x20-$V.mp4 out/x20-$V-first3.jpg
