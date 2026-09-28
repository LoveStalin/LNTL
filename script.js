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
  window: new THREE.MeshStandardMaterial({ color: '#688078', roughness: .3, metalness: .1, emissive: '#273934', emissiveIntensity: .3 }),
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

function createHouse(x, facing) {
  const house = new THREE.Group();
  house.position.set(x, 0, 0);
  scene.add(house);
  cube(house, mats.wall, 0, 1.85, 0, 8, 3.7, 7);
  cube(house, mats.wallShadow, 0, .16, 0, 8.08, .28, 7.08);
  cube(house, mats.roof, 0, 3.77, 0, 8.65, .42, 7.65);
  cube(house, mats.trim, 0, 4.02, -3.48, 8.2, .26, .36);
  cube(house, mats.trim, 0, 4.02, 3.48, 8.2, .26, .36);
  cube(house, mats.trim, -4, 4.02, 0, .34, .26, 7.1);
  cube(house, mats.trim, 4, 4.02, 0, .34, .26, 7.1);
  const faceX = facing * 4.065;
  for (const z of [-2.05, 2.05]) {
    cube(house, mats.trim, faceX, 2.25, z, .12, 1.28, 1.42);
    cube(house, mats.window, faceX + facing * .075, 2.25, z, .1, 1.03, 1.15);
    cube(house, mats.trim, faceX + facing * .14, 2.25, z, .1, .08, 1.43);
    cube(house, mats.trim, faceX + facing * .14, 2.25, z, .1, 1.3, .08);
  }
  cube(house, mats.trim, faceX + facing * .045, 1.14, 0, .18, 2.32, 1.5);
  cube(house, mats.door, faceX + facing * .14, 1.12, 0, .1, 2.08, 1.2);
  cylinder(house, mats.accent, faceX + facing * .22, 1.14, -.38, .045, .045, .06, 8).rotation.z = Math.PI / 2;
  cube(house, mats.trim, faceX + facing * .14, 2.34, 0, .09, .16, 1.55);
  for (const z of [-3.68, 3.68]) cube(house, mats.trim, 0, .7, z, 7.8, .18, .14);
  cube(house, mats.wallShadow, -1.5, 2.15, -3.56, 2.2, .2, .08);
  const roofBox = cube(house, mats.metal, -2.2, 4.05, 2.45, 1.15, .34, .78);
  roofBox.rotation.y = -.18;
  for (const z of [-2.8, 2.8]) cube(house, mats.trim, -facing * .4, .42, z, 1.1, .82, .72);
}
createHouse(-14.7, 1);
createHouse(14.7, -1);

