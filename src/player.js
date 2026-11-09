import * as THREE from 'three';
import { mat, canvasTexture, damp, angleDamp } from './util.js';

const WALK = 6;
const RUN = 10.5;
const JUMP = 8.5;
const GRAVITY = 24;
export const PLAYER_R = 0.55;

// Cara pixelada en la pantalla del monitor
const FACES = {
  idle: [
    [18, 16, 6, 10], [40, 16, 6, 10],
    [24, 34, 16, 3],
  ],
  blink: [
    [17, 22, 8, 3], [39, 22, 8, 3],
    [24, 34, 16, 3],
  ],
  happy: [
    [16, 20, 3, 3], [19, 17, 3, 3], [22, 14, 3, 3], [25, 17, 3, 3], [28, 20, 3, 3],
    [36, 20, 3, 3], [39, 17, 3, 3], [42, 14, 3, 3], [45, 17, 3, 3], [48, 20, 3, 3],
    [22, 31, 3, 3], [25, 34, 14, 3], [39, 31, 3, 3],
  ],
  wow: [
    [18, 14, 6, 10], [40, 14, 6, 10],
    [28, 30, 8, 2], [28, 36, 8, 2], [26, 32, 2, 4], [36, 32, 2, 4],
  ],
  sleep: [
    [16, 24, 10, 3], [38, 24, 10, 3],
    [28, 35, 8, 3],
    [50, 4, 8, 2], [56, 6, 2, 2], [54, 8, 2, 2], [52, 10, 2, 2], [50, 12, 8, 2],
  ],
};
FACES.ko = [
  [17, 17, 3, 3], [20, 20, 3, 3], [23, 23, 3, 3], [23, 17, 3, 3], [17, 23, 3, 3],
  [39, 17, 3, 3], [42, 20, 3, 3], [45, 23, 3, 3], [45, 17, 3, 3], [39, 23, 3, 3],
  [22, 35, 4, 2], [26, 33, 4, 2], [30, 35, 4, 2], [34, 33, 4, 2], [38, 35, 4, 2],
];
const SLEEP_AFTER = 20;

