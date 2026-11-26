#!/usr/bin/env bash
# Cleans a raw phone/WhatsApp voice recording: rumble cut, noise reduction, breath gate, compression, loud for Shorts.
# Usage: video/tools/clean-voice.sh <in.(wav|ogg|m4a|opus)> <out.wav> [speed=1.0]
# speed uses atempo (pitch stays the same). For cut lists / reordering, build the cut first, then run this on the result.
set -euo pipefail
in="$1"; out="$2"; speed="${3:-1.0}"
ffmpeg -loglevel error -y -i "$in" -af "highpass=f=85,afftdn=nf=-25,agate=threshold=0.03:ratio=6:attack=4:release=120:range=0.06,acompressor=threshold=-20dB:ratio=3.5:attack=6:release=120:makeup=3dB,atempo=${speed},loudnorm=I=-14:TP=-2:LRA=8,aresample=48000,volume=3dB,alimiter=limit=0.85:attack=2:release=50:level=false" -ac 1 -ar 48000 "$out"
