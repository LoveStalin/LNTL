import * as THREE from 'three';

const canvas = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9eae9f');
scene.fog = new THREE.Fog('#9eae9f', 38, 93);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 130);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight('#e9f1db', '#495449', 2.05));
const sun = new THREE.DirectionalLight('#fff2d5', 3.2);
sun.position.set(-15, 25, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.normalBias = .035;
scene.add(sun);

const mats = {
  earth: new THREE.MeshStandardMaterial({ color: '#737c65', roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: '#aaa99c', roughness: .93 }),
  slab: new THREE.MeshStandardMaterial({ color: '#bdbbad', roughness: .95 }),
  wall: new THREE.MeshStandardMaterial({ color: '#c4bba5', roughness: .92 }),
  wallShadow: new THREE.MeshStandardMaterial({ color: '#998f7d', roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: '#77796e', roughness: 1 }),
  trim: new THREE.MeshStandardMaterial({ color: '#4c554a', roughness: .9 }),
  window: new THREE.MeshStandardMaterial({ color: '#688078', roughness: .3, metalness: .1, emissive: '#273934', emissiveIntensity: .3, transparent: true, opacity: .52, side: THREE.DoubleSide }),
  door: new THREE.MeshStandardMaterial({ color: '#59604f', roughness: .93 }),
  metal: new THREE.MeshStandardMaterial({ color: '#505950', roughness: .72, metalness: .18 }),
  crate: new THREE.MeshStandardMaterial({ color: '#847a61', roughness: 1 }),
  foliage: new THREE.MeshStandardMaterial({ color: '#52644a', roughness: 1 }),
  foliageLight: new THREE.MeshStandardMaterial({ color: '#6f7954', roughness: 1 }),
  uniform: new THREE.MeshStandardMaterial({ color: '#454d3d', roughness: .92 }),
  vest: new THREE.MeshStandardMaterial({ color: '#303a30', roughness: .88 }),
  fabric: new THREE.MeshStandardMaterial({ color: '#71775e', roughness: .95 }),
  skin: new THREE.MeshStandardMaterial({ color: '#b58565', roughness: .85 }),
  helmet: new THREE.MeshStandardMaterial({ color: '#303b31', roughness: .68 }),
  accent: new THREE.MeshStandardMaterial({ color: '#bdc396', roughness: .85 })
};
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
function cube(parent, material, x, y, z, sx, sy, sz, shadow = true) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, material, x, y, z, radiusTop, radiusBottom, height, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

cube(scene, mats.earth, 0, -.34, 0, 100, .65, 100, false);
cube(scene, mats.concrete, 0, .005, 0, 21, .16, 24, false);
for (let x = -9; x <= 9; x += 3) {
  for (let z = -10.5; z <= 10.5; z += 3) cube(scene, mats.slab, x, .095, z, 2.93, .035, 2.93, false);
}
for (let z = -10; z <= 10; z += 5) cube(scene, mats.wallShadow, 0, .12, z, 20, .025, .045, false);

const collisionBoxes = [];
const houseFloors = [];
function addCollisionBox(x, z, width, depth, bottom = 0, top = 3) {
  collisionBoxes.push({ x, z, halfX: width / 2, halfZ: depth / 2, bottom, top });
}
function addWorldCollisionBox(x, z, width, depth, bottom = 0, top = 3) {
  addCollisionBox(x, z, width, depth, bottom, top);
}

function createHouse(x, facing) {
  const house = new THREE.Group();
  house.position.set(x, 0, 0);
  scene.add(house);
  const firstFloorY = .12;
  const secondFloorY = 3.35;
  const faceX = facing * 4;
  const wallDepth = .24;
  const frontPoint = (localX) => x + localX;
  const wall = (localX, y, z, sx, sy, sz, material = mats.wall, collides = true) => {
    cube(house, material, localX, y, z, sx, sy, sz);
    if (collides) addCollisionBox(frontPoint(localX), z, sx, sz, y - sy / 2, y + sy / 2);
  };
  const furnishedBox = (material, localX, y, z, sx, sy, sz) => wall(localX, y, z, sx, sy, sz, material, true);
  const addWindow = (orientation, localX, localZ, y, width, height) => {
    const sillY = y - height / 2;
    if (orientation === 'front') {
      cube(house, mats.window, localX, y, localZ, .07, height, width, false);
      addCollisionBox(frontPoint(localX), localZ, .1, width, sillY, y + height / 2);
      for (const zOffset of [-width / 2, width / 2]) cube(house, mats.trim, localX + facing * .055, y, localZ + zOffset, .11, height + .1, .07);
      for (const yOffset of [-height / 2, height / 2]) cube(house, mats.trim, localX + facing * .06, y + yOffset, localZ, .12, .07, width + .08);
      cube(house, mats.trim, localX + facing * .07, y, localZ, .12, .045, width, false);
    } else if (orientation === 'back') {
      cube(house, mats.window, localX, y, localZ, .07, height, width, false);
      addCollisionBox(frontPoint(localX), localZ, .1, width, sillY, y + height / 2);
      for (const zOffset of [-width / 2, width / 2]) cube(house, mats.trim, localX - facing * .055, y, localZ + zOffset, .11, height + .1, .07);
      for (const yOffset of [-height / 2, height / 2]) cube(house, mats.trim, localX - facing * .06, y + yOffset, localZ, .12, .07, width + .08);
      cube(house, mats.trim, localX - facing * .07, y, localZ, .12, .045, width, false);
    } else {
      const sideZ = localZ;
      cube(house, mats.window, localX, y, sideZ, width, height, .07, false);
      addCollisionBox(frontPoint(localX), sideZ, width, .1, sillY, y + height / 2);
      for (const xOffset of [-width / 2, width / 2]) cube(house, mats.trim, localX + xOffset, y, sideZ, .07, height + .1, .11);
      for (const yOffset of [-height / 2, height / 2]) cube(house, mats.trim, localX, y + yOffset, sideZ, width + .08, .07, .12);
      cube(house, mats.trim, localX, y, sideZ, .045, .045, .12, false);
    }
  };

  // Ground floor slab; the front door is a real opening in the wall.
  cube(house, mats.wallShadow, 0, firstFloorY, 0, 8, .24, 7);

  function buildFrontLevel(bottom, height, hasWindows = true) {
    const top = bottom + height;
    const doorHeight = 2.3;
    const windowWidth = 1.18;
    const windowY = bottom + 1.92;
    const wallZRanges = [[-3.5, -2.92], [-1.56, -1.32], [1.32, 1.56], [2.92, 3.5]];
    for (const [z1, z2] of wallZRanges) wall(faceX, bottom + height / 2, (z1 + z2) / 2, wallDepth, height, z2 - z1);
    wall(faceX, (bottom + doorHeight + top) / 2, 0, wallDepth, top - bottom - doorHeight, 1.64);
    for (const z of [-2.22, 2.22]) {
      const lowerTop = windowY - .67;
      const upperBottom = windowY + .67;
      wall(faceX, (bottom + lowerTop) / 2, z, wallDepth, lowerTop - bottom, windowWidth);
      if (hasWindows) addWindow('front', faceX, z, windowY, windowWidth, 1.28);
      else wall(faceX, windowY, z, wallDepth, 1.34, windowWidth);
      wall(faceX, (upperBottom + top) / 2, z, wallDepth, top - upperBottom, windowWidth);
    }
    // Open door leaf swung inward, plus its frame and handle.
    const hinge = new THREE.Group();
    hinge.position.set(faceX - facing * .14, bottom, -.76);
    hinge.rotation.y = facing * -1.48;
    house.add(hinge);
    cube(hinge, mats.door, 0, doorHeight / 2, .62, .09, doorHeight, 1.24);
    cylinder(hinge, mats.accent, facing * .06, 1.08, 1.08, .035, .035, .05, 8).rotation.x = Math.PI / 2;
    for (const z of [-.82, .82]) cube(house, mats.trim, faceX + facing * .12, bottom + doorHeight / 2, z, .13, doorHeight, .12);
    cube(house, mats.trim, faceX + facing * .12, bottom + doorHeight, 0, .14, .12, 1.75);
  }

  buildFrontLevel(.22, 3.02, true);
  buildFrontLevel(secondFloorY + .12, 3.05, true);

  // Back wall with real window openings.
  for (const bottom of [.22, secondFloorY + .12]) {
    const height = 3.02;
    const centerY = bottom + 1.92;
    const backX = -faceX;
    for (const range of [[-3.5, -2.92], [-1.55, -1.25], [-1.25, 1.25], [1.25, 1.55], [2.92, 3.5]]) {
      wall(backX, bottom + height / 2, (range[0] + range[1]) / 2, wallDepth, height, range[1] - range[0]);
    }
    for (const z of [-2.2, 2.2]) {
      wall(backX, (bottom + centerY - .66) / 2, z, wallDepth, centerY - .66 - bottom, 1.34);
      addWindow('back', backX, z, centerY, 1.18, 1.28);
      wall(backX, (centerY + .66 + bottom + height) / 2, z, wallDepth, bottom + height - centerY - .66, 1.34);
    }
  }

  // Side walls: windows let daylight into the interior without leaving walk-through gaps.
  for (const sideZ of [-3.5, 3.5]) {
    for (const bottom of [.22, secondFloorY + .12]) {
      const height = 3.02;
      const centerY = bottom + 1.92;
      const windowX = -facing * .9;
      wall((-4 + windowX - .65) / 2, bottom + height / 2, sideZ, windowX - .65 + 4, height, wallDepth);
      wall((windowX + .65 + 4) / 2, bottom + height / 2, sideZ, 4 - windowX - .65, height, wallDepth);
      wall(windowX - 1.2, (bottom + centerY - .66) / 2, sideZ, 1.1, centerY - .66 - bottom, wallDepth);
      wall(windowX + 1.2, (bottom + centerY - .66) / 2, sideZ, 1.1, centerY - .66 - bottom, wallDepth);
      addWindow('side', windowX, sideZ, centerY, 1.3, 1.28);
      wall(windowX, (centerY + .66 + bottom + height) / 2, sideZ, 1.3, bottom + height - centerY - .66, wallDepth);
    }
  }

  // Upper floor split around the stairwell, with an open balcony outside the front entrance.
  wall(-2.45, secondFloorY, 0, 2.9, .22, 6.45, mats.slab, false);
  wall(2.45, secondFloorY, 0, 2.9, .22, 6.45, mats.slab, false);
  wall(0, secondFloorY, -2.85, 2.0, .22, .75, mats.slab, false);
  wall(0, secondFloorY, 3.12, 2.0, .22, .2, mats.slab, false);
  houseFloors.push({ x, facing, floorY: secondFloorY, frontX: faceX });
  const balconyX = faceX + facing * 1.2;
  wall(balconyX, secondFloorY + .03, 0, 2.2, .16, 3.65, mats.slab, false);
  for (const z of [-1.78, 1.78]) {
    for (const postX of [faceX + facing * .28, faceX + facing * 1.15, faceX + facing * 2.18]) {
      wall(postX, 4.02, z, .1, .95, .1, mats.metal);
    }
    wall(balconyX, 4.48, z, 2.2, .07, .07, mats.metal);
    wall(balconyX, 3.72, z, 2.2, .07, .07, mats.metal);
  }
  for (const z of [-1.78, -1, 0, 1, 1.78]) wall(faceX + facing * 2.22, 4.02, z, .1, .95, .1, mats.metal);
  wall(faceX + facing * 2.22, 4.48, 0, .1, .07, 3.65, mats.metal);
  wall(faceX + facing * 2.22, 3.72, 0, .1, .07, 3.65, mats.metal);

  // Exterior shell edges, roof and simple parapet.
  wall(0, 6.62, -3.5, 8.1, .25, .28, mats.trim);
  wall(0, 6.62, 3.5, 8.1, .25, .28, mats.trim);
  wall(-4, 6.62, 0, .28, .25, 7.0, mats.trim);
  wall(4, 6.62, 0, .28, .25, 7.0, mats.trim);
  cube(house, mats.roof, 0, 6.78, 0, 8.1, .18, 7.1);

  // Walkable stair ramp with visible steps and rails.
  const stairStartZ = 2.45;
  const stairEndZ = -2.65;
  const stairSteps = 12;
  for (let step = 0; step < stairSteps; step++) {
    const t = (step + 1) / stairSteps;
    const z = stairStartZ + (stairEndZ - stairStartZ) * t;
    const y = .22 + (secondFloorY - .22) * t;
    cube(house, mats.trim, 0, y, z, 1.34, .13, .46);
    for (const railX of [-.76, .76]) {
      cube(house, mats.metal, railX, y + .43, z, .07, .86, .07);
    }
  }
  for (const railX of [-.76, .76]) {
    const rail = cube(house, mats.metal, railX, 1.83, -.1, .07, .07, 5.0);
    rail.rotation.x = -.56;
  }
  houseFloors[houseFloors.length - 1].stairs = { x, minZ: stairEndZ, maxZ: stairStartZ, yLow: .22, yHigh: secondFloorY };

  // Ordinary furnishing, kept out of the doorway and central stairs.
  furnishedBox(mats.fabric, -facing * 2.45, .58, -2.3, 1.75, .72, 1.05);
  furnishedBox(mats.trim, -facing * 2.45, 1.12, -2.3, 1.82, .16, 1.1);
  for (const legX of [-.65, .65]) for (const legZ of [-.38, .38]) furnishedBox(mats.metal, -facing * 2.45 + legX, .27, -2.3 + legZ, .08, .54, .08);
  furnishedBox(mats.trim, facing * 2.4, .48, -2.2, .8, .82, .62);
  furnishedBox(mats.fabric, facing * 2.4, .92, -2.2, .85, .1, .68);
  furnishedBox(mats.trim, -facing * 2.45, 3.95, .05, 1.55, .95, .62);
  furnishedBox(mats.fabric, -facing * 2.45, 4.48, .05, 1.58, .12, .65);
  furnishedBox(mats.trim, facing * 2.55, 4.02, -2.65, .65, 1.35, 1.6);
  for (const shelfY of [3.62, 4.02, 4.42]) furnishedBox(mats.wallShadow, facing * 2.55, shelfY, -2.65, .68, .06, 1.58);
}
createHouse(-14.7, 1);
createHouse(14.7, -1);

for (const [x, z, size] of [
  [-10.5, -7.8, 1.45], [10.5, 7.8, 1.45], [-10.3, 7.2, 1.15], [10.3, -7.1, 1.15]
]) {
  cube(scene, mats.crate, x, size / 2, z, size, size, size);
  addWorldCollisionBox(x, z, size, size, 0, size);
  for (const offset of [-.28, .28]) cube(scene, mats.wallShadow, x + offset, size / 2, z + size / 2 + .014, .055, size * .92, .03);
  cube(scene, mats.trim, x, size * .72, z, size * 1.03, .07, size * 1.03);
}
for (const [x, z, scale] of [[-23,-13,1.1],[22,-14,1.25],[-25,12,1.35],[25,13,1.1],[-8,17,.8],[8,-18,.9],[-21,3,.95],[22,-2,1.1]]) {
  cylinder(scene, mats.wallShadow, x, .65 * scale, z, .18 * scale, .26 * scale, 1.3 * scale, 7);
  addWorldCollisionBox(x, z, .52 * scale, .52 * scale, 0, 1.3 * scale);
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 * scale, 1), Math.random() > .5 ? mats.foliage : mats.foliageLight);
  crown.position.set(x, 1.65 * scale, z);
  crown.scale.set(1.1, 1.25, 1.05);
  crown.castShadow = true;
  scene.add(crown);
  const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(.8 * scale, 1), mats.foliage);
  crown2.position.set(x + .46 * scale, 2.05 * scale, z - .34 * scale);
  crown2.castShadow = true;
  scene.add(crown2);
}
for (const [x, z] of [[-10.7, 5.4], [10.7, -5.4]]) {
  cube(scene, mats.wallShadow, x, .52, z, .5, 1.04, 4.4);
  addWorldCollisionBox(x, z, .5, 4.4, 0, 1.04);
  for (let stripe = -1.5; stripe <= 1.5; stripe += .75) cube(scene, mats.accent, x, .52, z + stripe, .53, .13, .32);
}

