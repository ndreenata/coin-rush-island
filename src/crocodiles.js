// ===== CROCODILES - Stylized Low-Poly 3D Predators with State Machine AI & Bridge Navigation =====
import * as THREE from 'three';
import { getRiverCenterZ, isPlayerOnBridge, RIVER_HALF_WIDTH } from './world.js';

export const CROC_STATE = {
  PATROL: 'patrol',
  CHASE: 'chase',
  ATTACK: 'attack',
  RETURN: 'return',
};

// Bridge definitions for navigation (All 4 Bridges across 10 Zones)
export const BRIDGES = [
  {
    id: 'bridge_west',
    x: -35.0,
    get centerZ() { return getRiverCenterZ(-35.0); },
    get southApproach() { return new THREE.Vector3(-35.0, 0.12, getRiverCenterZ(-35.0) - 3.8); },
    get southEntry() { return new THREE.Vector3(-35.0, 0.35, getRiverCenterZ(-35.0) - 2.6); },
    get deckMid() { return new THREE.Vector3(-35.0, 0.38, getRiverCenterZ(-35.0)); },
    get northEntry() { return new THREE.Vector3(-35.0, 0.35, getRiverCenterZ(-35.0) + 2.6); },
    get northApproach() { return new THREE.Vector3(-35.0, 0.12, getRiverCenterZ(-35.0) + 3.8); },
  },
  {
    id: 'bridge_1',
    x: -6.5,
    get centerZ() { return getRiverCenterZ(-6.5); },
    get southApproach() { return new THREE.Vector3(-6.5, 0.12, getRiverCenterZ(-6.5) - 3.8); },
    get southEntry() { return new THREE.Vector3(-6.5, 0.35, getRiverCenterZ(-6.5) - 2.6); },
    get deckMid() { return new THREE.Vector3(-6.5, 0.38, getRiverCenterZ(-6.5)); },
    get northEntry() { return new THREE.Vector3(-6.5, 0.35, getRiverCenterZ(-6.5) + 2.6); },
    get northApproach() { return new THREE.Vector3(-6.5, 0.12, getRiverCenterZ(-6.5) + 3.8); },
  },
  {
    id: 'bridge_2',
    x: 15.0,
    get centerZ() { return getRiverCenterZ(15.0); },
    get southApproach() { return new THREE.Vector3(15.0, 0.12, getRiverCenterZ(15.0) - 3.8); },
    get southEntry() { return new THREE.Vector3(15.0, 0.35, getRiverCenterZ(15.0) - 2.6); },
    get deckMid() { return new THREE.Vector3(15.0, 0.38, getRiverCenterZ(15.0)); },
    get northEntry() { return new THREE.Vector3(15.0, 0.35, getRiverCenterZ(15.0) + 2.6); },
    get northApproach() { return new THREE.Vector3(15.0, 0.12, getRiverCenterZ(15.0) + 3.8); },
  },
  {
    id: 'bridge_east',
    x: 48.0,
    get centerZ() { return getRiverCenterZ(48.0); },
    get southApproach() { return new THREE.Vector3(48.0, 0.12, getRiverCenterZ(48.0) - 3.8); },
    get southEntry() { return new THREE.Vector3(48.0, 0.35, getRiverCenterZ(48.0) - 2.6); },
    get deckMid() { return new THREE.Vector3(48.0, 0.38, getRiverCenterZ(48.0)); },
    get northEntry() { return new THREE.Vector3(48.0, 0.35, getRiverCenterZ(48.0) + 2.6); },
    get northApproach() { return new THREE.Vector3(48.0, 0.12, getRiverCenterZ(48.0) + 3.8); },
  },
];

