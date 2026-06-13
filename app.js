import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene, camera, renderer, basket, ground, coins = [], decorObjects = [];
let score = 0, lives = 7, gameRunning = false, isPaused = false;
let lastSpawnTime = 0;
let isDragging = false, dragOffsetX = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const restartBtn = document.getElementById('restartBtn');
const startScreenEl = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const clock = new THREE.Clock();
const spawnInterval = 1200;
const fallSpeed = 2.0;

const makeMat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, ...opts });

init();
animate();

startBtn.onclick = startGame;
restartBtn.onclick = backToStart;
playAgainBtn.onclick = backToStart;
pauseBtn.onclick = togglePause;
resetBtn.onclick = resetGameOnly;
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.onresize = onResize;
window.onkeydown = onKeyDown;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 18, 65);

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 8, 16);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.45));
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  sunLight.position.set(5, 10, 8);
  scene.add(sunLight);

  createAestheticBackground();

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 60),
    makeMat(0x7fd58b, { roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);

  const basketGroup = new THREE.Group();
  const bodyMat = makeMat(0xd18a4b, { roughness: 0.95, metalness: 0.02 });
  const weaveMat = makeMat(0xb86f35, { roughness: 1.0 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.55, 22, 18), bodyMat);
  body.scale.set(1.15, 0.85, 0.95);
  basketGroup.add(body);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.12, 10, 20), weaveMat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.56;
  basketGroup.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.09, 10, 20), weaveMat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -0.52;
  basketGroup.add(ring2);

  for (let i = 0; i < 8; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 6), weaveMat);
    const a = (i / 8) * Math.PI * 2;
    rod.position.set(Math.cos(a) * 1.55, 0.02, Math.sin(a) * 0.08);
    rod.rotation.z = a;
    basketGroup.add(rod);
  }

  const handle = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 8, 24, Math.PI), weaveMat);
  handle.rotation.z = Math.PI;
  handle.position.set(0, 1.06, -0.12);
  basketGroup.add(handle);

  basket = basketGroup;
  basket.position.set(0, 0, 10);
  basket.scale.setScalar(0.65);
  scene.add(basket);
}

function createAestheticBackground() {
  const numTreesPerSide = 12;
  const sideX = 14;
  const startZ = 12;
  const treeSpacing = 4;

  for (let i = 0; i < numTreesPerSide; i++) {
    createTree(-sideX, startZ - (i * treeSpacing), 1.0 + Math.random() * 0.4);
    createTree(sideX, startZ - (i * treeSpacing), 1.0 + Math.random() * 0.4);
  }
}

function createTree(x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), makeMat(0x8b5a2b, { roughness: 1 }));
  trunk.position.y = 0.75;
  g.add(trunk);
  const leavesMat = makeMat(0x6fcf7a, { roughness: 1, emissive: 0x114411, emissiveIntensity: 0.08 });
  const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), leavesMat);
  const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), leavesMat);
  const l3 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), leavesMat);
  l1.position.set(0, 1.7, 0);
  l2.position.set(-0.45, 1.4, 0.1);
  l3.position.set(0.45, 1.4, -0.1);
  g.add(l1, l2, l3);
  g.position.set(x, -1, z);
  g.scale.setScalar(s);
  scene.add(g);
  decorObjects.push(g);
}

function startGame() {
  startScreenEl.classList.add('hidden');
  gameOverEl.classList.add('hidden');
  resetGame();
  gameRunning = true;
}

function backToStart() {
  resetGame();
  gameRunning = false;
  isPaused = false;
  isDragging = false;
  pauseBtn.textContent = 'Pause';
  startScreenEl.classList.remove('hidden');
  gameOverEl.classList.add('hidden');
}

function togglePause() {
  if (!gameRunning) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function resetGameOnly() {
  resetGame();
  isPaused = false;
  isDragging = false;
  pauseBtn.textContent = 'Pause';
}

function getMouseNDC(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((e.clientY - rect.top) / rect.height) * 2 - 1)
  };
}

function onPointerMove(e) {
  const p = getMouseNDC(e);
  mouse.set(p.x, p.y);
  raycaster.setFromCamera(mouse, camera);
  const hits = basket ? raycaster.intersectObjects(basket.children, true) : [];
  const hitBasket = hits.length > 0;
  document.body.style.cursor = hitBasket ? (isDragging ? 'grabbing' : 'pointer') : 'default';

  if (!isDragging) basket.scale.setScalar(hitBasket ? 0.72 : 0.65);

  if (isDragging) {
    const worldX = p.x * 10;
    basket.position.x = Math.max(-10, Math.min(10, worldX + dragOffsetX));
  }
}

function onPointerDown(e) {
  if (!gameRunning || isPaused) return;
  const p = getMouseNDC(e);
  mouse.set(p.x, p.y);
  raycaster.setFromCamera(mouse, camera);
  const hits = basket ? raycaster.intersectObjects(basket.children, true) : [];
  if (hits.length) {
    isDragging = true;
    dragOffsetX = basket.position.x - p.x * 10;
    document.body.style.cursor = 'grabbing';
  }
}

function onPointerUp() {
  isDragging = false;
  basket.scale.setScalar(0.65);
  document.body.style.cursor = 'default';
}

function onKeyDown(e) {
  if (!gameRunning || isPaused) return;
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') basket.position.x = Math.max(basket.position.x - 2, -10);
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') basket.position.x = Math.min(basket.position.x + 2, 10);
}

function spawnCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.08, 20),
    makeMat(0xffd700, { emissive: 0x553300, metalness: 0.85, roughness: 0.2 })
  );
  coin.scale.setScalar(1.5);
  coin.rotation.x = Math.PI / 2;
  coin.position.set((Math.random() * 10) - 5, 12, 10);
  coin.userData.spin = 1.2 + Math.random() * 1.2;
  scene.add(coin);
  coins.push(coin);
}

function updateCoins(delta) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.position.y -= fallSpeed * delta;
    c.rotation.z += c.userData.spin * delta;

    if (c.position.y < -2) {
      scene.remove(c);
      coins.splice(i, 1);
      lives--;
      livesEl.textContent = '❤️'.repeat(lives);
      if (lives <= 0) endGame();
      continue;
    }

    if (Math.abs(c.position.x - basket.position.x) < 1.35 && Math.abs(c.position.y - basket.position.y) < 1.15 && Math.abs(c.position.z - basket.position.z) < 1.2) {
      if (!c.userData.caught) {
        c.userData.caught = true;
        score++;
        scoreEl.textContent = score;
        scene.remove(c);
        coins.splice(i, 1);
      }
    }
  }
}

function endGame() {
  gameRunning = false;
  finalScoreEl.textContent = score;
  gameOverEl.classList.remove('hidden');
}

function resetGame() {
  coins.forEach(c => scene.remove(c));
  coins = [];
  score = 0;
  lives = 3;
  scoreEl.textContent = score;
  livesEl.textContent = '❤️'.repeat(lives);
  basket.position.x = 0;
  basket.scale.setScalar(0.65);
  lastSpawnTime = 0;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = (gameRunning && !isPaused) ? clock.getDelta() : (clock.getDelta(), 0.016);

  if (gameRunning && !isPaused) {
    if (performance.now() - lastSpawnTime > spawnInterval) {
      spawnCoin();
      lastSpawnTime = performance.now();
    }
    updateCoins(delta);
  }

  for (const o of decorObjects) o.rotation.y += delta * 0.08;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}