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

function createHouse(x, facing, z = 0, rotationY = 0) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  house.rotation.y = rotationY;
  scene.add(house);
  const firstFloorY = .12;
  const secondFloorY = 3.35;
  const faceX = facing * 4;
  const wallDepth = .24;
  const localToWorld = (localX, localZ) => ({
    x: x + Math.cos(rotationY) * localX + Math.sin(rotationY) * localZ,
    z: z - Math.sin(rotationY) * localX + Math.cos(rotationY) * localZ
  });
  const addHouseCollision = (localX, localZ, width, depth, bottom, top) => {
    const world = localToWorld(localX, localZ);
    const halfTurn = Math.abs(Math.sin(rotationY)) > .5;
    addCollisionBox(world.x, world.z, halfTurn ? depth : width, halfTurn ? width : depth, bottom, top);
  };
  const wall = (localX, y, z, sx, sy, sz, material = mats.wall, collides = true) => {
    cube(house, material, localX, y, z, sx, sy, sz);
    if (collides) addHouseCollision(localX, z, sx, sz, y - sy / 2, y + sy / 2);
  };
  const furnishedBox = (material, localX, y, z, sx, sy, sz) => wall(localX, y, z, sx, sy, sz, material, true);
  const addWindow = (orientation, localX, localZ, y, width, height) => {
    const sillY = y - height / 2;
    if (orientation === 'front') {
      cube(house, mats.window, localX, y, localZ, .07, height, width, false);
      addHouseCollision(localX, localZ, .1, width, sillY, y + height / 2);
      for (const zOffset of [-width / 2, width / 2]) cube(house, mats.trim, localX + facing * .055, y, localZ + zOffset, .11, height + .1, .07);
      for (const yOffset of [-height / 2, height / 2]) cube(house, mats.trim, localX + facing * .06, y + yOffset, localZ, .12, .07, width + .08);
      cube(house, mats.trim, localX + facing * .07, y, localZ, .12, .045, width, false);
    } else if (orientation === 'back') {
      cube(house, mats.window, localX, y, localZ, .07, height, width, false);
      addHouseCollision(localX, localZ, .1, width, sillY, y + height / 2);
      for (const zOffset of [-width / 2, width / 2]) cube(house, mats.trim, localX - facing * .055, y, localZ + zOffset, .11, height + .1, .07);
      for (const yOffset of [-height / 2, height / 2]) cube(house, mats.trim, localX - facing * .06, y + yOffset, localZ, .12, .07, width + .08);
      cube(house, mats.trim, localX - facing * .07, y, localZ, .12, .045, width, false);
    } else {
      const sideZ = localZ;
      cube(house, mats.window, localX, y, sideZ, width, height, .07, false);
      addHouseCollision(localX, sideZ, width, .1, sillY, y + height / 2);
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
  houseFloors.push({ x, z, rotationY, facing, floorY: secondFloorY, frontX: faceX });
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
createHouse(0, 1, -14.7, -Math.PI / 2);
createHouse(0, -1, 14.7, -Math.PI / 2);

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

const safeZoneBounds = { minX: -28.7, maxX: -18.7, minZ: -1.5, maxZ: 1.5, maxHeight: 1.8 };
const safeZoneBaseY = .17;
const safeZoneMaterial = new THREE.MeshBasicMaterial({ color: '#37ff91', transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide });
const safeZone = new THREE.Mesh(
  new THREE.BoxGeometry(
    safeZoneBounds.maxX - safeZoneBounds.minX,
    .08,
    safeZoneBounds.maxZ - safeZoneBounds.minZ
  ),
  safeZoneMaterial
);
safeZone.position.set(
  (safeZoneBounds.minX + safeZoneBounds.maxX) / 2,
  safeZoneBaseY,
  (safeZoneBounds.minZ + safeZoneBounds.maxZ) / 2
);
safeZone.renderOrder = 1;
scene.add(safeZone);
const safeZoneOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(safeZone.geometry),
  new THREE.LineBasicMaterial({ color: '#56ff9e', transparent: true, opacity: .62, depthWrite: false })
);
safeZoneOutline.position.copy(safeZone.position);
safeZoneOutline.renderOrder = 2;
scene.add(safeZoneOutline);

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

function isInSafeZone(position = player.position) {
  return position.y <= safeZoneBounds.maxHeight &&
    position.x >= safeZoneBounds.minX && position.x <= safeZoneBounds.maxX &&
    position.z >= safeZoneBounds.minZ && position.z <= safeZoneBounds.maxZ;
}

function getSurfaceAt(x, z, feetY) {
  for (const house of houseFloors) {
    const worldOffsetX = x - house.x;
    const worldOffsetZ = z - house.z;
    const localX = Math.cos(house.rotationY) * worldOffsetX - Math.sin(house.rotationY) * worldOffsetZ;
    const localZ = Math.sin(house.rotationY) * worldOffsetX + Math.cos(house.rotationY) * worldOffsetZ;
    const inHouse = Math.abs(localX) <= 4.05 && Math.abs(localZ) <= 3.18;
    const onBalcony = (localX - house.frontX) * house.facing >= -.15 &&
      (localX - house.frontX) * house.facing <= 2.35 && Math.abs(localZ) <= 1.75;
    const stairs = house.stairs;
    if (inHouse && Math.abs(localX) < .42 && localZ >= stairs.minZ && localZ <= stairs.maxZ) {
      const amount = (stairs.maxZ - localZ) / (stairs.maxZ - stairs.minZ);
      return { height: THREE.MathUtils.lerp(stairs.yLow, stairs.yHigh, amount), ramp: true };
    }
    const upperLanding = inHouse && Math.abs(localX) < .95 && localZ <= stairs.minZ + .12;
    if (feetY > 1.5 && ((inHouse && Math.abs(localX) >= .82) || onBalcony || upperLanding)) {
      return { height: house.floorY, ramp: false };
    }
  }
  return { height: groundLevel, ramp: false };
}

const player = new THREE.Group();
const playerSpawn = new THREE.Vector3(-19.6, .1, 0);
player.position.copy(playerSpawn);
scene.add(player);
let yaw = -Math.PI / 2;
let pitch = -.025;
player.add(camera);
camera.position.set(0, 1.68, 0);
camera.rotation.order = 'YXZ';

let botTrainingEnabled = false;
const bot = new THREE.Group();
const botSpawn = new THREE.Vector3(19.6, .1, 0);
bot.position.copy(botSpawn);
bot.rotation.y = Math.PI / 2;
bot.visible = false;
const botUniform = new THREE.MeshStandardMaterial({ color: '#394b47', roughness: .86 });
const botVest = new THREE.MeshStandardMaterial({ color: '#263b3c', roughness: .78 });
const botHelmet = new THREE.MeshStandardMaterial({ color: '#a6483d', roughness: .72 });
const botSkin = new THREE.MeshStandardMaterial({ color: '#b88669', roughness: .88 });
const botGunMaterial = new THREE.MeshStandardMaterial({ color: '#282d2a', metalness: .35, roughness: .6 });
cube(bot, botUniform, 0, 1.02, 0, .56, .76, .34, false);
cube(bot, botVest, 0, 1.02, -.19, .62, .56, .12, false);
const botHead = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), botSkin);
botHead.position.set(0, 1.58, 0);
bot.add(botHead);
const botHelmetMesh = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 8), botHelmet);
botHelmetMesh.position.set(0, 1.72, 0);
botHelmetMesh.scale.y = .65;
bot.add(botHelmetMesh);
for (const side of [-1, 1]) {
  cube(bot, botUniform, side * .37, 1.05, -.05, .19, .62, .2, false).rotation.z = -side * .12;
  cube(bot, botUniform, side * .17, .37, 0, .22, .68, .24, false);
}
cube(bot, botGunMaterial, .12, 1.08, -.53, .12, .12, .68, false);
cube(bot, botGunMaterial, .12, .97, -.38, .1, .24, .12, false);
const botMuzzle = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff9d45' }));
botMuzzle.position.set(.12, 1.08, -.9);
botMuzzle.visible = false;
bot.add(botMuzzle);

const viewModel = new THREE.Group();
camera.add(viewModel);
const firearmArms = new THREE.Group();
viewModel.add(firearmArms);
const boltArm = new THREE.Group();
boltArm.position.set(.43, -.49, -.48);
firearmArms.add(boltArm);
cube(boltArm, mats.uniform, 0, 0, 0, .22, .24, .62, false).rotation.z = -.28;
cube(boltArm, mats.metal, -.045, -.045, -.31, .15, .095, .18, false);
cube(firearmArms, mats.uniform, -.32, -.52, -.43, .22, .23, .62, false).rotation.z = .35;
cube(firearmArms, mats.vest, .34, -.34, -.83, .2, .16, .22, false);
cube(firearmArms, mats.vest, -.05, -.34, -.82, .2, .16, .22, false);
const weaponModel = new THREE.Group();
viewModel.add(weaponModel);
let boltHandle = null;
let boltCycle = null;
const boltArmRest = new THREE.Vector3(.43, -.49, -.48);
const boltArmWork = new THREE.Vector3(.27, -.27, -.79);
const boltHandleRest = new THREE.Vector3(.39, -.15, -.88);
const meleeModel = new THREE.Group();
viewModel.add(meleeModel);

const meleeMetal = new THREE.MeshStandardMaterial({ color:'#8b9298', metalness:.42, roughness:.3 });
const meleeEdge = new THREE.MeshStandardMaterial({ color:'#e4e8eb', metalness:.62, roughness:.22 });
const meleeDarkMetal = new THREE.MeshStandardMaterial({ color:'#24282b', metalness:.52, roughness:.34 });
const meleeGrip = new THREE.MeshStandardMaterial({ color:'#17191b', roughness:.92 });
const meleeRubber = new THREE.MeshStandardMaterial({ color:'#25282a', roughness:.82 });
const meleeWood = new THREE.MeshStandardMaterial({ color:'#6b4328', roughness:.84 });
const meleePan = new THREE.MeshStandardMaterial({ color:'#303438', metalness:.38, roughness:.38 });
const meleePanInner = new THREE.MeshStandardMaterial({ color:'#202326', metalness:.18, roughness:.48 });
const meleeGlove = new THREE.MeshStandardMaterial({ color:'#343a30', roughness:.92 });
const meleeGloveTrim = new THREE.MeshStandardMaterial({ color:'#222820', roughness:.88 });
const meleeSleeve = new THREE.MeshStandardMaterial({ color:'#4c5541', roughness:.94 });
const meleeRestPosition = new THREE.Vector3();
const meleeRestRotation = new THREE.Euler();