export function createCrocodile() {
  const root = new THREE.Group();
  const group = new THREE.Group();
  group.name = 'crocModel';
  root.add(group);

  const skinColor = 0x2d5a27;      // Swamp green
  const darkSkinColor = 0x1c3818;  // Dark scute green
  const bellyColor = 0x859f3d;     // Pale yellow-green underbelly
  const eyeColor = 0xeab308;       // Amber eye
  const pupilColor = 0x111111;
  const mouthInsideColor = 0x991b1b; // Dark reddish mouth interior

  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const darkMat = new THREE.MeshLambertMaterial({ color: darkSkinColor });
  const bellyMat = new THREE.MeshLambertMaterial({ color: bellyColor });
  const eyeMat = new THREE.MeshLambertMaterial({ color: eyeColor });
  const pupilMat = new THREE.MeshLambertMaterial({ color: pupilColor });
  const toothMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mouthMat = new THREE.MeshLambertMaterial({ color: mouthInsideColor });

  // ===== MAIN BODY =====
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'bodyGroup';

  const bodyGeo = new THREE.BoxGeometry(0.75, 0.32, 1.5);
  const body = new THREE.Mesh(bodyGeo, skinMat);
  body.position.y = 0.22;
  body.castShadow = true;
  body.receiveShadow = true;
  bodyGroup.add(body);

  // Underbelly
  const bellyGeo = new THREE.BoxGeometry(0.65, 0.05, 1.4);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, 0.08, 0);
  bodyGroup.add(belly);

  // Dorsal ridges / scutes (two rows of spikes along back)
  [-0.18, 0.18].forEach(xOffset => {
    for (let i = 0; i < 4; i++) {
      const ridgeGeo = new THREE.ConeGeometry(0.06, 0.14, 4);
      const ridge = new THREE.Mesh(ridgeGeo, darkMat);
      ridge.position.set(xOffset, 0.42, -0.45 + i * 0.3);
      ridge.rotation.y = Math.PI / 4;
      bodyGroup.add(ridge);
    }
  });

  group.add(bodyGroup);

  // ===== HEAD GROUP & JAWS =====
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';
  headGroup.position.set(0, 0.24, -0.75);

  // Main upper snout
  const snoutGeo = new THREE.BoxGeometry(0.52, 0.14, 0.85);
  const snout = new THREE.Mesh(snoutGeo, skinMat);
  snout.position.set(0, 0.04, -0.4);
  snout.castShadow = true;
  headGroup.add(snout);

  // Nostrils at snout tip
  const nostrilGeo = new THREE.BoxGeometry(0.24, 0.08, 0.12);
  const nostril = new THREE.Mesh(nostrilGeo, darkMat);
  nostril.position.set(0, 0.12, -0.8);
  headGroup.add(nostril);

  // Eyes (raised rounded bumps)
  [-0.2, 0.2].forEach(x => {
    const eyeSocketGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const eyeSocket = new THREE.Mesh(eyeSocketGeo, skinMat);
    eyeSocket.position.set(x, 0.14, -0.15);
    headGroup.add(eyeSocket);

    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 0.16, -0.12);
    headGroup.add(eye);

    const pupilGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(x, 0.16, -0.07);
    headGroup.add(pupil);
  });

  // Upper teeth (hanging down from upper snout)
  [-0.24, 0.24].forEach(x => {
    for (let t = 0; t < 3; t++) {
      const toothGeo = new THREE.ConeGeometry(0.03, 0.08, 3);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(x, -0.04, -0.3 - t * 0.18);
      headGroup.add(tooth);
    }
  });

  // ===== HINGED LOWER JAW =====
  const lowerJaw = new THREE.Group();
  lowerJaw.name = 'lowerJaw';
  lowerJaw.position.set(0, -0.04, 0.0); // Pivot at jaw joint

  const jawBaseGeo = new THREE.BoxGeometry(0.48, 0.08, 0.82);
  const jawBase = new THREE.Mesh(jawBaseGeo, bellyMat);
  jawBase.position.set(0, -0.04, -0.4);
  jawBase.castShadow = true;
  lowerJaw.add(jawBase);

  // Mouth interior floor
  const mouthFloorGeo = new THREE.PlaneGeometry(0.42, 0.75);
  const mouthFloor = new THREE.Mesh(mouthFloorGeo, mouthMat);
  mouthFloor.rotation.x = -Math.PI / 2;
  mouthFloor.position.set(0, 0.005, -0.4);
  lowerJaw.add(mouthFloor);

  // Lower teeth (pointing up from lower jaw)
  [-0.22, 0.22].forEach(x => {
    for (let t = 0; t < 3; t++) {
      const toothGeo = new THREE.ConeGeometry(0.028, 0.07, 3);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(x, 0.04, -0.32 - t * 0.18);
      lowerJaw.add(tooth);
    }
  });

  headGroup.add(lowerJaw);
  group.add(headGroup);

  // ===== LEGS (4 Short Splayed Reptilian Legs) =====
  const legPositions = [
    { name: 'legFL', x: -0.42, z: -0.45, isLeft: true },
    { name: 'legFR', x: 0.42, z: -0.45, isLeft: false },
    { name: 'legBL', x: -0.42, z: 0.45, isLeft: true },
    { name: 'legBR', x: 0.42, z: 0.45, isLeft: false },
  ];

  legPositions.forEach(lp => {
    const leg = new THREE.Group();
    leg.name = lp.name;
    leg.position.set(lp.x, 0.2, lp.z);

    // Upper splayed leg
    const upperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.25, 6);
    const upper = new THREE.Mesh(upperGeo, skinMat);
    upper.rotation.z = lp.isLeft ? Math.PI / 3 : -Math.PI / 3;
    upper.position.set(lp.isLeft ? -0.1 : 0.1, 0, 0);
    upper.castShadow = true;
    leg.add(upper);

    // Lower foot / webbed claws
    const footGeo = new THREE.BoxGeometry(0.16, 0.06, 0.2);
    const foot = new THREE.Mesh(footGeo, darkMat);
    foot.position.set(lp.isLeft ? -0.22 : 0.22, -0.1, 0);
    foot.castShadow = true;
    leg.add(foot);

    // Claws
    for (let c = 0; c < 3; c++) {
      const clawGeo = new THREE.ConeGeometry(0.02, 0.06, 3);
      const claw = new THREE.Mesh(clawGeo, toothMat);
      claw.rotation.x = -Math.PI / 2;
      claw.position.set((lp.isLeft ? -0.26 : 0.26) + (c - 1) * 0.04, -0.1, -0.12);
      leg.add(claw);
    }

    group.add(leg);
  });

  // ===== ARTICULATED TAIL (Base + Tip for Sinuous Swish) =====
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tailGroup';
  tailGroup.position.set(0, 0.22, 0.75);

  const tail1Geo = new THREE.ConeGeometry(0.24, 0.9, 6);
  const tail1 = new THREE.Mesh(tail1Geo, skinMat);
  tail1.rotation.x = Math.PI / 2;
  tail1.position.set(0, 0, 0.45);
  tail1.castShadow = true;
  tailGroup.add(tail1);

  // Tail scutes
  for (let i = 0; i < 3; i++) {
    const ridgeGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
    const ridge = new THREE.Mesh(ridgeGeo, darkMat);
    ridge.position.set(0, 0.18, 0.2 + i * 0.25);
    tailGroup.add(ridge);
  }

  // Tail tip sub-segment (swishes with phase lag)
  const tailTipGroup = new THREE.Group();
  tailTipGroup.name = 'tailTipGroup';
  tailTipGroup.position.set(0, 0, 0.9);

  const tail2Geo = new THREE.ConeGeometry(0.14, 0.8, 6);
  const tail2 = new THREE.Mesh(tail2Geo, darkMat);
  tail2.rotation.x = Math.PI / 2;
  tail2.position.set(0, 0, 0.4);
  tail2.castShadow = true;
  tailTipGroup.add(tail2);

  tailGroup.add(tailTipGroup);
  group.add(tailGroup);

  // Overall scale
  root.scale.setScalar(1.2);

  return root;
}

