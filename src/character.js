// ===== PLAYER CHARACTER - Stylized Modern Low-Poly Island Adventurer =====
// Senior 3D Character Art & Kinematic Animation System for COIN RUSH ISLAND
import * as THREE from 'three';

/**
 * Creates the high-fidelity, stylized 3D male adventurer character.
 * Uses a clean hierarchical skeleton with true anatomical pivot joints:
 * - Neck pivot for head rotation and nodding
 * - Waist/lumbar pivot for spine bending, counter-twist, and turn banking
 * - Shoulder and elbow hinges for natural arm swings
 * - Hip, knee, and ankle hinges for realistic 4-phase walking, running, strafing, and landing
 * 
 * @param {number|null} customShirtColor - Optional hex color override for multiplayer shirts
 * @returns {THREE.Group} - The complete character group
 */
export function createCharacter(customShirtColor = null) {
  const group = new THREE.Group();
  group.name = 'playerCharacter';

  // ===== 1. CURATED TROPICAL ADVENTURER COLOR PALETTE =====
  const skinColor = 0xF5D0B5;          // Warm natural stylized skin tone
  const skinWarmColor = 0xE6B89A;      // Subtle warm contour for inner ears / neck
  const shirtColor = customShirtColor !== null ? customShirtColor : 0x2563EB; // Royal adventure blue
  const shirtAccentColor = 0x1D4ED8;   // Deeper azure for collar accents
  const vestColor = 0x1E3A8A;          // Deep navy explorer vest
  const vestTrimColor = 0x3B82F6;      // Electric azure stitched trim
  const pantsColor = 0xC26A28;         // Warm khaki / amber cargo shorts
  const pantsCuffColor = 0x9A4815;     // Rolled hem accent
  const beltColor = 0x3F2012;          // Dark saddle leather
  const goldColor = 0xF59E0B;          // Polished brass / gold buckles & compass crest
  const backpackColor = 0x991B1B;      // Rich crimson explorer canvas rucksack
  const bedrollColor = 0x065F46;       // Forest emerald rolled sleeping mat
  const bedrollStrapColor = 0x78350F;  // Leather tie straps
  const hairColor = 0x3E2419;          // Rich dark chocolate / chestnut
  const hairHighlightColor = 0x543222; // Slightly warmer tone for textured bangs
  const bandColor = 0xE11D48;          // Crimson bandana / headband
  const whiteColor = 0xFFFFFF;         // Clean sclera & eye specular glints
  const irisColor = 0x1E40AF;          // Deep vibrant ocean-blue iris
  const pupilColor = 0x0F172A;         // Obsidian pupil
  const browColor = 0x2D1810;          // Dark defined eyebrows
  const mouthColor = 0x9F1239;         // Subtle warm lip contour / smile
  const bootLeatherColor = 0x422006;   // Rugged trail boot leather
  const bootTrimColor = 0x78350F;      // Padded boot collar & tongue
  const soleColor = 0x18181B;          // Deep charcoal lugged rubber sole
  const canteenColor = 0x0284C7;       // Ocean sky water canteen

  // ===== 2. MATERIALS SETUP =====
  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const skinWarmMat = new THREE.MeshLambertMaterial({ color: skinWarmColor });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const shirtAccentMat = new THREE.MeshLambertMaterial({ color: shirtAccentColor });
  const vestMat = new THREE.MeshLambertMaterial({ color: vestColor });
  const vestTrimMat = new THREE.MeshLambertMaterial({ color: vestTrimColor });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
  const pantsCuffMat = new THREE.MeshLambertMaterial({ color: pantsCuffColor });
  const beltMat = new THREE.MeshLambertMaterial({ color: beltColor });
  const goldMat = new THREE.MeshLambertMaterial({ color: goldColor });
  const backpackMat = new THREE.MeshLambertMaterial({ color: backpackColor });
  const bedrollMat = new THREE.MeshLambertMaterial({ color: bedrollColor });
  const bedrollStrapMat = new THREE.MeshLambertMaterial({ color: bedrollStrapColor });
  const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
  const hairHighlightMat = new THREE.MeshLambertMaterial({ color: hairHighlightColor });
  const bandMat = new THREE.MeshLambertMaterial({ color: bandColor });
  const whiteMat = new THREE.MeshLambertMaterial({ color: whiteColor });
  const irisMat = new THREE.MeshLambertMaterial({ color: irisColor });
  const pupilMat = new THREE.MeshLambertMaterial({ color: pupilColor });
  const browMat = new THREE.MeshLambertMaterial({ color: browColor });
  const mouthMat = new THREE.MeshLambertMaterial({ color: mouthColor });
  const bootLeatherMat = new THREE.MeshLambertMaterial({ color: bootLeatherColor });
  const bootTrimMat = new THREE.MeshLambertMaterial({ color: bootTrimColor });
  const soleMat = new THREE.MeshLambertMaterial({ color: soleColor });
  const canteenMat = new THREE.MeshLambertMaterial({ color: canteenColor });
  const bracerMat = new THREE.MeshLambertMaterial({ color: 0x5C2E0B });

  // ===== 3. BODY ROOT (Pelvis Bounce, Hip Sway, Squat Compression) =====
  const bodyRoot = new THREE.Group();
  bodyRoot.name = 'bodyRoot';
  group.add(bodyRoot);

  // ===== 4. PELVIS & SHORTS (y = 0.72) =====
  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';
  pelvis.position.set(0, 0.72, 0);
  bodyRoot.add(pelvis);

  // Shorts waistband & hips
  const hipsGeo = new THREE.BoxGeometry(0.48, 0.22, 0.32);
  const hipsMesh = new THREE.Mesh(hipsGeo, pantsMat);
  hipsMesh.castShadow = true;
  pelvis.add(hipsMesh);

  // Utility belt & brass buckle
  const beltGeo = new THREE.BoxGeometry(0.50, 0.07, 0.34);
  const beltMesh = new THREE.Mesh(beltGeo, beltMat);
  beltMesh.position.y = 0.08;
  pelvis.add(beltMesh);

  const buckleGeo = new THREE.BoxGeometry(0.11, 0.08, 0.355);
  const buckleMesh = new THREE.Mesh(buckleGeo, goldMat);
  buckleMesh.position.set(0, 0.08, 0.01);
  pelvis.add(buckleMesh);

  // Side cargo flap pockets
  [-0.25, 0.25].forEach(px => {
    const pocketGeo = new THREE.BoxGeometry(0.04, 0.12, 0.16);
    const pocket = new THREE.Mesh(pocketGeo, pantsCuffMat);
    pocket.position.set(px, -0.02, 0);
    pelvis.add(pocket);
  });

  // Hip water canteen (right hip)
  const canteenGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.13, 8);
  const canteenMesh = new THREE.Mesh(canteenGeo, canteenMat);
  canteenMesh.position.set(0.26, 0.05, -0.06);
  canteenMesh.rotation.z = -0.15;
  pelvis.add(canteenMesh);

  const canteenCap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8), goldMat);
  canteenCap.position.set(0.28, 0.13, -0.06);
  pelvis.add(canteenCap);

  // Left leather pouch (left hip)
  const pouchMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.10), beltMat);
  pouchMesh.position.set(-0.255, 0.05, -0.04);
  pelvis.add(pouchMesh);

  // ===== 5. ARTICULATED LEGS (Hip Sockets at [-0.14, -0.04, 0] & [0.14, -0.04, 0]) =====
  const leftLeg = createArticulatedLeg('leftLeg', -0.14, pantsMat, pantsCuffMat, skinMat, bootLeatherMat, bootTrimMat, soleMat);
  pelvis.add(leftLeg);

  const rightLeg = createArticulatedLeg('rightLeg', 0.14, pantsMat, pantsCuffMat, skinMat, bootLeatherMat, bootTrimMat, soleMat);
  pelvis.add(rightLeg);

  // ===== 6. SPINE / TORSO GROUP (Pivot at waist/lumbar: y = 0.85) =====
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.85, 0);
  bodyRoot.add(torso);

  // Athletic V-Taper Inner Shirt
  // (Waist width: 0.44, Chest width: 0.52, Depth: 0.30, Height: 0.50)
  const torsoGeo = new THREE.BoxGeometry(0.48, 0.48, 0.30);
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.position.y = 0.25;
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  // Shirt Open-Collar / Henley detail
  const collarGeo = new THREE.BoxGeometry(0.18, 0.14, 0.03);
  const collarMesh = new THREE.Mesh(collarGeo, shirtAccentMat);
  collarMesh.position.set(0, 0.43, 0.155);
  torso.add(collarMesh);

  // Twin Henley collar buttons
  [0.45, 0.39].forEach(by => {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 6), goldMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, by, 0.17);
    torso.add(btn);
  });

  // Layered Explorer Vest (Left & Right lapels with trim)
  const vestWidth = 0.13;
  const vestHeight = 0.46;
  const vestDepth = 0.33;

  const vestLeftGeo = new THREE.BoxGeometry(vestWidth, vestHeight, vestDepth);
  const vestLeft = new THREE.Mesh(vestLeftGeo, vestMat);
  vestLeft.position.set(-0.19, 0.25, 0.01);
  vestLeft.castShadow = true;
  torso.add(vestLeft);

  const vestRightGeo = new THREE.BoxGeometry(vestWidth, vestHeight, vestDepth);
  const vestRight = new THREE.Mesh(vestRightGeo, vestMat);
  vestRight.position.set(0.19, 0.25, 0.01);
  vestRight.castShadow = true;
  torso.add(vestRight);

  // Vest Shoulder Epaulets / Straps
  [-0.18, 0.18].forEach(ex => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.28), vestTrimMat);
    strap.position.set(ex, 0.485, 0.01);
    torso.add(strap);

    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), goldMat);
    stud.position.set(ex, 0.50, 0.08);
    torso.add(stud);
  });

  // Explorer Backpack (Attached securely to back)
  const bpBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.20), backpackMat);
  bpBody.position.set(0, 0.23, -0.24);
  bpBody.castShadow = true;
  torso.add(bpBody);

  // Backpack front flap
  const bpFlap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.05), backpackMat);
  bpFlap.position.set(0, 0.36, -0.34);
  torso.add(bpFlap);

  // Rolled Forest Emerald Bedroll / Sleeping Mat on top
  const bedrollGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.42, 10);
  bedrollGeo.rotateZ(Math.PI / 2);
  const bedroll = new THREE.Mesh(bedrollGeo, bedrollMat);
  bedroll.position.set(0, 0.47, -0.23);
  bedroll.castShadow = true;
  torso.add(bedroll);

  // Twin leather tie-straps with gold buckles on bedroll
  [-0.12, 0.12].forEach(sx => {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 6, 16), bedrollStrapMat);
    tie.position.set(sx, 0.47, -0.23);
    tie.rotation.y = Math.PI / 2;
    torso.add(tie);

    const tieBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), goldMat);
    tieBuckle.position.set(sx, 0.54, -0.20);
    torso.add(tieBuckle);
  });

  // Vertical backpack straps with brass buckles
  [-0.09, 0.09].forEach(bx => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.30, 0.02), bedrollStrapMat);
    strap.position.set(bx, 0.21, -0.345);
    torso.add(strap);

    const strapBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.03), goldMat);
    strapBuckle.position.set(bx, 0.22, -0.355);
    torso.add(strapBuckle);
  });

  // ===== 7. ARTICULATED ARMS (Shoulder Pivots at [-0.31, 0.44, 0] & [0.31, 0.44, 0]) =====
  const leftArm = createArticulatedArm('leftArm', -1, shirtMat, skinMat, bracerMat, goldMat);
  leftArm.position.set(-0.31, 0.44, 0);
  torso.add(leftArm);

  const rightArm = createArticulatedArm('rightArm', 1, shirtMat, skinMat, bracerMat, goldMat);
  rightArm.position.set(0.31, 0.44, 0);
  torso.add(rightArm);

  // ===== 8. HEAD & EXPRESSION GROUP (Neck Pivot at y = 0.62 in torso space) =====
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';
  headGroup.position.set(0, 0.62, 0);
  torso.add(headGroup);

  // Stylized Neck connecting torso smoothly to head
  const neckGeo = new THREE.CylinderGeometry(0.105, 0.12, 0.14, 8);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.06, 0);
  neckMesh.castShadow = true;
  headGroup.add(neckMesh);

  // Sculpted Stylized Head (Width: ~0.33, Height: ~0.36, Depth: ~0.32)
  const headGeo = new THREE.SphereGeometry(0.33, 16, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.22, 0);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Sculpted Stylized Ears with inner lobe contour
  [-0.32, 0.32].forEach(ex => {
    const earGroup = new THREE.Group();
    earGroup.position.set(ex, 0.22, 0.02);

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
    earOuter.scale.set(0.5, 1.2, 0.8);
    earGroup.add(earOuter);

    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), skinWarmMat);
    earInner.scale.set(0.4, 0.8, 0.5);
    earInner.position.set(ex < 0 ? 0.015 : -0.015, 0, 0.01);
    earGroup.add(earInner);

    headGroup.add(earGroup);
  });

  // Stylized Low-Poly Nose with bridge & tip
  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.10, 0.05), skinWarmMat);
  noseBridge.position.set(0, 0.23, 0.315);
  noseBridge.rotation.x = -0.25;
  headGroup.add(noseBridge);

  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), skinMat);
  noseTip.position.set(0, 0.17, 0.335);
  headGroup.add(noseTip);

  // Expressive Adventurer Eyes & Highlights
  [-0.11, 0.11].forEach(ex => {
    // Sclera (White eye background)
    const eyeSclera = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), whiteMat);
    eyeSclera.scale.set(1.1, 0.85, 0.6);
    eyeSclera.position.set(ex, 0.235, 0.275);
    headGroup.add(eyeSclera);

    // Iris (Vibrant Ocean-Blue disc)
    const eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), irisMat);
    eyeIris.scale.set(1.0, 1.0, 0.4);
    eyeIris.position.set(ex, 0.235, 0.315);
    headGroup.add(eyeIris);

    // Pupil (Obsidian dark center)
    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), pupilMat);
    eyePupil.scale.set(1.0, 1.0, 0.4);
    eyePupil.position.set(ex, 0.235, 0.33);
    headGroup.add(eyePupil);

    // Specular Highlight Sparkle (Life in the eyes)
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), whiteMat);
    glint.position.set(ex + 0.018, 0.255, 0.34);
    headGroup.add(glint);

    // Eyebrows (Dynamic heroic angle)
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.035), browMat);
    brow.position.set(ex, 0.325, 0.275);
    brow.rotation.z = (ex < 0 ? -1 : 1) * 0.12;
    brow.rotation.y = (ex < 0 ? 1 : -1) * 0.10;
    headGroup.add(brow);
  });

  // Confident Stylized Smile
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.03), mouthMat);
  smile.position.set(0, 0.105, 0.305);
  smile.rotation.x = -0.12;
  headGroup.add(smile);

  // Modern Layered Male Hairstyle
  // Base undercut shell covering back and sides
  const hairBaseGeo = new THREE.SphereGeometry(0.355, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
  hairBase.position.set(0, 0.27, -0.02);
  hairBase.castShadow = true;
  headGroup.add(hairBase);

  // Volumetric Textured Quiff & Swept Pompadour Tufts on Top
  const hairTuftCenter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.30), hairMat);
  hairTuftCenter.position.set(0, 0.46, 0.06);
  hairTuftCenter.rotation.x = -0.28;
  hairTuftCenter.castShadow = true;
  headGroup.add(hairTuftCenter);

  const hairTuftLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.26), hairHighlightMat);
  hairTuftLeft.position.set(-0.13, 0.45, 0.04);
  hairTuftLeft.rotation.set(-0.25, 0.15, -0.20);
  headGroup.add(hairTuftLeft);

  const hairTuftRight = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.26), hairHighlightMat);
  hairTuftRight.position.set(0.13, 0.46, 0.04);
  hairTuftRight.rotation.set(-0.30, -0.15, 0.22);
  headGroup.add(hairTuftRight);

  // Swept Front Bangs / Fringe framing the forehead
  const bangMain = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), hairHighlightMat);
  bangMain.position.set(0.11, 0.39, 0.25);
  bangMain.rotation.set(-0.32, -0.22, 0.35);
  bangMain.castShadow = true;
  headGroup.add(bangMain);

  const bangSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), hairMat);
  bangSide.position.set(-0.13, 0.38, 0.24);
  bangSide.rotation.set(-0.28, 0.18, -0.25);
  bangSide.castShadow = true;
  headGroup.add(bangSide);

  // Crimson Adventurer Bandana / Headband with Brass Compass Crest
  const bandGeo = new THREE.TorusGeometry(0.338, 0.032, 8, 28);
  bandGeo.rotateX(Math.PI / 2);
  const headband = new THREE.Mesh(bandGeo, bandMat);
  headband.position.set(0, 0.315, 0);
  headGroup.add(headband);

  // Golden Compass Medallion / Buckle centered on headband
  const crestGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.025, 8);
  crestGeo.rotateX(Math.PI / 2);
  const crest = new THREE.Mesh(crestGeo, goldMat);
  crest.position.set(0, 0.32, 0.345);
  headGroup.add(crest);

  const crestStar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.03), whiteMat);
  crestStar.position.set(0, 0.32, 0.35);
  headGroup.add(crestStar);

  // ===== 9. STANDARD GAME SCALE (0.8x) =====
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

  // UserData procedural state tracking
  group.userData = {
    walkTime: 0,
    idleTime: 0,
    animSpeed: 0,
    bankAngle: 0,
    landSquat: 0,
    wasJumping: false,
    prevRotationY: 0,
    damageTimer: 0,
    waterDepth: 0,
    meshMaterials,
  };

  return group;
}