function buildMeleeModel() {
  meleeModel.clear();
  const weapon = meleeWeapons[selectedMeleeIndex];
  if (!weapon) return;

  // IMPORTANT: every weapon is built in the same FPS hand coordinate system:
  // X = left/right, Y = up/down, Z = forward/back.  The hand is around
  // (.38, -.42, -.45), so grips run toward +Z and blades point toward -Z.
  const addMesh = (geometry, material, x=.38, y=-.42, z=-.8, rotationX=0, rotationY=0, rotationZ=0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    meleeModel.add(mesh);
    return mesh;
  };

  const box = (material, x, y, z, sx, sy, sz, rotationX=0, rotationY=0, rotationZ=0) => {
    const mesh = cube(meleeModel, material, x, y, z, sx, sy, sz, false);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    return mesh;
  };

  // CylinderGeometry is vertical by default; rotate X by 90° whenever it is
  // used as a weapon grip/handle so the grip follows the Z axis.
  const grip = (x, y, z, length, radius, material, rotationZ=0) =>
    addMesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, length, 12),
      material, x, y, z, Math.PI / 2, 0, rotationZ
    );

  const pommel = (x, y, z, radius=.075) =>
    addMesh(new THREE.CylinderGeometry(radius, radius, .075, 12), meleeDarkMetal, x, y, z, Math.PI / 2);

  const addBetween = (start, end, radius, material) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = addMesh(
      new THREE.CylinderGeometry(radius * .88, radius, direction.length(), 12),
      material,
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      (start.z + end.z) / 2
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };

  const addFirstPersonHand = (handY, handZ) => {
    const wrist = new THREE.Vector3(.4, handY - .015, handZ + .035);
    addBetween(new THREE.Vector3(.72, -.96, -.08), wrist, .105, meleeSleeve);
    addMesh(new THREE.CylinderGeometry(.105, .095, .09, 12), meleeGloveTrim,
      wrist.x, wrist.y, wrist.z, Math.PI / 2);

    const palm = addMesh(new THREE.SphereGeometry(1, 12, 10), meleeGlove,
      .38, handY, handZ);
    palm.scale.set(.12, .105, .135);

    // Knuckles and curled fingers sit in front of the grip, giving the weapon
    // a clear first-person point of contact instead of a floating silhouette.
    for (let finger = 0; finger < 4; finger++) {
      const knuckle = addMesh(new THREE.SphereGeometry(1, 8, 6), meleeGloveTrim,
        .315 + finger * .043, handY + .035, handZ + .055);
      knuckle.scale.set(.027, .025, .045);
    }
    const thumb = addMesh(new THREE.CapsuleGeometry(.026, .085, 3, 7), meleeGlove,
      .275, handY - .005, handZ + .035, 0, 0, Math.PI / 2);
    thumb.rotation.z = Math.PI / 2;
  };

  const blade = (length, width, thickness, centerZ, tipLength=.16, curve=0) => {
    const mainLength = length - tipLength;
    addMesh(
      new THREE.BoxGeometry(width, thickness, mainLength),
      meleeMetal, .38, -.39, centerZ + tipLength * .5, 0, curve, 0
    );

    const tip = addMesh(
      new THREE.ConeGeometry(width * .5, tipLength, 4),
      meleeEdge, .38, -.39, centerZ - mainLength * .5 - tipLength * .08, -Math.PI / 2, curve, 0
    );
    tip.scale.x = .88;

    // Raised cutting edge catches the scene light instead of looking like a cube.
    addMesh(
      new THREE.BoxGeometry(Math.max(.012, width * .13), thickness * .32, mainLength * .9),
      meleeEdge, .38 - width * .32, -.365, centerZ + tipLength * .5, 0, curve, 0
    );
  };

  if (weapon.type === 'knife') {
    // A compact single-edge field knife with a tapered point and raised bevel.
    blade(.72, .17, .035, -1.02, .19, -.035);

    box(meleeDarkMetal, .38, -.39, -.675, .27, .045, .065);
    box(meleeMetal, .38, -.39, -.648, .075, .09, .085);

    grip(.38, -.39, -.45, .39, .073, meleeGrip);
    for (let i=0; i<6; i++) {
      box(meleeRubber, .38, -.39, -.285 - i * .058, .142, .105, .022, 0, 0, i % 2 ? .18 : -.18);
    }
    pommel(.38, -.39, -.225, .082);

    // Shallow fuller and spine notches catch the directional light.
    box(meleeDarkMetal, .38, -.361, -.91, .018, .008, .3);
    for (let i=0; i<3; i++) box(meleeDarkMetal, .445, -.328, -.83 - i * .045, .018, .018, .022);

    meleeModel.position.set(-.15, .22, -.82);
    meleeModel.rotation.set(-.12, -.12, -.08);
  } else if (weapon.type === 'axe') {
    // Short claw hammer: a forged cross-peen head, striking face and split claw.
    grip(.38, -.56, -.48, .72, .055, meleeWood, -.025);
    box(meleeMetal, .38, -.205, -.48, .39, .16, .17, 0, 0, -.025);
    box(meleeMetal, .59, -.205, -.48, .13, .205, .205);
    box(meleeEdge, .66, -.205, -.48, .018, .16, .17);
    box(meleeMetal, .18, -.205, -.48, .11, .105, .15);
    box(meleeMetal, .105, -.17, -.48, .12, .045, .105, 0, 0, -.48);
    box(meleeMetal, .105, -.24, -.48, .12, .045, .105, 0, 0, .48);
    box(meleeDarkMetal, .38, -.205, -.48, .11, .09, .19);
    for (let i=0; i<4; i++) {
      box(meleeRubber, .38, -.56, -.31 - i * .085, .105, .012, .035, 0, 0, -.025);
    }
    pommel(.38, -.56, -.84, .07);
    meleeModel.position.set(-.15, .24, -.82);
    meleeModel.rotation.set(-.12, -.14, -.1);
  } else if (weapon.type === 'pan') {
    // Hollow cast-iron bowl, with a rolled rim and a handle extending back to the hand.
    addMesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(.015, -.065), new THREE.Vector2(.09, -.045),
        new THREE.Vector2(.19, -.005), new THREE.Vector2(.245, .045),
        new THREE.Vector2(.255, .075), new THREE.Vector2(.225, .052),
        new THREE.Vector2(.17, .005), new THREE.Vector2(.09, -.026),
        new THREE.Vector2(.015, -.038)
      ], 36),
      meleePan, .38, -.38, -.97, Math.PI / 2
    );
    addMesh(
      new THREE.CylinderGeometry(.17, .17, .012, 32),
      meleePanInner, .38, -.38, -.91, Math.PI / 2
    );
    addMesh(
      new THREE.TorusGeometry(.24, .018, 10, 36),
      meleeMetal, .38, -.38, -.89
    );
    addMesh(
      new THREE.TorusGeometry(.145, .008, 8, 28),
      meleeDarkMetal, .38, -.38, -.905
    );

    // Tapered handle, riveted tang and end cap.
    grip(.38, -.38, -.53, .66, .06, meleePan, 0);
    box(meleeDarkMetal, .38, -.38, -.78, .14, .105, .14);
    for (const z of [-.72, -.78]) {
      addMesh(new THREE.SphereGeometry(.018, 8, 6), meleeEdge, .38, -.38, z);
    }
    grip(.38, -.38, -.225, .24, .07, meleePan, 0);
    pommel(.38, -.38, -.105, .072);

    meleeModel.position.set(-.15, .22, -.82);
    meleeModel.rotation.set(-.05, -.1, -.03);
  } else if (weapon.type === 'katana') {
    // A long, subtly curved blade with a bright hamon line and visible ridge.
    const sections = Array.from({ length: 7 }, (_, index) => ({
      z: -1.02 - index * .115,
      len: .14,
      width: .105 - index * .006,
      curve: .012 + index * .002
    }));
    for (const section of sections) {
      addMesh(
        new THREE.BoxGeometry(section.width, .028, section.len),
        meleeMetal, .38 + section.curve, -.39, section.z, 0, section.curve, 0
      );
      addMesh(
        new THREE.BoxGeometry(.012, .009, section.len * .92),
        meleeEdge, .38 - section.width * .39, -.37, section.z, 0, section.curve, 0
      );
      addMesh(
        new THREE.BoxGeometry(.025, .008, section.len * .9),
        meleeDarkMetal, .38 + section.width * .1, -.372, section.z, 0, section.curve, 0
      );
    }
    addMesh(
      new THREE.ConeGeometry(.05, .17, 4),
      meleeEdge, .38, -.39, -1.79, -Math.PI / 2, -.004
    );

    // Tsuba sits exactly between blade and handle.
    addMesh(
      new THREE.CylinderGeometry(.14, .14, .045, 20),
      meleeDarkMetal, .38, -.39, -.84, Math.PI / 2
    );
    addMesh(
      new THREE.TorusGeometry(.095, .018, 8, 20),
      meleeMetal, .38, -.39, -.812
    );

    grip(.38, -.39, -.52, .55, .052, meleeGrip);
    for (let i=0; i<8; i++) {
      box(meleeRubber, .38, -.39, -.29 - i * .065, .13, .085, .022, 0, 0, i % 2 ? -.4 : .4);
    }
    pommel(.38, -.39, -.225, .07);

    meleeModel.position.set(-.15, .22, -.82);
    meleeModel.rotation.set(-.08, -.14, -.07);
  }

  const handY = weapon.type === 'axe' ? -.56 : weapon.type === 'pan' ? -.38 : -.39;
  const handZ = weapon.type === 'pan' ? -.31 : weapon.type === 'axe' ? -.48 : -.45;
  addFirstPersonHand(handY, handZ);
  meleeRestPosition.copy(meleeModel.position);
  meleeRestRotation.copy(meleeModel.rotation);

  meleeModel.visible = meleeMode;
  weaponModel.visible = !meleeMode;
  firearmArms.visible = !meleeMode;
}

function selectMeleeWeapon(index) {
  const weapon=meleeWeapons[index];
  if(!weapon || !ownedMeleeWeapons.has(weapon.name)) return;

  selectedMeleeIndex=index;
  equippedSlots.melee=index;
  activeWeaponSlot='melee';
  meleeMode=true;

  if(boltCycle) resetBoltAction();
  isReloading=false;
  reloadTimer=0;
  reloadWeapon=-1;
  shooting=false;

  weaponModel.visible=false;
  firearmArms.visible=false;
  buildMeleeModel();

  weaponLabel.textContent=`3 / ${weapon.name}`;
  ammoWeaponLabel.textContent=weapon.name;
  ammoCurrentLabel.textContent='∞';
  ammoCapacityLabel.textContent='∞';
  ammoDisplay.classList.remove('ammo-low','is-reloading');
  reloadStatus.textContent='CẬN CHIẾN';

  saveLoadout();
  armoryStatus.textContent=getLoadoutStatus();
  updateAimUI();
  updateAmmoUI();
  renderArmory();
}

