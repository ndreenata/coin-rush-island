// ===== WORLD BUILDER - Tropical Island Environment =====
import * as THREE from 'three';

// ===== LIVING ENVIRONMENT ANIMATION REGISTRY =====
export const animatedTreeCrowns = [];
export const animatedBushes = [];
export const animatedFlowers = [];
let activeWaterfallMesh = null;
let activeWaterfallMist = null;
let activeFireflies = null;
let sceneRef = null;
let waterMeshRef = null;

// ===== ISLAND DIMENSIONS & GEOGRAPHY (4-6x EXPANDED OPEN WORLD) =====
export const ISLAND_RADIUS = 75; // Expanded from 33 (~5.2x total explorable area)

// ===== RIVER & BRIDGE HELPERS (ACROSS 10 ZONES) =====
export function getRiverCenterZ(x) {
  // Graceful S-curve traversing from West to East across the island
  return 8.5 + 0.18 * x - 0.0025 * x * x + 1.2 * Math.sin(x * 0.14);
}

export const RIVER_HALF_WIDTH = 2.4;

export function isPlayerInRiver(x, z) {
  if (Math.abs(x) > 68) return false;
  const centerZ = getRiverCenterZ(x);
  return Math.abs(z - centerZ) < RIVER_HALF_WIDTH;
}

export function isPlayerOnBridge(x, z) {
  // Bridge 1 (West Jungle Bridge): centered at x = -35.0
  const b1CenterZ = getRiverCenterZ(-35.0);
  if (Math.abs(x - (-35.0)) <= 2.0 && Math.abs(z - b1CenterZ) <= 3.8) {
    return true;
  }

  // Bridge 2 (Central West Bridge): centered at x = -6.5
  const b2CenterZ = getRiverCenterZ(-6.5);
  if (Math.abs(x - (-6.5)) <= 2.0 && Math.abs(z - b2CenterZ) <= 3.8) {
    return true;
  }

  // Bridge 3 (Central East Bridge): centered at x = 15.0
  const b3CenterZ = getRiverCenterZ(15.0);
  if (Math.abs(x - 15.0) <= 2.0 && Math.abs(z - b3CenterZ) <= 3.8) {
    return true;
  }

  // Bridge 4 (East Ruins Bridge): centered at x = 48.0
  const b4CenterZ = getRiverCenterZ(48.0);
  if (Math.abs(x - 48.0) <= 2.0 && Math.abs(z - b4CenterZ) <= 3.8) {
    return true;
  }

  // Stepping Stones 1 (x = -22.0)
  const s1Z = getRiverCenterZ(-22.0);
  if (Math.abs(x - (-22.0)) <= 1.4 && Math.abs(z - s1Z) <= 2.8) {
    return true;
  }

  // Stepping Stones 2 (x = 32.0)
  const s2Z = getRiverCenterZ(32.0);
  if (Math.abs(x - 32.0) <= 1.4 && Math.abs(z - s2Z) <= 2.8) {
    return true;
  }

  return false;
}

// ===== TERRAIN ELEVATION & GROUND HEIGHT (10 ZONES) =====
export function getTerrainHeight(x, z) {
  const dist = Math.hypot(x, z);
  if (dist > 76) return -0.35; // Ocean floor beyond shoreline

  let height = 0;

  // Zone 1: Starting Beach & Coastal Dunes (Smooth Hermite ramp from z=26 to z=46)
  if (z > 26 && dist < 74) {
    const zT = THREE.MathUtils.clamp((z - 26) / 18.0, 0, 1);
    const zSmooth = zT * zT * (3 - 2 * zT); // Continuous C1 smoothstep
    const beachFactor = THREE.MathUtils.clamp((73 - dist) / 32.0, 0, 1);
    height += zSmooth * beachFactor * 0.75;
  }

  // Zone 2: Tropical Jungle (Southwest knolls around x: -35, z: 30)
  const dJungle = Math.hypot(x - (-35), z - 30);
  if (dJungle < 22.0) {
    const factor = 0.5 * (1 + Math.cos((dJungle / 22.0) * Math.PI));
    height += 1.8 * factor;
  }

  // Zone 4: Rocky Highlands (Northeast peaks around x: 45, z: -35)
  const dHighlands = Math.hypot(x - 45, z - (-35));
  if (dHighlands < 24.0) {
    const factor = 0.5 * (1 + Math.cos((dHighlands / 24.0) * Math.PI));
    height += 4.2 * factor;
  }

  // East Plateau legacy hill (around x: 18, z: -14)
  const dEast = Math.hypot(x - 18, z - (-14));
  if (dEast < 12.0) {
    const factor = 0.5 * (1 + Math.cos((dEast / 12.0) * Math.PI));
    height += 1.2 * factor;
  }

  // Zone 5: Ancient Ruins Courtyard (Southeast terrace around x: 45, z: 25)
  const dRuins = Math.hypot(x - 45, z - 25);
  if (dRuins < 18.0) {
    const factor = 0.5 * (1 + Math.cos((dRuins / 18.0) * Math.PI));
    height += 1.8 * factor;
  }

  // Zone 6: Secret Cave Network (Northwest ridges around x: -48, z: -35)
  const dCave = Math.hypot(x - (-48), z - (-35));
  if (dCave < 20.0) {
    const factor = 0.5 * (1 + Math.cos((dCave / 20.0) * Math.PI));
    height += 2.4 * factor;
  }

  // Southwest Highlands legacy hill (around x: -18, z: -12)
  const dWest = Math.hypot(x - (-18), z - (-12));
  if (dWest < 10.0) {
    const factor = 0.5 * (1 + Math.cos((dWest / 10.0) * Math.PI));
    height += 1.0 * factor;
  }

  // Zone 8: Offshore Treasure Island (Far Southwest Islet around x: -60, z: 55)
  const dOffshore = Math.hypot(x - (-60), z - 55);
  if (dOffshore < 15.0) {
    const factor = 0.5 * (1 + Math.cos((dOffshore / 15.0) * Math.PI));
    height += 2.2 * factor;
  }

  // Zone 10: Final Temple Plateau (North Mountain Terrace around x: 5, z: -55)
  const dTemple = Math.hypot(x - 5, z - (-55));
  if (dTemple < 22.0) {
    const factor = 0.5 * (1 + Math.cos((dTemple / 22.0) * Math.PI));
    height += 3.8 * factor;
  }

  // Smoothly level the central spawn clearing around (0, 0)
  if (dist < 7.0) {
    const centerT = THREE.MathUtils.clamp(dist / 7.0, 0, 1);
    const centerSmooth = centerT * centerT * (3 - 2 * centerT);
    height *= centerSmooth;
  }

  // Smooth coastal taper towards outer shoreline (dist 62 to 74)
  if (dist > 62) {
    const coastalBlend = THREE.MathUtils.clamp((74 - dist) / 12.0, 0, 1);
    height *= coastalBlend;
  }

  // River channel & banks: carved smoothly into terrain with sloped banks (no vertical cliff walls)
  if (Math.abs(x) <= 68) {
    const rz = getRiverCenterZ(x);
    const riverDist = Math.abs(z - rz);
    if (riverDist < 2.2) {
      height = -0.15;
    } else if (riverDist < 4.2) {
      const bankT = (riverDist - 2.2) / 2.0;
      const smoothBank = bankT * bankT * (3 - 2 * bankT);
      height = THREE.MathUtils.lerp(-0.15, height, smoothBank);
    }
  }

  return height;
}

export function getGroundHeight(x, z) {
  if (isPlayerOnBridge(x, z)) {
    return 0.35;
  }
  if (isPlayerInRiver(x, z)) {
    return -0.15;
  }

  // Temple Entrance Stairs & Sanctuary Terrace Grounding (x: 5, z: -55)
  const templeBaseY = getTerrainHeight(5, -55);
  // Central altar plinth
  if (Math.abs(x - 5) <= 1.3 && Math.abs(z - (-55)) <= 1.3) {
    return templeBaseY + 1.15;
  }
  // Sanctuary upper terrace
  if (Math.abs(x - 5) <= 4.3 && Math.abs(z - (-55)) <= 4.3) {
    return templeBaseY + 0.675;
  }
  // Grand entrance staircase leading from south into temple (z from -47.2 to -52.4)
  // Seamlessly transitions from natural mountain terrain elevation up to sanctuary terrace
  if (Math.abs(x - 5) <= 2.1 && z >= -52.4 && z <= -47.2) {
    const stairProgress = (-47.2 - z) / 5.2; // 0 at z=-47.2, 1 at z=-52.4
    const clampedProgress = THREE.MathUtils.clamp(stairProgress, 0, 1);
    const naturalY = getTerrainHeight(x, z);
    const targetY = THREE.MathUtils.lerp(naturalY, templeBaseY + 0.675, clampedProgress);
    return Math.max(naturalY, targetY);
  }

  // Tropical Village Stilt Huts Grounding (Walkable verandas and entrance ramps)
  // Hut 1: Elder Lodge at (-20, 26)
  const hut1BaseY = getTerrainHeight(-20, 26) + 0.95;
  if (Math.abs(x - (-20)) <= 2.4 && Math.abs(z - 26) <= 2.1) {
    return hut1BaseY;
  }
  if (Math.abs(x - (-20)) <= 0.85 && z >= 28.1 && z <= 30.2) {
    const rampT = (30.2 - z) / 2.1;
    return THREE.MathUtils.lerp(getTerrainHeight(x, z), hut1BaseY, Math.min(1.0, Math.max(0.0, rampT)));
  }

  // Hut 2: Fisher's Hut at (-12, 34)
  const hut2BaseY = getTerrainHeight(-12, 34) + 0.95;
  if (Math.abs(x - (-12)) <= 2.2 && Math.abs(z - 34) <= 1.9) {
    return hut2BaseY;
  }
  if (Math.abs(x - (-12)) <= 0.85 && z >= 35.9 && z <= 38.0) {
    const rampT = (38.0 - z) / 2.1;
    return THREE.MathUtils.lerp(getTerrainHeight(x, z), hut2BaseY, Math.min(1.0, Math.max(0.0, rampT)));
  }

  // Hut 3: Outpost Hut at (-24, 36)
  const hut3BaseY = getTerrainHeight(-24, 36) + 0.95;
  if (Math.abs(x - (-24)) <= 2.2 && Math.abs(z - 36) <= 1.9) {
    return hut3BaseY;
  }
  if (Math.abs(x - (-24)) <= 0.85 && z >= 37.9 && z <= 40.0) {
    const rampT = (40.0 - z) / 2.1;
    return THREE.MathUtils.lerp(getTerrainHeight(x, z), hut3BaseY, Math.min(1.0, Math.max(0.0, rampT)));
  }

  return getTerrainHeight(x, z);
}

