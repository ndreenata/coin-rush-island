// ===== COIN RUSH ISLAND - Main Game Engine =====

import * as THREE from 'three';
import {
  createWorld,
  isPlayerInRiver,
  isPlayerOnBridge,
  getRiverCenterZ,
  getTerrainHeight,
  getGroundHeight,
  LANDMARKS,
  updateRiver,
  createWaterRipple,
  createWaterSplash,
  updateWaterEffects,
  updateEnvironmentAnimation,
  generateRoundCollectibles,
} from './world.js';
import { createCharacter, animateCharacter, triggerCharacterDamage, animateCharacterDeath } from './character.js';
import {
  createCoin,
  createChest,
  createChestOpen,
  createGoldenChest,
  createGoldenChestOpen,
  createHealthPotion,
  createKey,
  createCoinParticle,
  createHealParticle,
  animateCoins,
  updateParticles,
} from './collectibles.js';
import { CrocodileManager } from './crocodiles.js';
import { Minimap } from './minimap.js';
import { MultiplayerManager, createNameTagSprite } from './multiplayer.js';
import { TrapManager } from './traps.js';
import { supabaseLeaderboard } from './supabase.js';
import {
  resumeAudio,
  playCoinSound,
  playChestSound,
  playGameOverSound,
  playDamageSound,
  playBiteSound,
  playDefeatSound,
  startMusic,
  stopMusic,
  setSfxEnabled,
  setMusicEnabled,
  isSfxEnabled,
  isMusicEnabled,
  getMasterVolume,
  setMasterVolume,
  getMusicVolume,
  setMusicVolume,
  getSfxVolume,
  setSfxVolume,
  isMuted,
  setMuted,
  toggleMute,
  resetAudioSettings,
  getAudioSettings,
  playCinematicIntroChord,
  playCountdownBeep,
  playMarkerChime,
} from './audio.js';

// ===== CONSTANTS =====
const GAME_DURATION = 120;
const MOVE_SPEED = 8.2;
const CAMERA_HEIGHT = 10;
const CAMERA_DISTANCE = 14;
const COIN_COLLECT_DIST = 1.8;
const CHEST_INTERACT_DIST = 2.2; // Comfortable interaction ring
const POTION_PICKUP_DIST = 2.4;  // Expanded reliable pickup distance for smooth gameplay
const ISLAND_RADIUS = 75;        // Expanded 4-6x open world island
const PLAYER_RADIUS = 0.30;      // Tighter, responsive character collider radius
const COIN_POINTS = 10;
const CHEST_POINTS = 50;
const GOLDEN_CHEST_POINTS = 100;
const POTION_HEAL = 30;
const TOTAL_COINS = 80;
const MAX_HEALTH = 100;
const COMBO_TIMEOUT = 3.5;
const SECRET_GROTTO_POINTS = 30;
const PERFECT_BONUS_POINTS = 100;
const HIGH_SCORE_KEY = 'coin_rush_island_high_score';

// ===== STATE =====
let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'
let score = 0;
let health = MAX_HEALTH;
let coinsCollected = 0;
let chestsOpened = 0;
let timeRemaining = GAME_DURATION;
let gameStartTime = 0;

// Tahap C Progression & Missions State
let potions = [];   // { mesh, collected, heal, baseY, index }
let keyItem = null; // { mesh, collected, baseY, x, z }
let hasKey = false;
let comboCount = 0;
let maxCombo = 0;
let lastCoinCollectTime = 0;
let secretGrottoDiscovered = false;
let perfectBonusAwarded = false;
let difficultyMultiplier = 1.0;
let highScore = 0;

let sideMissions = [
  {
    id: 'coins_20',
    title: 'Kolektor Koin',
    desc: 'Kumpulkan 20 koin tropis',
    target: 20,
    current: 0,
    reward: 30,
    completed: false,
  },
  {
    id: 'find_grotto',
    title: 'Penjelajah Gua',
    desc: 'Temukan Gua Rahasia di barat laut pulau',
    target: 1,
    current: 0,
    reward: 30,
    completed: false,
  },
  {
    id: 'open_golden_chest',
    title: 'Harta Karun Kuno',
    desc: 'Buka Peti Emas Terkunci di Altar',
    target: 1,
    current: 0,
    reward: 50,
    completed: false,
  },
];

// Damage and hazard tracking
let crocDamageCooldown = 0;
let damageOverlayTimer = 0;
let riverDamageSoundTimer = 0;
let riverDamagePopupTimer = 0;

// Jump state (Tahap A & Prioritas 3)
let isJumping = false;
let isGrounded = true;
let jumpVelocityY = 0;
let jumpHeight = 0;
const JUMP_IMPULSE = 7.6; // High enough to clear low obstacles, stones & curbs
const JUMP_GRAVITY = 19.5;

// Death fall animation state (Prioritas 8)
let deathAnimActive = false;
let deathAnimTimer = 0;

// 360° Third-Person Orbit Camera State
let cameraYaw = Math.PI; // Face forward into the island
let cameraPitch = 0.32;  // ~18° elevation angle
let cameraDistance = 6.8;
let cameraTargetDistance = 6.8;
let isDraggingCamera = false;
let lastPointerX = 0;
let lastPointerY = 0;

// Shift Lock State (Roblox Style 360° Lock)
let isShiftLockActive = false;