const playerRadius = .34;
const playerHeight = 1.62;
function canOccupy(x, z, feetY) {
  for (const box of collisionBoxes) {
    if (feetY >= box.top || feetY + playerHeight <= box.bottom) continue;
    const closestX = THREE.MathUtils.clamp(x, box.x - box.halfX, box.x + box.halfX);
    const closestZ = THREE.MathUtils.clamp(z, box.z - box.halfZ, box.z + box.halfZ);
    if (Math.hypot(x - closestX, z - closestZ) < playerRadius) return false;
  }
  return true;
}

function getSurfaceAt(x, z, feetY) {
  for (const house of houseFloors) {
    const localX = x - house.x;
    const inHouse = Math.abs(localX) <= 4.05 && Math.abs(z) <= 3.18;
    const onBalcony = (localX - house.frontX) * house.facing >= -.15 &&
      (localX - house.frontX) * house.facing <= 2.35 && Math.abs(z) <= 1.75;
    const stairs = house.stairs;
    if (inHouse && Math.abs(localX) < .42 && z >= stairs.minZ && z <= stairs.maxZ) {
      const amount = (stairs.maxZ - z) / (stairs.maxZ - stairs.minZ);
      return { height: THREE.MathUtils.lerp(stairs.yLow, stairs.yHigh, amount), ramp: true };
    }
    const upperLanding = inHouse && Math.abs(localX) < .95 && z <= stairs.minZ + .12;
    if (feetY > 1.5 && ((inHouse && Math.abs(localX) >= .82) || onBalcony || upperLanding)) {
      return { height: house.floorY, ramp: false };
    }
  }
  return { height: groundLevel, ramp: false };
}

