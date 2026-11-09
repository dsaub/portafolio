import * as THREE from 'three';
import { mat, polar, canvasTexture } from './util.js';
import { islandEdge, terrainHeight } from './world.js';

// Nota del sysadmin clavada en la playa del norte: la pista del comando prohibido
export const NOTE_CMD = 'rm -rf --no-preserve-root /';
const ANGLE = 0.3;

function noteTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = '#c0392b';
    ctx.textAlign = 'center';
    ctx.font = '700 56px "Pixelify Sans", monospace';
    ctx.fillText('¡NO!', w / 2, 110);
    ctx.strokeStyle = '#3b3646';
    ctx.lineWidth = 6;
    for (let y = 150; y <= 220; y += 26) {
      ctx.beginPath();
      ctx.moveTo(34, y);
      ctx.lineTo(w - 34 - (y % 3) * 20, y);
      ctx.stroke();
    }
  });
}

export function buildNote(scene, colliders) {
  const [x, z] = polar(ANGLE, islandEdge(ANGLE) - 3.6);
  const ground = terrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, ground, z);
  g.rotation.y = 0.35;
  const stake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), mat(0x6b4226));
  stake.position.y = 0.65;
  const paperMat = new THREE.MeshStandardMaterial({ map: noteTexture(), roughness: 0.9 });
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.03), [mat(0xffe066), mat(0xffe066), mat(0xffe066), mat(0xffe066), paperMat, mat(0xffe066)]);
  paper.position.set(0, 1.05, 0.09);
  paper.rotation.z = 0.08;
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xe84a4a));
  pin.position.set(0, 1.36, 0.13);
  g.add(stake, paper, pin);
  g.traverse((o) => (o.castShadow = true));
  scene.add(g);
  colliders.push({ x, z, r: 0.25 });

  let near = false;
  return {
    // Avisa una vez cada vez que el jugador se acerca
    update(player, onRead) {
      const d = Math.hypot(player.pos.x - x, player.pos.z - z);
      if (d < 1.9 && !near) onRead();
      near = d < 2.6 && (near || d < 1.9);
    },
  };
}