function safeRequestPointerLock(canvas) {
  if (!canvas || typeof canvas.requestPointerLock !== 'function') return;
  try {
    const p = canvas.requestPointerLock();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch (err) {}
}

function safeExitPointerLock() {
  if (typeof document.exitPointerLock !== 'function') return;
  try {
    const p = document.exitPointerLock();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch (err) {}
}

export function isTouchDevice() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || (window.innerWidth <= 768);
}

export function toggleShiftLock(forceState) {
  if (typeof forceState === 'boolean') {
    isShiftLockActive = forceState;
  } else {
    isShiftLockActive = !isShiftLockActive;
  }

  const shiftLockBtn = document.getElementById('btn-shift-lock');
  const shiftLockVal = document.getElementById('hud-shift-lock-val');
  const mobileShiftBtn = document.getElementById('mobile-shift-lock');
  const reticle = document.getElementById('shift-lock-reticle');
  const canvas = renderer ? renderer.domElement : document.getElementById('game-canvas');

  if (isShiftLockActive) {
    if (shiftLockBtn) shiftLockBtn.classList.add('active');
    if (shiftLockVal) shiftLockVal.textContent = 'KUNCI';
    if (mobileShiftBtn) mobileShiftBtn.classList.add('active');
    if (reticle && gameState === 'playing' && !isGamePaused) reticle.classList.remove('hidden');
    showCoinPopup('SHIFT LOCK ON');

    // On desktop in active gameplay, request pointer lock for seamless mouse look
    if (gameState === 'playing' && !isGamePaused && canvas && !isTouchDevice()) {
      safeRequestPointerLock(canvas);
    }
  } else {
    if (shiftLockBtn) shiftLockBtn.classList.remove('active');
    if (shiftLockVal) shiftLockVal.textContent = 'BEBAS';
    if (mobileShiftBtn) mobileShiftBtn.classList.remove('active');
    if (reticle) reticle.classList.add('hidden');

    if (canvas && document.pointerLockElement === canvas) {
      safeExitPointerLock();
    }
  }
}

// Pause and Exit State
let isGamePaused = false;
let pauseStartTime = 0;
let totalPausedDuration = 0;
let isExitConfirmOpen = false;

// ===== SOLO MODE PLAYER IDENTITY & GREETINGS =====
const ENTRY_GREETINGS = [
  'ready to explore the island?',
  'your next adventure starts here.',
  'the island is waiting for you.',
  'let’s collect some treasure.',
  'the tropical breeze welcomes you.',
  'sunshine, secrets, and gold await.',
  'time to uncover ancient ruins.'
];

const TROPICAL_NAME_PREFIXES = [
  'Mango', 'Tropic', 'Coco', 'Sunny', 'Island', 'Palm', 'Coral', 'Breeze',
  'Lagoon', 'Wave', 'Kiwi', 'Amber', 'Jungle', 'Tide', 'Banana', 'Papaya',
  'Ocean', 'Bamboo', 'Sunset', 'Pearl', 'Safari', 'Reef', 'Dolphin', 'Toucan'
];

const TROPICAL_NAME_SUFFIXES = [
  'Rider', 'Fox', 'Runner', 'Explorer', 'Voyager', 'Seeker', 'Diver', 'Hunter',
  'Ranger', 'Surfer', 'Scout', 'Falcon', 'Nomad', 'Tracker', 'Sailor', 'Pioneer',
  'Captain', 'Adventurer', 'Rover', 'Wanderer'
];

export function generateRandomTropicalName() {
  const prefix = TROPICAL_NAME_PREFIXES[Math.floor(Math.random() * TROPICAL_NAME_PREFIXES.length)];
  const suffix = TROPICAL_NAME_SUFFIXES[Math.floor(Math.random() * TROPICAL_NAME_SUFFIXES.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${prefix}${suffix}${Math.random() > 0.4 ? num : ''}`;
}

export function validatePlayerName(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Nama tidak boleh kosong.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    return { valid: false, error: 'Panjang nama harus 1-20 karakter.' };
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
    return { valid: false, error: 'Gunakan hanya huruf, angka, spasi, dash, atau underscore.' };
  }
  return { valid: true, name: trimmed };
}

let currentPlayerName = 'Petualang';
let characterNameTag = null;

function syncPlayerNameUI(name) {
  const soloInput = document.getElementById('solo-player-name');
  const displayText = document.getElementById('player-name-display-text');
  const hudName = document.getElementById('hud-player-name');
  if (soloInput && soloInput.value !== name) soloInput.value = name;
  if (displayText) displayText.textContent = name;
  if (hudName) hudName.textContent = name;
}

function getActivePlayerName() {
  const soloInput = document.getElementById('solo-player-name');
  let raw = '';
  if (soloInput && soloInput.value && soloInput.value.trim().length > 0) {
    raw = soloInput.value;
  } else {
    try {
      const saved = localStorage.getItem('coin_rush_player_name');
      if (saved) raw = saved;
    } catch (e) {}
  }

  const check = validatePlayerName(raw);
  if (check.valid) {
    currentPlayerName = check.name;
  } else if (!currentPlayerName || currentPlayerName === 'Petualang') {
    currentPlayerName = generateRandomTropicalName();
    try {
      localStorage.setItem('coin_rush_player_name', currentPlayerName);
    } catch (e) {}
  }
  syncPlayerNameUI(currentPlayerName);
  return currentPlayerName;
}

function initPlayerIdentity() {
  // 1. Display Random Greeting on Main Menu
  const greetingEl = document.getElementById('menu-greeting');
  if (greetingEl) {
    const greeting = ENTRY_GREETINGS[Math.floor(Math.random() * ENTRY_GREETINGS.length)];
    greetingEl.textContent = `“${greeting}”`;
  }

  // 2. Load or generate player name
  let savedName = '';
  try {
    savedName = localStorage.getItem('coin_rush_player_name') || '';
  } catch (e) {}

  const check = validatePlayerName(savedName);
  if (check.valid) {
    currentPlayerName = check.name;
  } else {
    currentPlayerName = generateRandomTropicalName();
    try {
      localStorage.setItem('coin_rush_player_name', currentPlayerName);
    } catch (e) {}
  }

  const soloInput = document.getElementById('solo-player-name');
  const feedbackMsg = document.getElementById('name-feedback-msg');
  const btnRandom = document.getElementById('btn-random-name');
  const btnSave = document.getElementById('btn-save-name');
  const btnEdit = document.getElementById('btn-edit-name');
  const btnCancel = document.getElementById('btn-cancel-edit-name');
  const displayRow = document.getElementById('player-name-display-row');
  const editRow = document.getElementById('player-name-edit-row');

  if (soloInput) {
    soloInput.value = currentPlayerName;
  }

  let feedbackTimer = null;
  function showNameFeedback(msg, isError = false) {
    if (!feedbackMsg) return;
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackMsg.textContent = msg;
    feedbackMsg.className = `name-feedback-mini ${isError ? 'error' : ''}`;
    feedbackMsg.classList.remove('hidden');
    feedbackTimer = setTimeout(() => {
      if (feedbackMsg) feedbackMsg.classList.add('hidden');
    }, 2400);
  }

  function switchToDisplayMode() {
    if (editRow) editRow.classList.add('hidden');
    if (displayRow) displayRow.classList.remove('hidden');
  }

  function switchToEditMode() {
    if (displayRow) displayRow.classList.add('hidden');
    if (editRow) editRow.classList.remove('hidden');
    if (soloInput) {
      soloInput.value = currentPlayerName;
      soloInput.focus();
      soloInput.select();
    }
  }

  // Toggle edit mode
  if (btnEdit) {
    btnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      switchToEditMode();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', (e) => {
      e.preventDefault();
      if (soloInput) soloInput.value = currentPlayerName;
      switchToDisplayMode();
    });
  }

  // Randomize button
  if (btnRandom) {
    btnRandom.addEventListener('click', (e) => {
      e.preventDefault();
      const newName = generateRandomTropicalName();
      currentPlayerName = newName;
      if (soloInput) soloInput.value = newName;
      try {
        localStorage.setItem('coin_rush_player_name', newName);
      } catch (err) {}
      syncPlayerNameUI(newName);
      updateLocalPlayerNameTag(newName);
      showNameFeedback('SAVED', false);
    });
  }

  // Save button
  if (btnSave) {
    btnSave.addEventListener('click', (e) => {
      e.preventDefault();
      const raw = soloInput ? soloInput.value : '';
      const result = validatePlayerName(raw);
      if (!result.valid) {
        showNameFeedback(result.error, true);
        return;
      }
      currentPlayerName = result.name;
      if (soloInput) soloInput.value = result.name;
      try {
        localStorage.setItem('coin_rush_player_name', result.name);
      } catch (err) {}
      syncPlayerNameUI(result.name);
      updateLocalPlayerNameTag(result.name);
      switchToDisplayMode();
      showNameFeedback('SAVED', false);
    });
  }

  // Enter key support inside solo input
  if (soloInput) {
    soloInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSave?.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        btnCancel?.click();
      }
    });
  }

  // Default mode: text view
  switchToDisplayMode();
  syncPlayerNameUI(currentPlayerName);
}

function updateLocalPlayerNameTag(name) {
  if (!character) return;
  if (characterNameTag) {
    character.remove(characterNameTag);
    if (characterNameTag.material) {
      if (characterNameTag.material.map) characterNameTag.material.map.dispose();
      characterNameTag.material.dispose();
    }
    characterNameTag = null;
  }
  characterNameTag = createNameTagSprite(name, '#38bdf8');
  characterNameTag.position.set(0, 2.35, 0);
  character.add(characterNameTag);
}

// Three.js
let renderer, scene, camera;
let character;
let crocodileManager;
let waterMesh;
let coins = [];     // { mesh, collected }
let chests = [];    // { mesh, opened, openedMesh, isGold, isLocked, points }
let colliders = [];
let particles = [];
let minimap, minimapContainer;
let multiplayerManager = null;
let isMultiplayerMatch = false;

// Trap & Hazard system
let trapManager = null;

// Individual Health Potion state
let claimedPotions = new Set();

// Elimination & Spectator mode state
let isEliminated = false;
let isSpectating = false;
let spectateTargetId = null;

// Cinematic Pre-Match Briefing & Countdown state
let briefingActive = false;
let briefingTimer = 0;
let briefingDuration = 15;
let briefingSkipped = false;
let briefingSeed = 12345;
let countdownActive = false;
let countdownTimer = 0;
let countdownDuration = 3;

// Input
const keyboardInput = { up: false, down: false, left: false, right: false };
const mobileInput = { up: false, down: false, left: false, right: false };

function mapKeyToAction(key, code) {
  const k = (key || '').toLowerCase();
  const c = (code || '').toLowerCase();
  if (k === 'w' || c === 'keyw' || k === 'arrowup' || c === 'arrowup') return 'up';
  if (k === 's' || c === 'keys' || k === 'arrowdown' || c === 'arrowdown') return 'down';
  if (k === 'a' || c === 'keya' || k === 'arrowleft' || c === 'arrowleft') return 'left';
  if (k === 'd' || c === 'keyd' || k === 'arrowright' || c === 'arrowright') return 'right';
  if (k === 'e' || c === 'keye') return 'interact';
  if (k === ' ' || c === 'space') return 'jump';
  return null;
}

export function tryJump() {
  if (gameState !== 'playing' || !isGrounded || isJumping) return;
  isJumping = true;
  isGrounded = false;
  jumpVelocityY = JUMP_IMPULSE;
}

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || (window.innerWidth <= 768);
}

// Clock
const clock = new THREE.Clock();

// DOM refs
let hudTimer, hudScore, hudCoins, healthBarFill, hudHealthValue;
let interactPrompt, mobileInteract, coinPopup, damageOverlay, hazardWarning;
let resultTitle, resultReason, resultIconClock, resultIconDefeat, btnPlayAgainText, btnPlayAgain, btnSpectate;
let briefingOverlay, briefingTitle, briefingSubtitle, briefingWaiting, briefingBanner, btnSkipBriefing;
let countdownOverlay, countdownNumber, countdownSub;
let spectatorHud, spectatorTargetName, spectatorTargetHpFill, spectatorTargetScore, spectatorCount;
let btnSpectatorExit, btnSpectatePrev, btnSpectateNext;
let popupTimeout = null;

// Camera look target vector (reused to prevent GC)
const cameraLookTarget = new THREE.Vector3();

// ===== INIT =====
export function init() {
  // Renderer
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(20, 15, 20);
  camera.lookAt(0, 0, 0);

  // Cache DOM
  hudTimer = document.getElementById('hud-timer');
  hudScore = document.getElementById('hud-score');
  hudCoins = document.getElementById('hud-coins');
  healthBarFill = document.getElementById('health-bar-fill');
  hudHealthValue = document.getElementById('hud-health-value');
  interactPrompt = document.getElementById('interact-prompt');
  mobileInteract = document.getElementById('mobile-interact');
  coinPopup = document.getElementById('coin-popup');
  damageOverlay = document.getElementById('damage-overlay');
  hazardWarning = document.getElementById('hazard-warning');

  resultTitle = document.getElementById('result-title');
  resultReason = document.getElementById('result-reason');
  resultIconClock = document.getElementById('result-icon-clock');
  resultIconDefeat = document.getElementById('result-icon-defeat');
  btnPlayAgainText = document.getElementById('btn-play-again-text');
  btnPlayAgain = document.getElementById('btn-play-again');
  btnSpectate = document.getElementById('btn-spectate');

  briefingOverlay = document.getElementById('briefing-overlay');
  briefingTitle = document.getElementById('briefing-title');
  briefingSubtitle = document.getElementById('briefing-subtitle');
  briefingWaiting = document.getElementById('briefing-waiting');
  briefingBanner = document.getElementById('briefing-banner');
  btnSkipBriefing = document.getElementById('btn-skip-briefing');

  countdownOverlay = document.getElementById('countdown-overlay');
  countdownNumber = document.getElementById('countdown-number');
  countdownSub = document.getElementById('countdown-sub');

  spectatorHud = document.getElementById('spectator-hud');
  spectatorTargetName = document.getElementById('spectator-target-name');
  spectatorTargetHpFill = document.getElementById('spectator-target-hp-fill');
  spectatorTargetScore = document.getElementById('spectator-target-score');
  spectatorCount = document.getElementById('spectator-count');
  btnSpectatorExit = document.getElementById('btn-spectator-exit');
  btnSpectatePrev = document.getElementById('btn-spectate-prev');
  btnSpectateNext = document.getElementById('btn-spectate-next');

  // Minimap
  minimapContainer = document.getElementById('minimap-container');
  const minimapCanvas = document.getElementById('minimap');
  if (minimapCanvas) {
    minimap = new Minimap(minimapCanvas);
  }

  // Load High Score from localStorage
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) highScore = parseInt(saved, 10) || 0;
  } catch (e) {
    highScore = 0;
  }
  const badgeEl = document.getElementById('menu-high-score-val');
  if (badgeEl) badgeEl.textContent = highScore;

  // Build world (terrain, trees, rocks, river, bridges)
  const worldData = createWorld(scene);
  colliders = worldData.colliders;
  waterMesh = worldData.waterMesh;

  // Dangerous Hazard Traps (6 types)
  trapManager = new TrapManager(scene);
  trapManager.init(colliders);

  // Character
  character = createCharacter();
  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI; // Face forward into island
  scene.add(character);

  const initialPlayerName = getActivePlayerName();
  updateLocalPlayerNameTag(initialPlayerName);

  // Crocodiles
  crocodileManager = new CrocodileManager(scene);

  // Coins (40 standard coins)
  createCoins(worldData.coinPositions);

  // Chests (5 Wooden + 1 Locked Golden Chest)
  createChests(worldData.chestPositions);

  // Health Potions (3 emerald health vials)
  if (worldData.potionPositions) {
    createPotions(worldData.potionPositions);
  }

  // Golden Key (inside Secret Grotto)
  if (worldData.keyPosition) {
    createKeyItem(worldData.keyPosition);
  }

  // Initialize Side Missions
  initMissions();

  // Initialize Multiplayer Manager
  multiplayerManager = new MultiplayerManager(scene, {
    onLobbyUpdate: (lobby) => updateMultiplayerLobbyUI(lobby),
    onBriefingStarted: (data) => startCinematicBriefing(data.seed, data.briefingDuration || 15),
    onCountdownStarted: (data) => startMatchCountdown(data.duration || 3),
    onMatchOfficialStart: (data) => startOfficialMatchGameplay(data),
    onMatchStarted: (data) => startMultiplayerMatch(data.seed, data.startTime, data.duration),
    onTimeSync: (remaining) => {
      if (isMultiplayerMatch && gameState === 'playing') {
        timeRemaining = remaining;
        updateHUD();
      }
    },
    onCoinCollected: (data) => {
      if (data.collectorId !== multiplayerManager.playerId) {
        const coin = coins[data.coinIndex];
        if (coin && !coin.collected) {
          coin.collected = true;
          coin.mesh.visible = false;
          showCoinPopup(`${data.collectorName} +10 KOIN!`);
        }
      }
    },
    onChestOpened: (data) => {
      if (data.openerId !== multiplayerManager.playerId) {
        const chest = chests[data.chestIndex];
        if (chest && !chest.opened) {
          chest.opened = true;
          chest.mesh.visible = false;
          chest.openedMesh.visible = true;
          showCoinPopup(`${data.openerName} +${data.points} PETI!`, true);
        }
      }
    },
    onPotionClaimedConfirmed: (data) => {
      if (data.health !== undefined) {
        health = Math.min(MAX_HEALTH, data.health);
        updateHealthHUD();
      }
    },
    onPlayerEliminated: (data) => {
      showCoinPopup(`${data.playerName} TERELIMINASI!`, false, true);
      if (isSpectating) updateSpectatorHUD();
    },
    onMatchResults: (data) => {
      endMultiplayerMatch(data);
    },
    onError: (msg) => {
      showMpError(msg);
    },
  });

  // Events
  setupInput();
  setupUI();
  populateMiniLeaderboard();
  window.addEventListener('resize', onResize);

  // Start render loop
  clock.start();
  animate();
}

// ===== CREATE COINS =====
function createCoins(positions) {
  positions.forEach((pos, i) => {
    const coinMesh = createCoin();
    coinMesh.position.set(pos.x, pos.y || 1.0, pos.z);
    scene.add(coinMesh);
    coins.push({ mesh: coinMesh, collected: false, index: i });
  });
}

// ===== CREATE CHESTS =====
function createChests(positions) {
  chests.forEach(c => {
    if (c.mesh) scene.remove(c.mesh);
    if (c.openedMesh) scene.remove(c.openedMesh);
  });
  chests = [];

  positions.forEach((pos, i) => {
    const isGold = !!pos.isGold;
    const isLocked = !!pos.isLocked;
    const points = pos.points || (isGold ? GOLDEN_CHEST_POINTS : CHEST_POINTS);

    const chestMesh = isGold ? createGoldenChest() : createChest();
    chestMesh.position.set(pos.x, pos.y || 0, pos.z);
    scene.add(chestMesh);

    const openMesh = isGold ? createGoldenChestOpen() : createChestOpen();
    openMesh.position.copy(chestMesh.position);
    openMesh.visible = false;
    scene.add(openMesh);

    chests.push({
      mesh: chestMesh,
      opened: false,
      openedMesh: openMesh,
      index: i,
      isGold,
      isLocked,
      points,
    });
  });
}

// ===== CREATE HEALTH POTIONS =====
function createPotions(positions) {
  potions.forEach(p => {
    if (p.mesh) scene.remove(p.mesh);
  });
  potions = [];

  positions.forEach((pos, i) => {
    const mesh = createHealthPotion();
    const y = pos.y || (getTerrainHeight(pos.x, pos.z) + 0.45);
    mesh.position.set(pos.x, y, pos.z);
    scene.add(mesh);
    potions.push({
      mesh,
      collected: false,
      heal: pos.heal || POTION_HEAL,
      baseY: y,
      index: i,
    });
  });
}

// ===== CREATE GOLDEN KEY =====
function createKeyItem(pos) {
  if (keyItem && keyItem.mesh) {
    scene.remove(keyItem.mesh);
  }
  const mesh = createKey();
  const y = pos.y || (getTerrainHeight(pos.x, pos.z) + 0.45);
  mesh.position.set(pos.x, y, pos.z);
  scene.add(mesh);
  keyItem = {
    mesh,
    collected: false,
    baseY: y,
    x: pos.x,
    z: pos.z,
  };
}

// ===== SIDE MISSIONS SYSTEM =====
function initMissions() {
  sideMissions = [
    {
      id: 'coins_20',
      title: 'Kolektor Koin',
      desc: 'Kumpulkan 20 koin tropis',
      target: 20,
      current: 0,
      reward: 30,
      completed: false,
    },
    {
      id: 'find_grotto',
      title: 'Penjelajah Gua',
      desc: 'Temukan Gua Rahasia di barat laut pulau',
      target: 1,
      current: 0,
      reward: 30,
      completed: false,
    },
    {
      id: 'open_golden_chest',
      title: 'Harta Karun Kuno',
      desc: 'Buka Peti Emas Terkunci di Altar',
      target: 1,
      current: 0,
      reward: 50,
      completed: false,
    },
  ];
  renderMissionsHUD();
}

function updateMissionProgress(id, amt = 1) {
  const mission = sideMissions.find(m => m.id === id);
  if (!mission || mission.completed) return;

  mission.current = Math.min(mission.target, mission.current + amt);
  if (mission.current >= mission.target) {
    mission.completed = true;
    score += mission.reward;
    showCoinPopup(`MISI SELESAI: ${mission.title}! +${mission.reward}`, true);
    updateHUD();
  }
  renderMissionsHUD();
}

function renderMissionsHUD() {
  const container = document.getElementById('hud-missions');
  if (!container) return;
  container.innerHTML = sideMissions.map(m => `
    <div class="mission-item ${m.completed ? 'completed' : ''}">
      <span class="mission-title">${m.completed ? '✓ ' : '○ '}${m.title}</span>
      <span class="mission-prog">${m.completed ? 'SELESAI' : `${m.current}/${m.target}`}</span>
    </div>
  `).join('');
}

// ===== INPUT =====
function setupInput() {
  // Prevent context menu (right click) on game page while keeping inputs accessible
  window.addEventListener('contextmenu', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    if (e.key === 'Escape') {
      if (gameState === 'playing') {
        if (isExitConfirmOpen) {
          closeExitConfirmModal();
        } else {
          togglePause();
        }
      }
      return;
    }
    if (e.key === 'Shift') {
      if (gameState === 'playing' && !isGamePaused) {
        toggleShiftLock();
      }
      return;
    }
    if (e.key === 'c' || e.key === 'C') {
      toggleCollisionDebug();
      return;
    }
    const action = mapKeyToAction(e.key, e.code);
    if (action === 'interact') {
      if (gameState === 'playing' && !isGamePaused) {
        tryInteractChest();
      }
    } else if (action === 'jump') {
      if (gameState === 'playing' && !isGamePaused) {
        tryJump();
      }
    } else if (action) {
      keyboardInput[action] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    const action = mapKeyToAction(e.key, e.code);
    if (action && action !== 'interact' && action !== 'jump') {
      keyboardInput[action] = false;
    }
  });

  // 360° Camera Orbit Drag & Zoom on Game Canvas
  const canvas = renderer ? renderer.domElement : document.getElementById('game-canvas');
  if (canvas) {
    const onPointerDown = (e) => {
      // Allow left click (0) or right click (2)
      if (e.button !== undefined && e.button !== 0 && e.button !== 2) return;
      if (e.target !== canvas) return;
      isDraggingCamera = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      canvas.classList.add('is-dragging');
    };

    const onPointerMove = (e) => {
      const isPointerLocked = document.pointerLockElement === canvas;
      if (!isDraggingCamera && !isPointerLocked) return;

      let dx = 0;
      let dy = 0;
      if (isPointerLocked) {
        dx = e.movementX || 0;
        dy = e.movementY || 0;
        if (Math.abs(dx) > 120) dx = Math.sign(dx) * 120;
        if (Math.abs(dy) > 120) dy = Math.sign(dy) * 120;
      } else {
        dx = e.clientX - lastPointerX;
        dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      }

      const sensitivity = isPointerLocked ? 0.0032 : 0.0055;
      cameraYaw -= dx * sensitivity;
      cameraPitch += dy * sensitivity;

      // Clamp vertical elevation pitch: ~3.5° (0.06) to ~75° (1.32)
      cameraPitch = Math.max(0.06, Math.min(1.32, cameraPitch));

      while (cameraYaw < 0) cameraYaw += Math.PI * 2;
      while (cameraYaw > Math.PI * 2) cameraYaw -= Math.PI * 2;
    };

    const onPointerUp = () => {
      isDraggingCamera = false;
      if (canvas) canvas.classList.remove('is-dragging');
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Pointer lock state listener
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && isShiftLockActive) {
        // Pointer lock released
      }
    });

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      const zoomDelta = Math.sign(e.deltaY) * 0.75;
      cameraTargetDistance = Math.max(3.8, Math.min(11.0, cameraTargetDistance + zoomDelta));
    }, { passive: false });

    // Mobile touch drag for camera rotation
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchDragging = false;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && e.target === canvas) {
        isTouchDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isTouchDragging || e.touches.length === 0) return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const dx = curX - touchStartX;
      const dy = curY - touchStartY;
      touchStartX = curX;
      touchStartY = curY;

      const touchSens = 0.0065;
      cameraYaw -= dx * touchSens;
      cameraPitch += dy * touchSens;
      cameraPitch = Math.max(0.06, Math.min(1.32, cameraPitch));
      while (cameraYaw < 0) cameraYaw += Math.PI * 2;
      while (cameraYaw > Math.PI * 2) cameraYaw -= Math.PI * 2;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isTouchDragging = false;
    }, { passive: true });
  }

  // Prevent sticky keys when window loses focus
  window.addEventListener('blur', () => {
    keyboardInput.up = false;
    keyboardInput.down = false;
    keyboardInput.left = false;
    keyboardInput.right = false;
    mobileInput.up = false;
    mobileInput.down = false;
    mobileInput.left = false;
    mobileInput.right = false;
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    dpadBtns.forEach(btn => btn.classList.remove('pressed'));
  });

  // Mobile D-Pad (Touch-and-hold via pointer events)
  const dpadBtns = document.querySelectorAll('.dpad-btn');
  dpadBtns.forEach(btn => {
    const dir = btn.dataset.dir;

    const startHold = (e) => {
      e.preventDefault();
      mobileInput[dir] = true;
      btn.classList.add('pressed');
      if (btn.setPointerCapture && e.pointerId !== undefined) {
        try {
          btn.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    };

    const stopHold = (e) => {
      e.preventDefault();
      mobileInput[dir] = false;
      btn.classList.remove('pressed');
      if (btn.releasePointerCapture && e.pointerId !== undefined) {
        try {
          btn.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
    };

    btn.addEventListener('pointerdown', startHold);
    btn.addEventListener('pointerup', stopHold);
    btn.addEventListener('pointercancel', stopHold);
    btn.addEventListener('lostpointercapture', stopHold);
    btn.addEventListener('touchstart', startHold, { passive: false });
    btn.addEventListener('touchend', stopHold, { passive: false });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // Global safety release
  window.addEventListener('pointerup', () => {
    dpadBtns.forEach(btn => btn.classList.remove('pressed'));
    mobileInput.up = false;
    mobileInput.down = false;
    mobileInput.left = false;
    mobileInput.right = false;
  });

  // Mobile interact button
  if (mobileInteract) {
    const triggerInteract = (e) => {
      e.preventDefault();
      if (gameState === 'playing') {
        tryInteractChest();
      }
    };
    mobileInteract.addEventListener('pointerdown', triggerInteract);
    mobileInteract.addEventListener('click', triggerInteract);
    mobileInteract.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Mobile jump button
  const mobileJump = document.getElementById('mobile-jump');
  if (mobileJump) {
    const triggerJump = (e) => {
      e.preventDefault();
      if (gameState === 'playing') {
        tryJump();
      }
    };
    mobileJump.addEventListener('pointerdown', triggerJump);
    mobileJump.addEventListener('click', triggerJump);
    mobileJump.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Prevent scrolling while playing
  document.addEventListener('touchmove', (e) => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLeaderboardDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return 'Baru saja';
    if (diffHours < 24) return `${Math.max(1, Math.floor(diffHours))} jam lalu`;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return '-';
  }
}

function updateMiniLeaderboard(scores) {
  for (let i = 1; i <= 3; i++) {
    const item = scores && scores[i - 1];
    const nameEl = document.getElementById(`mini-name-${i}`);
    const scoreEl = document.getElementById(`mini-score-${i}`);
    const cardEl = document.getElementById(`mini-card-${i}`);
    if (nameEl) {
      if (item && item.player_name) {
        nameEl.textContent = item.player_name;
        nameEl.style.opacity = '1';
        nameEl.style.fontStyle = 'normal';
      } else {
        nameEl.textContent = i === 1 ? 'Menunggu Rekor...' : 'Posisi Terbuka';
        nameEl.style.opacity = '0.55';
        nameEl.style.fontStyle = 'italic';
      }
    }
    if (scoreEl) {
      if (item && typeof item.score !== 'undefined') {
        scoreEl.textContent = String(item.score);
        scoreEl.style.opacity = '1';
      } else {
        scoreEl.textContent = '—';
        scoreEl.style.opacity = '0.45';
      }
    }
    if (cardEl) {
      cardEl.style.opacity = '0.7';
      setTimeout(() => {
        if (cardEl) cardEl.style.opacity = '1';
      }, 50 * i);
    }
  }
}

async function populateMiniLeaderboard() {
  if (supabaseLeaderboard.isConfigured()) {
    try {
      const res = await supabaseLeaderboard.fetchTopScores(3);
      if (res && res.success && res.scores && res.scores.length > 0) {
        updateMiniLeaderboard(res.scores);
        return;
      }
    } catch (e) {}
  }
  // Local fallback
  updateMiniLeaderboard([{ player_name: currentPlayerName || 'Petualang', score: highScore }]);
}

async function renderLeaderboard() {
  const statusEl = document.getElementById('leaderboard-status');
  const podiumEl = document.getElementById('leaderboard-top-podium');
  const tableBody = document.getElementById('leaderboard-table-body');
  if (!statusEl || !tableBody) return;

  if (!supabaseLeaderboard.isConfigured()) {
    statusEl.textContent = 'Penyimpanan Lokal Aktif (Supabase Belum Dikonfigurasi)';
    if (podiumEl) podiumEl.innerHTML = '';
    updateMiniLeaderboard([{ player_name: currentPlayerName || 'Petualang', score: highScore }]);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="leaderboard-empty-state">
          <p><strong>Rekor Lokal Perangkat Ini:</strong> <span style="color: #fbbf24; font-weight: 700;">${highScore} Poin</span></p>
          <p style="margin-top: 6px; font-size: 0.82rem; opacity: 0.75;">Papan skor global tersinkronisasi dapat diaktifkan dengan menambahkan variabel <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di Vercel / .env.</p>
        </td>
      </tr>
    `;
    return;
  }

  statusEl.textContent = 'Mengambil data rekor pulau...';
  if (podiumEl) podiumEl.innerHTML = '';
  tableBody.innerHTML = '<tr><td colspan="4" style="padding: 24px; text-align: center; color: rgba(255,255,255,0.65);">Memuat peringkat petualang...</td></tr>';

  const res = await supabaseLeaderboard.fetchTopScores(10);
  if (!res.success) {
    statusEl.textContent = 'Gagal memuat papan skor';
    if (podiumEl) podiumEl.innerHTML = '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="leaderboard-error-state">
          <p>Koneksi Supabase: ${escapeHtml(res.error || 'Terjadi kesalahan jaringan')}</p>
          <button id="btn-retry-leaderboard-error" class="btn btn-retry" style="margin-top: 8px;">Coba Lagi</button>
        </td>
      </tr>
    `;
    document.getElementById('btn-retry-leaderboard-error')?.addEventListener('click', () => renderLeaderboard());
    return;
  }

  const scores = res.scores || [];
  updateMiniLeaderboard(scores);
  statusEl.textContent = '10 Petualang Terhebat Global';

  if (scores.length === 0) {
    if (podiumEl) podiumEl.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="4" class="leaderboard-empty-state">Belum ada rekor petualang tercatat. Jadilah yang pertama!</td></tr>';
    return;
  }

  // Render Top 3 Podium
  if (podiumEl) {
    const top1 = scores[0];
    const top2 = scores[1];
    const top3 = scores[2];

    podiumEl.innerHTML = `
      <!-- Rank 2 (Silver) -->
      <div class="podium-card podium-rank-2">
        <div class="podium-badge-icon">#2</div>
        <div class="podium-player-name" title="${top2 ? escapeHtml(top2.player_name) : '-'}">${top2 ? escapeHtml(top2.player_name) : '-'}</div>
        <div class="podium-score-val">${top2 ? top2.score : '-'} <span style="font-size:0.75rem;font-weight:600;opacity:0.8;">Poin</span></div>
        <div class="podium-date">${top2 ? formatLeaderboardDate(top2.created_at) : ''}</div>
      </div>

      <!-- Rank 1 (Gold) -->
      <div class="podium-card podium-rank-1">
        <div class="podium-badge-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
          </svg>
        </div>
        <div class="podium-player-name" title="${top1 ? escapeHtml(top1.player_name) : '-'}">${top1 ? escapeHtml(top1.player_name) : '-'}</div>
        <div class="podium-score-val">${top1 ? top1.score : '-'} <span style="font-size:0.8rem;font-weight:700;">Poin</span></div>
        <div class="podium-date">${top1 ? formatLeaderboardDate(top1.created_at) : ''}</div>
      </div>

      <!-- Rank 3 (Bronze) -->
      <div class="podium-card podium-rank-3">
        <div class="podium-badge-icon">#3</div>
        <div class="podium-player-name" title="${top3 ? escapeHtml(top3.player_name) : '-'}">${top3 ? escapeHtml(top3.player_name) : '-'}</div>
        <div class="podium-score-val">${top3 ? top3.score : '-'} <span style="font-size:0.75rem;font-weight:600;opacity:0.8;">Poin</span></div>
        <div class="podium-date">${top3 ? formatLeaderboardDate(top3.created_at) : ''}</div>
      </div>
    `;
  }

  // Render Table Rows
  tableBody.innerHTML = scores.map((item, idx) => {
    const isCurrentUser = (item.player_name && item.player_name === currentPlayerName);
    const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
    const dateFormatted = formatLeaderboardDate(item.created_at);
    return `
      <tr class="${isCurrentUser ? 'current-user' : ''}">
        <td><span class="rank-badge ${rankClass}">${idx + 1}</span></td>
        <td style="font-weight: 600;">${escapeHtml(item.player_name || 'Petualang')}${isCurrentUser ? ' <span style="font-size:0.72rem;color:#38bdf8;">(Anda)</span>' : ''}</td>
        <td class="score-col">${item.score}</td>
        <td class="date-col">${dateFormatted}</td>
      </tr>
    `;
  }).join('');
}

// ===== UI SETUP =====
function setupUI() {
  // Initialize dedicated Solo Identity & Random Greeting
  initPlayerIdentity();

  // MULAI SOLO button with smooth start transition animation
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      btnPlay.style.transform = 'scale(0.96)';
      setTimeout(() => { if (btnPlay) btnPlay.style.transform = ''; }, 120);

      const rawInput = document.getElementById('solo-player-name')?.value || '';
      const check = validatePlayerName(rawInput);
      if (check.valid) {
        currentPlayerName = check.name;
      } else if (!currentPlayerName || currentPlayerName === 'Petualang') {
        currentPlayerName = generateRandomTropicalName();
      }
      try {
        localStorage.setItem('coin_rush_player_name', currentPlayerName);
      } catch (e) {}

      syncPlayerNameUI(currentPlayerName);
      updateLocalPlayerNameTag(currentPlayerName);

      startSoloAdventureWithAnimation();
    });
  }

  // Pause & Exit Modal Handlers
  const btnPause = document.getElementById('btn-pause-game');
  if (btnPause) {
    btnPause.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePause();
    });
  }

  const btnResume = document.getElementById('btn-resume-game');
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      resumeGame();
    });
  }

  const btnRestart = document.getElementById('btn-restart-game');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      restartGame();
    });
  }

  const btnExit = document.getElementById('btn-exit-game');
  if (btnExit) {
    btnExit.addEventListener('click', () => {
      openExitConfirmModal();
    });
  }
  const btnExitToMenu = document.getElementById('btn-exit-to-menu');
  if (btnExitToMenu && btnExitToMenu !== btnExit) {
    btnExitToMenu.addEventListener('click', () => {
      openExitConfirmModal();
    });
  }

  const btnConfirmExit = document.getElementById('btn-confirm-exit');
  if (btnConfirmExit) {
    btnConfirmExit.addEventListener('click', () => {
      exitToMenu();
    });
  }

  const btnCancelExit = document.getElementById('btn-cancel-exit');
  if (btnCancelExit) {
    btnCancelExit.addEventListener('click', () => {
      closeExitConfirmModal();
    });
  }

  // How to Play overlay
  document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('how-to-play')?.classList.remove('hidden');
  });

  document.getElementById('btn-back-how')?.addEventListener('click', () => {
    document.getElementById('how-to-play')?.classList.add('hidden');
    document.getElementById('main-menu')?.classList.remove('hidden');
  });

  // Audio Volume Sliders & Settings Controls
  const sliderMaster = document.getElementById('slider-master-volume');
  const valMaster = document.getElementById('val-master-volume');
  const sliderMusic = document.getElementById('slider-music-volume');
  const valMusic = document.getElementById('val-music-volume');
  const sliderSfx = document.getElementById('slider-sfx-volume');
  const valSfx = document.getElementById('val-sfx-volume');
  const btnMute = document.getElementById('btn-mute-toggle');
  const btnResetAudio = document.getElementById('btn-reset-audio');

  function syncAudioUI() {
    const m = Math.round(getMasterVolume() * 100);
    const mu = Math.round(getMusicVolume() * 100);
    const s = Math.round(getSfxVolume() * 100);
    const muted = isMuted();

    if (sliderMaster) sliderMaster.value = m;
    if (valMaster) valMaster.textContent = `${m}%`;
    if (sliderMusic) sliderMusic.value = mu;
    if (valMusic) valMusic.textContent = `${mu}%`;
    if (sliderSfx) sliderSfx.value = s;
    if (valSfx) valSfx.textContent = `${s}%`;
    if (btnMute) {
      btnMute.textContent = muted ? 'ON' : 'OFF';
      if (muted) btnMute.classList.add('active');
      else btnMute.classList.remove('active');
    }
  }

  if (sliderMaster) {
    sliderMaster.addEventListener('input', (e) => {
      resumeAudio();
      const val = parseInt(e.target.value, 10);
      setMasterVolume(val / 100);
      if (valMaster) valMaster.textContent = `${val}%`;
    });
  }

  if (sliderMusic) {
    sliderMusic.addEventListener('input', (e) => {
      resumeAudio();
      const val = parseInt(e.target.value, 10);
      setMusicVolume(val / 100);
      if (valMusic) valMusic.textContent = `${val}%`;
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener('input', (e) => {
      resumeAudio();
      const val = parseInt(e.target.value, 10);
      setSfxVolume(val / 100);
      if (valSfx) valSfx.textContent = `${val}%`;
    });
  }

  if (btnMute) {
    btnMute.addEventListener('click', () => {
      resumeAudio();
      const active = toggleMute();
      btnMute.textContent = active ? 'ON' : 'OFF';
      if (active) btnMute.classList.add('active');
      else btnMute.classList.remove('active');
    });
  }

  if (btnResetAudio) {
    btnResetAudio.addEventListener('click', () => {
      resetAudioSettings();
      syncAudioUI();
    });
  }

  // Settings overlay
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('settings-menu')?.classList.remove('hidden');
    syncAudioUI();
  });

  document.getElementById('btn-back-settings')?.addEventListener('click', () => {
    document.getElementById('settings-menu')?.classList.add('hidden');
    document.getElementById('main-menu')?.classList.remove('hidden');
  });

  // Mini leaderboard open button
  document.getElementById('btn-mini-lb-open')?.addEventListener('click', () => {
    document.getElementById('btn-leaderboard')?.click();
  });

  // Leaderboard overlay
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const modalLeaderboard = document.getElementById('leaderboard-menu');
  const btnBackLeaderboard = document.getElementById('btn-back-leaderboard');
  const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');

  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => {
      document.getElementById('main-menu')?.classList.add('hidden');
      if (modalLeaderboard) modalLeaderboard.classList.remove('hidden');
      renderLeaderboard();
    });
  }

  if (btnBackLeaderboard) {
    btnBackLeaderboard.addEventListener('click', () => {
      if (modalLeaderboard) modalLeaderboard.classList.add('hidden');
      document.getElementById('main-menu')?.classList.remove('hidden');
    });
  }

  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener('click', () => {
      renderLeaderboard();
    });
  }

  // Audio legacy toggles (for backward compatibility)
  document.getElementById('sfx-toggle')?.addEventListener('click', (e) => {
    const active = e.target.classList.toggle('active');
    e.target.textContent = active ? 'ON' : 'OFF';
    setSfxEnabled(active);
  });

  document.getElementById('music-toggle')?.addEventListener('click', (e) => {
    const active = e.target.classList.toggle('active');
    e.target.textContent = active ? 'ON' : 'OFF';
    setMusicEnabled(active);
    if (active && gameState === 'playing' && !isGamePaused) startMusic();
  });

  // 15-Second Cinematic Intro Skip Button
  const btnSkipIntro = document.getElementById('btn-skip-intro');
  if (btnSkipIntro) {
    btnSkipIntro.addEventListener('click', (e) => {
      e.stopPropagation();
      skipCinematicIntro();
    });
  }

  // Briefing Skip & Don't Show Again Handler
  const btnSkipBriefing = document.getElementById('btn-skip-briefing');
  const briefingDontShow = document.getElementById('briefing-dont-show');
  const briefingModal = document.getElementById('briefing-overlay');
  const startBanner = document.getElementById('adventure-start-banner');

  if (btnSkipBriefing) {
    btnSkipBriefing.addEventListener('click', () => {
      if (briefingDontShow && briefingDontShow.checked) {
        try {
          localStorage.setItem('coin_rush_skip_briefing', 'true');
        } catch (e) {}
      }

      if (briefingModal) briefingModal.classList.add('hidden');

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        cameraDistance = 6.8;
        cameraTargetDistance = 6.8;
        cameraPitch = 0.32;
        cameraYaw = Math.PI;
        beginGameplay();
        return;
      }

      if (startBanner) startBanner.classList.remove('hidden');
      gameState = 'transitioning';
      playChestSound();

      const animDuration = 1100;
      const startAnimTime = performance.now();

      function animateBriefingToGame(now) {
        const elapsed = now - startAnimTime;
        const progress = Math.min(1.0, elapsed / animDuration);
        const ease = 1 - Math.pow(1 - progress, 3);
        cameraDistance = 14.0 - (14.0 - 6.8) * ease;
        cameraPitch = 0.42 - (0.42 - 0.32) * ease;
        cameraTargetDistance = 6.8;

        if (progress < 1.0 && gameState === 'transitioning') {
          requestAnimationFrame(animateBriefingToGame);
        } else if (gameState === 'transitioning') {
          if (startBanner) startBanner.classList.add('hidden');
          cameraDistance = 6.8;
          cameraPitch = 0.32;
          cameraYaw = Math.PI;
          beginGameplay();
        }
      }
      requestAnimationFrame(animateBriefingToGame);
    });
  }

  // Prevent pause overlay clicks from propagating to canvas
  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) {
    pauseOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    pauseOverlay.addEventListener('click', (e) => e.stopPropagation());
  }

  // Result screen buttons
  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    document.getElementById('result-screen')?.classList.add('hidden');
    restartGame();
  });

  const handleReturnToMenu = () => {
    document.getElementById('result-screen')?.classList.add('hidden');
    showMainMenu();
  };
  document.getElementById('btn-main-menu')?.addEventListener('click', handleReturnToMenu);
  document.getElementById('btn-result-menu')?.addEventListener('click', handleReturnToMenu);

  document.getElementById('btn-retry-submit')?.addEventListener('click', () => {
    submitSoloScore(score);
  });

  // Shift Lock button bindings (HUD and Mobile)
  const btnShiftLock = document.getElementById('btn-shift-lock');
  if (btnShiftLock) {
    btnShiftLock.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleShiftLock();
    });
  }

  const mobileShiftLock = document.getElementById('mobile-shift-lock');
  if (mobileShiftLock) {
    mobileShiftLock.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleShiftLock();
    });
  }
}

// ===== MULTIPLAYER GAME FLOW HELPERS =====
function updateMultiplayerLobbyUI(lobby) {
  if (!lobby) return;
  document.getElementById('mp-entry-view').classList.add('hidden');
  document.getElementById('mp-lobby-view').classList.remove('hidden');
  document.getElementById('mp-lobby-code').textContent = lobby.code;
  document.getElementById('mp-player-count').textContent = lobby.players.length;

  const listEl = document.getElementById('mp-players-list');
  if (listEl) {
    listEl.innerHTML = lobby.players.map(p => `
      <div class="mp-player-row">
        <div class="mp-player-name-col">
          <span class="mp-color-dot" style="background-color: ${p.color};"></span>
          <span>${p.name}${p.id === multiplayerManager?.playerId ? ' (Anda)' : ''}</span>
        </div>
        ${p.isHost ? '<span class="mp-host-badge">HOST</span>' : '<span style="font-size:0.75rem;color:rgba(255,255,255,0.5)">Siap</span>'}
      </div>
    `).join('');
  }

  const btnStart = document.getElementById('btn-mp-start');
  const statusEl = document.getElementById('mp-lobby-status');
  if (btnStart) {
    if (multiplayerManager?.isHost) {
      btnStart.disabled = false;
      btnStart.style.opacity = '1';
      btnStart.style.cursor = 'pointer';
      if (statusEl) statusEl.textContent = 'Anda adalah Host (Siap Mulai)';
    } else {
      btnStart.disabled = true;
      btnStart.style.opacity = '0.5';
      btnStart.style.cursor = 'not-allowed';
      if (statusEl) statusEl.textContent = 'Menunggu Host memulai...';
    }
  }
}

function showMpError(msg) {
  const errEl = document.getElementById('mp-error-msg');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    setTimeout(() => errEl.classList.add('hidden'), 4000);
  }
}

// ===== CINEMATIC PRE-MATCH BRIEFING & COUNTDOWN =====
function startCinematicBriefing(seed, duration = 15) {
  resumeAudio();
  isMultiplayerMatch = true;
  gameState = 'briefing';
  briefingActive = true;
  briefingSkipped = false;
  briefingTimer = 0;
  briefingDuration = duration;
  briefingSeed = seed || 12345;
  countdownActive = false;
  isEliminated = false;
  isSpectating = false;
  spectateTargetId = null;

  score = 0;
  health = MAX_HEALTH;
  coinsCollected = 0;
  chestsOpened = 0;
  claimedPotions.clear();

  // Reset traps
  if (trapManager) {
    trapManager.reset();
  }
  if (crocodileManager) {
    crocodileManager.reset();
  }

  // Setup island collectibles deterministically
  const roundData = generateRoundCollectibles(briefingSeed, colliders);
  coins.forEach(c => { if (c.mesh) scene.remove(c.mesh); });
  coins = [];
  createCoins(roundData.coins);
  createChests(roundData.chests);
  createPotions(roundData.potions);
  createKeyItem(roundData.key);
  initMissions();

  // Reset character spawn
  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI;

  // Hide UI overlays
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('multiplayer-menu').classList.add('hidden');
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
  if (spectatorHud) spectatorHud.classList.add('hidden');
  if (countdownOverlay) countdownOverlay.classList.add('hidden');

  // Show briefing overlay
  if (briefingOverlay) {
    briefingOverlay.classList.remove('hidden');
    if (briefingBanner) briefingBanner.classList.remove('hidden');
    if (briefingWaiting) briefingWaiting.classList.add('hidden');
    if (briefingTitle) briefingTitle.textContent = 'COIN RUSH ISLAND';
    if (briefingSubtitle) briefingSubtitle.textContent = 'Jelajahi pulau, kumpulkan harta, dan bertahan hidup!';
  }

  // Camera start position for Island opening
  camera.position.set(28, 32, 28);
  cameraLookTarget.set(0, 2, 0);
  camera.lookAt(cameraLookTarget);
}

// ===== 15-SECOND CINEMATIC ISLAND INTRO SYSTEM =====
let cinematicActive = false;
let cinematicTimer = 0;
const CINEMATIC_DURATION = 15.0;
let cinematicCurrentScene = -1;
let cinematicCameraStartPos = new THREE.Vector3();
let cinematicCameraEndPos = new THREE.Vector3();
let cinematicLookStart = new THREE.Vector3();
let cinematicLookEnd = new THREE.Vector3();
let isSkippingIntro = false;
let lastCountdownAnnounced = -1;

function startCinematicIslandIntro() {
  gameState = 'cinematic';
  cinematicActive = true;
  cinematicTimer = 0;
  cinematicCurrentScene = -1;
  isSkippingIntro = false;

  // Immobilize character & zero inputs
  isGamePaused = false;
  keyboardInput.up = false;
  keyboardInput.down = false;
  keyboardInput.left = false;
  keyboardInput.right = false;
  mobileInput.up = false;
  mobileInput.down = false;
  mobileInput.left = false;
  mobileInput.right = false;

  // Hide gameplay HUD & overlays
  document.getElementById('hud')?.classList.add('hidden');
  document.getElementById('mobile-controls')?.classList.add('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');

  // Reveal cinematic overlay
  const cineOverlay = document.getElementById('cinematic-overlay');
  if (cineOverlay) cineOverlay.classList.remove('hidden');

  const countOverlay = document.getElementById('countdown-overlay');
  if (countOverlay) countOverlay.classList.add('hidden');

  // Position camera for Scene 0 start
  camera.position.set(0, 36, 75);
  cameraLookTarget.set(0, 4, 18);
  camera.lookAt(cameraLookTarget);

  updateCinematicScene(0);
}

function skipCinematicIntro() {
  if (isSkippingIntro || !cinematicActive) return;
  isSkippingIntro = true;
  cinematicActive = false;

  const cineOverlay = document.getElementById('cinematic-overlay');
  if (cineOverlay) cineOverlay.classList.add('hidden');

  if (character) {
    camera.position.set(character.position.x, character.position.y + 3.6, character.position.z + 6.8);
    cameraLookTarget.set(character.position.x, character.position.y + 1.35, character.position.z);
    camera.lookAt(cameraLookTarget);
    cameraYaw = 0;
    cameraPitch = 0.22;
    cameraDistance = 6.8;
    cameraTargetDistance = 6.8;
  }

  // Swift 1-second countdown transition
  startMatchCountdown(1);
}

function updateCinematicScene(sceneIdx) {
  cinematicCurrentScene = sceneIdx;
  const titleEl = document.getElementById('cinematic-title');
  const subEl = document.getElementById('cinematic-subtitle');
  const markerEl = document.getElementById('cinematic-marker');
  const markerText = document.getElementById('cinematic-marker-text');
  const markerIcon = document.getElementById('cinematic-marker-icon');

  playCinematicIntroChord(sceneIdx);

  const charPos = character ? character.position : new THREE.Vector3(0, 1.2, 54);
  const chestPos = (chests[0] && chests[0].mesh) ? chests[0].mesh.position.clone() : new THREE.Vector3(8, 2.5, 22);
  const dangerPos = new THREE.Vector3(-6.5, 0.8, 6.8);
  const potionPos = (potions[0] && potions[0].mesh) ? potions[0].mesh.position.clone() : new THREE.Vector3(2, 1.5, 52);

  if (sceneIdx === 0) {
    // Adegan 1 (0 - 3s): Welcome to the Island
    if (titleEl) titleEl.textContent = 'WELCOME TO THE ISLAND';
    if (subEl) subEl.textContent = 'A little island. A new adventure.';
    if (markerEl) markerEl.classList.add('hidden');

    cinematicCameraStartPos.set(0, 36, 75);
    cinematicCameraEndPos.set(0, 20, 58);
    cinematicLookStart.set(0, 4, 18);
    cinematicLookEnd.set(0, 2, 28);
  } else if (sceneIdx === 1) {
    // Adegan 2 (3 - 6s): Treasure Zone
    if (titleEl) titleEl.textContent = 'COLLECT THE TREASURE';
    if (subEl) subEl.textContent = 'Collect coins and chase your high score.';
    if (markerEl && markerText) {
      markerEl.className = 'cinematic-marker marker-gold';
      markerText.textContent = 'TREASURE ZONE';
      if (markerIcon) {
        markerIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#0f172a"/><path d="M12 9v6M10 12h4" stroke="#fbbf24" stroke-width="1.5"/></svg>`;
      }
      markerEl.classList.remove('hidden');
    }
    playMarkerChime();

    cinematicCameraStartPos.set(0, 20, 58);
    cinematicCameraEndPos.copy(chestPos).add(new THREE.Vector3(6.5, 4.2, 9.0));
    cinematicLookStart.set(0, 2, 28);
    cinematicLookEnd.copy(chestPos).add(new THREE.Vector3(0, 0.6, 0));
  } else if (sceneIdx === 2) {
    // Adegan 3 (6 - 9s): Danger Zone
    if (titleEl) titleEl.textContent = 'WATCH YOUR STEP';
    if (subEl) subEl.textContent = 'Avoid danger and stay alive.';
    if (markerEl && markerText) {
      markerEl.className = 'cinematic-marker marker-danger';
      markerText.textContent = 'DANGER ZONE';
      if (markerIcon) {
        markerIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="#0f172a" stroke-width="2"/><circle cx="12" cy="17" r="1" fill="#0f172a"/></svg>`;
      }
      markerEl.classList.remove('hidden');
    }
    playMarkerChime();

    cinematicCameraStartPos.copy(chestPos).add(new THREE.Vector3(6.5, 4.2, 9.0));
    cinematicCameraEndPos.set(-3.2, 5.8, 15.5);
    cinematicLookStart.copy(chestPos).add(new THREE.Vector3(0, 0.6, 0));
    cinematicLookEnd.copy(dangerPos);
  } else if (sceneIdx === 3) {
    // Adegan 4 (9 - 12s): Health Station
    if (titleEl) titleEl.textContent = 'STAY ALIVE, KEEP EXPLORING';
    if (subEl) subEl.textContent = 'Find health potions and keep moving.';
    if (markerEl && markerText) {
      markerEl.className = 'cinematic-marker marker-health';
      markerText.textContent = 'HEALTH STATION';
      if (markerIcon) {
        markerIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 2h6m-3 0v4m-4 5v7a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-7l-2-2V6h-4v3l-2 2z"/></svg>`;
      }
      markerEl.classList.remove('hidden');
    }
    playMarkerChime();

    cinematicCameraStartPos.set(-3.2, 5.8, 15.5);
    cinematicCameraEndPos.copy(potionPos).add(new THREE.Vector3(3.2, 2.5, -4.5));
    cinematicLookStart.copy(dangerPos);
    cinematicLookEnd.copy(potionPos).add(new THREE.Vector3(0, 0.4, 0));
  } else if (sceneIdx === 4) {
    // Adegan 5 (12 - 15s): Adventure Starts Now
    if (titleEl) titleEl.textContent = 'YOUR ADVENTURE STARTS NOW';
    if (subEl) subEl.textContent = 'Get ready to explore the island!';
    if (markerEl) markerEl.classList.add('hidden');

    const normalCamPos = charPos.clone().add(new THREE.Vector3(0, 3.6, 6.8));
    const normalLook = charPos.clone().add(new THREE.Vector3(0, 1.35, 0));

    cinematicCameraStartPos.copy(potionPos).add(new THREE.Vector3(3.2, 2.5, -4.5));
    cinematicCameraEndPos.copy(normalCamPos);
    cinematicLookStart.copy(potionPos).add(new THREE.Vector3(0, 0.4, 0));
    cinematicLookEnd.copy(normalLook);
  }
}