const player = new THREE.Group();
player.position.set(0, .1, 8.4);
scene.add(player);
let yaw = -.85;
let pitch = -.025;
player.add(camera);
camera.position.set(0, 1.68, 0);
camera.rotation.order = 'YXZ';

const viewModel = new THREE.Group();
camera.add(viewModel);
cube(viewModel, mats.uniform, .43, -.49, -.48, .22, .24, .62, false).rotation.z = -.28;
cube(viewModel, mats.uniform, -.32, -.52, -.43, .22, .23, .62, false).rotation.z = .35;
cube(viewModel, mats.vest, .34, -.34, -.83, .2, .16, .22, false);
cube(viewModel, mats.vest, -.05, -.34, -.82, .2, .16, .22, false);
const weaponModel = new THREE.Group();
viewModel.add(weaponModel);
const weapons = [
  { name: 'CARBINE', category: 'Rifles', cost: 0, cooldown: .16, velocity: 75, recoil: .16, owned: true },
  { name: 'S1897', category: 'Shotguns', cost: 2_400, cooldown: .72, velocity: 58, recoil: .78 },
  { name: 'S686', category: 'Shotguns', cost: 3_200, cooldown: .48, velocity: 62, recoil: .68 },
  { name: 'UMP45', category: 'SMGs', cost: 2_800, cooldown: .13, velocity: 68, recoil: .2 },
  { name: 'UZI', category: 'SMGs', cost: 2_200, cooldown: .075, velocity: 62, recoil: .16 },
  { name: 'M416', category: 'Rifles', cost: 4_500, cooldown: .105, velocity: 82, recoil: .18 },
  { name: 'AKM', category: 'Rifles', cost: 4_000, cooldown: .19, velocity: 90, recoil: .32 },
  { name: 'M24', category: 'Sniper Rifles', cost: 6_000, cooldown: .8, velocity: 115, recoil: .68 },
  { name: 'Kar98k', category: 'Sniper Rifles', cost: 5_500, cooldown: .95, velocity: 108, recoil: .76 },
  { name: 'AWM', category: 'Sniper Rifles', cost: 9_000, cooldown: 1.1, velocity: 135, recoil: .9 },
  { name: 'PKM', category: 'Heavy Weapons', cost: 7_500, cooldown: .12, velocity: 88, recoil: .16 },
  { name: 'M249', category: 'Heavy Weapons', cost: 8_500, cooldown: .085, velocity: 84, recoil: .13 },
  { name: 'P1911', category: 'Pistols', cost: 1_200, cooldown: .3, velocity: 65, recoil: .28 },
  { name: 'P92', category: 'Pistols', cost: 1_000, cooldown: .24, velocity: 62, recoil: .22 },
  { name: 'P18C', category: 'Pistols', cost: 1_600, cooldown: .1, velocity: 60, recoil: .12 },
  { name: 'Desert Eagle', category: 'Pistols', cost: 3_500, cooldown: .42, velocity: 92, recoil: .58 },
  { name: 'Sawed-off', category: 'Pistols', cost: 2_600, cooldown: .56, velocity: 55, recoil: .72 }
];
let savedWeapons = [];
try {
  const storedWeapons = JSON.parse(localStorage.getItem('outpost-owned-weapons') || '[]');
  if (Array.isArray(storedWeapons)) savedWeapons = storedWeapons;
} catch {
  savedWeapons = [];
}
const ownedWeapons = new Set([
  ...weapons.filter((weapon) => weapon.owned).map((weapon) => weapon.name),
  ...savedWeapons.filter((name) => weapons.some((weapon) => weapon.name === name))
]);
const weaponCategories = ['Shotguns', 'SMGs', 'Rifles', 'Sniper Rifles', 'Heavy Weapons', 'Pistols'];
const categoryLabels = {
  'Shotguns': 'SHOTGUNS',
  'SMGs': 'SUBMACHINE GUNS',
  'Rifles': 'RIFLES',
  'Sniper Rifles': 'SNIPER RIFLES',
  'Heavy Weapons': 'HEAVY WEAPONS',
  'Pistols': 'PISTOLS'
};

