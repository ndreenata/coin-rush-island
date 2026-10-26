// ===== PLAYER CHARACTER - Stylized Low-Poly Island Adventurer =====
import * as THREE from 'three';

export function createCharacter(customShirtColor = null) {
  const group = new THREE.Group();
  group.name = 'playerCharacter';

  // Curated Tropical Adventurer Palette
  const skinColor = 0xF7D0B5;
  const shirtColor = customShirtColor !== null ? customShirtColor : 0x2563EB; // Royal adventure blue
  const vestColor = 0x1E40AF;  // Deep navy explorer vest
  const pantsColor = 0xC26A28; // Warm khaki/ochre cargo shorts
  const bootColor = 0x451A03;  // Dark rugged leather
  const bootCuffColor = 0x78350F;
  const hairColor = 0x3E2723;  // Rich dark chestnut
  const bandColor = 0xE11D48;  // Crimson bandana/headband
  const goldColor = 0xF59E0B;  // Polished brass/gold buckles
  const backpackColor = 0x991B1B; // Explorer canvas rucksack
  const bedrollColor = 0x065F46;  // Forest green rolled mat
  const whiteColor = 0xFFFFFF;
  const pupilColor = 0x111827;

  // Materials
  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const vestMat = new THREE.MeshLambertMaterial({ color: vestColor });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
  const bootMat = new THREE.MeshLambertMaterial({ color: bootColor });
  const bootCuffMat = new THREE.MeshLambertMaterial({ color: bootCuffColor });
  const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
  const bandMat = new THREE.MeshLambertMaterial({ color: bandColor });
  const goldMat = new THREE.MeshLambertMaterial({ color: goldColor });
  const backpackMat = new THREE.MeshLambertMaterial({ color: backpackColor });
  const bedrollMat = new THREE.MeshLambertMaterial({ color: bedrollColor });
  const whiteMat = new THREE.MeshLambertMaterial({ color: whiteColor });
  const pupilMat = new THREE.MeshLambertMaterial({ color: pupilColor });
  const mouthMat = new THREE.MeshLambertMaterial({ color: 0xBE123C });

  // ===== 1. HEAD & EXPRESSION GROUP =====
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';

  // Base head - stylized smoothed low-poly head (radius 0.34m)
  const headGeo = new THREE.SphereGeometry(0.34, 14, 12);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 1.65;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Stylized Hair Volume (Top & Back)
  const hairTopGeo = new THREE.SphereGeometry(0.365, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
  hairTop.position.set(0, 1.72, -0.02);
  hairTop.castShadow = true;
  headGroup.add(hairTop);

  // Sculpted Hair Tufts & Swept Bangs
  const bangLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), hairMat);
  bangLeft.position.set(-0.14, 1.87, 0.22);
  bangLeft.rotation.set(-0.2, 0.15, -0.25);
  headGroup.add(bangLeft);

  const bangRight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.16), hairMat);
  bangRight.position.set(0.12, 1.88, 0.21);
  bangRight.rotation.set(-0.25, -0.15, 0.2);
  headGroup.add(bangRight);

  // Adventurer Headband with Gold Clasp
  const bandGeo = new THREE.TorusGeometry(0.345, 0.032, 8, 24);
  bandGeo.rotateX(Math.PI / 2);
  const headband = new THREE.Mesh(bandGeo, bandMat);
  headband.position.set(0, 1.76, 0);
  headGroup.add(headband);

  const claspGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8);
  claspGeo.rotateX(Math.PI / 2);
  const clasp = new THREE.Mesh(claspGeo, goldMat);
  clasp.position.set(0, 1.76, 0.355);
  headGroup.add(clasp);

  // Ears
  [-0.34, 0.34].forEach(ex => {
    const earGeo = new THREE.SphereGeometry(0.065, 6, 6);
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(ex, 1.65, 0.02);
    headGroup.add(ear);
  });

  // Expressive Adventurer Eyes (White sclera, Dark Iris, and Sparkle Highlight)
  [-0.12, 0.12].forEach(ex => {
    // Sclera
    const eyeSclera = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), whiteMat);
    eyeSclera.position.set(ex, 1.68, 0.29);
    headGroup.add(eyeSclera);

    // Iris / Pupil
    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.044, 6, 6), pupilMat);
    eyePupil.position.set(ex, 1.68, 0.335);
    headGroup.add(eyePupil);

    // Glint of light in eye
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 4), whiteMat);
    glint.position.set(ex + 0.02, 1.70, 0.355);
    headGroup.add(glint);

    // Friendly eyebrow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.04), hairMat);
    brow.position.set(ex, 1.78, 0.28);
    brow.rotation.z = (ex < 0 ? -1 : 1) * 0.08;
    headGroup.add(brow);
  });

  // Friendly Smile
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.03), mouthMat);
  smile.position.set(0, 1.54, 0.32);
  headGroup.add(smile);

  group.add(headGroup);

  // ===== 2. TORSO & EXPLORER VEST =====
  const torso = new THREE.Group();
  torso.name = 'torso';

  // Inner shirt
  const torsoGeo = new THREE.BoxGeometry(0.50, 0.52, 0.32);
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.position.y = 1.10;
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  // Explorer vest lapels (layered over chest)
  const vestLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.34), vestMat);
  vestLeft.position.set(-0.19, 1.10, 0.01);
  vestLeft.castShadow = true;
  torso.add(vestLeft);

  const vestRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.34), vestMat);
  vestRight.position.set(0.19, 1.10, 0.01);
  vestRight.castShadow = true;
  torso.add(vestRight);

  // Utility belt & gold buckle
  const beltGeo = new THREE.BoxGeometry(0.53, 0.08, 0.34);
  const beltMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.y = 0.86;
  torso.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.36), goldMat);
  buckle.position.set(0, 0.86, 0.01);
  torso.add(buckle);

  // Hip water canteen
  const canteenMat = new THREE.MeshLambertMaterial({ color: 0x0284C7 });
  const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), canteenMat);
  canteen.position.set(0.28, 0.84, -0.06);
  torso.add(canteen);

  // ===== 3. EXPLORER BACKPACK WITH BEDROLL =====
  const bpBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.40, 0.22), backpackMat);
  bpBody.position.set(0, 1.08, -0.26);
  bpBody.castShadow = true;
  torso.add(bpBody);

  // Top rolled sleeping mat (bedroll)
  const bedrollGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.44, 8);
  bedrollGeo.rotateZ(Math.PI / 2);
  const bedroll = new THREE.Mesh(bedrollGeo, bedrollMat);
  bedroll.position.set(0, 1.34, -0.25);
  bedroll.castShadow = true;
  torso.add(bedroll);

  // Twin golden buckles on backpack flap
  [-0.09, 0.09].forEach(bx => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.32, 0.03), goldMat);
    strap.position.set(bx, 1.06, -0.375);
    torso.add(strap);
  });

  group.add(torso);

  // ===== 4. ARTICULATED ARMS (Shoulder Pivot + Forearm Pivot) =====
  const leftArm = createArticulatedArm('leftArm', -1, shirtMat, skinMat, vestMat);
  leftArm.position.set(-0.35, 1.28, 0);
  group.add(leftArm);

  const rightArm = createArticulatedArm('rightArm', 1, shirtMat, skinMat, vestMat);
  rightArm.position.set(0.35, 1.28, 0);
  group.add(rightArm);

  // ===== 5. SHORTS / PELVIS =====
  const shortsGeo = new THREE.BoxGeometry(0.52, 0.22, 0.33);
  const shorts = new THREE.Mesh(shortsGeo, pantsMat);
  shorts.position.y = 0.74;
  shorts.castShadow = true;
  shorts.name = 'shorts';
  group.add(shorts);

  // ===== 6. ARTICULATED LEGS (Hip Pivot + Knee/Shin + Boots) =====
  const leftLeg = createArticulatedLeg('leftLeg', -0.14, pantsMat, skinMat, bootMat, bootCuffMat);
  leftLeg.position.set(-0.14, 0.63, 0);
  group.add(leftLeg);

  const rightLeg = createArticulatedLeg('rightLeg', 0.14, pantsMat, skinMat, bootMat, bootCuffMat);
  rightLeg.position.set(0.14, 0.63, 0);
  group.add(rightLeg);

  // Scale character to standard game scale (0.8x)
  group.scale.setScalar(0.8);

  // Cache mesh materials for damage flashing
  const meshMaterials = [];
  group.traverse(child => {
    if (child.isMesh && child.material && child.material.color) {
      meshMaterials.push({
        mesh: child,
        originalColor: child.material.color.clone(),
      });
    }
  });

  group.userData = {
    walkTime: 0,
    bobPhase: 0,
    idleTime: 0,
    animSpeed: 0,
    damageTimer: 0,
    waterDepth: 0,
    meshMaterials,
  };

  return group;
}