function resetBoltAction() {
  boltCycle = null;
  boltArm.position.copy(boltArmRest);
  boltArm.rotation.set(0, 0, 0);
  if (boltHandle) {
    boltHandle.position.copy(boltHandleRest);
    boltHandle.rotation.set(0, 0, 0);
  }
}
// Details for weapons, including cost, cooldown, velocity, recoil, damage.
const weapons = [
  { name: 'CARBINE', category: 'Rifles', cost: 0, cooldown: .16, velocity: 75, recoil: .16, damage: 24, owned: true },
  { name: 'S1897', category: 'Shotguns', cost: 2_400, cooldown: .72, velocity: 58, recoil: .78, damage: 38 },
  { name: 'S686', category: 'Shotguns', cost: 3_200, cooldown: .48, velocity: 62, recoil: .68, damage: 46 },
  { name: 'UMP45', category: 'SMGs', cost: 2_800, cooldown: .05, velocity: 68, recoil: .2, damage: 20 },
  { name: 'UZI', category: 'SMGs', cost: 2_200, cooldown: .035, velocity: 62, recoil: .16, damage: 15 },
  { name: 'M416', category: 'Rifles', cost: 4_500, cooldown: .070, velocity: 82, recoil: .18, damage: 25 },
  { name: 'AKM', category: 'Rifles', cost: 4_000, cooldown: .075, velocity: 90, recoil: .32, damage: 34 },
  { name: 'M24', category: 'Sniper Rifles', cost: 6_000, cooldown: .8, velocity: 115, recoil: .68, damage: 82, boltDuration: 2.2 },
  { name: 'Kar98k', category: 'Sniper Rifles', cost: 5_500, cooldown: .95, velocity: 108, recoil: .76, damage: 72, boltDuration: 2 },
  { name: 'AWM', category: 'Sniper Rifles', cost: 9_000, cooldown: 1.1, velocity: 135, recoil: 1, damage: 100, boltDuration: 2.4 },
  { name: 'M249', category: 'Heavy Weapons', cost: 7_500, cooldown: .09, velocity: 88, recoil: .14, damage: 20 },
  { name: 'PKM', category: 'Heavy Weapons', cost: 8_500, cooldown: .055, velocity: 84, recoil: .16, damage: 22 },
  { name: 'P1911', category: 'Pistols', cost: 1_200, cooldown: .3, velocity: 65, recoil: .28, damage: 28 },
  { name: 'P92', category: 'Pistols', cost: 1_000, cooldown: .24, velocity: 62, recoil: .22, damage: 23, owned: true },
  { name: 'P18C', category: 'Pistols', cost: 1_600, cooldown: .1, velocity: 60, recoil: .12, damage: 16 },
  { name: 'Desert Eagle', category: 'Pistols', cost: 3_500, cooldown: .42, velocity: 92, recoil: .58, damage: 75 },
  { name: 'Sawed-off', category: 'Pistols', cost: 2_600, cooldown: .56, velocity: 55, recoil: .72, damage: 75 } 
// TODO :Check the actual damage of the Sawed-off and Desert Eagle. 
];
const meleeWeapons = [
  { name:'Dao', category:'Melee', damage:50, range:1.05, cooldown:.24, cost:0, owned:true, type:'knife' },
  { name:'Búa', category:'Melee', damage:60, range:1.2, cooldown:.38, cost:300, type:'axe' },
  { name:'Katana', category:'Melee', damage:78, range:1.45, cooldown:.46, cost:650, type:'katana' },
  { name:'Chảo', category:'Melee', damage:55, range:1.3, cooldown:.58, cost:450, type:'pan' }
];

let selectedMeleeIndex= 0;
let meleeMode= false;
let meleeCooldown= 0;
let meleeSwing= 0;

const ownedMeleeWeapons=new Set(['Dao']);
try {
  const saved=JSON.parse(localStorage.getItem('outpost-owned-melee') || '[]');
  if(Array.isArray(saved)) {
    for(const name of saved) {
      const normalizedName=name==='DAO' ? 'Dao' : name;
      if(meleeWeapons.some(weapon=>weapon.name===normalizedName)) ownedMeleeWeapons.add(normalizedName);
    }
  }
} catch {}

function magazineCapacity(weapon) {
  if (weapon.name === 'Sawed-off' || weapon.name === 'S686') return 2;
  if (weapon.category === 'Heavy Weapons') return 100;
  if (weapon.category === 'Rifles') return 30;
  if (weapon.category === 'Pistols') return 7;
  if (weapon.category === 'Sniper Rifles') return 5;
  if (weapon.category === 'SMGs') return 25;
  return 5;
}
const magazineAmmo = new Map(weapons.map((weapon) => [weapon.name, magazineCapacity(weapon)]));
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
let savedBalance = 99_999;
try {
  const rawBalance = localStorage.getItem('outpost-balance');
  if (rawBalance !== null) {
    const storedBalance = Number(rawBalance);
    if (Number.isFinite(storedBalance) && storedBalance >= 0) savedBalance = storedBalance;
  }
} catch {
  savedBalance = 99_999;
}
let playerBalance = savedBalance;
let savedLoadout = {};
try {
  const storedLoadout = JSON.parse(localStorage.getItem('outpost-loadout') || '{}');
  if (storedLoadout && typeof storedLoadout === 'object' && !Array.isArray(storedLoadout)) savedLoadout = storedLoadout;
} catch {
  savedLoadout = {};
}
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
  boltHandle = null;
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
  if (sniper) {
    boltHandle = new THREE.Group();
    boltHandle.position.copy(boltHandleRest);
    weaponModel.add(boltHandle);
    cube(boltHandle, mats.metal, 0, 0, 0, .16, .045, .045, false);
    cube(boltHandle, mats.metal, .045, .075, 0, .045, .15, .045, false);
    cube(boltHandle, mats.accent, .045, .15, 0, .095, .07, .07, false);
  }
}

const defaultLoadout = {
  primary: 0,
  pistol: weapons.findIndex((weapon) => weapon.name === 'P92'),
  melee: meleeWeapons.findIndex((weapon) => weapon.name === 'Dao')
};
const equippedSlots = { ...defaultLoadout };

for (const slot of ['primary', 'pistol']) {
  const storedIndex = weapons.findIndex((weapon) => weapon.name === savedLoadout[slot]);
  if (storedIndex >= 0 && ownedWeapons.has(weapons[storedIndex].name) &&
      (slot === 'pistol' ? weapons[storedIndex].category === 'Pistols' : weapons[storedIndex].category !== 'Pistols')) {
    equippedSlots[slot] = storedIndex;
  }
}

const storedMeleeIndex = meleeWeapons.findIndex((weapon) => weapon.name === savedLoadout.melee);
if (storedMeleeIndex >= 0 && ownedMeleeWeapons.has(meleeWeapons[storedMeleeIndex].name)) {
  equippedSlots.melee = storedMeleeIndex;
}

let activeWeaponSlot = 'primary';
let selectedWeapon = equippedSlots.primary;
const weaponLabel = document.querySelector('#weapon-label');
const weaponButton = document.querySelector('#weapon-toggle');
const armory = document.querySelector('#armory');
const armoryCategories = document.querySelector('#armory-categories');
const armoryStatus = document.querySelector('#armory-status');
const scopeOverlay = document.querySelector('#scope-overlay');
const ammoDisplay = document.querySelector('#ammo-display');
const ammoWeaponLabel = document.querySelector('#ammo-weapon');
const ammoCurrentLabel = document.querySelector('#ammo-current');
const ammoCapacityLabel = document.querySelector('#ammo-capacity');
const reloadStatus = document.querySelector('#reload-status');
const playerHpLabel = document.querySelector('#player-hp');
const playerHpBar = document.querySelector('#player-hp-bar');
const playerHitPartLabel = document.querySelector('#player-hit-part');
const botHpLabel = document.querySelector('#bot-hp');
const botHpBar = document.querySelector('#bot-hp-bar');
const botHealthPanel = document.querySelector('#bot-health');
const botStateLabel = document.querySelector('#bot-state');
const botHitPartLabel = document.querySelector('#bot-hit-part');
const damageVignette = document.querySelector('#damage-vignette');
const damageDirection = document.querySelector('#damage-direction');
const deathOverlay = document.querySelector('#death-overlay');
const deathKillerName = document.querySelector('#death-killer-name');
const deathCountdown = document.querySelector('#death-countdown');
const playerHealthPanel = document.querySelector('#player-health');
const botTrainingToggle = document.querySelector('#bot-training');
const botModeLabel = document.querySelector('#bot-mode-label');
const settingsPanel = document.querySelector('#training-settings');
const settingsOpenButton = document.querySelector('#settings-open');
const balanceLabel = document.querySelector('#armory-balance-value');
const safeZoneNotice = document.querySelector('#safe-zone-notice');
let armoryOpen = false;
let aiming = false;
let isReloading = false;
let reloadTimer = 0;
let reloadWeapon = -1;
const reloadDuration = 1.35;
let safeZoneNoticeTimer = 0;

function showSafeZoneNotice() {
  safeZoneNotice.classList.add('visible');
  clearTimeout(safeZoneNoticeTimer);
  safeZoneNoticeTimer = setTimeout(() => safeZoneNotice.classList.remove('visible'), 2300);
}

function updateBalanceUI() {
  balanceLabel.textContent = playerBalance.toLocaleString('vi-VN');
}

function saveBalance() {
  try {
    localStorage.setItem('outpost-balance', String(playerBalance));
  } catch {
    // Keep the current balance for this session when storage is unavailable.
  }
  updateBalanceUI();
}

function updateAmmoUI() {
  if (meleeMode) {
    const melee = meleeWeapons[equippedSlots.melee];
    if (!melee) return;
    ammoWeaponLabel.textContent = melee.name;
    ammoCurrentLabel.textContent = '∞';
    ammoCapacityLabel.textContent = '∞';
    ammoDisplay.classList.remove('ammo-low','is-reloading');
    reloadStatus.textContent = 'CẬN CHIẾN';
    return;
  }

  const weapon = weapons[selectedWeapon];
  const capacity = magazineCapacity(weapon);
  const ammo = magazineAmmo.get(weapon.name) ?? capacity;
  ammoWeaponLabel.textContent = weapon.name;
  ammoCurrentLabel.textContent = String(ammo);
  ammoCapacityLabel.textContent = String(capacity);
  ammoDisplay.classList.toggle('ammo-low', ammo <= Math.max(1, Math.ceil(capacity * .2)));
  ammoDisplay.classList.toggle('is-reloading', isReloading && reloadWeapon === selectedWeapon);
  reloadStatus.textContent = isReloading && reloadWeapon === selectedWeapon
    ? 'ĐANG NẠP ĐẠN…'
    : boltCycle?.weaponIndex === selectedWeapon
      ? 'ĐANG GẠT BOLT…'
      : ammo === 0 ? 'NHẤN R ĐỂ NẠP' : '';
}

function updateAimUI() {
  const scoped = !meleeMode && aiming && weapons[selectedWeapon].category === 'Sniper Rifles';
  document.body.classList.toggle('scope-active', scoped);
  scopeOverlay.setAttribute('aria-hidden', String(!scoped));
}

let playerHealth = 100;
let playerDead = false;
let deathUntil = 0;
let botHealth = 100;
let botAlive = true;
let botRespawnTimer = 0;
let botShotTimer = 1.5;
let botMuzzleTimer = 0;
let botStrafeSign = 1;
let playerInvulnerableTimer = 0;
let damageFlashTimer = 0;
let playerHitSlowTimer = 0;

