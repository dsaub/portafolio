import * as THREE from 'three';
import { mulberry32, mat, polar, canvasTexture, fitText } from './util.js';

export const CELL = 2;
export const ISLAND_R = 44;
export const PLAZA_R = 8.5;
export const STATION_R = 24;
export const SIGN_POS = [0, -11.5];
// Portería escondida entre los dos primeros caminos (noreste)
export const GOAL_ANGLE = Math.PI / 3;
export const GOAL_R = 15;

// Ángulo de cada estación alrededor de la plaza (0 = norte queda libre para el cartel)
export const stationAngle = (i, n) => (i + 0.5) * ((Math.PI * 2) / n);

export const islandEdge = (a) => ISLAND_R + Math.sin(a * 3 + 0.5) * 2.5 + Math.sin(a * 7 + 1.3) * 1.2;
const angleOf = (x, z) => Math.atan2(x, -z);

function cellKind(cx, cz) {
  const d = Math.hypot(cx, cz);
  const e = islandEdge(angleOf(cx, cz));
  if (d > e) return null;
  if (d > e - 4) return 'sand';
  return 'grass';
}

// Altura del terreno en un punto (alineada con las celdas)
export function terrainHeight(x, z) {
  const cx = Math.round(x / CELL) * CELL;
  const cz = Math.round(z / CELL) * CELL;
  return cellKind(cx, cz) === 'sand' ? -0.2 : 0;
}

export const walkLimit = (x, z) => islandEdge(angleOf(x, z)) - 1.6;
// ¿Hay un bloque de tierra bajo este punto? (si no, es mar)
export const isLand = (x, z) => cellKind(Math.round(x / CELL) * CELL, Math.round(z / CELL) * CELL) !== null;

export function distToPath(x, z, angle) {
  const dx = Math.sin(angle), dz = -Math.cos(angle);
  const t = Math.min(STATION_R - 3, Math.max(PLAZA_R - 1, x * dx + z * dz));
  return Math.hypot(x - dx * t, z - dz * t);
}

