// ===== COIN RUSH ISLAND - 6 DANGEROUS HAZARD TRAPS =====
import * as THREE from 'three';
import { getGroundHeight } from './world.js';
import { playDamageSound } from './audio.js';

export class TrapManager {
  constructor(scene) {
    this.scene = scene;
    this.traps = [];
    this.trapMeshes = new THREE.Group();
    this.scene.add(this.trapMeshes);
    this.playerInvulnerabilityTimer = 0;
  }

  init(colliders = []) {
    this.clear();

    // 1. Spike Trap (Jebakan Duri - 20 HP)
    this.addSpikeTrap({ x: 12.0, z: -6.0 });
    this.addSpikeTrap({ x: -14.0, z: 12.0 });
    this.addSpikeTrap({ x: 44.0, z: 24.0 });  // Ancient Ruins
    this.addSpikeTrap({ x: -32.0, z: 26.0 }); // Tropical Jungle trail

    // 2. Falling Rock (Batu Jatuh - 25 HP)
    this.addFallingRock({ x: 16.5, z: -16.0, dropHeight: 7.5 });
    this.addFallingRock({ x: 45.0, z: -32.0, dropHeight: 8.5 }); // Rocky Highlands crag

    // 3. Swinging Log (Batang Kayu Berayun - 15 HP)
    this.addSwingingLog({ x: -12.0, z: -10.0, swingAxis: 'x' });
    this.addSwingingLog({ x: -36.0, z: 8.0, swingAxis: 'z' }); // Hidden Jungle path

    // 4. Poison Gas (Gas Beracun - 5 HP/dtk)
    this.addPoisonGas({ x: -21.0, z: -8.0, radius: 3.2 });
    this.addPoisonGas({ x: -48.0, z: -35.0, radius: 3.8 }); // Secret Cave Network

    // 5. Hidden Pit (Lubang Tersembunyi - 20 HP)
    this.addHiddenPit({ x: 4.0, z: 16.0 });
    this.addHiddenPit({ x: -28.0, z: 36.0 }); // Jungle clearing pit

    // 6. Fire Trap (Jebakan Api - 15 HP/hit)
    this.addFireTrap({ x: 17.5, z: -8.5 });
    this.addFireTrap({ x: 5.0, z: -52.0 }); // Final Temple Entrance
  }