// ===== CROCODILE CONTROLLER WITH STATE MACHINE & BRIDGE PATHFINDING =====
export class CrocodileManager {
  constructor(scene) {
    this.scene = scene;
    this.crocodiles = [];
    this.initCrocodiles();
  }

  initCrocodiles() {
    // Defined patrol zones along the river
    const routes = [
      {
        id: 'croc_west',
        pointA: new THREE.Vector3(-18, 0.12, 5.0),
        pointB: new THREE.Vector3(-12, 0.12, 7.0),
        patrolSpeed: 2.0,
        chaseSpeed: 3.8,
        detectRadius: 9.5,
        escapeRadius: 13.5,
      },
      {
        id: 'croc_east',
        pointA: new THREE.Vector3(5, 0.12, 9.5),
        pointB: new THREE.Vector3(12, 0.12, 10.5),
        patrolSpeed: 1.8,
        chaseSpeed: 3.6,
        detectRadius: 9.0,
        escapeRadius: 13.0,
      },
      {
        id: 'croc_shallows',
        pointA: new THREE.Vector3(20, 0.1, 11.0),
        pointB: new THREE.Vector3(26, 0.1, 14.0),
        patrolSpeed: 2.2,
        chaseSpeed: 4.1,
        detectRadius: 9.5,
        escapeRadius: 14.0,
      },
      {
        id: 'croc_far_west',
        pointA: new THREE.Vector3(-45, 0.12, getRiverCenterZ(-45)),
        pointB: new THREE.Vector3(-38, 0.12, getRiverCenterZ(-38)),
        patrolSpeed: 2.0,
        chaseSpeed: 3.8,
        detectRadius: 9.0,
        escapeRadius: 13.0,
      },
      {
        id: 'croc_far_east',
        pointA: new THREE.Vector3(36, 0.12, getRiverCenterZ(36)),
        pointB: new THREE.Vector3(44, 0.12, getRiverCenterZ(44)),
        patrolSpeed: 2.1,
        chaseSpeed: 3.9,
        detectRadius: 9.2,
        escapeRadius: 13.5,
      },
    ];

    routes.forEach(r => {
      const mesh = createCrocodile();
      mesh.position.copy(r.pointA);

      // Point towards pointB initially
      const initDir = new THREE.Vector3().subVectors(r.pointB, r.pointA).normalize();
      mesh.rotation.y = Math.atan2(initDir.x, initDir.z) + Math.PI;

      this.scene.add(mesh);

      // Midpoint anchor for leash constraints
      const anchor = new THREE.Vector3().addVectors(r.pointA, r.pointB).multiplyScalar(0.5);

      this.crocodiles.push({
        id: r.id,
        mesh,
        pointA: r.pointA.clone(),
        pointB: r.pointB.clone(),
        target: r.pointB.clone(),
        anchor,
        state: CROC_STATE.PATROL,
        patrolSpeed: r.patrolSpeed,
        chaseSpeed: r.chaseSpeed,
        currentSpeed: r.patrolSpeed,
        direction: 1, // 1: moving to B, -1: moving to A
        isTurning: false,
        turnToAngle: 0,
        pauseTimer: 0,
        detectRadius: r.detectRadius,
        escapeRadius: r.escapeRadius,
        dangerRadius: 1.9,
        attackDuration: 0.55,
        attackTimer: 0,
        hasHitPlayerInAttack: false,
        maxRiverDist: 6.0,  // Keep croc within river corridor
        maxAnchorDist: 13.0, // Max leash distance from patrol zone
        animTime: Math.random() * 10,
        lungeOffset: 0,
        // Bridge waypoint pathfinding
        navPath: null,
        navIndex: 0,
      });
    });
  }

