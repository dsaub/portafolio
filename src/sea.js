import * as THREE from 'three';
import { mat } from './util.js';

// Si te metes en el mar te hundes y explotas. Con un 10 % de probabilidad, en cambio,
// la marea te arrastra (hundido) hasta una isla desierta donde vive un cavernícola…
const RARE_CHANCE = 0.1;
const DRIFT_SPEED = 6;
const DRIFT_TIME = 4;
const ISLAND_R = 5;
const DEPTH = -3.4; // lo bastante hondo para que no asome ni la cabeza

const smooth = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// Islote de arena con una palmera; el -z local apunta "hacia dentro" (lejos de donde llegas)
function buildIsland() {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R + 0.8, 1.2, 12), mat(0xf0dca4));
  sand.position.y = -0.55;
  sand.receiveShadow = true;
  g.add(sand);
  const wet = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R + 0.85, ISLAND_R + 1.1, 0.5, 12), mat(0xd9c28a));
  wet.position.y = -0.8;
  g.add(wet);

  // Palmera inclinada
  const palm = new THREE.Group();
  palm.position.set(0.8, 0, -2.2);
  const trunk = mat(0x9c6b3c);
  let top = new THREE.Vector3();
  for (let i = 0; i < 6; i++) {
    const seg = box(0.42 - i * 0.02, 0.62, 0.42 - i * 0.02, trunk, i * i * 0.035, 0.31 + i * 0.6, 0);
    seg.rotation.z = -0.06 * i;
    palm.add(seg);
    top.set(i * i * 0.035, 0.62 + i * 0.6, 0);
  }
  const leaf = mat(0x3f9b3a);
  for (let i = 0; i < 7; i++) {
    const pivot = new THREE.Group();
    pivot.position.copy(top);
    pivot.rotation.y = (i / 7) * Math.PI * 2;
    const l = box(2.3, 0.1, 0.55, leaf, 1.05, 0, 0);
    l.rotation.z = -0.45;
    pivot.add(l);
    palm.add(pivot);
  }
  const coco = mat(0x5a3a1a);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), coco);
    const a = (i / 3) * Math.PI * 2;
    c.position.set(top.x + Math.cos(a) * 0.25, top.y - 0.25, Math.sin(a) * 0.25);
    c.castShadow = true;
    palm.add(c);
  }
  g.add(palm);

  // Unas rocas y un hueso (mala señal)
  const rock = mat(0x9a9a9a);
  for (const [x, z, s] of [[-2.6, -1.2, 0.5], [-2.1, -1.8, 0.32], [2.9, 0.9, 0.4]]) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock);
    r.position.set(x, s * 0.4, z);
    r.castShadow = true;
    g.add(r);
  }
  const bone = mat(0xf5f0e0);
  const b = new THREE.Group();
  b.add(box(0.7, 0.1, 0.1, bone), box(0.12, 0.18, 0.18, bone, -0.37), box(0.12, 0.18, 0.18, bone, 0.37));
  b.position.set(-1.2, 0.1, 1.4);
  b.rotation.y = 0.7;
  g.add(b);
  g.visible = false;
  return g;
}

function buildCaveman() {
  const g = new THREE.Group();
  const skin = mat(0xd9a066);
  const fur = mat(0x8b5a2b);
  const furDark = mat(0x5e3b1c);
  const hair = mat(0x2b1d14);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const legs = [-0.2, 0.2].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    pivot.add(box(0.3, 0.72, 0.32, skin, 0, -0.36, 0), box(0.34, 0.14, 0.44, furDark, 0, -0.68, 0.05));
    g.add(pivot);
    return pivot;
  });
  // Túnica de piel con manchas
  g.add(box(1, 0.9, 0.58, fur, 0, 1.15, 0));
  for (const [x, y] of [[-0.25, 1.3], [0.22, 0.98], [0.3, 1.4]]) g.add(box(0.18, 0.14, 0.04, furDark, x, y, 0.3));
  g.add(box(0.3, 0.9, 0.6, skin, -0.36, 1.25, 0)); // hombro al aire
  const arms = [-0.64, 0.64].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.55, 0);
    pivot.add(box(0.27, 0.68, 0.3, skin, 0, -0.32, 0));
    g.add(pivot);
    return pivot;
  });
  // Garrote en la mano derecha
  const club = new THREE.Group();
  const wood = mat(0x7a4a2a);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), wood);
  handle.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.55, 7), wood);
  head.position.y = 1.05;
  handle.castShadow = head.castShadow = true;
  club.add(handle, head);
  club.position.set(0, -0.68, 0.05);
  club.rotation.x = Math.PI / 2.4;
  arms[1].add(club);

  // Cabeza: pelo enmarañado, uniceja y barba
  const headG = new THREE.Group();
  headG.position.y = 2;
  headG.add(
    box(0.76, 0.72, 0.7, skin),
    box(0.9, 0.36, 0.84, hair, 0, 0.42, -0.02),
    box(0.9, 0.6, 0.3, hair, 0, 0.05, -0.32),
    box(0.74, 0.34, 0.16, hair, 0, -0.3, 0.33),
    box(0.58, 0.08, 0.06, hair, 0, 0.16, 0.36),
    box(0.14, 0.18, 0.14, skin, 0, -0.02, 0.4)
  );
  for (const x of [-0.17, 0.17]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), white);
    eye.position.set(x, 0.06, 0.36);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), black);
    pupil.position.set(x, 0.05, 0.37);
    headG.add(eye, pupil);
  }
  g.add(headG);
  g.visible = false;
  return { group: g, legs, arms, head: headG };
}

