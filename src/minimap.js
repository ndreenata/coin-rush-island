// ===== MINIMAP - Real-Time Island Radar with Coordinate Alignment =====
import { getRiverCenterZ, LANDMARKS } from './world.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
    this.worldRadius = 78; // Maps [-78, 78] to canvas
  }

  worldToCanvas(x, z) {
    const half = this.size * 0.5;
    const scale = (this.size * 0.44) / this.worldRadius;
    return {
      x: half + x * scale,
      y: half + z * scale,
    };
  }

  render(playerPos, playerHeading, coins = [], chests = [], crocs = [], potions = [], keyItem = null) {
    const ctx = this.ctx;
    const size = this.size;
    const half = size * 0.5;

    ctx.clearRect(0, 0, size, size);

    // 1. Ocean Background (masked to circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0f766e';
    ctx.fillRect(0, 0, size, size);

    // 2. Sandy Beach Ring
    ctx.beginPath();
    ctx.arc(half, half, (size * 0.44) * (74 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = '#deb887';
    ctx.fill();

    // 3. Lush Island Landmass
    ctx.beginPath();
    ctx.arc(half, half, (size * 0.44) * (66 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();

    // Natural elevation contours for 10 zones
    // Zone 4: Rocky Highlands (Northeast peaks)
    const pHigh = this.worldToCanvas(45, -35);
    ctx.beginPath();
    ctx.arc(pHigh.x, pHigh.y, (size * 0.44) * (20 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.fill();

    // Zone 10: Final Temple Mountain (North Terrace)
    const pTemple = this.worldToCanvas(5, -55);
    ctx.beginPath();
    ctx.arc(pTemple.x, pTemple.y, (size * 0.44) * (18 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.fill();

    // Zone 2: Tropical Jungle (Southwest knolls)
    const pJungle = this.worldToCanvas(-35, 30);
    ctx.beginPath();
    ctx.arc(pJungle.x, pJungle.y, (size * 0.44) * (18 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(21, 128, 61, 0.45)';
    ctx.fill();

    // Zone 6: Secret Cave Ridges (Northwest)
    const pCave = this.worldToCanvas(-48, -35);
    ctx.beginPath();
    ctx.arc(pCave.x, pCave.y, (size * 0.44) * (16 / this.worldRadius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.fill();

    // 4. Winding River Channel (-65 to +65)
    ctx.beginPath();
    let started = false;
    for (let wx = -65; wx <= 65; wx += 2.5) {
      const wz = getRiverCenterZ(wx);
      const cp = this.worldToCanvas(wx, wz);
      if (!started) {
        ctx.moveTo(cp.x, cp.y);
        started = true;
      } else {
        ctx.lineTo(cp.x, cp.y);
      }
    }
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // River inner flow highlight
    ctx.strokeStyle = '#cffafe';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 5. 4 Wooden Bridges
    [-35.0, -6.5, 15.0, 48.0].forEach(bx => {
      const bz = getRiverCenterZ(bx);
      const bp = this.worldToCanvas(bx, bz);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bp.x - 2.5, bp.y - 5, 5, 10);
    });

    // 6. Landmarks
    if (LANDMARKS && Array.isArray(LANDMARKS)) {
      LANDMARKS.forEach(lm => {
        const p = this.worldToCanvas(lm.x, lm.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = lm.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });
    }

    // 7. Chests (if not opened)
    if (chests && Array.isArray(chests)) {
      chests.forEach(ch => {
        if (!ch.opened) {
          const cx = ch.x !== undefined ? ch.x : ch.mesh?.position?.x;
          const cz = ch.z !== undefined ? ch.z : ch.mesh?.position?.z;
          if (cx !== undefined && cz !== undefined) {
            const p = this.worldToCanvas(cx, cz);
            ctx.fillStyle = ch.isGold ? '#fbbf24' : '#d97706';
            ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(p.x - 2.5, p.y - 2.5, 5, 5);
          }
        }
      });
    }

    // 8. Health Potions (if not collected)
    if (potions && Array.isArray(potions)) {
      potions.forEach(pot => {
        if (!pot.collected && pot.mesh) {
          const p = this.worldToCanvas(pot.mesh.position.x, pot.mesh.position.z);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();
        }
      });
    }

    // 9. Golden Key (if not collected)
    if (keyItem && !keyItem.collected && keyItem.mesh) {
      const p = this.worldToCanvas(keyItem.mesh.position.x, keyItem.mesh.position.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 10. Crocodiles (small warning red dots on river)
    if (crocs && Array.isArray(crocs)) {
      crocs.forEach(c => {
        const cpos = c.pos || c.mesh?.position;
        if (cpos) {
          const p = this.worldToCanvas(cpos.x, cpos.z);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
        }
      });
    }

    // 9. Player Indicator & Direction Heading
    if (playerPos) {
      const pp = this.worldToCanvas(playerPos.x, playerPos.z);

      // Player pulse ring
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fill();

      // Heading indicator cone
      if (typeof playerHeading === 'number') {
        const dirLen = 11;
        // Three.js character forward: sin(rotY), cos(rotY)
        const dirX = Math.sin(playerHeading);
        const dirZ = Math.cos(playerHeading);

        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(pp.x + dirX * dirLen, pp.y + dirZ * dirLen);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Player center dot
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
    }

    ctx.restore();
  }
}