function drawFace(ctx, face) {
  ctx.fillStyle = '#0d2b1c';
  ctx.fillRect(0, 0, 64, 48);
  ctx.fillStyle = 'rgba(93,255,138,0.07)';
  for (let y = 0; y < 48; y += 2) ctx.fillRect(0, y, 64, 1);
  ctx.fillStyle = '#5dff8a';
  for (const [x, y, w, h] of FACES[face]) ctx.fillRect(x, y, w, h);
}

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    scene.add(this.root);

    this.pos = new THREE.Vector3(0, 0, 3);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.facing = 0;
    this.phase = 0;
    this.face = 'idle';
    this.faceTimer = 0;
    this.blinkTimer = 2;
    this.squash = 1;
    this.idle = 0;

    const shirt = mat(0xff7a3d);
    this.shirt = shirt;
    const pants = mat(0x2d3a5c);
    const skin = mat(0xf2c9a0);
    const beige = mat(0xe8dcc0);
    this.casing = beige;
    const dark = mat(0x3b3646);

    const box = (w, h, d, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.castShadow = true;
      return mesh;
    };

    // Piernas
    this.legs = [-0.2, 0.2].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.75, 0);
      const leg = box(0.3, 0.75, 0.32, pants);
      leg.position.y = -0.375;
      const shoe = box(0.32, 0.16, 0.42, dark);
      shoe.position.set(0, -0.68, 0.05);
      pivot.add(leg, shoe);
      this.model.add(pivot);
      return pivot;
    });

    // Torso
    const body = box(0.85, 0.8, 0.48, shirt);
    body.position.y = 1.15;
    const collar = box(0.4, 0.08, 0.5, mat(0xffffff));
    collar.position.y = 1.56;
    this.model.add(body, collar);

    // Brazos
    this.arms = [-0.56, 0.56].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.48, 0);
      const arm = box(0.24, 0.62, 0.26, shirt);
      arm.position.y = -0.3;
      const hand = box(0.22, 0.18, 0.22, skin);
      hand.position.y = -0.68;
      pivot.add(arm, hand);
      this.model.add(pivot);
      return pivot;
    });

    // Cabeza: un monitor CRT
    this.head = new THREE.Group();
    this.head.position.y = 2.05;
    const neck = box(0.3, 0.2, 0.3, beige);
    neck.position.y = -0.42;
    const monitor = box(1.15, 0.9, 0.85, beige);
    const back = box(0.8, 0.62, 0.45, beige);
    back.position.z = -0.6;
    const bezel = box(0.98, 0.74, 0.04, dark);
    bezel.position.z = 0.43;
    this.faceTex = canvasTexture(64, 48, (ctx) => drawFace(ctx, 'idle'), { pixel: true });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.64), new THREE.MeshBasicMaterial({ map: this.faceTex }));
    screen.position.z = 0.456;
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.05, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x5dff8a })
    );
    led.position.set(0.44, -0.4, 0.44);
    this.head.add(neck, monitor, back, bezel, screen, led);
    this.model.add(this.head);

    // Sombra de contacto (siempre visible, ayuda a calcular los saltos)
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    scene.add(this.blob);
  }

  setFace(face, duration = 0) {
    if (face !== this.face) {
      this.face = face;
      drawFace(this.faceTex.userData.ctx, face);
      this.faceTex.needsUpdate = true;
    }
    this.faceTimer = duration;
  }

  // Carcasa dorada: premio por encontrar todos los disquetes
  setGold(on) {
    this.casing.color.setHex(on ? 0xffc93c : 0xe8dcc0);
    this.casing.metalness = on ? 0.55 : 0;
    this.casing.roughness = on ? 0.35 : 0.85;
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  update(dt, input, colliders, groundAt, walkLimit, sfx) {
    const { x: ix, z: iz } = input.axis();
    const len = Math.hypot(ix, iz);
    const maxSpeed = input.running() ? RUN : WALK;
    const tx = len > 0 ? (ix / Math.max(1, len)) * maxSpeed : 0;
    const tz = len > 0 ? (iz / Math.max(1, len)) * maxSpeed : 0;
    const accel = this.onGround ? 12 : 5;
    this.vel.x = damp(this.vel.x, tx, accel, dt);
    this.vel.z = damp(this.vel.z, tz, accel, dt);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // Colisiones con árboles, rocas y postes
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) {
        const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
        const min = c.r + PLAYER_R;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          this.pos.x = c.x + (dx / d) * min;
          this.pos.z = c.z + (dz / d) * min;
        }
      }
    }
    const d = Math.hypot(this.pos.x, this.pos.z);
    const limit = walkLimit(this.pos.x, this.pos.z);
    if (d > limit) {
      this.pos.x *= limit / d;
      this.pos.z *= limit / d;
    }

    // Salto y gravedad
    const ground = groundAt(this.pos.x, this.pos.z);
    if (input.consumeJump() && this.onGround) {
      this.vy = JUMP;
      this.onGround = false;
      this.squash = 0.75;
      sfx.jump();
      this.setFace('wow', 0.5);
    }
    this.vy -= GRAVITY * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) {
      if (!this.onGround && this.vy < -6) this.squash = 0.8;
      this.pos.y = ground;
      this.vy = 0;
      this.onGround = true;
    } else if (this.onGround && this.pos.y - ground < 0.45 && this.vy <= 0) {
      this.pos.y = ground; // bajar escalones pequeños sin "saltar"
      this.vy = 0;
    } else {
      this.onGround = false;
    }

    // Orientación y animación de caminar
    const speed = this.speed;
    if (speed > 0.3) this.facing = angleDamp(this.facing, Math.atan2(this.vel.x, this.vel.z), 12, dt);
    const amount = Math.min(1, speed / WALK);
    this.phase += dt * (4 + speed * 1.3);
    const swing = this.onGround ? Math.sin(this.phase) * 0.8 * amount : 0.5;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = this.onGround ? -swing : -0.3;
    this.arms[0].rotation.x = this.onGround ? -swing * 0.9 : -2.6;
    this.arms[1].rotation.x = this.onGround ? swing * 0.9 : -2.6;
    this.arms[0].rotation.z = this.onGround ? 0 : -0.3;
    this.arms[1].rotation.z = this.onGround ? 0 : 0.3;
    const bob = this.onGround ? Math.abs(Math.sin(this.phase)) * 0.08 * amount : 0;
    this.head.rotation.z = Math.sin(this.phase) * 0.06 * amount;

    this.squash = damp(this.squash, 1, 10, dt);
    this.model.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
    this.root.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.root.rotation.y = this.facing;

    this.blob.position.set(this.pos.x, ground + 0.03, this.pos.z);
    const h = Math.max(0, this.pos.y - ground);
    this.blob.scale.setScalar(Math.max(0.4, 1 - h * 0.12));
    this.blob.material.opacity = Math.max(0.08, 0.25 - h * 0.03);

    // Si nadie lo mueve en un rato, se echa una siesta
    if (len > 0.05 || !this.onGround) {
      this.idle = 0;
      if (this.face === 'sleep') this.setFace('idle');
    } else if ((this.idle += dt) > SLEEP_AFTER && this.face !== 'sleep') {
      this.setFace('sleep', Infinity);
    }

    // Cara: parpadeos y expresiones temporales
    if (this.faceTimer > 0) {
      this.faceTimer -= dt;
      if (this.faceTimer <= 0) this.setFace('idle');
    } else {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.setFace('blink', 0.12);
        this.blinkTimer = 2 + Math.random() * 3;
      }
    }
  }
}
