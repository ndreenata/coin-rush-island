// ===== AUDIO MANAGER =====
// Generates sound effects and ambient music using Web Audio API
// Full volume hierarchy: Master -> Music / SFX with Mute & LocalStorage persistence

const AUDIO_STORAGE_KEY = 'coin_rush_audio_settings';

let audioCtx = null;
let musicOsc = null;
let musicGain = null;

// Audio Configuration State
let masterVolume = 0.8;
let musicVolume = 0.7;
let sfxVolume = 0.8;
let isAudioMuted = false;
let sfxEnabled = true;
let musicEnabled = true;

// Load persisted settings
try {
  const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (typeof parsed.masterVolume === 'number') masterVolume = Math.max(0, Math.min(1, parsed.masterVolume));
    if (typeof parsed.musicVolume === 'number') musicVolume = Math.max(0, Math.min(1, parsed.musicVolume));
    if (typeof parsed.sfxVolume === 'number') sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
    if (typeof parsed.isMuted === 'boolean') isAudioMuted = parsed.isMuted;
    if (typeof parsed.sfxEnabled === 'boolean') sfxEnabled = parsed.sfxEnabled;
    if (typeof parsed.musicEnabled === 'boolean') musicEnabled = parsed.musicEnabled;
  }
} catch (e) {
  console.warn('Could not read audio settings from localStorage');
}

function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({
      masterVolume,
      musicVolume,
      sfxVolume,
      isMuted: isAudioMuted,
      sfxEnabled,
      musicEnabled,
    }));
  } catch (e) {}
}

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

// Gain calculation helpers
function calcEffectiveSfxGain(baseGain) {
  if (isAudioMuted || !sfxEnabled) return 0;
  return Math.max(0.0001, baseGain * masterVolume * sfxVolume);
}

function calcEffectiveMusicGain(baseGain) {
  if (isAudioMuted || !musicEnabled) return 0;
  return Math.max(0, baseGain * masterVolume * musicVolume);
}

// Volume Controls
export function getMasterVolume() { return masterVolume; }
export function setMasterVolume(val) {
  masterVolume = Math.max(0, Math.min(1, Number(val) || 0));
  updateMusicGain();
  saveAudioSettings();
}

export function getMusicVolume() { return musicVolume; }
export function setMusicVolume(val) {
  musicVolume = Math.max(0, Math.min(1, Number(val) || 0));
  updateMusicGain();
  saveAudioSettings();
}

export function getSfxVolume() { return sfxVolume; }
export function setSfxVolume(val) {
  sfxVolume = Math.max(0, Math.min(1, Number(val) || 0));
  saveAudioSettings();
}

export function isMuted() { return isAudioMuted; }
export function setMuted(muted) {
  isAudioMuted = Boolean(muted);
  updateMusicGain();
  saveAudioSettings();
}

export function toggleMute() {
  setMuted(!isAudioMuted);
  return isAudioMuted;
}

export function setSfxEnabled(enabled) {
  sfxEnabled = Boolean(enabled);
  saveAudioSettings();
}

export function setMusicEnabled(enabled) {
  musicEnabled = Boolean(enabled);
  if (!enabled) {
    stopMusic();
  } else if (!musicOsc) {
    startMusic();
  }
  saveAudioSettings();
}

export function isSfxEnabled() { return sfxEnabled && !isAudioMuted && sfxVolume > 0 && masterVolume > 0; }
export function isMusicEnabled() { return musicEnabled && !isAudioMuted && musicVolume > 0 && masterVolume > 0; }

export function resetAudioSettings() {
  masterVolume = 0.8;
  musicVolume = 0.7;
  sfxVolume = 0.8;
  isAudioMuted = false;
  sfxEnabled = true;
  musicEnabled = true;
  updateMusicGain();
  saveAudioSettings();
  return {
    masterVolume,
    musicVolume,
    sfxVolume,
    isMuted: isAudioMuted,
  };
}

export function getAudioSettings() {
  return {
    masterVolume,
    musicVolume,
    sfxVolume,
    isMuted: isAudioMuted,
    sfxEnabled,
    musicEnabled,
  };
}

function updateMusicGain() {
  if (musicGain && audioCtx) {
    const targetGain = calcEffectiveMusicGain(0.04);
    musicGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
  }
}

// ===== SOUND EFFECTS =====
export function playCoinSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain1 = calcEffectiveSfxGain(0.18);
  const targetGain2 = calcEffectiveSfxGain(0.12);

  // Bright chime sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
  gain.gain.setValueAtTime(targetGain1, now);
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
  gain2.gain.setValueAtTime(targetGain2, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.35);
}

export function playChestSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.14);

  // Rich opening sound - ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(targetGain, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
}

export function playGameOverSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.16);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.8);
  gain.gain.setValueAtTime(targetGain, now);
  gain.gain.linearRampToValueAtTime(0, now + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.0);
}

export function playDamageSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.22);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
  gain.gain.setValueAtTime(targetGain, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

export function playBiteSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.26);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  gain.gain.setValueAtTime(targetGain, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

export function playDefeatSound() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.14);

  const chords = [220, 174.61, 130.81]; // A3, F3, C3
  chords.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.8, now + 1.2);
    gain.gain.setValueAtTime(targetGain, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  });
}

// ===== MUSIC =====
export function startMusic() {
  if (!musicEnabled || isAudioMuted || musicVolume <= 0 || masterVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (musicOsc) return; // Already playing

  const effectiveGain = calcEffectiveMusicGain(0.04);
  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(effectiveGain, ctx.currentTime);
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
  gain2.connect(musicGain);
  osc2.start();

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
    } catch (e) {}
    musicOsc = null;
    musicGain = null;
  }
}

// ===== CINEMATIC INTRO SOUNDS =====
export function playCinematicIntroChord(sceneIndex = 0) {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.12);

  // Harmonious chord notes per scene
  const chordSets = [
    [261.63, 329.63, 392.00, 523.25], // Scene 1: Welcome (Warm C Major)
    [392.00, 493.88, 587.33, 880.00], // Scene 2: Treasure (Bright G Major)
    [130.81, 164.81, 196.00, 246.94], // Scene 3: Danger (Deep Suspense)
    [329.63, 392.00, 493.88, 659.25], // Scene 4: Health (Mystical E Minor/Major)
    [261.63, 392.00, 523.25, 783.99], // Scene 5: Adventure Start (Triumphant C-G)
  ];

  const notes = chordSets[sceneIndex % chordSets.length];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = sceneIndex === 2 ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const noteGain = (targetGain / notes.length) * (sceneIndex === 2 ? 0.6 : 1.0);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(noteGain, now + 0.35 + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.6);
  });
}

export function playMarkerChime() {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(0.1);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(987.77, now); // B5
  osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6
  gain.gain.setValueAtTime(targetGain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.36);
}

export function playCountdownBeep(isGo = false) {
  if (!sfxEnabled || isAudioMuted || masterVolume <= 0 || sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const targetGain = calcEffectiveSfxGain(isGo ? 0.2 : 0.14);

  if (!isGo) {
    // Crisp tick beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    gain.gain.setValueAtTime(targetGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  } else {
    // Double bell triumphant fanfare for GO!
    [880, 1174.66, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(targetGain * 0.7, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.6);
    });
  }
}

