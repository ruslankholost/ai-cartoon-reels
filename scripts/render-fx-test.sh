#!/bin/sh
# sh scripts/render-fx-test.sh  ->  out/fx-test.mp4 (1080x960: before | after) and out/fx-test-stills.jpg
# The effects test for "Nobody Picks Up" v3: shot 1 (the shower and the steam, 0-3.0 s) and shot 8c (the phone on the table, the last 2.2 s), before and after.
#   before = commit ad2ed65, rendered from a worktree of it in scratch/fx/ad2ed65 (node_modules linked in); after = this tree.
# Needs the painted props (E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/sp-props-gen.py, then E:/Invoke/.venv/Scripts/python.exe -I scripts/fx-prep.py).
# Gates run first: tsc, nv3-check, eyes-check; then the stills are cut and checked (scripts/fx-check.py). The audio is the episode's own mix of those spans.
set -e
cd "$(dirname "$0")/.."
PY=E:/talking-reel/.venv/Scripts/python.exe
IPY=E:/Invoke/.venv/Scripts/python.exe
BEF=scratch/fx/ad2ed65
mkdir -p scratch/fx/stills/before scratch/fx/stills/after scratch/fx/stills/grain scratch/fx/scan
npx tsc --noEmit
node scripts/nv3-check.mts | tail -1
node scripts/eyes-check.mts

# the same two spans, before and after: frames 0-89 and 1256-1321 (silent; the sound is added below)
R="--concurrency=8 --codec=h264 --crf=12 --muted --gl=angle --image-format=png --pixel-format=yuv420p --log=warn"
if [ ! -d $BEF ]; then
  git worktree add --detach $BEF ad2ed65
  cmd //c "mklink /J scratch\\fx\\ad2ed65\\node_modules node_modules" > /dev/null
fi
STILLS="4,9,14,50,1279,1290"
job() { # job <tree> <out dir> <props json> <frames...>
  tree=$1; dir=$2; props=$3; shift 3
  printf '[' > $tree/scratch/fx/job.json; sep=''
  for f in "$@"; do printf '%s{"id":"NobodyV3","props":%s,"frame":%s,"out":"%s/%s"}' "$sep" "$props" "$f" "$dir" "$(printf '%04d' $f).png" >> $tree/scratch/fx/job.json; sep=','; done
  printf ']' >> $tree/scratch/fx/job.json
}
mkdir -p $BEF/scratch/fx
[ -f scratch/fx/before-1.mp4 ] || (cd $BEF && npx remotion render src/index.ts NobodyV3 ../before-1.mp4 --frames=0-89 $R && npx remotion render src/index.ts NobodyV3 ../before-2.mp4 --frames=1256-1321 $R)
npx remotion render src/index.ts NobodyV3 scratch/fx/after-1.mp4 --frames=0-89 $R
npx remotion render src/index.ts NobodyV3 scratch/fx/after-2.mp4 --frames=1256-1321 $R

# the stills: before, after, the grain pairs, and the scans that fx-check.py reads (shot 1 every 2nd frame, 8c every 3rd)
NC='{"noCaps":true,"noCard":true}'
job $BEF scratch/fx/stills/before "$NC" 4 9 14 50 1279 1290 1262 1270 1276 1282 1286 1296
(cd $BEF && node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null)
cp -r $BEF/scratch/fx/stills/before/* scratch/fx/stills/before/ 2>/dev/null || true
S1=$(seq -s ' ' 0 2 44); P8=$(seq -s ' ' 1256 3 1320)
job . scratch/fx/stills/after "$NC" 4 9 14 50 1279 1290 1262 1270 1276 1282 1286 1296
node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null
job . scratch/fx/scan "$NC" $S1
sed -i 's#scan/\([0-9]*\)\.png#scan/s\1.png#g' scratch/fx/job.json
node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null
job $BEF scratch/fx/scanb "$NC" $S1
sed -i 's#scanb/\([0-9]*\)\.png#scanb/s\1.png#g' $BEF/scratch/fx/job.json
(cd $BEF && node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null)
mkdir -p scratch/fx/scanb && cp $BEF/scratch/fx/scanb/*.png scratch/fx/scanb/
job . scratch/fx/scan "$NC" $P8
sed -i 's#scan/\([0-9]*\)\.png#scan/p\1.png#g' scratch/fx/job.json
node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null
printf '[{"id":"NobodyV3","props":{"noCaps":true,"noCard":true},"frame":14,"out":"scratch/fx/stills/grain/shot1-off.png"},{"id":"NobodyV3","props":{"noCaps":true,"noCard":true,"grain":true},"frame":14,"out":"scratch/fx/stills/grain/shot1-on.png"},{"id":"NobodyV3","props":{"noCaps":true,"noCard":true},"frame":1290,"out":"scratch/fx/stills/grain/premier-off.png"},{"id":"NobodyV3","props":{"noCaps":true,"noCard":true,"grain":true},"frame":1290,"out":"scratch/fx/stills/grain/premier-on.png"}]' > scratch/fx/job.json
node scripts/still.mjs scratch/fx/job.json --par=4 > /dev/null
$IPY -I scripts/fx-check.py
$IPY -I scripts/fx-sheet.py

# the video: each half 540 x 960, labelled; the episode's own audio of the two spans
node scripts/nv3-cues.mts > /dev/null
$PY -I scripts/sp-mix.py scratch/nv3-mix.wav > /dev/null
FONT='C\:/Windows/Fonts/arialbd.ttf'
for s in before after; do
  if [ $s = before ]; then a=scratch/fx/before-1.mp4; b=scratch/fx/before-2.mp4; else a=scratch/fx/after-1.mp4; b=scratch/fx/after-2.mp4; fi
  ffmpeg -v error -y -i $a -i $b -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,scale=540:960:flags=lanczos,drawtext=fontfile='$FONT':text='$s':fontsize=34:fontcolor=white:borderw=3:bordercolor=black:x=16:y=14[v]" -map "[v]" -r 30 -c:v libx264 -crf 12 -pix_fmt yuv420p scratch/fx/$s-half.mp4
done
ffmpeg -v error -y -i scratch/nv3-mix.wav -filter_complex "[0:a]atrim=0:3.0,asetpts=N/SR/TB[a0];[0:a]atrim=41.8667:44.0667,asetpts=N/SR/TB[a1];[a0][a1]concat=n=2:v=0:a=1[a]" -map "[a]" -ar 48000 -ac 2 scratch/fx/fx-audio.wav
ffmpeg -v error -y -i scratch/fx/before-half.mp4 -i scratch/fx/after-half.mp4 -i scratch/fx/fx-audio.wav -filter_complex "[0:v][1:v]hstack=inputs=2[v]" -map "[v]" -map 2:a -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -map_metadata -1 -movflags +faststart out/fx-test.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames,sample_rate:format=duration,size -of default=nw=1 out/fx-test.mp4
sh scripts/loud.sh out/fx-test.mp4
