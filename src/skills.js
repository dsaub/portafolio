import * as THREE from 'three';
import { canvasTexture, fitText, damp } from './util.js';
import { PLAYER_R } from './player.js';

const SIZE = 1.15;
const HALF = SIZE / 2;
const R = HALF * 1.05;
const GRAVITY = 25;
const QUARTER = Math.PI / 2;

function cubeTexture({ name, bg, fg }) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, name, w - 44, 64, '"Pixelify Sans", monospace');
    ctx.fillText(name, w / 2, h / 2 + 4);
  });
}

const snap = (v) => Math.round(v / QUARTER) * QUARTER;

export function buildSkills(scene, skills, spawnArea, { onSplash = () => {} } = {}) {
  const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
  const cubes = skills.map((skill, i) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: cubeTexture(skill), roughness: 0.7 }));
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    const a = (i / skills.length) * Math.PI * 2 + 0.3;
    const r = 4.6 + (i % 2) * 1.4;
    const cube = {
      name: skill.name,
      mesh,
      pos: new THREE.Vector3(Math.sin(a) * r, HALF, Math.cos(a) * r * 0.85 + 0.5),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(0, a, 0),
      spin: new THREE.Vector3(),
      sinking: 0,
    };
    return cube;
  });

  let kickCooldown = 0;

  function respawn(c) {
    const [x, z] = spawnArea();
    c.pos.set(x, 14, z);
    c.vel.set(0, 0, 0);
    c.spin.set(Math.random() * 4, 0, Math.random() * 4);
    c.sinking = 0;
    c.scored = 0;
  }

  return {
    cubes,
    respawn,
    update(dt, player, colliders, groundAt, edgeAt, sfx) {
      kickCooldown -= dt;
      for (const c of cubes) {
        if (c.sinking > 0) {
          c.sinking += dt;
          c.pos.y -= dt * 1.2;
          c.pos.x += c.vel.x * dt * 0.3;
          c.pos.z += c.vel.z * dt * 0.3;
          c.rot.x += dt * 0.6;
          if (c.sinking > 2.5) respawn(c);
          continue;
        }

        c.vel.y -= GRAVITY * dt;
        c.pos.addScaledVector(c.vel, dt);

        const ground = groundAt(c.pos.x, c.pos.z) + HALF;
        const grounded = c.pos.y <= ground + 0.01;
        if (c.pos.y < ground) {
          c.pos.y = ground;
          if (c.vel.y < -3) {
            c.vel.y = -c.vel.y * 0.35;
            if (c.vel.y > 2.5) sfx.thud();
          } else c.vel.y = 0;
        }
        if (grounded) {
          const f = Math.exp(-3.2 * dt);
          c.vel.x *= f;
          c.vel.z *= f;
          c.spin.multiplyScalar(Math.exp(-8 * dt));
          c.rot.x = damp(c.rot.x, snap(c.rot.x), 10, dt);
          c.rot.z = damp(c.rot.z, snap(c.rot.z), 10, dt);
        }
        c.rot.x += c.spin.x * dt;
        c.rot.y += c.spin.y * dt;
        c.rot.z += c.spin.z * dt;

        // Patada del jugador
        const dx = c.pos.x - player.pos.x;
        const dz = c.pos.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        const min = R + PLAYER_R;
        const overlapY = player.pos.y < c.pos.y + HALF && player.pos.y + 2.4 > c.pos.y - HALF;
        if (d < min && d > 1e-5 && overlapY) {
          const nx = dx / d, nz = dz / d;
          c.pos.x = player.pos.x + nx * min;
          c.pos.z = player.pos.z + nz * min;
          const along = player.vel.x * nx + player.vel.z * nz;
          if (along > 0.5) {
            const power = Math.max(along, 2) * 1.5;
            c.vel.x = nx * power + player.vel.x * 0.3;
            c.vel.z = nz * power + player.vel.z * 0.3;
            if (along > 3) {
              c.vel.y = Math.max(c.vel.y, 2 + along * 0.45);
              c.spin.set(nz * along * 1.6, (Math.random() - 0.5) * 4, -nx * along * 1.6);
              if (kickCooldown <= 0) {
                sfx.kick();
                kickCooldown = 0.15;
              }
            }
          }
        }

        // Obstáculos
        for (const o of colliders) {
          const ox = c.pos.x - o.x, oz = c.pos.z - o.z;
          const od = Math.hypot(ox, oz);
          const om = o.r + R;
          if (od < om && od > 1e-5) {
            const nx = ox / od, nz = oz / od;
            c.pos.x = o.x + nx * om;
            c.pos.z = o.z + nz * om;
            const vn = c.vel.x * nx + c.vel.z * nz;
            if (vn < 0) {
              c.vel.x -= 1.6 * vn * nx;
              c.vel.z -= 1.6 * vn * nz;
            }
          }
        }

        // Si sale de la isla, se hunde y vuelve a caer del cielo
        const dc = Math.hypot(c.pos.x, c.pos.z);
        if (dc > edgeAt(c.pos.x, c.pos.z) + 0.6) {
          c.sinking = 0.001;
          sfx.splash();
          onSplash(c);
        }
      }

      // Choques entre cubos
      for (let i = 0; i < cubes.length; i++) {
        for (let j = i + 1; j < cubes.length; j++) {
          const a = cubes[i], b = cubes[j];
          if (a.sinking || b.sinking) continue;
          if (Math.abs(a.pos.y - b.pos.y) > SIZE) continue;
          const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < R * 2 && d > 1e-5) {
            const nx = dx / d, nz = dz / d;
            const push = (R * 2 - d) / 2;
            a.pos.x -= nx * push; a.pos.z -= nz * push;
            b.pos.x += nx * push; b.pos.z += nz * push;
            const rel = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
            if (rel < 0) {
              const imp = -rel * 0.9;
              a.vel.x -= nx * imp; a.vel.z -= nz * imp;
              b.vel.x += nx * imp; b.vel.z += nz * imp;
            }
          }
        }
      }

      for (const c of cubes) {
        c.mesh.position.copy(c.pos);
        c.mesh.rotation.copy(c.rot);
      }
    },
  };
}