function buildWeaponModel(weapon) {
  const pistol = weapon.category === 'Pistols';
  const shotgun = weapon.category === 'Shotguns' || weapon.name === 'Sawed-off';
  const sniper = weapon.category === 'Sniper Rifles';
  const heavy = weapon.category === 'Heavy Weapons';
  const smg = weapon.category === 'SMGs';
  const bodyWidth = pistol ? .16 : heavy ? .25 : shotgun ? .21 : .19;
  const bodyHeight = pistol ? .18 : heavy ? .22 : .16;
  const bodyLength = pistol ? .35 : sniper || heavy ? .62 : shotgun ? .48 : .43;
  cube(weaponModel, mats.metal, .24, -.22, -.8, bodyWidth, bodyHeight, bodyLength, false);
  cube(weaponModel, mats.trim, .24, -.22, -1.08, pistol ? .12 : .15, .12, sniper || heavy ? .5 : .34, false);
  cube(weaponModel, mats.metal, .24, -.2, sniper ? -1.64 : shotgun ? -1.48 : -1.4, sniper ? .045 : shotgun ? .075 : .05, sniper ? .045 : shotgun ? .075 : .05, sniper ? .72 : shotgun ? .42 : .36, false);
  cube(weaponModel, mats.metal, .24, pistol ? -.4 : -.43, -.81, pistol ? .11 : .13, pistol ? .24 : .3, pistol ? .13 : .16, false);
  if (!pistol) {
    cube(weaponModel, mats.trim, .24, -.08, -.78, .09, .09, .22, false);
    if (heavy) cube(weaponModel, mats.metal, .24, -.48, -1.06, .14, .22, .22, false);
    else if (smg) cube(weaponModel, mats.trim, .24, -.4, -.8, .12, .24, .13, false);
    else if (shotgun) cube(weaponModel, mats.trim, .24, -.17, -1.03, .13, .09, .27, false);
    else cube(weaponModel, mats.metal, .24, -.34, -.78, .11, .2, .14, false);
  }
  cube(weaponModel, mats.accent, .24, -.08, -.68, .07, .025, .08, false);
}