function showDamageFeedback(incomingDirection, bodyPart, appliedDamage) {
  const direction = incomingDirection?.clone() ?? new THREE.Vector3(0, 0, 1);
  direction.y *= .65;
  if (direction.lengthSq() < .0001) direction.set(0, 0, 1);
  direction.normalize();
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  const screenX = direction.dot(right);
  const screenY = -direction.dot(cameraUp);
  const angle = Math.atan2(screenY, screenX) * 180 / Math.PI + 90;
  damageDirection.style.setProperty('--hit-angle', `${angle}deg`);
  damageDirection.style.setProperty('--hit-x', `${50 + screenX * 39}%`);
  damageDirection.style.setProperty('--hit-y', `${50 + screenY * 39}%`);
  damageVignette.classList.remove('active');
  damageDirection.classList.remove('active');
  void damageVignette.offsetWidth;
  damageVignette.classList.add('active');
  damageDirection.classList.add('active');
  playerHealthPanel.classList.add('hit');
  playerHitPartLabel.textContent = `${bodyPart} · −${appliedDamage} HP`;
  damageFlashTimer = .62;
  playerHitSlowTimer = Math.max(playerHitSlowTimer, 1.15);
}

function updateCombatUI() {
  playerHpLabel.textContent = String(Math.ceil(playerHealth));
  playerHpBar.style.width = `${Math.max(0, playerHealth)}%`;
  botHpLabel.textContent = String(Math.ceil(botHealth));
  botHpBar.style.width = `${Math.max(0, botHealth)}%`;
  botHealthPanel.classList.toggle('is-dead', !botAlive);
  botStateLabel.textContent = botAlive ? 'ĐANG TRUY TÌM' : `HỒI SINH ${Math.ceil(botRespawnTimer)}s`;
  botHealthPanel.hidden = !botTrainingEnabled;
}

function setBotTraining(enabled) {
  botTrainingEnabled = enabled;
  botHealth = 100;
  botAlive = true;
  botRespawnTimer = 0;
  botShotTimer = 1.5;
  bot.position.copy(botSpawn);
  bot.rotation.y = Math.PI / 2;
  bot.visible = enabled;
  if (enabled) scene.add(bot);
  else {
    scene.remove(bot);
    for (let index = bullets.length - 1; index >= 0; index--) {
      if (bullets[index].owner === 'bot') {
        scene.remove(bullets[index].mesh);
        bullets.splice(index, 1);
      }
    }
  }
  updateCombatUI();
}

// Remote player representations for the first in-game multiplayer milestone.
const remotePlayers = new Map();

const REMOTE_INTERPOLATION_DELAY = 100;

function createRemoteNetworkState(state = {}) {
  return {
    x: Number(state.x) || 0,
    y: Number(state.y) || 0,
    z: Number(state.z) || 0,

    yaw: Number(state.yaw) || 0,
    pitch: Number(state.pitch) || 0,

    weaponSlot: state.weaponSlot || "primary",
    weaponName: state.weaponName || "",
    weaponCategory: state.weaponCategory || "",
    meleeType: state.meleeType || "",

    firing: Boolean(state.firing),
    aiming: Boolean(state.aiming),
    moving: Boolean(state.moving),
    crouched: Boolean(state.crouched),

    at: Number(state.at) || Date.now ()
  };
}
    
const remoteUniform = new THREE.MeshStandardMaterial({ color: '#a7c86b', roughness: .82 });
const remoteVest = new THREE.MeshStandardMaterial({ color: '#374638', roughness: .8 });
const remoteHead = new THREE.MeshStandardMaterial({ color: '#c49a79', roughness: .85 });
function createRemotePlayer(id, nickname, team) {
  const group = new THREE.Group();

  // =========================
  // BODY
  // =========================

  cube(
    group,
    remoteUniform,
    0, 1.02, 0,
    .56, .76, .34,
    false
  );

  cube(
    group,
    remoteVest,
    0, 1.02, -.19,
    .62, .56, .12,
    false
  );

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(.2, 12, 10),
    remoteHead
  );

  head.position.y = 1.58;
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(.23, 12, 8),
    mats.helmet
  );

  helmet.position.set(0, 1.72, 0);
  helmet.scale.y = .65;

  group.add(helmet);

  // =========================
  // ARMS
  // =========================

  const leftArm = cube(
    group,
    remoteUniform,
    -.37, 1.05, -.05,
    .19, .62, .2,
    false
  );

  leftArm.rotation.z = .12;

  const rightArm = cube(
    group,
    remoteUniform,
    .37, 1.05, -.05,
    .19, .62, .2,
    false
  );

  rightArm.rotation.z = -.12;

  // =========================
  // LEGS
  // =========================

  cube(
    group,
    remoteUniform,
    -.17, .37, 0,
    .22, .68, .24,
    false
  );

  cube(
    group,
    remoteUniform,
    .17, .37, 0,
    .22, .68, .24,
    false
  );

  // =========================
  // WEAPON HOLDER
  // =========================

  const weaponRoot = new THREE.Group();

  weaponRoot.position.set(
    .22,
    1.12,
    -.32
  );

  group.add(weaponRoot);

  group.userData.weaponRoot = weaponRoot;
  group.userData.weaponType = "";

  // =========================
  // NAME
  // =========================

  const labelCanvas =
    document.createElement("canvas");

  labelCanvas.width = 256;
  labelCanvas.height = 64;

  const ctx =
    labelCanvas.getContext("2d");

  ctx.fillStyle = "#c8f36a";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";

  ctx.fillText(
    (
      String(nickname || "PLAYER") +
      (team ? " · PHE " + team : "")
    ).slice(0, 24),
    128,
    40
  );

  const texture =
    new THREE.CanvasTexture(labelCanvas);

  const label =
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      })
    );

  label.position.y = 2.25;
  label.scale.set(2.2, .55, 1);

  group.add(label);

  // =========================
  // NETWORK STATE
  // =========================

  group.userData.nickname = nickname;
  group.userData.team = team;

  group.userData.network = {
    current: createRemoteNetworkState(),
    previous: null,
    target: null,
    lastReceived: performance.now(),

    firingUntil: 0,
    weaponName: ""
  };

  group.userData.lastWeaponName = "";

  scene.add(group);
  remotePlayers.set(id, group);

  return group;
}
function clearRemoteWeapon(remote) {
  const root = remote?.userData?.weaponRoot;

  if (!root) return;

  root.clear();
}

function buildRemoteWeapon(remote, state) {
  const root = remote?.userData?.weaponRoot;

  if (!root) return;

  clearRemoteWeapon(remote);

  const slot = state.weaponSlot || "primary";
  const name = String(state.weaponName || "").toLowerCase();

  const metal = new THREE.MeshStandardMaterial({
    color: "#252a28",
    metalness: .72,
    roughness: .32
  });

  const dark = new THREE.MeshStandardMaterial({
    color: "#111414",
    metalness: .45,
    roughness: .5
  });

  const blade = new THREE.MeshStandardMaterial({
    color: "#aeb5b8",
    metalness: .92,
    roughness: .18
  });

  // =========================
  // MELEE
  // =========================

  if (slot === "melee") {

    if (
      name.includes("katana")
    ) {
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(
          .055,
          .055,
          .9
        ),
        blade
      );

      sword.position.z = -.48;
      sword.rotation.y = Math.PI / 2;

      root.add(sword);

      const guard = new THREE.Mesh(
        new THREE.TorusGeometry(
          .13,
          .025,
          8,
          16
        ),
        dark
      );

      guard.rotation.y = Math.PI / 2;
      guard.position.z = -.04;

      root.add(guard);

    } else if (
      name.includes("búa") ||
      name.includes("bua") ||
      name.includes("axe")
    ) {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(
          .035,
          .045,
          .85,
          8
        ),
        new THREE.MeshStandardMaterial({
          color: "#5c3925",
          roughness: .85
        })
      );

      handle.rotation.x = Math.PI / 2;
      handle.position.z = -.42;

      root.add(handle);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(
          .42,
          .22,
          .12
        ),
        metal
      );

      head.position.z = -.04;

      root.add(head);

    } else if (
      name.includes("chảo") ||
      name.includes("chao") ||
      name.includes("pan")
    ) {
      const pan = new THREE.Mesh(
        new THREE.CylinderGeometry(
          .22,
          .25,
          .07,
          16
        ),
        dark
      );

      pan.rotation.x = Math.PI / 2;
      pan.position.z = -.18;

      root.add(pan);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(
          .045,
          .05,
          .55,
          8
        ),
        dark
      );

      handle.rotation.x = Math.PI / 2;
      handle.position.z = -.52;

      root.add(handle);

    } else {
      // Knife / Dao
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(
          .045,
          .05,
          .32,
          8
        ),
        dark
      );

      handle.rotation.x = Math.PI / 2;
      handle.position.z = -.15;

      root.add(handle);

      const knife = new THREE.Mesh(
        new THREE.BoxGeometry(
          .075,
          .035,
          .45
        ),
        blade
      );

      knife.position.z = -.52;

      root.add(knife);
    }

    remote.userData.weaponType = "melee";
    return;
  }

  // =========================
  // PISTOL
  // =========================

  if (slot === "pistol") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        .13,
        .14,
        .38
      ),
      metal
    );

    body.position.z = -.25;

    root.add(body);

    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(
        .075,
        .075,
        .28
      ),
      dark
    );

    barrel.position.z = -.55;

    root.add(barrel);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(
        .09,
        .25,
        .1
      ),
      dark
    );

    grip.position.set(
      0,
      -.16,
      -.15
    );

    grip.rotation.x = -.18;

    root.add(grip);

    remote.userData.weaponType = "pistol";
    return;
  }

  // =========================
  // PRIMARY
  // =========================

  const rifleBody = new THREE.Mesh(
    new THREE.BoxGeometry(
      .14,
      .16,
      .68
    ),
    metal
  );

  rifleBody.position.z = -.42;

  root.add(rifleBody);

  const rifleBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(
      .035,
      .04,
      .7,
      8
    ),
    dark
  );

  rifleBarrel.rotation.x = Math.PI / 2;
  rifleBarrel.position.z = -.94;

  root.add(rifleBarrel);

  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(
      .1,
      .26,
      .13
    ),
    dark
  );

  magazine.position.set(
    0,
    -.18,
    -.36
  );

  magazine.rotation.x = -.15;

  root.add(magazine);

  remote.userData.weaponType = "primary";
}
function hitRemotePlayer(start, end) {
  let nearest = null;
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) return null;
  const segmentLength = Math.sqrt(lengthSq);
  for (const [id, group] of remotePlayers) {
    if (!group.visible) continue;
    const center = group.position;
    // Wider torso/head/legs capsules make hits reliable against the low-poly model.
    const parts = [
      { point: new THREE.Vector3(center.x, center.y + 1.62, center.z), radius: .34 },
      { point: new THREE.Vector3(center.x, center.y + 1.15, center.z), radius: .52 },
      { point: new THREE.Vector3(center.x, center.y + .48, center.z), radius: .38 },
    ];
    for (const part of parts) {
      const projection = part.point.clone().sub(start).dot(segment) / lengthSq;
      if (projection < 0 || projection > 1) continue;
      const closest = start.clone().addScaledVector(segment, projection);
      if (closest.distanceTo(part.point) <= part.radius) {
        const distance = projection * segmentLength;
        if (!nearest || distance < nearest.distance) nearest = { id, distance };
      }
    }
  }
  return nearest;
}
function removeRemotePlayer(id) {
  const group = remotePlayers.get(id);
  if (!group) return;
  scene.remove(group);
  group.traverse((object) => {
    if (object.isSprite) { object.material.map?.dispose(); object.material.dispose(); }
  });
  remotePlayers.delete(id);
}
window.addEventListener('lntl:remote-state', (event) => {
  const {
    playerId,
    nickname,
    team,
    state
  } = event.detail || {};

  if (
    !playerId ||
    !state ||
    playerId === window.lntlMultiplayer?.getPlayerId()
  ) {
    return;
  }

  const remote =
    remotePlayers.get(playerId) ||
    createRemotePlayer(
      playerId,
      nickname,
      team
    );

  const network =
    remote.userData.network;

  const next =
    createRemoteNetworkState(state);

  /*
   * First packet:
   * snap directly into place.
   */
  if (!network.target) {
    network.current = next;
    network.target = next;
    network.previous = next;

    remote.position.set(
      next.x,
      next.y,
      next.z
    );

    remote.rotation.y =
      next.yaw;

  } else {
    /*
     * Keep previous + target.
     * animate() will interpolate between them.
     */
    network.previous =
      network.target;

    network.target =
      next;
  }

  network.lastReceived =
    performance.now();

  /*
   * Weapon changed.
   */
  if (
    remote.userData.lastWeaponName !==
    next.weaponName ||
    remote.userData.lastWeaponSlot !==
    next.weaponSlot
  ) {
    buildRemoteWeapon(
      remote,
      next
    );

    remote.userData.lastWeaponName =
      next.weaponName;

    remote.userData.lastWeaponSlot =
      next.weaponSlot;
  }

  /*
   * Fire flash timer.
   */
  if (next.firing) {
    network.firingUntil =
      performance.now() + 90;
  }
});
function showDeathScreen(attackerName) {
  playerDead = true;
  shooting = false;
  aiming = false;
  isReloading = false;
  reloadTimer = 0;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
  document.body.classList.remove('scope-active');
  if (deathKillerName) deathKillerName.textContent = attackerName || 'ĐỐI PHƯƠNG';
  deathUntil = performance.now() + 3000;
  if (deathCountdown) deathCountdown.textContent = '3.0';
  if (deathOverlay) deathOverlay.hidden = false;
}