function updateCinematicIntro(dt) {
  if (!cinematicActive || isSkippingIntro) return;

  cinematicTimer += dt;
  const t = Math.min(cinematicTimer, CINEMATIC_DURATION);

  const sceneIdx = Math.min(4, Math.floor(t / 3.0));
  if (sceneIdx !== cinematicCurrentScene) {
    updateCinematicScene(sceneIdx);
  }

  const sceneElapsed = t - sceneIdx * 3.0;
  const rawProgress = Math.min(1.0, sceneElapsed / 3.0);
  const easeProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

  camera.position.lerpVectors(cinematicCameraStartPos, cinematicCameraEndPos, easeProgress);
  cameraLookTarget.lerpVectors(cinematicLookStart, cinematicLookEnd, easeProgress);
  camera.lookAt(cameraLookTarget);

  if (cinematicTimer >= CINEMATIC_DURATION) {
    cinematicActive = false;
    const cineOverlay = document.getElementById('cinematic-overlay');
    if (cineOverlay) cineOverlay.classList.add('hidden');

    cameraYaw = 0;
    cameraPitch = 0.22;
    cameraDistance = 6.8;
    cameraTargetDistance = 6.8;

    startMatchCountdown(3);
  }
}

function startMatchCountdown(duration = 3) {
  cinematicActive = false;
  countdownActive = true;
  countdownTimer = duration;
  countdownDuration = duration;
  lastCountdownAnnounced = -1;

  const cineOverlay = document.getElementById('cinematic-overlay');
  if (cineOverlay) cineOverlay.classList.add('hidden');

  const countOverlay = document.getElementById('countdown-overlay');
  if (countOverlay) countOverlay.classList.remove('hidden');

  if (character) {
    camera.position.set(character.position.x, character.position.y + 3.6, character.position.z + 6.8);
    cameraLookTarget.set(character.position.x, character.position.y + 1.35, character.position.z);
    camera.lookAt(cameraLookTarget);
  }
}