let selectedWeapon = 0;
const weaponLabel = document.querySelector('#weapon-label');
const weaponButton = document.querySelector('#weapon-toggle');
const armory = document.querySelector('#armory');
const armoryCategories = document.querySelector('#armory-categories');
const armoryStatus = document.querySelector('#armory-status');
const scopeOverlay = document.querySelector('#scope-overlay');
let armoryOpen = false;
let aiming = false;

function updateAimUI() {
  const scoped = aiming && weapons[selectedWeapon].category === 'Sniper Rifles';
  document.body.classList.toggle('scope-active', scoped);
  scopeOverlay.setAttribute('aria-hidden', String(!scoped));
}

function selectWeapon(index) {
  if (!weapons[index] || !ownedWeapons.has(weapons[index].name)) return;
  selectedWeapon = index;
  weaponModel.clear();
  weaponModel.position.set(0, 0, 0);
  buildWeaponModel(weapons[selectedWeapon]);
  const ownedIndex = weapons.filter((weapon) => ownedWeapons.has(weapon.name)).findIndex((weapon) => weapon.name === weapons[selectedWeapon].name);
  const label = `${ownedIndex + 1} / ${weapons[selectedWeapon].name}`;
  weaponLabel.textContent = label;
  armoryStatus.textContent = `${weapons[selectedWeapon].name} ĐANG ĐƯỢC TRANG BỊ`;
  updateAimUI();
  renderArmory();
}

