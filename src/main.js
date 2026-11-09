import * as THREE from 'three';
import './style.css';
import { profile, projects, skills } from './data.js';
import { buildWorld, terrainHeight, walkLimit, islandEdge, stationAngle, PLAZA_R } from './world.js';
import { buildStations, PAD_R } from './stations.js';
import { Player } from './player.js';
import { buildSkills } from './skills.js';
import { createBursts } from './effects.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { sfx, initAudio, toggleMute, isMuted } from './audio.js';
import { damp, polar } from './util.js';

const STORAGE_KEY = 'elordenador-discovered';
const ABOUT_POS = [0, -6.3];
const $ = (sel) => document.querySelector(sel);

async function waitForFonts() {
  if (!document.fonts) return;
  const loads = Promise.all([
    document.fonts.load('700 64px "Pixelify Sans"'),
    document.fonts.load('600 54px "Pixelify Sans"'),
    document.fonts.load('500 40px "Space Grotesk"'),
  ]);
  await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
}

function loadDiscovered() {
  try {
    const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(ids.filter((id) => projects.some((p) => p.id === id)));
  } catch {
    return new Set();
  }
}
function saveDiscovered(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

async function main() {
  await waitForFonts();

  // ---------- Render ----------
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const SKY = 0x9fd8ff;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 150);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x5c8a3e, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -32;
  sc.right = sc.top = 32;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new THREE.Vector3(18, 34, 14);

  // ---------- Mundo ----------
  const stationAngles = projects.map((_, i) => stationAngle(i, projects.length));
  const world = buildWorld(scene, stationAngles);
  const colliders = world.colliders;
  const { stations, about, update: updateStations } = buildStations(scene, projects, colliders, ABOUT_POS);

  const groundAt = (x, z) => {
    let h = terrainHeight(x, z);
    for (const s of stations) if (Math.hypot(x - s.x, z - s.z) < PAD_R + 0.1) h = Math.max(h, 0.3);
    if (Math.hypot(x - about.x, z - about.z) < about.radius + 0.1) h = Math.max(h, 0.3);
    return h;
  };
  const edgeAt = (x, z) => islandEdge(Math.atan2(x, -z));

  const player = new Player(scene);
  const skillCubes = buildSkills(scene, skills, () => {
    const [x, z] = polar(Math.random() * Math.PI * 2, 3 + Math.random() * (PLAZA_R - 4));
    return [x, z + 1];
  });
  const bursts = createBursts(scene);

  // ---------- Estado ----------
  const hud = createHud(projects, profile);
  const discovered = loadDiscovered();
  hud.setCount(discovered.size);
  let activeId = null;
  let started = false;
  let won = discovered.size === projects.length;
  let fireworks = 0;

  const interact = () => {
    if (!activeId) return;
    const url = activeId === 'about' ? profile.github : projects.find((p) => p.id === activeId).repo;
    window.open(url, '_blank', 'noopener');
  };

  const input = createInput({
    joystick: $('#joystick'),
    knob: $('#joystick-knob'),
    jumpBtn: $('#jump-btn'),
    onInteract: interact,
    onAnyInput: () => document.body.classList.add('moved'),
  });

  function discover(station) {
    discovered.add(station.project.id);
    saveDiscovered(discovered);
    hud.setCount(discovered.size);
    sfx.discover();
    player.setFace('happy', 2);
    bursts.spawn(new THREE.Vector3(station.x, 3.4, station.z), [station.project.color, 0xffffff, 0xffd23f], 60);
    if (discovered.size === projects.length && !won) {
      won = true;
      fireworks = 4;
      setTimeout(() => sfx.win(), 500);
      hud.toast(`<strong>¡Isla completada!</strong> Has descubierto los ${projects.length} proyectos. Gracias por jugar ✦`, 5000);
      player.setFace('happy', 5);
    } else {
      hud.toast(`<strong>¡Proyecto descubierto!</strong> ${discovered.size}/${projects.length}`);
    }
  }

  // ---------- UI ----------
  const startScreen = $('#start');
  const textMode = $('#textmode');
  const muteBtn = $('#mute-btn');
  const syncMute = () => {
    muteBtn.setAttribute('aria-pressed', String(isMuted()));
    muteBtn.querySelector('span').textContent = isMuted() ? 'Sonido: no' : 'Sonido: sí';
  };
  syncMute();

  function startGame() {
    if (started) return;
    started = true;
    initAudio();
    startScreen.classList.add('hidden');
    document.body.classList.add('playing');
    input.setEnabled(true);
    canvas.focus();
  }
  $('#play-btn').addEventListener('click', startGame);
  muteBtn.addEventListener('click', () => {
    toggleMute();
    syncMute();
  });
  const openText = () => {
    textMode.hidden = false;
    input.setEnabled(false);
    $('#textmode-close').focus();
  };
  const closeText = () => {
    textMode.hidden = true;
    input.setEnabled(started);
  };
  document.querySelectorAll('[data-open-text]').forEach((b) => b.addEventListener('click', openText));
  $('#textmode-close').addEventListener('click', closeText);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !textMode.hidden) closeText();
    if (!started && textMode.hidden && (e.code === 'Enter' || e.code === 'Space') && document.activeElement === document.body) {
      e.preventDefault();
      startGame();
    }
  });

  // Zoom con la rueda
  const baseZoom = () => (window.innerWidth < window.innerHeight ? 1.35 : 1);
  let zoom = baseZoom();
  let zoomTarget = zoom;
  window.addEventListener(
    'wheel',
    (e) => {
      if (!started || !textMode.hidden) return;
      zoomTarget = Math.min(1.8, Math.max(0.6, zoomTarget + Math.sign(e.deltaY) * 0.1));
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Bucle ----------
  const CAM_OFFSET = new THREE.Vector3(0, 11, 14);
  const camTarget = new THREE.Vector3();
  const lookAt = new THREE.Vector3(0, 1, 0);
  const desired = new THREE.Vector3();
  const timer = new THREE.Timer();
  let elapsed = 0;
  let fireworkTimer = 0;
  let miniFrame = 0;

  camera.position.set(30, 22, 30);
  camera.lookAt(0, 0, 0);

  function frame(timestamp) {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    elapsed += dt;

    player.update(dt, input, colliders, groundAt, walkLimit, sfx);
    skillCubes.update(dt, player, colliders, groundAt, edgeAt, sfx);

    // ¿Sobre qué pedestal está?
    let nextActive = null;
    for (const s of stations) {
      if (Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < s.radius) {
        nextActive = s.project.id;
        if (!discovered.has(s.project.id)) discover(s);
      }
    }
    if (Math.hypot(player.pos.x - about.x, player.pos.z - about.z) < about.radius) nextActive = 'about';
    if (nextActive !== activeId) {
      if (nextActive) sfx.enter();
      activeId = nextActive;
      hud.show(activeId);
    }

    updateStations(elapsed, dt, activeId, discovered);
    world.update(elapsed, dt);
    world.fadeSign(player.pos, dt);

    if (fireworks > 0) {
      fireworkTimer -= dt;
      if (fireworkTimer <= 0) {
        fireworkTimer = 0.45;
        fireworks -= 0.25;
        const p = new THREE.Vector3(player.pos.x + (Math.random() - 0.5) * 14, 9 + Math.random() * 5, player.pos.z - 4 - Math.random() * 6);
        const palette = projects.map((pr) => pr.color);
        bursts.spawn(p, palette.sort(() => Math.random() - 0.5).slice(0, 3), 70, { speed: 10, up: 1, gravity: 6 });
      }
    }
    bursts.update(dt);

    // Cámara
    if (started) {
      zoom = damp(zoom, zoomTarget, 6, dt);
      camTarget.set(player.pos.x, player.pos.y * 0.5, player.pos.z);
      desired.copy(camTarget).addScaledVector(CAM_OFFSET, zoom);
      camera.position.x = damp(camera.position.x, desired.x, 4, dt);
      camera.position.y = damp(camera.position.y, desired.y, 4, dt);
      camera.position.z = damp(camera.position.z, desired.z, 4, dt);
      lookAt.x = damp(lookAt.x, camTarget.x, 6, dt);
      lookAt.y = damp(lookAt.y, camTarget.y + 1, 6, dt);
      lookAt.z = damp(lookAt.z, camTarget.z, 6, dt);
      camera.lookAt(lookAt);
    } else {
      // Vuelta panorámica mientras se muestra la portada
      const a = elapsed * 0.08;
      camera.position.set(Math.sin(a) * 42, 26, Math.cos(a) * 42);
      camera.lookAt(0, 0, 0);
      lookAt.set(0, 0, 0);
    }

    sun.position.copy(player.pos).add(SUN_OFFSET);
    sun.target.position.copy(player.pos);

    if (started && ++miniFrame % 2 === 0) hud.drawMinimap(player, stations, discovered, ABOUT_POS, elapsed);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.body.classList.add('ready');
  $('#play-btn').disabled = false;
  $('#play-btn').textContent = discovered.size ? 'Seguir jugando' : 'Jugar';
}

main().catch((err) => {
  console.error(err);
  document.body.classList.add('webgl-error');
});