function hideDeathScreen() {
  playerDead = false;
  deathUntil = 0;
  if (deathOverlay) deathOverlay.hidden = true;
}

window.addEventListener('lntl:player-damage', (event) => {
  const { victimId, health, alive, attackerNickname } = event.detail || {};
  if (victimId === window.lntlMultiplayer?.getPlayerId()) {
    playerHealth = Math.max(0, Number(health) || 0);
    updateCombatUI();
    if (alive === false) {
      playerInvulnerableTimer = 3;
      showDeathScreen(attackerNickname);
    }
  } else {
    const remote = remotePlayers.get(victimId);
    if (remote && alive === false) {
      remote.visible = true;
      remote.userData.dead = true;
      remote.rotation.x = -Math.PI / 2;
      remote.rotation.z = 0;
      remote.userData.network.firingUntil = 0;
    }
  }
});
window.addEventListener('lntl:player-respawn', (event) => {
  const { player: respawned } = event.detail || {};
  if (!respawned?.id) return;
  if (respawned.id === window.lntlMultiplayer?.getPlayerId()) {
    playerHealth = 100;
    hideDeathScreen();
    if (respawned.state && [respawned.state.x, respawned.state.y, respawned.state.z, respawned.state.yaw].every(Number.isFinite)) {
      player.position.set(respawned.state.x, respawned.state.y, respawned.state.z);
      yaw = Number(respawned.state.yaw);
      pitch = Number.isFinite(respawned.state.pitch) ? respawned.state.pitch : -.025;

      // Yaw belongs to the player body. The camera is a child of the player,
      // so applying yaw to the camera as well would rotate it twice after respawn.
      player.rotation.y = yaw;
      camera.rotation.order = 'YXZ';
      camera.rotation.x = pitch;
      camera.rotation.y = 0;
      camera.rotation.z = 0;
    }
    playerInvulnerableTimer = 1.5;
    updateCombatUI();
  } else {
    const remote = remotePlayers.get(respawned.id);
    if (remote) {
      remote.visible = true;
      remote.userData.dead = false;
      remote.rotation.x = 0;
      remote.rotation.z = 0;
      if (respawned.state) {
        remote.position.set(respawned.state.x, respawned.state.y, respawned.state.z);
        remote.rotation.y = respawned.state.yaw ?? remote.rotation.y;
      }
    }
  }
});
window.addEventListener('lntl:remote-left', (event) => removeRemotePlayer(event.detail?.playerId));
window.addEventListener('lntl:multiplayer-spawn', (event) => {
  const state = event.detail?.state;
  if (!state || ![state.x, state.y, state.z, state.yaw].every(Number.isFinite)) return;
  player.position.set(state.x, state.y, state.z);
  yaw = state.yaw;
  pitch = Number.isFinite(state.pitch) ? state.pitch : -.025;
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
  verticalVelocity = 0;
  grounded = true;
});

window.addEventListener('lntl:multiplayer', (event) => {
  const detail = event.detail || {};
  if (detail.connected && detail.playerId && detail.room?.players) {
    // The server owns spawn assignments; both clients use the same room snapshot.
    const self = detail.room.players.find((entry) => entry.id === detail.playerId);
    const spawn = self?.state;
    if (spawn && [spawn.x, spawn.y, spawn.z, spawn.yaw].every(Number.isFinite)) {
      player.position.set(spawn.x, spawn.y, spawn.z);
      yaw = spawn.yaw;
      player.rotation.y = yaw;
      pitch = Number.isFinite(spawn.pitch) ? spawn.pitch : -.025;
      camera.rotation.x = pitch;
      verticalVelocity = 0;
      grounded = true;
    }
    for (const other of detail.room.players) {
      if (other.id !== detail.playerId && other.state) {
        window.dispatchEvent(new CustomEvent('lntl:remote-state', {
          detail: { type: 'player:state', playerId: other.id, nickname: other.nickname, state: other.state }
        }));
      }
    }
  }
  if (!detail.connected) {
    for (const id of [...remotePlayers.keys()]) removeRemotePlayer(id);
  }
});

updateCombatUI();

function saveLoadout() {
  try {
    localStorage.setItem('outpost-loadout', JSON.stringify({
      primary: weapons[equippedSlots.primary].name,
      pistol: weapons[equippedSlots.pistol].name,
      melee: meleeWeapons[equippedSlots.melee].name
    }));
  } catch {}
}

function getLoadoutStatus() {
  return `Ô CHÍNH: ${weapons[equippedSlots.primary].name}  ·  SÚNG LỤC: ${weapons[equippedSlots.pistol].name}  ·  CẬN CHIẾN: ${meleeWeapons[equippedSlots.melee].name}`;
}

function selectWeapon(index) {
  if (
    !weapons[index] ||
    !ownedWeapons.has(weapons[index].name) ||
    (equippedSlots.primary !== index && equippedSlots.pistol !== index)
  ) return;

  if (selectedWeapon !== index && boltCycle) resetBoltAction();
  if (selectedWeapon !== index && isReloading) {
    isReloading=false;
    reloadTimer=0;
    reloadWeapon=-1;
  }

  selectedWeapon=index;
  activeWeaponSlot=weapons[index].category==='Pistols' ? 'pistol' : 'primary';
  meleeMode=false;
  meleeModel.visible=false;
  weaponModel.visible=true;
  firearmArms.visible=true;

  weaponModel.clear();
  weaponModel.position.set(0,0,0);
  buildWeaponModel(weapons[selectedWeapon]);

  const slotNumber=activeWeaponSlot==='primary' ? 1 : 2;
  weaponLabel.textContent=`${slotNumber} / ${weapons[selectedWeapon].name}`;
  armoryStatus.textContent=getLoadoutStatus();
  updateAimUI();
  updateAmmoUI();
  renderArmory();
}

function equipWeapon(index) {
  if(!weapons[index] || !ownedWeapons.has(weapons[index].name)) return;
  const slot=weapons[index].category==='Pistols' ? 'pistol' : 'primary';
  equippedSlots[slot]=index;
  saveLoadout();
  selectWeapon(index);
}

function equipMeleeWeapon(index) {
  const weapon=meleeWeapons[index];
  if(!weapon || !ownedMeleeWeapons.has(weapon.name)) return;
  equippedSlots.melee=index;
  saveLoadout();
  selectMeleeWeapon(index);
}

function renderArmory() {
  armoryCategories.replaceChildren();

  for (const category of weaponCategories) {
    const section=document.createElement('section');
    section.className='armory-category';
    const heading=document.createElement('h3');
    heading.textContent=categoryLabels[category];

    const items=weapons.map((weapon,index)=>({weapon,index})).filter(({weapon})=>weapon.category===category);
    const count=document.createElement('span');
    count.textContent=`${items.length} ITEMS`;
    heading.append(count);
    section.append(heading);

    const list=document.createElement('div');
    list.className='armory-list';

    for (const {weapon,index} of items) {
      const card=document.createElement('article');
      const slot=weapon.category==='Pistols' ? 'pistol' : 'primary';
      const isEquipped=equippedSlots[slot]===index;
      const isSelected=!meleeMode && selectedWeapon===index;
      const slotLabel=slot==='pistol' ? 'Ô SÚNG LỤC' : 'Ô CHÍNH';

      card.className=`weapon-card${isEquipped ? ' equipped' : ''}`;
      card.dataset.category=category;

      const icon=document.createElement('span');
      icon.className='weapon-icon';
      icon.setAttribute('aria-hidden','true');

      const info=document.createElement('span');
      info.className='weapon-info';
      const name=document.createElement('strong');
      name.className='weapon-name';
      name.textContent=weapon.name;
      const meta=document.createElement('span');
      meta.className='weapon-meta';
      meta.textContent=`${weapon.damage} DAMAGE · ${magazineCapacity(weapon)} VIÊN · $${weapon.cost.toLocaleString('en-US')}`;
      info.append(name,meta);

      const button=document.createElement('button');
      button.className='weapon-action';
      button.type='button';
      button.dataset.weapon=weapon.name;

      const isOwned=ownedWeapons.has(weapon.name);
      const canAfford=playerBalance>=weapon.cost;
      button.textContent=isSelected
        ? 'ĐANG DÙNG'
        : isEquipped
          ? `CHỌN ${slotLabel}`
          : isOwned
            ? `TRANG BỊ ${slotLabel}`
            : canAfford
              ? `MUA & TRANG BỊ · $${weapon.cost.toLocaleString('en-US')}`
              : 'KHÔNG ĐỦ TIỀN';
      button.disabled=isSelected || (!isOwned && !canAfford);

      card.append(icon,info,button);
      list.append(card);
    }

    section.append(list);
    armoryCategories.append(section);
  }

  const meleeSection=document.createElement('section');
  meleeSection.className='armory-category';

  const meleeHeading=document.createElement('h3');
  meleeHeading.textContent='MELEE / CẬN CHIẾN';
  const meleeCount=document.createElement('span');
  meleeCount.textContent=`${meleeWeapons.length} ITEMS`;
  meleeHeading.append(meleeCount);
  meleeSection.append(meleeHeading);

  const meleeList=document.createElement('div');
  meleeList.className='armory-list';

  for(const [index,weapon] of meleeWeapons.entries()) {
    const card=document.createElement('article');
    const isEquipped=equippedSlots.melee===index;
    const isSelected=meleeMode && selectedMeleeIndex===index;

    card.className=`weapon-card${isEquipped ? ' equipped' : ''}`;
    card.dataset.category='Melee';

    const icon=document.createElement('span');
    icon.className='weapon-icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent=weapon.type==='knife' ? '🔪' : weapon.type==='axe' ? '🔨' : weapon.type==='pan' ? '🍳' : weapon.type==='katana' ? '🗡️' : '⚔️';

    const info=document.createElement('span');
    info.className='weapon-info';
    const name=document.createElement('strong');
    name.className='weapon-name';
    name.textContent=weapon.name;
    const meta=document.createElement('span');
    meta.className='weapon-meta';
    meta.textContent=`${weapon.damage} DAMAGE · TẦM ${weapon.range.toFixed(2)}M · $${weapon.cost.toLocaleString('en-US')}`;
    info.append(name,meta);

    const button=document.createElement('button');
    button.className='weapon-action';
    button.type='button';
    button.dataset.melee=weapon.name;

    const isOwned=ownedMeleeWeapons.has(weapon.name);
    const canAfford=playerBalance>=weapon.cost;
    button.textContent=isSelected
      ? 'ĐANG DÙNG'
      : isEquipped
        ? 'CHỌN Ô CẬN CHIẾN'
        : isOwned
          ? 'TRANG BỊ Ô CẬN CHIẾN'
          : canAfford
            ? `MUA & TRANG BỊ · $${weapon.cost.toLocaleString('en-US')}`
            : 'KHÔNG ĐỦ TIỀN';
    button.disabled=isSelected || (!isOwned && !canAfford);

    card.append(icon,info,button);
    meleeList.append(card);
  }

  meleeSection.append(meleeList);
  armoryCategories.append(meleeSection);
}