// ===== 10 DISTINCT ISLAND LANDMARKS =====
export const LANDMARKS = [
  { id: 'starting_beach', name: 'Pantai Awal', x: 0, z: 54, color: '#f59e0b', symbol: 'beach' },
  { id: 'tropical_jungle', name: 'Hutan Tropis', x: -35, z: 30, color: '#16a34a', symbol: 'tree' },
  { id: 'crocodile_river', name: 'Sungai Buaya', x: 0, z: 8, color: '#06b6d4', symbol: 'bridge' },
  { id: 'rocky_highlands', name: 'Dataran Tinggi Berbatu', x: 45, z: -35, color: '#9333ea', symbol: 'mountain' },
  { id: 'ancient_ruins', name: 'Reruntuhan Kuno', x: 45, z: 25, color: '#d97706', symbol: 'ruins' },
  { id: 'secret_cave', name: 'Jaringan Gua Rahasia', x: -48, z: -35, color: '#6366f1', symbol: 'cave' },
  { id: 'treasure_valley', name: 'Lembah Harta Karun', x: 0, z: 0, color: '#eab308', symbol: 'star' },
  { id: 'offshore_island', name: 'Pulau Harta Karun Lepas Pantai', x: -60, z: 55, color: '#14b8a6', symbol: 'island' },
  { id: 'hidden_jungle', name: 'Hutan Belantara Rahasia', x: -40, z: 0, color: '#15803d', symbol: 'forest' },
  { id: 'final_temple', name: 'Kuil Kuno Tertinggi', x: 5, z: -55, color: '#e11d48', symbol: 'temple' },
  { id: 'tropical_village', name: 'Desa Pesisir Tropis', x: -18, z: 30, color: '#f59e0b', symbol: 'village' },

  // Backwards-compatible anchors for legacy tests
  { id: 'ancient_tree', name: 'Pohon Raksasa Kuno', x: -8, z: -14, color: '#16a34a', symbol: 'tree' },
  { id: 'mystic_stones', name: 'Formasi Batu Mistik', x: 18, z: -15, color: '#9333ea', symbol: 'stone' },
  { id: 'golden_altar', name: 'Altar Emas Kuno', x: 22, z: 18, color: '#f59e0b', symbol: 'altar' },
  { id: 'secret_grotto', name: 'Gua Rahasia', x: -22, z: 16, color: '#06b6d4', symbol: 'cave' },
  { id: 'bridge_west', name: 'Jembatan Barat', x: -6.5, z: 6.8, color: '#ea580c', symbol: 'bridge' },
  { id: 'bridge_east', name: 'Jembatan Timur', x: 15.0, z: 11.2, color: '#ea580c', symbol: 'bridge' },
];

