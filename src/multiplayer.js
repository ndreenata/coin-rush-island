// ===== MULTIPLAYER MANAGER - Real-Time Room & State Synchronization =====
import * as THREE from 'three';
import { createCharacter, animateCharacter } from './character.js';
import { getGroundHeight } from './world.js';

export function createNameTagSprite(name, color = '#38bdf8') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Pill badge background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(8, 8, 240, 48, 16);
  } else {
    ctx.rect(8, 8, 240, 48);
  }
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Name text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1);
  sprite.position.y = 2.45;
  return sprite;
}

export class MultiplayerManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.ws = null;
    this.serverUrl = options.serverUrl || this.detectServerUrl();

    this.connected = false;
    this.playerId = null;
    this.roomCode = null;
    this.isHost = false;
    this.lobby = null;
    this.matchActive = false;

    // Remote player instances: id => { mesh, name, color, targetPos, currentPos, targetRotY, isMoving, isJumping, jumpHeight }
    this.remotePlayers = new Map();

    // Callbacks
    this.onLobbyUpdate = options.onLobbyUpdate || (() => {});
    this.onMatchStarted = options.onMatchStarted || (() => {});
    this.onBriefingStarted = options.onBriefingStarted || (() => {});
    this.onCountdownStarted = options.onCountdownStarted || (() => {});
    this.onMatchOfficialStart = options.onMatchOfficialStart || (() => {});
    this.onTimeSync = options.onTimeSync || (() => {});
    this.onCoinCollected = options.onCoinCollected || (() => {});
    this.onChestOpened = options.onChestOpened || (() => {});
    this.onPotionClaimedConfirmed = options.onPotionClaimedConfirmed || (() => {});
    this.onPlayerEliminated = options.onPlayerEliminated || (() => {});
    this.onMatchResults = options.onMatchResults || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    // Broadcast throttle
    this.lastBroadcastTime = 0;
    this.broadcastInterval = 50; // 20 Hz
  }

  detectServerUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_SERVER_URL) {
      return import.meta.env.VITE_WS_SERVER_URL;
    }
    if (typeof window === 'undefined') return 'ws://127.0.0.1:3001';
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc.hostname || '127.0.0.1';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    if (!isLocal) {
      // In cloud environment without custom WS endpoint, return null to show friendly guidance
      return null;
    }
    return `${proto}//${host}:3001`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return resolve();
      }

      if (!this.serverUrl) {
        const msg = 'Server Multiplayer Online belum terhubung ke cloud endpoint. Mode Petualangan Solo dapat dinikmati sepenuhnya!';
        this.onStatusChange(msg);
        return reject(new Error(msg));
      }

      this.onStatusChange('Menghubungkan ke server...');

      try {
        this.ws = new WebSocket(this.serverUrl);
      } catch (err) {
        this.onStatusChange('Gagal terhubung ke server');
        return reject(err);
      }

      this.ws.onopen = () => {
        this.connected = true;
        this.onStatusChange('Terhubung ke server');
        resolve();
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.onStatusChange('Terputus dari server');
        this.clearRemotePlayers();
      };

      this.ws.onerror = (err) => {
        this.onStatusChange('Koneksi bermasalah');
        reject(err);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  handleMessage(raw) {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'ROOM_CREATED':
        case 'ROOM_JOINED': {
          this.roomCode = data.roomCode;
          this.playerId = data.playerId;
          this.isHost = !!data.isHost;
          this.lobby = data.lobby;
          this.onLobbyUpdate(this.lobby);
          break;
        }

        case 'PLAYER_JOINED':
        case 'PLAYER_LEFT':
        case 'HOST_CHANGED': {
          this.lobby = data.lobby;
          if (data.type === 'HOST_CHANGED' && data.newHostId === this.playerId) {
            this.isHost = true;
          }
          if (data.type === 'PLAYER_LEFT' && this.remotePlayers.has(data.playerId)) {
            this.removeRemotePlayer(data.playerId);
          }
          this.onLobbyUpdate(this.lobby);
          break;
        }

        case 'BRIEFING_START': {
          this.clearRemotePlayers();
          if (this.lobby && this.lobby.players) {
            this.lobby.players.forEach(p => {
              if (p.id !== this.playerId) {
                this.addRemotePlayer(p);
              }
            });
          }
          this.onBriefingStarted(data);
          break;
        }

        case 'COUNTDOWN_START': {
          this.onCountdownStarted(data);
          break;
        }

        case 'MATCH_OFFICIAL_START': {
          this.matchActive = true;
          this.onMatchOfficialStart(data);
          break;
        }

        case 'MATCH_STARTED': {
          this.matchActive = true;
          this.clearRemotePlayers();
          if (this.lobby && this.lobby.players) {
            this.lobby.players.forEach(p => {
              if (p.id !== this.playerId) {
                this.addRemotePlayer(p);
              }
            });
          }
          this.onMatchStarted({
            startTime: data.startTime,
            duration: data.duration,
            seed: data.seed,
          });
          break;
        }

        case 'TIME_SYNC': {
          this.onTimeSync(data.timeRemaining);
          break;
        }

        case 'REMOTE_PLAYER_POS': {
          const rp = this.remotePlayers.get(data.playerId);
          if (rp) {
            rp.targetPos.set(data.x, data.y, data.z);
            rp.targetRotY = data.rotY;
            rp.isMoving = data.isMoving;
            rp.isJumping = data.isJumping;
            rp.jumpHeight = data.jumpHeight;
          }
          break;
        }

        case 'COIN_COLLECTED_BROADCAST': {
          const rp = this.remotePlayers.get(data.collectorId);
          if (rp) {
            rp.score = (rp.score || 0) + 10;
          }
          this.onCoinCollected(data);
          break;
        }

        case 'CHEST_OPENED_BROADCAST': {
          const rp = this.remotePlayers.get(data.openerId);
          if (rp) {
            rp.score = (rp.score || 0) + (data.points || 50);
          }
          this.onChestOpened(data);
          break;
        }

        case 'POTION_CLAIMED_CONFIRMED': {
          this.onPotionClaimedConfirmed(data);
          break;
        }

        case 'PLAYER_HEALTH_SYNC': {
          const rp = this.remotePlayers.get(data.playerId);
          if (rp) {
            rp.health = data.health;
          }
          break;
        }

        case 'PLAYER_ELIMINATED_BROADCAST': {
          const rp = this.remotePlayers.get(data.playerId);
          if (rp) {
            rp.eliminated = true;
            rp.health = 0;
            // Slightly fade/gray eliminated player avatar
            rp.mesh.traverse(child => {
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.45;
              }
            });
          }
          this.onPlayerEliminated(data);
          break;
        }

        case 'MATCH_RESULTS': {
          this.matchActive = false;
          this.onMatchResults(data);
          break;
        }

        case 'ERROR': {
          this.onError(data.message);
          break;
        }
      }
    } catch (err) {
      console.error('[Multiplayer] Failed to process message:', err);
    }
  }

  async createRoom(playerName) {
    await this.connect();
    this.ws.send(JSON.stringify({
      type: 'CREATE_ROOM',
      playerName: playerName || 'Petualang',
    }));
  }

  async joinRoom(roomCode, playerName) {
    await this.connect();
    this.ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode: (roomCode || '').toUpperCase().trim(),
      playerName: playerName || 'Petualang',
    }));
  }

  startMatch() {
    if (this.ws && this.connected && this.isHost) {
      this.ws.send(JSON.stringify({ type: 'START_MATCH' }));
    }
  }

  leaveRoom() {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
    }
    this.roomCode = null;
    this.isHost = false;
    this.lobby = null;
    this.matchActive = false;
    this.clearRemotePlayers();
  }

  sendPlayerPos(x, y, z, rotY, isMoving, isJumping, jumpHeight) {
    if (!this.ws || !this.connected || !this.matchActive) return;

    const now = performance.now();
    if (now - this.lastBroadcastTime < this.broadcastInterval) return;
    this.lastBroadcastTime = now;

    this.ws.send(JSON.stringify({
      type: 'PLAYER_POS',
      x: Number((x || 0).toFixed(2)),
      y: Number((y || 0).toFixed(2)),
      z: Number((z || 0).toFixed(2)),
      rotY: Number((rotY || 0).toFixed(2)),
      isMoving: !!isMoving,
      isJumping: !!isJumping,
      jumpHeight: Number((jumpHeight || 0).toFixed(2)),
    }));
  }

  sendCollectCoin(coinIndex) {
    if (!this.ws || !this.connected || !this.matchActive) return;
    this.ws.send(JSON.stringify({
      type: 'COLLECT_COIN',
      coinIndex,
    }));
  }

  sendOpenChest(chestIndex, points) {
    if (!this.ws || !this.connected || !this.matchActive) return;
    this.ws.send(JSON.stringify({
      type: 'OPEN_CHEST',
      chestIndex,
      points,
    }));
  }

  sendHealth(health) {
    if (!this.ws || !this.connected || !this.matchActive) return;
    this.ws.send(JSON.stringify({
      type: 'HEALTH_UPDATE',
      health: Math.ceil(health),
    }));
  }

  sendSkipBriefing() {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ type: 'SKIP_BRIEFING' }));
    }
  }

  sendClaimPotion(potionIndex) {
    if (!this.ws || !this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'CLAIM_POTION',
      potionIndex,
    }));
  }

  sendEliminated() {
    if (!this.ws || !this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'PLAYER_ELIMINATED',
    }));
  }

  addRemotePlayer(playerInfo) {
    if (this.remotePlayers.has(playerInfo.id)) return;

    // Parse hex color for shirt
    const colorHex = parseInt((playerInfo.color || '#ea580c').replace('#', '0x'), 16);
    const mesh = createCharacter(colorHex);
    mesh.position.set(0, 0, 0);

    // Floating nametag above character
    const nametag = createNameTagSprite(playerInfo.name, playerInfo.color);
    mesh.add(nametag);

    this.scene.add(mesh);

    this.remotePlayers.set(playerInfo.id, {
      id: playerInfo.id,
      name: playerInfo.name,
      color: playerInfo.color,
      mesh,
      targetPos: new THREE.Vector3(0, 0, 0),
      currentPos: new THREE.Vector3(0, 0, 0),
      targetRotY: Math.PI,
      isMoving: false,
      isJumping: false,
      jumpHeight: 0,
      health: 100,
      score: playerInfo.score || 0,
      eliminated: false,
    });
  }

  getLivingPlayers() {
    const list = [];
    this.remotePlayers.forEach(rp => {
      if (!rp.eliminated && (rp.health > 0 || rp.health === undefined)) {
        list.push(rp);
      }
    });
    return list;
  }

  removeRemotePlayer(playerId) {
    const rp = this.remotePlayers.get(playerId);
    if (rp) {
      this.scene.remove(rp.mesh);
      rp.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
      this.remotePlayers.delete(playerId);
    }
  }

  clearRemotePlayers() {
    this.remotePlayers.forEach((_, id) => {
      this.removeRemotePlayer(id);
    });
    this.remotePlayers.clear();
  }

  update(dt) {
    if (!this.matchActive && this.remotePlayers.size === 0) return;

    // Smoothly interpolate positions & animate remote players
    this.remotePlayers.forEach(rp => {
      const lerpFactor = Math.min(1.0, dt * 14.0);
      rp.mesh.position.x += (rp.targetPos.x - rp.mesh.position.x) * lerpFactor;
      rp.mesh.position.z += (rp.targetPos.z - rp.mesh.position.z) * lerpFactor;

      const groundY = getGroundHeight(rp.mesh.position.x, rp.mesh.position.z);
      rp.mesh.position.y = groundY + rp.jumpHeight;

      // Rotation slerp/lerp
      let diff = rp.targetRotY - rp.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rp.mesh.rotation.y += diff * Math.min(1.0, dt * 12.0);

      animateCharacter(
        rp.mesh,
        rp.isMoving,
        dt,
        rp.isMoving ? 1.0 : 0,
        false,
        rp.isJumping,
        rp.jumpHeight,
        groundY
      );
    });
  }

  destroy() {
    this.leaveRoom();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