// ===== ARTICULATED ARM BUILDER =====
function createArticulatedArm(name, sideSign, shirtMat, skinMat, bracerMat, goldMat) {
  const shoulderPivot = new THREE.Group();
  shoulderPivot.name = name;

  // Deltoid shoulder sleeve cap
  const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.088, 8, 8), shirtMat);
  shoulderCap.castShadow = true;
  shoulderPivot.add(shoulderCap);

  // Upper arm (Rolled sleeve + arm)
  const upperGeo = new THREE.CylinderGeometry(0.072, 0.065, 0.22, 8);
  const upperArm = new THREE.Mesh(upperGeo, shirtMat);
  upperArm.position.y = -0.11;
  upperArm.castShadow = true;
  shoulderPivot.add(upperArm);

  // Rolled sleeve cuff ring
  const cuffGeo = new THREE.TorusGeometry(0.072, 0.016, 6, 12);
  cuffGeo.rotateX(Math.PI / 2);
  const sleeveCuff = new THREE.Mesh(cuffGeo, shirtMat);
  sleeveCuff.position.y = -0.18;
  shoulderPivot.add(sleeveCuff);

  // Elbow Joint & Forearm Group (Pivot at [0, -0.22, 0])
  const forearm = new THREE.Group();
  forearm.name = `${name}_forearm`;
  forearm.position.set(0, -0.22, 0);

  // Forearm skin
  const lowerGeo = new THREE.CylinderGeometry(0.062, 0.055, 0.19, 8);
  const lowerArm = new THREE.Mesh(lowerGeo, skinMat);
  lowerArm.position.y = -0.095;
  lowerArm.castShadow = true;
  forearm.add(lowerArm);

  // Adventurer Leather Bracer / Wrist Wrap
  const bracerGeo = new THREE.CylinderGeometry(0.066, 0.062, 0.11, 8);
  const bracer = new THREE.Mesh(bracerGeo, bracerMat);
  bracer.position.y = -0.11;
  forearm.add(bracer);

  // Brass studs on leather bracer
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6), goldMat);
  stud.rotation.x = Math.PI / 2;
  stud.position.set(0, -0.11, 0.068);
  forearm.add(stud);

  // Sculpted Stylized Low-Poly Hand (Wrist pivot at y = -0.20)
  const handGroup = new THREE.Group();
  handGroup.name = `${name}_hand`;
  handGroup.position.set(0, -0.20, 0.01);

  // Palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.045), skinMat);
  handGroup.add(palm);

  // Thumb
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.042, 0.03), skinMat);
  thumb.position.set(sideSign * 0.045, 0.01, 0.015);
  thumb.rotation.z = -sideSign * 0.45;
  handGroup.add(thumb);

  // Relaxed curled fingers
  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.045, 0.04), skinMat);
  fingers.position.set(0, -0.05, 0.01);
  fingers.rotation.x = 0.35;
  handGroup.add(fingers);

  forearm.add(handGroup);
  shoulderPivot.add(forearm);
  return shoulderPivot;
}