export function createWorld(scene) {
  const colliders = [];
  const coinPositions = [];
  const chestPositions = [];

  // ===== SKY & FOG =====
  scene.background = new THREE.Color('#87CEEB');
  scene.fog = new THREE.Fog('#87CEEB', 50, 120);

  // ===== LIGHTING =====
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.58);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0x4ade80, 0.42);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.10);
  sun.position.set(45, 65, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -85;
  sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 85;
  sun.shadow.camera.bottom = -85;
  // Positive shadow bias + normal bias completely eliminates shadow acne striping artifacts
  sun.shadow.bias = 0.0001;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  // ===== OCEAN (Expansive Turquoise Sea) =====
  const oceanGeo = new THREE.PlaneGeometry(600, 600);
  const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x0ea5e9, // Vibrant tropical azure
    transparent: true,
    opacity: 0.88,
    shininess: 95,
    specular: 0x38bdf8,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.05;
  ocean.receiveShadow = true;
  scene.add(ocean);

  // ===== ISLAND BASE & BEACH CLIFFS (Underwater Coral Sea-Bed Shelf) =====
  // Base cylinder is placed submerged so top is at y = -1.2, never protruding above water
  const islandBaseGeo = new THREE.CylinderGeometry(78, 86, 6.0, 64);
  const islandBaseMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const islandBase = new THREE.Mesh(islandBaseGeo, islandBaseMat);
  islandBase.position.y = -4.2;
  islandBase.receiveShadow = true;
  scene.add(islandBase);

  // ===== SCULPTED ISLAND TERRAIN (10 Interconnected Zones with Natural Contours) =====
  const terrainGeo = new THREE.PlaneGeometry(164, 164, 128, 128);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const tColors = new Float32Array(tPos.count * 3);

  const colGrass = new THREE.Color(0x38a169); // Curated tropical emerald
  const colHill = new THREE.Color(0x2f855a);  // Lush forest hills
  const colHighland = new THREE.Color(0x71717a); // Weathered mountain stone
  const colSand = new THREE.Color(0xdeb887);
  const colShore = new THREE.Color(0x2dd4bf);

  for (let i = 0; i < tPos.count; i++) {
    const px = tPos.getX(i);
    const pz = tPos.getZ(i);
    const dist = Math.hypot(px, pz);

    if (dist > 75.0) {
      tPos.setY(i, -1.4); // Submerged ocean floor beyond shoreline
      tColors[i * 3] = colShore.r;
      tColors[i * 3 + 1] = colShore.g;
      tColors[i * 3 + 2] = colShore.b;
    } else {
      let h = getTerrainHeight(px, pz);

      // Smooth coastal slope into water between dist 62 and 75
      if (dist > 62.0) {
        const factor = (dist - 62.0) / 13.0; // 0 at 62, 1 at 75
        h = THREE.MathUtils.lerp(h, -1.4, Math.min(1.0, factor * 1.3));
      }
      tPos.setY(i, h);

      // Check river channel for natural sandbar and waterbed shading
      let inRiverChannel = false;
      if (Math.abs(px) <= 68) {
        const rz = getRiverCenterZ(px);
        const riverDist = Math.abs(pz - rz);
        if (riverDist < 2.4) {
          inRiverChannel = true;
          // Submerged river bottom under azure water
          tColors[i * 3] = colShore.r;
          tColors[i * 3 + 1] = colShore.g;
          tColors[i * 3 + 2] = colShore.b;
        } else if (riverDist < 4.2) {
          inRiverChannel = true;
          // Warm sandy riverbank
          tColors[i * 3] = colSand.r;
          tColors[i * 3 + 1] = colSand.g;
          tColors[i * 3 + 2] = colSand.b;
        }
      }

      if (!inRiverChannel) {
        if (dist > 68.0 || h < -0.05) {
          // Submerged sandbar / turquoise shoreline
          tColors[i * 3] = colShore.r;
          tColors[i * 3 + 1] = colShore.g;
          tColors[i * 3 + 2] = colShore.b;
        } else if (dist > 58.0 || (h >= -0.05 && h < 0.42)) {
          // Warm golden sandy beach
          tColors[i * 3] = colSand.r;
          tColors[i * 3 + 1] = colSand.g;
          tColors[i * 3 + 2] = colSand.b;
        } else if (h > 2.6) {
          // High rocky crags & mountain peaks
          tColors[i * 3] = colHighland.r;
          tColors[i * 3 + 1] = colHighland.g;
          tColors[i * 3 + 2] = colHighland.b;
        } else if (h > 0.9) {
          // Rolling hill elevation
          tColors[i * 3] = colHill.r;
          tColors[i * 3 + 1] = colHill.g;
          tColors[i * 3 + 2] = colHill.b;
        } else {
          // Lush lowland grass
          tColors[i * 3] = colGrass.r;
          tColors[i * 3 + 1] = colGrass.g;
          tColors[i * 3 + 2] = colGrass.b;
        }
      }
    }
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // ===== WINDING TURQUOISE RIVER & RIVERBANKS =====
  const { waterMesh } = createRiver(scene);

  // ===== 4 WOODEN BRIDGES (Safe Crossings connecting All 10 Zones) =====
  // Bridge 1 (West Jungle Bridge): centered at x = -35.0
  const b1CenterZ = getRiverCenterZ(-35.0);
  const bridge1 = createWoodenBridge(7.2, 3.4);
  bridge1.position.set(-35.0, 0, b1CenterZ);
  scene.add(bridge1);
  colliders.push({ x: -36.7, z: b1CenterZ, radius: 0.25 });
  colliders.push({ x: -33.3, z: b1CenterZ, radius: 0.25 });

  // Bridge 2 (Central West Bridge): centered at x = -6.5
  const b2CenterZ = getRiverCenterZ(-6.5);
  const bridge2 = createWoodenBridge(6.8, 3.2);
  bridge2.position.set(-6.5, 0, b2CenterZ);
  scene.add(bridge2);
  colliders.push({ x: -8.1, z: b2CenterZ, radius: 0.25 });
  colliders.push({ x: -4.9, z: b2CenterZ, radius: 0.25 });

  // Bridge 3 (Central East Bridge): centered at x = 15.0
  const b3CenterZ = getRiverCenterZ(15.0);
  const bridge3 = createWoodenBridge(6.8, 3.2);
  bridge3.position.set(15.0, 0, b3CenterZ);
  scene.add(bridge3);
  colliders.push({ x: 13.4, z: b3CenterZ, radius: 0.25 });
  colliders.push({ x: 16.6, z: b3CenterZ, radius: 0.25 });

  // Bridge 4 (East Highlands / Ruins Bridge): centered at x = 48.0
  const b4CenterZ = getRiverCenterZ(48.0);
  const bridge4 = createWoodenBridge(7.2, 3.4);
  bridge4.position.set(48.0, 0, b4CenterZ);
  scene.add(bridge4);
  colliders.push({ x: 46.3, z: b4CenterZ, radius: 0.25 });
  colliders.push({ x: 49.7, z: b4CenterZ, radius: 0.25 });

  // ===== 2 STEPPING STONE RIVER CROSSINGS =====
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
  [-22.0, 32.0].forEach(sx => {
    const sZ = getRiverCenterZ(sx);
    [-1.2, 0, 1.2].forEach(offsetZ => {
      const stoneGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.45, 8);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(sx + (Math.random() - 0.5) * 0.3, 0.2, sZ + offsetZ);
      stone.castShadow = true;
      stone.receiveShadow = true;
      scene.add(stone);
    });
  });

  // ===== PALM TREES (Slender Trunk Colliders: radius = 0.25) =====
  const treePositions = [
    // Legacy central trees
    { x: 8, z: 5 }, { x: -10, z: 8 }, { x: 15, z: -10 },
    { x: -7, z: -15 }, { x: 22, z: 16 }, { x: -18, z: -5 },
    { x: 5, z: -20 }, { x: -15, z: 15 }, { x: 25, z: -3 },
    { x: -5, z: 22 }, { x: 12, z: 18 },
    // Expanded Zone 1: Starting Beach & Dunes
    { x: -28, z: 52 }, { x: -12, z: 56 }, { x: 14, z: 54 }, { x: 30, z: 50 },
    // Expanded Zone 2: Tropical Jungle
    { x: -44, z: 32 }, { x: -32, z: 38 }, { x: -26, z: 26 }, { x: -48, z: 22 },
    // Expanded Zone 4 & 5: Highlands & Ruins
    { x: 36, z: -25 }, { x: 52, z: -18 }, { x: 38, z: 28 }, { x: 55, z: 18 },
    // Expanded Zone 8: Offshore Island
    { x: -58, z: 52 }, { x: -64, z: 58 },
    // Expanded Zone 9: Hidden Jungle
    { x: -42, z: -8 }, { x: -34, z: -4 },
  ];

  treePositions.forEach(pos => {
    const tree = createPalmTree();
    const ty = getTerrainHeight(pos.x, pos.z);
    tree.position.set(pos.x, ty, pos.z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    // Slender trunk collider (radius 0.25m) allows natural, close approach
    colliders.push({ x: pos.x, z: pos.z, radius: 0.25 });
  });

  // ===== ROCKS & BOULDERS (Physical Colliders with Jump-Over Clearance) =====
  const rockPositions = [
    // Legacy central rocks
    { x: 4, z: -8, s: 1.5 }, { x: -12, z: -3, s: 1.2 }, { x: 18, z: 5, s: 1.8 },
    { x: -6, z: 12, s: 1.0 }, { x: 10, z: -18, s: 2.0 }, { x: -20, z: 10, s: 1.4 },
    { x: 22, z: -8, s: 1.1 }, { x: -3, z: -22, s: 1.6 }, { x: 14, z: 14, s: 0.9 },
    { x: -16, z: -12, s: 1.3 }, { x: 7, z: 16, s: 1.0 }, { x: -22, z: -1, s: 1.7 },
    { x: 0, z: 25, s: 1.5 }, { x: 26, z: 0, s: 1.2 },
    // Expanded zones rocks
    { x: -38, z: 45, s: 1.2 }, { x: 28, z: 42, s: 1.4 },
    { x: 48, z: -38, s: 2.2 }, { x: 55, z: -28, s: 1.8 },
    { x: -52, z: -42, s: 2.4 }, { x: -42, z: -30, s: 1.6 },
    { x: 12, z: -48, s: 2.0 }, { x: -8, z: -52, s: 2.2 },
  ];

  rockPositions.forEach(rp => {
    const rock = createRock(rp.s);
    const ry = getTerrainHeight(rp.x, rp.z);
    rock.position.set(rp.x, ry + rp.s * 0.3, rp.z);
    rock.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
    scene.add(rock);
    // Collider matches physical base; includes height for jump clearing
    colliders.push({
      x: rp.x,
      z: rp.z,
      radius: rp.s * 0.45,
      height: rp.s * 0.6,
    });
  });

  // ===== BUSHES & FOLIAGE (ZERO COLLIDERS - Non-Obstructing Decorative Flora) =====
  const bushPositions = [
    { x: 6, z: 10, s: 0.8 }, { x: -8, z: -10, s: 0.6 }, { x: 16, z: -5, s: 0.7 },
    { x: -14, z: 5, s: 0.9 }, { x: 3, z: -14, s: 0.5 }, { x: -10, z: 18, s: 0.8 },
    { x: 20, z: 8, s: 0.6 }, { x: -18, z: -10, s: 0.7 }, { x: 10, z: 22, s: 0.5 },
    { x: -4, z: 8, s: 0.4 }, { x: -30, z: 34, s: 0.8 }, { x: 32, z: 20, s: 0.7 },
  ];

  bushPositions.forEach(bp => {
    const bush = createBush(bp.s);
    const by = getTerrainHeight(bp.x, bp.z);
    bush.position.set(bp.x, by + bp.s * 0.4, bp.z);
    scene.add(bush);
    // Zero colliders on bushes as per Priority 1!
  });

  // ===== LOGS & DRIFTWOOD =====
  const logData = [
    { x: 12, z: 2, rot: 0.5, len: 3 },
    { x: -5, z: -6, rot: 1.2, len: 2.5 },
    { x: -15, z: -8, rot: 2.0, len: 3.5 },
    { x: 8, z: -12, rot: 0.8, len: 2.0 },
    { x: -8, z: 58, rot: 0.3, len: 4.0 }, // Beach driftwood
  ];

  logData.forEach(ld => {
    const log = createLog(ld.len);
    const ly = getTerrainHeight(ld.x, ld.z);
    log.position.set(ld.x, ly + 0.2, ld.z);
    log.rotation.y = ld.rot;
    scene.add(log);
    colliders.push({ x: ld.x, z: ld.z, radius: 0.35, height: 0.45 });
  });

  // ===== 10 ZONE LANDMARKS & STRUCTURES =====
  // 1. Ancient Grand Tree (-8, -14)
  const ancientTree = createAncientTree();
  ancientTree.position.set(-8, getTerrainHeight(-8, -14), -14);
  scene.add(ancientTree);
  colliders.push({ x: -8, z: -14, radius: 1.2 }); // Trunk collider

  // 2. Mystic Monoliths (18, -15) - Open central dais, colliders only on outer standing stones
  const mysticStones = createMysticStones();
  mysticStones.position.set(18, getTerrainHeight(18, -15), -15);
  scene.add(mysticStones);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    colliders.push({ x: 18 + Math.cos(a) * 4.0, z: -15 + Math.sin(a) * 4.0, radius: 0.45 });
  }

  // 3. Ancient Golden Shrine / Altar (22, 18) - Compact plinth collider allows chest access!
  const goldenAltar = createGoldenAltar();
  goldenAltar.position.set(22, getTerrainHeight(22, 18), 18);
  scene.add(goldenAltar);
  colliders.push({ x: 22, z: 18, radius: 0.8 }); // Plinth collider

  // 4. Secret Grotto Rock Arch (-22, 16) - Two side pillars leave 3.6m open doorway
  const secretGrotto = createSecretGrotto();
  secretGrotto.position.set(-22, getTerrainHeight(-22, 16), 16);
  scene.add(secretGrotto);
  colliders.push({ x: -24.2, z: 16, radius: 0.8 });
  colliders.push({ x: -19.8, z: 16, radius: 0.8 });

  // 5. Zone 1: Starting Beach Rowboats (0, 56)
  const boatMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
  const boatGeo = new THREE.BoxGeometry(1.6, 0.7, 4.2);
  const boat1 = new THREE.Mesh(boatGeo, boatMat);
  boat1.position.set(12, getTerrainHeight(12, 58) + 0.35, 58);
  boat1.rotation.y = 0.4;
  scene.add(boat1);
  colliders.push({ x: 12, z: 58, radius: 0.85, height: 0.8 });

  // 6. Zone 10: Final Temple Monument (5, -55)
  const templeGroup = createFinalTemple();
  templeGroup.position.set(5, getTerrainHeight(5, -55), -55);
  scene.add(templeGroup);
  // Temple Column colliders (6 perimeter columns radius 0.35m, central dais and altar accessible!)
  const templeCols = [
    { x: 5 - 3.2, z: -55 - 3.2 }, { x: 5 + 3.2, z: -55 - 3.2 },
    { x: 5 - 3.2, z: -55 + 3.2 }, { x: 5 + 3.2, z: -55 + 3.2 },
    { x: 5 - 1.6, z: -55 + 1.8 }, { x: 5 + 1.6, z: -55 + 1.8 },
  ];
  templeCols.forEach(tc => {
    colliders.push({ x: tc.x, z: tc.z, radius: 0.35, height: 3.4 });
  });
  colliders.push({ x: 5 - 1.9, z: -55 + 3.8, radius: 0.30, height: 1.0 });
  colliders.push({ x: 5 + 1.9, z: -55 + 3.8, radius: 0.30, height: 1.0 });

  // 7. Tropical Coastal Village (3 Stilt Huts, Well, Footpaths, Crates)
  createTropicalVillage(scene, colliders);

  // ===== GENERATE ROUND COLLECTIBLES (80 Coins, 14 Chests, 10 Potions across 10 Zones) =====
  const roundData = generateRoundCollectibles(12345, colliders);
  coinPositions.push(...roundData.coins);
  chestPositions.push(...roundData.chests);

  // ===== DECORATIVE FLOWERS (Non-Obstructing with Gentle Wind Sway) =====
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 58;
    const fx = Math.cos(angle) * r;
    const fz = Math.sin(angle) * r;

    if (Math.hypot(fx, fz) < 68 && !isPlayerInRiver(fx, fz)) {
      const flowerGeo = new THREE.SphereGeometry(0.15, 6, 4);
      const colors = [0xff6b6b, 0xffd93d, 0xff8fd8, 0xffffff, 0x8b5cf6];
      const flowerMat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(fx, getTerrainHeight(fx, fz) + 0.15, fz);
      scene.add(flower);
      animatedFlowers.push({
        mesh: flower,
        baseRotZ: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 2.0 + Math.random() * 0.8,
        amp: 0.05,
      });
    }
  }

  // ===== MAJESTIC HIGHLAND WATERFALL & PLUNGE POOL =====
  createWaterfall(scene, colliders);

  // ===== BIOLUMINESCENT FIREFLIES (Jungle & Grotto) =====
  createFireflies(scene);

  sceneRef = scene;
  waterMeshRef = waterMesh;

  return {
    colliders,
    coinPositions,
    chestPositions,
    waterMesh,
    potionPositions: roundData.potions,
    keyPosition: roundData.key,
    spawnPoints: roundData.spawnPoints,
  };
}

