import * as THREE from 'three';

const MAX = 400;

// Partículas cúbicas para celebrar descubrimientos
export function createBursts(scene) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    MAX
  );
  mesh.frustumCulled = false;
  scene.add(mesh);
  const parts = Array.from({ length: MAX }, () => ({
    life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0, g: 18,
  }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const axis = new THREE.Vector3(1, 1, 0).normalize();
  const col = new THREE.Color();
  let cursor = 0;

  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX; i++) {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, col.setHex(0xffffff));
  }

  return {
    spawn(pos, colors, count = 50, { speed = 7, up = 6, gravity = 18 } = {}) {
      for (let k = 0; k < count; k++) {
        const i = cursor;
        cursor = (cursor + 1) % MAX;
        const pt = parts[i];
        pt.p.copy(pos);
        const a = Math.random() * Math.PI * 2;
        const e = Math.random() * 2 - 1;
        const sp = speed * (0.4 + Math.random() * 0.6);
        pt.v.set(Math.cos(a) * sp * Math.sqrt(1 - e * e), up * (0.5 + Math.random()) + e * sp * 0.5, Math.sin(a) * sp * Math.sqrt(1 - e * e));
        pt.max = pt.life = 1 + Math.random() * 0.8;
        pt.r = Math.random() * 6;
        pt.g = gravity;
        mesh.setColorAt(i, col.setHex(colors[k % colors.length]));
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const pt = parts[i];
        if (pt.life <= 0) continue;
        pt.life -= dt;
        if (pt.life <= 0) {
          mesh.setMatrixAt(i, hidden);
          continue;
        }
        pt.v.y -= pt.g * dt;
        pt.v.multiplyScalar(Math.exp(-1.2 * dt));
        pt.p.addScaledVector(pt.v, dt);
        if (pt.p.y < 0.1) {
          pt.p.y = 0.1;
          pt.v.y *= -0.4;
        }
        pt.r += dt * 8;
        q.setFromAxisAngle(axis, pt.r);
        const k = Math.min(1, pt.life / pt.max * 2);
        m.compose(pt.p, q, s.set(k, k, k));
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
