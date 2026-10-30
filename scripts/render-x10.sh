#!/bin/sh
# sh scripts/render-x10.sh  ->  out/x10-v1.mp4 (+ out/x10-v1-phone.mp4, out/x10-v1-cover.jpg, out/x10-v1-sheet.jpg, out/x10-v1-first3.jpg); V=v2 sh scripts/render-x10.sh keeps v1 and writes the v2 files
# x10 "My Own Business" (src/X10.tsx, docs/x10-my-own-business.md, the build spec), the shape of scripts/render-x08.sh. The art is scripts/x10-art-gen.py's, cut by scripts/x10-prep.py (src/x10-rig.json); everything else is drawn in code. Here: the muffled
# line 4 -> cues -> audio mix (-14 LUFS, no bed) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet. The last shot (the whistle back) runs into the first (the padlock): the mix is not faded out in
# the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes: scripts/voice-build.py x10, then scripts/amp-build.py x10 first (and the shots move to the words: src/x10-sched.ts).
# AUDIO=1 stops after the mix (scratch/x10-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
# line 4 is Ross's "Coming!" from inside the pile of boxes: a low-pass of about 800 Hz over his voice file into its own file (scripts/x10-cues.mts points the mix at it), +4.5 dB to give back what the filter takes (the file is -19.0 LUFS, the filtered one -23.9)
mkdir -p scratch
ffmpeg -v error -y -i public/x10/04-ross.mp3 -af "lowpass=f=800,volume=4.5dB" scratch/x10-04-muffled.wav
node scripts/x10-cues.mts
$PY -I scripts/sp-mix.py scratch/x10-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x10-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X10 out/x10-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x10-$V-silent.mp4 -i scratch/x10-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x10-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x10-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x10-$V-phone.mp4
# the cover: the frame of src/x10-stills.mts (the dollar signs of his eyes just landed), no captions, "My own business" in big text over the top (Cover in src/x10-ui.tsx)
X10_COVER=1 node scripts/x10-stills.mts
node scripts/still.mjs scratch/x10-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x10-cover.png -q:v 2 out/x10-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x10-$V.mp4
sh scripts/loud.sh out/x10-$V.mp4
ls -l out/x10-$V.mp4 out/x10-$V-phone.mp4 out/x10-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x10-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x10-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x10-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x10-$V.mp4 out/x10-$V-first3.jpg