// ===== CONTROLLED PRNG & ROUND COLLECTIBLES GENERATOR =====
export function createPRNG(seed = 12345) {
  let s = Math.abs(seed) % 2147483647;
  if (s === 0) s = 1;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateRoundCollectibles(seed = 12345, colliders = []) {
  const rng = createPRNG(seed);
  const coins = [];
  const TOTAL_COINS = 80;

  // 12 Safe Spawn Points along Starting Beach Dunes (Z: 50 to 66, X: -30 to 30)
  const spawnPoints = [
    { x: 0, z: 54 },
    { x: -10, z: 56 },
    { x: 10, z: 56 },
    { x: -20, z: 58 },
    { x: 20, z: 58 },
    { x: -28, z: 54 },
    { x: 28, z: 54 },
    { x: -5, z: 62 },
    { x: 5, z: 62 },
    { x: -15, z: 64 },
    { x: 15, z: 64 },
    { x: 0, z: 66 },
  ].map(sp => ({
    ...sp,
    y: getTerrainHeight(sp.x, sp.z),
  }));

  // Generate 80 coins distributed across the 10 zones of the expanded island
  let attempts = 0;
  while (coins.length < TOTAL_COINS && attempts < 3500) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const r = 4.0 + rng() * 64.0;
    const cx = Math.cos(angle) * r;
    const cz = Math.sin(angle) * r;

    if (!isPlayerInRiver(cx, cz) && Math.hypot(cx, cz) < 70) {
      let valid = true;
      for (const col of colliders) {
        if (Math.hypot(cx - col.x, cz - col.z) < (col.radius || 0.5) + 1.1) {
          valid = false;
          break;
        }
      }
      if (valid) {
        for (const ec of coins) {
          if (Math.hypot(cx - ec.x, cz - ec.z) < 1.8) {
            valid = false;
            break;
          }
        }
      }
      if (valid) {
        coins.push({
          x: cx,
          y: getTerrainHeight(cx, cz) + 0.85,
          z: cz,
        });
      }
    }
  }

  // 14 Treasure Chests distributed evenly across the 10 zones
  const chestDefinitions = [
    // Legacy central chests (5 wooden + 1 golden)
    { x: -20, z: 25.5, points: 50, isGold: false, isLocked: false, zone: 'tropical_village', plinthOffset: 0.95 },
    { x: 8, z: 22, points: 50, isGold: false, isLocked: false, zone: 'treasure_valley' },
    { x: 15, z: -8, points: 50, isGold: false, isLocked: false, zone: 'rocky_highlands' },
    { x: -10, z: -20, points: 50, isGold: false, isLocked: false, zone: 'hidden_jungle' },
    { x: 25, z: 4, points: 50, isGold: false, isLocked: false, zone: 'ancient_ruins' },
    { x: 22, z: 18, points: 100, isGold: true, isLocked: true, zone: 'golden_altar', plinthOffset: 1.2 },

    // 8 New chests in expanded zones
    { x: 0, z: 58, points: 50, isGold: false, isLocked: false, zone: 'starting_beach' },
    { x: -36, z: 32, points: 50, isGold: false, isLocked: false, zone: 'tropical_jungle' },
    { x: 46, z: -34, points: 75, isGold: false, isLocked: false, zone: 'rocky_highlands' },
    { x: 48, z: 26, points: 75, isGold: false, isLocked: false, zone: 'ancient_ruins' },
    { x: -46, z: -36, points: 50, isGold: false, isLocked: false, zone: 'secret_cave' },
    { x: -60, z: 56, points: 50, isGold: false, isLocked: false, zone: 'offshore_island' },
    { x: -38, z: -6, points: 50, isGold: false, isLocked: false, zone: 'hidden_jungle' },
    { x: 5, z: -55, points: 100, isGold: true, isLocked: true, zone: 'final_temple', plinthOffset: 1.15 },
  ];

  const chests = chestDefinitions.map(c => ({
    x: c.x,
    y: getTerrainHeight(c.x, c.z) + (c.plinthOffset || 0),
    z: c.z,
    points: c.points,
    isGold: c.isGold,
    isLocked: c.isLocked,
    zone: c.zone,
  }));

  // 10 Individual Health Potions (+30 HP each, distributed across all 10 zones)
  const potionDefinitions = [
    { x: -15, z: -8, heal: 30 }, // Legacy 1
    { x: 12, z: 16, heal: 30 },  // Legacy 2
    { x: -6, z: 24, heal: 30 },  // Legacy 3
    { x: 2, z: 52, heal: 30 },   // Starting Beach
    { x: -34, z: 28, heal: 30 }, // Tropical Jungle
    { x: -8, z: 6, heal: 30 },   // River Bank
    { x: 42, z: -30, heal: 30 }, // Rocky Highlands
    { x: 42, z: 22, heal: 30 },  // Ancient Ruins
    { x: -46, z: -32, heal: 30 },// Secret Cave
    { x: 3, z: -50, heal: 30 },  // Final Temple Steps
  ];

  const potions = potionDefinitions.map((p, idx) => ({
    index: idx,
    x: p.x,
    y: getTerrainHeight(p.x, p.z) + 0.45,
    z: p.z,
    heal: p.heal,
  }));

  // 2 Keys for locked chests
  const key = {
    x: -22,
    y: getTerrainHeight(-22, 16) + 0.45,
    z: 16,
  };

  return { coins, chests, potions, key, spawnPoints };
}

// ===== PROCEDURAL RIVER WATER TEXTURE =====
function createRiverWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base turquoise gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(0.5, '#0891b2');
  grad.addColorStop(1, '#0e7490');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Soft diagonal water streaks & caustics
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 28; i++) {
    const y = (i / 28) * 256;
    ctx.beginPath();
    ctx.ellipse(32 + (i * 23) % 192, y, 45 + (i % 6) * 8, 5 + (i % 3) * 3, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Secondary subtle foam flecks
  ctx.fillStyle = 'rgba(207, 250, 254, 0.22)';
  for (let i = 0; i < 40; i++) {
    const rx = (i * 37) % 256;
    const ry = (i * 59) % 256;
    ctx.beginPath();
    ctx.arc(rx, ry, 2 + (i % 3) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 2);
  return texture;
}

// ===== RIVER CHANNEL CREATION (Expanded across Island from X: -65 to +65) =====
function createRiver(scene) {
  const riverGroup = new THREE.Group();
  const waterTexture = createRiverWaterTexture();

  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x06b6d4,
    map: waterTexture,
    specular: 0xcffafe,
    shininess: 110,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  const segments = 160;
  const widthSegments = 16;
  const waterWidth = 4.4;

  const waterGeo = new THREE.PlaneGeometry(1, 1, segments, widthSegments);
  const wPos = waterGeo.attributes.position;
  const count = wPos.count;

  const baseCoords = new Float32Array(count * 3);
  const uCoords = new Float32Array(count);
  const vCoords = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const u = wPos.getX(i) + 0.5; // 0 to 1
    const v = wPos.getY(i);       // -0.5 to 0.5

    const x = -65 + u * 130;
    const centerZ = getRiverCenterZ(x);
    const z = centerZ + v * waterWidth;

    // Taper into ocean at mouth (x <= -56 or x >= 56)
    let baseY = 0.04;
    if (u < 0.08) {
      baseY = THREE.MathUtils.lerp(-0.05, 0.04, u / 0.08);
    } else if (u > 0.92) {
      baseY = THREE.MathUtils.lerp(-0.05, 0.04, (1.0 - u) / 0.08);
    }

    wPos.setXYZ(i, x, baseY, z);
    baseCoords[i * 3] = x;
    baseCoords[i * 3 + 1] = baseY;
    baseCoords[i * 3 + 2] = z;
    uCoords[i] = u;
    vCoords[i] = v;
  }
  waterGeo.computeVertexNormals();

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = true;
  waterMesh.userData = {
    baseCoords,
    uCoords,
    vCoords,
    count,
    waterWidth,
    frameCounter: 0,
  };
  riverGroup.add(waterMesh);

  // Riverbank decorative pebbles and gentle foam rings (no duplicate bankMesh plane!)
  const foamRings = [];
  const ringGeo = new THREE.RingGeometry(0.24, 0.44, 16);
  ringGeo.rotateX(-Math.PI / 2);

  for (let i = 0; i < 28; i++) {
    const x = -27 + (i / 28) * 54 + (Math.random() - 0.5) * 2;
    const centerZ = getRiverCenterZ(x);
    const side = (i % 2 === 0) ? -1 : 1;
    const z = centerZ + side * (waterWidth * 0.5 + 0.35 + Math.random() * 0.4);

    const pebbleGeo = new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.22, 0);
    const pebbleMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
    pebble.scale.set(1, 0.45, 1);
    pebble.position.set(x, 0.08, z);
    pebble.rotation.set(Math.random(), Math.random(), Math.random());
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    riverGroup.add(pebble);

    // Subtle foam ring around pebbles positioned near water edge
    if (Math.abs(z - centerZ) <= (waterWidth * 0.5 + 0.5)) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xcffafe,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, 0.045, z);
      ringMesh.userData = {
        phase: Math.random() * Math.PI * 2,
        baseScale: 0.85 + Math.random() * 0.3,
      };
      riverGroup.add(ringMesh);
      foamRings.push(ringMesh);
    }
  }

  // Floating animated river foam / water lily leaves drifting downstream
  const floatingFoam = [];
  const foamGeo = new THREE.CircleGeometry(0.22, 8);
  foamGeo.rotateX(-Math.PI / 2);
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  for (let i = 0; i < 16; i++) {
    const foam = new THREE.Mesh(foamGeo, foamMat);
    const fx = -50 + (i / 16) * 100;
    const fz = getRiverCenterZ(fx) + (Math.random() - 0.5) * 2.0;
    foam.position.set(fx, 0.048, fz);
    foam.userData = {
      speed: 1.2 + Math.random() * 0.8,
      offsetZ: (Math.random() - 0.5) * 1.8,
    };
    riverGroup.add(foam);
    floatingFoam.push(foam);
  }
  riverGroup.userData.floatingFoam = floatingFoam;

  riverGroup.userData.foamRings = foamRings;
  scene.add(riverGroup);

  return { riverGroup, waterMesh };
}

