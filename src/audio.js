// Efectos de sonido sintetizados con WebAudio (sin archivos)
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('elordenador-muted') === '1';
} catch {}

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx?.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('elordenador-muted', muted ? '1' : '0');
  } catch {}
  return muted;
}

export const isMuted = () => muted;

function tone(freq, dur, { type = 'square', vol = 0.06, to = null, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.1, freq = 800) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

export const sfx = {
  jump: () => tone(300, 0.16, { to: 640, vol: 0.04 }),
  kick: () => {
    tone(160, 0.12, { type: 'sine', to: 60, vol: 0.18 });
    noise(0.06, 0.08, 1200);
  },
  thud: () => tone(110, 0.08, { type: 'sine', to: 50, vol: 0.08 }),
  splash: () => noise(0.45, 0.12, 1800),
  enter: () => tone(660, 0.07, { type: 'triangle', vol: 0.05 }),
  discover: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.08, delay: i * 0.08 })),
  secret: () =>
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.07, delay: i * 0.06 })),
  pickup: () => {
    tone(880, 0.08, { type: 'square', vol: 0.05 });
    tone(1320, 0.12, { type: 'square', vol: 0.05, delay: 0.07 });
  },
  goal: () => {
    noise(0.9, 0.08, 2400);
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.05, delay: 0.05 + i * 0.09 }));
  },
  eat: () => tone(660, 0.06, { type: 'square', vol: 0.04, to: 990 }),
  over: () => tone(330, 0.5, { type: 'sawtooth', vol: 0.05, to: 80 }),
  win: () =>
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, 0.25, { type: 'square', vol: 0.045, delay: i * 0.11 })
    ),
};
