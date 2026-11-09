import * as THREE from 'three';
import { mat, polar, canvasTexture, fitText, damp } from './util.js';
import { STATION_R, stationAngle } from './world.js';

export const PAD_R = 3;

// ---------- Iconos flotantes de cada proyecto ----------
function bar(a, b, r, material) {
  const d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

const icons = {
  ball() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe8403f));
    const bottom = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      mat(0xf5f5f5)
    );
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.16, 20), mat(0x1d1b2a));
    const btnOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 16), mat(0x1d1b2a));
    btnOuter.rotation.x = Math.PI / 2;
    btnOuter.position.z = 1.06;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), mat(0xffffff));
    btn.rotation.x = Math.PI / 2;
    btn.position.z = 1.15;
    g.add(top, bottom, band, btnOuter, btn);
    return g;
  },
  db() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.5, 12), mat(0x00add8));
      disk.position.y = (i - 1) * 0.62;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.08, 12), mat(0x7fe3ff));
      rim.position.y = disk.position.y + 0.26;
      g.add(disk, rim);
    }
    return g;
  },
  play() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.5), mat(0xff2e2e));
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, -0.42);
    shape.lineTo(0.45, 0);
    shape.lineTo(-0.3, 0.42);
    shape.closePath();
    const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }), mat(0xffffff));
    tri.position.z = 0.24;
    const back = tri.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.24;
    g.add(body, tri, back);
    return g;
  },
  bag() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.8), mat(0xffa62b));
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.82), mat(0xfff1d0));
    stripe.position.y = 0.35;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 16, Math.PI), mat(0x7a4a2a));
    handle.position.y = 0.8;
    g.add(body, stripe, handle);
    g.position.y = -0.2;
    return g;
  },
  gear() {
    const teeth = 10;
    const shape = new THREE.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const a = (i / (teeth * 4)) * Math.PI * 2;
      const r = i % 4 < 2 ? 1.2 : 0.92;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.38, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false, curveSegments: 10 });
    geo.center();
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat(0xd24939)));
    return g;
  },
  network() {
    const g = new THREE.Group();
    const pts = [
      new THREE.Vector3(0, 0.95, 0),
      new THREE.Vector3(-1.0, -0.5, 0.3),
      new THREE.Vector3(1.0, -0.45, 0.2),
      new THREE.Vector3(0.1, -0.2, -0.9),
    ];
    const nodeColors = [0x2ec4b6, 0xff9f1c, 0xe71d36, 0xfdfffc];
    pts.forEach((p, i) => {
      const n = new THREE.Mesh(new THREE.IcosahedronGeometry(i === 0 ? 0.42 : 0.32, 0), mat(nodeColors[i]));
      n.position.copy(p);
      g.add(n);
    });
    const link = mat(0x1d1b2a);
    [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3]].forEach(([a, b]) => g.add(bar(pts[a], pts[b], 0.06, link)));
    return g;
  },
};

// ---------- Estaciones ----------
function signTexture(title) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1b2a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, title, w - 40, 64, '"Pixelify Sans", monospace');
    ctx.fillText(title, w / 2, h / 2 + 4);
  });
}

function makePad(color, radius = PAD_R) {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.3, 0.3, 8), mat(0xb9b2a5));
  pad.position.y = 0.15;
  pad.receiveShadow = true;
  const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, flatShading: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.4, 0.13, 6, 8), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = Math.PI / 8;
  ring.position.y = 0.32;
  group.add(pad, ring);
  return { group, ringMat };
}

export function buildStations(scene, projects, colliders, aboutPos) {
  const stations = projects.map((project, index) => {
    const angle = stationAngle(index, projects.length);
    const [x, z] = polar(angle, STATION_R);
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const { group: padGroup, ringMat } = makePad(project.color);
    group.add(padGroup);

    const icon = icons[project.icon]();
    icon.position.y = 3.4;
    icon.traverse((o) => (o.castShadow = true));
    group.add(icon);

    const beamMat = new THREE.MeshBasicMaterial({
      color: project.color,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 40, 8, 1, true), beamMat);
    beam.position.y = 20;
    group.add(beam);

    // Cartel con el nombre, detrás del pedestal
    const wood = mat(0x8b5a34);
    const sign = new THREE.Group();
    sign.position.set(0, 0, -4.3);
    for (const sx of [-2.1, 2.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2, 0.25), mat(0x6b4226));
      post.position.set(sx, 1, 0);
      post.castShadow = true;
      sign.add(post);
      colliders.push({ x: x + sx, z: z - 4.3, r: 0.35 });
    }
    for (let bx = -1.5; bx <= 1.51; bx += 0.75) colliders.push({ x: x + bx, z: z - 4.3, r: 0.4 });
    const labelMat = new THREE.MeshStandardMaterial({ map: signTexture(project.name), roughness: 0.9 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.15, 0.18), [wood, wood, wood, wood, labelMat, wood]);
    board.position.y = 1.65;
    board.castShadow = true;
    sign.add(board);
    group.add(sign);

    scene.add(group);
    return { project, index, angle, x, z, group, icon, beam, ringMat, radius: PAD_R, glow: 0.25 };
  });

  // Pedestal "Sobre mí", delante del cartel de bienvenida
  const { group: aboutGroup, ringMat: aboutRing } = makePad(0xff7a3d, 2.2);
  aboutGroup.position.set(aboutPos[0], 0, aboutPos[1]);
  scene.add(aboutGroup);
  const about = { x: aboutPos[0], z: aboutPos[1], radius: 2.2, ringMat: aboutRing, glow: 0.4 };

  return {
    stations,
    about,
    update(t, dt, activeId, discovered) {
      for (const s of stations) {
        s.icon.rotation.y = t * 0.8 + s.index;
        s.icon.position.y = 3.4 + Math.sin(t * 1.6 + s.index) * 0.25;
        const isDiscovered = discovered.has(s.project.id);
        const target = activeId === s.project.id ? 1.8 : isDiscovered ? 0.9 : 0.25;
        s.glow = damp(s.glow, target, 6, dt);
        s.ringMat.emissiveIntensity = s.glow;
        s.beam.material.opacity = damp(s.beam.material.opacity, isDiscovered ? 0 : 0.28, 3, dt);
        s.beam.visible = s.beam.material.opacity > 0.01;
      }
      about.glow = damp(about.glow, activeId === 'about' ? 1.8 : 0.4 + Math.sin(t * 3) * 0.2, 6, dt);
      aboutRing.emissiveIntensity = about.glow;
    },
  };
}