function openArmory(open) {
  armoryOpen = open;
  armory.classList.toggle('hidden', !open);
  armory.setAttribute('aria-hidden', String(!open));
  shooting = false;
  aiming = false;
  resetBoltAction();
  updateAimUI();
  keys.clear();
  if (open && document.pointerLockElement) document.exitPointerLock();
  canvas.style.cursor = open ? 'default' : (document.pointerLockElement === canvas ? 'none' : 'default');
}


function buyOrEquipWeapon(name) {
  const meleeIndex=meleeWeapons.findIndex(weapon=>weapon.name===name);

  if(meleeIndex>=0) {
    const weapon=meleeWeapons[meleeIndex];

    if(!ownedMeleeWeapons.has(name)) {
      if(playerBalance<weapon.cost) {
        armoryStatus.textContent=`KHÔNG ĐỦ TIỀN ĐỂ MUA ${name}`;
        return;
      }

      playerBalance-=weapon.cost;
      ownedMeleeWeapons.add(name);
      saveBalance();

      try {
        localStorage.setItem('outpost-owned-melee',JSON.stringify([...ownedMeleeWeapons]));
      } catch {}
    }

    equipMeleeWeapon(meleeIndex);
    armoryStatus.textContent=getLoadoutStatus();
    renderArmory();
    return;
  }

  const index=weapons.findIndex(weapon=>weapon.name===name);
  if(index<0) return;

  const weapon=weapons[index];
  if(!ownedWeapons.has(name)) {
    if(playerBalance<weapon.cost) {
      armoryStatus.textContent=`KHÔNG ĐỦ TIỀN ĐỂ MUA ${name}`;
      return;
    }
    playerBalance-=weapon.cost;
    ownedWeapons.add(name);
    saveBalance();
  }

  try {
    localStorage.setItem('outpost-owned-weapons',JSON.stringify([...ownedWeapons]));
  } catch {}

  equipWeapon(index);
  renderArmory();
}

function startReload() {
  if (!started || armoryOpen || meleeMode || isReloading || boltCycle) return;
  const weapon = weapons[selectedWeapon];
  const capacity = magazineCapacity(weapon);
  if ((magazineAmmo.get(weapon.name) ?? capacity) >= capacity) return;
  isReloading = true;
  reloadTimer = reloadDuration;
  reloadWeapon = selectedWeapon;
  shooting = false;
  updateAmmoUI();
}

buildWeaponModel(weapons[selectedWeapon]);
weaponLabel.textContent = `1 / ${weapons[selectedWeapon].name}`;
armoryStatus.textContent = getLoadoutStatus();
updateBalanceUI();
updateAmmoUI();
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
const casings = [];
const casingGeometry = new THREE.CylinderGeometry(.022, .022, .11, 8);
const casingMaterial = new THREE.MeshStandardMaterial({ color: '#bd8a36', metalness: .72, roughness: .32, emissive: '#38230a', emissiveIntensity: .18 });
const bulletMaterial = new THREE.MeshStandardMaterial({
  color: '#ffc36b',
  emissive: '#ff7b24',
  emissiveIntensity: 2.2,
  roughness: .35
});

function ejectSniperCasing() {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  const forward = new THREE.Vector3();
  const position = new THREE.Vector3();
  camera.getWorldDirection(forward);
  camera.getWorldPosition(position);
  position.addScaledVector(forward, .72).addScaledVector(right, .34).addScaledVector(up, -.16);
  const mesh = new THREE.Mesh(casingGeometry, casingMaterial);
  mesh.position.copy(position);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), right);
  scene.add(mesh);
  casings.push({
    mesh,
    velocity: right.multiplyScalar(2.1).addScaledVector(up, 1.4).addScaledVector(forward, .5),
    life: 3.2
  });
}

function updateBoltAction(delta) {
  if (!boltCycle) return;
  if (boltCycle.weaponIndex !== selectedWeapon || !boltHandle) {
    resetBoltAction();
    return;
  }
  boltCycle.elapsed += delta;
  const progress = Math.min(1, boltCycle.elapsed / boltCycle.duration);
  const lift = progress < .18
    ? THREE.MathUtils.smoothstep(progress, 0, .18)
    : progress < .62 ? 1 : 1 - THREE.MathUtils.smoothstep(progress, .62, .82);
  const pull = progress < .18
    ? 0
    : progress < .4
      ? THREE.MathUtils.smoothstep(progress, .18, .4)
      : progress < .62 ? 1 - THREE.MathUtils.smoothstep(progress, .4, .62) : 0;
  const handReach = THREE.MathUtils.smoothstep(progress, .08, .23) * (1 - THREE.MathUtils.smoothstep(progress, .68, .94));
  boltArm.position.lerpVectors(boltArmRest, boltArmWork, handReach);
  boltArm.rotation.z = -.38 * handReach;
  boltHandle.position.copy(boltHandleRest);
  boltHandle.position.z += .14 * pull;
  boltHandle.rotation.z = -1.05 * lift;

  if (progress >= .4 && !boltCycle.ejected) {
    boltCycle.ejected = true;
    ejectSniperCasing();
  }
  if (progress >= 1) {
    resetBoltAction();
    updateAmmoUI();
  }
}

function shoot() {
  if (!started || playerDead || armoryOpen || isReloading) return;

  if (meleeMode) {
    meleeAttack();
    return;
  }

  if (boltCycle) {
    shooting = false;
    return;
  }
  const weapon = weapons[selectedWeapon];
  const capacity = magazineCapacity(weapon);
  const ammo = magazineAmmo.get(weapon.name) ?? capacity;
  if (ammo <= 0) {
    shooting = false;
    updateAmmoUI();
    return;
  }
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.getWorldPosition(origin);
  origin.addScaledVector(direction, .65);
  const multiplayerConnected = window.lntlMultiplayer?.isConnected() ?? false;
  // PvP hit scan: evaluate the complete shot ray immediately so fast bullets cannot skip remote players between frames.
  if (multiplayerConnected) {
  const maxDistance = 120;

  const rayEnd =
    origin.clone().addScaledVector(
      direction,
      maxDistance
    );

  const obstacleDistance =
    firstObstacleDistance(
      origin,
      rayEnd
    );

  const hit =
    hitRemotePlayer(
      origin,
      rayEnd
    );

  if (
    hit &&
    hit.distance <=
      Math.min(
        obstacleDistance,
        maxDistance
      )
  ) {
    const damage =
      damageAtDistance(
        Number(weapon.damage) || 25,
        hit.distance
      );

    window.dispatchEvent(
      new CustomEvent(
        'lntl:player-hit',
        {
          detail: {
            victimId: hit.id,
            damage
          }
        }
      )
    );
  }
}
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(origin);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  scene.add(bullet);
  bullets.push({ mesh: bullet, origin: origin.clone(), velocity: direction.multiplyScalar(weapon.velocity), life: 1.1, owner: 'player', damage: weapon.damage, skipRemoteHit: multiplayerConnected });
  magazineAmmo.set(weapon.name, ammo - 1);
  shotCooldown = weapon.cooldown;
  const recoilKick = weapon.recoil * 0.20;
  pitch = THREE.MathUtils.clamp(pitch + recoilKick * (aiming ? .9 : 1), -.9, 1.35);
  weaponModel.position.y = Math.min(weaponModel.position.y + .05 + recoilKick * .18, .5);
  weaponModel.position.z = Math.min(weaponModel.position.z + .055 + recoilKick * .1, .3);
  if (weapon.category === 'Sniper Rifles') {
    boltCycle = { weaponIndex: selectedWeapon, elapsed: 0, duration: weapon.boltDuration, ejected: false };
    shooting = false;
  }
  updateAmmoUI();
}

function meleeAttack() {
  if (!started || armoryOpen || !meleeMode) return;
  if (meleeCooldown > 0) return;

  const weapon = meleeWeapons[selectedMeleeIndex];
  meleeCooldown = weapon.cooldown;
  meleeSwing = 0.22;

  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();

  camera.getWorldDirection(direction);
  camera.getWorldPosition(origin);

  const end = origin.clone().addScaledVector(
    direction,
    weapon.range
  );

  const obstacleDistance = firstObstacleDistance(origin, end);

  // Đánh người chơi khác trong phòng multiplayer.
  if (window.lntlMultiplayer?.isConnected()) {
    const hit = hitRemotePlayer(origin, end);

    if (
      hit &&
      hit.distance <= weapon.range &&
      hit.distance <= obstacleDistance
    ) {
      window.dispatchEvent(
        new CustomEvent('lntl:player-hit', {
          detail: {
            victimId: hit.id,
            damage: weapon.damage
          }
        })
      );
    }
  }

  // Đánh bot trong chế độ luyện tập.
  if (botTrainingEnabled && botAlive) {
    const hit = getBodyPartHit(
      origin,
      end,
      bot,
      bot.rotation.y
    );

    if (hit) {
      const hitDistance =
        hit.fraction * origin.distanceTo(end);

      if (
        hitDistance <= weapon.range &&
        hitDistance <= obstacleDistance
      ) {
        damageBot(weapon.damage, hit);
      }
    }
  }
}
function closestPointOnSegment(point, start, end, target) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared === 0) return target.copy(start);
  const amount = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return target.copy(start).addScaledVector(segment, amount);
}