function updateCountdown(dt) {
  if (!countdownActive) return;

  countdownTimer -= dt;
  const count = Math.ceil(countdownTimer);

  const countNum = document.getElementById('countdown-number');
  const countSub = document.getElementById('countdown-sub');

  if (count > 0) {
    if (count !== lastCountdownAnnounced) {
      lastCountdownAnnounced = count;
      playCountdownBeep(false);
      if (countNum) {
        countNum.textContent = count;
        countNum.style.animation = 'none';
        void countNum.offsetWidth;
        countNum.style.animation = 'numberPulse 0.5s ease-out';
      }
      if (countSub) countSub.textContent = 'BERSIAPLAH!';
    }
  } else {
    if (lastCountdownAnnounced !== 0) {
      lastCountdownAnnounced = 0;
      playCountdownBeep(true);
      if (countNum) {
        countNum.textContent = 'GO!';
        countNum.style.animation = 'none';
        void countNum.offsetWidth;
        countNum.style.animation = 'numberPulse 0.5s ease-out';
      }
      if (countSub) countSub.textContent = 'MULAI PETUALANGAN!';
    }
  }

  // Smooth camera anchor behind character
  if (character) {
    const desiredPos = new THREE.Vector3(character.position.x, character.position.y + 3.6, character.position.z + 6.8);
    const desiredLook = new THREE.Vector3(character.position.x, character.position.y + 1.35, character.position.z);
    camera.position.lerp(desiredPos, Math.min(1.0, dt * 8.0));
    cameraLookTarget.lerp(desiredLook, Math.min(1.0, dt * 8.0));
    camera.lookAt(cameraLookTarget);
  }

  if (countdownTimer <= -0.6) {
    countdownActive = false;
    const countOverlay = document.getElementById('countdown-overlay');
    if (countOverlay) countOverlay.classList.add('hidden');

    beginGameplay();
  }
}

function startOfficialMatchGameplay(data) {
  briefingActive = false;
  countdownActive = false;

  if (briefingOverlay) briefingOverlay.classList.add('hidden');
  if (countdownOverlay) countdownOverlay.classList.add('hidden');

  gameState = 'playing';
  timeRemaining = (data && data.duration) || GAME_DURATION;
  gameStartTime = performance.now();

  const isHost = multiplayerManager && multiplayerManager.isHost;

  if (isHost) {
    // Priority 4: Host is spectator only!
    character.visible = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    if (minimapContainer) minimapContainer.classList.remove('hidden');
    enterSpectatorMode();
  } else {
    character.visible = true;
    document.getElementById('hud').classList.remove('hidden');
    if (minimapContainer) minimapContainer.classList.remove('hidden');
    if (isMobileDevice()) {
      document.getElementById('mobile-controls').classList.remove('hidden');
    }
  }

  const hudMpInfo = document.getElementById('hud-mp-info');
  if (hudMpInfo) {
    if (isMultiplayerMatch) {
      hudMpInfo.classList.remove('hidden');
      const codeEl = document.getElementById('hud-mp-code');
      if (codeEl) codeEl.textContent = multiplayerManager?.roomCode || '';
    } else {
      hudMpInfo.classList.add('hidden');
    }
  }

  updateHUD();
  updateHealthHUD();
  startMusic();
}