export function createSea({ scene, player, bursts, sfx, hud, secrets }) {
  const island = buildIsland();
  const cave = buildCaveman();
  scene.add(island, cave.group);
  const fade = document.createElement('div');
  fade.className = 'sea-fade';
  document.body.append(fade);

  let mode = 'off'; // off | sink | drift
  let T = 0;
  let shake = 0;
  let exploded = false;
  let bubbleT = 0;
  let hitT = -1; // momento en que empieza el garrotazo
  let respawnAt = Infinity;
  const said = new Set();
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const center = new THREE.Vector3();
  const caveP = new THREE.Vector3();

  const say = (key, html, ms) => {
    if (said.has(key)) return;
    said.add(key);
    hud.toast(html, ms);
  };

  function trigger() {
    if (mode !== 'off') return;
    // Dirección en la que te has metido (o, si estabas quieto, hacia fuera)
    let dx = player.vel.x, dz = player.vel.z;
    let l = Math.hypot(dx, dz);
    if (l < 0.5) {
      dx = player.pos.x;
      dz = player.pos.z;
      l = Math.hypot(dx, dz) || 1;
    }
    dir.set(dx / l, 0, dz / l);
    p.set(player.pos.x, 0, player.pos.z);
    mode = Math.random() < RARE_CHANCE ? 'drift' : 'sink';
    T = 0;
    exploded = false;
    hitT = -1;
    respawnAt = Infinity;
    said.clear();
    player.blob.visible = false;
    player.setFace('wow', Infinity);
    sfx.splash();
    bursts.spawn(new THREE.Vector3(p.x, 0.2, p.z), [0xffffff, 0xbfe9ff, 0x3aa7e0], 40, { speed: 5, up: 7 });

    if (mode === 'drift') {
      // La isla desierta aparece justo donde te va a dejar la corriente
      center.copy(p).addScaledVector(dir, DRIFT_SPEED * DRIFT_TIME + ISLAND_R - 0.6);
      island.position.set(center.x, 0, center.z);
      island.rotation.y = Math.atan2(-dir.x, -dir.z);
      island.visible = true;
      // El cavernícola espera escondido detrás de la palmera
      const side = new THREE.Vector3(Math.cos(island.rotation.y), 0, -Math.sin(island.rotation.y));
      caveP.copy(center).addScaledVector(dir, 3.3).addScaledVector(side, 0.8);
      cave.group.position.copy(caveP);
      cave.group.visible = false;
      cave.arms.forEach((a) => (a.rotation.x = 0));
    }
  }

  function respawn() {
    mode = 'off';
    island.visible = false;
    cave.group.visible = false;
    player.pos.set(0, 0, 3);
    player.vel.set(0, 0, 0);
    player.vy = 0;
    player.root.position.copy(player.pos);
    player.root.rotation.set(0, player.facing, 0);
    player.model.visible = true;
    player.model.scale.set(1, 1, 1);
    player.squash = 1;
    player.idle = 0;
    player.blob.visible = true;
    player.setFace('idle');
  }

  function bubbles(dt, y = 0.15) {
    bubbleT -= dt;
    if (bubbleT > 0) return;
    bubbleT = 0.25;
    bursts.spawn(new THREE.Vector3(p.x + (Math.random() - 0.5), y, p.z + (Math.random() - 0.5)), [0xffffff, 0xbfe9ff], 3, { speed: 0.6, up: 1.2, gravity: -0.5 });
  }

  function updateSink(dt) {
    if (T < 1.1) {
      p.y = -2.4 * smooth(T / 1.1);
      player.root.rotation.z = Math.sin(T * 9) * 0.2;
      bubbles(dt);
    } else if (!exploded) {
      exploded = true;
      player.model.visible = false;
      sfx.boom();
      shake = 0.6;
      bursts.spawn(new THREE.Vector3(p.x, 0.4, p.z), [0xffd23f, 0xff8a3d, 0xff3b3b, 0xffffff], 70, { speed: 11, up: 9 });
      bursts.spawn(new THREE.Vector3(p.x, 0.2, p.z), [0x3aa7e0, 0xbfe9ff, 0xffffff], 50, { speed: 6, up: 12 });
      hud.toast('<strong>Glu glu… ¡BOOM!</strong> Los ordenadores y el agua no se llevan bien', 3000);
    } else if (T > 2.6) {
      respawn();
      secrets.unlock('hundido');
    }
  }

  function updateDrift(dt) {
    const tDrift = 1 + DRIFT_TIME;
    if (T < 1) {
      p.y = DEPTH * smooth(T);
      bubbles(dt);
    } else if (T < tDrift) {
      // Hundido, a la deriva en la dirección en la que entraste
      p.addScaledVector(dir, DRIFT_SPEED * dt);
      p.y = DEPTH + Math.sin(T * 3) * 0.12;
      player.root.rotation.z = Math.sin(T * 1.7) * 0.5;
      bubbles(dt);
      if (T > 1.6) say('marea', '…la marea te arrastra mar adentro…', 2200);
    } else if (T < tDrift + 1) {
      // Llegas a la orilla, tumbado boca arriba
      const k = smooth(T - tDrift);
      p.y = DEPTH + (0.3 - DEPTH) * k;
      player.root.rotation.z = 0;
      player.root.rotation.x = -Math.PI / 2 * k;
      say('isla', '<strong>¿Una isla desierta?</strong>', 2000);
    } else if (T < tDrift + 2) {
      // Te levantas y miras alrededor
      const k = smooth(T - tDrift - 1);
      p.y = 0.3 * (1 - k) + 0.05 * k;
      player.root.rotation.x = -Math.PI / 2 * (1 - k);
      player.facing = Math.atan2(-dir.x, -dir.z) + Math.sin(T * 4) * 0.8 * k;
      if (k > 0.6 && !cave.group.visible) {
        cave.group.visible = true;
        sfx.uga();
      }
    } else if (hitT < 0) {
      // El cavernícola se acerca
      player.root.rotation.x = 0;
      const dx = p.x - caveP.x, dz = p.z - caveP.z;
      const d = Math.hypot(dx, dz);
      player.facing = Math.atan2(-dx, -dz);
      if (d > 1.35) {
        caveP.x += (dx / d) * 2.8 * dt;
        caveP.z += (dz / d) * 2.8 * dt;
        const s = Math.sin(T * 10) * 0.7;
        cave.legs[0].rotation.x = s;
        cave.legs[1].rotation.x = -s;
        cave.arms[0].rotation.x = -s * 0.8;
      } else {
        hitT = T;
        cave.legs.forEach((l) => (l.rotation.x = 0));
        say('uga', '<strong>¡UGA BUGA!</strong>', 1500);
      }
      cave.group.rotation.y = Math.atan2(dx, dz);
      cave.group.position.set(caveP.x, 0.05 + Math.abs(Math.sin(T * 10)) * 0.08, caveP.z);
    } else {
      // Garrotazo
      const k = T - hitT;
      const club = cave.arms[1];
      if (k < 0.55) club.rotation.x = -2.9 * smooth(k / 0.55);
      else if (k < 0.68) club.rotation.x = -2.9 + 3.6 * smooth((k - 0.55) / 0.13);
      if (k >= 0.66 && respawnAt === Infinity) {
        respawnAt = T + 3.4;
        sfx.bonk();
        shake = 0.5;
        player.setFace('ko', Infinity);
        bursts.spawn(new THREE.Vector3(p.x, 1.2, p.z), [0xffd23f, 0xffffff, 0xff8a3d], 30, { speed: 5, up: 5 });
        hud.toast('<strong>Un cavernícola te ha confundido con la cena.</strong>', 3000);
      }
      if (respawnAt !== Infinity) {
        // Aplastado y el cavernícola celebrándolo
        player.model.scale.set(1.45, 0.22, 1.45);
        cave.group.position.y = 0.05 + Math.abs(Math.sin(T * 7)) * 0.5;
        cave.arms[0].rotation.x = -2.8;
        if (T > respawnAt - 1) fade.classList.add('show');
        if (T >= respawnAt) {
          respawn();
          setTimeout(() => fade.classList.remove('show'), 250);
          secrets.unlock('naufrago');
        }
      }
    }
  }

  return {
    get busy() {
      return mode !== 'off';
    },
    get shake() {
      return shake;
    },
    trigger,
    // Se llama después de player.update para sobrescribir su posición
    update(dt) {
      shake = Math.max(0, shake - dt * 1.5);
      if (mode === 'off') return;
      T += dt;
      if (mode === 'sink') updateSink(dt);
      else updateDrift(dt);
      if (mode === 'off') return;
      player.pos.copy(p);
      player.vel.set(0, 0, 0);
      player.vy = 0;
      player.idle = 0; // que no se eche la siesta en mitad de la escena
      player.root.position.copy(p);
      player.root.rotation.y = player.facing;
    },
  };
}