// ===== ARTICULATED ARM BUILDER =====
function createArticulatedArm(name, sideSign, sleeveMat, skinMat, trimMat) {
  const armPivot = new THREE.Group();
  armPivot.name = name;

  // Shoulder sleeve cuff
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), sleeveMat);
  shoulder.position.set(0, 0, 0);
  shoulder.castShadow = true;
  armPivot.add(shoulder);

  // Upper arm
  const upperGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.22, 8);
  const upper = new THREE.Mesh(upperGeo, sleeveMat);
  upper.position.y = -0.11;
  upper.castShadow = true;
  armPivot.add(upper);

  // Forearm group (pivot at elbow)
  const forearm = new THREE.Group();
  forearm.name = `${name}_forearm`;
  forearm.position.set(0, -0.22, 0);

  const lowerGeo = new THREE.CylinderGeometry(0.065, 0.058, 0.20, 8);
  const lower = new THREE.Mesh(lowerGeo, skinMat);
  lower.position.y = -0.10;
  lower.castShadow = true;
  forearm.add(lower);

  // Explorer fingerless glove cuff
  const gloveCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 8), trimMat);
  gloveCuff.position.y = -0.16;
  forearm.add(gloveCuff);

  // Hand
  const handGeo = new THREE.SphereGeometry(0.065, 8, 6);
  const hand = new THREE.Mesh(handGeo, skinMat);
  hand.position.set(0, -0.22, 0.01);
  forearm.add(hand);

  armPivot.add(forearm);
  return armPivot;
}

