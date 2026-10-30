#!/bin/sh
# sh scripts/loud.sh file  ->  integrated loudness, range and true peak of the audio in a file
ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' | grep -E "I:|LRA:|Peak:" | tr -s ' ' | tr '\n' ' '; echo