const bodyParts = [
  { name: 'ĐẦU', x: 0, y: 1.62, z: 0, radius: .23, multiplier: 2.5 },
  { name: 'THÂN', x: 0, y: 1.08, z: 0, radius: .34, multiplier: 1 },
  { name: 'TAY TRÁI', x: -.37, y: 1.08, z: 0, radius: .17, multiplier: .65 },
  { name: 'TAY PHẢI', x: .37, y: 1.08, z: 0, radius: .17, multiplier: .65 },
  { name: 'CHÂN TRÁI', x: -.17, y: .39, z: 0, radius: .18, multiplier: .7 },
  { name: 'CHÂN PHẢI', x: .17, y: .39, z: 0, radius: .18, multiplier: .7 }
];

function getBodyPartHit(start, end, character, rotationY) {
  const segment = end.clone().sub(start);
  const segmentLengthSquared = segment.lengthSq();
  if (segmentLengthSquared === 0) return null;
  let nearestHit = null;
  for (const part of bodyParts) {
    const center = new THREE.Vector3(part.x, part.y, part.z)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
      .add(character.position);
    const offset = start.clone().sub(center);
    const a = segmentLengthSquared;
    const b = 2 * offset.dot(segment);
    const c = offset.lengthSq() - part.radius * part.radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) continue;
    const root = Math.sqrt(discriminant);
    let fraction = (-b - root) / (2 * a);
    if (fraction < 0) fraction = (-b + root) / (2 * a);
    if (fraction < 0 || fraction > 1 || (nearestHit && fraction >= nearestHit.fraction)) continue;
    nearestHit = { ...part, fraction };
  }
  return nearestHit;
}

function damageFalloffMultiplier(distance) {
  const falloffStart = 8;
  const falloffEnd = 45;
  const minimumMultiplier = .25;
  const falloff = THREE.MathUtils.clamp((distance - falloffStart) / (falloffEnd - falloffStart), 0, 1);
  return 1 - falloff * (1 - minimumMultiplier);
}

function damageAtDistance(baseDamage, distance) {
  return Math.max(1, Math.round(baseDamage * damageFalloffMultiplier(distance)));
}

function damageForBodyPart(baseDamage, hit, distance) {
  return Math.max(1, Math.round(baseDamage * hit.multiplier * damageFalloffMultiplier(distance)));
}

function firstObstacleDistance(start, end) {
  const segment = end.clone().sub(start);
  const length = segment.length();
  if (length === 0) return Infinity;
  const ray = new THREE.Ray(start, segment.normalize());
  let nearest = Infinity;
  const intersection = new THREE.Vector3();
  for (const box of collisionBoxes) {
    const bounds = new THREE.Box3(
      new THREE.Vector3(box.x - box.halfX, box.bottom, box.z - box.halfZ),
      new THREE.Vector3(box.x + box.halfX, box.top, box.z + box.halfZ)
    );
    if (ray.intersectBox(bounds, intersection)) {
      const distance = intersection.distanceTo(start);
      if (distance > .12 && distance < nearest && distance <= length) nearest = distance;
    }
  }
  return nearest;
}

function damageBot(amount, hit) {
  if (!botTrainingEnabled || !botAlive) return;
  botHealth = Math.max(0, botHealth - amount);
  botHitPartLabel.textContent = `${hit.name} · −${amount} HP`;
  if (botHealth === 0) {
    botAlive = false;
    botRespawnTimer = 5;
    bot.visible = false;
  }
  updateCombatUI();
}

function damagePlayer(amount, hit, incomingDirection = player.position.clone().sub(bot.position)) {
  if (playerInvulnerableTimer > 0) return;
  showDamageFeedback(incomingDirection, hit.name, amount);
  playerHitPartLabel.textContent = `${hit.name} · −${amount} HP`;
  playerHealth = Math.max(0, playerHealth - amount);
  if (playerHealth === 0) {
    playerHealth = 100;
    player.position.copy(playerSpawn);
    pitch = 0;
    yaw = -Math.PI / 2;
    playerInvulnerableTimer = 1.5;
  }
  updateCombatUI();
}

function fireBot(target) {
  const origin = bot.localToWorld(new THREE.Vector3(.12, 1.08, -.9));
  const direction = target.clone().sub(origin).normalize();
  // Small, consistent spread keeps the bot dangerous without making every shot unavoidable.
  direction.x += (Math.random() - .5) * .035;
  direction.y += (Math.random() - .5) * .025;
  direction.z += (Math.random() - .5) * .035;
  direction.normalize();
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(origin);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  scene.add(bullet);
  bullets.push({ mesh: bullet, origin: origin.clone(), velocity: direction.multiplyScalar(30), life: 2.2, owner: 'bot', damage: 9 });
  botMuzzleTimer = .08;
  botMuzzle.visible = true;
}

function updateBot(delta) {
  if (!botTrainingEnabled) return;
  botMuzzleTimer = Math.max(0, botMuzzleTimer - delta);
  botMuzzle.visible = botMuzzleTimer > 0;
  if (!botAlive) {
    botRespawnTimer -= delta;
    if (botRespawnTimer <= 0) {
      botHealth = 100;
      botAlive = true;
      bot.position.copy(botSpawn);
      bot.rotation.y = Math.PI / 2;
      bot.visible = true;
      botShotTimer = 1.1;
      updateCombatUI();
    } else {
      updateCombatUI();
    }
    return;
  }

  const target = camera.getWorldPosition(new THREE.Vector3());
  const botEye = bot.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const offsetX = target.x - bot.position.x;
  const offsetZ = target.z - bot.position.z;
  const distance = Math.hypot(offsetX, offsetZ);
  bot.rotation.y = Math.atan2(-offsetX, -offsetZ);

  const desiredRange = 9;
  if (distance > desiredRange) {
    const speed = 2.65;
    const stepX = offsetX / Math.max(distance, .001) * speed * delta;
    const stepZ = offsetZ / Math.max(distance, .001) * speed * delta;
    let moved = false;
    if (canOccupy(bot.position.x + stepX, bot.position.z, bot.position.y) &&
        Math.hypot(bot.position.x + stepX - player.position.x, bot.position.z - player.position.z) > 1.1) {
      bot.position.x += stepX;
      moved = true;
    }
    if (canOccupy(bot.position.x, bot.position.z + stepZ, bot.position.y) &&
        Math.hypot(bot.position.x - player.position.x, bot.position.z + stepZ - player.position.z) > 1.1) {
      bot.position.z += stepZ;
      moved = true;
    }
    if (!moved) {
      botStrafeSign *= -1;
      const sideStep = botStrafeSign * speed * delta;
      if (canOccupy(bot.position.x, bot.position.z + sideStep, bot.position.y)) bot.position.z += sideStep;
    }
  } else if (distance < 6) {
    const sideStep = botStrafeSign * 1.1 * delta;
    if (canOccupy(bot.position.x, bot.position.z + sideStep, bot.position.y)) bot.position.z += sideStep;
    else botStrafeSign *= -1;
  }

  const surface = getSurfaceAt(bot.position.x, bot.position.z, bot.position.y);
  bot.position.y = surface.height;
  botShotTimer -= delta;
  if (distance < 32 && !isInSafeZone(player.position) && botShotTimer <= 0 && firstObstacleDistance(botEye, target) === Infinity) {
    fireBot(target);
    botShotTimer = .88 + Math.random() * .42;
    botStateLabel.textContent = 'ĐANG GIAO TRANH';
  } else if (distance >= 32 || isInSafeZone(player.position) || firstObstacleDistance(botEye, target) !== Infinity) {
    botStateLabel.textContent = 'ĐANG TRUY TÌM';
  }
}

function rotateCamera(deltaX, deltaY) {
  if (playerDead) return;
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

function switchWeaponSlot(slot) {
  if(!started || armoryOpen) return;

  if(slot==='melee') {
    selectMeleeWeapon(equippedSlots.melee);
    return;
  }

  if(!['primary','pistol'].includes(slot)) return;
  selectWeapon(equippedSlots[slot]);
}

function cycleWeapon(direction) {
  if(!started || armoryOpen) return;

  const slots=['primary','pistol','melee'];
  const current=Math.max(0,slots.indexOf(activeWeaponSlot));
  const next=(current+(direction>0 ? 1 : -1)+slots.length)%slots.length;
  switchWeaponSlot(slots[next]);
}

function handleArmoryClick(event) {
  const meleeButton = event.target.closest('[data-melee]');

  if (meleeButton) {
    buyOrEquipWeapon(meleeButton.dataset.melee);
    return;
  }

  const button = event.target.closest('[data-weapon]');

  if (button) {
    buyOrEquipWeapon(button.dataset.weapon);
  }
}

const intro = document.querySelector('#intro');
function captureGameShortcuts() {
  // Capture Ctrl+W where the browser supports Keyboard Lock. C remains the safe crouch key everywhere.
  const keyboard = navigator.keyboard;
  if (!keyboard?.lock) return;
  try {
    keyboard.lock(['ControlLeft', 'ControlRight', 'KeyW']).catch(() => {});
  } catch {
    // Some browsers require fullscreen or do not implement Keyboard Lock.
  }
}

settingsOpenButton.addEventListener('click', () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  settingsOpenButton.setAttribute('aria-expanded', String(open));
  if (open) botTrainingToggle.focus();
});
document.querySelector('#settings-done').addEventListener('click', () => {
  settingsPanel.hidden = true;
  settingsOpenButton.setAttribute('aria-expanded', 'false');
  settingsOpenButton.focus();
});
botTrainingToggle.addEventListener('change', () => {
  botModeLabel.textContent = botTrainingToggle.checked ? 'CÓ' : 'KHÔNG';
});
function startPatrol() {
  if (started) return;
  setBotTraining(botTrainingToggle.checked);
  captureGameShortcuts();
  started = true;
  intro.classList.add('hidden');
  settingsPanel.hidden = true;
  canvas.focus();
}

document.querySelector('#enter').addEventListener('click', () => {
  if (document.querySelector('#multiplayer-mode')?.checked) {
    if (!window.lntlMultiplayer?.isConnected()) {
      const status = document.querySelector('#mp-status');
      if (status) status.textContent = 'Hãy tạo phòng hoặc tham gia phòng trước khi sẵn sàng.';
      return;
    }
    window.dispatchEvent(new CustomEvent('lntl:ready-toggle'));
    return;
  }
  startPatrol();
});

