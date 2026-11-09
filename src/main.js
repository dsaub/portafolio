import * as THREE from 'three';
import './style.css';
import { profile, projects, skills } from './data.js';
import { buildWorld, terrainHeight, walkLimit, isLand, islandEdge, stationAngle, PLAZA_R, GOAL_ANGLE, GOAL_R } from './world.js';
import { buildStations, PAD_R } from './stations.js';
import { Player } from './player.js';
import { buildSkills } from './skills.js';
import { createBursts } from './effects.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { sfx, initAudio, toggleMute, isMuted } from './audio.js';
import { damp, polar } from './util.js';
import { createSecrets, konamiDetector } from './secrets.js';
import { createTerminal } from './terminal.js';
import { buildGoal } from './goal.js';
import { buildFloppies } from './floppies.js';
import { buildNote, NOTE_CMD } from './note.js';
import { createDestruction } from './destruction.js';
import { createSea } from './sea.js';
import { createUggIsland } from './ugg/island.js';

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

  const hemi = new THREE.HemisphereLight(0xdff2ff, 0x5c8a3e, 1.6);
  scene.add(hemi);
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
  let splashes = 0;
  const skillCubes = buildSkills(
    scene,
    skills,
    () => {
      const [x, z] = polar(Math.random() * Math.PI * 2, 3 + Math.random() * (PLAZA_R - 4));
      return [x, z + 1];
    },
    { onSplash: () => ++splashes >= 5 && secrets.unlock('chapuzon') }
  );
  const bursts = createBursts(scene);
  const goal = buildGoal(scene, colliders, GOAL_ANGLE, GOAL_R);
  const floppies = buildFloppies(scene, stations, colliders);
  if (floppies.count === floppies.total) player.setGold(true);
  const note = buildNote(scene, colliders);

  // ---------- Estado ----------
  let activeId = null;
  let started = false;
  let fireworks = 0;
  let goals = 0;
  let party = false;
  let partyTimer = 0;

  const secrets = createSecrets({
    onUnlock(secret, n, total) {
      sfx.secret();
      hud.toast(`<strong>✦ Secreto desbloqueado:</strong> ${secret.name} (${n}/${total})`, 3200);
    },
    onAll() {
      fireworks = 4;
      setTimeout(() => sfx.win(), 600);
      hud.toast('<strong>¡Todos los secretos!</strong> Conoces esta isla mejor que yo ✦', 5000);
    },
  });

  const hud = createHud(projects, profile, secrets);
  const discovered = loadDiscovered();
  hud.setCount(discovered.size);
  let won = discovered.size === projects.length;

  // Minijuego secreto de destrucción masiva (rm -rf --no-preserve-root /)
  const destruction = createDestruction({
    scene,
    props: world.props,
    colliders,
    player,
    bursts,
    sfx,
    hud,
    secrets,
    walkLimit,
    look: { scene, hemi, sun },
    respawnCube: (c) => skillCubes.respawn(c),
    onWin: () => (fireworks = 4),
    // El log de la terminal en segundo plano también registra lo que destruyes
    onKill: (e) => terminal.removed(e.kind === 'tree' ? `/isla/arboles/arbol_${String(e.i).padStart(3, '0')}` : `/isla/rocas/roca_${String(e.i).padStart(3, '0')}`),
    onPhase: (phase) => (phase === 'win' ? terminal.finishWin() : terminal.finishLose()),
  });
  const sea = createSea({ scene, player, bursts, sfx, hud, secrets, onCapture: () => ugg.capture() });
  // La isla de Ugg: si te secuestra, no vuelves (ni recargando) hasta escapar
  const ugg = createUggIsland({ scene, colliders, player, bursts, sfx, hud, secrets, input: { setEnabled: (v) => input.setEnabled(v && started) }, onEscaped: () => (fireworks = 4) });
  // Fuera del minijuego puedes llegar hasta el agua (y caerte)
  const playerLimit = (x, z) => (ugg.active ? Infinity : destruction.busy ? walkLimit(x, z) : edgeAt(x, z) + 2.5);
  const noInput = { axis: () => ({ x: 0, z: 0 }), running: () => false, consumeJump: () => false };
  const readNote = () => {
    hud.toast(`<strong>Nota del sysadmin:</strong> «Pase lo que pase, NUNCA escribas <code>${NOTE_CMD}</code> en la terminal. La isla no lo perdonaría.»`, 9000);
    secrets.unlock('nota');
  };

  function toggleParty() {
    party = !party;
    if (party) {
      sfx.win();
      player.setFace('happy', 3);
      for (const c of skillCubes.cubes) {
        if (c.sinking) continue;
        c.vel.y = 7 + Math.random() * 4;
        c.spin.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 12);
      }
      hud.toast('<strong>¡Modo fiesta!</strong> Repite el código para volver a la normalidad');
    } else {
      player.shirt.color.setHex(0xff7a3d);
    }
    return party;
  }

  function scoreGoal(cube) {
    goals++;
    goal.setScore(goals);
    sfx.goal();
    player.setFace('happy', 2);
    bursts.spawn(goal.center, [0xffffff, 0x5dff8a, 0xff7a3d, 0xffd23f], 70, { speed: 9, up: 6 });
    hud.toast(`<strong>¡GOOOL!</strong> Golazo de ${cube.name}`);
    secrets.unlock('gol');
    if (goals >= 3) secrets.unlock('hattrick');
  }

  function pickFloppy(item, n, total) {
    sfx.pickup();
    player.setFace('wow', 1);
    bursts.spawn(new THREE.Vector3(item.x, item.y, item.z), [0x5dff8a, 0xffffff, 0x3a6ea5], 35, { speed: 4, up: 4 });
    hud.toast(`<strong>¡Disquete encontrado!</strong> ${n}/${total}`);
    if (n === total) {
      player.setGold(true);
      hud.toast('<strong>Carcasa dorada desbloqueada</strong> por recuperar todos los disquetes', 3500);
      secrets.unlock('disquetes');
    }
  }

  const interact = () => {
    if (ugg.active) return ugg.interact();
    if (destruction.active) return destruction.fire();
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

  const terminal = createTerminal({
    profile,
    projects,
    secrets,
    onOpen: () => input.setEnabled(false),
    onClose: () => {
      input.setEnabled(started && textMode.hidden);
      canvas.focus();
    },
    onParty: toggleParty,
    onDestroy: () => destruction.start(),
  });
  const konami = konamiDetector(() => {
    secrets.unlock('konami');
    toggleParty();
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
    player.idle = 0;
    if (ugg.hasSaved()) ugg.enter(false); // recargar no te salva de Ugg
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
    if (e.code === 'Escape' && terminal.isOpen) return terminal.close();
    if (e.code === 'KeyF' && destruction.active && textMode.hidden && !e.repeat) return destruction.fire();
    if (e.code === 'Backquote' && ugg.active) return hud.toast('Aquí no hay terminal secreta… pero Ugg tiene un ordenador. ♥');
    if (e.code === 'Backquote' && started && textMode.hidden && !destruction.busy && !sea.busy) {
      e.preventDefault();
      return terminal.isOpen ? terminal.close() : terminal.open();
    }
    if (started && textMode.hidden && !terminal.isOpen) konami(e.code);
    if (e.code === 'Escape' && !textMode.hidden) closeText();
    if (!started && textMode.hidden && (e.code === 'Enter' || e.code === 'Space') && document.activeElement === document.body) {
      e.preventDefault();
      startGame();
    }
  });

  // 5 toques seguidos en el nombre abren la terminal (para móvil)
  let badgeTaps = 0;
  let badgeTimer = null;
  $('.badge').addEventListener('click', () => {
    if (!started || destruction.busy || sea.busy || ugg.active) return;
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => (badgeTaps = 0), 1500);
    if (++badgeTaps >= 5) {
      badgeTaps = 0;
      terminal.open();
    }
  });

  // Con ratón, el clic también dispara cohetes
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 0 && destruction.active && textMode.hidden) destruction.fire();
  });

  // Zoom con la rueda
  const baseZoom = () => (window.innerWidth < window.innerHeight ? 1.35 : 1);
  let zoom = baseZoom();
  let zoomTarget = zoom;
  window.addEventListener(
    'wheel',
    (e) => {
      if (!started || !textMode.hidden || terminal.isOpen) return;
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

    player.update(dt, destruction.locked || sea.busy || ugg.locked ? noInput : input, colliders, groundAt, playerLimit, sfx);
    if (started && textMode.hidden && !destruction.busy && !sea.busy && !ugg.active && !isLand(player.pos.x, player.pos.z)) sea.trigger();
    if (textMode.hidden) sea.update(dt);
    if (textMode.hidden) ugg.update(dt, elapsed);
    skillCubes.update(dt, player, colliders, groundAt, edgeAt, sfx);
    if (textMode.hidden) destruction.update(dt, skillCubes.cubes);

    // Minijuego: goles en la portería escondida
    for (const c of skillCubes.cubes) {
      if (c.scored > 0) {
        c.scored -= dt;
        if (c.scored <= 0) skillCubes.respawn(c);
      } else if (!c.sinking && goal.contains(c.pos)) {
        c.scored = 1.2;
        scoreGoal(c);
      }
    }
    if (started) {
      if (!sea.busy && !ugg.active) floppies.update(elapsed, player, pickFloppy);
      if (!destruction.busy && !sea.busy && !ugg.active) note.update(player, readNote);
      if (player.face === 'sleep') secrets.unlock('siesta');
    }
    if (party) {
      player.shirt.color.setHSL((elapsed * 0.4) % 1, 0.85, 0.6);
      partyTimer -= dt;
      if (partyTimer <= 0) {
        partyTimer = 0.4;
        const p = new THREE.Vector3(player.pos.x + (Math.random() - 0.5) * 8, 3 + Math.random() * 3, player.pos.z + (Math.random() - 0.5) * 8);
        const hue = new THREE.Color().setHSL(Math.random(), 0.9, 0.6).getHex();
        bursts.spawn(p, [hue, 0xffffff], 22, { speed: 5, up: 3 });
      }
    }

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
      const sh = Math.max(destruction.shake, sea.shake);
      if (sh > 0) {
        camera.position.x += (Math.random() - 0.5) * sh;
        camera.position.y += (Math.random() - 0.5) * sh;
      }
    } else {
      // Vuelta panorámica mientras se muestra la portada
      const a = elapsed * 0.08;
      camera.position.set(Math.sin(a) * 42, 26, Math.cos(a) * 42);
      camera.lookAt(0, 0, 0);
      lookAt.set(0, 0, 0);
    }

    sun.position.copy(player.pos).add(SUN_OFFSET);
    sun.target.position.copy(player.pos);

    if (started && !ugg.active && ++miniFrame % 2 === 0) hud.drawMinimap(player, stations, discovered, ABOUT_POS, elapsed, destruction.dots());

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.body.classList.add('ready');
  $('#play-btn').disabled = false;
  $('#play-btn').textContent = ugg.hasSaved() ? 'Volver con Ugg ♥' : discovered.size ? 'Seguir jugando' : 'Jugar';
}

console.log(
  '%c elordenador %c ¿Curioseando el código? Esta isla esconde unos cuantos secretos. Pista: la tecla º (o `).',
  'font: 700 14px monospace; background: #1d1b2a; color: #5dff8a; padding: 4px 8px; border-radius: 4px',
  'font: 13px sans-serif; color: inherit'
);

main().catch((err) => {
  console.error(err);
  document.body.classList.add('webgl-error');
});