for (const [x, z, size] of [
  [-10.5, -7.8, 1.45], [10.5, 7.8, 1.45], [-10.3, 7.2, 1.15], [10.3, -7.1, 1.15]
]) {
  cube(scene, mats.crate, x, size / 2, z, size, size, size);
  for (const offset of [-.28, .28]) cube(scene, mats.wallShadow, x + offset, size / 2, z + size / 2 + .014, .055, size * .92, .03);
  cube(scene, mats.trim, x, size * .72, z, size * 1.03, .07, size * 1.03);
}
for (const [x, z, scale] of [[-23,-13,1.1],[22,-14,1.25],[-25,12,1.35],[25,13,1.1],[-8,17,.8],[8,-18,.9],[-21,3,.95],[22,-2,1.1]]) {
  cylinder(scene, mats.wallShadow, x, .65 * scale, z, .18 * scale, .26 * scale, 1.3 * scale, 7);
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
for (const [x, z] of [[-10.7, 0], [10.7, 0]]) {
  cube(scene, mats.wallShadow, x, .52, z, .5, 1.04, 4.4);
  for (let stripe = -1.5; stripe <= 1.5; stripe += .75) cube(scene, mats.accent, x, .52, z + stripe, .53, .13, .32);
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
  { name: 'CARBINE', cooldown: .16, build: () => {
    cube(weaponModel, mats.metal, .24, -.2, -.77, .19, .17, .48, false);
    cube(weaponModel, mats.trim, .24, -.21, -1.13, .15, .13, .43, false);
    cube(weaponModel, mats.metal, .24, -.19, -1.51, .055, .055, .48, false);
    cube(weaponModel, mats.trim, .24, -.08, -.76, .08, .1, .22, false);
    cube(weaponModel, mats.metal, .24, -.42, -.82, .13, .28, .17, false);
    cube(weaponModel, mats.metal, .24, -.12, -.67, .12, .08, .17, false);
    cube(weaponModel, mats.accent, .24, -.065, -.67, .07, .025, .1, false);
  }},
  { name: 'PISTOL', cooldown: .28, build: () => {
    cube(weaponModel, mats.metal, .24, -.24, -.79, .16, .19, .38, false);
    cube(weaponModel, mats.trim, .24, -.2, -1.08, .12, .12, .28, false);
    cube(weaponModel, mats.metal, .24, -.4, -.77, .11, .24, .13, false);
    cube(weaponModel, mats.accent, .24, -.14, -.66, .07, .025, .08, false);
  }},
  { name: 'SHOTGUN', cooldown: .62, build: () => {
    cube(weaponModel, mats.metal, .24, -.2, -.77, .2, .19, .47, false);
    cube(weaponModel, mats.trim, .24, -.2, -1.15, .16, .16, .5, false);
    cube(weaponModel, mats.metal, .24, -.19, -1.58, .085, .085, .56, false);
    cube(weaponModel, mats.trim, .24, -.4, -.78, .15, .26, .2, false);
    cube(weaponModel, mats.accent, .24, -.08, -.68, .08, .04, .12, false);
  }},
  { name: 'SMG', cooldown: .09, build: () => {
    cube(weaponModel, mats.metal, .24, -.21, -.78, .18, .16, .4, false);
    cube(weaponModel, mats.trim, .24, -.2, -1.06, .13, .12, .3, false);
    cube(weaponModel, mats.metal, .24, -.19, -1.34, .045, .045, .28, false);
    cube(weaponModel, mats.metal, .24, -.4, -.79, .11, .28, .12, false);
    cube(weaponModel, mats.trim, .24, -.06, -.71, .1, .08, .16, false);
  }}
];
let selectedWeapon = 0;
const weaponLabel = document.querySelector('#weapon-label');
const weaponButton = document.querySelector('#weapon-toggle');

function selectWeapon(index) {
  selectedWeapon = (index + weapons.length) % weapons.length;
  weaponModel.clear();
  weapons[selectedWeapon].build();
  const label = `${selectedWeapon + 1} / ${weapons[selectedWeapon].name}`;
  weaponLabel.textContent = label;
}

selectWeapon(0);

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
  bullets.push({ mesh: bullet, velocity: direction.multiplyScalar(75), life: 1.1 });
  shotCooldown = weapons[selectedWeapon].cooldown;
}

function rotateCamera(deltaX, deltaY) {
  yaw -= deltaX * .0024;
  pitch = THREE.MathUtils.clamp(pitch - deltaY * .002, -.9, .9);
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function toggleCrouch() {
  if (!started || !grounded) return;
  crouched = !crouched;
  document.querySelector('#crouch-toggle').textContent = crouched ? 'ĐỨNG DẬY' : 'NGỒI';
  document.querySelector('#crouch-toggle').setAttribute('aria-pressed', String(crouched));
}

function cycleWeapon(direction) {
  if (started) selectWeapon(selectedWeapon + direction);
}

const intro = document.querySelector('#intro');
document.querySelector('#enter').addEventListener('click', () => {
  started = true;
  intro.classList.add('hidden');
  canvas.focus();
});
addEventListener('keydown', (event) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "ControlLeft", "ControlRight"].includes(event.code)) event.preventDefault();
  if (event.code.startsWith('Digit') && Number(event.code.slice(5)) >= 1 && Number(event.code.slice(5)) <= 4) {
    selectWeapon(Number(event.code.slice(5)) - 1);
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
document.addEventListener('wheel', (event) => {
  if (started) {
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
  }
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging || document.pointerLockElement === canvas) return;
  rotateCamera(event.clientX - previousPointer.x, event.clientY - previousPointer.y);
  previousPointer = { x: event.clientX, y: event.clientY };
});
addEventListener('pointerup', (event) => {
  if (event.pointerType === 'mouse') shooting = false;
  dragging = false;
});
canvas.addEventListener('pointercancel', () => {
  dragging = false;
});
document.addEventListener('pointerlockchange', () => {
  canvas.style.cursor = document.pointerLockElement === canvas ? 'none' : 'default';
  if (document.pointerLockElement !== canvas) {
    dragging = false;
    shooting = false;
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
  shotCooldown = Math.max(0, shotCooldown - delta);
  if (started && shooting && shotCooldown <= 0) shoot();

  if (started && !grounded) {
    verticalVelocity -= 18 * delta;
    player.position.y += verticalVelocity * delta;
    if (player.position.y <= groundLevel) {
      player.position.y = groundLevel;
      verticalVelocity = 0;
      grounded = true;
    }
  }

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
    player.position.addScaledVector(forward, moveForward * speed * delta);
    player.position.addScaledVector(right, moveSide * speed * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -24, 24);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -25, 25);
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
