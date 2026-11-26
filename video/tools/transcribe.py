# Word-level Telugu transcript of a voice recording, for cutting on words and timing scenes/subtitles.
# Splits the file at silences and transcribes each piece separately (whole-file runs drop speech on Telugu).
# Setup (once): python3 -m venv ~/asr && ~/asr/bin/pip install faster-whisper numpy
# Usage: ~/asr/bin/python -I video/tools/transcribe.py <voice.wav> <out.json> [model=large-v3]
# Output: [{"start":s,"end":s,"text":"...","words":[{"w":"...","s":..,"e":..}]}] in the ORIGINAL file's seconds.
# Telugu comes out in Telugu script or mixed; transliterate to English letters yourself when writing subtitles.
import json, re, subprocess, sys, tempfile, os
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
model = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else "large-v3", device="cpu", compute_type="int8")
tmp = tempfile.mkdtemp()
wav = os.path.join(tmp, "in16k.wav")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav], check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], capture_output=True, text=True).stdout)
log = subprocess.run(["ffmpeg", "-i", wav, "-af", "silencedetect=noise=-32dB:d=0.35", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
# speech pieces = gaps between silences; merge very short pieces into the next one
pieces, cur = [], 0.0
for s, e in zip(starts, ends):
    if s - cur > 0.15: pieces.append([max(0, cur - 0.1), s + 0.1])
    cur = e
if dur - cur > 0.15: pieces.append([max(0, cur - 0.1), dur])
merged = []
for p in pieces:
    if merged and (p[1] - merged[-1][0] < 6): merged[-1][1] = p[1]
    else: merged.append(p)
res = []
for a, b in merged:
    seg = os.path.join(tmp, "p.wav")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a), "-to", str(b), "-i", wav, seg], check=True)
    segs, _ = model.transcribe(seg, language="te", word_timestamps=True, vad_filter=False, beam_size=5)
    for s in segs:
        res.append({"start": round(a + s.start, 2), "end": round(a + s.end, 2), "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": round(a + w.start, 2), "e": round(a + w.end, 2)} for w in (s.words or [])]})
        print(f"{a + s.start:7.2f}–{a + s.end:7.2f}  {s.text.strip()}")
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
