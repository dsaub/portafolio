import * as THREE from 'three';
import { mat } from './util.js';

// Piezas compartidas por la isla desierta (sea.js) y la isla de Ugg (ugg/island.js)
export function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// Palmera inclinada con cocos
export function buildPalm() {
  const palm = new THREE.Group();
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
  return palm;
}

export function buildCaveman() {
  const g = new THREE.Group();
  const skin = mat(0xd9a066);
  const fur = mat(0x8b5a2b);
  const furDark = mat(0x5e3b1c);
  const hair = mat(0x2b1d14);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const pink = new THREE.MeshBasicMaterial({ color: 0xff4d8d });
  const pupils = [];

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
    pupils.push(pupil);
    headG.add(eye, pupil);
  }
  g.add(headG);
  g.visible = false;
  return {
    group: g,
    legs,
    arms,
    head: headG,
    club,
    // Ojos de corazón: modo enamorado (yandere)
    setLove(on) {
      for (const p of pupils) {
        p.material = on ? pink : black;
        p.scale.set(on ? 1.9 : 1, on ? 1.9 : 1, 1);
      }
    },
  };
}
