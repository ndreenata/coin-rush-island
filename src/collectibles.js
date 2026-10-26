// ===== COLLECTIBLES - Coins, Treasure Chests, Particles =====
import * as THREE from 'three';

// ===== GOLD COIN =====
export function createCoin() {
  const group = new THREE.Group();

  const coinMat = new THREE.MeshPhongMaterial({
    color: 0xFFD700,
    shininess: 100,
    specular: 0xFFAA00,
    emissive: 0x332200,
    emissiveIntensity: 0.15,
  });

  // Main disc
  const discGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16);
  const disc = new THREE.Mesh(discGeo, coinMat);
  disc.castShadow = true;
  group.add(disc);

  // Rim detail (slightly larger edge)
  const rimGeo = new THREE.TorusGeometry(0.38, 0.03, 6, 16);
  const rimMat = new THREE.MeshPhongMaterial({
    color: 0xDAA520,
    shininess: 80,
    specular: 0xFFAA00,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // Center emblem (small star)
  const starGeo = new THREE.OctahedronGeometry(0.12, 0);
  const starMat = new THREE.MeshPhongMaterial({
    color: 0xFFF8DC,
    shininess: 120,
    emissive: 0x443300,
    emissiveIntensity: 0.2,
  });
  const star = new THREE.Mesh(starGeo, starMat);
  star.scale.set(1, 0.3, 1);
  star.position.y = 0;
  group.add(star);

  // Rotate to stand upright
  group.rotation.z = Math.PI / 2;

  // Add glow effect (subtle)
  const glowGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.08,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  return group;
}

// ===== TREASURE CHEST (CLOSED) =====
export function createChest() {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x6B3410 });
  const metalMat = new THREE.MeshPhongMaterial({
    color: 0xB8860B,
    shininess: 60,
    specular: 0xFFD700,
  });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xFFD700,
    shininess: 80,
    specular: 0xFFFFFF,
  });
  const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });

  // Base box
  const baseGeo = new THREE.BoxGeometry(1.0, 0.5, 0.7);
  const base = new THREE.Mesh(baseGeo, woodMat);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Lid (rounded top using a cylinder half)
  const lidGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.02, 8, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(lidGeo, darkWoodMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI;
  lid.position.set(0, 0.5, 0);
  lid.castShadow = true;
  group.add(lid);

  // Metal bands (front)
  [-0.2, 0.2].forEach(x => {
    const bandGeo = new THREE.BoxGeometry(0.06, 0.52, 0.72);
    const band = new THREE.Mesh(bandGeo, metalMat);
    band.position.set(x, 0.26, 0);
    group.add(band);
  });

  // Lock on front
  const lockGeo = new THREE.BoxGeometry(0.12, 0.15, 0.05);
  const lock = new THREE.Mesh(lockGeo, goldMat);
  lock.position.set(0, 0.35, 0.37);
  group.add(lock);

  // Lock keyhole
  const keyholeGeo = new THREE.CircleGeometry(0.03, 8);
  const keyholeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const keyhole = new THREE.Mesh(keyholeGeo, keyholeMat);
  keyhole.position.set(0, 0.35, 0.38);
  group.add(keyhole);

  // Corner metal pieces
  const cornerGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  [[-0.48, 0.02, 0.33], [0.48, 0.02, 0.33], [-0.48, 0.02, -0.33], [0.48, 0.02, -0.33]].forEach(pos => {
    const corner = new THREE.Mesh(cornerGeo, darkMetalMat);
    corner.position.set(...pos);
    group.add(corner);
  });

  return group;
}

// ===== TREASURE CHEST (OPENED) =====
export function createChestOpen() {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x6B3410 });
  const metalMat = new THREE.MeshPhongMaterial({
    color: 0xB8860B,
    shininess: 60,
    specular: 0xFFD700,
  });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xFFD700,
    shininess: 100,
    specular: 0xFFFFFF,
    emissive: 0x332200,
    emissiveIntensity: 0.3,
  });

  // Base box
  const baseGeo = new THREE.BoxGeometry(1.0, 0.5, 0.7);
  const base = new THREE.Mesh(baseGeo, woodMat);
  base.position.y = 0.25;
  base.castShadow = true;
  group.add(base);

  // Opened lid (rotated back)
  const lidGroup = new THREE.Group();
  const lidGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.02, 8, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(lidGeo, darkWoodMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI;
  lidGroup.add(lid);
  lidGroup.position.set(0, 0.5, -0.35);
  lidGroup.rotation.x = -1.8; // Open backwards
  lidGroup.castShadow = true;
  group.add(lidGroup);

  // Metal bands on base
  [-0.2, 0.2].forEach(x => {
    const bandGeo = new THREE.BoxGeometry(0.06, 0.52, 0.72);
    const band = new THREE.Mesh(bandGeo, metalMat);
    band.position.set(x, 0.26, 0);
    group.add(band);
  });

  // Gold treasure inside
  for (let i = 0; i < 8; i++) {
    const goldGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 4);
    const gold = new THREE.Mesh(goldGeo, goldMat);
    gold.position.set(
      (Math.random() - 0.5) * 0.5,
      0.4 + Math.random() * 0.15,
      (Math.random() - 0.5) * 0.3
    );
    group.add(gold);
  }

  // Sparkle particles above
  const sparkleMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < 5; i++) {
    const sparkGeo = new THREE.OctahedronGeometry(0.04, 0);
    const spark = new THREE.Mesh(sparkGeo, sparkleMat);
    spark.position.set(
      (Math.random() - 0.5) * 0.6,
      0.6 + Math.random() * 0.5,
      (Math.random() - 0.5) * 0.4
    );
    spark.name = 'sparkle_' + i;
    group.add(spark);
  }

  // Light glow
  const glowGeo = new THREE.SphereGeometry(0.6, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.1,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.5;
  group.add(glow);

  return group;
}

