# Dulquer voice track: kept lines from the long take (L) and the outro (O), pauses tightened, breaths gated.
import subprocess, re, json
V = "/tmp/claude-0/-home-user/cfdbb0be-0be4-55cb-9b15-6957269073b0/scratchpad/voice2"
SPEED = 1.05
KEEP = [
  ("s1", "L", 0.55, 13.65),   # banisalandariki pranamalu; mana career baaledu kabatti Dulquer career; Telugu cinemalu consider chesam
  ("s2", "L", 13.65, 37.15),  # Ustad Hotel entry 2012 ... graph heartbeat ... Sita Ramam, Lucky Baskhar ... Aakasamlo Oka Tara, o vaaram lo telisipoddi
  ("s3", "L", 37.85, 49.30),  # stats: 60% hit rate, last 5 lo 2 blockbusters, Instagram, Twitter followers
  ("s4", "L", 49.30, 66.85),  # interesting: 2015 nunchi prathi year, 10 months baby, consistency, Instagram Mahesh Prabhas daatadu
  ("s7", "L", 67.35, 71.30),  # Tolly Index lo 62 daggarlo unnadu
  ("s7", "L", 72.52, 76.75),  # (14th position cut) mari Aakasamlo Oka Tara tarvata ela maruthundo chudali
  ("s0", "L", 77.10, 84.25),  # vere hero evariki kavalo comment cheyandi, daniki kuda video cheddam
  ("s0", "O", 0.0, 17.90),    # outro: website, tappulunte kshaminchandi / shikshinchandi, subscribe mingandi, ika selavu
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
parts, scenes, t = [], {}, 0.0
for k, (scene, src, a, b) in enumerate(KEEP):
    if k:
        g = 0.4 if KEEP[k-1][0] != scene else 0.18
        parts.append(("gap", g)); t += g
    for (x, y) in speech(f"{V}/{src}.wav", a, b):
        if parts and parts[-1][0] != "gap": parts.append(("gap", 0.16)); t += 0.16
        parts.append((src, x, y)); scenes.setdefault(scene, [t, t]); t += y - x; scenes[scene][1] = t
filt, labels = [], []
for i, p in enumerate(parts):
    if p[0] == "gap": filt.append(f"anullsrc=r=48000:cl=mono,atrim=0:{p[1]}[p{i}]")
    else:
        idx = 0 if p[0] == "L" else 1
        filt.append(f"[{idx}:a]atrim={p[1]}:{p[2]},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={max(0,p[2]-p[1]-0.03):.3f}:d=0.03[p{i}]")
    labels.append(f"[p{i}]")
filt.append("".join(labels) + f"concat=n={len(parts)}:v=0:a=1,highpass=f=85,afftdn=nf=-25,agate=threshold=0.03:ratio=6:attack=4:release=120:range=0.06,acompressor=threshold=-20dB:ratio=3.5:attack=6:release=120:makeup=3dB,atempo={SPEED},loudnorm=I=-13:TP=-1.5:LRA=8,aresample=48000[out]")
open(f"{V}/graph2.txt","w").write(";\n".join(filt))
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{V}/L.wav","-i",f"{V}/O.wav","-filter_complex_script",f"{V}/graph2.txt","-map","[out]","-ac","1",f"{V}/voice.wav"],check=True)
sc = {k: [round(v[0]/SPEED,2), round(v[1]/SPEED,2)] for k, v in scenes.items()}
json.dump(sc, open(f"{V}/scenes.json","w")); print(json.dumps(sc)); print("total", round(t/SPEED,1))
