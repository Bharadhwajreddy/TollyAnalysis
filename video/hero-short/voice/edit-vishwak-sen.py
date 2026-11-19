# Builds the voice track from the two recordings: picks the kept lines, tightens pauses, cleans, speeds up slightly.
import subprocess, re, json, sys
V = "/tmp/claude-0/-home-user/cfdbb0be-0be4-55cb-9b15-6957269073b0/scratchpad/voice"
SPEED = 1.08
# (scene, recording, start, end): times in the original recordings.
KEEP = [
  ("s1", "r3", 4.00, 8.70),     # ee vaaram mana Vishwak Sen bro ENE Repeat tho vastunnadu
  ("s1", "r3", 13.55, 16.50),   # Vishwak Sen career ela undo ee video lo chuddam
  ("s2", "r3", 17.30, 49.70),   # hit hat-trick, Falaknuma Das, Paagal down, Gaami ... lepukuntadu
  ("s3", "r3", 53.65, 74.85),   # hit rate, biggest film Das Ka Dhamki 23 cr, Instagram, 2024 busy year
  ("s5", "r3", 79.20, 88.70),   # Das Ka Dhamki, Cult boltha kottindi, mari ela untundo chudali
  ("s6", "r2", 88.85, 93.20),   # em maruthundo ela maruthundo chudali, hit aina flop aina
  ("s6", "r2", 99.45, 117.75),  # Tolly Index 40.6, next week, success meet ayyaka graph update chesi video pedatham
  ("s0", "r2", 132.90, 150.70), # tappulunte comment, we will do better, subscribe, thank you bye
]
def speech(f, a, b):
    """Speech intervals inside [a, b]: pauses longer than 0.3 s are cut down."""
    log = subprocess.run(["ffmpeg","-ss",str(a),"-to",str(b),"-i",f,"-af","silencedetect=noise=-38dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]; en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    out, cur = [], 0.0
    for s, e in zip(st, en):
        if s - cur > 0.05: out.append((a + max(0, cur - 0.12), a + s + 0.12))
        cur = e
    if b - a - cur > 0.05: out.append((a + max(0, cur - 0.12), b))
    return out
parts, scenes, t = [], {}, 0.0
for k, (scene, rec, a, b) in enumerate(KEEP):
    if k and KEEP[k - 1][0] != scene: parts.append(("gap", 0.45)); t += 0.45
    elif k: parts.append(("gap", 0.25)); t += 0.25
    for (x, y) in speech(f"{V}/{rec}.wav", a, b):
        parts.append((rec, x, y)); 
        scenes.setdefault(scene, [t, t]); t += y - x; scenes[scene][1] = t
# Build with one ffmpeg filter graph.
inputs, filt, labels = [], [], []
for i, p in enumerate(parts):
    if p[0] == "gap":
        filt.append(f"anullsrc=r=16000:cl=mono,atrim=0:{p[1]}[p{i}]")
    else:
        idx = 0 if p[0] == "r2" else 1
        filt.append(f"[{idx}:a]atrim={p[1]}:{p[2]},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={p[2]-p[1]-0.03:.3f}:d=0.03[p{i}]")
    labels.append(f"[p{i}]")
filt.append("".join(labels) + f"concat=n={len(parts)}:v=0:a=1,highpass=f=80,afftdn=nf=-28,acompressor=threshold=-22dB:ratio=3:attack=10:release=150,atempo={SPEED},loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[out]")
open(f"{V}/graph.txt","w").write(";\n".join(filt))
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{V}/r2.wav","-i",f"{V}/r3.wav","-filter_complex_script",f"{V}/graph.txt","-map","[out]","-ac","1",f"{V}/voice.wav"],check=True)
scaled = {k: [round(v[0]/SPEED,2), round(v[1]/SPEED,2)] for k, v in scenes.items()}
json.dump(scaled, open(f"{V}/scenes.json","w"))
print(json.dumps(scaled)); print("total", round(t/SPEED,1))
