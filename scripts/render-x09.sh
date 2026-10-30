#!/bin/sh
# sh scripts/render-x09.sh  ->  out/x09-v1.mp4 (+ out/x09-v1-phone.mp4, out/x09-v1-cover.jpg, out/x09-v1-sheet.jpg, out/x09-v1-first3.jpg); V=v2 sh scripts/render-x09.sh keeps v1 and writes the v2 files
# x09 "Habits of the Rich" (src/X09.tsx, docs/x09-habits-of-the-rich.md, the build spec), the shape of scripts/render-x08.sh. The art is scripts/x09-art-gen.py's, cut by scripts/x09-prep.py (src/x09-rig.json); everything else is drawn in code. Here: the muffled
# line 4 -> cues -> audio mix (-14 LUFS, no bed) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet. The last shot runs into the first: the mix is not faded out in
# the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes: scripts/voice-build.py x09, then scripts/amp-build.py x09 first (and the shots move to the words: src/x09-sched.ts).
# AUDIO=1 stops after the mix (scratch/x09-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
# line 4 is the guru through the tape: a low-pass of about 800 Hz over his voice file into its own file (scripts/x09-cues.mts points the mix at it), +4.5 dB to give back what the filter takes (the file is -19 LUFS, the filtered one -24.6)
mkdir -p scratch
ffmpeg -v error -y -i public/x09/04-guru.mp3 -af "lowpass=f=800,volume=4.5dB" scratch/x09-04-muffled.wav
node scripts/x09-cues.mts
$PY -I scripts/sp-mix.py scratch/x09-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x09-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X09 out/x09-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x09-$V-silent.mp4 -i scratch/x09-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x09-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x09-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x09-$V-phone.mp4
# the cover: frame 0.63 s (the guru just in the ice, the cubes flying at the lens, the pyro up), no captions, the screen's title dimmed, "Real habits of rich people" over the top (Cover in src/x09-ui.tsx)
X09_COVER=1 node scripts/x09-stills.mts
node scripts/still.mjs scratch/x09-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x09-cover.png -q:v 2 out/x09-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x09-$V.mp4
sh scripts/loud.sh out/x09-$V.mp4
ls -l out/x09-$V.mp4 out/x09-$V-phone.mp4 out/x09-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x09-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x09-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x09-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x09-$V.mp4 out/x09-$V-first3.jpg