  reset() {
    this.crocodiles.forEach(c => {
      c.mesh.position.copy(c.pointA);
      const initDir = new THREE.Vector3().subVectors(c.pointB, c.pointA).normalize();
      c.mesh.rotation.y = Math.atan2(initDir.x, initDir.z) + Math.PI;
      c.direction = 1;
      c.target.copy(c.pointB);
      c.state = CROC_STATE.PATROL;
      c.currentSpeed = c.patrolSpeed;
      c.isTurning = false;
      c.pauseTimer = 0;
      c.attackTimer = 0;
      c.hasHitPlayerInAttack = false;
      c.lungeOffset = 0;
      c.navPath = null;
      c.navIndex = 0;

      // Reset model offsets and rotations
      const model = c.mesh.getObjectByName('crocModel');
      if (model) model.position.z = 0;
      const lowerJaw = c.mesh.getObjectByName('lowerJaw');
      if (lowerJaw) lowerJaw.rotation.x = 0;
      const headGroup = c.mesh.getObjectByName('headGroup');
      if (headGroup) headGroup.rotation.x = 0;
    });
  }

  // Smoothly steer mesh towards target world angle
  steerToward(c, targetAngle, maxTurnSpeed, dt) {
    let diff = targetAngle - c.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const step = maxTurnSpeed * dt;
    if (Math.abs(diff) <= step) {
      c.mesh.rotation.y = targetAngle;
      return true;
    } else {
      c.mesh.rotation.y += Math.sign(diff) * step;
      return false;
    }
  }

