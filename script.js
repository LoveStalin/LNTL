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
cube(viewModel, mats.metal, .24, -.2, -.77, .19, .17, .48, false);
cube(viewModel, mats.trim, .24, -.21, -1.13, .15, .13, .43, false);
cube(viewModel, mats.metal, .24, -.19, -1.51, .055, .055, .48, false);
cube(viewModel, mats.trim, .24, -.08, -.76, .08, .1, .22, false);
cube(viewModel, mats.metal, .24, -.42, -.82, .13, .28, .17, false);
cube(viewModel, mats.metal, .24, -.12, -.67, .12, .08, .17, false);
cube(viewModel, mats.accent, .24, -.065, -.67, .07, .025, .1, false);

const keys = new Set();
let dragging = false;
let previousPointer = { x: 0, y: 0 };
let started = false;
const intro = document.querySelector('#intro');
document.querySelector('#enter').addEventListener('click', () => {
  started = true;
  intro.classList.add('hidden');
  canvas.focus();
});
addEventListener('keydown', (event) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === 'Escape') {
    dragging = false;
    canvas.style.cursor = 'grab';
  }
});
addEventListener('keyup', (event) => keys.delete(event.code));
canvas.addEventListener('pointerdown', (event) => {
  if (!started) return;
  dragging = true;
  previousPointer = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - previousPointer.x) * .005;
  pitch = THREE.MathUtils.clamp(pitch - (event.clientY - previousPointer.y) * .003, -.55, .65);
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
  previousPointer = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', () => {
  dragging = false;
  canvas.style.cursor = 'grab';
});
canvas.addEventListener('pointercancel', () => {
  dragging = false;
  canvas.style.cursor = 'grab';
});
canvas.style.cursor = 'grab';

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  let moveForward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  let moveSide = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const moving = moveForward !== 0 || moveSide !== 0;
  if (moving && started) {
    const length = Math.hypot(moveForward, moveSide);
    moveForward /= length;
    moveSide /= length;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.1 : 4.7;
    player.position.addScaledVector(forward, moveForward * speed * delta);
    player.position.addScaledVector(right, moveSide * speed * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -24, 24);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -25, 25);
    const bob = Math.abs(Math.sin(performance.now() * .012)) * .035;
    camera.position.y = 1.68 + bob;
    viewModel.position.y = -bob;
  } else {
    camera.position.y += (1.68 - camera.position.y) * .15;
    viewModel.position.y *= .85;
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
