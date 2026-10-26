// ===== COIN RUSH ISLAND - Real-Time Server-Authoritative WebSocket Server =====
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.MULTIPLAYER_PORT || 3001;
const MAX_ROOM_CAPACITY = 30;

// HTTP server for health check and WebSocket upgrade
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, timestamp: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end('Coin Rush Island Multiplayer Server');
});

const wss = new WebSocketServer({ server });

// State store
const rooms = new Map(); // roomCode => Room Object

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 30 distinct, curated aesthetic low-poly character colors
const PLAYER_COLORS = [
  '#0284c7', '#ea580c', '#9333ea', '#16a34a', '#e11d48',
  '#0d9488', '#d97706', '#4f46e5', '#ca8a04', '#db2777',
  '#059669', '#7c3aed', '#dc2626', '#2563eb', '#65a30d',
  '#c026d3', '#b45309', '#0891b2', '#4338ca', '#be123c',
  '#15803d', '#9d174d', '#1d4ed8', '#a16207', '#6d28d9',
  '#047857', '#b91c1c', '#1e40af', '#854d0e', '#581c87',
];

class Room {
  constructor(code, hostId, hostName, hostWs) {
    this.code = code;
    this.hostId = hostId;
    this.state = 'lobby'; // 'lobby' | 'briefing' | 'countdown' | 'playing' | 'ended'
    // Shared deterministic round seed so ALL clients spawn identical coin and chest layout
    this.seed = Math.floor(Math.random() * 900000) + 100000;
    this.duration = 120;
    this.briefingDuration = 15;
    this.countdownDuration = 3;
    this.startTime = 0;
    this.timerInterval = null;
    this.briefingTimeout = null;
    this.countdownTimeout = null;

    // Server-authoritative collectible validation
    this.collectedCoins = new Set();
    this.openedChests = new Set();

    // Host entity (Spectator only - not in competitive players map)
    const trimmedHost = (hostName || '').trim();
    this.host = {
      id: hostId,
      name: (trimmedHost.length >= 3 && trimmedHost.length <= 16) ? trimmedHost : 'Host',
      ws: hostWs,
      role: 'host',
    };

    // Up to 30 competitive players
    this.players = new Map();
  }

