# Soft impact hits and whooshes at given times (seconds), 48 kHz mono.
import numpy as np, wave, sys
SR = 48000; out = sys.argv[1]; dur = float(sys.argv[2])
hits = [float(x) for x in sys.argv[3].split(",")]; whooshes = [float(x) for x in sys.argv[4].split(",")]
n = int(SR * dur); x = np.zeros(n); rng = np.random.default_rng(7)
for h in hits:
    a = int(h * SR); t = np.arange(int(0.5 * SR)) / SR
    s = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 9) + 0.25 * rng.standard_normal(t.size) * np.exp(-t * 40)
    b = min(n, a + t.size); x[a:b] += 0.9 * s[: b - a]
for w in whooshes:
    a = int(max(0, w - 0.18) * SR); m = int(0.3 * SR); t = np.arange(m) / SR
    noise = rng.standard_normal(m); noise = np.convolve(noise, np.ones(30) / 30, mode="same")
    env = np.sin(np.pi * t / t[-1]) ** 2; b = min(n, a + m); x[a:b] += 0.6 * (noise * env)[: b - a]
x /= np.abs(x).max() + 1e-9; x *= 0.7
w = wave.open(out, "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