export function buildWorld(scene, stationAngles) {
  const rand = mulberry32(1337);
  const colliders = [];
  const updaters = [];

  // ---------- Terreno de vóxeles ----------
  const cells = [];
  const span = Math.ceil((ISLAND_R + 5) / CELL);
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      const x = i * CELL, z = j * CELL;
      const kind = cellKind(x, z);
      if (kind) cells.push({ x, z, kind });
    }
  }

  const topGeo = new THREE.BoxGeometry(CELL, 0.4, CELL);
  const dirtGeo = new THREE.BoxGeometry(CELL, 3, CELL);
  const topMesh = new THREE.InstancedMesh(topGeo, mat(0xffffff), cells.length);
  const dirtMesh = new THREE.InstancedMesh(dirtGeo, mat(0xffffff), cells.length);
  topMesh.receiveShadow = true;
  dirtMesh.receiveShadow = true;

  const grass = [0x6cc24a, 0x62b844, 0x74c950, 0x5fb240, 0x7ccf55];
  const sand = [0xf0dca4, 0xe9d396, 0xf3e2b0];
  const stone = [0xc9c2b4, 0xbdb5a6, 0xd3ccbe, 0xb3ab9b];
  const dirt = [0x8a5a3b, 0x7d5034, 0x936342];
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  cells.forEach((cell, idx) => {
    const top = cell.kind === 'sand' ? -0.2 : 0;
    const d = Math.hypot(cell.x, cell.z);
    let color = cell.kind === 'sand' ? pick(sand) : pick(grass);
    if (cell.kind === 'grass') {
      const onPlaza = d < PLAZA_R;
      const onPath = stationAngles.some((a) => distToPath(cell.x, cell.z, a) < 1.25);
      if (onPlaza || onPath) color = pick(stone);
    }
    m.makeTranslation(cell.x, top - 0.2, cell.z);
    topMesh.setMatrixAt(idx, m);
    topMesh.setColorAt(idx, c.setHex(color));
    m.makeTranslation(cell.x, top - 0.4 - 1.5, cell.z);
    dirtMesh.setMatrixAt(idx, m);
    dirtMesh.setColorAt(idx, c.setHex(pick(dirt)));
  });
  scene.add(topMesh, dirtMesh);

  // ---------- Agua animada ----------
  const waterUniforms = { uTime: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3aa7e0,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
    roughness: 0.3,
    metalness: 0.1,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.z += sin(position.x * 0.35 + uTime * 1.2) * 0.18 + cos(position.y * 0.3 + uTime) * 0.18;`
      );
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 110, 110), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.75;
  water.receiveShadow = true;
  scene.add(water);
  updaters.push((t) => (waterUniforms.uTime.value = t));

  // ---------- Árboles, rocas y flores ----------
  const blocked = (x, z, margin = 0) => {
    const d = Math.hypot(x, z);
    if (d < PLAZA_R + 2.5 + margin) return true;
    if (d > islandEdge(angleOf(x, z)) - 5) return true;
    if (Math.hypot(x - SIGN_POS[0], z - SIGN_POS[1]) < 6.5) return true;
    const [gx, gz] = polar(GOAL_ANGLE, GOAL_R + 0.8);
    if (Math.hypot(x - gx, z - gz) < 6 + margin) return true;
    for (const a of stationAngles) {
      const [sx, sz] = polar(a, STATION_R);
      if (Math.hypot(x - sx, z - sz) < 7 + margin) return true;
      // zona entre la cámara (al sur) y el pedestal, para que nada lo tape
      if (z > sz && z - sz < 11 && Math.abs(x - sx) < 6) return true;
      if (distToPath(x, z, a) < 2.6 + margin) return true;
    }
    return false;
  };

  const trees = [];
  for (let tries = 0; trees.length < 70 && tries < 4000; tries++) {
    const x = (rand() * 2 - 1) * ISLAND_R;
    const z = (rand() * 2 - 1) * ISLAND_R;
    if (blocked(x, z)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    trees.push({ x, z, h: 1.6 + rand() * 1.4 });
  }

  const trunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1, 0.7), mat(0x7a4a2a), trees.length);
  const leafCount = trees.length * 4;
  const leafMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), leafCount);
  trunkMesh.castShadow = leafMesh.castShadow = true;
  const leafColors = [0x3f9b3a, 0x4caf44, 0x2f8a35, 0x56b84b];
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let li = 0;
  trees.forEach((t, i) => {
    m.compose(p.set(t.x, t.h / 2, t.z), q.identity(), s.set(1, t.h, 1));
    trunkMesh.setMatrixAt(i, m);
    const leafColor = pick(leafColors);
    const big = 2 + rand() * 0.6;
    const blocks = [
      [0, t.h + big / 2 - 0.2, 0, big],
      [(rand() - 0.5) * 1.2, t.h + big - 0.1, (rand() - 0.5) * 1.2, big * 0.6],
      [(rand() - 0.5) * 1.8, t.h + 0.4, (rand() - 0.5) * 1.8, big * 0.55],
      [(rand() - 0.5) * 1.6, t.h + 0.9, (rand() - 0.5) * 1.6, big * 0.5],
    ];
    for (const [bx, by, bz, bs] of blocks) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 0.4);
      m.compose(p.set(t.x + bx, by, t.z + bz), q, s.set(bs, bs, bs));
      leafMesh.setMatrixAt(li, m);
      leafMesh.setColorAt(li, c.setHex(leafColor).offsetHSL(0, 0, (rand() - 0.5) * 0.06));
      li++;
    }
    t.collider = { x: t.x, z: t.z, r: 0.75 };
    colliders.push(t.collider);
  });
  scene.add(trunkMesh, leafMesh);

  // Rocas
  const rocks = [];
  for (let tries = 0; rocks.length < 28 && tries < 3000; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 10 + rand() * (ISLAND_R - 8);
    const [x, z] = polar(a, r);
    if (Math.hypot(x, z) > islandEdge(a) - 1.5) continue;
    if (blocked(x, z, -1) && Math.hypot(x, z) < islandEdge(a) - 5) continue;
    if (Math.hypot(x, z) < PLAZA_R + 3) continue;
    if (stationAngles.some((sa) => distToPath(x, z, sa) < 2.6)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
    rocks.push({ x, z, s: 0.5 + rand() * 0.9 });
  }
  const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat(0xffffff), rocks.length);
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  rocks.forEach((r, i) => {
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    m.compose(p.set(r.x, r.s * 0.35 + terrainHeight(r.x, r.z), r.z), q, s.set(r.s, r.s * 0.75, r.s));
    rockMesh.setMatrixAt(i, m);
    rockMesh.setColorAt(i, c.setHex(pick([0x9a9a9a, 0x8b8f94, 0xa7a59f])));
    r.collider = { x: r.x, z: r.z, r: r.s * 0.9 };
    colliders.push(r.collider);
  });
  scene.add(rockMesh);

  // Flores
  const flowers = [];
  for (let tries = 0; flowers.length < 160 && tries < 5000; tries++) {
    const x = (rand() * 2 - 1) * ISLAND_R;
    const z = (rand() * 2 - 1) * ISLAND_R;
    if (cellKind(Math.round(x / CELL) * CELL, Math.round(z / CELL) * CELL) !== 'grass') continue;
    if (Math.hypot(x, z) < PLAZA_R + 0.5) continue;
    if (stationAngles.some((a) => distToPath(x, z, a) < 1.8)) continue;
    flowers.push({ x, z });
  }
  const stemMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), mat(0x2f7d2a), flowers.length);
  const petalMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), mat(0xffffff), flowers.length);
  const petalColors = [0xff6b9a, 0xffd23f, 0xffffff, 0xb388ff, 0xff8c42];
  flowers.forEach((f, i) => {
    m.makeTranslation(f.x, 0.22, f.z);
    stemMesh.setMatrixAt(i, m);
    m.makeTranslation(f.x, 0.5, f.z);
    petalMesh.setMatrixAt(i, m);
    petalMesh.setColorAt(i, c.setHex(pick(petalColors)));
  });
  scene.add(stemMesh, petalMesh);

  // ---------- Nubes ----------
  const cloudMat = mat(0xffffff, { roughness: 1 });
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cloudMat);
      b.scale.set(3 + rand() * 4, 1.2 + rand() * 1.2, 2.5 + rand() * 3);
      b.position.set(k * 2.4 - n, rand() * 0.8, (rand() - 0.5) * 2.5);
      b.castShadow = true;
      g.add(b);
    }
    g.position.set((rand() * 2 - 1) * 110, 20 + rand() * 10, (rand() * 2 - 1) * 90);
    g.userData.speed = 0.6 + rand() * 0.8;
    clouds.push(g);
    scene.add(g);
  }
  updaters.push((t, dt) => {
    for (const g of clouds) {
      g.position.x += g.userData.speed * dt;
      if (g.position.x > 120) g.position.x = -120;
    }
  });

  // ---------- Cartel de bienvenida ----------
  const signGroup = new THREE.Group();
  signGroup.position.set(SIGN_POS[0], 0, SIGN_POS[1]);
  const wood = mat(0x8b5a34);
  const darkWood = mat(0x6b4226);
  for (const sx of [-4.2, 4.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 0.5), darkWood);
    post.position.set(sx, 2.3, 0);
    post.castShadow = true;
    signGroup.add(post);
    colliders.push({ x: SIGN_POS[0] + sx, z: SIGN_POS[1], r: 0.5 });
  }
  for (let bx = -3.6; bx <= 3.61; bx += 0.8) colliders.push({ x: SIGN_POS[0] + bx, z: SIGN_POS[1], r: 0.45 });
  const signText = `Explora la isla y descubre mis ${stationAngles.length} proyectos`;
  const signTex = canvasTexture(1024, 384, (ctx, w, h) => {
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1b2a';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1d1b2a';
    ctx.font = '700 132px "Pixelify Sans", monospace';
    ctx.fillText('DANIEL', w / 2, 120);
    ctx.fillStyle = '#ff7a3d';
    ctx.font = '600 54px "Pixelify Sans", monospace';
    ctx.fillText('aka elordenador', w / 2, 220);
    ctx.fillStyle = '#4a4560';
    fitText(ctx, signText, w - 80, 40, '"Space Grotesk", sans-serif', '500');
    ctx.fillText(signText, w / 2, 305);
  });
  const boardMats = [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 }), wood];
  const board = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.15, 0.3), boardMats);
  board.position.set(0, 3.1, 0.1);
  board.castShadow = true;
  signGroup.add(board);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.35, 1), darkWood);
  roof.position.set(0, 4.85, 0.1);
  roof.castShadow = true;
  signGroup.add(roof);
  scene.add(signGroup);

  // Si el jugador queda detrás del cartel, este se vuelve translúcido
  const signMats = [wood, darkWood, boardMats[4]];
  signMats.forEach((m) => (m.transparent = true));
  let signAlpha = 1;
  const fadeSign = (pos, dt) => {
    const behind = pos.z < SIGN_POS[1] && pos.z > SIGN_POS[1] - 8 && Math.abs(pos.x - SIGN_POS[0]) < 6.5;
    signAlpha += ((behind ? 0.3 : 1) - signAlpha) * (1 - Math.exp(-8 * dt));
    for (const m of signMats) {
      m.opacity = signAlpha;
      m.depthWrite = signAlpha > 0.95;
    }
  };

  return {
    colliders,
    // Para el modo destrucción: todo lo que se puede romper (y restaurar)
    props: { trees, rocks, flowers, trunkMesh, leafMesh, rockMesh, stemMesh, petalMesh, waterMat },
    fadeSign,
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
  };
}