  update(dt, playerPos, isGameOver = false, speedMultiplier = 1.0) {
    let attackingCroc = null;

    this.crocodiles.forEach(c => {
      const mesh = c.mesh;
      const currentPos = mesh.position;
      const model = mesh.getObjectByName('crocModel');
      const lowerJaw = mesh.getObjectByName('lowerJaw');
      const headGroup = mesh.getObjectByName('headGroup');
      const bodyGroup = mesh.getObjectByName('bodyGroup');
      const legFL = mesh.getObjectByName('legFL');
      const legFR = mesh.getObjectByName('legFR');
      const legBL = mesh.getObjectByName('legBL');
      const legBR = mesh.getObjectByName('legBR');
      const tailGroup = mesh.getObjectByName('tailGroup');
      const tailTipGroup = mesh.getObjectByName('tailTipGroup');

      const effectivePatrolSpeed = c.patrolSpeed * speedMultiplier;
      const effectiveChaseSpeed = c.chaseSpeed * speedMultiplier;

      // Distance calculations to player
      let distToPlayer = 9999;
      let dirToPlayer = new THREE.Vector3();
      if (playerPos) {
        dirToPlayer.subVectors(playerPos, currentPos);
        dirToPlayer.y = 0;
        distToPlayer = dirToPlayer.length();
      }

      // Distance to river centerline and patrol anchor (for leash containment)
      const riverZ = getRiverCenterZ(currentPos.x);
      const distFromRiver = Math.abs(currentPos.z - riverZ);
      const distFromAnchor = currentPos.distanceTo(c.anchor);

      // River bank detection
      const crocSide = (currentPos.z < riverZ - RIVER_HALF_WIDTH) ? -1 : ((currentPos.z > riverZ + RIVER_HALF_WIDTH) ? 1 : 0);
      let playerSide = 0;
      let playerOnBridge = false;
      if (playerPos) {
        playerOnBridge = isPlayerOnBridge(playerPos.x, playerPos.z);
        const playerRiverZ = getRiverCenterZ(playerPos.x);
        playerSide = (playerPos.z < playerRiverZ - RIVER_HALF_WIDTH) ? -1 : ((playerPos.z > playerRiverZ + RIVER_HALF_WIDTH) ? 1 : 0);
      }

      // ===== STATE MACHINE LOGIC =====
      if (isGameOver) {
        c.state = CROC_STATE.PATROL;
        c.currentSpeed = 0;
      } else {
        switch (c.state) {
          case CROC_STATE.PATROL: {
            c.currentSpeed = effectivePatrolSpeed;
            c.navPath = null;

            // Player detection check
            if (playerPos && distToPlayer <= c.detectRadius && distFromRiver <= c.maxRiverDist + 1.0) {
              c.state = CROC_STATE.CHASE;
              c.isTurning = false;
              c.pauseTimer = 0;
              break;
            }

            // Normal patrol movement along route
            if (c.pauseTimer > 0) {
              c.pauseTimer -= dt;
              c.currentSpeed = 0;
            } else if (c.isTurning) {
              c.currentSpeed = 0;
              const reachedTurn = this.steerToward(c, c.turnToAngle, 3.2, dt);
              if (reachedTurn) {
                c.isTurning = false;
              }
            } else {
              const toTarget = new THREE.Vector3().subVectors(c.target, currentPos);
              toTarget.y = 0;
              const distToTarget = toTarget.length();

              if (distToTarget < 0.35) {
                // Reached endpoint: switch target and initiate pause/turn
                c.direction *= -1;
                const nextTarget = c.direction === 1 ? c.pointB : c.pointA;
                c.target.copy(nextTarget);

                const nextDir = new THREE.Vector3().subVectors(nextTarget, currentPos).normalize();
                c.turnToAngle = Math.atan2(nextDir.x, nextDir.z) + Math.PI;
                c.isTurning = true;
                c.pauseTimer = 0.8 + Math.random() * 0.7; // Brief natural pause at route end
              } else {
                toTarget.normalize();
                // Face movement direction
                const moveAngle = Math.atan2(toTarget.x, toTarget.z) + Math.PI;
                this.steerToward(c, moveAngle, 4.0, dt);

                mesh.position.x += toTarget.x * effectivePatrolSpeed * dt;
                mesh.position.z += toTarget.z * effectivePatrolSpeed * dt;
              }
            }
            break;
          }

          case CROC_STATE.CHASE: {
            c.currentSpeed = effectiveChaseSpeed;

            // Check attack range
            if (distToPlayer <= c.dangerRadius) {
              c.state = CROC_STATE.ATTACK;
              c.attackTimer = 0;
              c.hasHitPlayerInAttack = false;
              break;
            }

            // Check leash break: player escaped or croc wandered too far from river/patrol zone
            const playerEscaped = distToPlayer > c.escapeRadius;
            const leashedByRiver = distFromRiver > c.maxRiverDist;
            const leashedByAnchor = distFromAnchor > c.maxAnchorDist;

            if (playerEscaped || leashedByRiver || leashedByAnchor) {
              c.state = CROC_STATE.RETURN;
              // Choose closest patrol point as return target
              const distA = currentPos.distanceTo(c.pointA);
              const distB = currentPos.distanceTo(c.pointB);
              c.target.copy(distA < distB ? c.pointA : c.pointB);
              c.navPath = null;
              break;
            }

            // Bridge navigation check: opposite bank or player on bridge
            const oppositeBank = (crocSide !== 0 && playerSide !== 0 && crocSide !== playerSide);

            if (oppositeBank) {
              // Select closest bridge
              const distB1 = Math.abs(currentPos.x - BRIDGES[0].x);
              const distB2 = Math.abs(currentPos.x - BRIDGES[1].x);
              const bridge = distB1 <= distB2 ? BRIDGES[0] : BRIDGES[1];

              if (!c.navPath || c.navIndex >= c.navPath.length) {
                if (crocSide < 0) {
                  // South to North
                  c.navPath = [
                    bridge.southApproach,
                    bridge.southEntry,
                    bridge.deckMid,
                    bridge.northEntry,
                    bridge.northApproach,
                  ];
                } else {
                  // North to South
                  c.navPath = [
                    bridge.northApproach,
                    bridge.northEntry,
                    bridge.deckMid,
                    bridge.southEntry,
                    bridge.southApproach,
                  ];
                }
                c.navIndex = 0;
              }

              // Advance along waypoints
              const wp = c.navPath[c.navIndex];
              const toWp = new THREE.Vector3().subVectors(wp, currentPos);
              toWp.y = 0;
              const distWp = toWp.length();

              if (distWp < 0.75) {
                c.navIndex++;
                if (c.navIndex >= c.navPath.length) {
                  c.navPath = null;
                }
              } else {
                toWp.normalize();
                const wpAngle = Math.atan2(toWp.x, toWp.z) + Math.PI;
                this.steerToward(c, wpAngle, 5.0, dt);

                mesh.position.x += toWp.x * effectiveChaseSpeed * dt;
                mesh.position.z += toWp.z * effectiveChaseSpeed * dt;
              }
            } else if (playerOnBridge) {
              // Player is on bridge: approach bridge entrance and board deck
              const distB1 = Math.abs(playerPos.x - BRIDGES[0].x);
              const targetBridge = distB1 < 10.0 ? BRIDGES[0] : BRIDGES[1];
              const onDeck = isPlayerOnBridge(currentPos.x, currentPos.z);

              if (!onDeck) {
                const entry = crocSide < 0 ? targetBridge.southApproach : targetBridge.northApproach;
                const toEntry = new THREE.Vector3().subVectors(entry, currentPos);
                toEntry.y = 0;
                toEntry.normalize();
                const entryAngle = Math.atan2(toEntry.x, toEntry.z) + Math.PI;
                this.steerToward(c, entryAngle, 5.0, dt);
                mesh.position.x += toEntry.x * effectiveChaseSpeed * dt;
                mesh.position.z += toEntry.z * effectiveChaseSpeed * dt;
              } else {
                mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetBridge.x, 0.15);
                const toPlayerZ = Math.sign(playerPos.z - currentPos.z);
                const targetAngle = toPlayerZ > 0 ? 0 : Math.PI;
                this.steerToward(c, targetAngle, 6.0, dt);
                mesh.position.z += toPlayerZ * effectiveChaseSpeed * dt;
              }
            } else {
              // Same bank: standard chase
              c.navPath = null;
              const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z) + Math.PI;
              this.steerToward(c, targetAngle, 4.8, dt);

              const chaseDir = dirToPlayer.clone().normalize();
              mesh.position.x += chaseDir.x * effectiveChaseSpeed * dt;
              mesh.position.z += chaseDir.z * effectiveChaseSpeed * dt;
            }
            break;
          }

          case CROC_STATE.ATTACK: {
            c.currentSpeed = 0;
            c.attackTimer += dt;

            // Keep facing player during attack wind-up
            if (c.attackTimer < 0.25) {
              const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z) + Math.PI;
              this.steerToward(c, targetAngle, 6.0, dt);
            }

            // Lunge and jaw animation curve
            const attackProgress = c.attackTimer / c.attackDuration;

            if (attackProgress <= 0.4) {
              // Phase 1: Jaws open wide and lunge forward
              const openFactor = attackProgress / 0.4;
              if (lowerJaw) lowerJaw.rotation.x = -openFactor * 0.52; // Jaw drops open
              if (headGroup) headGroup.rotation.x = openFactor * 0.15; // Snout tilts up
              c.lungeOffset = -openFactor * 0.55; // Forward lunge (-Z in local croc space)
            } else if (attackProgress <= 0.6) {
              // Phase 2: Snap shut at apex!
              const snapFactor = (attackProgress - 0.4) / 0.2;
              if (lowerJaw) lowerJaw.rotation.x = -(1.0 - snapFactor) * 0.52;
              if (headGroup) headGroup.rotation.x = (1.0 - snapFactor) * 0.15;
              c.lungeOffset = -0.55 * (1.0 - snapFactor * 0.4);

              // Deal damage on snap (once per attack cycle while in attack lunge range)
              if (!c.hasHitPlayerInAttack && distToPlayer <= (c.dangerRadius + 1.0)) {
                c.hasHitPlayerInAttack = true;
                attackingCroc = c;
              }
            } else if (attackProgress <= 1.0) {
              // Phase 3: Recover to neutral pose
              const recoverFactor = (attackProgress - 0.6) / 0.4;
              if (lowerJaw) lowerJaw.rotation.x = 0;
              if (headGroup) headGroup.rotation.x = 0;
              c.lungeOffset = -0.33 * (1.0 - recoverFactor);
            } else {
              // Attack completed: decide next state
              c.lungeOffset = 0;
              if (lowerJaw) lowerJaw.rotation.x = 0;
              if (headGroup) headGroup.rotation.x = 0;

              if (distToPlayer <= c.dangerRadius) {
                // Still close: initiate another strike after brief cooldown
                c.attackTimer = 0;
                c.hasHitPlayerInAttack = false;
              } else if (distToPlayer <= c.detectRadius && distFromRiver <= c.maxRiverDist) {
                c.state = CROC_STATE.CHASE;
              } else {
                c.state = CROC_STATE.RETURN;
                const distA = currentPos.distanceTo(c.pointA);
                const distB = currentPos.distanceTo(c.pointB);
                c.target.copy(distA < distB ? c.pointA : c.pointB);
              }
            }

            if (model) model.position.z = c.lungeOffset;
            break;
          }

          case CROC_STATE.RETURN: {
            c.currentSpeed = c.patrolSpeed * 1.25;

            // If player comes close again while returning, re-engage!
            if (distToPlayer <= c.detectRadius && distFromRiver <= c.maxRiverDist + 1.0) {
              c.state = CROC_STATE.CHASE;
              break;
            }

            const toWaypoint = new THREE.Vector3().subVectors(c.target, currentPos);
            toWaypoint.y = 0;
            const distToWaypoint = toWaypoint.length();

            if (distToWaypoint < 0.6) {
              // Reached return point, resume regular patrol
              c.state = CROC_STATE.PATROL;
              c.pauseTimer = 0.5;
            } else {
              toWaypoint.normalize();
              const returnAngle = Math.atan2(toWaypoint.x, toWaypoint.z) + Math.PI;
              this.steerToward(c, returnAngle, 3.5, dt);

              mesh.position.x += toWaypoint.x * c.currentSpeed * dt;
              mesh.position.z += toWaypoint.z * c.currentSpeed * dt;
            }
            break;
          }
        }
      }