// ===== ANIMATE COINS =====
export function animateCoins(coins, time) {
  coins.forEach((coin, i) => {
    // Rotate
    coin.rotation.y = time * 1.0 + i * 0.5;
    // Bob
    const baseY = coin.userData.baseY || coin.position.y;
    if (!coin.userData.baseY) coin.userData.baseY = coin.position.y;
    coin.position.y = baseY + Math.sin(time * 2 + i * 0.7) * 0.15;
  });
}

// ===== COIN PARTICLE EFFECT =====
export function createCoinParticle(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.lifetime = 0.6;
  group.userData.particles = [];

  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 1,
  });

  for (let i = 0; i < 8; i++) {
    const geo = new THREE.OctahedronGeometry(0.06, 0);
    const mesh = new THREE.Mesh(geo, particleMat.clone());
    const angle = (i / 8) * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    mesh.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      2 + Math.random() * 3,
      Math.sin(angle) * speed
    );
    group.add(mesh);
    group.userData.particles.push(mesh);
  }

  return group;
}

// ===== UPDATE PARTICLES =====
export function updateParticles(particleGroups, deltaTime, scene) {
  return particleGroups.filter(group => {
    group.userData.lifetime -= deltaTime;

    if (group.userData.lifetime <= 0) {
      if (scene) scene.remove(group);
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      return false; // Removed from active array
    }

    const t = group.userData.lifetime / 0.6; // 0 to 1

    group.userData.particles.forEach(p => {
      // Move
      p.position.x += p.userData.velocity.x * deltaTime;
      p.position.y += p.userData.velocity.y * deltaTime;
      p.position.z += p.userData.velocity.z * deltaTime;

      // Gravity
      p.userData.velocity.y -= 10 * deltaTime;

      // Fade
      if (p.material) {
        p.material.opacity = t;
      }

      // Shrink
      const s = t;
      p.scale.setScalar(s);
    });

    return true;
  });
}

// ===== GOLDEN TREASURE CHEST (LOCKED) =====
export function createGoldenChest() {
  const group = new THREE.Group();

  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    shininess: 110,
    specular: 0xfef08a,
    emissive: 0x78350f,
    emissiveIntensity: 0.2,
  });
  const darkGoldMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
  const rubyMat = new THREE.MeshPhongMaterial({
    color: 0xef4444,
    shininess: 120,
    specular: 0xffffff,
    emissive: 0x991b1b,
    emissiveIntensity: 0.3,
  });

  // Base box
  const baseGeo = new THREE.BoxGeometry(1.1, 0.55, 0.75);
  const base = new THREE.Mesh(baseGeo, goldMat);
  base.position.y = 0.275;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Rounded lid
  const lidGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.12, 8, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(lidGeo, darkGoldMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI;
  lid.position.set(0, 0.55, 0);
  lid.castShadow = true;
  group.add(lid);

  // Ruby crest on lid
  const rubyGeo = new THREE.OctahedronGeometry(0.12, 0);
  const ruby = new THREE.Mesh(rubyGeo, rubyMat);
  ruby.position.set(0, 0.94, 0);
  ruby.castShadow = true;
  group.add(ruby);

  // Ornate golden lock
  const lockGeo = new THREE.BoxGeometry(0.16, 0.2, 0.08);
  const lock = new THREE.Mesh(lockGeo, darkGoldMat);
  lock.position.set(0, 0.38, 0.4);
  group.add(lock);

  // Keyhole
  const keyholeGeo = new THREE.CircleGeometry(0.04, 8);
  const keyholeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const keyhole = new THREE.Mesh(keyholeGeo, keyholeMat);
  keyhole.position.set(0, 0.38, 0.445);
  group.add(keyhole);

  // Shimmering aura
  const auraGeo = new THREE.SphereGeometry(0.85, 8, 6);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.12,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.y = 0.5;
  group.add(aura);

  return group;
}

