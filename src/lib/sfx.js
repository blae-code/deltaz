// src/lib/sfx.js
// Pure Web Audio API sound engine — no external dependencies, no audio files.
// AudioContext is created lazily (on first sound call after user gesture).

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

function isMuted() {
  try {
    return localStorage.getItem("sfx-muted") === "true";
  } catch {
    return false;
  }
}

/**
 * Short UI click tick — nav links, card expand/collapse.
 * 1200Hz triangle wave, 40ms decay.
 */
export function tickClick() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

/**
 * Terminal beep — new notification / mission available.
 * Two-tone 880→1100Hz square wave, 80ms each.
 */
export function beep() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.06, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.08);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.09);
    });
  } catch {}
}

/**
 * Static burst — territory alert / danger event.
 * White noise through bandpass filter, 150ms.
 */
export function staticBurst() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    source.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.16);
  } catch {}
}

/**
 * Success tone — mission accepted / completed.
 * Rising three-note chime: C5→E5→G5, 300ms total.
 */
export function successTone() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.09);
      gain.gain.setValueAtTime(0.10, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.15);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.16);
    });
  } catch {}
}

/**
 * Alert tone — mission failed / hostile event / emergency.
 * Descending sawtooth: 600→300Hz, 250ms.
 */
export function alertTone() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(300, t + 0.25);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.26);
  } catch {}
}
