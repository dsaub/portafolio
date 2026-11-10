import * as THREE from 'three';
import { mat } from './util.js';
import { box, buildPalm, buildCaveman } from './caveman.js';

// Si te metes en el mar te hundes y explotas. Con un 10 % de probabilidad, en cambio,
// la marea te arrastra (hundido) hasta una isla desierta donde vive un cavernícola…
// …que al 50 % te aplasta o se enamora de ti y te secuestra (ver ugg/island.js)
const RARE_CHANCE = 0.1;
const LOVE_CHANCE = 0.5;
const DRIFT_SPEED = 6;
const DRIFT_TIME = 4;
const ISLAND_R = 5;
const DEPTH = -3.4; // lo bastante hondo para que no asome ni la cabeza
const WATER_Y = -0.75; // superficie del agua (world.js)
export const SEA_FLOOR = -3; // "suelo" del jugador fuera de la isla: por debajo del agua
const SINK_Y = -2.4; // fondo al que cae el que se hunde tras explotar… o no
const GRAVITY = 24; // la misma que el jugador: te hundes por gravedad, no por interpolación
const FALL_MAX = 7; // velocidad terminal al hundirse
const FALL_DRAG = 6; // lo rápido que el agua frena una caída más rápida que la terminal
const GLIDE_DRAG = 3; // cuánto frena el impulso horizontal al hundirte

const smooth = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};

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

  const palm = buildPalm();
  palm.position.set(0.8, 0, -2.2);
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

