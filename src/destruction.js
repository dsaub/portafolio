import * as THREE from 'three';
import { PLAYER_R } from './player.js';

// Minijuego secreto: tras `rm -rf --no-preserve-root /` la isla se rebela.
// Árboles y rocas cobran vida y te persiguen; bórralos con el lanzacohetes.
// Al acabar con todo, un agujero negro se lo traga todo y la isla se reinstala.
// Dificultad: pensada para que se pueda ganar moviéndote y disparando de lejos
const MAX_HP = 8;
const HEAL_EVERY = 12; // cada 12 cosas destruidas recuperas un corazón
const FIRE_CD = 0.26;
const ROCKET_SPEED = 24;
const BLAST_R = 3.9;
const INVULN = 2;
const RECORD_KEY = 'elordenador-rmrf-best';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const CORRUPT_LEAVES = [0x5b1a2e, 0x6e1f2f, 0x4a1530, 0x7a2236];
const CORRUPT_ROCK = 0x3b2a30;

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);

export function createDestruction({ scene, props, colliders, player, bursts, sfx, hud, secrets, walkLimit, look, respawnCube, onWin, onKill = () => {}, onPhase = () => {} }) {
  const { trees, rocks, flowers, trunkMesh, leafMesh, rockMesh, stemMesh, petalMesh, waterMat } = props;
  const getM = (mesh, i) => {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    return m;
  };
  const getC = (mesh, i) => {
    const c = new THREE.Color();
    mesh.getColorAt(i, c);
    return c;
  };

  // ---------- Enemigos (los árboles y rocas de siempre) ----------
  const enemies = [
    ...trees.map((t, i) => ({
      kind: 'tree', i, ox: t.x, oz: t.z, r: 0.75, h: t.h, top: t.h + 2.6, collider: t.collider,
      trunk: getM(trunkMesh, i),
      leaves: [0, 1, 2, 3].map((k) => getM(leafMesh, i * 4 + k)),
      leafColors: [0, 1, 2, 3].map((k) => getC(leafMesh, i * 4 + k)),
      speed: 1.8 + Math.random() * 0.7,
    })),
    ...rocks.map((r, i) => {
      const base = getM(rockMesh, i);
      return {
        kind: 'rock', i, ox: r.x, oz: r.z, r: r.s * 0.9, s: r.s, top: base.elements[13] + r.s + 0.6, collider: r.collider,
        base, cy: base.elements[13], color: getC(rockMesh, i),
        speed: 2.4 + Math.random() * 0.9,
      };
    }),
  ];
  for (const e of enemies) {
    e.x = e.ox;
    e.z = e.oz;
    e.state = 'dormant';
    e.phase = Math.random() * Math.PI * 2;
    e.q = new THREE.Quaternion();
  }
  const flowerBase = flowers.map((_, i) => [getM(stemMesh, i), getM(petalMesh, i)]);
  const flowerGone = new Set();
  const total = enemies.length;

  // Ojos rojos para lo que está despierto
  const eyes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.17, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), total * 2);
  eyes.frustumCulled = false;
  for (let i = 0; i < total * 2; i++) eyes.setMatrixAt(i, ZERO);
  scene.add(eyes);

  // ---------- Lanzacohetes ----------
  const launcher = new THREE.Group();
  {
    const olive = new THREE.MeshStandardMaterial({ color: 0x4b5d3a, flatShading: true, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23252b, flatShading: true, roughness: 0.6 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.25, 10), olive);
    tube.rotation.x = Math.PI / 2;
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.18, 10), dark);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.z = 0.66;
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.2, 10), dark);
    back.rotation.x = Math.PI / 2;
    back.position.z = -0.68;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.12), dark);
    grip.position.set(0, -0.24, 0.1);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.08, 10), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = 0.4;
    launcher.add(tube, mouth, back, grip, stripe);
    launcher.traverse((o) => (o.castShadow = true));
    launcher.position.set(-0.62, 1.78, 0.05);
  }
  let recoil = 0;

  const rocketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8).rotateX(Math.PI / 2);
  const tipGeo = new THREE.ConeGeometry(0.1, 0.22, 8).rotateX(Math.PI / 2).translate(0, 0, 0.38);
  const finGeo = new THREE.BoxGeometry(0.34, 0.04, 0.14).translate(0, 0, -0.24);
  const rockets = Array.from({ length: 14 }, () => {
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(rocketGeo, new THREE.MeshStandardMaterial({ color: 0xdcdcdc, flatShading: true })),
      new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color: 0xff3b3b, flatShading: true })),
      new THREE.Mesh(finGeo, new THREE.MeshStandardMaterial({ color: 0x4b5d3a, flatShading: true })),
      new THREE.Mesh(finGeo.clone().rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4b5d3a, flatShading: true })),
      new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4).translate(0, 0, -0.36), new THREE.MeshBasicMaterial({ color: 0xffb347 }))
    );
    g.visible = false;
    scene.add(g);
    return { mesh: g, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, live: false, target: null, trail: 0 };
  });

  // Anillos de explosión
  const rings = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1, 40),
      new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, t: 1 };
  });
  let ringCursor = 0;

  // ---------- Agujero negro ----------
  const hole = new THREE.Group();
  {
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x9b5de5, transparent: true, opacity: 0.35, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const diskMat = (color, opacity) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const disk1 = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.4, 48), diskMat(0xff8a3d, 0.85));
    const disk2 = new THREE.Mesh(new THREE.RingGeometry(2.3, 3.6, 48, 1), diskMat(0x9b5de5, 0.5));
    const disks = new THREE.Group();
    disks.add(disk1, disk2);
    disks.rotation.x = -Math.PI / 2 + 0.45;
    hole.add(halo, disks, core);
    hole.userData.disks = disks;
    hole.visible = false;
    scene.add(hole);
  }
  const DEBRIS = 160;
  const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), DEBRIS);
  debris.frustumCulled = false;
  const debrisColors = [0x6cc24a, 0xf0dca4, 0x8a5a3b, 0xc9c2b4, 0x3aa7e0, 0x5b1a2e, 0x9a9a9a];
  const debrisData = Array.from({ length: DEBRIS }, (_, i) => {
    debris.setMatrixAt(i, ZERO);
    debris.setColorAt(i, new THREE.Color(debrisColors[i % debrisColors.length]));
    return { a: Math.random() * Math.PI * 2, r: 8 + Math.random() * 26, y: Math.random() * 2, delay: Math.random() * 2.2, dur: 1 + Math.random() * 0.8, spin: Math.random() * 6 };
  });
  scene.add(debris);
  let holeT = -1;
  let holeSpin = 0;
  const holePos = new THREE.Vector3();
  const HOLE_GROW = 1, HOLE_COLLAPSE = 4.3;

  // ---------- Atmósfera ----------
  const palette = {
    sky: [new THREE.Color(0x9fd8ff), new THREE.Color(0x5a1a22)],
    hemi: [look.hemi.color.clone(), new THREE.Color(0xff9a8a)],
    sun: [look.sun.color.clone(), new THREE.Color(0xff6a4a)],
    water: [waterMat.color.clone(), new THREE.Color(0x7a1626)],
  };
  const voidSky = new THREE.Color(0x14081f);
  let atmo = 0;
  let atmoTarget = 0;
  let voidAmt = 0;
  const applyAtmo = () => {
    const sky = new THREE.Color().lerpColors(palette.sky[0], palette.sky[1], atmo).lerp(voidSky, voidAmt);
    look.scene.background.copy(sky);
    look.scene.fog.color.copy(sky);
    look.hemi.color.lerpColors(palette.hemi[0], palette.hemi[1], atmo);
    look.sun.color.lerpColors(palette.sun[0], palette.sun[1], atmo);
    waterMat.color.lerpColors(palette.water[0], palette.water[1], atmo);
  };

  // ---------- HUD propio ----------
  const ui = document.createElement('div');
  ui.className = 'rm-hud';
  ui.innerHTML = `
    <div class="rm-title">rm -rf /</div>
    <div class="rm-hp" aria-label="Vida"></div>
    <div class="rm-track"><span class="rm-bar"></span></div>
    <div class="rm-count"></div>`;
  const fireBtn = document.createElement('button');
  fireBtn.type = 'button';
  fireBtn.className = 'rm-fire';
  fireBtn.setAttribute('aria-label', 'Disparar cohete');
  fireBtn.textContent = '🚀';
  const panic = document.createElement('div');
  panic.className = 'rm-panic';
  panic.hidden = true;
  document.body.append(ui, fireBtn, panic);
  const hpEl = ui.querySelector('.rm-hp');
  const barEl = ui.querySelector('.rm-bar');
  const countEl = ui.querySelector('.rm-count');
  fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fire();
  });

  // ---------- Estado ----------
  let mode = 'off'; // off | on | hole | ending
  let t = 0;
  let hp = MAX_HP;
  let invuln = 0;
  let fireCd = 0;
  let done = 0;
  let shake = 0;
  let crunchThisFrame = false;
  let regrow = -1;
  let cubesRef = [];

  const drawHud = () => {
    hpEl.textContent = '♥'.repeat(Math.max(0, hp)) + '♡'.repeat(MAX_HP - Math.max(0, hp));
    const pct = Math.round((done / total) * 100);
    barEl.style.width = `${pct}%`;
    countEl.textContent = `Borrado ${pct}% · ${total - done} restantes · ${fmt(t)}`;
  };

  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4();
  function compose(e, scale = 1) {
    const awake = e.state === 'awake' && e.kind === 'tree';
    const hop = awake ? Math.abs(Math.sin(t * 7 + e.phase)) * 0.45 : 0;
    const tilt = awake ? Math.sin(t * 7 + e.phase) * 0.12 : 0;
    const cy = e.kind === 'rock' ? e.cy : 0;
    mA.makeTranslation(e.x, hop + cy, e.z)
      .multiply(mB.makeRotationFromQuaternion(e.q))
      .multiply(mB.makeRotationZ(tilt))
      .multiply(mB.makeScale(scale, scale, scale))
      .multiply(mB.makeTranslation(-e.ox, -cy, -e.oz));
    if (e.kind === 'tree') {
      trunkMesh.setMatrixAt(e.i, mB.multiplyMatrices(mA, e.trunk));
      e.leaves.forEach((b, k) => leafMesh.setMatrixAt(e.i * 4 + k, mB.multiplyMatrices(mA, b)));
    } else {
      rockMesh.setMatrixAt(e.i, mB.multiplyMatrices(mA, e.base));
    }
  }

  function tint(e, corrupt) {
    if (e.kind === 'tree') {
      e.leafColors.forEach((c, k) => leafMesh.setColorAt(e.i * 4 + k, corrupt ? new THREE.Color(CORRUPT_LEAVES[k]) : c));
      leafMesh.instanceColor.needsUpdate = true;
    } else {
      rockMesh.setColorAt(e.i, corrupt ? new THREE.Color(CORRUPT_ROCK) : e.color);
      rockMesh.instanceColor.needsUpdate = true;
    }
  }

  function destroy(e) {
    if (e.state === 'dead') return;
    e.state = 'dead';
    const idx = colliders.indexOf(e.collider);
    if (idx >= 0) colliders.splice(idx, 1);
    if (e.kind === 'tree') {
      trunkMesh.setMatrixAt(e.i, ZERO);
      for (let k = 0; k < 4; k++) leafMesh.setMatrixAt(e.i * 4 + k, ZERO);
      bursts.spawn(new THREE.Vector3(e.x, e.h, e.z), [...CORRUPT_LEAVES, 0x7a4a2a, 0xff2a2a], 24, { speed: 9, up: 7 });
    } else {
      rockMesh.setMatrixAt(e.i, ZERO);
      bursts.spawn(new THREE.Vector3(e.x, e.cy, e.z), [0x8b8f94, CORRUPT_ROCK, 0xff2a2a], 16, { speed: 8, up: 6 });
    }
    trunkMesh.instanceMatrix.needsUpdate = leafMesh.instanceMatrix.needsUpdate = rockMesh.instanceMatrix.needsUpdate = true;
    done++;
    onKill(e);
    if (done % HEAL_EVERY === 0 && hp < MAX_HP && mode === 'on') {
      hp++;
      sfx.pickup();
      hpEl.classList.remove('rm-heal');
      void hpEl.offsetWidth;
      hpEl.classList.add('rm-heal');
    }
    if (!crunchThisFrame) sfx.crunch();
    crunchThisFrame = true;
    drawHud();
  }

  function hurt(from) {
    hp--;
    invuln = INVULN;
    const dx = player.pos.x - from.x, dz = player.pos.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    player.vel.x += (dx / d) * 10;
    player.vel.z += (dz / d) * 10;
    player.vy = 5;
    player.setFace('wow', 0.8);
    shake = 0.5;
    sfx.hurt();
    document.body.classList.remove('rm-hit');
    void document.body.offsetWidth;
    document.body.classList.add('rm-hit');
    drawHud();
    if (hp <= 0) lose();
  }

  function explode(p) {
    sfx.boom();
    shake = Math.min(0.7, shake + 0.3);
    const ring = rings[ringCursor];
    ringCursor = (ringCursor + 1) % rings.length;
    ring.t = 0;
    ring.mesh.visible = true;
    ring.mesh.position.set(p.x, 0.2, p.z);
    bursts.spawn(p, [0xffd23f, 0xff8a3d, 0xff3b3b, 0x3b3646], 40, { speed: 10, up: 5 });
    for (const e of enemies) {
      if (e.state !== 'dead' && Math.hypot(e.x - p.x, e.z - p.z) < BLAST_R + e.r) destroy(e);
    }
    let touched = false;
    flowers.forEach((f, i) => {
      if (!flowerGone.has(i) && Math.hypot(f.x - p.x, f.z - p.z) < BLAST_R) {
        flowerGone.add(i);
        stemMesh.setMatrixAt(i, ZERO);
        petalMesh.setMatrixAt(i, ZERO);
        touched = true;
      }
    });
    if (touched) stemMesh.instanceMatrix.needsUpdate = petalMesh.instanceMatrix.needsUpdate = true;
    for (const c of cubesRef) {
      const dx = c.pos.x - p.x, dz = c.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < BLAST_R + 1 && d > 1e-3 && !c.sinking) {
        c.vel.x += (dx / d) * 11;
        c.vel.z += (dz / d) * 11;
        c.vel.y = Math.max(c.vel.y, 7);
        c.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 14);
      }
    }
    // Daño propio si disparas a quemarropa (solo un rasguño de knockback)
    const pd = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
    if (pd < 1.6) {
      player.vy = Math.max(player.vy, 6);
    }
  }

  function fire() {
    if (mode !== 'on' || fireCd > 0) return;
    const rk = rockets.find((r) => !r.live);
    if (!rk) return;
    fireCd = FIRE_CD;
    const fx = Math.sin(player.facing), fz = Math.cos(player.facing);
    // Autoapuntado suave: el enemigo más cercano dentro de un cono de ~35°
    let best = null, bestScore = Infinity;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      const dx = e.x - player.pos.x, dz = e.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 30 || d < 0.5) continue;
      const cos = (dx * fx + dz * fz) / d;
      if (cos < 0.82) continue;
      const score = d * (2 - cos);
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    // la boca del lanzacohetes en coordenadas del mundo
    const side = -0.62;
    rk.pos.set(
      player.pos.x + fx * 0.8 + Math.cos(player.facing) * side,
      player.pos.y + 1.78,
      player.pos.z + fz * 0.8 - Math.sin(player.facing) * side
    );
    rk.vel.set(fx, 0, fz).multiplyScalar(ROCKET_SPEED);
    rk.target = best;
    rk.life = 0;
    rk.trail = 0;
    rk.live = true;
    rk.mesh.visible = true;
    rk.mesh.position.copy(rk.pos);
    recoil = 1;
    sfx.launch();
    bursts.spawn(rk.pos.clone(), [0xdcdcdc, 0xb0b0b0, 0xffb347], 8, { speed: 2, up: 1, gravity: 2 });
  }

  function start() {
    if (mode !== 'off') return false;
    mode = 'on';
    t = 0;
    hp = MAX_HP;
    invuln = 1.5;
    fireCd = 0;
    done = 0;
    atmoTarget = 1;
    for (const e of enemies) tint(e, true);
    player.model.add(launcher);
    document.body.classList.add('rm-glitch', 'destruction');
    setTimeout(() => document.body.classList.remove('rm-glitch'), 700);
    sfx.alarm();
    drawHud();
    hud.toast('<strong>La isla se ha rebelado.</strong> Tienes un lanzacohetes: <kbd>E</kbd>/<kbd>F</kbd>/clic para disparar', 5000);
    return true;
  }

  function clearCombat() {
    player.model.visible = true;
    player.model.remove(launcher);
    for (const r of rockets) {
      r.live = false;
      r.mesh.visible = false;
    }
    for (let i = 0; i < total * 2; i++) eyes.setMatrixAt(i, ZERO);
    eyes.instanceMatrix.needsUpdate = true;
  }

  function restore() {
    for (const e of enemies) {
      e.x = e.ox;
      e.z = e.oz;
      e.q.identity();
      e.collider.x = e.ox;
      e.collider.z = e.oz;
      if (!colliders.includes(e.collider)) colliders.push(e.collider);
      e.state = 'dormant';
      tint(e, false);
    }
    flowerGone.clear();
    flowerBase.forEach(([s, p], i) => {
      stemMesh.setMatrixAt(i, s);
      petalMesh.setMatrixAt(i, p);
    });
    stemMesh.instanceMatrix.needsUpdate = petalMesh.instanceMatrix.needsUpdate = true;
    regrow = 0; // todo vuelve a crecer
    atmoTarget = 0;
    voidAmt = 0;
    document.body.classList.remove('destruction');
  }

  function win() {
    clearCombat();
    mode = 'hole';
    holeT = 0;
    holeSpin = 0;
    holePos.set(player.pos.x, 4.5, player.pos.z - 3);
    hole.position.copy(holePos);
    hole.scale.setScalar(0.01);
    hole.visible = true;
    sfx.blackhole();
    onPhase('win');
    hud.toast('<strong>0 archivos restantes.</strong> Algo se abre en el cielo…', 3000);
  }

  function collapse() {
    mode = 'ending';
    hole.visible = false;
    for (let i = 0; i < DEBRIS; i++) debris.setMatrixAt(i, ZERO);
    debris.instanceMatrix.needsUpdate = true;
    document.body.classList.remove('rm-flash');
    void document.body.offsetWidth;
    document.body.classList.add('rm-flash');
    sfx.boom();
    // Todo vuelve a su sitio
    player.root.scale.setScalar(1);
    player.root.rotation.z = 0;
    player.pos.set(0, 0, 3);
    player.vel.set(0, 0, 0);
    player.vy = 0;
    player.setFace('happy', 3);
    for (const c of cubesRef) {
      c.mesh.scale.setScalar(1);
      respawnCube(c);
    }
    restore();

    let best = Infinity;
    try {
      best = Number(localStorage.getItem(RECORD_KEY)) || Infinity;
      if (t < best) localStorage.setItem(RECORD_KEY, String(t));
    } catch {}
    const record = t < best ? '¡nuevo récord!' : `récord ${fmt(best)}`;
    setTimeout(() => sfx.win(), 400);
    hud.toast(`<strong>Sistema reinstalado.</strong> Lo borraste todo en ${fmt(t)} (${record})`, 4500);
    secrets.unlock('rmrf');
    onWin();
  }

  function lose() {
    clearCombat();
    mode = 'ending';
    onPhase('lose');
    sfx.over();
    panic.innerHTML = `<pre>Kernel panic - not syncing: la isla te ha borrado a ti
CPU: 0 PID: 1 Comm: elordenador
Archivos borrados: ${done}/${total}

Reiniciando en 3…</pre>`;
    panic.hidden = false;
    setTimeout(() => {
      panic.hidden = true;
      restore();
      player.pos.set(0, 0, 3);
      player.vel.set(0, 0, 0);
      hud.toast('Sistema restaurado. Si te atreves, ya sabes qué comando escribir…', 4000);
      secrets.unlock('panic');
    }, 3200);
  }

  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const axis = new THREE.Vector3();
  const look3 = new THREE.Vector3();

  function updateRockets(dt) {
    for (const r of rockets) {
      if (!r.live) continue;
      r.life += dt;
      if (r.target && r.target.state !== 'dead') {
        tmpV.set(r.target.x, r.target.kind === 'tree' ? r.target.h * 0.6 : r.target.cy, r.target.z).sub(r.pos).normalize().multiplyScalar(ROCKET_SPEED);
        r.vel.lerp(tmpV, 1 - Math.exp(-7 * dt));
        r.vel.setLength(ROCKET_SPEED);
      }
      r.pos.addScaledVector(r.vel, dt);
      r.mesh.position.copy(r.pos);
      r.mesh.lookAt(look3.copy(r.pos).add(r.vel));
      r.trail -= dt;
      if (r.trail <= 0) {
        r.trail = 0.03;
        bursts.spawn(r.pos.clone(), [0xbdbdbd, 0x8a8a8a, 0xffb347], 2, { speed: 0.8, up: 0.8, gravity: -1 });
      }
      let hit = r.pos.y < 0.1 || r.life > 1.5;
      if (!hit) {
        for (const e of enemies) {
          if (e.state === 'dead') continue;
          if (Math.hypot(e.x - r.pos.x, e.z - r.pos.z) < e.r + 0.35 && r.pos.y < e.top) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        r.live = false;
        r.mesh.visible = false;
        explode(r.pos.clone().setY(Math.max(0.6, r.pos.y)));
      }
    }
    for (const ring of rings) {
      if (ring.t >= 1) continue;
      ring.t += dt / 0.35;
      const k = Math.min(1, ring.t);
      ring.mesh.scale.setScalar(0.5 + k * BLAST_R);
      ring.mesh.material.opacity = 0.9 * (1 - k);
      if (ring.t >= 1) ring.mesh.visible = false;
    }
  }

  function updateHole(dt) {
    holeT += dt;
    const T = holeT;
    const grow = smooth(clamp01(T / HOLE_GROW));
    const shrink = T > HOLE_COLLAPSE - 0.35 ? 1 - smooth(clamp01((T - (HOLE_COLLAPSE - 0.35)) / 0.35)) : 1;
    hole.scale.setScalar(Math.max(0.01, grow * shrink * (1 + Math.sin(T * 9) * 0.03)));
    hole.userData.disks.rotation.z += dt * 3;
    voidAmt = Math.min(1, T / 2) * 0.85;
    applyAtmo();
    shake = Math.max(shake, 0.12 + clamp01((T - 1) / 3) * 0.3);

    // Escombros girando en espiral hacia el centro
    debrisData.forEach((d, i) => {
      const p = clamp01((T - d.delay) / d.dur);
      if (p <= 0 || p >= 1) {
        debris.setMatrixAt(i, ZERO);
        return;
      }
      const r = d.r * Math.pow(1 - p, 1.3);
      const a = d.a + p * 7;
      tmpV.set(holePos.x + Math.cos(a) * r, d.y + (holePos.y - d.y) * p, holePos.z + Math.sin(a) * r);
      tmpQ.setFromAxisAngle(UP, d.spin * p * 4);
      tmpM.compose(tmpV, tmpQ, one.clone().multiplyScalar(1 - p * 0.85));
      debris.setMatrixAt(i, tmpM);
    });
    debris.instanceMatrix.needsUpdate = true;

    // Se traga las flores (las más cercanas primero)
    const pull = (dist, delay) => smooth(clamp01((T - delay - dist * 0.035) / 1.2));
    flowers.forEach((f, i) => {
      if (flowerGone.has(i)) return;
      const k = pull(Math.hypot(f.x - holePos.x, f.z - holePos.z), 0.8);
      if (k <= 0) return;
      for (const [mesh, base, y] of [[stemMesh, flowerBase[i][0], 0.22], [petalMesh, flowerBase[i][1], 0.5]]) {
        if (k >= 1) {
          mesh.setMatrixAt(i, ZERO);
          continue;
        }
        tmpV.set(f.x + (holePos.x - f.x) * k, y + (holePos.y - y) * k, f.z + (holePos.z - f.z) * k);
        tmpM.compose(tmpV, tmpQ.identity(), one.clone().multiplyScalar(1 - k));
        mesh.setMatrixAt(i, tmpM);
      }
    });
    stemMesh.instanceMatrix.needsUpdate = petalMesh.instanceMatrix.needsUpdate = true;

    // Los cubos de tecnologías
    for (const c of cubesRef) {
      const k = pull(c.pos.distanceTo(holePos), 1.2);
      if (k <= 0) continue;
      c.vel.set(0, 0, 0);
      c.pos.lerp(holePos, 1 - Math.exp(-k * 6 * dt));
      c.rot.x += dt * 6;
      c.rot.z += dt * 4;
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.copy(c.rot);
      c.mesh.scale.setScalar(Math.max(0.01, 1 - k));
    }

    // Y por último, a ti
    const kp = smooth(clamp01((T - 2.2) / 1.6));
    if (kp > 0) {
      player.pos.lerp(holePos, kp * 0.12);
      player.vel.set(0, 0, 0);
      player.vy = 0;
      player.root.position.copy(player.pos);
      holeSpin += dt * (4 + kp * 14);
      player.root.rotation.y = player.facing + holeSpin;
      player.root.rotation.z = Math.sin(T * 5) * 0.4 * kp;
      player.root.scale.setScalar(Math.max(0.01, 1 - kp * 0.95));
      player.setFace('wow', 0.5);
    }

    if (T >= HOLE_COLLAPSE) {
      holeT = -1;
      collapse();
    }
  }

  return {
    get active() {
      return mode === 'on';
    },
    get busy() {
      return mode !== 'off';
    },
    // Durante el agujero negro el jugador no controla nada
    get locked() {
      return mode === 'hole';
    },
    get shake() {
      return shake;
    },
    start,
    fire,
    // Puntos rojos para el minimapa
    dots() {
      return mode === 'on' ? enemies.filter((e) => e.state === 'awake') : [];
    },
    update(dt, cubes) {
      cubesRef = cubes;
      crunchThisFrame = false;
      const prevAtmo = atmo;
      atmo += (atmoTarget - atmo) * (1 - Math.exp(-2.5 * dt));
      if (Math.abs(atmo - prevAtmo) > 1e-4) applyAtmo();
      shake = Math.max(0, shake - dt * 1.5);
      recoil = Math.max(0, recoil - dt * 6);
      launcher.position.z = 0.05 - recoil * 0.18;
      launcher.rotation.x = -recoil * 0.25;

      updateRockets(dt);

      // Animación de "reinstalación": todo vuelve a crecer
      if (regrow >= 0) {
        regrow = Math.min(1, regrow + dt / 1.6);
        const s = 1 - Math.pow(1 - regrow, 3);
        for (const e of enemies) compose(e, Math.max(0.001, s));
        trunkMesh.instanceMatrix.needsUpdate = leafMesh.instanceMatrix.needsUpdate = rockMesh.instanceMatrix.needsUpdate = true;
        if (regrow >= 1) {
          regrow = -1;
          mode = 'off';
        }
        return;
      }
      if (mode === 'hole') return updateHole(dt);
      if (mode !== 'on') return;

      t += dt;
      invuln -= dt;
      fireCd -= dt;
      player.model.visible = invuln <= 0 || Math.floor(invuln * 12) % 2 === 0;
      // se van despertando poco a poco (todos a los ~50 s) y aceleran despacio
      const awakenR = 10 + t * 1.6;
      const haste = 1 + t / 120;

      for (const e of enemies) {
        if (e.state === 'dead') continue;
        const dx = player.pos.x - e.x, dz = player.pos.z - e.z;
        const d = Math.hypot(dx, dz);
        if (e.state === 'dormant') {
          if (d < awakenR) e.state = 'awake';
          continue;
        }
        const reach = e.r + PLAYER_R;
        if (d > reach + 0.05) {
          const step = Math.min(d - reach, e.speed * haste * dt);
          const mx = (dx / d) * step, mz = (dz / d) * step;
          e.x += mx;
          e.z += mz;
          if (e.kind === 'rock') {
            axis.set(mz, 0, -mx).normalize();
            tmpQ.setFromAxisAngle(axis, step / e.s);
            e.q.premultiply(tmpQ);
          }
          const lim = walkLimit(e.x, e.z);
          const dc = Math.hypot(e.x, e.z);
          if (dc > lim) {
            e.x *= lim / dc;
            e.z *= lim / dc;
          }
        }
        if (d < reach + 0.05 && invuln <= 0) {
          hurt(e);
          if (mode !== 'on') return;
        }
        // Un cubo bien pateado también destruye
        for (const c of cubes) {
          if (c.sinking || Math.hypot(c.vel.x, c.vel.z) < 4) continue;
          if (Math.hypot(c.pos.x - e.x, c.pos.z - e.z) < e.r + 0.7) {
            destroy(e);
            break;
          }
        }
      }

      // Que no se amontonen unos encima de otros
      const awake = enemies.filter((e) => e.state === 'awake');
      for (let a = 0; a < awake.length; a++) {
        for (let b = a + 1; b < awake.length; b++) {
          const A = awake[a], B = awake[b];
          const dx = B.x - A.x, dz = B.z - A.z;
          const d = Math.hypot(dx, dz);
          const min = A.r + B.r;
          if (d < min && d > 1e-4) {
            const push = (min - d) / 2;
            A.x -= (dx / d) * push; A.z -= (dz / d) * push;
            B.x += (dx / d) * push; B.z += (dz / d) * push;
          }
        }
      }

      let ei = 0;
      for (const e of awake) {
        e.collider.x = e.x;
        e.collider.z = e.z;
        compose(e);
        // ojos mirando al jugador
        const dx = player.pos.x - e.x, dz = player.pos.z - e.z;
        const d = Math.hypot(dx, dz) || 1;
        const ux = dx / d, uz = dz / d;
        const out = e.kind === 'tree' ? 0.38 : e.s * 0.85;
        const y = e.kind === 'tree' ? e.h * 0.75 + Math.abs(Math.sin(t * 7 + e.phase)) * 0.45 : e.cy + e.s * 0.15;
        tmpQ.setFromAxisAngle(UP, Math.atan2(ux, uz));
        for (const side of [-1, 1]) {
          tmpV.set(e.x + ux * out + uz * side * 0.18, y, e.z + uz * out - ux * side * 0.18);
          tmpM.compose(tmpV, tmpQ, one);
          eyes.setMatrixAt(ei++, tmpM);
        }
      }
      for (let i = ei; i < total * 2; i++) eyes.setMatrixAt(i, ZERO);
      eyes.instanceMatrix.needsUpdate = true;
      trunkMesh.instanceMatrix.needsUpdate = leafMesh.instanceMatrix.needsUpdate = rockMesh.instanceMatrix.needsUpdate = true;
      countEl.textContent = `Borrado ${Math.round((done / total) * 100)}% · ${total - done} restantes · ${fmt(t)}`;

      if (done === total) win();
    },
  };
}