// ===== MULTI-LAYER CONTINUOUS RIVER WAVE ANIMATION =====
export function updateRiver(waterMesh, dt, elapsed) {
  if (!waterMesh || !waterMesh.geometry || !waterMesh.userData.baseCoords) return;

  const data = waterMesh.userData;
  const pos = waterMesh.geometry.attributes.position;
  const count = data.count;
  const uCoords = data.uCoords;
  const vCoords = data.vCoords;

  data.frameCounter = (data.frameCounter || 0) + 1;

  // Animate scrolling water texture downstream
  if (waterMesh.material && waterMesh.material.map) {
    waterMesh.material.map.offset.x -= dt * 0.07;
    waterMesh.material.map.offset.y += Math.sin(elapsed * 0.8) * 0.008 * dt;
  }

  // Multi-layered continuous wave displacement
  for (let i = 0; i < count; i++) {
    const u = uCoords[i];
    const v = vCoords[i];
    const baseY = data.baseCoords[i * 3 + 1];

    // Layer 1: Primary downstream current (flowing -X direction)
    const w1 = Math.sin(u * 16.0 - elapsed * 2.8 + v * 3.5) * 0.016;

    // Layer 2: Diagonal cross-current wave
    const w2 = Math.sin(u * 26.0 + v * 8.5 - elapsed * 1.6) * 0.009;

    // Layer 3: High-frequency surface ripples
    const w3 = Math.cos(u * 44.0 - v * 14.0 - elapsed * 4.2) * 0.006;

    // Smooth edge damping: waves cleanly taper off at riverbanks
    const edgeDamp = Math.max(0, 1.0 - Math.pow(Math.abs(v) * 2.0, 2.4));

    const totalY = baseY + (w1 + w2 + w3) * edgeDamp;
    pos.setY(i, totalY);
  }
  pos.needsUpdate = true;

  // Recompute normals every 2 frames for shimmering sunlight highlights
  if (data.frameCounter % 2 === 0) {
    waterMesh.geometry.computeVertexNormals();
  }

  // Animate riverbank foam rings
  const parent = waterMesh.parent;
  if (parent && parent.userData.foamRings) {
    parent.userData.foamRings.forEach(ring => {
      const t = elapsed * 2.2 + ring.userData.phase;
      const osc = Math.sin(t);
      ring.scale.setScalar(ring.userData.baseScale * (1.0 + osc * 0.15));
      ring.material.opacity = 0.22 + (osc + 1) * 0.12;
    });
  }

  // Animate floating foam drifting downstream with river current
  if (parent && parent.userData.floatingFoam) {
    parent.userData.floatingFoam.forEach(foam => {
      foam.position.x -= dt * foam.userData.speed;
      if (foam.position.x < -60) {
        foam.position.x = 60;
      }
      foam.position.z = getRiverCenterZ(foam.position.x) + foam.userData.offsetZ;
      foam.position.y = 0.048 + Math.sin(elapsed * 2.0 + foam.position.x) * 0.006;
    });
  }
}

// ===== LOCALIZED WATER RIPPLES & SPLASH PARTICLES =====
const activeWaterEffects = [];

export function createWaterRipple(scene, x, z, scale = 1.0) {
  const geo = new THREE.RingGeometry(0.15 * scale, 0.28 * scale, 18);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xcffafe,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.034, z);
  scene.add(mesh);

  activeWaterEffects.push({
    type: 'ripple',
    mesh,
    maxLife: 0.75,
    life: 0.75,
    scaleSpeed: 2.2,
  });
}

export function createWaterSplash(scene, x, z, count = 12) {
  const group = new THREE.Group();
  group.position.set(x, 0.04, z);

  const dropGeo = new THREE.SphereGeometry(0.06, 4, 4);
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.85,
  });

  const particles = [];
  for (let i = 0; i < count; i++) {
    const drop = new THREE.Mesh(dropGeo, dropMat.clone());
    const angle = (i / count) * Math.PI * 2;
    const speed = 0.8 + Math.random() * 1.5;
    drop.userData = {
      vx: Math.cos(angle) * speed,
      vy: 1.8 + Math.random() * 2.0,
      vz: Math.sin(angle) * speed,
    };
    group.add(drop);
    particles.push(drop);
  }

  scene.add(group);
  activeWaterEffects.push({
    type: 'splash',
    group,
    particles,
    maxLife: 0.45,
    life: 0.45,
  });
}

export function updateWaterEffects(scene, dt) {
  for (let i = activeWaterEffects.length - 1; i >= 0; i--) {
    const effect = activeWaterEffects[i];
    effect.life -= dt;

    if (effect.life <= 0) {
      if (effect.type === 'ripple') {
        scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
      } else if (effect.type === 'splash') {
        scene.remove(effect.group);
        effect.particles.forEach(p => {
          p.geometry.dispose();
          p.material.dispose();
        });
      }
      activeWaterEffects.splice(i, 1);
    } else {
      const progress = 1.0 - (effect.life / effect.maxLife);
      if (effect.type === 'ripple') {
        effect.mesh.scale.setScalar(1.0 + progress * effect.scaleSpeed);
        effect.mesh.material.opacity = (1.0 - progress) * 0.65;
      } else if (effect.type === 'splash') {
        effect.particles.forEach(p => {
          p.userData.vy -= 9.8 * dt; // Gravity
          p.position.x += p.userData.vx * dt;
          p.position.y += p.userData.vy * dt;
          p.position.z += p.userData.vz * dt;
          p.material.opacity = (1.0 - progress) * 0.85;
        });
      }
    }
  }
}

// ===== MAJESTIC ROCKY WATERFALL =====
function createWaterfall(scene, colliders) {
  const group = new THREE.Group();
  const wx = 50;
  const wz = 12;
  const baseH = getTerrainHeight(wx, wz);

  // Big rocky cliff backdrop
  const cliffMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const cliffGeo = new THREE.BoxGeometry(8, 7.5, 4);
  const cliff = new THREE.Mesh(cliffGeo, cliffMat);
  cliff.position.set(wx + 1.5, baseH + 3.2, wz);
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  group.add(cliff);
  colliders.push({ x: wx + 1.5, z: wz, radius: 2.2, height: 6.0 });

  // Cascading water plane
  const waterGeo = new THREE.PlaneGeometry(3.6, 6.2, 8, 16);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.82,
    shininess: 90,
    specular: 0xe0f2fe,
    side: THREE.DoubleSide,
  });
  const cascade = new THREE.Mesh(waterGeo, waterMat);
  cascade.position.set(wx - 0.5, baseH + 3.0, wz);
  cascade.rotation.y = -Math.PI / 2;
  group.add(cascade);
  activeWaterfallMesh = cascade;

  // Plunge pool rocky border
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI;
    const r = 2.4;
    const bx = wx - 0.5 + Math.cos(a - Math.PI / 2) * r;
    const bz = wz + Math.sin(a - Math.PI / 2) * r;
    const boulder = createRock(0.7);
    boulder.position.set(bx, baseH + 0.2, bz);
    group.add(boulder);
    colliders.push({ x: bx, z: bz, radius: 0.45, height: 0.8 });
  }

  // Rising mist particles
  const mistCount = 45;
  const mistGeo = new THREE.BufferGeometry();
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = wx - 0.5 + (Math.random() - 0.5) * 3.2;
    mistPos[i * 3 + 1] = baseH + 0.2 + Math.random() * 2.8;
    mistPos[i * 3 + 2] = wz + (Math.random() - 0.5) * 2.8;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 0.25,
    transparent: true,
    opacity: 0.45,
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  group.add(mist);
  activeWaterfallMist = mist;

  scene.add(group);
}

// ===== BIOLUMINESCENT JUNGLE & CAVE FIREFLIES =====
function createFireflies(scene) {
  const count = 75;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const isCave = i % 2 === 0;
    const cx = isCave ? (-48 + (Math.random() - 0.5) * 18) : (-35 + (Math.random() - 0.5) * 20);
    const cz = isCave ? (-35 + (Math.random() - 0.5) * 18) : (30 + (Math.random() - 0.5) * 20);
    const cy = getTerrainHeight(cx, cz) + 0.8 + Math.random() * 2.4;

    pos[i * 3] = cx;
    pos[i * 3 + 1] = cy;
    pos[i * 3 + 2] = cz;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xfacc15,
    size: 0.22,
    transparent: true,
    opacity: 0.85,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  activeFireflies = points;
}

// ===== UNIFIED LIVING ENVIRONMENT ANIMATION (Wind, Foliage, Water, Particles) =====
export function updateEnvironmentAnimation(dt, elapsed) {
  // 1. River surface & wave displacement
  if (waterMeshRef) {
    updateRiver(waterMeshRef, dt, elapsed);
  }
  if (sceneRef) {
    updateWaterEffects(sceneRef, dt);
  }

  // 2. Swaying palm tree canopies with wind
  for (let i = 0; i < animatedTreeCrowns.length; i++) {
    const item = animatedTreeCrowns[i];
    const swayZ = Math.sin(elapsed * item.speed + item.phase) * item.amp;
    const swayX = Math.cos(elapsed * item.speed * 0.75 + item.phase) * (item.amp * 0.65);
    item.group.rotation.z = item.baseRotZ + swayZ;
    item.group.rotation.x = item.baseRotX + swayX;
  }

  // 3. Swaying bushes
  for (let i = 0; i < animatedBushes.length; i++) {
    const item = animatedBushes[i];
    item.group.rotation.z = item.baseRotZ + Math.sin(elapsed * item.speed + item.phase) * item.amp;
  }

  // 4. Swaying flowers
  for (let i = 0; i < animatedFlowers.length; i++) {
    const item = animatedFlowers[i];
    item.mesh.rotation.z = item.baseRotZ + Math.sin(elapsed * item.speed + item.phase) * item.amp;
  }

  // 5. Animated waterfall UV & mist particles
  if (activeWaterfallMesh && activeWaterfallMesh.material && activeWaterfallMesh.material.map) {
    activeWaterfallMesh.material.map.offset.y -= dt * 1.6;
  }
  if (activeWaterfallMist) {
    const mPos = activeWaterfallMist.geometry.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      let y = mPos.getY(i) + dt * 0.8;
      if (y > 3.2) y = 0.2;
      mPos.setY(i, y);
    }
    mPos.needsUpdate = true;
  }

  // 6. Bioluminescent drifting fireflies
  if (activeFireflies) {
    const fPos = activeFireflies.geometry.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      let y = fPos.getY(i) + Math.sin(elapsed * 1.6 + i) * 0.003;
      let x = fPos.getX(i) + Math.cos(elapsed * 0.8 + i) * 0.002;
      fPos.setY(i, y);
      fPos.setX(i, x);
    }
    fPos.needsUpdate = true;
  }
}