// ===== SPECTATOR MODE =====
function enterSpectatorMode() {
  if (!isMultiplayerMatch) return;
  isSpectating = true;

  document.getElementById('result-screen').classList.add('hidden');
  if (spectatorHud) spectatorHud.classList.remove('hidden');

  const living = multiplayerManager ? multiplayerManager.getLivingPlayers() : [];
  if (living.length > 0) {
    spectateTargetId = living[0].id;
  } else {
    spectateTargetId = null;
  }
  updateSpectatorHUD();
}

function exitSpectatorMode() {
  isSpectating = false;
  spectateTargetId = null;
  if (spectatorHud) spectatorHud.classList.add('hidden');
}

function cycleSpectatorTarget(direction = 1) {
  if (!multiplayerManager) return;
  const living = multiplayerManager.getLivingPlayers();
  if (living.length === 0) {
    showCoinPopup('Semua pemain telah tereliminasi!');
    return;
  }

  let idx = living.findIndex(p => p.id === spectateTargetId);
  if (idx === -1) {
    idx = 0;
  } else {
    idx = (idx + direction + living.length) % living.length;
  }
  spectateTargetId = living[idx].id;
  updateSpectatorHUD();
}

function updateSpectatorCamera(dt) {
  if (!isSpectating || !multiplayerManager) return;

  let target = spectateTargetId ? multiplayerManager.remotePlayers.get(spectateTargetId) : null;
  if (!target || target.eliminated || (target.health !== undefined && target.health <= 0)) {
    const living = multiplayerManager.getLivingPlayers();
    if (living.length > 0) {
      spectateTargetId = living[0].id;
      target = living[0];
    } else {
      spectateTargetId = null;
      target = null;
    }
    updateSpectatorHUD();
  }

  if (target && target.mesh) {
    const targetPos = target.mesh.position;
    const rotY = target.mesh.rotation.y;
    const offset = new THREE.Vector3(Math.sin(rotY) * -8, 6, Math.cos(rotY) * -8);
    const idealCamPos = targetPos.clone().add(offset);

    camera.position.lerp(idealCamPos, Math.min(1.0, dt * 5.0));
    cameraLookTarget.lerp(targetPos.clone().add(new THREE.Vector3(0, 1.4, 0)), Math.min(1.0, dt * 8.0));
    camera.lookAt(cameraLookTarget);
  }
}

function updateSpectatorHUD() {
  if (!isSpectating || !spectatorHud) return;

  const living = multiplayerManager ? multiplayerManager.getLivingPlayers() : [];
  const target = spectateTargetId ? multiplayerManager?.remotePlayers.get(spectateTargetId) : null;

  if (target) {
    if (spectatorTargetName) {
      spectatorTargetName.textContent = target.name || 'Petualang';
      spectatorTargetName.style.color = target.color || '#fff';
    }
    if (spectatorTargetHpFill) {
      const hp = Math.max(0, target.health ?? 100);
      spectatorTargetHpFill.style.width = `${hp}%`;
    }
    if (spectatorTargetScore) {
      spectatorTargetScore.textContent = `${target.score || 0} Poin`;
    }
    if (spectatorCount) {
      const curIdx = living.findIndex(p => p.id === target.id) + 1;
      spectatorCount.textContent = `Pemain ${curIdx > 0 ? curIdx : 1} dari ${Math.max(1, living.length)} yang bertahan`;
    }
  } else {
    if (spectatorTargetName) spectatorTargetName.textContent = 'Tidak Ada';
    if (spectatorTargetHpFill) spectatorTargetHpFill.style.width = '0%';
    if (spectatorTargetScore) spectatorTargetScore.textContent = '-';
    if (spectatorCount) spectatorCount.textContent = 'Semua petualang telah gugur!';
  }
}

function startMultiplayerMatch(seed, startTime, duration) {
  isMultiplayerMatch = true;
  resumeAudio();

  // Reset state
  gameState = 'playing';
  score = 0;
  health = MAX_HEALTH;
  coinsCollected = 0;
  chestsOpened = 0;
  timeRemaining = duration || GAME_DURATION;
  gameStartTime = performance.now();

  crocDamageCooldown = 0;
  damageOverlayTimer = 0;
  riverDamageSoundTimer = 0;
  riverDamagePopupTimer = 0;
  playerVelocity.set(0, 0);
  waterSplashTimer = 0;
  isJumping = false;
  isGrounded = true;
  jumpVelocityY = 0;
  jumpHeight = 0;
  isEliminated = false;
  isSpectating = false;
  spectateTargetId = null;
  claimedPotions.clear();

  comboCount = 0;
  maxCombo = 0;
  lastCoinCollectTime = 0;
  hasKey = false;
  secretGrottoDiscovered = false;
  perfectBonusAwarded = false;
  difficultyMultiplier = 1.0;

  if (crocodileManager) {
    crocodileManager.reset();
  }
  if (trapManager) {
    trapManager.reset();
  }

  const activeName = getActivePlayerName();
  updateLocalPlayerNameTag(activeName);

  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI;

  cameraYaw = Math.PI;
  cameraPitch = 0.32;
  cameraDistance = 6.8;
  cameraTargetDistance = 6.8;
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  cameraLookTarget.set(0, 1.5, 0);
  camera.lookAt(cameraLookTarget);

  particles.forEach(p => {
    scene.remove(p);
    p.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  });
  particles = [];

  // Deterministic server seed for identical items across all clients
  const roundData = generateRoundCollectibles(seed, colliders);

  coins.forEach(c => {
    if (c.mesh) scene.remove(c.mesh);
  });
  coins = [];
  createCoins(roundData.coins);

  createChests(roundData.chests);
  createPotions(roundData.potions);
  createKeyItem(roundData.key);
  initMissions();

  // Reset input
  keyboardInput.up = false;
  keyboardInput.down = false;
  keyboardInput.left = false;
  keyboardInput.right = false;
  mobileInput.up = false;
  mobileInput.down = false;
  mobileInput.left = false;
  mobileInput.right = false;

  // UI
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('multiplayer-menu').classList.add('hidden');
  document.getElementById('how-to-play').classList.add('hidden');
  document.getElementById('settings-menu').classList.add('hidden');
  document.getElementById('result-screen').classList.add('hidden');
  if (briefingOverlay) briefingOverlay.classList.add('hidden');
  if (countdownOverlay) countdownOverlay.classList.add('hidden');
  if (spectatorHud) spectatorHud.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.remove('hidden');

  // Show room code pill in HUD
  const hudMpInfo = document.getElementById('hud-mp-info');
  if (hudMpInfo) {
    hudMpInfo.classList.remove('hidden');
    const codeEl = document.getElementById('hud-mp-code');
    if (codeEl) codeEl.textContent = multiplayerManager?.roomCode || '';
  }

  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');

  if (isMobileDevice()) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  } else {
    document.getElementById('mobile-controls').classList.add('hidden');
  }

  hudTimer.classList.remove('warning');
  updateHUD();
  updateHealthHUD();

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) {
    if (isShiftLockActive) reticle.classList.remove('hidden');
    else reticle.classList.add('hidden');
  }

  startMusic();
}

function endMultiplayerMatch(results) {
  if (isSpectating) {
    exitSpectatorMode();
  }
  endGame('time');

  // Populate Olympic 3-Tier Podium
  const podiumEl = document.getElementById('mp-podium');
  if (podiumEl) {
    const p1 = results?.podium?.first;
    const p2 = results?.podium?.second;
    const p3 = results?.podium?.third;
    const name1 = document.getElementById('podium-name-1');
    const score1 = document.getElementById('podium-score-1');
    const name2 = document.getElementById('podium-name-2');
    const score2 = document.getElementById('podium-score-2');
    const name3 = document.getElementById('podium-name-3');
    const score3 = document.getElementById('podium-score-3');

    if (name1) name1.textContent = p1 ? p1.name : '-';
    if (score1) score1.textContent = p1 ? `${p1.score} P` : '0 P';
    if (name2) name2.textContent = p2 ? p2.name : '-';
    if (score2) score2.textContent = p2 ? `${p2.score} P` : '0 P';
    if (name3) name3.textContent = p3 ? p3.name : '-';
    if (score3) score3.textContent = p3 ? `${p3.score} P` : '0 P';
    podiumEl.classList.remove('hidden');
  }

  // Populate multiplayer leaderboard table
  const mpTable = document.getElementById('mp-results-table');
  const mpList = document.getElementById('mp-leaderboard-list');
  if (mpTable && mpList && results && results.leaderboard) {
    mpTable.classList.remove('hidden');
    mpList.innerHTML = results.leaderboard.map((p, idx) => `
      <div class="mp-rank-row ${idx === 0 ? 'winner' : ''} ${p.eliminated ? 'eliminated' : ''}">
        <div class="mp-rank-left">
          <span class="mp-rank-pos">${idx === 0 ? '<svg class="icon-inline" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg> 1' : (idx + 1)}</span>
          <span class="mp-color-dot" style="background-color: ${p.color};"></span>
          <span>${p.name}${p.id === multiplayerManager?.playerId ? ' (Anda)' : ''} ${p.eliminated ? '<span class="badge-elim">GUGUR</span>' : ''}</span>
        </div>
        <div class="mp-rank-right">${p.score} Poin</div>
      </div>
    `).join('');
  }

  const titleEl = document.getElementById('result-title');
  const msgEl = document.getElementById('result-message');
  const reasonEl = document.getElementById('result-reason');
  if (titleEl) titleEl.textContent = 'PERTANDINGAN SELESAI!';
  if (reasonEl) {
    reasonEl.textContent = 'Waktu 120 detik ronde kompetisi telah selesai!';
    reasonEl.classList.remove('hidden');
  }
  if (msgEl) {
    const winner = results?.podium?.first || results?.leaderboard?.[0];
    if (winner) {
      msgEl.textContent = `Juara 1: ${winner.name} dengan ${winner.score} Poin!`;
    }
  }

  document.getElementById('result-screen').classList.remove('hidden');
}

// ===== GAME FLOW & TRANSITIONS =====
function prepareGameSession() {
  isMultiplayerMatch = false;
  gameState = 'preparing';
  isGamePaused = false;
  isExitConfirmOpen = false;
  totalPausedDuration = 0;
  score = 0;
  health = MAX_HEALTH;
  coinsCollected = 0;
  chestsOpened = 0;
  timeRemaining = GAME_DURATION;

  crocDamageCooldown = 0;
  damageOverlayTimer = 0;
  riverDamageSoundTimer = 0;
  riverDamagePopupTimer = 0;
  playerVelocity.set(0, 0);
  waterSplashTimer = 0;
  isJumping = false;
  isGrounded = true;
  jumpVelocityY = 0;
  jumpHeight = 0;

  comboCount = 0;
  maxCombo = 0;
  lastCoinCollectTime = 0;
  hasKey = false;
  secretGrottoDiscovered = false;
  perfectBonusAwarded = false;
  difficultyMultiplier = 1.0;

  if (crocodileManager) {
    crocodileManager.reset();
  }

  const activeName = getActivePlayerName();
  updateLocalPlayerNameTag(activeName);

  // Position character at island origin facing forward
  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI;

  // Position camera behind character
  cameraYaw = Math.PI;
  cameraPitch = 0.32;
  cameraDistance = 6.8;
  cameraTargetDistance = 6.8;
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  cameraLookTarget.set(0, 1.5, 0);
  camera.lookAt(cameraLookTarget);

  // Clean particles
  particles.forEach(p => {
    scene.remove(p);
    p.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  });
  particles = [];

  // Reset round collectibles
  const roundSeed = Math.floor(Math.random() * 900000) + 100000;
  const roundData = generateRoundCollectibles(roundSeed, colliders);

  coins.forEach(c => {
    if (c.mesh) scene.remove(c.mesh);
  });
  coins = [];
  createCoins(roundData.coins);
  createChests(roundData.chests);
  createPotions(roundData.potions);
  createKeyItem(roundData.key);
  initMissions();

  // Reset input
  keyboardInput.up = false;
  keyboardInput.down = false;
  keyboardInput.left = false;
  keyboardInput.right = false;
  mobileInput.up = false;
  mobileInput.down = false;
  mobileInput.left = false;
  mobileInput.right = false;
}

function beginGameplay() {
  gameState = 'playing';
  gameStartTime = performance.now();
  totalPausedDuration = 0;
  isGamePaused = false;

  document.getElementById('hud')?.classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.remove('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');

  if (isMobileDevice()) {
    document.getElementById('mobile-controls')?.classList.remove('hidden');
  } else {
    document.getElementById('mobile-controls')?.classList.add('hidden');
  }

  hudTimer.classList.remove('warning');
  updateHUD();
  updateHealthHUD();

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) {
    if (isShiftLockActive) reticle.classList.remove('hidden');
    else reticle.classList.add('hidden');
  }

  const canvas = renderer ? renderer.domElement : document.getElementById('game-canvas');
  if (isShiftLockActive && !isTouchDevice() && canvas) {
    safeRequestPointerLock(canvas);
  }

  startMusic();
}

function startSoloAdventureWithAnimation() {
  resumeAudio();

  const mainMenu = document.getElementById('main-menu');
  if (mainMenu) mainMenu.classList.add('hidden');

  // 1. Prepare scene & round data
  prepareGameSession();

  // 2. Start 15-Second Cinematic Island Intro
  startCinematicIslandIntro();
}

function startGame() {
  startSoloAdventureWithAnimation();
}

