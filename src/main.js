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
} from './audio.js';

// ===== CONSTANTS =====
const GAME_DURATION = 120;
const MOVE_SPEED = 8.2;
const CAMERA_HEIGHT = 10;
const CAMERA_DISTANCE = 14;
const COIN_COLLECT_DIST = 1.8;
const CHEST_INTERACT_DIST = 2.2; // Comfortable interaction ring
const POTION_PICKUP_DIST = 1.85; // Reliable pickup distance
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

  if (isShiftLockActive) {
    if (shiftLockBtn) shiftLockBtn.classList.add('active');
    if (shiftLockVal) shiftLockVal.textContent = 'KUNCI';
    if (mobileShiftBtn) mobileShiftBtn.classList.add('active');
    if (reticle && gameState === 'playing') reticle.classList.remove('hidden');
    showCoinPopup('SHIFT LOCK ON');
  } else {
    if (shiftLockBtn) shiftLockBtn.classList.remove('active');
    if (shiftLockVal) shiftLockVal.textContent = 'BEBAS';
    if (mobileShiftBtn) mobileShiftBtn.classList.remove('active');
    if (reticle) reticle.classList.add('hidden');
  }
}

// Player Identity State (Single Source of Truth)
let currentPlayerName = 'Petualang';
let characterNameTag = null;

function syncPlayerNameUI(name) {
  const mpInput = document.getElementById('mp-player-name');
  const mpPreview = document.getElementById('mp-name-preview-text');
  const hudName = document.getElementById('hud-player-name');

  if (mpInput && mpInput.value !== name) mpInput.value = name;
  if (mpPreview) mpPreview.textContent = name;
  if (hudName) hudName.textContent = name;
}