// ===== ARTICULATED LEG BUILDER =====
function createArticulatedLeg(name, posX, shortsMat, cuffMat, skinMat, bootMat, bootTrimMat, soleMat) {
  const hipPivot = new THREE.Group();
  hipPivot.name = name;
  hipPivot.position.set(posX, -0.04, 0);

  // Thigh (Shorts cargo leg)
  const thighGeo = new THREE.CylinderGeometry(0.108, 0.098, 0.22, 8);
  const thigh = new THREE.Mesh(thighGeo, shortsMat);
  thigh.position.y = -0.11;
  thigh.castShadow = true;
  hipPivot.add(thigh);

  // Rolled shorts cuff
  const cuffGeo = new THREE.CylinderGeometry(0.106, 0.106, 0.045, 8);
  const legCuff = new THREE.Mesh(cuffGeo, cuffMat);
  legCuff.position.y = -0.20;
  hipPivot.add(legCuff);

  // Lower Leg Group (Knee Pivot at [0, -0.23, 0])
  const lowerLeg = new THREE.Group();
  lowerLeg.name = `${name}_lower`;
  lowerLeg.position.set(0, -0.23, 0);

  // Knee patella detail
  const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skinMat);
  kneeMesh.position.set(0, 0.01, 0.02);
  lowerLeg.add(kneeMesh);

  // Calf (Skin)
  const calfGeo = new THREE.CylinderGeometry(0.082, 0.074, 0.19, 8);
  const calf = new THREE.Mesh(calfGeo, skinMat);
  calf.position.y = -0.095;
  calf.castShadow = true;
  lowerLeg.add(calf);

  // Padded Sock / Boot Collar
  const sockGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.065, 8);
  const sock = new THREE.Mesh(sockGeo, bootTrimMat);
  sock.position.y = -0.17;
  lowerLeg.add(sock);

  // Ankle / Foot Joint (Pivot at [0, -0.22, 0])
  const foot = new THREE.Group();
  foot.name = name === 'leftLeg' ? 'leftFoot' : 'rightFoot';
  foot.position.set(0, -0.22, 0);

  // Trail Boot Main Body
  const bootGeo = new THREE.BoxGeometry(0.145, 0.12, 0.23);
  const boot = new THREE.Mesh(bootGeo, bootMat);
  boot.position.set(0, -0.04, 0.04);
  boot.castShadow = true;
  foot.add(boot);

  // Boot Tongue & Laced Upper Accent
  const tongueGeo = new THREE.BoxGeometry(0.09, 0.11, 0.12);
  const tongue = new THREE.Mesh(tongueGeo, bootTrimMat);
  tongue.position.set(0, 0.01, 0.05);
  tongue.rotation.x = 0.25;
  foot.add(tongue);

  // Rugged Lugged Rubber Sole with Toe Spring (prevents clipping & gives athletic contact)
  const soleGeo = new THREE.BoxGeometry(0.155, 0.038, 0.245);
  const sole = new THREE.Mesh(soleGeo, soleMat);
  sole.position.set(0, -0.105, 0.045);
  foot.add(sole);

  // Toe spring curve
  const toeGeo = new THREE.BoxGeometry(0.148, 0.032, 0.06);
  const toeCap = new THREE.Mesh(toeGeo, soleMat);
  toeCap.position.set(0, -0.092, 0.16);
  toeCap.rotation.x = -0.22;
  foot.add(toeCap);

  lowerLeg.add(foot);
  hipPivot.add(lowerLeg);
  return hipPivot;
}

