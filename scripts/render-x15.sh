#!/bin/sh
# sh scripts/render-x15.sh  ->  out/x15-v1.mp4 (+ out/x15-v1-phone.mp4, out/x15-v1-cover.jpg, out/x15-v1-sheet.jpg, out/x15-v1-first3.jpg); V=v2 sh scripts/render-x15.sh keeps v1 and writes the v2 files
# x15 "Bleep Fee" (src/X15.tsx, docs/x15-bleep-fee.md, the build spec), the shape of scripts/render-x12.sh. The art is scripts/x15-art-gen.py's, cut by scripts/x15-prep.py (src/x15-rig.json); everything else is drawn in code. Here: cues -> audio mix
# (-14 LUFS, no bed; the robocall through a phone's band-pass, scripts/sp-mix.py) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix, the bleeps are tones) and the contact sheet (a still of every
# shot at its named moment). The last shot (the phone rings again) runs into the first: the mix is not faded out in the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes: scripts/voice-build.py x15, then scripts/amp-build.py x15 first (and the shots move to the words: src/x15-sched.ts).
# AUDIO=1 stops after the mix (scratch/x15-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
mkdir -p scratch
node scripts/x15-cues.mts
$PY -I scripts/sp-mix.py scratch/x15-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x15-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X15 out/x15-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x15-$V-silent.mp4 -i scratch/x15-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x15-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x15-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x15-$V-phone.mp4
# the cover: the frame of scripts/x15-stills.mts (shot 6 on the second bleep: Ross purple, the mosaic over his mouth, the red -$9.98), no captions, "EVERYBODY'S TRYING TO #@$% ME" in big text over the top (Cover in src/x15-ui.tsx)
X15_COVER=1 node scripts/x15-stills.mts
node scripts/still.mjs scratch/x15-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x15-cover.png -q:v 2 out/x15-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x15-$V.mp4
sh scripts/loud.sh out/x15-$V.mp4
ls -l out/x15-$V.mp4 out/x15-$V-phone.mp4 out/x15-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x15-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x15-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x15-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x15-$V.mp4 out/x15-$V-first3.jpg