// ===== WOODEN BRIDGE =====
function createWoodenBridge(length, width) {
  const bridge = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });    // Golden oak
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x582f0e });// Dark post wood
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });   // Alternating planks

  // Walkable deck planks
  const plankCount = Math.floor(length / 0.38);
  for (let i = 0; i < plankCount; i++) {
    const pZ = -length / 2 + (i + 0.5) * (length / plankCount);
    // Subtle arch
    const archY = Math.sin((i / (plankCount - 1)) * Math.PI) * 0.15;
    const plankGeo = new THREE.BoxGeometry(width, 0.09, 0.34);
    const plank = new THREE.Mesh(plankGeo, (i % 2 === 0) ? woodMat : plankMat);
    plank.position.set(0, 0.22 + archY, pZ);
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);
  }

  // Side support beams
  [-width / 2 + 0.1, width / 2 - 0.1].forEach(x => {
    const beamGeo = new THREE.BoxGeometry(0.12, 0.16, length + 0.3);
    const beam = new THREE.Mesh(beamGeo, darkWoodMat);
    beam.position.set(x, 0.14, 0);
    beam.castShadow = true;
    bridge.add(beam);
  });

  // Vertical railing posts and horizontal handrails
  [-width / 2 + 0.08, width / 2 - 0.08].forEach(x => {
    for (let p = 0; p < 5; p++) {
      const pZ = -length / 2 + p * (length / 4);
      const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.65, 6);
      const post = new THREE.Mesh(postGeo, darkWoodMat);
      post.position.set(x, 0.48, pZ);
      post.castShadow = true;
      bridge.add(post);
    }

    // Top horizontal handrail
    const railGeo = new THREE.CylinderGeometry(0.045, 0.045, length + 0.2, 6);
    const rail = new THREE.Mesh(railGeo, woodMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, 0.76, 0);
    rail.castShadow = true;
    bridge.add(rail);
  });

  return bridge;
}

// ===== PALM TREE =====
function createPalmTree() {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 6, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 3;
  trunk.castShadow = true;
  trunk.rotation.z = (Math.random() - 0.5) * 0.15;
  trunk.rotation.x = (Math.random() - 0.5) * 0.1;
  group.add(trunk);

  for (let i = 0; i < 3; i++) {
    const segGeo = new THREE.TorusGeometry(0.3, 0.06, 4, 8);
    const seg = new THREE.Mesh(segGeo, trunkMat);
    seg.position.y = 1.5 + i * 1.5;
    seg.rotation.x = Math.PI / 2;
    group.add(seg);
  }

  // Tree crown (coconuts + fronds) sways gently with wind without moving trunk collider
  const crown = new THREE.Group();
  crown.position.y = 5.5;

  const cocoGeo = new THREE.SphereGeometry(0.18, 6, 4);
  const cocoMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
  for (let i = 0; i < 3; i++) {
    const coco = new THREE.Mesh(cocoGeo, cocoMat);
    const a = (i / 3) * Math.PI * 2;
    coco.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    coco.castShadow = true;
    crown.add(coco);
  }

  const frondMat = new THREE.MeshLambertMaterial({ color: 0x228B22, side: THREE.DoubleSide });
  const frondCount = 6 + Math.floor(Math.random() * 3);

  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2;
    const frondGeo = new THREE.ConeGeometry(0.6, 3, 4);
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.set(Math.cos(angle) * 1.2, 0.5, Math.sin(angle) * 1.2);
    frond.rotation.z = angle + Math.PI / 2;
    frond.rotation.x = -0.8 - Math.random() * 0.3;
    frond.castShadow = true;
    crown.add(frond);
  }

  group.add(crown);

  animatedTreeCrowns.push({
    group: crown,
    baseRotX: 0,
    baseRotZ: 0,
    phase: Math.random() * Math.PI * 2,
    speed: 1.1 + Math.random() * 0.5,
    amp: 0.042 + Math.random() * 0.02,
  });

  const scale = 0.8 + Math.random() * 0.4;
  group.scale.setScalar(scale);

  return group;
}

// ===== ROCK =====
function createRock(scale) {
  const group = new THREE.Group();

  const geos = [
    new THREE.DodecahedronGeometry(scale, 0),
    new THREE.IcosahedronGeometry(scale * 0.7, 0),
  ];

  const colors = [0x6b7280, 0x78716c, 0x57534e, 0x9ca3af];
  const mat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });

  const main = new THREE.Mesh(geos[0], mat);
  main.scale.set(1, 0.6, 1);
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);

  if (Math.random() > 0.4) {
    const mat2 = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const small = new THREE.Mesh(geos[1], mat2);
    small.position.set(scale * 0.5, -scale * 0.2, scale * 0.3);
    small.scale.set(0.6, 0.4, 0.6);
    small.castShadow = true;
    group.add(small);
  }

  return group;
}

// ===== BUSH =====
function createBush(scale) {
  const group = new THREE.Group();

  const colors = [0x166534, 0x15803d, 0x14532d];

  const mainGeo = new THREE.IcosahedronGeometry(scale, 1);
  const mainMat = new THREE.MeshLambertMaterial({ color: colors[0] });
  const main = new THREE.Mesh(mainGeo, mainMat);
  main.scale.set(1, 0.7, 1);
  main.castShadow = true;
  group.add(main);

  for (let i = 0; i < 3; i++) {
    const bumpGeo = new THREE.IcosahedronGeometry(scale * 0.5, 1);
    const bumpMat = new THREE.MeshLambertMaterial({ color: colors[1 + (i % 2)] });
    const bump = new THREE.Mesh(bumpGeo, bumpMat);
    const a = (i / 3) * Math.PI * 2;
    bump.position.set(Math.cos(a) * scale * 0.4, scale * 0.1, Math.sin(a) * scale * 0.4);
    bump.scale.set(0.8, 0.5, 0.8);
    bump.castShadow = true;
    group.add(bump);
  }

  animatedBushes.push({
    group,
    baseRotZ: 0,
    phase: Math.random() * Math.PI * 2,
    speed: 1.6 + Math.random() * 0.6,
    amp: 0.035,
  });

  return group;
}

// ===== LOG =====
function createLog(length) {
  const group = new THREE.Group();

  const logGeo = new THREE.CylinderGeometry(0.25, 0.3, length, 8);
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
  const log = new THREE.Mesh(logGeo, logMat);
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.25;
  log.castShadow = true;
  log.receiveShadow = true;
  group.add(log);

  const ringGeo = new THREE.TorusGeometry(0.28, 0.05, 4, 8);
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
  [-1, 1].forEach(dir => {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(dir * length * 0.45, 0.25, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  });

  return group;
}

// ===== LANDMARK: ANCIENT GRAND TREE =====
function createAncientTree() {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x422006 });
  const trunkGeo = new THREE.CylinderGeometry(1.4, 2.2, 6.0, 9);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 3.0;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Protruding root flares
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const rootGeo = new THREE.CylinderGeometry(0.35, 0.75, 3.2, 6);
    const root = new THREE.Mesh(rootGeo, trunkMat);
    root.position.set(Math.cos(angle) * 1.6, 0.6, Math.sin(angle) * 1.6);
    root.rotation.x = 0.3 * Math.sin(angle);
    root.rotation.z = -0.3 * Math.cos(angle);
    root.castShadow = true;
    group.add(root);
  }

  // Multi-layered lush canopy
  const foliageColors = [0x14532d, 0x166534, 0x15803d];
  const canopies = [
    { x: 0, y: 6.2, z: 0, s: 3.5 },
    { x: 1.8, y: 5.6, z: 1.2, s: 2.5 },
    { x: -1.6, y: 5.8, z: -1.4, s: 2.6 },
    { x: -1.2, y: 5.5, z: 1.8, s: 2.4 },
    { x: 1.4, y: 5.7, z: -1.6, s: 2.5 },
  ];

  canopies.forEach((c, idx) => {
    const leafGeo = new THREE.DodecahedronGeometry(c.s, 1);
    const leafMat = new THREE.MeshLambertMaterial({ color: foliageColors[idx % foliageColors.length] });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(c.x, c.y, c.z);
    leaf.scale.set(1.1, 0.8, 1.1);
    leaf.castShadow = true;
    group.add(leaf);
  });

  return group;
}

// ===== LANDMARK: MYSTIC MONOLITHS (STONE CIRCLE) =====
function createMysticStones() {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const runeMat = new THREE.MeshPhongMaterial({
    color: 0xa855f7,
    emissive: 0x6b21a8,
    shininess: 90,
    specular: 0xe9d5ff,
  });

  // Center dais with glowing crystal
  const daisGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.45, 8);
  const dais = new THREE.Mesh(daisGeo, stoneMat);
  dais.position.y = 0.22;
  dais.receiveShadow = true;
  group.add(dais);

  const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
  const crystal = new THREE.Mesh(crystalGeo, runeMat);
  crystal.position.y = 0.85;
  crystal.castShadow = true;
  group.add(crystal);

  // 6 standing stones in circle
  const radius = 4.0;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;

    const stoneGeo = new THREE.BoxGeometry(0.7, 2.6 + Math.random() * 0.6, 1.1);
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(px, 1.3, pz);
    stone.rotation.y = angle + Math.PI / 2;
    stone.rotation.z = (Math.random() - 0.5) * 0.15;
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }

  return group;
}