// ===== GOLDEN TREASURE CHEST (OPENED) =====
export function createGoldenChestOpen() {
  const group = new THREE.Group();

  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    shininess: 110,
    specular: 0xfef08a,
    emissive: 0x78350f,
    emissiveIntensity: 0.2,
  });
  const darkGoldMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
  const gemColors = [0xef4444, 0x3b8256, 0x3b82f6, 0xa855f7, 0xfacc15];

  // Base
  const baseGeo = new THREE.BoxGeometry(1.1, 0.55, 0.75);
  const base = new THREE.Mesh(baseGeo, goldMat);
  base.position.y = 0.275;
  base.castShadow = true;
  group.add(base);

  // Open lid
  const lidGroup = new THREE.Group();
  const lidGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.12, 8, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(lidGeo, darkGoldMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI;
  lidGroup.add(lid);
  lidGroup.position.set(0, 0.55, -0.38);
  lidGroup.rotation.x = -1.8;
  group.add(lidGroup);

  // Glowing gems inside
  for (let i = 0; i < 12; i++) {
    const gemGeo = new THREE.OctahedronGeometry(0.08 + Math.random() * 0.05, 0);
    const gemMat = new THREE.MeshPhongMaterial({
      color: gemColors[i % gemColors.length],
      emissive: gemColors[i % gemColors.length],
      emissiveIntensity: 0.4,
      shininess: 120,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(
      (Math.random() - 0.5) * 0.6,
      0.45 + Math.random() * 0.18,
      (Math.random() - 0.5) * 0.35
    );
    group.add(gem);
  }

  return group;
}

// ===== HEALTH POTION (+30 HP) =====
export function createHealthPotion() {
  const group = new THREE.Group();

  // Glass vial (translucent)
  const glassGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.55, 10);
  const glassMat = new THREE.MeshPhongMaterial({
    color: 0xecfdf5,
    transparent: true,
    opacity: 0.55,
    shininess: 120,
    specular: 0xffffff,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 0.35;
  group.add(glass);

  // Emerald liquid inside
  const liquidGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.42, 8);
  const liquidMat = new THREE.MeshLambertMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.5,
  });
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  liquid.position.y = 0.3;
  group.add(liquid);

  // Cork stopper
  const corkGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.12, 8);
  const corkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  const cork = new THREE.Mesh(corkGeo, corkMat);
  cork.position.y = 0.68;
  group.add(cork);

  // Green cross icon above
  const crossGroup = new THREE.Group();
  const crossMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.04), crossMat);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), crossMat);
  crossGroup.add(vBar);
  crossGroup.add(hBar);
  crossGroup.position.y = 0.92;
  group.add(crossGroup);

  // Subtle healing glow aura
  const glowGeo = new THREE.SphereGeometry(0.48, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.15,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.45;
  group.add(glow);

  return group;
}

// ===== GOLDEN KEY =====
export function createKey() {
  const group = new THREE.Group();

  const keyMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    shininess: 120,
    specular: 0xfef08a,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
  });

  // Handle (ring)
  const ringGeo = new THREE.TorusGeometry(0.18, 0.04, 6, 12);
  const ring = new THREE.Mesh(ringGeo, keyMat);
  ring.position.y = 0.55;
  group.add(ring);

  // Stem (shaft)
  const shaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6);
  const shaft = new THREE.Mesh(shaftGeo, keyMat);
  shaft.position.y = 0.25;
  group.add(shaft);

  // Teeth (bits)
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), keyMat);
  bit1.position.set(0.06, 0.12, 0);
  group.add(bit1);

  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), keyMat);
  bit2.position.set(0.04, 0.22, 0);
  group.add(bit2);

  // Glow
  const glowGeo = new THREE.SphereGeometry(0.4, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.2,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.35;
  group.add(glow);

  return group;
}

// ===== HEAL PARTICLE EFFECT =====
export function createHealParticle(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.lifetime = 0.7;
  group.userData.particles = [];

  const mat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 1,
  });

  for (let i = 0; i < 6; i++) {
    const geo = new THREE.OctahedronGeometry(0.08, 0);
    const mesh = new THREE.Mesh(geo, mat.clone());
    const angle = (i / 6) * Math.PI * 2;
    const speed = 1.2 + Math.random() * 1.5;
    mesh.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      2.5 + Math.random() * 2.5,
      Math.sin(angle) * speed
    );
    group.add(mesh);
    group.userData.particles.push(mesh);
  }

  return group;
}