export function createSea({ scene, player, bursts, sfx, hud, secrets, onCapture = () => {} }) {
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
  let hitT = -1; // momento en que empieza el garrotazo (o el flechazo)
  let love = false;
  let loveStarted = false;
  let heartT = 0;
  let caveY = 0.05;
  let sunk = false; // ya has llegado al fondo tras caer por gravedad
  let landT = 0; // T en el que tocaste fondo
  let fallV = 0; // velocidad vertical al hundirte
  const glideV = new THREE.Vector3(); // impulso horizontal que conservas al caer
  let parts = []; // trozos del personaje desmontado tras la explosión
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
    // Solo cuenta cuando los pies tocan el agua: hasta entonces sigues cayendo o saltando
    if (mode !== 'off' || player.pos.y > WATER_Y + 0.05) return;
    // Dirección en la que te has metido (o, si estabas quieto, hacia fuera)
    let dx = player.vel.x, dz = player.vel.z;
    let l = Math.hypot(dx, dz);
    if (l < 0.5) {
      dx = player.pos.x;
      dz = player.pos.z;
      l = Math.hypot(dx, dz) || 1;
    }
    dir.set(dx / l, 0, dz / l);
    p.set(player.pos.x, player.pos.y, player.pos.z);
    fallV = player.vy; // conserva el impulso del salto
    glideV.set(player.vel.x, 0, player.vel.z);
    sunk = false;
    landT = 0;
    mode = Math.random() < RARE_CHANCE ? 'drift' : 'sink';
    T = 0;
    exploded = false;
    hitT = -1;
    respawnAt = Infinity;
    said.clear();
    player.blob.visible = false;
    player.setFace('wow', Infinity);
    sfx.splash();
    bursts.spawn(new THREE.Vector3(p.x, WATER_Y + 0.1, p.z), [0xffffff, 0xbfe9ff, 0x3aa7e0], 40, { speed: 5, up: 7 });

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
      cave.club.visible = true;
      cave.setLove(false);
      love = Math.random() < LOVE_CHANCE;
      loveStarted = false;
      caveY = 0.05;
    }
  }

  // Cae por gravedad hasta `floor`. Devuelve true cuando llega al fondo
  function fall(dt, floor) {
    // Si entras más rápido que la velocidad terminal, el agua te frena poco a poco (sin frenazo);
    // si vas más lento (o aún subiendo), la gravedad te acelera hasta la terminal
    if (fallV < -FALL_MAX) fallV = -FALL_MAX + (fallV + FALL_MAX) * Math.exp(-FALL_DRAG * dt);
    else fallV = Math.max(-FALL_MAX, fallV - GRAVITY * dt);
    p.y += fallV * dt;
    if (p.y <= floor) {
      p.y = floor;
      return true;
    }
    return false;
  }

  // Trozos del personaje: cada pieza sale disparada con su posición y giro actuales
  function disassemble() {
    player.root.updateWorldMatrix(true, true);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (const c of player.model.children) {
      c.matrixWorld.decompose(pos, quat, scale);
      const piece = c.clone();
      piece.position.copy(pos);
      piece.quaternion.copy(quat);
      piece.scale.copy(scale);
      scene.add(piece);
      parts.push({
        obj: piece,
        v: new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6),
        w: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4),
      });
    }
    player.model.visible = false;
  }

  function stepParts(dt) {
    for (const q of parts) {
      q.v.y -= GRAVITY * dt;
      q.obj.position.addScaledVector(q.v, dt);
      q.obj.rotation.x += q.w.x * dt;
      q.obj.rotation.y += q.w.y * dt;
      q.obj.rotation.z += q.w.z * dt;
      if (q.obj.position.y < SINK_Y) {
        q.obj.position.y = SINK_Y;
        q.v.set(0, 0, 0);
        q.w.set(0, 0, 0);
      }
    }
  }

  function clearParts() {
    for (const q of parts) scene.remove(q.obj);
    parts = [];
  }

  // Mientras caes conservas el impulso horizontal, pero cada vez menos
  function glide(dt) {
    p.addScaledVector(glideV, dt);
    glideV.multiplyScalar(Math.exp(-GLIDE_DRAG * dt));
  }

  function respawn(toPlaza = true) {
    mode = 'off';
    clearParts();
    island.visible = false;
    cave.group.visible = false;
    if (toPlaza) player.pos.set(0, 0, 3);
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

  function bubbles(dt, y = WATER_Y + 0.1) {
    bubbleT -= dt;
    if (bubbleT > 0) return;
    bubbleT = 0.25;
    bursts.spawn(new THREE.Vector3(p.x + (Math.random() - 0.5), y, p.z + (Math.random() - 0.5)), [0xffffff, 0xbfe9ff], 3, { speed: 0.6, up: 1.2, gravity: -0.5 });
  }

  function updateSink(dt) {
    if (!sunk) {
      if (fall(dt, SINK_Y)) {
        sunk = true;
        landT = T;
      }
      glide(dt);
      player.root.rotation.z = Math.sin(T * 9) * 0.2;
      bubbles(dt);
    } else if (!exploded) {
      exploded = true;
      player.setFace('bsod', Infinity); // la pantalla del monitor se vuelve azul
      disassemble();
      sfx.boom();
      shake = 0.6;
      bursts.spawn(new THREE.Vector3(p.x, 0.4, p.z), [0xffd23f, 0xff8a3d, 0xff3b3b, 0xffffff], 70, { speed: 11, up: 9 });
      bursts.spawn(new THREE.Vector3(p.x, 0.2, p.z), [0x3aa7e0, 0xbfe9ff, 0xffffff], 50, { speed: 6, up: 12 });
      hud.toast('<strong>Glu glu… ¡BOOM!</strong> Los ordenadores y el agua no se llevan bien', 3000);
    } else if (T > landT + 2.6) {
      respawn();
      secrets.unlock('hundido');
    }
  }

  function updateDrift(dt) {
    if (!sunk) {
      if (fall(dt, DEPTH)) {
        sunk = true;
        landT = T;
      }
      glide(dt);
      player.root.rotation.z = Math.sin(T * 9) * 0.2;
      bubbles(dt);
      return;
    }
    // Tiempos desde que tocas fondo (las fases de abajo son relativas a eso)
    const t = T - landT;
    const tDrift = DRIFT_TIME;
    if (t < tDrift) {
      // Hundido, a la deriva en la dirección en la que entraste
      p.addScaledVector(dir, DRIFT_SPEED * dt);
      p.y = DEPTH + Math.sin(t * 3) * 0.12;
      player.root.rotation.z = Math.sin(t * 1.7) * 0.5;
      bubbles(dt);
      if (t > 0.6) say('marea', '…la marea te arrastra mar adentro…', 2200);
    } else if (t < tDrift + 1) {
      // Llegas a la orilla, tumbado boca arriba
      const k = smooth(t - tDrift);
      p.y = DEPTH + (0.3 - DEPTH) * k;
      player.root.rotation.z = 0;
      player.root.rotation.x = -Math.PI / 2 * k;
      say('isla', '<strong>¿Una isla desierta?</strong>', 2000);
    } else if (t < tDrift + 2) {
      // Te levantas y miras alrededor
      const k = smooth(t - tDrift - 1);
      p.y = 0.3 * (1 - k) + 0.05 * k;
      player.root.rotation.x = -Math.PI / 2 * (1 - k);
      player.facing = Math.atan2(-dir.x, -dir.z) + Math.sin(t * 4) * 0.8 * k;
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
        const s = Math.sin(t * 10) * 0.7;
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
    } else if (love) {
      updateLove(dt);
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

  // Flechazo: suelta el garrote, ojos de corazón, te coge en brazos y se lanza al mar
  function updateLove(dt) {
    const k = T - hitT;
    if (!loveStarted) {
      loveStarted = true;
      cave.club.visible = false;
      cave.setLove(true);
      sfx.love();
      player.setFace('wow', Infinity);
      bursts.spawn(new THREE.Vector3(caveP.x, 2.4, caveP.z), [0xff4d8d, 0xff8ab5, 0xffffff], 40, { speed: 4, up: 5 });
      hud.toast('<strong>Ugg</strong> suelta el garrote… y se queda mirándote ♥', 2600);
    }
    heartT -= dt;
    if (heartT <= 0) {
      heartT = 0.22;
      bursts.spawn(new THREE.Vector3(caveP.x, caveY + 2.8, caveP.z), [0xff4d8d, 0xff8ab5, 0xffffff], 5, { speed: 2, up: 3, gravity: -1 });
    }
    if (k < 2.8) {
      // Saltitos de felicidad
      cave.group.position.set(caveP.x, 0.05 + Math.abs(Math.sin(T * 8)) * 0.45, caveP.z);
      cave.arms[0].rotation.x = cave.arms[1].rotation.x = -2.6 + Math.sin(T * 8) * 0.3;
      if (k > 1.3) say('love2', '«UGG ENAMORADO. TÚ SER DE UGG. PARA SIEMPRE.» ♥', 3200);
    } else if (k < 4.8) {
      // Te coge en brazos y se tira al mar contigo
      cave.arms[0].rotation.x = cave.arms[1].rotation.x = -2.9;
      caveP.addScaledVector(dir, 4.5 * dt);
      const inSea = Math.hypot(caveP.x - center.x, caveP.z - center.z) > ISLAND_R + 0.4;
      caveY = inSea ? Math.max(-2.6, caveY - dt * 4) : 0.05 + Math.abs(Math.sin(T * 10)) * 0.1;
      cave.group.rotation.y = Math.atan2(dir.x, dir.z);
      cave.group.position.set(caveP.x, caveY, caveP.z);
      p.set(caveP.x, caveY + 2.8, caveP.z);
      player.root.rotation.x = -Math.PI / 2;
      player.setFace('ko', Infinity);
      if (inSea) bubbles(dt, 0.2);
      if (k > 3.8) fade.classList.add('show');
    } else {
      respawn(false);
      cave.setLove(false);
      onCapture();
      setTimeout(() => fade.classList.remove('show'), 400);
      secrets.unlock('naufrago');
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
      stepParts(dt);
      player.pos.copy(p);
      player.vel.set(0, 0, 0);
      player.vy = 0;
      player.idle = 0; // que no se eche la siesta en mitad de la escena
      player.root.position.copy(p);
      player.root.rotation.y = player.facing;
    },
  };
}