function renderArmory() {
  armoryCategories.replaceChildren();
  for (const category of weaponCategories) {
    const section = document.createElement('section');
    section.className = 'armory-category';
    const heading = document.createElement('h3');
    heading.textContent = categoryLabels[category];
    const items = weapons.filter((weapon) => weapon.category === category);
    const count = document.createElement('span');
    count.textContent = `${items.length} ITEMS`;
    heading.append(count);
    section.append(heading);
    const list = document.createElement('div');
    list.className = 'armory-list';
    for (const weapon of items) {
      const card = document.createElement('article');
      card.className = `weapon-card${weapons[selectedWeapon].name === weapon.name ? ' equipped' : ''}`;
      card.dataset.category = category;
      const icon = document.createElement('span');
      icon.className = 'weapon-icon';
      icon.setAttribute('aria-hidden', 'true');
      const info = document.createElement('span');
      info.className = 'weapon-info';
      const name = document.createElement('strong');
      name.className = 'weapon-name';
      name.textContent = weapon.name;
      const meta = document.createElement('span');
      meta.className = 'weapon-meta';
      meta.textContent = `${Math.round(60 / weapon.cooldown)} RPM · $${weapon.cost.toLocaleString('en-US')}`;
      info.append(name, meta);
      const button = document.createElement('button');
      button.className = 'weapon-action';
      button.type = 'button';
      button.dataset.weapon = weapon.name;
      const isOwned = ownedWeapons.has(weapon.name);
      const isEquipped = weapons[selectedWeapon].name === weapon.name;
      button.textContent = isEquipped ? 'ĐANG DÙNG' : isOwned ? 'TRANG BỊ' : `MUA · $${weapon.cost.toLocaleString('en-US')}`;
      button.disabled = isEquipped;
      card.append(icon, info, button);
      list.append(card);
    }
    section.append(list);
    armoryCategories.append(section);
  }
}

function openArmory(open) {
  armoryOpen = open;
  armory.classList.toggle('hidden', !open);
  armory.setAttribute('aria-hidden', String(!open));
  shooting = false;
  aiming = false;
  updateAimUI();
  keys.clear();
  if (open && document.pointerLockElement) document.exitPointerLock();
  canvas.style.cursor = open ? 'default' : (document.pointerLockElement === canvas ? 'none' : 'default');
}

