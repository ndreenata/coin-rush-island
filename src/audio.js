// ===== AUDIO MANAGER =====
// Generates simple sound effects using Web Audio API
// No external files needed

let audioCtx = null;
let sfxEnabled = true;
let musicEnabled = true;
let musicOsc = null;
let musicGain = null;

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available');
      return null;
    }
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

export function setSfxEnabled(enabled) {
  sfxEnabled = enabled;
}

export function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  if (!enabled) {
    stopMusic();
  }
}

export function isSfxEnabled() { return sfxEnabled; }
export function isMusicEnabled() { return musicEnabled; }

export function playCoinSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Bright chime sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);

  // Second harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1320, now + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.2);
  gain2.gain.setValueAtTime(0.1, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.35);
}

export function playChestSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Rich opening sound - ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.12, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
}

export function playGameOverSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Descending tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.8);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.linearRampToValueAtTime(0, now + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.0);
}

export function playDamageSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

export function playBiteSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low snap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

export function playDefeatSound() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Dramatic low minor chord
  const chords = [220, 174.61, 130.81]; // A3, F3, C3
  chords.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.8, now + 1.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  });
}

export function startMusic() {
  if (!musicEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (musicOsc) return; // Already playing

  // Simple ambient tropical music using oscillators
  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(0.04, ctx.currentTime);
  musicGain.connect(ctx.destination);

  // Base pad
  musicOsc = ctx.createOscillator();
  musicOsc.type = 'sine';
  musicOsc.frequency.setValueAtTime(220, ctx.currentTime);
  musicOsc.connect(musicGain);
  musicOsc.start();

  // Add slight modulation
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
  lfoGain.gain.setValueAtTime(10, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(musicOsc.frequency);
  lfo.start();

  // Second voice
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(330, ctx.currentTime);
  gain2.gain.setValueAtTime(0.02, ctx.currentTime);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start();

  // Store references for cleanup
  musicOsc._extra = [lfo, lfoGain, osc2, gain2];
}

export function stopMusic() {
  if (musicOsc) {
    try {
      musicOsc.stop();
      if (musicOsc._extra) {
        musicOsc._extra.forEach(node => {
          if (node.stop) node.stop();
        });
      }
    } catch (e) { /* ignore */ }
    musicOsc = null;
    musicGain = null;
  }
}