// ===== DAMAGE FLASH TRIGGER =====
export function triggerCharacterDamage(group) {
  if (group && group.userData) {
    group.userData.damageTimer = 0.38;
  }
}

// ===== HIGH-FIDELITY PROCEDURAL KINEMATIC ANIMATION SYSTEM =====
export function animateCharacter(
  group,
  isMoving,
  deltaTime,
  moveSpeedRatio = 1.0,
  inWater = false,
  isJumping = false,
  jumpHeight = 0,
  groundHeight = 0,
  options = {}
) {
  if (!group || !group.userData) return;

  const data = group.userData;
  const bodyRoot = group.getObjectByName('bodyRoot');
  const pelvis = group.getObjectByName('pelvis');
  const torso = group.getObjectByName('torso');
  const headGroup = group.getObjectByName('headGroup');
  const leftArm = group.getObjectByName('leftArm');
  const rightArm = group.getObjectByName('rightArm');
  const leftForearm = group.getObjectByName('leftArm_forearm');
  const rightForearm = group.getObjectByName('rightArm_forearm');
  const leftLeg = group.getObjectByName('leftLeg');
  const rightLeg = group.getObjectByName('rightLeg');
  const leftLowerLeg = group.getObjectByName('leftLeg_lower');
  const rightLowerLeg = group.getObjectByName('rightLeg_lower');
  const leftFoot = group.getObjectByName('leftFoot');
  const rightFoot = group.getObjectByName('rightFoot');

  // Velocity & Locomotion Direction Decomposition
  const vel = options.velocity || { x: 0, y: 0 };
  const isShiftLock = !!options.isShiftLock;
  const currentSpeed = Math.hypot(vel.x, vel.y || vel.z || 0);

  // Decompose world velocity into character's local coordinate space
  // Facing angle theta = group.rotation.y
  // Local Forward = Vx*sin(theta) + Vz*cos(theta)
  // Local Right = Vx*cos(theta) - Vz*sin(theta)
  const theta = group.rotation.y;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const vx = vel.x;
  const vz = vel.y !== undefined ? vel.y : (vel.z || 0);

  const localFwd = vx * sinT + vz * cosT;
  const localRight = vx * cosT - vz * sinT;

  const isBackpedal = isShiftLock && localFwd < -0.2;
  const isStrafing = Math.abs(localRight) > 0.3;
  const strafeRatio = Math.max(-1, Math.min(1, localRight / 6.0));

  // Turn banking calculation from angular rotation delta
  let dYaw = theta - (data.prevRotationY !== undefined ? data.prevRotationY : theta);
  while (dYaw > Math.PI) dYaw -= Math.PI * 2;
  while (dYaw < -Math.PI) dYaw += Math.PI * 2;
  data.prevRotationY = theta;

  const turnRate = deltaTime > 0.001 ? (dYaw / deltaTime) : 0;
  const targetBank = Math.max(-0.20, Math.min(0.20, -turnRate * 0.04)) * Math.min(1, currentSpeed / 4.0);
  data.bankAngle += (targetBank - data.bankAngle) * Math.min(1, 14 * deltaTime);

  // Smooth animation speed acceleration / deceleration
  const targetAnimSpeed = isMoving ? Math.max(0.25, Math.min(1.0, moveSpeedRatio)) : 0;
  const blendRate = isMoving ? 15 : 10;
  data.animSpeed += (targetAnimSpeed - data.animSpeed) * Math.min(1, blendRate * deltaTime);
  const speed = data.animSpeed;

  // River water depth wading
  data.waterDepth = data.waterDepth || 0;
  const targetDepth = inWater ? -0.12 : 0.0;
  data.waterDepth += (targetDepth - data.waterDepth) * Math.min(1, 8 * deltaTime);

  // Landing impact shock absorption detection
  if (data.wasJumping && !isJumping && jumpHeight <= 0.02) {
    data.landSquat = 0.22; // 0.22s landing compression
  }
  data.wasJumping = isJumping;

  let landingSquatY = 0;
  if (data.landSquat > 0) {
    data.landSquat -= deltaTime;
    const squishFactor = Math.sin(Math.max(0, data.landSquat) / 0.22 * Math.PI);
    landingSquatY = -squishFactor * 0.07;
  }

  // ===== JUMP & AIRBORNE STATE =====
  if (isJumping || jumpHeight > 0.02) {
    // Athletic jump pose with flexed knees and balanced arms
    if (leftArm) {
      leftArm.rotation.x = -0.58;
      leftArm.rotation.z = 0.38;
      leftArm.rotation.y = 0;
    }
    if (rightArm) {
      rightArm.rotation.x = -0.58;
      rightArm.rotation.z = -0.38;
      rightArm.rotation.y = 0;
    }
    if (leftForearm) leftForearm.rotation.x = 0.42;
    if (rightForearm) rightForearm.rotation.x = 0.42;

    // Knees tucked up during flight
    if (leftLeg) {
      leftLeg.rotation.x = 0.48;
      leftLeg.rotation.z = -0.06;
    }
    if (rightLeg) {
      rightLeg.rotation.x = 0.38;
      rightLeg.rotation.z = 0.06;
    }
    if (leftLowerLeg) leftLowerLeg.rotation.x = -0.58;
    if (rightLowerLeg) rightLowerLeg.rotation.x = -0.42;

    // Ankle flex during air
    if (leftFoot) leftFoot.rotation.x = 0.15;
    if (rightFoot) rightFoot.rotation.x = 0.10;

    if (torso) {
      torso.rotation.x = 0.12;
      torso.rotation.y = 0;
      torso.rotation.z = data.bankAngle;
    }
    if (headGroup) {
      headGroup.rotation.x = -0.08;
      headGroup.rotation.y = 0;
    }
    if (bodyRoot) {
      bodyRoot.position.y = 0;
      bodyRoot.rotation.z = 0;
    }

    group.position.y = groundHeight + jumpHeight + data.waterDepth;
  }
  // ===== LOCOMOTION STATE (WALK / RUN / STRAFE / BACKPEDAL) =====
  else if (speed > 0.02) {
    // Dynamic cadence: smooth curve from walk (~7.0 rad/s) to full sprint (~12.8 rad/s)
    const animFreq = 7.0 + speed * 5.8;
    const strideDir = isBackpedal ? -1 : 1;
    data.walkTime += deltaTime * animFreq * strideDir;
    const t = data.walkTime;

    // Amplitudes scale smoothly with speed
    const armAmp = (0.34 + speed * 0.38);
    const legAmp = (0.30 + speed * 0.34);

    // Sinusoidal leg phase
    const leftPhase = Math.sin(t);
    const rightPhase = -Math.sin(t);

    if (leftLeg) {
      leftLeg.rotation.x = -leftPhase * legAmp;
      leftLeg.rotation.z = isStrafing ? (strafeRatio * 0.08 - 0.04) : 0;
    }
    if (rightLeg) {
      rightLeg.rotation.x = -rightPhase * legAmp;
      rightLeg.rotation.z = isStrafing ? (strafeRatio * 0.08 + 0.04) : 0;
    }

    // Natural knee flexion during backswing & stride lift
    if (leftLowerLeg) {
      if (isBackpedal) {
        leftLowerLeg.rotation.x = leftPhase < 0 ? leftPhase * 0.55 : -0.04;
      } else {
        leftLowerLeg.rotation.x = leftPhase > 0 ? -leftPhase * (0.65 + speed * 0.22) : -0.04;
      }
    }
    if (rightLowerLeg) {
      if (isBackpedal) {
        rightLowerLeg.rotation.x = rightPhase < 0 ? rightPhase * 0.55 : -0.04;
      } else {
        rightLowerLeg.rotation.x = rightPhase > 0 ? -rightPhase * (0.65 + speed * 0.22) : -0.04;
      }
    }

    // Ankle articulation: heel-strike dorsiflexion, flat stance, toe push-off
    if (leftFoot) {
      if (isBackpedal) {
        leftFoot.rotation.x = leftPhase > 0 ? 0.22 : -0.15;
      } else {
        leftFoot.rotation.x = leftPhase < -0.2 ? -0.25 : (leftPhase > 0.3 ? 0.20 : 0.0);
      }
    }
    if (rightFoot) {
      if (isBackpedal) {
        rightFoot.rotation.x = rightPhase > 0 ? 0.22 : -0.15;
      } else {
        rightFoot.rotation.x = rightPhase < -0.2 ? -0.25 : (rightPhase > 0.3 ? 0.20 : 0.0);
      }
    }

    // Alternating arm swing with counter-elbow flexion
    if (leftArm) {
      leftArm.rotation.x = Math.sin(t) * armAmp;
      leftArm.rotation.z = 0.08 + Math.sin(t * 0.5) * 0.04;
    }
    if (rightArm) {
      rightArm.rotation.x = -Math.sin(t) * armAmp;
      rightArm.rotation.z = -0.08 - Math.sin(t * 0.5) * 0.04;
    }

    if (leftForearm) {
      leftForearm.rotation.x = Math.max(0.12, Math.sin(t) * 0.48 + 0.24);
    }
    if (rightForearm) {
      rightForearm.rotation.x = Math.max(0.12, -Math.sin(t) * 0.48 + 0.24);
    }

    // Spine & Torso: forward lean, counter-twist, and turn banking
    if (torso) {
      const forwardLean = isBackpedal ? -0.04 : (0.05 + speed * 0.12);
      torso.rotation.x = forwardLean;
      torso.rotation.y = Math.sin(t) * (0.06 * speed);
      torso.rotation.z = data.bankAngle + (isStrafing ? -strafeRatio * 0.06 : 0);
    }

    // Pelvis roll and yaw following footsteps
    if (pelvis) {
      pelvis.rotation.y = -Math.sin(t) * (0.07 * speed);
      pelvis.rotation.z = Math.cos(t) * (0.035 * speed) + (isStrafing ? -strafeRatio * 0.08 : 0);
    }

    // Head stabilization glance
    if (headGroup) {
      headGroup.rotation.x = -speed * 0.035;
      headGroup.rotation.y = -Math.sin(t) * (0.03 * speed);
    }

    // Dual-peak vertical bobbing per stride
    const bobHeight = 0.024 + speed * 0.036;
    const bobY = Math.abs(Math.sin(t * 2)) * bobHeight;

    if (bodyRoot) {
      bodyRoot.position.y = landingSquatY;
    }
    group.position.y = groundHeight + data.waterDepth + bobY + landingSquatY;
  }
  // ===== IDLE STATE (NATURAL BREATHING, WEIGHT SHIFT & ENVIRONMENT GLANCE) =====
  else {
    const resetRate = Math.min(1, 11 * deltaTime);
    data.idleTime = (data.idleTime || 0) + deltaTime;

    // Organic breathing cycle (2.8s period)
    const breath = Math.sin(data.idleTime * 2.25) * 0.018;

    // Subtle natural weight shift (6.0s period)
    const weightShift = Math.sin(data.idleTime * 0.65) * 0.035;

    // Arms relax and breathe with chest
    if (leftArm) {
      leftArm.rotation.x *= (1 - resetRate);
      leftArm.rotation.y *= (1 - resetRate);
      leftArm.rotation.z = (leftArm.rotation.z * (1 - resetRate)) + 0.07 + breath * 0.04;
    }
    if (rightArm) {
      rightArm.rotation.x *= (1 - resetRate);
      rightArm.rotation.y *= (1 - resetRate);
      rightArm.rotation.z = (rightArm.rotation.z * (1 - resetRate)) - 0.07 - breath * 0.04;
    }
    if (leftForearm) leftForearm.rotation.x = (leftForearm.rotation.x * (1 - resetRate)) + 0.08;
    if (rightForearm) rightForearm.rotation.x = (rightForearm.rotation.x * (1 - resetRate)) + 0.08;

    // Legs settle smoothly to grounded stance
    if (leftLeg) {
      leftLeg.rotation.x *= (1 - resetRate);
      leftLeg.rotation.z = (leftLeg.rotation.z * (1 - resetRate)) - 0.02;
    }
    if (rightLeg) {
      rightLeg.rotation.x *= (1 - resetRate);
      rightLeg.rotation.z = (rightLeg.rotation.z * (1 - resetRate)) + 0.02;
    }
    if (leftLowerLeg) leftLowerLeg.rotation.x *= (1 - resetRate);
    if (rightLowerLeg) rightLowerLeg.rotation.x *= (1 - resetRate);
    if (leftFoot) leftFoot.rotation.x *= (1 - resetRate);
    if (rightFoot) rightFoot.rotation.x *= (1 - resetRate);

    // Pelvis & Torso weight shift & breathing
    if (pelvis) {
      pelvis.rotation.y *= (1 - resetRate);
      pelvis.rotation.z = (pelvis.rotation.z * (1 - resetRate)) + weightShift;
    }
    if (torso) {
      torso.rotation.x = (torso.rotation.x * (1 - resetRate)) + breath * 0.02;
      torso.rotation.y *= (1 - resetRate);
      torso.rotation.z = (torso.rotation.z * (1 - resetRate)) - weightShift * 0.75;
    }

    // Natural environment glance: observant explorer surveying the island
    if (headGroup) {
      headGroup.rotation.x = Math.sin(data.idleTime * 0.95) * 0.025;
      headGroup.rotation.y = Math.sin(data.idleTime * 0.45) * 0.075;
    }

    if (bodyRoot) {
      bodyRoot.position.y = landingSquatY;
    }
    group.position.y = groundHeight + data.waterDepth + breath * 0.014 + landingSquatY;
  }

  // ===== DAMAGE FLASH & FLINCH RECOIL =====
  if (data.damageTimer > 0) {
    data.damageTimer -= deltaTime;
    const isFlashing = Math.floor(data.damageTimer * 22) % 2 === 0;

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

    // Dynamic impact recoil
    if (torso) {
      torso.rotation.x -= 0.16 * (data.damageTimer / 0.38);
    }
    if (headGroup) {
      headGroup.rotation.x -= 0.12 * (data.damageTimer / 0.38);
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
  if (headGroup) headGroup.rotation.x = -p * 0.25;
  const torso = group.getObjectByName('torso');
  if (torso) torso.rotation.x = -p * 0.18;
  const leftArm = group.getObjectByName('leftArm');
  const rightArm = group.getObjectByName('rightArm');
  if (leftArm) leftArm.rotation.z = p * 0.85;
  if (rightArm) rightArm.rotation.z = -p * 0.85;

  group.position.y -= p * 0.04;

  if (p >= 1.0) {
    group.visible = false;
  }
}