function buyOrEquipWeapon(name) {
  const index = weapons.findIndex((weapon) => weapon.name === name);
  if (index < 0) return;
  const weapon = weapons[index];
  if (!ownedWeapons.has(name)) ownedWeapons.add(name);
  try {
    localStorage.setItem('outpost-owned-weapons', JSON.stringify([...ownedWeapons]));
  } catch {
    // Keep the purchase for the current session when storage is unavailable.
  }
  selectWeapon(index);
  armoryStatus.textContent = `${name} ĐÃ ĐƯỢC TRANG BỊ`;
}

buildWeaponModel(weapons[0]);
renderArmory();

const keys = new Set();
let dragging = false;
let previousPointer = { x: 0, y: 0 };
let started = false;
let shooting = false;
let shotCooldown = 0;
let verticalVelocity = 0;
let grounded = true;
let crouched = false;
const groundLevel = .1;
const bullets = [];
const bulletGeometry = new THREE.CylinderGeometry(.018, .018, .72, 6);
const bulletMaterial = new THREE.MeshStandardMaterial({
  color: '#ffc36b',
  emissive: '#ff7b24',
  emissiveIntensity: 2.2,
  roughness: .35
});

function shoot() {
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.getWorldPosition(origin);
  origin.addScaledVector(direction, .65);
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(origin);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  scene.add(bullet);
  bullets.push({ mesh: bullet, velocity: direction.multiplyScalar(weapons[selectedWeapon].velocity), life: 1.1 });
  const weapon = weapons[selectedWeapon];
  shotCooldown = weapon.cooldown;
  pitch = THREE.MathUtils.clamp(pitch + weapon.recoil * (aiming ? .9 : 1), -.9, 1.35);
  weaponModel.position.y = Math.min(weaponModel.position.y + .05 + weapon.recoil * .18, .5);
  weaponModel.position.z = Math.min(weaponModel.position.z + .055 + weapon.recoil * .1, .3);
}

function rotateCamera(deltaX, deltaY) {
  yaw -= deltaX * .0024;
  pitch = THREE.MathUtils.clamp(pitch - deltaY * .002, -.9, 1.35);
  camera.rotation.x = pitch;
  player.rotation.y = yaw;
}

function toggleCrouch() {
  if (!started || !grounded) return;
  crouched = !crouched;
  document.querySelector('#crouch-toggle').textContent = crouched ? 'ĐỨNG DẬY' : 'NGỒI';
  document.querySelector('#crouch-toggle').setAttribute('aria-pressed', String(crouched));
}

function cycleWeapon(direction) {
  const availableWeapons = weapons.map((weapon, index) => ({ weapon, index })).filter(({ weapon }) => ownedWeapons.has(weapon.name));
  const currentSlot = availableWeapons.findIndex(({ index }) => index === selectedWeapon);
  if (started && !armoryOpen && availableWeapons.length) {
    const next = (currentSlot + direction + availableWeapons.length) % availableWeapons.length;
    selectWeapon(availableWeapons[next].index);
  }
}

function handleArmoryClick(event) {
  const button = event.target.closest('[data-weapon]');
  if (button) buyOrEquipWeapon(button.dataset.weapon);
}