window.addEventListener('lntl:game-start', () => {
  startPatrol();
});
addEventListener('keydown', (event) => {
  if (event.code === 'KeyW' && event.ctrlKey) event.preventDefault();
  if (event.code === 'KeyB' && started && !event.repeat) {
    event.preventDefault();
    if (!armoryOpen && !isInSafeZone()) {
      showSafeZoneNotice();
      return;
    }
    openArmory(!armoryOpen);
    return;
  }
  if (armoryOpen) {
    if (event.code === 'Escape') openArmory(false);
    event.preventDefault();
    return;
  }
  if (event.code === 'KeyR' && !event.repeat) {
    event.preventDefault();
    startReload();
    return;
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight", "Space"].includes(event.code)) event.preventDefault();
  
if (event.code === 'Digit1') {
    switchWeaponSlot('primary');
  }

  if (event.code === 'Digit2') {
    switchWeaponSlot('pistol');
  }

  if (event.code === 'Digit3') {
    switchWeaponSlot('melee');
  }

  if (event.code === 'KeyC' && !event.repeat) toggleCrouch();
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
let multiplayerStateTimer = 0;
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  // ========================================
// REMOTE PLAYER INTERPOLATION
// ========================================

const now = performance.now();

  if (playerDead && deathCountdown && deathUntil > 0) {
    const remaining = Math.max(0, (deathUntil - now) / 1000);
    deathCountdown.textContent = remaining.toFixed(1);
  }

for (const [id, remote] of remotePlayers) {
  const network =
    remote.userData.network;

  if (
    !network ||
    !network.target
  ) {
    continue;
  }

  const target =
    network.target;

  const current =
    network.current;

  /*
   * Smooth position.
   */
  const interpolationSpeed = 18;

  current.x +=
    (target.x - current.x) *
    Math.min(
      1,
      delta * interpolationSpeed
    );

  current.y +=
    (target.y - current.y) *
    Math.min(
      1,
      delta * interpolationSpeed
    );

  current.z +=
    (target.z - current.z) *
    Math.min(
      1,
      delta * interpolationSpeed
    );

  /*
   * Smooth yaw without 360° snapping.
   */
  let yawDifference =
    target.yaw - current.yaw;

  while (
    yawDifference > Math.PI
  ) {
    yawDifference -=
      Math.PI * 2;
  }

  while (
    yawDifference < -Math.PI
  ) {
    yawDifference +=
      Math.PI * 2;
  }

  current.yaw +=
    yawDifference *
    Math.min(
      1,
      delta * interpolationSpeed
    );

  /*
   * Smooth pitch.
   */
  current.pitch +=
    (target.pitch - current.pitch) *
    Math.min(
      1,
      delta * interpolationSpeed
    );

  remote.position.set(
    current.x,
    current.y,
    current.z
  );

  remote.rotation.y =
    current.yaw;

  /*
   * Weapon movement.
   */
  const weaponRoot =
    remote.userData.weaponRoot;

  if (weaponRoot) {
    const isFiring =
      now < network.firingUntil;

    const moving =
      target.moving;

    const bob =
      moving
        ? Math.sin(now * .012) * .025
        : 0;

    // Keep the remote weapon at the hands instead of dropping it to the feet.
    // The remote weapon uses the same -Z forward axis as the player camera.
    weaponRoot.position.y =
      1.12 + bob;

    // Mirror the remote player's vertical aim as well as horizontal yaw.
    weaponRoot.rotation.x =
      target.pitch + (isFiring ? -.12 : 0);

    weaponRoot.rotation.y =
      isFiring ? .05 : 0;

    /*
     * Melee swing / firing recoil.
     */
    if (
      target.weaponSlot === "melee"
    ) {
      weaponRoot.rotation.x +=
        isFiring ? -.45 : 0;

      weaponRoot.position.z =
        isFiring ? -.08 : 0;
    } else {
      weaponRoot.position.z =
        isFiring ? -.045 : 0;
    }
  }

  /*
   * Crouch.
   */
  const targetScaleY =
    target.crouched
      ? .78
      : 1;

  remote.scale.y +=
    (targetScaleY - remote.scale.y) *
    Math.min(
      1,
      delta * 12
    );
}
  playerInvulnerableTimer = Math.max(0, playerInvulnerableTimer - delta);
  damageFlashTimer = Math.max(0, damageFlashTimer - delta);
  playerHitSlowTimer = Math.max(0, playerHitSlowTimer - delta);
  if (damageFlashTimer === 0) playerHealthPanel.classList.remove('hit');
  multiplayerStateTimer += delta;
  if (
  multiplayerStateTimer >= 0.033 &&
  started &&
  window.lntlMultiplayer?.isConnected()
) {
    multiplayerStateTimer = 0;
    window.dispatchEvent(
  new CustomEvent('lntl:send-state', {
    detail: {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,

      yaw,
      pitch,

      // =========================
      // WEAPON STATE
      // =========================

      weaponSlot:
        activeWeaponSlot,

      weaponName:
        meleeMode
          ? meleeWeapons[selectedMeleeIndex]?.name || "Dao"
          : weapons[selectedWeapon]?.name || "",

      weaponCategory:
        meleeMode
          ? "Melee"
          : weapons[selectedWeapon]?.category || "",

      meleeType:
        meleeMode
          ? meleeWeapons[selectedMeleeIndex]?.type || "knife"
          : "",

      // =========================
      // ACTION STATE
      // =========================

      firing:
        shooting ||
        meleeSwing > 0,

      aiming,

      moving:
        keys.has("KeyW") ||
        keys.has("KeyA") ||
        keys.has("KeyS") ||
        keys.has("KeyD"),

      crouched
    }
  })
);
  }
  const safeZoneWave = Math.sin(performance.now() * .0017);
  safeZone.position.y = safeZoneBaseY + safeZoneWave * .055;
  safeZoneOutline.position.y = safeZone.position.y;
  safeZoneMaterial.opacity = .095 + (safeZoneWave + 1) * .012;
  const weaponSettle = Math.exp(-delta * 5);
  weaponModel.position.x *= weaponSettle;
  weaponModel.position.y *= weaponSettle;
  weaponModel.position.z *= weaponSettle;
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
  const leanInput = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
  const leanAmount = aiming ? .28 : .42;
  camera.position.x += (leanInput * leanAmount - camera.position.x) * Math.min(1, delta * 9);
  camera.rotation.z += (leanInput * -.14 - camera.rotation.z) * Math.min(1, delta * 9);
  const targetFov = meleeMode ? 72 : (aiming ? (weapons[selectedWeapon].category === 'Sniper Rifles' ? 22 : 50) : 72);
  const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 9, delta);
  if (Math.abs(nextFov - camera.fov) > .01) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
  if (isReloading) {
    reloadTimer -= delta;
    if (reloadTimer <= 0) {
      const reloadTarget = weapons[reloadWeapon];
      magazineAmmo.set(reloadTarget.name, magazineCapacity(reloadTarget));
      isReloading = false;
      reloadTimer = 0;
      reloadWeapon = -1;
      updateAmmoUI();
    }
  }
  updateBoltAction(delta);
  shotCooldown = Math.max(0, shotCooldown - delta);

  meleeCooldown = Math.max(0, meleeCooldown - delta);
  meleeSwing = Math.max(0, meleeSwing - delta);
  const swingProgress = meleeSwing > 0 ? 1 - meleeSwing / .22 : 0;
  const swingArc = meleeSwing > 0 ? Math.sin(swingProgress * Math.PI) : 0;
  const idleSway = Math.sin(performance.now() * .0024) * .012;
  meleeModel.position.set(
    meleeRestPosition.x + (meleeSwing > 0 ? -.08 * swingArc : 0),
    meleeRestPosition.y + (meleeSwing > 0 ? .06 * swingArc : idleSway),
    meleeRestPosition.z + (meleeSwing > 0 ? .1 * swingArc : 0)
  );
  meleeModel.rotation.set(
    meleeRestRotation.x - .85 * swingArc + idleSway,
    meleeRestRotation.y - .35 * swingArc,
    meleeRestRotation.z + .28 * swingArc
  );
  if (started && shooting && shotCooldown <= 0) shoot();
  if (started) updateBot(delta);

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const previousPosition = bullet.mesh.position.clone();
    bullet.mesh.position.addScaledVector(bullet.velocity, delta);
    const obstacleDistance = firstObstacleDistance(previousPosition, bullet.mesh.position);
    if (bullet.owner === 'player' && !bullet.skipRemoteHit && window.lntlMultiplayer?.isConnected()) {
      const hit = hitRemotePlayer(previousPosition, bullet.mesh.position);
      const segmentLength = previousPosition.distanceTo(bullet.mesh.position);
      if (hit && hit.distance <= obstacleDistance && hit.distance <= segmentLength) {
        const distance = bullet.origin ? bullet.origin.distanceTo(previousPosition) + hit.distance : hit.distance;
        window.dispatchEvent(new CustomEvent('lntl:player-hit', { detail: { victimId: hit.id, damage: damageAtDistance(bullet.damage || 25, distance) } }));
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        continue;
      }
    }
    const target = bullet.owner === 'player' ? bot : player;
    const targetActive = bullet.owner === 'player' ? botTrainingEnabled && botAlive : true;
    const bodyHit = targetActive ? getBodyPartHit(previousPosition, bullet.mesh.position, target, target.rotation.y) : null;
    const hitDistance = bodyHit ? bodyHit.fraction * previousPosition.distanceTo(bullet.mesh.position) : Infinity;
    const hitTarget = bodyHit && hitDistance <= obstacleDistance;
    if (hitTarget) {
      const hitPosition = previousPosition.clone().lerp(bullet.mesh.position, bodyHit.fraction);
      const distance = bullet.origin ? bullet.origin.distanceTo(hitPosition) : hitDistance;
      const appliedDamage = damageForBodyPart(bullet.damage, bodyHit, distance);
      if (bullet.owner === 'player') damageBot(appliedDamage, bodyHit);
      else if (!isInSafeZone(player.position)) damagePlayer(appliedDamage, bodyHit, bullet.velocity.clone().negate());
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }
    if (obstacleDistance !== Infinity) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }
    bullet.life -= delta;
    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }

  for (let i = casings.length - 1; i >= 0; i--) {
    const casing = casings[i];
    casing.velocity.y -= 8.5 * delta;
    casing.mesh.position.addScaledVector(casing.velocity, delta);
    casing.mesh.rotation.x += delta * 11;
    casing.mesh.rotation.z += delta * 8;
    casing.life -= delta;
    if (casing.mesh.position.y <= groundLevel) {
      casing.mesh.position.y = groundLevel;
      casing.velocity.y *= -.28;
      casing.velocity.x *= .72;
      casing.velocity.z *= .72;
    }
    if (casing.life <= 0) {
      scene.remove(casing.mesh);
      casings.splice(i, 1);
    }
  }

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  let moveForward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  let moveSide = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const moving = moveForward !== 0 || moveSide !== 0;
  if (moving && started && !playerDead) {
    const length = Math.hypot(moveForward, moveSide);
    moveForward /= length;
    moveSide /= length;
    const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !crouched;
    const baseSpeed = crouched ? 2.6 : sprinting ? 8.1 : 4.7;
    const speed = baseSpeed * (playerHitSlowTimer > 0 ? .55 : 1);
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
    if (canOccupy(nextX, player.position.z, player.position.y) &&
      (!botTrainingEnabled || !botAlive || Math.hypot(nextX - bot.position.x, player.position.z - bot.position.z) > 1.05)) player.position.x = nextX;
    if (canOccupy(player.position.x, nextZ, player.position.y) &&
      (!botTrainingEnabled || !botAlive || Math.hypot(player.position.x - bot.position.x, nextZ - bot.position.z) > 1.05)) player.position.z = nextZ;
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
