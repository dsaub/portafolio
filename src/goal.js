import * as THREE from 'three';
import { mat, polar, canvasTexture } from './util.js';

// Portería escondida: mete los cubos de tecnologías para marcar gol
const W = 4.4; // ancho
const H = 2.2; // alto
const D = 1.6; // fondo

function netTexture() {
  const tex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= w; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function drawBoard(ctx, w, h, goals) {
  ctx.fillStyle = '#1d1b2a';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff7a3d';
  ctx.font = '700 44px "Pixelify Sans", monospace';
  ctx.fillText('GOLES', w / 2, 46);
  ctx.fillStyle = '#5dff8a';
  ctx.font = '700 96px "Pixelify Sans", monospace';
  ctx.fillText(String(goals).padStart(2, '0'), w / 2, 140);
}

export function buildGoal(scene, colliders, angle, radius) {
  const [gx, gz] = polar(angle, radius);
  // Ejes en el plano xz: X a lo largo de la boca, O hacia el fondo de la red (lejos del centro)
  const X = [Math.cos(angle), Math.sin(angle)];
  const O = [Math.sin(angle), -Math.cos(angle)];
  const toWorld = (lx, depth) => [gx + X[0] * lx + O[0] * depth, gz + X[1] * lx + O[1] * depth];

  const group = new THREE.Group();
  group.position.set(gx, 0, gz);
  group.rotation.y = -angle; // el -z local apunta hacia fuera
  const white = mat(0xffffff);
  const box = (w, h, d, x, y, z, m = white) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Marco
  for (const sx of [-W / 2, W / 2]) {
    box(0.2, H, 0.2, sx, H / 2, 0);
    box(0.12, H * 0.7, 0.12, sx, H * 0.35, -D);
    const top = box(0.1, 0.1, Math.hypot(D, H * 0.3), sx, H * 0.85, -D / 2);
    top.rotation.x = -Math.atan2(H * 0.3, D);
  }
  box(W + 0.2, 0.2, 0.2, 0, H, 0);
  box(W, 0.1, 0.1, 0, H * 0.7, -D);
  box(W, 0.04, 0.14, 0, 0.03, 0, mat(0xf5f5f5)); // línea de gol

  // Red
  const netMat = new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const plane = (w, h, x, y, z, ry = 0, rx = 0) => {
    const m = netMat.clone();
    m.map = netMat.map.clone();
    m.map.repeat.set(w / 1.2, h / 1.2);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0, 'YXZ');
    group.add(mesh);
  };
  plane(W, H * 0.7, 0, H * 0.35, -D);
  for (const sx of [-W / 2, W / 2]) plane(D, H * 0.85, sx, H * 0.42, -D / 2, Math.PI / 2);
  plane(W, Math.hypot(D, H * 0.3), 0, H * 0.85, -D / 2, 0, Math.PI / 2 - Math.atan2(H * 0.3, D));

  // Marcador
  const boardTex = canvasTexture(256, 200, (ctx, w, h) => drawBoard(ctx, w, h, 0));
  const wood = mat(0x6b4226);
  box(0.2, 2.4, 0.2, W / 2 + 1.4, 1.2, 0.2, wood);
  const board = box(1.7, 1.33, 0.14, W / 2 + 1.4, 2.6, 0.2, [wood, wood, wood, wood, new THREE.MeshBasicMaterial({ map: boardTex }), wood]);
  board.rotation.y = angle; // mira hacia el sur, donde está la cámara
  scene.add(group);

  // Colisiones: postes, fondo y laterales de la red, poste del marcador
  const add = (lx, depth, r) => {
    const [x, z] = toWorld(lx, depth);
    colliders.push({ x, z, r });
  };
  add(-W / 2, 0, 0.2);
  add(W / 2, 0, 0.2);
  for (let lx = -W / 2; lx <= W / 2 + 0.01; lx += 0.5) add(lx, D, 0.2);
  for (const sx of [-W / 2, W / 2]) for (let d = 0.4; d < D; d += 0.4) add(sx, d, 0.2);
  add(W / 2 + 1.4, -0.2, 0.2);

  const [cx, cz] = toWorld(0, D / 2);
  const center = new THREE.Vector3(cx, 1.2, cz);

  return {
    center,
    setScore(n) {
      drawBoard(boardTex.userData.ctx, 256, 200, n);
      boardTex.needsUpdate = true;
    },
    // Devuelve true si el cubo está dentro de la portería
    contains(p) {
      const dx = p.x - gx, dz = p.z - gz;
      const lx = dx * X[0] + dz * X[1];
      const depth = dx * O[0] + dz * O[1];
      return Math.abs(lx) < W / 2 - 0.3 && depth > 0.3 && depth < D && p.y < H;
    },
  };
}
