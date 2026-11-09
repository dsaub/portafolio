import * as THREE from 'three';
import { mat, polar } from './util.js';
import { SIGN_POS, terrainHeight, islandEdge } from './world.js';

// Disquetes coleccionables escondidos por la isla
const KEY = 'elordenador-floppies';
const COLORS = [0x3a6ea5, 0xe84a4a, 0x2ec4b6, 0xffa62b, 0x9b5de5];

function floppyMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), mat(color));
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.1), mat(0xc9ced6, { metalness: 0.6, roughness: 0.3 }));
  shutter.position.y = 0.2;
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.1), mat(0xfff8e7));
  label.position.y = -0.12;
  g.add(body, shutter, label);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

// Escondites: detrás del cartel, en la playa sur, detrás del cartel de un proyecto,
// en el bosque del este y uno flotando sobre la playa que exige saltar
function spots(stations) {
  const last = stations[stations.length - 1];
  const at = (a, r, lift, id) => {
    const [x, z] = polar(a, r);
    return { id, x, z, lift };
  };
  return [
    { id: 'cartel', x: SIGN_POS[0] + 2.6, z: SIGN_POS[1] - 1.7, lift: 0.7 },
    at(Math.PI, islandEdge(Math.PI) - 3.4, 0.6, 'playa'),
    { id: 'proyecto', x: last.x + 0.6, z: last.z - 5.3, lift: 0.7 },
    at(2.1, 33, 0.7, 'bosque'),
    at(4.2, islandEdge(4.2) - 3.4, 2.6, 'salto'),
  ];
}

function load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function buildFloppies(scene, stations, colliders) {
  const found = load();
  const items = spots(stations).map((s, i) => {
    // Apartarlo de árboles y rocas que hayan caído encima
    for (let pass = 0; pass < 4; pass++) {
      for (const c of colliders) {
        const dx = s.x - c.x, dz = s.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + 0.7;
        if (d < min) {
          const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
          s.x = c.x + nx * min;
          s.z = c.z + nz * min;
        }
      }
    }
    const mesh = floppyMesh(COLORS[i % COLORS.length]);
    const y = terrainHeight(s.x, s.z) + s.lift;
    mesh.position.set(s.x, y, s.z);
    mesh.visible = !found.has(s.id);
    scene.add(mesh);
    return { ...s, y, mesh, phase: i * 1.7 };
  });

  return {
    items,
    total: items.length,
    get count() {
      return items.filter((it) => found.has(it.id)).length;
    },
    update(t, player, onPick) {
      for (const it of items) {
        if (found.has(it.id)) continue;
        it.mesh.rotation.y = t * 2 + it.phase;
        it.mesh.position.y = it.y + Math.sin(t * 2.4 + it.phase) * 0.12;
        const dh = Math.hypot(player.pos.x - it.x, player.pos.z - it.z);
        const dv = Math.abs(player.pos.y + 1 - it.mesh.position.y);
        if (dh < 1.1 && dv < 1.3) {
          found.add(it.id);
          try {
            localStorage.setItem(KEY, JSON.stringify([...found]));
          } catch {}
          it.mesh.visible = false;
          onPick(it, this.count, items.length);
        }
      }
    },
  };
}