// ===== PAUSE & EXIT CONTROLLERS =====
function togglePause() {
  if (gameState !== 'playing') return;
  if (isGamePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function pauseGame() {
  if (gameState !== 'playing' || isGamePaused) return;
  isGamePaused = true;
  pauseStartTime = performance.now();

  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) pauseOverlay.classList.remove('hidden');

  if (document.pointerLockElement) {
    safeExitPointerLock();
  }
}

function resumeGame() {
  if (!isGamePaused) return;
  isGamePaused = false;
  totalPausedDuration += (performance.now() - pauseStartTime);

  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');

  const exitModal = document.getElementById('exit-confirm-modal');
  if (exitModal) exitModal.classList.add('hidden');
  isExitConfirmOpen = false;

  const canvas = renderer ? renderer.domElement : document.getElementById('game-canvas');
  if (isShiftLockActive && !isTouchDevice() && canvas) {
    safeRequestPointerLock(canvas);
  }
}

function restartGame() {
  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
  const exitModal = document.getElementById('exit-confirm-modal');
  if (exitModal) exitModal.classList.add('hidden');
  isGamePaused = false;
  isExitConfirmOpen = false;
  totalPausedDuration = 0;

  prepareGameSession();
  beginGameplay();
}

function openExitConfirmModal() {
  isExitConfirmOpen = true;
  const exitModal = document.getElementById('exit-confirm-modal');
  if (exitModal) exitModal.classList.remove('hidden');
}

function closeExitConfirmModal() {
  isExitConfirmOpen = false;
  const exitModal = document.getElementById('exit-confirm-modal');
  if (exitModal) exitModal.classList.add('hidden');
}

function exitToMenu() {
  showMainMenu();
}

// ===== VALID SOLO SCORE SUBMISSION =====
let hasSubmittedScore = false;

async function submitSoloScore(finalScore) {
  const submitStatus = document.getElementById('result-submit-status');
  const btnRetry = document.getElementById('btn-retry-submit');

  const validScore = Math.floor(finalScore || 0);
  const validName = currentPlayerName || 'Petualang';

  if (validScore <= 0) {
    if (submitStatus) {
      submitStatus.className = 'submit-status-pill';
      submitStatus.textContent = 'Skor 0 (tidak dicatat ke papan skor)';
    }
    if (btnRetry) btnRetry.classList.add('hidden');
    return { success: false, reason: 'score_zero_or_negative' };
  }

  if (!supabaseLeaderboard.isConfigured()) {
    if (submitStatus) {
      submitStatus.className = 'submit-status-pill';
      submitStatus.textContent = 'Penyimpanan lokal aktif';
    }
    if (btnRetry) btnRetry.classList.add('hidden');
    return { success: true, localOnly: true, score: validScore, name: validName };
  }

  if (submitStatus) {
    submitStatus.className = 'submit-status-pill';
    submitStatus.textContent = 'Menyimpan skor ke papan skor...';
  }
  if (btnRetry) btnRetry.classList.add('hidden');

  try {
    const res = await supabaseLeaderboard.submitScore(validName, validScore);
    if (res.success) {
      hasSubmittedScore = true;
      if (submitStatus) {
        submitStatus.className = 'submit-status-pill success';
        submitStatus.textContent = '✓ Skor berhasil disimpan ke papan skor!';
      }
      if (btnRetry) btnRetry.classList.add('hidden');
    } else {
      if (submitStatus) {
        submitStatus.className = 'submit-status-pill error';
        submitStatus.textContent = `Gagal menyimpan: ${res.error || 'Terputus'}`;
      }
      if (btnRetry) {
        btnRetry.classList.remove('hidden');
        btnRetry.onclick = () => submitSoloScore(finalScore);
      }
    }
    return res;
  } catch (err) {
    if (submitStatus) {
      submitStatus.className = 'submit-status-pill error';
      submitStatus.textContent = 'Gagal menyimpan skor';
    }
    if (btnRetry) {
      btnRetry.classList.remove('hidden');
      btnRetry.onclick = () => submitSoloScore(finalScore);
    }
    return { success: false, error: err.message };
  }
}

function endGame(reason = 'time') {
  gameState = 'gameover';
  stopMusic();

  if (document.pointerLockElement) {
    safeExitPointerLock();
  }

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) reticle.classList.add('hidden');

  // High score tracking & persistence
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    } catch (e) {}
  }

  // Update badge on menu
  const badgeEl = document.getElementById('menu-high-score-val');
  if (badgeEl) badgeEl.textContent = highScore;

  // Submit valid solo score with real-time feedback
  hasSubmittedScore = false;
  submitSoloScore(score);

  // Hide gameplay UI
  document.getElementById('hud')?.classList.add('hidden');
  document.getElementById('mobile-controls')?.classList.add('hidden');
  interactPrompt?.classList.add('hidden');
  if (mobileInteract) mobileInteract.classList.add('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');
  hudTimer.classList.remove('warning');

  // Accurate results
  const elScore = document.getElementById('result-score');
  if (elScore) elScore.textContent = score;
  const elCoins = document.getElementById('result-coins');
  if (elCoins) elCoins.textContent = `${coinsCollected} / ${TOTAL_COINS}`;
  const elChests = document.getElementById('result-chests');
  if (elChests) elChests.textContent = `${chestsOpened} / ${chests.length}`;
  const elFinalHp = document.getElementById('result-final-health');
  if (elFinalHp) elFinalHp.textContent = `${Math.max(0, Math.ceil(health))} HP`;
  const elDuration = document.getElementById('result-duration');
  if (elDuration) {
    const elapsedSecs = Math.max(0, Math.round(GAME_DURATION - timeRemaining));
    elDuration.textContent = `${elapsedSecs}s`;
  }
  const elBest = document.getElementById('result-best');
  if (elBest) elBest.textContent = highScore;

  const comboEl = document.getElementById('result-max-combo');
  if (comboEl) comboEl.textContent = `${maxCombo}x`;
  const highEl = document.getElementById('result-high-score');
  if (highEl) highEl.textContent = highScore;
  const compMissions = sideMissions.filter(m => m.completed).length;
  const missEl = document.getElementById('result-missions');
  if (missEl) missEl.textContent = `${compMissions} / ${sideMissions.length}`;

  const msgEl = document.getElementById('result-message');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnSpectate = document.getElementById('btn-spectate');

  if (reason === 'health') {
    playDefeatSound();
    resultTitle.textContent = 'PERMAINAN BERAKHIR';
    resultTitle.classList.add('defeat-title');
    resultReason.textContent = 'Kesehatan Anda habis! Hindari buaya dan gunakan jembatan kayu untuk menyeberang sungai dengan aman.';
    resultReason.classList.remove('hidden');
    resultIconDefeat.classList.remove('hidden');
    resultIconClock.classList.add('hidden');
    btnPlayAgainText.textContent = 'MAIN LAGI';
    if (btnPlayAgain) btnPlayAgain.classList.remove('hidden');
    if (btnSpectate) btnSpectate.classList.add('hidden');
    if (msgEl) msgEl.textContent = 'Menyeberang lewat jembatan kayu mencegah damage air. Terus bergerak dan lompat untuk menghindari buaya!';
  } else {
    playGameOverSound();
    resultTitle.textContent = 'WAKTU HABIS!';
    resultTitle.classList.remove('defeat-title');
    resultReason.textContent = 'Petualangan luar biasa! Anda telah menjelajahi pulau tropis sebelum waktu habis.';
    resultReason.classList.remove('hidden');
    resultIconClock.classList.remove('hidden');
    resultIconDefeat.classList.add('hidden');
    btnPlayAgainText.textContent = 'MAIN LAGI';
    if (btnPlayAgain) btnPlayAgain.classList.remove('hidden');
    if (btnSpectate) btnSpectate.classList.add('hidden');

    if (coinsCollected === TOTAL_COINS && chestsOpened === chests.length) {
      if (msgEl) msgEl.textContent = 'KOLEKSI SEMPURNA! Penguasa Tertinggi Pulau Tropis!';
    } else if (score >= 400) {
      if (msgEl) msgEl.textContent = 'Penjelajah Legendaris!';
    } else if (score >= 280) {
      if (msgEl) msgEl.textContent = 'Petualang Hebat!';
    } else if (score >= 180) {
      if (msgEl) msgEl.textContent = 'Eksplorasi Mantap!';
    } else if (score >= 80) {
      if (msgEl) msgEl.textContent = 'Awal Yang Bagus!';
    } else {
      if (msgEl) msgEl.textContent = 'Terus Jelajahi Pulau!';
    }
  }

  document.getElementById('result-screen')?.classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
}

function showMainMenu() {
  gameState = 'menu';
  isMultiplayerMatch = false;
  isEliminated = false;
  isSpectating = false;
  isGamePaused = false;
  isExitConfirmOpen = false;
  totalPausedDuration = 0;
  exitSpectatorMode();
  stopMusic();

  if (document.pointerLockElement) {
    try { document.exitPointerLock?.(); } catch (e) {}
  }

  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
  const exitModal = document.getElementById('exit-confirm-modal');
  if (exitModal) exitModal.classList.add('hidden');
  const startBanner = document.getElementById('adventure-start-banner');
  if (startBanner) startBanner.classList.add('hidden');

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) reticle.classList.add('hidden');

  const mpInfo = document.getElementById('hud-mp-info');
  if (mpInfo) mpInfo.classList.add('hidden');
  const mpTable = document.getElementById('mp-results-table');
  if (mpTable) mpTable.classList.add('hidden');
  if (multiplayerManager) multiplayerManager.leaveRoom();

  const badgeEl = document.getElementById('menu-high-score-val');
  if (badgeEl) badgeEl.textContent = highScore;

  document.getElementById('hud')?.classList.add('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
  document.getElementById('mobile-controls')?.classList.add('hidden');
  interactPrompt?.classList.add('hidden');
  if (mobileInteract) mobileInteract.classList.add('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');
  cinematicActive = false;
  countdownActive = false;
  isSkippingIntro = false;
  document.getElementById('cinematic-overlay')?.classList.add('hidden');
  document.getElementById('countdown-overlay')?.classList.add('hidden');
  document.getElementById('briefing-overlay')?.classList.add('hidden');
  document.getElementById('how-to-play')?.classList.add('hidden');
  document.getElementById('settings-menu')?.classList.add('hidden');
  document.getElementById('leaderboard-menu')?.classList.add('hidden');
  document.getElementById('main-menu')?.classList.remove('hidden');

  populateMiniLeaderboard();

  // Reset character for menu view
  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI;
  camera.position.set(20, 15, 20);
  camera.lookAt(0, 0, 0);
}

// ===== DAMAGE SYSTEM =====
export function applyDamage(amount, source = 'hazard') {
  if (gameState !== 'playing' || isEliminated || health <= 0) return;

  health = Math.max(0, health - amount);
  updateHealthHUD();

  if (isMultiplayerMatch && multiplayerManager) {
    multiplayerManager.sendHealth(health);
  }

  // Damage screen flash
  if (damageOverlay) {
    damageOverlay.classList.add('active');
    damageOverlayTimer = 0.25;
  }

  // Model damage flash
  triggerCharacterDamage(character);

  if (source === 'crocodile') {
    showCoinPopup('-25 HP', false, true);
    playBiteSound();
  } else if (source === 'river') {
    riverDamageSoundTimer -= 0.1;
    if (riverDamageSoundTimer <= 0) {
      playDamageSound();
      riverDamageSoundTimer = 0.5;
    }
    riverDamagePopupTimer -= 0.1;
    if (riverDamagePopupTimer <= 0) {
      showCoinPopup('-10 HP', false, true);
      riverDamagePopupTimer = 1.0;
    }
  } else {
    showCoinPopup(`-${Math.round(amount)} HP!`, false, true);
    playDamageSound();
  }

  // Check death / elimination
  if (health <= 0) {
    health = 0;
    updateHealthHUD();
    triggerPlayerElimination();
  }
}

function triggerPlayerElimination() {
  if (isEliminated) return;
  isEliminated = true;
  deathAnimActive = true;
  deathAnimTimer = 0;
  playerVelocity.set(0, 0);

  if (isMultiplayerMatch && multiplayerManager) {
    multiplayerManager.sendEliminated();
  }
}

// ===== VECTOR-NORMAL SLIDING COLLISION RESOLUTION WITH SUBSTEPPING (Prioritas 1 & 3) =====
function resolvePlayerMovement(curX, curZ, velX, velZ, dt, jumping, jumpH) {
  // Substepping (3 passes) prevents tunneling during fast movements or frame drops
  const subSteps = 3;
  const subDt = dt / subSteps;
  let posX = curX;
  let posZ = curZ;

  for (let s = 0; s < subSteps; s++) {
    let candX = posX + velX * subDt;
    let candZ = posZ + velZ * subDt;

    // Steep slope & cliff detection: prevent walking up vertical cliff faces (> 0.65m height diff)
    const curGroundY = getGroundHeight(posX, posZ);
    const candGroundY = getGroundHeight(candX, candZ);
    if (!jumping && (candGroundY - curGroundY) > 0.65) {
      const altGroundX = getGroundHeight(candX, posZ);
      const altGroundZ = getGroundHeight(posX, candZ);
      if (altGroundX - curGroundY <= 0.65) {
        candZ = posZ;
      } else if (altGroundZ - curGroundY <= 0.65) {
        candX = posX;
      } else {
        candX = posX;
        candZ = posZ;
      }
    }

    // Multi-pass contact resolution to prevent snags and corner locking
    const passes = 2;
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < colliders.length; i++) {
        const col = colliders[i];
        // Priority 3: Low obstacle jump clearing (rocks, logs, low steps)
        if (jumping && col.height && jumpH > col.height * 0.65) {
          continue;
        }

        const dx = candX - col.x;
        const dz = candZ - col.z;
        const distSq = dx * dx + dz * dz;
        const colRadius = col.radius || 0.45;
        const minDist = colRadius + PLAYER_RADIUS;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          let nx = 1;
          let nz = 0;
          if (dist > 0.0001) {
            nx = dx / dist;
            nz = dz / dist;
          }
          // Smooth push-out along contact normal
          const overlap = minDist - dist;
          candX += nx * overlap;
          candZ += nz * overlap;

          // Deflect velocity along contact tangent (zero velocity locking on corners)
          const vDotN = playerVelocity.x * nx + playerVelocity.y * nz;
          if (vDotN < 0) {
            playerVelocity.x -= vDotN * nx;
            playerVelocity.y -= vDotN * nz;
          }
        }
      }
    }

    // Island boundary constraint
    const distCenter = Math.hypot(candX, candZ);
    const maxR = ISLAND_RADIUS - PLAYER_RADIUS;
    if (distCenter > maxR) {
      const scale = maxR / distCenter;
      candX *= scale;
      candZ *= scale;
      playerVelocity.set(0, 0);
    }

    posX = candX;
    posZ = candZ;
  }

  return { x: posX, z: posZ };
}

function canMoveTo(x, z) {
  const distCenter = Math.hypot(x, z);
  if (distCenter > ISLAND_RADIUS - PLAYER_RADIUS) return false;
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    const dx = x - col.x;
    const dz = z - col.z;
    const minDist = (col.radius || 0.45) + PLAYER_RADIUS;
    if (dx * dx + dz * dz < minDist * minDist) return false;
  }
  return true;
}

// ===== DEVELOPER COLLISION DEBUG VISUALIZER (Prioritas 1) =====
let collisionDebugGroup = null;
let collisionDebugVisible = false;

export function toggleCollisionDebug() {
  collisionDebugVisible = !collisionDebugVisible;
  if (!collisionDebugGroup) {
    collisionDebugGroup = new THREE.Group();
    collisionDebugGroup.name = 'collisionDebugGroup';
    scene.add(collisionDebugGroup);

    // Obstacle colliders (yellow/red wireframes)
    colliders.forEach(col => {
      const r = col.radius || 0.45;
      const h = col.height || 1.8;
      const geo = new THREE.CylinderGeometry(r, r, h, 16, 1, true);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      const gy = getGroundHeight(col.x, col.z);
      mesh.position.set(col.x, gy + h * 0.5, col.z);
      collisionDebugGroup.add(mesh);
    });

    // Chest interaction zones (green wireframe radius 2.2m)
    chests.forEach(chest => {
      const geo = new THREE.RingGeometry(CHEST_INTERACT_DIST - 0.05, CHEST_INTERACT_DIST, 32);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(chest.mesh.position.x, chest.mesh.position.y + 0.1, chest.mesh.position.z);
      collisionDebugGroup.add(ring);
    });

    // Potion pickup zones (cyan wireframe radius 1.85m)
    potions.forEach(p => {
      const geo = new THREE.RingGeometry(POTION_PICKUP_DIST - 0.05, POTION_PICKUP_DIST, 24);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(p.mesh.position.x, p.mesh.position.y + 0.1, p.mesh.position.z);
      collisionDebugGroup.add(ring);
    });

    // Player debug collider attached to character
    const pGeo = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, 1.4, 16, 1, true);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.name = 'playerDebugCollider';
    pMesh.position.y = 0.7;
    character.add(pMesh);
  }
  collisionDebugGroup.visible = collisionDebugVisible;
  const pMesh = character.getObjectByName('playerDebugCollider');
  if (pMesh) pMesh.visible = collisionDebugVisible;
  return collisionDebugVisible;
}

// ===== CHARACTER MOVEMENT & VELOCITY =====
const playerVelocity = new THREE.Vector2(0, 0);
let waterSplashTimer = 0;

function updateMovement(dt) {
  if (gameState !== 'playing' || deathAnimActive || (multiplayerManager && multiplayerManager.isHost)) {
    playerVelocity.set(0, 0);
    return { isMoving: false, speedRatio: 0, inRiver: false, onBridge: false };
  }

  let moveX = 0;
  let moveZ = 0;

  if (keyboardInput.up || mobileInput.up) moveZ -= 1;
  if (keyboardInput.down || mobileInput.down) moveZ += 1;
  if (keyboardInput.left || mobileInput.left) moveX -= 1;
  if (keyboardInput.right || mobileInput.right) moveX += 1;

  const hasInput = moveX !== 0 || moveZ !== 0;

  // Environment detection at character's current position
  const inRiver = isPlayerInRiver(character.position.x, character.position.z);
  const onBridge = isPlayerOnBridge(character.position.x, character.position.z);

  // Wading resistance in river
  const maxSpeed = (inRiver && !onBridge) ? (MOVE_SPEED * 0.82) : MOVE_SPEED;
  const accel = 26.0;
  const decel = 20.0;

  if (hasInput) {
    // Exact horizontal camera orientation (zero lag from camera follow smoothing)
    // Forward direction into the crosshair (when cameraYaw=0, forward is -Z)
    const fwdX = -Math.sin(cameraYaw);
    const fwdZ = -Math.cos(cameraYaw);

    // Right direction perpendicular to forward (when cameraYaw=0, right is +X)
    const rightX = Math.cos(cameraYaw);
    const rightZ = -Math.sin(cameraYaw);

    // Combine input: moveZ (-1 forward, +1 backward), moveX (-1 left, +1 right)
    const inputFwd = -moveZ;
    const inputRight = moveX;

    let worldDirX = fwdX * inputFwd + rightX * inputRight;
    let worldDirZ = fwdZ * inputFwd + rightZ * inputRight;

    const len = Math.hypot(worldDirX, worldDirZ);
    if (len > 0.001) {
      worldDirX /= len;
      worldDirZ /= len;
    }

    const targetVx = worldDirX * maxSpeed;
    const targetVz = worldDirZ * maxSpeed;

    playerVelocity.x += (targetVx - playerVelocity.x) * Math.min(1, accel * dt);
    playerVelocity.y += (targetVz - playerVelocity.y) * Math.min(1, accel * dt);
  } else {
    // Smooth deceleration to stop
    playerVelocity.x += (0 - playerVelocity.x) * Math.min(1, decel * dt);
    playerVelocity.y += (0 - playerVelocity.y) * Math.min(1, decel * dt);

    if (playerVelocity.lengthSq() < 0.005) {
      playerVelocity.set(0, 0);
    }
  }

  const currentSpeed = playerVelocity.length();
  const speedRatio = Math.min(1.0, currentSpeed / MOVE_SPEED);
  const isMoving = currentSpeed > 0.12;

  if (isMoving) {
    const resolved = resolvePlayerMovement(
      character.position.x,
      character.position.z,
      playerVelocity.x,
      playerVelocity.y,
      dt,
      isJumping,
      jumpHeight
    );
    character.position.x = resolved.x;
    character.position.z = resolved.z;

    // River water splashes and ripples when wading
    if (inRiver && !onBridge) {
      waterSplashTimer -= dt;
      if (waterSplashTimer <= 0) {
        waterSplashTimer = 0.22;
        createWaterRipple(scene, character.position.x, character.position.z, 0.9);
        if (currentSpeed > 3.5) {
          createWaterSplash(scene, character.position.x, character.position.z);
        }
      }
    }
  }

  // Smooth character orientation
  if (isShiftLockActive) {
    // In Shift Lock mode: character orientation locks smoothly to camera horizontal yaw
    const desiredAngle = cameraYaw + Math.PI;
    let angleDiff = desiredAngle - character.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    character.rotation.y += angleDiff * Math.min(1.0, 18.0 * dt);
  } else if (isMoving) {
    // Normal orbit mode: character only rotates when moving to face movement direction
    const targetAngle = Math.atan2(playerVelocity.x, playerVelocity.y);
    let angleDiff = targetAngle - character.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const rotSpeed = 14 * dt;
    character.rotation.y += angleDiff * Math.min(1, rotSpeed);
  }

  // Vertical jump physics (Tahap A)
  if (isJumping || !isGrounded) {
    jumpVelocityY -= JUMP_GRAVITY * dt;
    jumpHeight += jumpVelocityY * dt;
    if (jumpHeight <= 0) {
      jumpHeight = 0;
      jumpVelocityY = 0;
      isJumping = false;
      isGrounded = true;
    }
  }

  const groundY = getGroundHeight(character.position.x, character.position.z);
  character.position.y = groundY + jumpHeight;

  return { isMoving, speedRatio, inRiver, onBridge, isJumping, jumpHeight };
}

