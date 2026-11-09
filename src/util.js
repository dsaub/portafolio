import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export function angleDamp(a, b, lambda, dt) {
  const TAU = Math.PI * 2;
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export function canvasTexture(w, h, draw, { pixel = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (pixel) ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  tex.userData.ctx = ctx;
  return tex;
}

export function fitText(ctx, text, maxWidth, size, family, weight = '700') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 8);
}

export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

// Ángulo 0 = norte (-z), en sentido horario
export const polar = (angle, r) => [Math.sin(angle) * r, -Math.cos(angle) * r];