const intro = document.querySelector('#intro');
document.querySelector('#enter').addEventListener('click', () => {
  started = true;
  intro.classList.add('hidden');
  canvas.focus();
});
addEventListener('keydown', (event) => {
  if (event.code === 'KeyB' && started && !event.repeat) {
    event.preventDefault();
    openArmory(!armoryOpen);
    return;
  }
  if (armoryOpen) {
    if (event.code === 'Escape') openArmory(false);
    event.preventDefault();
    return;
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "ControlLeft", "ControlRight"].includes(event.code)) event.preventDefault();
  if (event.code.startsWith('Digit') && Number(event.code.slice(5)) >= 1 && Number(event.code.slice(5)) <= 4) {
    const availableWeapons = weapons.map((weapon, index) => ({ weapon, index })).filter(({ weapon }) => ownedWeapons.has(weapon.name));
    const slot = Number(event.code.slice(5)) - 1;
    if (started && availableWeapons[slot]) selectWeapon(availableWeapons[slot].index);
  }
  if ((event.code === 'KeyC' || event.code === 'ControlLeft' || event.code === 'ControlRight') && !event.repeat) toggleCrouch();
  if (event.code === 'Space' && started && grounded && !event.repeat) {
    verticalVelocity = 6.4;
    grounded = false;
  }
  keys.add(event.code);
});
addEventListener('keyup', (event) => keys.delete(event.code));
document.querySelector('#crouch-toggle').addEventListener('click', toggleCrouch);
weaponButton.addEventListener('click', () => cycleWeapon(1));
armoryCategories.addEventListener('click', handleArmoryClick);
document.querySelector('#armory-close').addEventListener('click', () => openArmory(false));
document.addEventListener('wheel', (event) => {
  if (started && !armoryOpen) {
    event.preventDefault();
    cycleWeapon(event.deltaY > 0 ? 1 : -1);
  }
}, { passive: false });
canvas.addEventListener('pointerdown', (event) => {
  if (!started) return;
  if (event.pointerType === 'mouse' && event.button === 0) {
    shooting = true;
    shoot();
    previousPointer = { x: event.clientX, y: event.clientY };
    if (canvas.requestPointerLock) {
      try {
        canvas.requestPointerLock()?.catch(() => { dragging = true; });
      } catch {
        dragging = true;
      }
    } else {
      dragging = true;
    }
  } else if (event.pointerType !== 'mouse') {
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  } else if (event.pointerType === 'mouse' && event.button === 2) {
    aiming = !aiming;
    updateAimUI();
  }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointermove', (event) => {
  if (!dragging || document.pointerLockElement === canvas) return;
  rotateCamera(event.clientX - previousPointer.x, event.clientY - previousPointer.y);
  previousPointer = { x: event.clientX, y: event.clientY };
});
addEventListener('pointerup', (event) => {
  if (event.pointerType === 'mouse' && event.button === 0) shooting = false;
  dragging = false;
});
canvas.addEventListener('pointercancel', () => {
  dragging = false;
  aiming = false;
  updateAimUI();
});
document.addEventListener('pointerlockchange', () => {
  canvas.style.cursor = document.pointerLockElement === canvas ? 'none' : 'default';
  if (document.pointerLockElement !== canvas) {
    dragging = false;
    shooting = false;
    aiming = false;
    updateAimUI();
  }
});
document.addEventListener('pointerlockerror', () => {
  dragging = true;
  canvas.style.cursor = 'none';
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === canvas) rotateCamera(event.movementX, event.movementY);
});
canvas.style.cursor = 'default';

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const weaponSettle = Math.exp(-delta * 5);
  weaponModel.position.x *= weaponSettle;
  weaponModel.position.y *= weaponSettle;
  weaponModel.position.z *= weaponSettle;
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
  const targetFov = aiming ? (weapons[selectedWeapon].category === 'Sniper Rifles' ? 22 : 50) : 72;
  const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 9, delta);
  if (Math.abs(nextFov - camera.fov) > .01) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
  shotCooldown = Math.max(0, shotCooldown - delta);
  if (started && shooting && shotCooldown <= 0) shoot();

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.mesh.position.addScaledVector(bullet.velocity, delta);
    bullet.life -= delta;
    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  let moveForward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  let moveSide = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const moving = moveForward !== 0 || moveSide !== 0;
  if (moving && started) {
    const length = Math.hypot(moveForward, moveSide);
    moveForward /= length;
    moveSide /= length;
    const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !crouched;
    const speed = crouched ? 2.6 : sprinting ? 8.1 : 4.7;
    const nextX = THREE.MathUtils.clamp(
      player.position.x + (forward.x * moveForward + right.x * moveSide) * speed * delta,
      -24,
      24
    );
    const nextZ = THREE.MathUtils.clamp(
      player.position.z + (forward.z * moveForward + right.z * moveSide) * speed * delta,
      -25,
      25
    );
    if (canOccupy(nextX, player.position.z, player.position.y)) player.position.x = nextX;
    if (canOccupy(player.position.x, nextZ, player.position.y)) player.position.z = nextZ;
  }

  if (started) {
    let surface = getSurfaceAt(player.position.x, player.position.z, player.position.y);
    if (grounded) {
      if (surface.ramp || surface.height >= player.position.y - .55) {
        player.position.y = surface.height;
        verticalVelocity = 0;
      } else {
        grounded = false;
      }
    }
    if (!grounded) {
      verticalVelocity -= 18 * delta;
      player.position.y += verticalVelocity * delta;
      surface = getSurfaceAt(player.position.x, player.position.z, player.position.y);
      if (verticalVelocity <= 0 && player.position.y <= surface.height) {
        player.position.y = surface.height;
        verticalVelocity = 0;
        grounded = true;
      }
    }
  }

  if (moving && started) {
    const bob = grounded && !crouched ? Math.abs(Math.sin(performance.now() * .012)) * .035 : 0;
    camera.position.y += ((crouched ? 1.05 : 1.68) + bob - camera.position.y) * Math.min(1, delta * 12);
    viewModel.position.y = -bob;
  } else {
    camera.position.y += ((crouched ? 1.05 : 1.68) - camera.position.y) * Math.min(1, delta * 12);
    viewModel.position.y += (0 - viewModel.position.y) * Math.min(1, delta * 12);
  }
  document.querySelector('#clock').textContent = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  renderer.render(scene, camera);
}
animate();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
});
