#!/bin/sh
# sh scripts/render-x11.sh  ->  out/x11-v1.mp4 (+ out/x11-v1-phone.mp4, out/x11-v1-cover.jpg, out/x11-v1-sheet.jpg, out/x11-v1-first3.jpg); V=v2 sh scripts/render-x11.sh keeps v1 and writes the v2 files
# x11 "Are You Open?" (src/X11.tsx, docs/x11-are-you-open.md, the build spec), the shape of scripts/render-x10.sh. The art is scripts/x11-art-gen.py's, cut by scripts/x11-prep.py (src/x11-rig.json); everything else is drawn in code. Here: the muffled
# lines 4, 6, 7 and 9 -> cues -> audio mix (-14 LUFS, no bed) -> silent render -> mux -> phone file -> cover -> loudness, the speech check (every line heard over the mix) and the contact sheet. The last shot (the next day) runs into the first (the sign): the mix is not faded out in
# the last 0.1 s but for the 0.3 s tail that scripts/sp-mix.py always puts on a reel. If a voice take or a gap changes: scripts/voice-build.py x11, then scripts/amp-build.py x11 first (and the shots move to the words: src/x11-sched.ts).
# AUDIO=1 stops after the mix (scratch/x11-mix.wav) and the speech check on it.
set -e
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
V=${V:-v1}
PY=E:/talking-reel/.venv/Scripts/python.exe
# lines 4, 6, 7 and 9 are Chuck through glass (a car's rear window, a bedroom window, the shop's door): a low-pass of about 1.5 kHz over his voice file into its own file (scripts/x11-cues.mts points the mix at it), plus what the filter takes
# (measured: 0.7, 2.0, 1.0 and 2.2 dB of LUFS) so that the muffled line is as loud as the file
mkdir -p scratch
ffmpeg -v error -y -i public/x11/04-chuck.mp3 -af "lowpass=f=1500,volume=0.7dB" scratch/x11-04-muffled.wav
ffmpeg -v error -y -i public/x11/06-chuck.mp3 -af "lowpass=f=1500,volume=2.0dB" scratch/x11-06-muffled.wav
ffmpeg -v error -y -i public/x11/07-chuck.mp3 -af "lowpass=f=1500,volume=1.0dB" scratch/x11-07-muffled.wav
ffmpeg -v error -y -i public/x11/09-chuck.mp3 -af "lowpass=f=1500,volume=2.2dB" scratch/x11-09-muffled.wav
node scripts/x11-cues.mts
$PY -I scripts/sp-mix.py scratch/x11-mix.wav
if [ -n "$AUDIO" ]; then
  $PY -I scripts/stt-lines.py scratch/x11-mix.wav
  exit 0
fi
t1=$(date +%s)
npx remotion render src/index.ts X11 out/x11-$V-silent.mp4 --concurrency=8 --codec=h264 --crf=16 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn
echo "silent render: $(( $(date +%s) - t1 )) s"
ffmpeg -v error -y -i out/x11-$V-silent.mp4 -i scratch/x11-mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -map_metadata -1 -map_chapters -1 -movflags +faststart out/x11-$V.mp4
# the phone file: the same picture at crf 24 under 5 Mbit, 128k audio (under 50 MB for Telegram)
ffmpeg -v error -y -i out/x11-$V.mp4 -c:v libx264 -crf 24 -maxrate 5000k -bufsize 10000k -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart out/x11-$V-phone.mp4
# the cover: the frame of src/x11-stills.mts (the face settled on the glass, 0.4 s after the smack), no captions, "ARE YOU OPEN?" in big text over the top (Cover in src/x11-ui.tsx)
X11_COVER=1 node scripts/x11-stills.mts
node scripts/still.mjs scratch/x11-cover-job.json >/dev/null
ffmpeg -v error -y -i scratch/x11-cover.png -q:v 2 out/x11-$V-cover.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,sample_rate,channels:format=duration,size -of default=nw=1 out/x11-$V.mp4
sh scripts/loud.sh out/x11-$V.mp4
ls -l out/x11-$V.mp4 out/x11-$V-phone.mp4 out/x11-$V-cover.jpg
$PY -I scripts/stt-lines.py out/x11-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/mp4-frames.py out/x11-$V.mp4
E:/Invoke/.venv/Scripts/python.exe -I scripts/sheet.py out/x11-$V-sheet.jpg 7 240 scratch/mp4-labels.json
E:/Invoke/.venv/Scripts/python.exe -I scripts/first3-strip.py out/x11-$V.mp4 out/x11-$V-first3.jpg