// ===== 360° THIRD-PERSON ORBIT & SHIFT LOCK CAMERA =====
function updateCamera(dt) {
  if (!character) return;

  // Smooth camera zoom
  cameraDistance += (cameraTargetDistance - cameraDistance) * Math.min(1.0, dt * 10.0);

  // Character focus target (around chest/neck level)
  let targetX = character.position.x;
  let targetY = character.position.y + 1.35;
  let targetZ = character.position.z;

  // Roblox-style right-shoulder offset when Shift Lock is active
  if (isShiftLockActive) {
    const shoulderOffset = 0.45;
    targetX += Math.cos(cameraYaw) * shoulderOffset;
    targetZ += -Math.sin(cameraYaw) * shoulderOffset;
  }

  // Spherical orbit calculation based on yaw, pitch, and distance
  const horizDist = cameraDistance * Math.cos(cameraPitch);
  let idealX = targetX + horizDist * Math.sin(cameraYaw);
  let idealZ = targetZ + horizDist * Math.cos(cameraYaw);
  let idealY = targetY + cameraDistance * Math.sin(cameraPitch);

  // 1. Terrain Raycast Line-Of-Sight Obstruction Check:
  // Detect hills, slopes or temple platforms cutting line of sight, and pull camera closer
  const raySteps = 16;
  let maxSafeRatio = 1.0;
  for (let s = 1; s <= raySteps; s++) {
    const t = s / raySteps;
    const sx = targetX + (idealX - targetX) * t;
    const sz = targetZ + (idealZ - targetZ) * t;
    const sy = targetY + (idealY - targetY) * t;
    const groundH = getGroundHeight(sx, sz);

    // If terrain height + clearance margin cuts above the camera ray
    if (groundH + 0.35 > sy) {
      const safeT = Math.max(0.28, (s - 1) / raySteps);
      if (safeT < maxSafeRatio) {
        maxSafeRatio = safeT;
        break;
      }
    }
  }

  if (maxSafeRatio < 1.0) {
    idealX = targetX + (idealX - targetX) * maxSafeRatio;
    idealY = targetY + (idealY - targetY) * maxSafeRatio;
    idealZ = targetZ + (idealZ - targetZ) * maxSafeRatio;
  }

  // 2. Camera collision / obstacle obstruction check:
  // If a solid obstacle is between character and camera, pull camera forward
  const camDirX = idealX - targetX;
  const camDirZ = idealZ - targetZ;
  const totalHorizDist = Math.hypot(camDirX, camDirZ);

  if (totalHorizDist > 0.01) {
    const ndx = camDirX / totalHorizDist;
    const ndz = camDirZ / totalHorizDist;

    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      const colR = (col.radius || 0.45) + 0.35;
      const tox = col.x - targetX;
      const toz = col.z - targetZ;
      const proj = tox * ndx + toz * ndz;
      if (proj > 0.5 && proj < totalHorizDist) {
        const perpSq = (tox * tox + toz * toz) - (proj * proj);
        if (perpSq < colR * colR) {
          const safeDist = Math.max(1.6, proj - colR);
          const ratio = safeDist / totalHorizDist;
          idealX = targetX + camDirX * ratio;
          idealZ = targetZ + camDirZ * ratio;
          break;
        }
      }
    }
  }

  // 3. Terrain height collision clamp: never clip below island surface or water
  const terrainHeight = getGroundHeight(idealX, idealZ);
  const minCamY = terrainHeight + 0.65;
  if (idealY < minCamY) {
    idealY = minCamY;
  }

  // Frame-rate independent camera smoothing
  const lerpFactor = 1 - Math.exp(-12 * dt);
  camera.position.x += (idealX - camera.position.x) * lerpFactor;
  camera.position.y += (idealY - camera.position.y) * lerpFactor;
  camera.position.z += (idealZ - camera.position.z) * lerpFactor;

  cameraLookTarget.x += (targetX - cameraLookTarget.x) * lerpFactor;
  cameraLookTarget.y += (targetY - cameraLookTarget.y) * lerpFactor;
  cameraLookTarget.z += (targetZ - cameraLookTarget.z) * lerpFactor;

  camera.lookAt(cameraLookTarget);
}

// ===== COIN COLLECTION & COMBO =====
function checkCoinCollection() {
  if (gameState !== 'playing') return;

  const now = performance.now() / 1000;

  coins.forEach(coin => {
    if (coin.collected) return;

    const dx = character.position.x - coin.mesh.position.x;
    const dz = character.position.z - coin.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < COIN_COLLECT_DIST) {
      coin.collected = true;
      coin.mesh.visible = false;
      coinsCollected++;
      score += COIN_POINTS;

      if (isMultiplayerMatch && multiplayerManager) {
        multiplayerManager.sendCollectCoin(coin.index);
      }

      // Update side mission for 20 coins
      updateMissionProgress('coins_20', 1);

      // Combo streak logic (streak resets if interval exceeds COMBO_TIMEOUT)
      if (now - lastCoinCollectTime < COMBO_TIMEOUT) {
        comboCount++;
      } else {
        comboCount = 1;
      }
      lastCoinCollectTime = now;
      if (comboCount > maxCombo) maxCombo = comboCount;

      let comboBonus = 0;
      if (comboCount === 5) {
        comboBonus = 20;
        score += comboBonus;
        playCoinSound();
        showCoinPopup('COMBO 5x! +20 BONUS POIN', true);
      } else if (comboCount === 10) {
        comboBonus = 50;
        score += comboBonus;
        playCoinSound();
        showCoinPopup('COMBO 10x! +50 MEGA BONUS!', true);
      } else {
        playCoinSound();
        showCoinPopup(`+${COIN_POINTS}`);
      }

      // Check perfect collection achievement (all 80 coins)
      if (coinsCollected === TOTAL_COINS && !perfectBonusAwarded) {
        perfectBonusAwarded = true;
        score += PERFECT_BONUS_POINTS;
        showCoinPopup('KOLEKSI SEMPURNA! SEMUA 80 KOIN! +100 POIN!', true);
      }

      // Visual pulse feedback on HUD and Quest Tracker
      const coinHud = document.getElementById('hud-coins-wrapper');
      const questTracker = document.getElementById('hud-quest-tracker');
      if (coinHud) {
        coinHud.classList.remove('coin-collect-pulse');
        void coinHud.offsetWidth;
        coinHud.classList.add('coin-collect-pulse');
        setTimeout(() => coinHud.classList.remove('coin-collect-pulse'), 350);
      }
      if (questTracker) {
        questTracker.classList.remove('coin-collect-pulse');
        void questTracker.offsetWidth;
        questTracker.classList.add('coin-collect-pulse');
        setTimeout(() => questTracker.classList.remove('coin-collect-pulse'), 350);
      }

      // Particle effect
      const particle = createCoinParticle(coin.mesh.position.clone());
      scene.add(particle);
      particles.push(particle);

      updateHUD();
    }
  });
}

// ===== POTION COLLECTION (Prioritas 2) =====
let lastPotionFullNoticeTime = 0;

function checkPotionCollection() {
  if (gameState !== 'playing' || isGamePaused || isEliminated || health <= 0) return;
  if (multiplayerManager && multiplayerManager.isHost) return;

  const now = performance.now();
  potions.forEach(potion => {
    if (potion.collected || claimedPotions.has(potion.index)) return;

    const dx = character.position.x - potion.mesh.position.x;
    const dy = character.position.y - potion.mesh.position.y;
    const dz = character.position.z - potion.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < POTION_PICKUP_DIST && Math.abs(dy) < 2.6) {
      if (health >= MAX_HEALTH) {
        // Player at max health: do not waste potion, show helpful feedback throttled
        if (now - lastPotionFullNoticeTime > 2500) {
          lastPotionFullNoticeTime = now;
          showCoinPopup('KESEHATAN PENUH (100 HP)');
        }
        return;
      }

      // Claim potion: heal player
      claimedPotions.add(potion.index);
      potion.collected = true;
      potion.mesh.visible = false;
      scene.remove(potion.mesh);

      const healAmount = potion.heal || POTION_HEAL;
      health = Math.min(MAX_HEALTH, health + healAmount);
      updateHealthHUD();

      // Visual particles & popup
      const healPart = createHealParticle(potion.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
      scene.add(healPart);
      particles.push(healPart);

      playChestSound();
      showCoinPopup(`+${healAmount} HP KESEHATAN!`);

      if (isMultiplayerMatch && multiplayerManager) {
        multiplayerManager.sendClaimPotion(potion.index);
      }
    }
  });
}

// ===== GOLDEN KEY COLLECTION =====
function checkKeyCollection() {
  if (gameState !== 'playing' || !keyItem || keyItem.collected) return;
  if (multiplayerManager && multiplayerManager.isHost) return;

  const dx = character.position.x - keyItem.mesh.position.x;
  const dy = character.position.y - keyItem.mesh.position.y;
  const dz = character.position.z - keyItem.mesh.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 1.85 && Math.abs(dy) < 2.0) {
    keyItem.collected = true;
    keyItem.mesh.visible = false;
    hasKey = true;

    // Visual particles & popup
    const p = createCoinParticle(keyItem.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
    scene.add(p);
    particles.push(p);

    playChestSound();
    showCoinPopup('KUNCI EMAS DIDAPATKAN!', true);
  }
}

// ===== SECRET GROTTO DISCOVERY =====
function checkSecretGrotto() {
  if (gameState !== 'playing' || secretGrottoDiscovered) return;

  const dx = character.position.x - (-22);
  const dz = character.position.z - 16;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 3.2) {
    secretGrottoDiscovered = true;
    score += SECRET_GROTTO_POINTS;
    updateMissionProgress('find_grotto', 1);
    showCoinPopup('GUA RAHASIA DITEMUKAN! +30 POIN', true);
    updateHUD();
  }
}

// ===== CHEST INTERACTION (Prioritas 2) =====
function getNearestChest() {
  let nearest = null;
  let nearestDist = Infinity;

  chests.forEach(chest => {
    if (chest.opened) return;

    const dx = character.position.x - chest.mesh.position.x;
    const dy = character.position.y - chest.mesh.position.y;
    const dz = character.position.z - chest.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    // Height check (|dy| < 1.8) and horizontal distance < 2.2
    if (dist < CHEST_INTERACT_DIST && Math.abs(dy) < 1.8 && dist < nearestDist) {
      nearest = chest;
      nearestDist = dist;
    }
  });

  return nearest;
}

