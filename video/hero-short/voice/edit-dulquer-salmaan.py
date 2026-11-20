# Dulquer voice v2: main part at 1.1x, outro at 1.25x (reordered), a gap for a meme, pauses tightened, breaths gated.
import subprocess, re, json
V = "/tmp/claude-0/-home-user/cfdbb0be-0be4-55cb-9b15-6957269073b0/scratchpad/voice2"
MAIN, OUT = 1.10, 1.25
MEME_GAP = 2.6   # seconds after "lopala dachincham" for the Balakrishna meme clip
KEEP = [  # (scene, source, start, end, speed)
  ("s1", "L", 0.55, 13.65, MAIN),   # greeting, mana career baaledu kabatti, Telugu cinemalu consider chesam
  ("s2", "L", 13.65, 37.15, MAIN),  # Ustad Hotel ... heartbeat ... Sita Ramam, Lucky Baskhar ... Aakasamlo Oka Tara
  ("s3", "L", 37.85, 49.30, MAIN),  # 60% hit rate, last 5, Instagram, Twitter
  ("s4", "L", 49.30, 66.85, MAIN),  # 2015 nunchi, 10 months baby, consistency, Mahesh Prabhas
  ("s7", "L", 67.35, 71.30, MAIN),  # Tolly Index lo 62 daggarlo unnadu
  ("s7", "L", 72.52, 76.75, MAIN),  # Aakasamlo Oka Tara tarvata ela maruthundo chudali
  ("s7", "O", 7.90, 10.45, OUT),    # emaina tappulu unte kshaminchandi
  ("s7", "O", 10.65, 13.60, OUT),   # leda comments section lo shikshinchandi kaani
  ("s7", "O", 14.05, 15.65, OUT),   # subscribe maatram mingandi
  ("s7", "O", 0.55, 7.20, OUT),     # ilanti marinni analysis kosam website visit cheyandi ... lopala pettam, anni dachincham
  ("meme", None, 0, MEME_GAP, OUT),
  ("s0", "O", 16.15, 17.90, OUT),   # ika selavu
]
def speech(f, a, b):
    log = subprocess.run(["ffmpeg","-ss",str(a),"-to",str(b),"-i",f,"-af","silencedetect=noise=-32dB:d=0.28","-f","null","-"],capture_output=True,text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]; en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    out, cur = [], 0.0
    for s, e in zip(st, en):
        if s - cur > 0.05: out.append((a + max(0, cur - 0.06), a + s + 0.08))
        cur = e
    if b - a - cur > 0.05: out.append((a + max(0, cur - 0.06), b))
    return out
filt, labels, scenes, t, n = [], [], {}, 0.0, 0
def add(label_src, dur_raw, speed, scene, trim=None):
    global t, n
    if label_src is None:
        filt.append(f"anullsrc=r=48000:cl=mono,atrim=0:{dur_raw / speed:.3f}[p{n}]")
    else:
        idx = 0 if label_src == "L" else 1
        a, b = trim
        filt.append(f"[{idx}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={max(0,b-a-0.03):.3f}:d=0.03,atempo={speed}[p{n}]")
    labels.append(f"[p{n}]"); n += 1
    if scene: scenes.setdefault(scene, [t, t]); 
    t += dur_raw / speed
    if scene: scenes[scene][1] = t
for k, (scene, src, a, b, sp) in enumerate(KEEP):
    if k: add(None, (0.4 if KEEP[k-1][0] != scene else 0.18) * sp, sp, None)
    if src is None: add(None, b - a, sp, scene); continue
    first = True
    for (x, y) in speech(f"{V}/{src}.wav", a, b):
        if not first: add(None, 0.16 * sp, sp, None)
        add(src, y - x, sp, scene, (x, y)); first = False
filt.append("".join(labels) + f"concat=n={n}:v=0:a=1,highpass=f=85,afftdn=nf=-25,agate=threshold=0.03:ratio=6:attack=4:release=120:range=0.06,acompressor=threshold=-20dB:ratio=3.5:attack=6:release=120:makeup=3dB,loudnorm=I=-14:TP=-2:LRA=8,aresample=48000,volume=3dB,alimiter=limit=0.85:attack=2:release=50:level=false[out]")
open(f"{V}/graph3.txt","w").write(";\n".join(filt))
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{V}/L.wav","-i",f"{V}/O.wav","-filter_complex_script",f"{V}/graph3.txt","-map","[out]","-ac","1",f"{V}/voice3.wav"],check=True)
sc = {k: [round(v[0],2), round(v[1],2)] for k, v in scenes.items()}
json.dump(sc, open(f"{V}/scenes3.json","w")); print(json.dumps(sc)); print("total", round(t,1))