  addPlayer(id, name, ws) {
    const trimmed = (name || '').trim();
    const finalName = (trimmed.length >= 3 && trimmed.length <= 16)
      ? trimmed
      : `Petualang ${this.players.size + 1}`;

    const colorIndex = this.players.size % PLAYER_COLORS.length;
    const player = {
      id,
      name: finalName,
      ws,
      role: 'player',
      isHost: false,
      color: PLAYER_COLORS[colorIndex],
      x: 0,
      y: 0,
      z: 0,
      rotY: Math.PI,
      isMoving: false,
      isJumping: false,
      jumpHeight: 0,
      score: 0,
      health: 100,
      eliminated: false,
      claimedPotions: new Set(),
      skippedBriefing: false,
      coinsCollected: 0,
      chestsOpened: 0,
      maxCombo: 0,
      comboCount: 0,
      lastCoinTime: 0,
      finished: false,
      lastPing: Date.now(),
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    if (this.host && this.host.id === id) {
      this.destroy();
      return null;
    }
    this.players.delete(id);
    if (this.players.size === 0 && !this.host) {
      this.destroy();
      return null;
    }
    return this.hostId;
  }

  broadcast(msg, excludeId = null) {
    const data = JSON.stringify(msg);
    // Send to host spectator if not excluded
    if (this.host && this.host.id !== excludeId && this.host.ws && this.host.ws.readyState === WebSocket.OPEN) {
      this.host.ws.send(data);
    }
    // Send to all competitive players
    this.players.forEach(p => {
      if (p.id !== excludeId && p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    });
  }

  startMatch() {
    this.state = 'briefing';
    this.collectedCoins.clear();
    this.openedChests.clear();

    this.players.forEach(p => {
      p.score = 0;
      p.health = 100;
      p.eliminated = false;
      p.claimedPotions.clear();
      p.skippedBriefing = false;
      p.coinsCollected = 0;
      p.chestsOpened = 0;
      p.maxCombo = 0;
      p.comboCount = 0;
      p.lastCoinTime = 0;
      p.finished = false;
      p.x = 0;
      p.y = 0;
      p.z = 0;
    });

    // 1. Send BRIEFING_START (Clients display cinematic camera flyover for 15s)
    this.broadcast({
      type: 'BRIEFING_START',
      seed: this.seed,
      duration: this.duration,
      briefingDuration: this.briefingDuration,
      countdownDuration: this.countdownDuration,
    });

    // Clear any previous timers
    if (this.briefingTimeout) clearTimeout(this.briefingTimeout);
    if (this.countdownTimeout) clearTimeout(this.countdownTimeout);
    if (this.timerInterval) clearInterval(this.timerInterval);

    // 2. Countdown phase after briefing
    this.briefingTimeout = setTimeout(() => {
      this.state = 'countdown';
      this.broadcast({
        type: 'COUNTDOWN_START',
        duration: this.countdownDuration,
      });

      // 3. Official Match Start when countdown hits zero
      this.countdownTimeout = setTimeout(() => {
        this.state = 'playing';
        this.startTime = Date.now();

        this.broadcast({
          type: 'MATCH_OFFICIAL_START',
          startTime: this.startTime,
          duration: this.duration,
          seed: this.seed,
        });

        // Authoritative 120s timer countdown
        this.timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
          const remaining = Math.max(0, this.duration - elapsed);

          this.broadcast({
            type: 'TIME_SYNC',
            timeRemaining: remaining,
          });

          if (remaining <= 0) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.endMatch('time');
          }
        }, 1000);
      }, this.countdownDuration * 1000);
    }, this.briefingDuration * 1000);
  }

  endMatch(reason = 'time') {
    this.state = 'ended';
    if (this.briefingTimeout) clearTimeout(this.briefingTimeout);
    if (this.countdownTimeout) clearTimeout(this.countdownTimeout);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Rank players: Score DESC, Coins DESC, Health DESC
    const leaderboard = Array.from(this.players.values())
      .map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: p.score,
        coinsCollected: p.coinsCollected,
        chestsOpened: p.chestsOpened,
        maxCombo: p.maxCombo,
        health: p.health,
        eliminated: p.eliminated,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.coinsCollected !== a.coinsCollected) return b.coinsCollected - a.coinsCollected;
        return b.health - a.health;
      });

    const podium = {
      first: leaderboard[0] || null,
      second: leaderboard[1] || null,
      third: leaderboard[2] || null,
    };

    this.broadcast({
      type: 'MATCH_RESULTS',
      reason,
      leaderboard,
      podium,
    });
  }

  destroy() {
    if (this.briefingTimeout) clearTimeout(this.briefingTimeout);
    if (this.countdownTimeout) clearTimeout(this.countdownTimeout);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    rooms.delete(this.code);
  }

  getLobbyInfo() {
    return {
      code: this.code,
      hostId: this.hostId,
      hostName: this.host ? this.host.name : 'Host',
      state: this.state,
      seed: this.seed,
      playerCount: this.players.size,
      maxPlayers: MAX_ROOM_CAPACITY,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: false,
        color: p.color,
        score: p.score,
        health: p.health,
        eliminated: p.eliminated,
      })),
    };
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerId = 'p_' + Math.random().toString(36).substring(2, 9);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'CREATE_ROOM': {
          let code = generateRoomCode();
          while (rooms.has(code)) {
            code = generateRoomCode();
          }
          currentRoom = new Room(code, playerId, data.playerName, ws);
          rooms.set(code, currentRoom);

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode: code,
            playerId,
            isHost: true,
            lobby: currentRoom.getLobbyInfo(),
          }));
          break;
        }

        case 'JOIN_ROOM': {
          const code = (data.roomCode || '').toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Room dengan kode ${code} tidak ditemukan!`,
            }));
            return;
          }

          if (room.state !== 'lobby') {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Pertandingan dalam room ini sudah dimulai!',
            }));
            return;
          }

          if (room.players.size >= MAX_ROOM_CAPACITY) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Room sudah penuh (maksimal ${MAX_ROOM_CAPACITY} pemain)!`,
            }));
            return;
          }

          currentRoom = room;
          const player = room.addPlayer(playerId, data.playerName, ws);

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: code,
            playerId,
            isHost: false,
            lobby: room.getLobbyInfo(),
          }));

          room.broadcast({
            type: 'PLAYER_JOINED',
            player: {
              id: player.id,
              name: player.name,
              isHost: false,
              color: player.color,
            },
            lobby: room.getLobbyInfo(),
          }, playerId);
          break;
        }

        case 'START_MATCH': {
          if (!currentRoom || currentRoom.hostId !== playerId) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Hanya host yang dapat memulai pertandingan!' }));
            return;
          }
          currentRoom.startMatch();
          break;
        }

        case 'SKIP_BRIEFING': {
          if (currentRoom) {
            const p = currentRoom.players.get(playerId);
            if (p) p.skippedBriefing = true;
          }
          break;
        }

        case 'PLAYER_POS': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          if (playerId === currentRoom.hostId) return; // Host has no physical player avatar
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          p.x = data.x;
          p.y = data.y;
          p.z = data.z;
          p.rotY = data.rotY;
          p.isMoving = !!data.isMoving;
          p.isJumping = !!data.isJumping;
          p.jumpHeight = data.jumpHeight || 0;

          // Broadcast to other players in room
          currentRoom.broadcast({
            type: 'REMOTE_PLAYER_POS',
            playerId,
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            isMoving: p.isMoving,
            isJumping: p.isJumping,
            jumpHeight: p.jumpHeight,
          }, playerId);
          break;
        }

        case 'COLLECT_COIN': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          const cIdx = data.coinIndex;

          // Server-authoritative: Check if coin already collected by anyone in room
          if (currentRoom.collectedCoins.has(cIdx)) {
            return; // Already collected
          }

          currentRoom.collectedCoins.add(cIdx);
          const now = Date.now() / 1000;
          if (now - p.lastCoinTime < 3.5) {
            p.comboCount++;
          } else {
            p.comboCount = 1;
          }
          p.lastCoinTime = now;
          if (p.comboCount > p.maxCombo) p.maxCombo = p.comboCount;

          let bonus = 0;
          if (p.comboCount === 5) bonus = 20;
          if (p.comboCount === 10) bonus = 50;

          p.coinsCollected++;
          p.score += (10 + bonus);

          // Broadcast coin collected to all clients so coin disappears for everyone
          currentRoom.broadcast({
            type: 'COIN_COLLECTED_BROADCAST',
            coinIndex: cIdx,
            collectorId: playerId,
            collectorName: p.name,
            newScore: p.score,
            coinsCollected: p.coinsCollected,
            comboCount: p.comboCount,
            bonus,
          });
          break;
        }

        case 'OPEN_CHEST': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          const chIdx = data.chestIndex;

          // Server-authoritative: Check if chest already opened
          if (currentRoom.openedChests.has(chIdx)) {
            return;
          }

          currentRoom.openedChests.add(chIdx);
          const pts = data.points || 50;
          p.chestsOpened++;
          p.score += pts;

          currentRoom.broadcast({
            type: 'CHEST_OPENED_BROADCAST',
            chestIndex: chIdx,
            openerId: playerId,
            openerName: p.name,
            points: pts,
            newScore: p.score,
            chestsOpened: p.chestsOpened,
          });
          break;
        }

        // BAGIAN 5: Individual Healing Potion Claim per Player
        case 'CLAIM_POTION': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          const pIdx = data.potionIndex;
          if (p.claimedPotions.has(pIdx)) return; // already claimed by this player
          if (p.health >= 100) return; // cannot claim if already at max health

          p.claimedPotions.add(pIdx);
          p.health = Math.min(100, p.health + 30);

          // Confirm only to this player
          ws.send(JSON.stringify({
            type: 'POTION_CLAIMED_CONFIRMED',
            potionIndex: pIdx,
            health: p.health,
          }));

          // Sync health bar to other players
          currentRoom.broadcast({
            type: 'PLAYER_HEALTH_SYNC',
            playerId,
            health: p.health,
          }, playerId);
          break;
        }

        case 'HEALTH_UPDATE': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          p.health = Math.max(0, Math.min(100, data.health));
          currentRoom.broadcast({
            type: 'PLAYER_HEALTH_SYNC',
            playerId,
            health: p.health,
          }, playerId);

          if (p.health <= 0) {
            p.eliminated = true;
            currentRoom.broadcast({
              type: 'PLAYER_ELIMINATED_BROADCAST',
              playerId,
              playerName: p.name,
              finalScore: p.score,
            });

            // Check if all players eliminated
            let anyAlive = false;
            currentRoom.players.forEach(pl => {
              if (!pl.eliminated) anyAlive = true;
            });
            if (!anyAlive) {
              currentRoom.endMatch('all_eliminated');
            }
          }
          break;
        }

        case 'PLAYER_ELIMINATED': {
          if (!currentRoom || currentRoom.state !== 'playing') return;
          const p = currentRoom.players.get(playerId);
          if (!p || p.eliminated) return;

          p.eliminated = true;
          p.health = 0;

          currentRoom.broadcast({
            type: 'PLAYER_ELIMINATED_BROADCAST',
            playerId,
            playerName: p.name,
            finalScore: p.score,
          });

          let anyAlive = false;
          currentRoom.players.forEach(pl => {
            if (!pl.eliminated) anyAlive = true;
          });
          if (!anyAlive) {
            currentRoom.endMatch('all_eliminated');
          }
          break;
        }

        case 'LEAVE_ROOM': {
          if (currentRoom) {
            currentRoom.removePlayer(playerId);
            currentRoom.broadcast({
              type: 'PLAYER_LEFT',
              playerId,
              lobby: currentRoom.getLobbyInfo(),
            });
            currentRoom = null;
          }
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.removePlayer(playerId);
      currentRoom.broadcast({
        type: 'PLAYER_LEFT',
        playerId,
        lobby: currentRoom.getLobbyInfo(),
      });
      currentRoom = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Coin Rush Island] Multiplayer WebSocket Server listening on http://127.0.0.1:${PORT} (Max ${MAX_ROOM_CAPACITY} players/room)`);
});
