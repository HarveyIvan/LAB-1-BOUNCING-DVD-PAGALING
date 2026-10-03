import * as THREE from '../vendor/three/three.module.js';

const SCENE_SIZE = 800;
const LOGO_WIDTH = 200;
const LOGO_HEIGHT = 100;
const MAX_BOUNCES = 7;
const SCALE_FACTOR = 0.8;
const COLORS = [0x3155ff, 0xff435b, 0x39e8a6, 0xffcf33, 0xbc68ff, 0x29d8ff, 0xff8e35, 0xf062ce];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// One world unit equals one canvas pixel; (0, 0, 0) is the center.
const camera = new THREE.OrthographicCamera(-400, 400, 400, -400, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('dvdCanvas'), antialias: true });
} catch (error) {
  const message = document.getElementById('errorMessage');
  message.hidden = false;
  message.textContent = 'Enable WebGL 2 / hardware acceleration to run this scene.';
  throw error;
}
// Both the drawing buffer and displayed scene are exactly 800 × 800.
renderer.setPixelRatio(1);
renderer.setSize(SCENE_SIZE, SCENE_SIZE);

// Draw a transparent DVD-style texture locally. No image download is needed.
function createLogoTexture() {
  const drawing = document.createElement('canvas');
  drawing.width = 512; drawing.height = 256;
  const context = drawing.getContext('2d');
  context.fillStyle = 'white';
  context.font = 'italic 900 150px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('DVD', 248, 157);
  context.beginPath();
  context.ellipse(256, 190, 190, 25, 0, 0, Math.PI * 2);
  context.fill();
  // Transparent lettering reveals the black background through the disc.
  context.globalCompositeOperation = 'destination-out';
  context.font = 'bold 25px Arial, sans-serif';
  context.fillText('V I D E O', 256, 199);
  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const logo = new THREE.Mesh(
  new THREE.PlaneGeometry(LOGO_WIDTH, LOGO_HEIGHT),
  new THREE.MeshBasicMaterial({ map: createLogoTexture(), color: COLORS[0], transparent: true, depthWrite: false })
);
logo.name = 'Bouncing DVD plane';
scene.add(logo);
const velocity = new THREE.Vector2(170, 125);
const state = { bounces: 0, finished: false };
const bounceCount = document.getElementById('bounceCount');
const status = document.getElementById('status');
let previousTime;

function updateLabels() {
  bounceCount.textContent = `Bounces: ${state.bounces} / ${MAX_BOUNCES}`;
  status.textContent = state.finished ? 'Finished. Press Replay to start again.' : 'Playing';
}
function resetAnimation() {
  logo.position.set(0, 0, 0);
  logo.scale.set(1, 1, 1);
  logo.visible = true;
  logo.material.color.setHex(COLORS[0]);
  velocity.set(170, 125);
  state.bounces = 0; state.finished = false;
  previousTime = undefined;
  updateLabels();
}

// Find the next contact time from the plane's current dimensions.
// Processing the remaining time after a hit prevents overshoot.
function advanceAnimation(deltaSeconds) {
  let remaining = Math.max(0, deltaSeconds);
  while (remaining > 0 && !state.finished) {
    const limitX = SCENE_SIZE / 2 - LOGO_WIDTH * logo.scale.x / 2;
    const limitY = SCENE_SIZE / 2 - LOGO_HEIGHT * logo.scale.y / 2;
    const targetX = velocity.x > 0 ? limitX : -limitX;
    const targetY = velocity.y > 0 ? limitY : -limitY;
    const timeX = velocity.x === 0 ? Infinity : Math.max(0, (targetX - logo.position.x) / velocity.x);
    const timeY = velocity.y === 0 ? Infinity : Math.max(0, (targetY - logo.position.y) / velocity.y);
    const contactTime = Math.min(timeX, timeY);
    if (contactTime > remaining) {
      logo.position.x += velocity.x * remaining;
      logo.position.y += velocity.y * remaining;
      break;
    }
    logo.position.x += velocity.x * contactTime;
    logo.position.y += velocity.y * contactTime;
    remaining -= contactTime;
    // A simultaneous corner contact is one bounce, reversing both axes.
    if (Math.abs(timeX - contactTime) < 1e-8) velocity.x *= -1;
    if (Math.abs(timeY - contactTime) < 1e-8) velocity.y *= -1;
    state.bounces += 1;
    logo.material.color.setHex(COLORS[state.bounces]);
    const scale = state.bounces === MAX_BOUNCES ? 0 : Math.pow(SCALE_FACTOR, state.bounces);
    logo.scale.set(scale, scale, 1);
    if (state.bounces === MAX_BOUNCES) { state.finished = true; logo.visible = false; }
    updateLabels();
  }
}

document.getElementById('replayButton').addEventListener('click', resetAnimation);
resetAnimation();
renderer.setAnimationLoop((time) => {
  if (previousTime !== undefined) advanceAnimation(Math.min((time - previousTime) / 1000, 0.05));
  previousTime = time;
  renderer.render(scene, camera);
});

export { scene, camera, renderer, logo, velocity, state, resetAnimation, advanceAnimation };