function getActivePlayerName() {
  const mpInput = document.getElementById('mp-player-name');
  let raw = '';
  if (mpInput && mpInput.value && mpInput.value.trim().length > 0) {
    raw = mpInput.value;
  } else {
    try {
      const saved = localStorage.getItem('coin_rush_player_name');
      if (saved) raw = saved;
    } catch (e) {}
  }

  let trimmed = (raw || '').trim();
  if (trimmed.length < 3) {
    trimmed = 'Petualang';
  }
  const finalName = trimmed.substring(0, 16);
  currentPlayerName = finalName;
  syncPlayerNameUI(finalName);
  return finalName;
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
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    if (e.key === 'Shift') {
      if (gameState === 'playing') {
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
      if (gameState === 'playing') {
        tryInteractChest();
      }
    } else if (action === 'jump') {
      if (gameState === 'playing') {
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
      if (!isDraggingCamera) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      const sensitivity = 0.0055;
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

// ===== UI SETUP =====
function setupUI() {
  document.getElementById('btn-play').addEventListener('click', () => {
    isMultiplayerMatch = false;
    // Solo starts immediately with 'Petualang' or retained name without form prompting
    if (!currentPlayerName || currentPlayerName.trim().length < 3) {
      currentPlayerName = 'Petualang';
    }
    syncPlayerNameUI(currentPlayerName);
    updateLocalPlayerNameTag(currentPlayerName);
    startGame();
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('how-to-play').classList.remove('hidden');
  });

  document.getElementById('btn-back-how').addEventListener('click', () => {
    document.getElementById('how-to-play').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('settings-menu').classList.remove('hidden');
  });

  document.getElementById('btn-back-settings').addEventListener('click', () => {
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  document.getElementById('sfx-toggle').addEventListener('click', (e) => {
    const active = e.target.classList.toggle('active');
    e.target.textContent = active ? 'ON' : 'OFF';
    setSfxEnabled(active);
  });

  document.getElementById('music-toggle').addEventListener('click', (e) => {
    const active = e.target.classList.toggle('active');
    e.target.textContent = active ? 'ON' : 'OFF';
    setMusicEnabled(active);
    if (active && gameState === 'playing') startMusic();
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    if (isMultiplayerMatch) {
      showMainMenu();
    } else {
      startGame();
    }
  });

  document.getElementById('btn-main-menu').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    showMainMenu();
  });

  // Shift Lock button bindings (HUD and Mobile)
  const btnShiftLock = document.getElementById('btn-shift-lock');
  if (btnShiftLock) {
    btnShiftLock.addEventListener('click', () => {
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

  // Multiplayer UI bindings
  const btnMultiplayer = document.getElementById('btn-multiplayer');
  if (btnMultiplayer) {
    btnMultiplayer.addEventListener('click', () => {
      document.getElementById('main-menu').classList.add('hidden');
      document.getElementById('multiplayer-menu').classList.remove('hidden');
      document.getElementById('mp-entry-view').classList.remove('hidden');
      document.getElementById('mp-lobby-view').classList.add('hidden');
      const errEl = document.getElementById('mp-error-msg');
      if (errEl) errEl.classList.add('hidden');

      const mpInput = document.getElementById('mp-player-name');
      let savedName = '';
      try {
        savedName = localStorage.getItem('coin_rush_player_name') || '';
      } catch (e) {}
      if (mpInput) {
        mpInput.value = savedName || '';
        onNameInputChange(mpInput.value);
        setTimeout(() => mpInput.focus(), 60);
      }
    });
  }

  const btnBackMp = document.getElementById('btn-back-mp');
  if (btnBackMp) {
    btnBackMp.addEventListener('click', () => {
      if (multiplayerManager) multiplayerManager.leaveRoom();
      document.getElementById('multiplayer-menu').classList.add('hidden');
      document.getElementById('main-menu').classList.remove('hidden');
      getActivePlayerName();
    });
  }

  // Real-time name input validation & synchronized preview badge in Multiplayer Modal
  const mpNameInput = document.getElementById('mp-player-name');

  const onNameInputChange = (val) => {
    const trimmed = (val || '').trim();
    const effectiveName = (trimmed.length > 0 ? trimmed : 'Petualang').substring(0, 16);
    syncPlayerNameUI(effectiveName);
    const errEl = document.getElementById('mp-error-msg');
    if (errEl) errEl.classList.add('hidden');
  };

  if (mpNameInput) {
    mpNameInput.addEventListener('input', () => onNameInputChange(mpNameInput.value));
    mpNameInput.addEventListener('change', () => onNameInputChange(mpNameInput.value));
  }

  // Load and apply initial active player name
  const currentName = getActivePlayerName();
  updateLocalPlayerNameTag(currentName);

  function getValidatedPlayerName() {
    const mpInput = document.getElementById('mp-player-name');
    const rawVal = mpInput ? mpInput.value : '';
    const trimmed = (rawVal || '').trim();
    if (!trimmed || trimmed.length < 3) {
      showMpError('Nama pemain minimal 3 karakter!');
      if (mpInput) mpInput.focus();
      return null;
    }
    if (trimmed.length > 16) {
      showMpError('Nama pemain maksimal 16 karakter!');
      if (mpInput) mpInput.focus();
      return null;
    }
    currentPlayerName = trimmed;
    try {
      localStorage.setItem('coin_rush_player_name', trimmed);
    } catch (e) {}
    syncPlayerNameUI(trimmed);
    updateLocalPlayerNameTag(trimmed);
    return trimmed;
  }

  const btnMpCreate = document.getElementById('btn-mp-create');
  if (btnMpCreate) {
    btnMpCreate.addEventListener('click', async () => {
      const name = getValidatedPlayerName();
      if (!name) return;
      try {
        await multiplayerManager.createRoom(name);
      } catch (err) {
        showMpError(err?.message || 'Gagal terhubung ke server multiplayer. Pastikan server aktif di port 3001.');
      }
    });
  }

  const btnMpJoin = document.getElementById('btn-mp-join');
  if (btnMpJoin) {
    btnMpJoin.addEventListener('click', async () => {
      const name = getValidatedPlayerName();
      if (!name) return;
      const codeInput = document.getElementById('mp-room-input');
      const code = codeInput ? codeInput.value.trim() : '';
      if (!code) {
        showMpError('Silakan masukkan kode room 5 karakter!');
        return;
      }
      try {
        await multiplayerManager.joinRoom(code, name);
      } catch (err) {
        showMpError(err?.message || 'Gagal terhubung ke server multiplayer.');
      }
    });
  }

  const btnMpStart = document.getElementById('btn-mp-start');
  if (btnMpStart) {
    btnMpStart.addEventListener('click', () => {
      if (multiplayerManager && multiplayerManager.isHost) {
        multiplayerManager.startMatch();
      }
    });
  }

  const btnMpLeave = document.getElementById('btn-mp-leave');
  if (btnMpLeave) {
    btnMpLeave.addEventListener('click', () => {
      if (multiplayerManager) {
        multiplayerManager.leaveRoom();
        document.getElementById('mp-lobby-view').classList.add('hidden');
        document.getElementById('mp-entry-view').classList.remove('hidden');
      }
    });
  }

  const btnCopyCode = document.getElementById('btn-copy-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const code = document.getElementById('mp-lobby-code')?.textContent;
      if (code) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code);
        }
        showCoinPopup('KODE DISALIN!');
      }
    });
  }

  // Pre-match briefing skip button
  if (btnSkipBriefing) {
    btnSkipBriefing.addEventListener('click', () => {
      skipCinematicBriefing();
    });
  }

  // Spectator mode buttons
  if (btnSpectate) {
    btnSpectate.addEventListener('click', () => {
      enterSpectatorMode();
    });
  }

  if (btnSpectatorExit) {
    btnSpectatorExit.addEventListener('click', () => {
      exitSpectatorMode();
      showMainMenu();
    });
  }

  if (btnSpectatePrev) {
    btnSpectatePrev.addEventListener('click', () => {
      cycleSpectatorTarget(-1);
    });
  }

  if (btnSpectateNext) {
    btnSpectateNext.addEventListener('click', () => {
      cycleSpectatorTarget(1);
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

function skipCinematicBriefing() {
  if (!briefingActive || briefingSkipped) return;
  briefingSkipped = true;

  if (briefingBanner) briefingBanner.classList.add('hidden');
  if (briefingWaiting) briefingWaiting.classList.remove('hidden');

  if (multiplayerManager && isMultiplayerMatch) {
    multiplayerManager.sendSkipBriefing();
  }
}

function updateCinematicBriefing(dt) {
  if (!briefingActive) return;

  if (briefingSkipped) {
    // Camera rests above character waiting
    camera.position.lerp(new THREE.Vector3(0, 12, 10), Math.min(1.0, dt * 4.0));
    cameraLookTarget.lerp(new THREE.Vector3(0, 1.2, 0), Math.min(1.0, dt * 4.0));
    camera.lookAt(cameraLookTarget);

    // If singleplayer / local testing, allow auto-progression
    if (!isMultiplayerMatch) {
      briefingTimer += dt;
      if (briefingTimer >= briefingDuration) {
        startMatchCountdown(3);
      }
    }
    return;
  }

  briefingTimer += dt;

  // Phase A: Island Opening (0 to 3.5s)
  if (briefingTimer < 3.5) {
    const p = briefingTimer / 3.5;
    camera.position.lerpVectors(new THREE.Vector3(28, 30, 28), new THREE.Vector3(8, 16, 16), p);
    cameraLookTarget.lerpVectors(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 3, 2), p);
    camera.lookAt(cameraLookTarget);
    if (briefingTitle) briefingTitle.textContent = 'COIN RUSH ISLAND';
    if (briefingSubtitle) briefingSubtitle.textContent = 'Jelajahi pantai, sungai, bukit, dan reruntuhan kuno!';
  }
  // Phase B: Hazards & Traps (3.5 to 9.0s)
  else if (briefingTimer < 9.0) {
    const subP = (briefingTimer - 3.5) / 5.5;
    if (subP < 0.45) {
      // River & Crocodiles
      camera.position.lerpVectors(new THREE.Vector3(8, 16, 16), new THREE.Vector3(2, 6, -12), (subP / 0.45));
      cameraLookTarget.set(0, 1.2, -4);
      camera.lookAt(cameraLookTarget);
      if (briefingTitle) briefingTitle.textContent = 'BAHAYA: BUAYA SUNGAI';
      if (briefingSubtitle) briefingSubtitle.textContent = 'Menyeberanglah lewat jembatan kayu untuk menghindari gigitan buaya!';
    } else {
      // Traps (Spikes / Rocks / Fire)
      camera.position.lerpVectors(new THREE.Vector3(2, 6, -12), new THREE.Vector3(14, 5, -3), (subP - 0.45) / 0.55);
      cameraLookTarget.set(12, 1.0, -6);
      camera.lookAt(cameraLookTarget);
      if (briefingTitle) briefingTitle.textContent = 'WASPADAI JEBAKAN PULAU!';
      if (briefingSubtitle) briefingSubtitle.textContent = 'Hindari jebakan duri, batu jatuh, kayu berayun, gas & semburan api!';
    }
  }
  // Phase C: Healing Potion (9.0 to 12.0s)
  else if (briefingTimer < 12.0) {
    const p = (briefingTimer - 9.0) / 3.0;
    const potionPos = (potions[0] && potions[0].mesh) ? potions[0].mesh.position : new THREE.Vector3(-6, 2, 4);
    camera.position.lerpVectors(new THREE.Vector3(14, 5, -3), potionPos.clone().add(new THREE.Vector3(2.5, 2.0, 3.0)), p);
    cameraLookTarget.copy(potionPos);
    camera.lookAt(cameraLookTarget);
    if (briefingTitle) briefingTitle.textContent = 'HEALING POTION';
    if (briefingSubtitle) briefingSubtitle.textContent = 'Pulihkan +30 HP dan bertahan lebih lama! Dapat diklaim tiap pemain.';
  }
  // Phase D: Treasures (12.0 to 15.0s)
  else if (briefingTimer <= briefingDuration) {
    const p = (briefingTimer - 12.0) / 3.0;
    const chestPos = (chests[0] && chests[0].mesh) ? chests[0].mesh.position : new THREE.Vector3(0, 2, 10);
    camera.position.lerpVectors(new THREE.Vector3(0, 8, -6), chestPos.clone().add(new THREE.Vector3(0, 4, 6)), p);
    cameraLookTarget.copy(chestPos);
    camera.lookAt(cameraLookTarget);
    if (briefingTitle) briefingTitle.textContent = 'HARTA KARUN & PETI EMAS';
    if (briefingSubtitle) briefingSubtitle.textContent = 'Kumpulkan koin, buka peti rahasia, dan capai skor tertinggi!';
  } else {
    // Briefing duration reached in local mode
    if (!isMultiplayerMatch) {
      startMatchCountdown(3);
    }
  }
}

function startMatchCountdown(duration = 3) {
  briefingActive = false;
  countdownActive = true;
  countdownTimer = duration;
  countdownDuration = duration;

  if (briefingOverlay) briefingOverlay.classList.add('hidden');
  if (countdownOverlay) countdownOverlay.classList.remove('hidden');

  // Bring camera behind character
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  cameraLookTarget.set(0, 1.5, 0);
  camera.lookAt(cameraLookTarget);
}

function updateCountdown(dt) {
  if (!countdownActive) return;

  countdownTimer -= dt;
  const count = Math.ceil(countdownTimer);

  if (countdownNumber) {
    if (count > 0) {
      countdownNumber.textContent = count;
      if (countdownSub) countdownSub.textContent = 'BERSIAPLAH!';
    } else {
      countdownNumber.textContent = 'GO!';
      if (countdownSub) countdownSub.textContent = 'MULAI PETUALANGAN!';
    }
  }

  // Smooth camera to character position
  camera.position.lerp(new THREE.Vector3(character.position.x, character.position.y + CAMERA_HEIGHT, character.position.z + CAMERA_DISTANCE), Math.min(1.0, dt * 6.0));
  cameraLookTarget.lerp(new THREE.Vector3(character.position.x, character.position.y + 1.5, character.position.z), Math.min(1.0, dt * 6.0));
  camera.lookAt(cameraLookTarget);

  // If local / singleplayer and countdown ends:
  if (!isMultiplayerMatch && countdownTimer <= -0.5) {
    startOfficialMatchGameplay({ duration: GAME_DURATION });
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

// ===== GAME FLOW =====
function startGame() {
  resumeAudio();

  // Reset state
  isMultiplayerMatch = false;
  const mpInfo = document.getElementById('hud-mp-info');
  if (mpInfo) mpInfo.classList.add('hidden');
  const mpTable = document.getElementById('mp-results-table');
  if (mpTable) mpTable.classList.add('hidden');

  gameState = 'playing';
  score = 0;
  health = MAX_HEALTH;
  coinsCollected = 0;
  chestsOpened = 0;
  timeRemaining = GAME_DURATION;
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

  // Reset Tahap C state
  comboCount = 0;
  maxCombo = 0;
  lastCoinCollectTime = 0;
  hasKey = false;
  secretGrottoDiscovered = false;
  perfectBonusAwarded = false;
  difficultyMultiplier = 1.0;

  // Reset crocodiles
  if (crocodileManager) {
    crocodileManager.reset();
  }

  // Set active player name and overhead badge
  const activeName = getActivePlayerName();
  updateLocalPlayerNameTag(activeName);

  // Reset character
  character.position.set(0, 0, 0);
  character.rotation.y = Math.PI; // Face forward into the island

  // Reset camera behind character immediately with 360 orbit defaults
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

  // Reset round items (controlled seed per round for reproducible/multiplayer layout)
  const roundSeed = Math.floor(Math.random() * 900000) + 100000;
  const roundData = generateRoundCollectibles(roundSeed, colliders);

  // Clean old coins from scene
  coins.forEach(c => {
    if (c.mesh) scene.remove(c.mesh);
  });
  coins = [];
  createCoins(roundData.coins);

  // Rebuild chests
  createChests(roundData.chests);

  // Rebuild potions
  createPotions(roundData.potions);

  // Rebuild golden key
  createKeyItem(roundData.key);

  // Reset side missions
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
  document.getElementById('hud').classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.remove('hidden');

  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');

  if (isMobileDevice()) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  } else {
    document.getElementById('mobile-controls').classList.add('hidden');
  }

  hudTimer.classList.remove('warning');

  // Update HUDs
  updateHUD();
  updateHealthHUD();

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) {
    if (isShiftLockActive) reticle.classList.remove('hidden');
    else reticle.classList.add('hidden');
  }

  // Music
  startMusic();
}

function endGame(reason = 'time') {
  gameState = 'gameover';
  stopMusic();

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) reticle.classList.add('hidden');

  // High score tracking & persistence
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    } catch (e) {
      // Ignore if localStorage unavailable
    }
  }

  // Update badge on menu
  const badgeEl = document.getElementById('menu-high-score-val');
  if (badgeEl) badgeEl.textContent = highScore;

  // Hide gameplay UI
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  interactPrompt.classList.add('hidden');
  if (mobileInteract) mobileInteract.classList.add('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');
  hudTimer.classList.remove('warning');

  // Accurate results
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-coins').textContent = `${coinsCollected} / ${TOTAL_COINS}`;
  document.getElementById('result-chests').textContent = `${chestsOpened} / ${chests.length}`;

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

  if (reason === 'eliminated' || (isMultiplayerMatch && reason === 'health')) {
    isEliminated = true;
    playDefeatSound();
    resultTitle.textContent = 'KAMU TERELIMINASI';
    resultTitle.classList.add('defeat-title');
    resultReason.textContent = 'Kesehatan Anda habis! Anda tereliminasi dari pertandingan ronde ini.';
    resultReason.classList.remove('hidden');
    resultIconDefeat.classList.remove('hidden');
    resultIconClock.classList.add('hidden');
    if (msgEl) msgEl.textContent = 'Pilih Mode Penonton untuk melihat petualang lain yang masih bertahan hidup!';

    // NO "MAIN LAGI" button after death in multiplayer!
    if (btnPlayAgain) btnPlayAgain.classList.add('hidden');
    if (btnSpectate) btnSpectate.classList.remove('hidden');
  } else if (reason === 'health') {
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
    resultTitle.textContent = isMultiplayerMatch ? 'PERTANDINGAN SELESAI!' : 'WAKTU HABIS!';
    resultTitle.classList.remove('defeat-title');
    resultReason.textContent = isMultiplayerMatch ? 'Waktu 120 detik ronde kompetisi telah selesai!' : 'Petualangan luar biasa! Anda telah menjelajahi pulau tropis sebelum waktu habis.';
    resultReason.classList.remove('hidden');
    resultIconClock.classList.remove('hidden');
    resultIconDefeat.classList.add('hidden');
    btnPlayAgainText.textContent = isMultiplayerMatch ? 'MENU UTAMA' : 'MAIN LAGI';
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

  document.getElementById('result-screen').classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
}

function showMainMenu() {
  gameState = 'menu';
  isMultiplayerMatch = false;
  isEliminated = false;
  isSpectating = false;
  exitSpectatorMode();
  stopMusic();

  const reticle = document.getElementById('shift-lock-reticle');
  if (reticle) reticle.classList.add('hidden');

  const mpInfo = document.getElementById('hud-mp-info');
  if (mpInfo) mpInfo.classList.add('hidden');
  const mpTable = document.getElementById('mp-results-table');
  if (mpTable) mpTable.classList.add('hidden');
  if (multiplayerManager) multiplayerManager.leaveRoom();

  const badgeEl = document.getElementById('menu-high-score-val');
  if (badgeEl) badgeEl.textContent = highScore;

  document.getElementById('hud').classList.add('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  interactPrompt.classList.add('hidden');
  if (mobileInteract) mobileInteract.classList.add('hidden');
  if (hazardWarning) hazardWarning.classList.add('hidden');
  if (damageOverlay) damageOverlay.classList.remove('active');
  document.getElementById('result-screen').classList.add('hidden');
  if (briefingOverlay) briefingOverlay.classList.add('hidden');
  if (countdownOverlay) countdownOverlay.classList.add('hidden');
  document.getElementById('how-to-play').classList.add('hidden');
  document.getElementById('settings-menu').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');

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

      // Check perfect collection achievement (all 40 coins)
      if (coinsCollected === TOTAL_COINS && !perfectBonusAwarded) {
        perfectBonusAwarded = true;
        score += PERFECT_BONUS_POINTS;
        showCoinPopup('KOLEKSI SEMPURNA! SEMUA 40 KOIN! +100 POIN!', true);
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
function checkPotionCollection() {
  if (gameState !== 'playing' || isEliminated || health <= 0) return;
  if (multiplayerManager && multiplayerManager.isHost) return; // Host cannot collect potions
  if (health >= MAX_HEALTH) return; // Do not waste potion when health is already full!

  potions.forEach(potion => {
    if (potion.collected || claimedPotions.has(potion.index)) return;

    const dx = character.position.x - potion.mesh.position.x;
    const dy = character.position.y - potion.mesh.position.y;
    const dz = character.position.z - potion.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < POTION_PICKUP_DIST && Math.abs(dy) < 2.0) {
      claimedPotions.add(potion.index);
      potion.collected = true;
      potion.mesh.visible = false;
      health = Math.min(MAX_HEALTH, health + (potion.heal || POTION_HEAL));
      updateHealthHUD();

      // Visual particles & popup
      const healPart = createHealParticle(potion.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
      scene.add(healPart);
      particles.push(healPart);

      playChestSound();
      showCoinPopup(`+${potion.heal || POTION_HEAL} HP KESEHATAN!`);

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
  if (gameState !== 'playing') return;

  const elapsed = (performance.now() - gameStartTime) / 1000;
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
  const totalSecs = Math.ceil(timeRemaining);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  hudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  hudScore.textContent = score;
  hudCoins.textContent = `${coinsCollected} / ${TOTAL_COINS}`;
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
  if (crocDamageCooldown > 0) {
    crocDamageCooldown -= dt;
  }

  // Update crocodiles with state machine AI and progressive difficulty
  if (crocodileManager) {
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
  if (trapManager && gameState === 'playing' && !isEliminated) {
    const trapHit = trapManager.update(dt, elapsed, character.position, health > 0);
    if (trapHit) {
      applyDamage(trapHit.damage, trapHit.type || 'trap');
      if (trapHit.type === 'rock' || trapHit.type === 'log') {
        playerVelocity.x += (Math.random() - 0.5) * 6;
        playerVelocity.y += (Math.random() - 0.5) * 6;
      }
    }
  }

  // Cinematic Briefing update
  if (briefingActive) {
    updateCinematicBriefing(dt);
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
  if (deathAnimActive) {
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
        getGroundHeight(character.position.x, character.position.z)
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
  }

  // Update remote multiplayer players
  if (multiplayerManager) {
    multiplayerManager.update(dt);
  }

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

  // Render
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
  getScore: () => score,
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
          getGroundHeight(character.position.x, character.position.z)
        );
      }
    }
  },
};