function tryInteractChest() {
  if (gameState !== 'playing') return;
  if (multiplayerManager && multiplayerManager.isHost) return; // Host cannot open chests

  const chest = getNearestChest();
  if (!chest) return;

  // Locked Golden Chest requires key
  if (chest.isLocked && !hasKey) {
    showCoinPopup('KUNCI DIBUTUHKAN UNTUK PETI EMAS!', false, true);
    return;
  }

  chest.opened = true;
  chest.mesh.visible = false;
  chest.openedMesh.visible = true;
  chestsOpened++;
  score += chest.points;

  if (isMultiplayerMatch && multiplayerManager) {
    multiplayerManager.sendOpenChest(chest.index, chest.points);
  }

  playChestSound();
  showCoinPopup(`+${chest.points} ${chest.isGold ? 'PETI EMAS DIBUKA!' : 'PETI KAYU DIBUKA!'}`, true);

  if (chest.isGold) {
    updateMissionProgress('open_golden_chest', 1);
  }

  // Particle effect
  const particle = createCoinParticle(chest.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
  scene.add(particle);
  particles.push(particle);

  updateHUD();
}

function updateInteractPrompt() {
  if (gameState !== 'playing' || (multiplayerManager && multiplayerManager.isHost)) {
    if (interactPrompt) interactPrompt.classList.add('hidden');
    if (mobileInteract) mobileInteract.classList.add('hidden');
    return;
  }

  const nearChest = getNearestChest();

  if (nearChest) {
    if (nearChest.isLocked && !hasKey) {
      interactPrompt.innerHTML = '<span class="interact-key">E</span> BUTUH KUNCI';
    } else if (nearChest.isLocked && hasKey) {
      interactPrompt.innerHTML = '<span class="interact-key">E</span> BUKA PETI EMAS';
    } else {
      interactPrompt.innerHTML = '<span class="interact-key">E</span> BUKA PETI';
    }
    interactPrompt.classList.remove('hidden');
    if (mobileInteract) {
      mobileInteract.textContent = (nearChest.isLocked && !hasKey) ? 'BUTUH KUNCI' : 'BUKA PETI';
      mobileInteract.classList.remove('hidden');
    }
  } else {
    interactPrompt.classList.add('hidden');
    if (mobileInteract) {
      mobileInteract.classList.add('hidden');
    }
  }
}

// ===== TIMER & PROGRESSIVE DIFFICULTY =====
function updateTimer() {
  if (gameState !== 'playing' || isGamePaused) return;

  const currentNow = performance.now();
  const elapsed = (currentNow - gameStartTime - totalPausedDuration) / 1000;
  timeRemaining = Math.max(0, GAME_DURATION - elapsed);

  // Progressive difficulty scaling
  if (timeRemaining > 80) {
    difficultyMultiplier = 1.0;
  } else if (timeRemaining > 40) {
    difficultyMultiplier = 1.15;
  } else {
    difficultyMultiplier = 1.25;
  }

  if (timeRemaining <= 0) {
    timeRemaining = 0;
    updateHUD();
    if (!isMultiplayerMatch) {
      endGame('time');
    }
    return;
  }

  // Warning when <= 10 seconds
  if (timeRemaining <= 10) {
    hudTimer.classList.add('warning');
  } else {
    hudTimer.classList.remove('warning');
  }
}

// ===== HUD =====
function updateHUD() {
  const totalSecs = Math.max(0, Math.ceil(timeRemaining));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (hudTimer) {
    hudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  if (hudScore) hudScore.textContent = score;
  if (hudCoins) hudCoins.textContent = `${coinsCollected} / ${TOTAL_COINS}`;

  const hudPlayer = document.getElementById('hud-player-name');
  if (hudPlayer) hudPlayer.textContent = currentPlayerName || 'Petualang';

  // Island Quest Objective Tracker
  const questCoins = document.getElementById('quest-coins-val');
  const questBadge = document.getElementById('quest-status-badge');
  const questTracker = document.getElementById('hud-quest-tracker');
  if (questCoins) {
    questCoins.textContent = `${String(coinsCollected).padStart(2, '0')} / ${TOTAL_COINS}`;
  }
  if (coinsCollected >= TOTAL_COINS) {
    if (questBadge) {
      questBadge.textContent = 'SELESAI';
      questBadge.classList.add('done');
    }
    if (questTracker) questTracker.classList.add('completed');
  } else {
    if (questBadge) {
      questBadge.textContent = 'ACTIVE';
      questBadge.classList.remove('done');
    }
    if (questTracker) questTracker.classList.remove('completed');
  }
}

function updateHealthHUD() {
  if (!healthBarFill) return;
  const pct = Math.max(0, Math.min(100, (health / MAX_HEALTH) * 100));
  healthBarFill.style.width = `${pct}%`;

  healthBarFill.classList.remove('medium', 'low');
  if (pct <= 25) {
    healthBarFill.classList.add('low');
  } else if (pct <= 50) {
    healthBarFill.classList.add('medium');
  }

  if (hudHealthValue) {
    hudHealthValue.textContent = `${Math.ceil(health)} / ${MAX_HEALTH}`;
  }
}

function showCoinPopup(text, isChest = false, isDamage = false) {
  if (popupTimeout) clearTimeout(popupTimeout);
  const popup = document.getElementById('coin-popup');
  popup.textContent = text;
  let cls = 'coin-popup';
  if (isChest) cls += ' chest-popup';
  if (isDamage) cls += ' damage-popup';
  popup.className = cls;

  void popup.offsetWidth;
  popup.classList.remove('hidden');

  popupTimeout = setTimeout(() => {
    popup.classList.add('hidden');
    popupTimeout = null;
  }, 800);
}

// ===== RESIZE =====
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  if (gameState === 'playing') {
    if (isMobileDevice()) {
      document.getElementById('mobile-controls').classList.remove('hidden');
    } else {
      document.getElementById('mobile-controls').classList.add('hidden');
    }
  }
}

// ===== MAIN LOOP =====
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05); // Cap delta time
  const elapsed = clock.getElapsedTime();

  // Natural multi-layered river wave animation & flowing surface
  if (waterMesh) {
    updateRiver(waterMesh, dt, elapsed);
  }
  updateWaterEffects(scene, dt);
  updateEnvironmentAnimation(dt, elapsed);

  // Damage overlay flash cooldown
  if (damageOverlayTimer > 0) {
    damageOverlayTimer -= dt;
    if (damageOverlayTimer <= 0 && damageOverlay) {
      damageOverlay.classList.remove('active');
    }
  }

  // Crocodile attack cooldown
  if (crocDamageCooldown > 0 && !isGamePaused) {
    crocDamageCooldown -= dt;
  }

  // Update crocodiles with state machine AI and progressive difficulty
  if (crocodileManager && !isGamePaused) {
    const attackingCroc = crocodileManager.update(
      dt,
      character ? character.position : null,
      gameState !== 'playing',
      difficultyMultiplier
    );
    if (gameState === 'playing' && !isEliminated && attackingCroc && crocDamageCooldown <= 0) {
      if (isJumping && jumpHeight > 0.45) {
        // Dodged the crocodile snap by jumping
        score += 20;
        showCoinPopup('+20 LOMPAT MENGHINDAR!', true);
        crocDamageCooldown = 1.2;
      } else {
        applyDamage(25, 'crocodile');
        playBiteSound();
        crocDamageCooldown = 1.2;
      }
      // Localized water splash if crocodile attack occurs in/near river
      if (isPlayerInRiver(attackingCroc.mesh.position.x, attackingCroc.mesh.position.z)) {
        createWaterSplash(scene, attackingCroc.mesh.position.x, attackingCroc.mesh.position.z);
        createWaterRipple(scene, attackingCroc.mesh.position.x, attackingCroc.mesh.position.z, 1.4);
      }
    }
  }

  // Update Dangerous Hazard Traps (6 types)
  if (trapManager && gameState === 'playing' && !isEliminated && !isGamePaused) {
    const trapHit = trapManager.update(dt, elapsed, character.position, health > 0);
    if (trapHit) {
      applyDamage(trapHit.damage, trapHit.type || 'trap');
      if (trapHit.type === 'rock' || trapHit.type === 'log') {
        playerVelocity.x += (Math.random() - 0.5) * 6;
        playerVelocity.y += (Math.random() - 0.5) * 6;
      }
    }
  }

  // 15-Second Cinematic Island Intro update
  if (cinematicActive) {
    updateCinematicIntro(dt);
  }

  // Match Countdown update
  if (countdownActive) {
    updateCountdown(dt);
  }

  // Spectator Camera update
  if (isSpectating) {
    updateSpectatorCamera(dt);
  }

  // Controlled death fall animation (0.6s) - Prioritas 8
  if (deathAnimActive && !isGamePaused) {
    deathAnimTimer += dt;
    const progress = deathAnimTimer / 0.6;
    animateCharacterDeath(character, progress);
    if (progress >= 1.0) {
      deathAnimActive = false;
      character.visible = false;
      endGame(isMultiplayerMatch ? 'eliminated' : 'health');
    }
  }

  // Update gameplay
  if (gameState === 'playing') {
    if (!isGamePaused) {
      updateTimer();
      const isHost = multiplayerManager && multiplayerManager.isHost;

      if (isHost) {
        if (!isSpectating) enterSpectatorMode();
      } else if (!deathAnimActive && !isEliminated) {
        const moveInfo = updateMovement(dt);
        updateCamera(dt);
        checkCoinCollection();
        checkPotionCollection();
        checkKeyCollection();
        checkSecretGrotto();
        updateInteractPrompt();
        animateCharacter(
          character,
          moveInfo.isMoving,
          dt,
          moveInfo.speedRatio,
          moveInfo.inRiver && !moveInfo.onBridge,
          isJumping,
          jumpHeight,
          getGroundHeight(character.position.x, character.position.z),
          {
            velocity: playerVelocity,
            isShiftLock: isShiftLockActive,
            cameraYaw,
          }
        );

        if (isMultiplayerMatch && multiplayerManager) {
          multiplayerManager.sendPlayerPos(
            character.position.x,
            character.position.y,
            character.position.z,
            character.rotation.y,
            moveInfo.isMoving,
            isJumping,
            jumpHeight
          );
        }

        // River Hazard Detection (feet in water and not on safe wooden bridge)
        if (moveInfo.inRiver && !moveInfo.onBridge) {
          if (hazardWarning) hazardWarning.classList.remove('hidden');
          applyDamage(10 * dt, 'river');
        } else {
          if (hazardWarning) hazardWarning.classList.add('hidden');
        }
      }

      updateHUD();
    } else {
      // While paused: keep camera update active if pointer dragged
      updateCamera(dt);
    }

    // Render Minimap with terrain, coins, chests, crocs, potions, and key
    if (minimap && character) {
      minimap.render(
        character.position,
        character.rotation.y,
        coins,
        chests,
        crocodileManager ? crocodileManager.crocodiles : [],
        potions,
        keyItem
      );
    }
  } else if (gameState === 'menu') {
    // Slow camera orbit for menu
    const orbitAngle = elapsed * 0.15;
    camera.position.x = Math.cos(orbitAngle) * 30;
    camera.position.z = Math.sin(orbitAngle) * 30;
    camera.position.y = 18;
    camera.lookAt(0, 2, 0);
  } else if (gameState === 'briefing') {
    // Cinematic overview of island during briefing
    cameraYaw += dt * 0.08;
    updateCamera(dt);
  }

  // Update remote multiplayer players
  if (multiplayerManager && !isGamePaused) {
    multiplayerManager.update(dt);
  }

  if (!isGamePaused) {
    // Animate coins
    const visibleCoins = coins.filter(c => !c.collected).map(c => c.mesh);
    animateCoins(visibleCoins, elapsed);

    // Animate health potions (gentle float & spin)
    if (potions.length > 0) {
      potions.forEach(pot => {
        if (!pot.collected && pot.mesh) {
          pot.mesh.rotation.y = elapsed * 1.8;
          pot.mesh.position.y = pot.baseY + Math.sin(elapsed * 3.0 + pot.index) * 0.12;
        }
      });
    }

    // Animate golden key (float & spin)
    if (keyItem && !keyItem.collected && keyItem.mesh) {
      keyItem.mesh.rotation.y = elapsed * 2.2;
      keyItem.mesh.position.y = keyItem.baseY + Math.sin(elapsed * 3.5) * 0.15;
    }

    // Update particles with scene cleanup
    if (particles.length > 0) {
      particles = updateParticles(particles, dt, scene);
    }
  }

  // Render (Always maintains active frame rendering for butter-smooth visual)
  renderer.render(scene, camera);
}

// ===== BOOT =====
init();

// ===== TEST & DEBUG INTERFACE =====
window.game = {
  getState: () => ({
    gameState,
    score,
    health,
    coinsCollected,
    chestsOpened,
    timeRemaining,
    characterPos: { x: character.position.x, y: character.position.y, z: character.position.z },
    characterRotationY: character ? character.rotation.y : 0,
    cameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    inRiver: isPlayerInRiver(character.position.x, character.position.z),
    onBridge: isPlayerOnBridge(character.position.x, character.position.z),
    playerVelocity: { x: playerVelocity.x, z: playerVelocity.y },
    isJumping,
    isGrounded,
    jumpVelocityY,
    jumpHeight,
    groundY: getGroundHeight(character.position.x, character.position.z),
    hasKey,
    comboCount,
    maxCombo,
    secretGrottoDiscovered,
    perfectBonusAwarded,
    difficultyMultiplier,
    highScore,
  }),
  jump: () => tryJump(),
  getGroundHeight: (x, z) => getGroundHeight(x, z),
  getLandmarks: () => LANDMARKS,
  simulateInput: (dir, durationMs = 500) => {
    keyboardInput[dir] = true;
    setTimeout(() => {
      keyboardInput[dir] = false;
    }, durationMs);
  },
  interact: () => tryInteractChest(),
  startGame: () => startGame(),
  endGame: (reason) => endGame(reason),
  applyDamage: (amt, src) => applyDamage(amt, src),
  showMainMenu: () => showMainMenu(),
  setCharacterPos: (x, z) => {
    character.position.x = x;
    character.position.z = z;
    const gy = getGroundHeight(x, z);
    character.position.y = gy + jumpHeight;
  },
  getNearestChest: () => getNearestChest(),
  getCoins: () => coins.map(c => ({ x: c.mesh.position.x, z: c.mesh.position.z, collected: c.collected })),
  getChests: () => chests.map(c => ({
    x: c.mesh.position.x,
    z: c.mesh.position.z,
    opened: c.opened,
    isGold: c.isGold,
    isLocked: c.isLocked,
    points: c.points,
  })),
  getPotions: () => potions.map(p => ({
    x: p.mesh.position.x,
    z: p.mesh.position.z,
    collected: p.collected,
    heal: p.heal,
  })),
  getKey: () => (keyItem ? {
    x: keyItem.mesh.position.x,
    z: keyItem.mesh.position.z,
    collected: keyItem.collected,
  } : null),
  hasKey: () => hasKey,
  giveKey: () => {
    hasKey = true;
    if (keyItem) {
      keyItem.collected = true;
      keyItem.mesh.visible = false;
    }
  },
  getMissions: () => sideMissions.map(m => ({ ...m })),
  getCombo: () => ({ comboCount, maxCombo }),
  getHighScore: () => highScore,
  collectAllCoins: () => {
    coins.forEach(c => {
      if (!c.collected) {
        c.collected = true;
        c.mesh.visible = false;
        coinsCollected++;
        score += COIN_POINTS;
      }
    });
    updateMissionProgress('coins_20', 20);
    if (!perfectBonusAwarded) {
      perfectBonusAwarded = true;
      score += PERFECT_BONUS_POINTS;
    }
    updateHUD();
  },
  getCrocodiles: () => (crocodileManager ? crocodileManager.crocodiles.map(c => ({
    id: c.id,
    state: c.state,
    speed: c.currentSpeed,
    pos: { x: c.mesh.position.x, y: c.mesh.position.y, z: c.mesh.position.z },
  })) : []),
  resetCrocs: () => { if (crocodileManager) crocodileManager.reset(); },
  isMultiplayer: () => isMultiplayerMatch,
  getMultiplayerManager: () => multiplayerManager,
  createMultiplayerRoom: async (name) => {
    if (multiplayerManager) return await multiplayerManager.createRoom(name);
  },
  joinMultiplayerRoom: async (code, name) => {
    if (multiplayerManager) return await multiplayerManager.joinRoom(code, name);
  },
  startMultiplayerMatch: () => {
    if (multiplayerManager) multiplayerManager.startMatch();
  },
  getGameState: () => gameState,
  getState: () => gameState,
  getTimeRemaining: () => timeRemaining,
  stepCinematic: (dt) => { if (cinematicActive) updateCinematicIntro(dt); },
  getScore: () => score,
  getHealth: () => health,
  setPlayerPos: (x, z) => {
    character.position.x = x;
    character.position.z = z;
    const gy = getGroundHeight(x, z);
    character.position.y = gy + jumpHeight;
    checkCoinCollection();
    if (isMultiplayerMatch && multiplayerManager) {
      multiplayerManager.sendPlayerPos(x, character.position.y, z, character.rotation.y, true, false, 0);
    }
  },
  collectCoin: (index) => {
    const coin = coins[index];
    if (coin && !coin.collected) {
      coin.collected = true;
      coin.mesh.visible = false;
      coinsCollected++;
      score += COIN_POINTS;
      if (isMultiplayerMatch && multiplayerManager) {
        multiplayerManager.sendCollectCoin(coin.index);
      }
      updateHUD();
    }
  },
  getTraps: () => (trapManager ? trapManager.getTraps() : []),
  getTrapManager: () => trapManager,
  triggerBriefing: (seed, duration) => startCinematicBriefing(seed || 12345, duration || 15),
  skipBriefing: () => skipCinematicBriefing(),
  isBriefingActive: () => briefingActive,
  isCountdownActive: () => countdownActive,
  triggerCountdown: (dur) => startMatchCountdown(dur || 3),
  startOfficialGameplay: (dur) => startOfficialMatchGameplay({ duration: dur || 120 }),
  isEliminated: () => isEliminated,
  isSpectating: () => isSpectating,
  enterSpectator: () => enterSpectatorMode(),
  exitSpectator: () => exitSpectatorMode(),
  cycleSpectator: (dir) => cycleSpectatorTarget(dir),
  getClaimedPotions: () => Array.from(claimedPotions),
  claimPotion: (index) => {
    if (potions[index]) {
      character.position.x = potions[index].mesh.position.x;
      character.position.y = potions[index].mesh.position.y;
      character.position.z = potions[index].mesh.position.z;
      checkPotionCollection();
    }
  },
  toggleCollisionDebug: () => toggleCollisionDebug(),
  canMoveTo: (x, z) => canMoveTo(x, z),
  getPlayerName: () => currentPlayerName,
  setPlayerName: (name) => {
    currentPlayerName = name;
    updateLocalPlayerNameTag(name);
    syncPlayerNameUI(name);
  },
  isShiftLock: () => isShiftLockActive,
  toggleShiftLock: (force) => toggleShiftLock(force),
  getGroundHeight: (x, z) => getGroundHeight(x, z),
  getCameraYaw: () => cameraYaw,
  getCameraPitch: () => cameraPitch,
  getCameraDistance: () => cameraDistance,
  setCameraAngles: (yaw, pitch, dist) => {
    if (yaw !== undefined) {
      cameraYaw = yaw;
      while (cameraYaw < 0) cameraYaw += Math.PI * 2;
      while (cameraYaw > Math.PI * 2) cameraYaw -= Math.PI * 2;
    }
    if (pitch !== undefined) {
      cameraPitch = Math.max(0.06, Math.min(1.32, pitch));
    }
    if (dist !== undefined) {
      cameraTargetDistance = cameraDistance = Math.max(3.8, Math.min(11.0, dist));
    }
  },
  getCharacter: () => character,
  getScene: () => scene,
  getKeyboardInput: () => keyboardInput,
  getWaterMesh: () => waterMesh,
  step: (stepDt = 0.016) => {
    if (gameState === 'playing' && !deathAnimActive && !isEliminated) {
      const moveInfo = updateMovement(stepDt);
      updateCamera(stepDt);
      checkCoinCollection();
      checkPotionCollection();
      checkKeyCollection();
      checkSecretGrotto();
      updateInteractPrompt();
      if (character) {
        animateCharacter(
          character,
          moveInfo.isMoving,
          stepDt,
          moveInfo.speedRatio,
          moveInfo.inRiver && !moveInfo.onBridge,
          isJumping,
          jumpHeight,
          getGroundHeight(character.position.x, character.position.z),
          {
            velocity: playerVelocity,
            isShiftLock: isShiftLockActive,
            cameraYaw,
          }
        );
      }
    }
  },
  isPaused: () => isGamePaused,
  pause: () => pauseGame(),
  resume: () => resumeGame(),
  togglePause: () => togglePause(),
  restartGame: () => restartGame(),
  exitToMenu: () => exitToMenu(),
  openExitConfirm: () => openExitConfirmModal(),
  startSoloAdventure: () => startSoloAdventureWithAnimation(),
  submitSoloScore: (finalScore) => submitSoloScore(finalScore),
  skipIntro: () => skipCinematicIntro(),
  isCinematicActive: () => cinematicActive,
  getCinematicScene: () => cinematicCurrentScene,
  isCountdownActive: () => countdownActive,
};
