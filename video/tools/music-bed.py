# A soft original background bed: warm pad chords (Am-F-C-G) with a gentle plucked arpeggio. 90 BPM.
import numpy as np, wave, sys
SR, DUR = 48000, float(sys.argv[2])
bpm = 90; beat = 60 / bpm; bar = 4 * beat
n = int(SR * DUR); t = np.arange(n) / SR
note = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60, 64], [55, 59, 62]]   # Am, F, C, G
pad = np.zeros(n); arp = np.zeros(n); bass = np.zeros(n)
seg = 2 * bar
for k in range(int(DUR / seg) + 1):
    ch = chords[k % 4]; a = int(k * seg * SR); b = min(n, int((k + 1) * seg * SR) + int(0.8 * SR))
    if a >= n: break
    tt = np.arange(b - a) / SR
    env = np.minimum(1, tt / 0.9) * np.minimum(1, np.maximum(0, (seg + 0.8 - tt)) / 0.8)
    for m in ch:
        f = note(m)
        pad[a:b] += env * (0.6 * np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 1.003 * tt) + 0.12 * np.sin(2 * np.pi * 2 * f * tt))
    bass[a:b] += env * 0.5 * np.sin(2 * np.pi * note(ch[0] - 12) * tt)
    # eighth-note arpeggio, one octave up
    steps = int(seg / (beat / 2))
    for s in range(steps):
        m = ch[[0, 1, 2, 1][s % 4] % len(ch)] + 12
        sa = a + int(s * beat / 2 * SR); sb = min(n, sa + int(0.9 * SR))
        if sa >= n: break
        ts = np.arange(sb - sa) / SR
        arp[sa:sb] += np.exp(-ts * 5.5) * (np.sin(2 * np.pi * note(m) * ts) + 0.3 * np.sin(2 * np.pi * 2 * note(m) * ts))
mix = 0.55 * pad / 3 + 0.35 * arp + 0.35 * bass
# simple smoothing low-pass and gentle stereo
k = np.ones(6) / 6; mix = np.convolve(mix, k, mode="same")
fade = np.minimum(1, t / 2.0) * np.minimum(1, (DUR - t) / 2.5)
mix *= fade; mix /= np.abs(mix).max() + 1e-9; mix *= 0.8
left = mix; right = np.roll(mix, int(0.012 * SR))
out = (np.stack([left, right], 1) * 32767).astype(np.int16)
w = wave.open(sys.argv[1], "w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
