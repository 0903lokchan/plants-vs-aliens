let ac: AudioContext | null = null;
let muted = false;
export function unlockAudio() { if (!ac) { try { ac = new AudioContext(); } catch { ac = null; } } else if (ac.state === 'suspended') ac.resume(); }
export function toggleMute() { muted = !muted; }
export function isMuted() { return muted; }
function tone(f1: number, f2: number, dur: number, type: OscillatorType = 'square', vol = 0.06, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.15) {
  if (!ac || muted) return;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g).connect(ac.destination); s.start();
}
export const sfx = {
  click: () => tone(600, 800, 0.06, 'triangle', 0.05),
  deny: () => tone(200, 150, 0.12, 'square', 0.04),
  plant: () => { tone(180, 90, 0.12, 'triangle', 0.1); noise(0.08, 0.05); },
  dig: () => noise(0.15, 0.08),
  shoot: () => tone(500, 260, 0.06, 'triangle', 0.035),
  hit: () => tone(240, 120, 0.05, 'square', 0.025),
  pop: () => tone(300, 900, 0.15, 'sine', 0.08),
  glass: () => { tone(1800, 1200, 0.1, 'triangle', 0.05); noise(0.12, 0.06); },
  crunch: () => noise(0.2, 0.1),
  collect: () => { tone(880, 1320, 0.09, 'sine', 0.07); tone(1320, 1760, 0.09, 'sine', 0.05, 0.07); },
  boom: () => { noise(0.6, 0.3); tone(120, 40, 0.5, 'sawtooth', 0.12); },
  laser: () => tone(1500, 200, 0.8, 'sawtooth', 0.06),
  siren: () => { for (let i = 0; i < 3; i++) tone(400, 800, 0.35, 'sawtooth', 0.04, i * 0.4); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.08, i * 0.15)),
  lose: () => [400, 340, 280, 200].forEach((f, i) => tone(f, f * 0.9, 0.3, 'sawtooth', 0.06, i * 0.25)),
};