// ===== LANDMARK: ANCIENT GOLDEN SHRINE / ALTAR =====
function createGoldenAltar() {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    emissive: 0xb45309,
    shininess: 120,
    specular: 0xfef08a,
  });

  // 3-tiered sandstone steps
  const tiers = [
    { w: 6.0, h: 0.35, y: 0.175 },
    { w: 4.6, h: 0.35, y: 0.525 },
    { w: 3.2, h: 0.35, y: 0.875 },
  ];

  tiers.forEach(t => {
    const geo = new THREE.BoxGeometry(t.w, t.h, t.w);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.y = t.y;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  });

  // 4 corner columns
  const colGeo = new THREE.CylinderGeometry(0.25, 0.3, 2.2, 8);
  const corners = [
    { x: -1.2, z: -1.2 }, { x: 1.2, z: -1.2 },
    { x: -1.2, z: 1.2 }, { x: 1.2, z: 1.2 },
  ];

  corners.forEach(c => {
    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(c.x, 2.15, c.z);
    col.castShadow = true;
    group.add(col);
  });

  // Central golden brazier / chest plinth
  const plinthGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.6, 8);
  const plinth = new THREE.Mesh(plinthGeo, goldMat);
  plinth.position.y = 1.35;
  plinth.castShadow = true;
  group.add(plinth);

  return group;
}

// ===== LANDMARK: SECRET GROTTO / ROCK ARCH =====
function createSecretGrotto() {
  const group = new THREE.Group();

  const rockMat = new THREE.MeshLambertMaterial({ color: 0x52525b }); // Weathered natural mossy granite
  const crystalMat = new THREE.MeshPhongMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    shininess: 110,
    specular: 0xa5f3fc,
  });

  // Left & right boulder pillars
  const p1Geo = new THREE.DodecahedronGeometry(2.2, 0);
  const p1 = new THREE.Mesh(p1Geo, rockMat);
  p1.position.set(-2.2, 1.8, 0);
  p1.scale.set(1.1, 1.6, 1.2);
  p1.castShadow = true;
  p1.receiveShadow = true;
  group.add(p1);

  const p2Geo = new THREE.DodecahedronGeometry(2.2, 0);
  const p2 = new THREE.Mesh(p2Geo, rockMat);
  p2.position.set(2.2, 1.8, 0);
  p2.scale.set(1.1, 1.6, 1.2);
  p2.castShadow = true;
  p2.receiveShadow = true;
  group.add(p2);

  // Overhead lintel arch boulder
  const archGeo = new THREE.DodecahedronGeometry(2.0, 0);
  const arch = new THREE.Mesh(archGeo, rockMat);
  arch.position.set(0, 3.6, 0);
  arch.scale.set(2.2, 0.9, 1.4);
  arch.castShadow = true;
  group.add(arch);

  // Hidden glowing crystals inside grotto
  for (let i = 0; i < 4; i++) {
    const cGeo = new THREE.ConeGeometry(0.2 + Math.random() * 0.15, 0.9 + Math.random() * 0.4, 5);
    const crystal = new THREE.Mesh(cGeo, crystalMat);
    const a = (i / 4) * Math.PI * 2;
    crystal.position.set(Math.cos(a) * 0.7, 0.45, Math.sin(a) * 0.7);
    crystal.rotation.x = (Math.random() - 0.5) * 0.4;
    crystal.rotation.z = (Math.random() - 0.5) * 0.4;
    crystal.castShadow = true;
    group.add(crystal);
  }

  return group;
}

// ===== LANDMARK: FINAL TEMPLE COMPLEX (WARM LOW-POLY ANCIENT LIMESTONE TEMPLE) =====
function createFinalTemple() {
  const group = new THREE.Group();

  // Warm ancient limestone / sandstone materials
  const sandstoneMat = new THREE.MeshLambertMaterial({ color: 0xd4c5a9 }); // Warm ancient stone
  const carvedTrimMat = new THREE.MeshLambertMaterial({ color: 0xb8a882 }); // Carved cornices & balustrades
  const mossStoneMat = new THREE.MeshLambertMaterial({ color: 0x8a9a68 });  // Weathered mossy stone accents
  const goldAltarMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    emissive: 0x92400e,
    shininess: 90,
    specular: 0xfef08a,
  });
  const flameMat = new THREE.MeshPhongMaterial({
    color: 0xf97316,
    emissive: 0xe11d48,
    shininess: 100,
  });

  // 0. Sub-foundation Bedrock Skirt (extends 2.6m down into mountain terrain so it never hovers!)
  const subBaseGeo = new THREE.BoxGeometry(12.4, 2.6, 12.4);
  const subBaseMesh = new THREE.Mesh(subBaseGeo, sandstoneMat);
  subBaseMesh.position.y = -1.3;
  subBaseMesh.receiveShadow = true;
  group.add(subBaseMesh);

  // 1. Lower Stone Foundation Plinth (12m x 0.45m x 12m)
  const baseGeo = new THREE.BoxGeometry(12.0, 0.45, 12.0);
  const baseMesh = new THREE.Mesh(baseGeo, sandstoneMat);
  baseMesh.position.y = 0.225;
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  group.add(baseMesh);

  // Decorative mossy stone corner blocks on lower plinth
  [[-5.6, -5.6], [5.6, -5.6], [-5.6, 5.6], [5.6, 5.6]].forEach(([cx, cz]) => {
    const cGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const corner = new THREE.Mesh(cGeo, mossStoneMat);
    corner.position.set(cx, 0.25, cz);
    corner.castShadow = true;
    corner.receiveShadow = true;
    group.add(corner);
  });

  // 2. Upper Sanctuary Terrace (8.6m x 0.45m x 8.6m)
  const terraceGeo = new THREE.BoxGeometry(8.6, 0.45, 8.6);
  const terraceMesh = new THREE.Mesh(terraceGeo, sandstoneMat);
  terraceMesh.position.y = 0.675;
  terraceMesh.receiveShadow = true;
  terraceMesh.castShadow = true;
  group.add(terraceMesh);

  // 3. Grand Walkable Entrance Staircase (South front: local z from 2.6m to 6.2m)
  // 5 wide, low steps smoothly stepping from ground level up to upper terrace
  const stairSteps = [
    { z: 6.0, y: 0.12, w: 3.6, d: 0.9 },
    { z: 5.2, y: 0.25, w: 3.4, d: 0.9 },
    { z: 4.4, y: 0.38, w: 3.2, d: 0.9 },
    { z: 3.6, y: 0.52, w: 3.0, d: 0.9 },
    { z: 2.8, y: 0.675, w: 2.8, d: 0.9 },
  ];

  stairSteps.forEach(s => {
    const sGeo = new THREE.BoxGeometry(s.w, 0.20, s.d);
    const stepMesh = new THREE.Mesh(sGeo, carvedTrimMat);
    stepMesh.position.set(0, s.y, s.z);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    group.add(stepMesh);
  });

  // Flanking stone balustrades along stairs
  [-2.0, 2.0].forEach(bx => {
    const balGeo = new THREE.BoxGeometry(0.35, 0.75, 3.8);
    const bal = new THREE.Mesh(balGeo, sandstoneMat);
    bal.position.set(bx, 0.55, 3.8);
    bal.castShadow = true;
    group.add(bal);

    // Stone guardian totem on stair post
    const postGeo = new THREE.BoxGeometry(0.5, 1.1, 0.5);
    const post = new THREE.Mesh(postGeo, carvedTrimMat);
    post.position.set(bx, 0.7, 5.2);
    post.castShadow = true;
    group.add(post);
  });

  // 4. Six Classical Stone Columns supporting the open pavilion roof
  // 4 at sanctuary corners, 2 at front portal
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 3.2, 8);
  const colBaseGeo = new THREE.BoxGeometry(0.65, 0.2, 0.65);
  const colPositions = [
    [-3.2, -3.2], [3.2, -3.2], // Back corners
    [-3.2, 3.2], [3.2, 3.2],   // Front corners
    [-1.6, 1.8], [1.6, 1.8],   // Entrance portal columns
  ];

  colPositions.forEach(([px, pz]) => {
    // Pedestal base
    const pBase = new THREE.Mesh(colBaseGeo, carvedTrimMat);
    pBase.position.set(px, 1.0, pz);
    pBase.castShadow = true;
    group.add(pBase);

    // Shaft
    const colMesh = new THREE.Mesh(colGeo, sandstoneMat);
    colMesh.position.set(px, 2.6, pz);
    colMesh.castShadow = true;
    group.add(colMesh);

    // Capital
    const cap = new THREE.Mesh(colBaseGeo, carvedTrimMat);
    cap.position.set(px, 4.25, pz);
    cap.castShadow = true;
    group.add(cap);
  });

  // 5. Grand Open Pavilion Roof (Provides >3.2m interior clearance)
  // Lower cornice
  const corniceGeo = new THREE.BoxGeometry(8.8, 0.35, 8.8);
  const cornice = new THREE.Mesh(corniceGeo, carvedTrimMat);
  cornice.position.y = 4.45;
  cornice.castShadow = true;
  group.add(cornice);

  // Upper tiered roof
  const roofGeo = new THREE.BoxGeometry(6.6, 0.5, 6.6);
  const roof = new THREE.Mesh(roofGeo, sandstoneMat);
  roof.position.y = 4.85;
  roof.castShadow = true;
  group.add(roof);

  // Roof crest finial
  const crestGeo = new THREE.BoxGeometry(3.6, 0.4, 3.6);
  const crest = new THREE.Mesh(crestGeo, carvedTrimMat);
  crest.position.y = 5.25;
  crest.castShadow = true;
  group.add(crest);

  // 6. Central Altar Dais for the Golden Chest
  const altarGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.45, 8);
  const altar = new THREE.Mesh(altarGeo, goldAltarMat);
  altar.position.set(0, 1.15, 0);
  altar.receiveShadow = true;
  altar.castShadow = true;
  group.add(altar);

  // 7. Four Fire Braziers (2 at entrance, 2 flanking the altar)
  const brazierPositions = [
    [-2.2, 5.4, 0.45], [2.2, 5.4, 0.45], // Stair entrance braziers
    [-2.6, 0.0, 1.15], [2.6, 0.0, 1.15], // Altar flanking braziers
  ];

  brazierPositions.forEach(([bx, bz, by]) => {
    const bowlGeo = new THREE.CylinderGeometry(0.35, 0.18, 0.45, 8);
    const bowl = new THREE.Mesh(bowlGeo, carvedTrimMat);
    bowl.position.set(bx, by, bz);
    bowl.castShadow = true;
    group.add(bowl);

    const flameGeo = new THREE.OctahedronGeometry(0.28, 0);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(bx, by + 0.35, bz);
    group.add(flame);
  });

  return group;
}