// ===== ARTICULATED LEG BUILDER =====
function createArticulatedLeg(name, posX, shortsMat, skinMat, bootMat, bootCuffMat) {
  const legPivot = new THREE.Group();
  legPivot.name = name;

  // Thigh (Shorts leg)
  const thighGeo = new THREE.CylinderGeometry(0.105, 0.095, 0.22, 8);
  const thigh = new THREE.Mesh(thighGeo, shortsMat);
  thigh.position.y = -0.11;
  thigh.castShadow = true;
  legPivot.add(thigh);

  // Lower leg group (pivot at knee)
  const lowerLeg = new THREE.Group();
  lowerLeg.name = `${name}_lower`;
  lowerLeg.position.set(0, -0.22, 0);

  // Calf (Skin)
  const calfGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.18, 8);
  const calf = new THREE.Mesh(calfGeo, skinMat);
  calf.position.y = -0.09;
  calf.castShadow = true;
  lowerLeg.add(calf);

  // Boot Cuff
  const cuffGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.07, 8);
  const cuff = new THREE.Mesh(cuffGeo, bootCuffMat);
  cuff.position.y = -0.17;
  lowerLeg.add(cuff);

  // Boot Shoe (Sculpted low-poly adventure boot)
  const bootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.22);
  const boot = new THREE.Mesh(bootGeo, bootMat);
  boot.position.set(0, -0.25, 0.04);
  boot.castShadow = true;
  lowerLeg.add(boot);

  // Boot sole tread
  const soleMat = new THREE.MeshLambertMaterial({ color: 0x18181B });
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.23), soleMat);
  sole.position.set(0, -0.31, 0.04);
  lowerLeg.add(sole);

  legPivot.add(lowerLeg);
  return legPivot;
}

// ===== DAMAGE FEEDBACK TRIGGER =====
export function triggerCharacterDamage(group) {
  if (group && group.userData) {
    group.userData.damageTimer = 0.35;
  }
}