  // --- TRAP 1: Spike Trap ---
  addSpikeTrap({ x, z }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Stone base plate
    const baseGeo = new THREE.BoxGeometry(2.0, 0.12, 2.0);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.06;
    group.add(base);

    // Metal Grate holes
    const grateGeo = new THREE.BoxGeometry(1.8, 0.02, 1.8);
    const grateMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.position.y = 0.13;
    group.add(grate);

    // Spikes group
    const spikesGroup = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.75, 4);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
    });

    const positions = [
      [-0.6, -0.6], [0, -0.6], [0.6, -0.6],
      [-0.6, 0], [0, 0], [0.6, 0],
      [-0.6, 0.6], [0, 0.6], [0.6, 0.6],
    ];

    positions.forEach(([sx, sz]) => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(sx, 0.35, sz);
      spikesGroup.add(spike);
    });

    spikesGroup.position.y = -0.65; // initially retracted
    group.add(spikesGroup);
    this.trapMeshes.add(group);

    this.traps.push({
      type: 'spike_trap',
      name: 'Jebakan Duri',
      pos: new THREE.Vector3(x, gy, z),
      group,
      spikesGroup,
      radius: 1.2,
      damage: 20,
      state: 'idle', // 'idle' -> 'warning' -> 'active' -> 'retracting'
      stateTimer: 0,
      warningDuration: 0.6,
      activeDuration: 1.1,
      cooldownDuration: 2.2,
    });
  }

  // --- TRAP 2: Falling Rock ---
  addFallingRock({ x, z, dropHeight = 7.5 }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Ground Telegraph Shadow/Decal
    const shadowGeo = new THREE.RingGeometry(0.1, 1.4, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    group.add(shadow);

    // Boulder Mesh
    const rockGeo = new THREE.DodecahedronGeometry(0.85, 1);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = dropHeight;
    group.add(rock);

    this.trapMeshes.add(group);

    this.traps.push({
      type: 'falling_rock',
      name: 'Batu Jatuh',
      pos: new THREE.Vector3(x, gy, z),
      group,
      rock,
      shadow,
      dropHeight,
      currentY: dropHeight,
      radius: 1.6,
      damage: 25,
      state: 'idle', // 'idle' -> 'telegraph' -> 'falling' -> 'impact' -> 'cooldown'
      timer: 0,
      cycleDuration: 5.0,
    });
  }

  // --- TRAP 3: Swinging Log ---
  addSwingingLog({ x, z, swingAxis = 'x' }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Overhead Support Frame
    const supportMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 4.0, 6);

    const post1 = new THREE.Mesh(postGeo, supportMat);
    post1.position.set(-1.4, 2.0, 0);
    post1.rotation.z = -0.12;
    group.add(post1);

    const post2 = new THREE.Mesh(postGeo, supportMat);
    post2.position.set(1.4, 2.0, 0);
    post2.rotation.z = 0.12;
    group.add(post2);

    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6);
    const beam = new THREE.Mesh(beamGeo, supportMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 3.8, 0);
    group.add(beam);

    // Pivot & Pendulum
    const pivot = new THREE.Group();
    pivot.position.set(0, 3.8, 0);

    // Ropes
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const ropeGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4);

    const rope1 = new THREE.Mesh(ropeGeo, ropeMat);
    rope1.position.set(-0.9, -1.3, 0);
    pivot.add(rope1);

    const rope2 = new THREE.Mesh(ropeGeo, ropeMat);
    rope2.position.set(0.9, -1.3, 0);
    pivot.add(rope2);

    // Spiked Log
    const logGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.4, 8);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, -2.6, 0);
    pivot.add(log);

    // Small metal spikes around the log
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.28, 4);
    const spikeMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(spikeGeo, spikeMat);
      const angle = (i / 8) * Math.PI * 2;
      sp.position.set((i % 4 - 1.5) * 0.5, -2.6 + Math.sin(angle) * 0.38, Math.cos(angle) * 0.38);
      sp.rotation.x = angle;
      pivot.add(sp);
    }

    group.add(pivot);
    this.trapMeshes.add(group);

    this.traps.push({
      type: 'swinging_log',
      name: 'Batang Kayu Berayun',
      pos: new THREE.Vector3(x, gy, z),
      group,
      pivot,
      log,
      swingAxis,
      radius: 1.4,
      damage: 15,
      speed: 2.6,
    });
  }

  // --- TRAP 4: Poison Gas ---
  addPoisonGas({ x, z, radius = 3.2 }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Stone Basin / Crevice
    const basinGeo = new THREE.CylinderGeometry(0.8, 0.6, 0.4, 8);
    const basinMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.position.y = 0.2;
    group.add(basin);

    // Poison Cloud Meshes (soft green spheres)
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });

    const cloudPuffs = [];
    for (let i = 0; i < 6; i++) {
      const puffGeo = new THREE.SphereGeometry(0.9 + Math.random() * 0.5, 8, 8);
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      const angle = (i / 6) * Math.PI * 2;
      const dist = 0.5 + Math.random() * 1.4;
      puff.position.set(Math.cos(angle) * dist, 0.6 + Math.random() * 0.6, Math.sin(angle) * dist);
      cloudGroup.add(puff);
      cloudPuffs.push(puff);
    }

    group.add(cloudGroup);
    this.trapMeshes.add(group);

    this.traps.push({
      type: 'poison_gas',
      name: 'Gas Beracun',
      pos: new THREE.Vector3(x, gy, z),
      group,
      cloudGroup,
      cloudPuffs,
      radius,
      dps: 5, // 5 HP per second
      soundTimer: 0,
    });
  }

  // --- TRAP 5: Hidden Pit ---
  addHiddenPit({ x, z }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Cracked Fake Ground Planks
    const plankGeo = new THREE.BoxGeometry(0.4, 0.05, 1.8);
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });

    const planks = [];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(plankGeo, plankMat);
      p.position.set((i - 1.5) * 0.44, 0.04, 0);
      group.add(p);
      planks.push(p);
    }

    // Pit Depth Liner
    const pitGeo = new THREE.BoxGeometry(1.8, 0.8, 1.8);
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.y = -0.4;
    group.add(pit);

    this.trapMeshes.add(group);

    this.traps.push({
      type: 'hidden_pit',
      name: 'Lubang Tersembunyi',
      pos: new THREE.Vector3(x, gy, z),
      group,
      planks,
      radius: 1.1,
      damage: 20,
      triggered: false,
      resetTimer: 0,
    });
  }

  // --- TRAP 6: Fire Trap ---
  addFireTrap({ x, z }) {
    const gy = getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, gy, z);

    // Ancient Stone Nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.5, 0.65, 0.35, 8);
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.y = 0.17;
    group.add(nozzle);

    // Inner Grate & Flame Mesh
    const flameGeo = new THREE.ConeGeometry(0.45, 2.4, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 1.2;
    group.add(flame);

    // Embers warning light
    const emberGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0 });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = 0.35;
    group.add(ember);

    this.trapMeshes.add(group);

    this.traps.push({
      type: 'fire_trap',
      name: 'Jebakan Api',
      pos: new THREE.Vector3(x, gy, z),
      group,
      flame,
      ember,
      radius: 1.3,
      damage: 15,
      state: 'idle', // 'idle' -> 'telegraph' -> 'firing' -> 'cooldown'
      timer: 0,
      cycleDuration: 4.5,
    });
  }

  update(dt, elapsed, playerPos, isPlayerAlive = true) {
    if (this.playerInvulnerabilityTimer > 0) {
      this.playerInvulnerabilityTimer -= dt;
    }

    let hitEvent = null;

    for (const trap of this.traps) {
      const distToPlayer = playerPos
        ? Math.hypot(playerPos.x - trap.pos.x, playerPos.z - trap.pos.z)
        : 999;

      // 1. Spike Trap update
      if (trap.type === 'spike_trap' || trap.type === 'spike') {
        trap.stateTimer += dt;
        if (trap.state === 'idle') {
          if (trap.stateTimer >= trap.cooldownDuration || distToPlayer < 2.5) {
            trap.state = 'warning';
            trap.stateTimer = 0;
          }
        } else if (trap.state === 'warning') {
          // Rattle vibration
          trap.spikesGroup.position.x = Math.sin(elapsed * 45) * 0.04;
          trap.spikesGroup.position.y = -0.55 + Math.sin(elapsed * 25) * 0.05;
          if (trap.stateTimer >= trap.warningDuration) {
            trap.state = 'active';
            trap.stateTimer = 0;
            trap.spikesGroup.position.set(0, 0.1, 0); // spikes snap up!
          }
        } else if (trap.state === 'active') {
          // Check collision with player
          if (isPlayerAlive && distToPlayer < trap.radius && this.playerInvulnerabilityTimer <= 0) {
            hitEvent = { trap: trap.name, damage: trap.damage, type: 'spike' };
            this.playerInvulnerabilityTimer = 1.0;
          }
          if (trap.stateTimer >= trap.activeDuration) {
            trap.state = 'retracting';
            trap.stateTimer = 0;
          }
        } else if (trap.state === 'retracting') {
          trap.spikesGroup.position.y -= dt * 2.0;
          if (trap.spikesGroup.position.y <= -0.65) {
            trap.spikesGroup.position.y = -0.65;
            trap.state = 'idle';
            trap.stateTimer = 0;
          }
        }
      }

      // 2. Falling Rock update
      else if (trap.type === 'falling_rock') {
        trap.timer += dt;
        const cycleProgress = (trap.timer % trap.cycleDuration) / trap.cycleDuration;

        if (cycleProgress < 0.4) {
          // Idle / resetting
          trap.rock.position.y = trap.dropHeight;
          trap.shadow.material.opacity = 0;
        } else if (cycleProgress < 0.65) {
          // Telegraph: shadow grows & turns bright red
          const warnProg = (cycleProgress - 0.4) / 0.25;
          trap.shadow.material.opacity = warnProg * 0.75;
          trap.shadow.scale.set(warnProg, warnProg, warnProg);
        } else if (cycleProgress < 0.72) {
          // Rock falls rapidly
          const fallProg = (cycleProgress - 0.65) / 0.07;
          trap.rock.position.y = THREE.MathUtils.lerp(trap.dropHeight, 0.45, fallProg);
          trap.shadow.material.opacity = 0.9;
        } else if (cycleProgress < 0.76) {
          // Impact frame
          trap.rock.position.y = 0.45;
          if (isPlayerAlive && distToPlayer < trap.radius && this.playerInvulnerabilityTimer <= 0) {
            hitEvent = { trap: trap.name, damage: trap.damage, type: 'rock', knockback: true };
            this.playerInvulnerabilityTimer = 1.2;
          }
        } else {
          // Crumbled / respawning
          trap.shadow.material.opacity = Math.max(0, 1.0 - (cycleProgress - 0.76) * 4);
        }
      }

      // 3. Swinging Log update
      else if (trap.type === 'swinging_log') {
        const swingAngle = Math.sin(elapsed * trap.speed) * 0.75;
        trap.pivot.rotation.z = swingAngle;

        // Check collision near lowest pendulum point
        if (isPlayerAlive && distToPlayer < trap.radius && this.playerInvulnerabilityTimer <= 0) {
          // If log is swinging fast near bottom
          if (Math.abs(swingAngle) < 0.45) {
            hitEvent = { trap: trap.name, damage: trap.damage, type: 'log', knockback: true };
            this.playerInvulnerabilityTimer = 1.0;
          }
        }
      }

      // 4. Poison Gas update
      else if (trap.type === 'poison_gas') {
        // Animate clouds breathing and rotating
        trap.cloudGroup.rotation.y = elapsed * 0.25;
        trap.cloudPuffs.forEach((puff, idx) => {
          puff.position.y = 0.6 + Math.sin(elapsed * 2.0 + idx) * 0.15;
          const s = 1.0 + Math.sin(elapsed * 1.5 + idx) * 0.12;
          puff.scale.set(s, s, s);
        });

        // Damage over time inside radius
        if (isPlayerAlive && distToPlayer < trap.radius) {
          hitEvent = { trap: trap.name, damage: trap.dps * dt, type: 'poison' };
        }
      }

      // 5. Hidden Pit update
      else if (trap.type === 'hidden_pit') {
        if (!trap.triggered) {
          if (isPlayerAlive && distToPlayer < trap.radius) {
            trap.triggered = true;
            trap.resetTimer = 5.0; // resets after 5s
            // Snap planks down
            trap.planks.forEach((p, idx) => {
              p.rotation.x = (idx % 2 === 0 ? 1 : -1) * 0.6;
              p.position.y = -0.3;
            });
            if (this.playerInvulnerabilityTimer <= 0) {
              hitEvent = { trap: trap.name, damage: trap.damage, type: 'pit' };
              this.playerInvulnerabilityTimer = 1.2;
            }
          }
        } else {
          trap.resetTimer -= dt;
          if (trap.resetTimer <= 0) {
            trap.triggered = false;
            trap.planks.forEach((p, idx) => {
              p.rotation.x = 0;
              p.position.y = 0.04;
            });
          }
        }
      }

      // 6. Fire Trap update
      else if (trap.type === 'fire_trap') {
        trap.timer += dt;
        const cycleProgress = (trap.timer % trap.cycleDuration) / trap.cycleDuration;

        if (cycleProgress < 0.5) {
          // Idle
          trap.flame.material.opacity = 0;
          trap.ember.material.opacity = 0;
        } else if (cycleProgress < 0.7) {
          // Warning: glowing embers & spark
          const warnP = (cycleProgress - 0.5) / 0.2;
          trap.ember.material.opacity = warnP * 0.85;
          const s = 1.0 + Math.sin(elapsed * 30) * 0.2;
          trap.ember.scale.set(s, s, s);
        } else if (cycleProgress < 0.9) {
          // Fire eruption!
          trap.ember.material.opacity = 1.0;
          const flameProg = Math.min(1.0, (cycleProgress - 0.7) / 0.05);
          trap.flame.material.opacity = flameProg * 0.9;
          trap.flame.scale.y = 1.0 + Math.sin(elapsed * 40) * 0.2;

          if (isPlayerAlive && distToPlayer < trap.radius && this.playerInvulnerabilityTimer <= 0) {
            hitEvent = { trap: trap.name, damage: trap.damage, type: 'fire' };
            this.playerInvulnerabilityTimer = 0.9;
          }
        } else {
          // Cool down
          trap.flame.material.opacity = 0;
          trap.ember.material.opacity = 0;
        }
      }
    }

    return hitEvent;
  }

  getTraps() {
    return this.traps.map(t => ({
      name: t.name,
      type: t.type,
      pos: { x: t.pos.x, y: t.pos.y, z: t.pos.z },
      damage: t.damage,
    }));
  }

  getTrapsForBriefing() {
    return [
      { name: 'Jebakan Duri & Batu Jatuh', pos: this.traps[0]?.pos || new THREE.Vector3(12, 1, -6), camPos: new THREE.Vector3(14, 5, -2) },
      { name: 'Batang Kayu & Gas Beracun', pos: this.traps[2]?.pos || new THREE.Vector3(-12, 1, -10), camPos: new THREE.Vector3(-10, 5, -6) },
      { name: 'Jebakan Api & Lubang', pos: this.traps[5]?.pos || new THREE.Vector3(17, 2, -8), camPos: new THREE.Vector3(19, 6, -5) },
    ];
  }

  clear() {
    while (this.trapMeshes.children.length > 0) {
      const child = this.trapMeshes.children[0];
      this.trapMeshes.remove(child);
      child.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this.traps = [];
  }

  reset() {
    this.traps.forEach(t => {
      t.state = 'idle';
      t.stateTimer = 0;
      if (t.timer !== undefined) t.timer = 0;
      if (t.triggered !== undefined) t.triggered = false;
      if (t.spikesGroup) t.spikesGroup.position.set(0, -0.65, 0);
      if (t.rock) t.rock.position.y = t.dropHeight || 7.5;
      if (t.shadow) t.shadow.material.opacity = 0;
      if (t.flame) t.flame.material.opacity = 0;
      if (t.ember) t.ember.material.opacity = 0;
      if (t.planks) {
        t.planks.forEach(p => {
          p.rotation.x = 0;
          p.position.y = 0.04;
        });
      }
    });
    this.playerInvulnerabilityTimer = 0;
  }
}