// ===== LANDMARK: TROPICAL COASTAL VILLAGE (3 STILT BUNGALOWS, WELL, FOOTPATHS) =====
function createTropicalVillage(scene, colliders) {
  const villageGroup = new THREE.Group();
  villageGroup.name = 'tropicalVillage';

  // Materials
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x854d0e }); // Sturdy aged teak wood
  const plankMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });  // Warm wooden floorboards
  const bambooMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Woven bamboo walling
  const thatchMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Palm thatch roof
  const thatchRidgeMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c });  // River stone well
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, shininess: 80 });

  // 1. THREE STILT BUNGALOWS
  const huts = [
    { x: -20, z: 26, rotY: 0.0, w: 4.8, d: 4.2, label: 'Lodge' },
    { x: -12, z: 34, rotY: 0.0, w: 4.4, d: 3.8, label: 'FisherHut' },
    { x: -24, z: 36, rotY: 0.0, w: 4.4, d: 3.8, label: 'Outpost' },
  ];

  huts.forEach(hut => {
    const hutGroup = new THREE.Group();
    const groundY = getTerrainHeight(hut.x, hut.z);
    hutGroup.position.set(hut.x, groundY, hut.z);
    hutGroup.rotation.y = hut.rotY;

    // Floor height is 0.95m above ground
    const floorY = 0.95;

    // A. Foundation Stilts (Crucial: extend 1.4m down INTO the ground so they never float!)
    const stiltPositions = [
      [-hut.w * 0.45, -hut.d * 0.45], [hut.w * 0.45, -hut.d * 0.45],
      [-hut.w * 0.45, hut.d * 0.45], [hut.w * 0.45, hut.d * 0.45],
      [0, -hut.d * 0.45], [0, hut.d * 0.45]
    ];
    stiltPositions.forEach(([sx, sz]) => {
      // Stilt cylinder height 2.6m, centered at y = 0.1 (reaches from y = -1.2 to y = 1.4)
      const stiltGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8);
      const stilt = new THREE.Mesh(stiltGeo, timberMat);
      stilt.position.set(sx, 0.1, sz);
      stilt.castShadow = true;
      stilt.receiveShadow = true;
      hutGroup.add(stilt);
    });

    // B. Floor Platform Planks
    const floorGeo = new THREE.BoxGeometry(hut.w, 0.18, hut.d);
    const floor = new THREE.Mesh(floorGeo, plankMat);
    floor.position.y = floorY;
    floor.castShadow = true;
    floor.receiveShadow = true;
    hutGroup.add(floor);

    // C. Woven Bamboo Walls with Front Open Entrance
    // Back wall
    const backWallGeo = new THREE.BoxGeometry(hut.w, 1.8, 0.12);
    const backWall = new THREE.Mesh(backWallGeo, bambooMat);
    backWall.position.set(0, floorY + 0.9, -hut.d * 0.45);
    backWall.castShadow = true;
    hutGroup.add(backWall);

    // Left wall
    const sideWallGeo = new THREE.BoxGeometry(0.12, 1.8, hut.d);
    const leftWall = new THREE.Mesh(sideWallGeo, bambooMat);
    leftWall.position.set(-hut.w * 0.45, floorY + 0.9, 0);
    leftWall.castShadow = true;
    hutGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeo, bambooMat);
    rightWall.position.set(hut.w * 0.45, floorY + 0.9, 0);
    rightWall.castShadow = true;
    hutGroup.add(rightWall);

    // Front wall with 1.4m wide central open doorway
    const frontSideW = (hut.w - 1.4) * 0.5;
    [-hut.w * 0.5 + frontSideW * 0.5, hut.w * 0.5 - frontSideW * 0.5].forEach(fx => {
      const fWallGeo = new THREE.BoxGeometry(frontSideW, 1.8, 0.12);
      const fWall = new THREE.Mesh(fWallGeo, bambooMat);
      fWall.position.set(fx, floorY + 0.9, hut.d * 0.45);
      fWall.castShadow = true;
      hutGroup.add(fWall);
    });

    // D. Thatched Palm Roof (Overhanging pyramid hip roof)
    const roofBaseW = hut.w + 1.2;
    const roofBaseD = hut.d + 1.2;
    const roofGeo = new THREE.ConeGeometry(Math.max(roofBaseW, roofBaseD) * 0.72, 1.6, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, thatchMat);
    roof.position.set(0, floorY + 2.45, 0);
    roof.castShadow = true;
    hutGroup.add(roof);

    // Roof ridge ornament
    const finialGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
    const finial = new THREE.Mesh(finialGeo, thatchRidgeMat);
    finial.position.set(0, floorY + 3.25, 0);
    hutGroup.add(finial);

    // E. Walkable Wooden Entrance Stairs / Ramp (South front, leads up to floor)
    const rampLen = 1.8;
    const rampW = 1.4;
    const rampGeo = new THREE.BoxGeometry(rampW, 0.12, rampLen);
    const ramp = new THREE.Mesh(rampGeo, plankMat);
    ramp.position.set(0, floorY * 0.5, hut.d * 0.5 + rampLen * 0.5);
    ramp.rotation.x = Math.atan2(floorY, rampLen);
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    hutGroup.add(ramp);

    // F. Veranda railing posts
    [-0.75, 0.75].forEach(rx => {
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6);
      const post = new THREE.Mesh(postGeo, timberMat);
      post.position.set(rx, floorY + 0.45, hut.d * 0.5);
      post.castShadow = true;
      hutGroup.add(post);
    });

    // Hanging warm lantern
    const lanternGeo = new THREE.BoxGeometry(0.2, 0.28, 0.2);
    const lanternMat = new THREE.MeshPhongMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      shininess: 90,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0.65, floorY + 1.6, hut.d * 0.5 + 0.1);
    hutGroup.add(lantern);

    scene.add(hutGroup);

    // Colliders on solid sides and back of hut (leaves entrance completely open!)
    const cosR = Math.cos(hut.rotY);
    const sinR = Math.sin(hut.rotY);
    const transformHutPt = (lx, lz) => ({
      x: hut.x + lx * cosR - lz * sinR,
      z: hut.z + lx * sinR + lz * cosR,
    });

    const ptL = transformHutPt(-hut.w * 0.45, 0);
    colliders.push({ x: ptL.x, z: ptL.z, radius: 0.45, height: 2.2 });
    const ptR = transformHutPt(hut.w * 0.45, 0);
    colliders.push({ x: ptR.x, z: ptR.z, radius: 0.45, height: 2.2 });
    const ptB = transformHutPt(0, -hut.d * 0.45);
    colliders.push({ x: ptB.x, z: ptB.z, radius: 0.5, height: 2.2 });
  });

  // 2. VILLAGE STONE WELL (at x: -17, z: 30)
  const wellGroundY = getTerrainHeight(-17, 30);
  const wellGroup = new THREE.Group();
  wellGroup.position.set(-17, wellGroundY, 30);

  const wellGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.75, 12);
  const well = new THREE.Mesh(wellGeo, stoneMat);
  well.position.y = 0.375;
  well.castShadow = true;
  well.receiveShadow = true;
  wellGroup.add(well);

  const wellWaterGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.1, 10);
  const wellWater = new THREE.Mesh(wellWaterGeo, waterMat);
  wellWater.position.y = 0.3;
  wellGroup.add(wellWater);

  [-0.65, 0.65].forEach(px => {
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6);
    const post = new THREE.Mesh(postGeo, timberMat);
    post.position.set(px, 0.9, 0);
    post.castShadow = true;
    wellGroup.add(post);
  });
  const beamGeo = new THREE.BoxGeometry(1.5, 0.1, 0.1);
  const beam = new THREE.Mesh(beamGeo, timberMat);
  beam.position.set(0, 1.75, 0);
  wellGroup.add(beam);

  const wellRoofGeo = new THREE.ConeGeometry(1.15, 0.55, 4);
  wellRoofGeo.rotateY(Math.PI / 4);
  const wellRoof = new THREE.Mesh(wellRoofGeo, thatchMat);
  wellRoof.position.set(0, 2.05, 0);
  wellRoof.castShadow = true;
  wellGroup.add(wellRoof);

  const bucketGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.22, 6);
  const bucket = new THREE.Mesh(bucketGeo, timberMat);
  bucket.position.set(0.15, 0.78, 0.3);
  wellGroup.add(bucket);

  scene.add(wellGroup);
  colliders.push({ x: -17, z: 30, radius: 0.85, height: 1.2 });

  // 3. VILLAGE FOOTPATH STEPPING PLANKS
  const plankPositions = [
    { x: -19, z: 28.5 }, { x: -18, z: 29.5 }, { x: -16, z: 31.0 },
    { x: -14, z: 32.5 }, { x: -13, z: 34.0 }, { x: -21, z: 32.0 },
    { x: -22.5, z: 34.5 }, { x: -18, z: 25.0 }, { x: -16, z: 23.5 },
  ];
  plankPositions.forEach(p => {
    const py = getTerrainHeight(p.x, p.z);
    const pGeo = new THREE.BoxGeometry(1.2, 0.06, 0.35);
    const pMesh = new THREE.Mesh(pGeo, plankMat);
    pMesh.position.set(p.x, py + 0.03, p.z);
    pMesh.rotation.y = (Math.random() - 0.5) * 0.4;
    pMesh.receiveShadow = true;
    scene.add(pMesh);
  });

  // 4. DECORATIVE VILLAGE CRATES & POTTERY JARS
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
  const potMat = new THREE.MeshLambertMaterial({ color: 0xc2410c });
  const decors = [
    { x: -18.2, z: 26.2, type: 'crate', s: 0.55 },
    { x: -18.6, z: 26.7, type: 'crate', s: 0.45 },
    { x: -14.2, z: 32.8, type: 'pot', s: 0.35 },
    { x: -22.4, z: 38.2, type: 'crate', s: 0.6 },
  ];
  decors.forEach(d => {
    const dy = getTerrainHeight(d.x, d.z);
    if (d.type === 'crate') {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(d.s, d.s, d.s), crateMat);
      cMesh.position.set(d.x, dy + d.s * 0.5, d.z);
      cMesh.castShadow = true;
      scene.add(cMesh);
      colliders.push({ x: d.x, z: d.z, radius: d.s * 0.5, height: d.s });
    } else {
      const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(d.s * 0.5, d.s * 0.35, d.s * 1.1, 8), potMat);
      pMesh.position.set(d.x, dy + d.s * 0.55, d.z);
      pMesh.castShadow = true;
      scene.add(pMesh);
    }
  });
}