// ===== NATURAL PROCEDURAL CHARACTER ANIMATION =====
export function animateCharacter(
  group,
  isMoving,
  deltaTime,
  moveSpeedRatio = 1.0,
  inWater = false,
  isJumping = false,
  jumpHeight = 0,
  groundHeight = 0
) {
  if (!group || !group.userData) return;

  const data = group.userData;
  const leftArm = group.getObjectByName('leftArm');
  const rightArm = group.getObjectByName('rightArm');
  const leftLeg = group.getObjectByName('leftLeg');
  const rightLeg = group.getObjectByName('rightLeg');
  const leftForearm = group.getObjectByName('leftArm_forearm');
  const rightForearm = group.getObjectByName('rightArm_forearm');
  const leftLowerLeg = group.getObjectByName('leftLeg_lower');
  const rightLowerLeg = group.getObjectByName('rightLeg_lower');
  const torso = group.getObjectByName('torso');
  const headGroup = group.getObjectByName('headGroup');

  // Smooth acceleration and deceleration of animation speed
  const targetAnimSpeed = isMoving ? Math.max(0.3, Math.min(1.0, moveSpeedRatio)) : 0;
  const blendRate = isMoving ? 14 : 10;
  data.animSpeed += (targetAnimSpeed - data.animSpeed) * Math.min(1, blendRate * deltaTime);

  // Smooth wading depth when entering or exiting water
  data.waterDepth = data.waterDepth || 0;
  const targetDepth = inWater ? -0.11 : 0.0;
  data.waterDepth += (targetDepth - data.waterDepth) * Math.min(1, 8 * deltaTime);

  const speed = data.animSpeed;

  if (isJumping || jumpHeight > 0.02) {
    // Jump pose: athletic adventure posture with flexed knees and balanced arms
    if (leftArm) {
      leftArm.rotation.x = -0.55;
      leftArm.rotation.z = 0.42;
    }
    if (rightArm) {
      rightArm.rotation.x = -0.55;
      rightArm.rotation.z = -0.42;
    }
    if (leftForearm) leftForearm.rotation.x = 0.35;
    if (rightForearm) rightForearm.rotation.x = 0.35;

    // Knees bent upward during leap
    if (leftLeg) leftLeg.rotation.x = 0.45;
    if (rightLeg) rightLeg.rotation.x = 0.35;
    if (leftLowerLeg) leftLowerLeg.rotation.x = -0.45;
    if (rightLowerLeg) rightLowerLeg.rotation.x = -0.35;

    if (torso) torso.rotation.x = 0.12;
    if (headGroup) headGroup.rotation.x = -0.08;

    group.position.y = groundHeight + jumpHeight + data.waterDepth;
  } else if (speed > 0.02) {
    // Locomotion: frequency scales from comfortable walk (~6.8 rad/s) to full sprint (~13.2 rad/s)
    const animFreq = 6.8 + speed * 6.4;
    data.walkTime += deltaTime * animFreq;
    const t = data.walkTime;

    // Amplitudes scale with speed
    const armAmp = 0.32 + speed * 0.38;
    const legAmp = 0.28 + speed * 0.32;

    // Alternating arm swing with natural elbow flexion
    if (leftArm) {
      leftArm.rotation.x = Math.sin(t) * armAmp;
      leftArm.rotation.z = 0.08 + Math.sin(t * 0.5) * 0.05;
    }
    if (rightArm) {
      rightArm.rotation.x = -Math.sin(t) * armAmp;
      rightArm.rotation.z = -0.08 - Math.sin(t * 0.5) * 0.05;
    }
    if (leftForearm) {
      // Elbow bends more on the forward swing
      leftForearm.rotation.x = Math.max(0.1, Math.sin(t) * 0.45 + 0.2);
    }
    if (rightForearm) {
      rightForearm.rotation.x = Math.max(0.1, -Math.sin(t) * 0.45 + 0.2);
    }

    // Alternating leg swing with knee flexion
    const leftSin = Math.sin(t);
    const rightSin = -Math.sin(t);

    if (leftLeg) {
      leftLeg.rotation.x = -leftSin * legAmp;
    }
    if (rightLeg) {
      rightLeg.rotation.x = -rightSin * legAmp;
    }

    // Knees bend during back-swing
    if (leftLowerLeg) {
      leftLowerLeg.rotation.x = leftSin > 0 ? -leftSin * 0.65 : -0.05;
    }
    if (rightLowerLeg) {
      rightLowerLeg.rotation.x = rightSin > 0 ? -rightSin * 0.65 : -0.05;
    }

    // Natural torso counter-twist and athletic forward lean
    if (torso) {
      torso.rotation.x = 0.04 + speed * 0.10;
      torso.rotation.y = Math.sin(t) * (0.05 * speed);
      torso.rotation.z = Math.cos(t) * (0.035 * speed);
    }

    // Stabilizing head glance
    if (headGroup) {
      headGroup.rotation.x = -speed * 0.04;
      headGroup.rotation.y = -Math.sin(t) * (0.028 * speed);
    }

    // Rhythmic stride vertical bounce (bobbing)
    data.bobPhase += deltaTime * (animFreq * 2);
    const bobHeight = 0.025 + speed * 0.04;
    const bobY = Math.abs(Math.sin(data.bobPhase)) * bobHeight;
    group.position.y = groundHeight + data.waterDepth + bobY;
  } else {
    // Idle pose: relaxed stance with subtle chest breathing and arm micro-sway
    const resetRate = Math.min(1, 10 * deltaTime);
    data.idleTime = (data.idleTime || 0) + deltaTime;

    const breath = Math.sin(data.idleTime * 2.4) * 0.015;

    if (leftArm) {
      leftArm.rotation.x *= (1 - resetRate);
      leftArm.rotation.z = (leftArm.rotation.z * (1 - resetRate)) + 0.06 + breath * 0.03;
    }
    if (rightArm) {
      rightArm.rotation.x *= (1 - resetRate);
      rightArm.rotation.z = (rightArm.rotation.z * (1 - resetRate)) - 0.06 - breath * 0.03;
    }
    if (leftForearm) leftForearm.rotation.x *= (1 - resetRate);
    if (rightForearm) rightForearm.rotation.x *= (1 - resetRate);

    if (leftLeg) leftLeg.rotation.x *= (1 - resetRate);
    if (rightLeg) rightLeg.rotation.x *= (1 - resetRate);
    if (leftLowerLeg) leftLowerLeg.rotation.x *= (1 - resetRate);
    if (rightLowerLeg) rightLowerLeg.rotation.x *= (1 - resetRate);

    if (torso) {
      torso.rotation.x *= (1 - resetRate);
      torso.rotation.y *= (1 - resetRate);
      torso.rotation.z *= (1 - resetRate);
    }
    if (headGroup) {
      headGroup.rotation.x = Math.sin(data.idleTime * 1.2) * 0.02;
      headGroup.rotation.y = Math.cos(data.idleTime * 0.8) * 0.03;
    }

    group.position.y = groundHeight + data.waterDepth + breath * 0.012;
  }

  // Handle damage flashing feedback
  if (data.damageTimer > 0) {
    data.damageTimer -= deltaTime;
    const isFlashing = Math.floor(data.damageTimer * 20) % 2 === 0;

    if (data.meshMaterials) {
      data.meshMaterials.forEach(({ mesh, originalColor }) => {
        if (mesh.material && mesh.material.color) {
          if (isFlashing) {
            mesh.material.color.setRGB(1.0, 0.22, 0.22);
          } else {
            mesh.material.color.copy(originalColor);
          }
        }
      });
    }

    if (torso) {
      torso.rotation.x -= 0.12 * (data.damageTimer / 0.35);
    }
  } else if (data.meshMaterials && data.damageTimer <= 0 && data.damageTimer > -1) {
    data.meshMaterials.forEach(({ mesh, originalColor }) => {
      if (mesh.material && mesh.material.color) {
        mesh.material.color.copy(originalColor);
      }
    });
    data.damageTimer = -1;
  }
}

// ===== DEATH / ELIMINATION FALL ANIMATION =====
export function animateCharacterDeath(group, progress) {
  if (!group) return;
  const p = Math.max(0, Math.min(1, progress));

  group.rotation.x = -p * (Math.PI * 0.48);
  const headGroup = group.getObjectByName('headGroup');
  if (headGroup) headGroup.rotation.x = -p * 0.3;
  const torso = group.getObjectByName('torso');
  if (torso) torso.rotation.x = -p * 0.2;
  const leftArm = group.getObjectByName('leftArm');
  const rightArm = group.getObjectByName('rightArm');
  if (leftArm) leftArm.rotation.z = p * 0.8;
  if (rightArm) rightArm.rotation.z = -p * 0.8;

  group.position.y -= p * 0.04;

  if (p >= 1.0) {
    group.visible = false;
  }
}