      // Constrain within island radius
      const distCenter = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
      if (distCenter > 32.5) {
        mesh.position.x *= 32.5 / distCenter;
        mesh.position.z *= 32.5 / distCenter;
      }

      // Maintain proper elevation (raise to bridge deck when on bridge)
      const onBridgeNow = isPlayerOnBridge(mesh.position.x, mesh.position.z);
      mesh.position.y = onBridgeNow ? 0.35 : 0.12;

      // ===== PROCEDURAL CROCODILE ANIMATION =====
      const animRate = c.currentSpeed > 0 ? (c.currentSpeed * 2.2) : 1.2;
      c.animTime += dt * animRate;
      const t = c.animTime;

      // Leg crawling animation: alternating splayed legs
      const legAmp = c.currentSpeed > 0 ? (0.25 + (c.currentSpeed / c.chaseSpeed) * 0.22) : 0.05;
      if (legFL) legFL.rotation.y = Math.sin(t) * legAmp;
      if (legFR) legFR.rotation.y = -Math.sin(t) * legAmp;
      if (legBL) legBL.rotation.y = -Math.sin(t) * legAmp;
      if (legBR) legBR.rotation.y = Math.sin(t) * legAmp;

      // Sinuous tail swish (traveling wave from base to tip)
      const tailAmp = c.currentSpeed > 0 ? (0.28 + (c.currentSpeed / c.chaseSpeed) * 0.18) : 0.12;
      if (tailGroup) {
        tailGroup.rotation.y = Math.sin(t) * tailAmp;
      }
      if (tailTipGroup) {
        tailTipGroup.rotation.y = Math.sin(t - 0.7) * (tailAmp * 1.35);
      }

      // Subtle lateral spine sway & crawl roll
      if (bodyGroup) {
        const bodySway = c.currentSpeed > 0 ? Math.sin(t * 0.5) * 0.05 : 0;
        bodyGroup.rotation.y = bodySway;
        bodyGroup.rotation.z = Math.cos(t) * (0.02 * (c.currentSpeed / c.chaseSpeed));
      }
    });

    return attackingCroc;
  }
}
