import * as THREE from 'three';
import { mat, canvasTexture } from '../util.js';
import { box, buildPalm, buildCaveman } from '../caveman.js';
import { loadUgg, saveUgg, newUggState, chestCode, padlockCode, SYMBOLS, SYMBOL_NAMES, drawSymbol, UGG_CENTER, UGG_R, LAYOUT } from './state.js';
import { totemPlate } from './art.js';
import { createPC } from './win31.js';
import { createTTY } from './tty.js';

// La isla de Ugg: un escape room. Si te secuestra, no vuelves a casa (ni recargando) hasta escapar.
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const UGG_LINES = [
  'UGG FELIZ. ♥',
  '¿AMOR TENER HAMBRE? UGG CAZAR MAMUT.',
  'AMOR NUNCA IRSE, ¿VERDAD? ♥',
  'UGG CONTAR TUS PARPADEOS. 3.412.',
  'UGG NO DORMIR DESDE QUE AMOR LLEGAR. UGG VIGILAR.',
  'CAJA DE UGG NO CANTAR. UGG TRISTE. MAMÁ CANTAR BONITO.',
  'UGG ESCRIBIR CARTA PARA AMOR. EN CAJA. ♥',
  'SI AMOR IRSE, UGG BUSCAR. UGG SIEMPRE ENCONTRAR.',
];

export function createUggIsland({ scene, colliders, player, bursts, sfx, hud, secrets, input, onEscaped }) {
  const U = new THREE.Vector3(UGG_CENTER.x, 0, UGG_CENTER.z);
  const W = (p) => ({ x: U.x + p.x, z: U.z + p.z }); // local -> mundo
  let state = loadUgg();
  // El ordenador trabaja sobre este "puntero" al estado actual (cambia al ser secuestrado de nuevo)
  const stateRef = new Proxy({}, { get: (_, k) => state?.[k], set: (_, k, v) => ((state[k] = v), true) });
  const save = () => saveUgg(state);

  const group = new THREE.Group();
  group.position.copy(U);
  scene.add(group);
  const own = []; // colisiones propias (Ugg las esquiva)
  const addCollider = (p, r) => {
    const w = W(p);
    const c = { x: w.x, z: w.z, r };
    colliders.push(c);
    own.push(c);
    return c;
  };

  // ---------- Terreno ----------
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(UGG_R + 0.6, UGG_R + 2, 2, 40), mat(0xf0dca4));
  sand.position.y = -1;
  sand.receiveShadow = true;
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(UGG_R - 3.6, UGG_R - 3.2, 0.1, 40), mat(0x6cc24a));
  grass.position.y = 0;
  grass.receiveShadow = true;
  group.add(sand, grass);

  // ---------- Cabaña sin techo (Ugg aún no ha inventado el techo) ----------
  const stone = mat(0xa7a59f);
  const stoneDark = mat(0x8b8f94);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(LAYOUT.hut.r - 0.2, LAYOUT.hut.r - 0.2, 0.06, 28), mat(0x9c6b3c));
  floor.position.set(LAYOUT.hut.x, 0.04, LAYOUT.hut.z);
  floor.receiveShadow = true;
  group.add(floor);
  const SEG = 26;
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5) continue; // puerta al sur
    const p = { x: LAYOUT.hut.x + Math.sin(a) * LAYOUT.hut.r, z: LAYOUT.hut.z + Math.cos(a) * LAYOUT.hut.r };
    const b = box(1.08, 1.1 + (i % 3) * 0.12, 0.6, i % 2 ? stone : stoneDark, p.x, 0.55, p.z);
    b.rotation.y = a;
    b.receiveShadow = true;
    group.add(b);
    addCollider(p, 0.55);
  }
  // Pintura en la pared: UGG ♥ TÚ
  const paintTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#8b1e3f';
    ctx.font = '700 46px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UGG', 60, 80);
    ctx.fillText('TÚ', 200, 80);
    drawSymbol(ctx, 'corazon', 128, 64, 70, '#e8405f');
  });
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: paintTex, transparent: true }));
  paint.position.set(-2.1, 1.25, LAYOUT.hut.z - LAYOUT.hut.r + 0.62);
  paint.rotation.y = 0.45;
  group.add(paint);

  // Mesa de piedra con el ordenador
  const pc = LAYOUT.pc;
  group.add(box(2.4, 0.85, 1.2, stone, pc.x, 0.43, pc.z));
  addCollider(pc, 1.15);
  const beige = mat(0xe8dcc0);
  group.add(box(1.2, 0.28, 0.85, beige, pc.x, 1, pc.z - 0.05));
  group.add(box(1, 0.8, 0.85, beige, pc.x, 1.55, pc.z - 0.1));
  group.add(box(0.95, 0.07, 0.32, mat(0xd3ccbe), pc.x, 0.9, pc.z + 0.42));
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0d2b1c });
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.58), screenMat);
  pcScreen.position.set(pc.x, 1.57, pc.z + 0.33);
  group.add(pcScreen);
  // Nota en la pared, junto al ordenador
  const noteTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3b3646';
    ctx.font = '700 22px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UGG', 64, 40);
    ctx.fillText('APRENDER', 64, 70);
    ctx.fillText('!!!', 64, 100);
  });
  const notePos = { x: pc.x + 1.9, z: pc.z - 0.1 };
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: noteTex }));
  note.position.set(notePos.x, 1.35, notePos.z - 0.2);
  note.rotation.y = -0.3;
  group.add(note);

  // Cofre con cerradura de símbolos
  const wood = mat(0x7a4a2a);
  const metal = mat(0xc9ced6, { metalness: 0.5, roughness: 0.4 });
  const chest = new THREE.Group();
  chest.position.set(LAYOUT.chest.x, 0, LAYOUT.chest.z);
  chest.rotation.y = -0.6;
  chest.add(box(1.1, 0.6, 0.7, wood, 0, 0.3, 0), box(1.14, 0.08, 0.74, metal, 0, 0.45, 0), box(0.3, 0.25, 0.05, metal, 0, 0.42, 0.37));
  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.35);
  lid.add(box(1.12, 0.22, 0.72, wood, 0, 0.11, 0.35));
  chest.add(lid);
  group.add(chest);
  addCollider(LAYOUT.chest, 0.7);

  // Cama de hojas con cojín de corazón
  const leaf = mat(0x3f9b3a);
  group.add(box(1.4, 0.22, 2.2, leaf, LAYOUT.bed.x, 0.12, LAYOUT.bed.z));
  const pillow = box(0.7, 0.2, 0.5, mat(0xff6b9a), LAYOUT.bed.x, 0.32, LAYOUT.bed.z - 0.7);
  group.add(pillow);
  addCollider(LAYOUT.bed, 0.95);

  // Hoguera
  const fire = new THREE.Group();
  fire.position.set(LAYOUT.fire.x, 0, LAYOUT.fire.z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    fire.add(box(0.36, 0.25, 0.36, stoneDark, Math.sin(a) * 0.85, 0.12, Math.cos(a) * 0.85));
  }
  for (let i = 0; i < 3; i++) {
    const log = box(1.3, 0.2, 0.2, mat(0x6b4226), 0, 0.15, 0);
    log.rotation.y = (i / 3) * Math.PI;
    fire.add(log);
  }
  const flames = [0xff8a3d, 0xffd23f, 0xff3b3b].map((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.4 - i * 0.1, 1 - i * 0.2, 6), new THREE.MeshBasicMaterial({ color: c }));
    f.position.y = 0.55 - i * 0.05;
    fire.add(f);
    return f;
  });
  group.add(fire);
  addCollider(LAYOUT.fire, 0.95);

  // Servidor UGGNIX central (un armario con lucecitas)
  const srv = LAYOUT.server;
  const leds = [];
  {
    const g = new THREE.Group();
    g.position.set(srv.x, 0, srv.z);
    g.add(box(1.4, 2.5, 1, mat(0x3b3646), 0, 1.25, 0), box(1.46, 0.1, 1.06, mat(0x23252b), 0, 2.52, 0));
    for (let r = 0; r < 6; r++) {
      g.add(box(1.2, 0.04, 0.02, mat(0x23252b), 0, 0.5 + r * 0.32, 0.51));
      for (let c = 0; c < 4; c++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x5dff8a }));
        led.position.set(-0.45 + c * 0.14, 0.62 + r * 0.32, 0.52);
        g.add(led);
        leds.push(led);
      }
    }
    const lbl = canvasTexture(128, 32, (ctx) => {
      ctx.fillStyle = '#e3ddd0';
      ctx.fillRect(0, 0, 128, 32);
      ctx.fillStyle = '#1d1b2a';
      ctx.font = '700 20px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('UGGSRV', 64, 23);
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: lbl }));
    plaque.position.set(0.2, 2.3, 0.51);
    g.add(plaque);
    g.traverse((o) => (o.castShadow = true));
    group.add(g);
    addCollider(srv, 0.9);
  }
  const cableMat = mat(0x23252b);
  const cable = (a, b) => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    // por debajo del suelo de la cabaña (0,07) y justo encima de la hierba (0,05)
    const c = box(0.07, 0.012, len, cableMat, (a.x + b.x) / 2, 0.058, (a.z + b.z) / 2);
    c.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    c.castShadow = false;
    group.add(c);
  };

  // Tótems: el símbolo queda tapado por una puerta hasta ganar el minijuego de su terminal
  const doors = [];
  const ttyScreens = [];
  const plateMats = LAYOUT.totems.map((t, ti) => {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    const body = mat(0x8b5a34);
    g.add(box(1.1, 2.8, 1, body, 0, 1.4, 0), box(1.5, 0.3, 1.1, mat(0x6b4226), 0, 2.85, 0), box(1.9, 0.25, 0.4, mat(0x6b4226), 0, 2.3, -0.1));
    for (const x of [-0.25, 0.25]) g.add(box(0.2, 0.14, 0.06, mat(0x2b1d14), x, 2.4, 0.5));
    g.add(box(0.5, 0.1, 0.06, mat(0x2b1d14), 0, 2.08, 0.5));
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), m);
    plate.position.set(0, 1.2, 0.51);
    g.add(plate);
    // Puerta de madera con bisagra a la izquierda
    const door = new THREE.Group();
    door.position.set(-0.5, 1.2, 0.56);
    door.add(box(1, 1, 0.08, mat(0x6b4226), 0.5, 0, 0), box(0.12, 0.12, 0.05, mat(0xc9ced6, { metalness: 0.5 }), 0.85, 0, 0.05));
    g.add(door);
    doors.push(door);
    // Terminal tonto delante del tótem
    const term = new THREE.Group();
    term.position.set(1.35, 0, 0.75);
    term.rotation.y = -0.35;
    term.add(box(0.7, 0.8, 0.6, stone, 0, 0.4, 0), box(0.72, 0.6, 0.6, mat(0x3b3646), 0, 1.1, 0), box(0.62, 0.05, 0.25, mat(0x23252b), 0, 0.83, 0.38));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), new THREE.MeshBasicMaterial({ color: 0x3a2200 }));
    scr.position.set(0, 1.12, 0.31);
    term.add(scr);
    ttyScreens.push(scr);
    g.add(term);
    g.traverse((o) => (o.castShadow = true));
    group.add(g);
    addCollider(t, 0.75);
    addCollider({ x: t.x + 1.35, z: t.z + 0.75 }, 0.45);
    cable({ x: t.x + 1.35, z: t.z + 0.75 }, srv);
    return m;
  });

  // Palmeras (algunas con corazones tallados)
  const heartTex = canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    drawSymbol(ctx, 'corazon', 32, 32, 50, '#5a2a14');
  });
  const avoid = [LAYOUT.raft, LAYOUT.post, LAYOUT.hut, LAYOUT.fire, ...LAYOUT.totems];
  for (let i = 0, n = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.15;
    const r = 15.5 + (i % 3) * 0.9;
    const p = { x: Math.sin(a) * r, z: Math.cos(a) * r };
    if (avoid.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 5)) continue;
    const palm = buildPalm();
    palm.position.set(p.x, 0, p.z);
    palm.rotation.y = a;
    palm.traverse((o) => (o.castShadow = true));
    group.add(palm);
    addCollider(p, 0.45);
    if (n++ % 2 === 0) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: heartTex, transparent: true }));
      h.position.set(p.x, 1.4, p.z + 0.23);
      group.add(h);
    }
  }

  // Balsa encadenada a un poste
  const raft = new THREE.Group();
  raft.position.set(LAYOUT.raft.x, -0.3, LAYOUT.raft.z);
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3, 8), mat(i % 2 ? 0x8b5a34 : 0x9c6b3c));
    log.rotation.x = Math.PI / 2;
    log.position.set(-1.1 + i * 0.44, 0.25, 0);
    log.castShadow = true;
    raft.add(log);
  }
  // mástil al norte de la balsa, para que la vela no tape al jugador desde la cámara
  raft.add(box(0.12, 2.4, 0.12, wood, 0, 1.4, -1));
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xfff8e7, side: THREE.DoubleSide }));
  sail.position.set(0, 1.7, -0.94);
  raft.add(sail);
  group.add(raft);
  addCollider(LAYOUT.raft, 1.5);
  const postW = LAYOUT.post;
  group.add(box(0.3, 1.2, 0.3, wood, postW.x, 0.6, postW.z));
  addCollider(postW, 0.35);
  const chain = new THREE.Group();
  const linkMat = mat(0x8b8f94, { metalness: 0.6, roughness: 0.4 });
  const dz = LAYOUT.raft.z + 1.4 - postW.z;
  for (let i = 0; i < 6; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8), linkMat);
    link.position.set(postW.x, 0.75 - i * 0.07, postW.z + (dz * i) / 5);
    link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    chain.add(link);
  }
  chain.add(box(0.22, 0.26, 0.12, mat(0xffd23f, { metalness: 0.5 }), postW.x, 0.6, postW.z + 0.2));
  group.add(chain);

  // ---------- Ugg ----------
  const ugg = buildCaveman();
  ugg.setLove(true);
  ugg.group.visible = true;
  group.add(ugg.group);
  const uggPos = new THREE.Vector3(LAYOUT.start.x + 1.6, 0, LAYOUT.start.z + 1.5);
  const uggCol = { x: 0, z: 0, r: 0.6 };
  colliders.push(uggCol);
  const zzzTex = canvasTexture(128, 64, (ctx) => {
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d1b2a';
    ctx.lineWidth = 6;
    ctx.font = '700 40px "Pixelify Sans", monospace';
    ctx.strokeText('Z z z', 8, 46);
    ctx.fillText('Z z z', 8, 46);
  });
  const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex, transparent: true }));
  zzz.scale.set(1.6, 0.8, 1);
  zzz.visible = false;
  group.add(zzz);

  // ---------- Interfaz ----------
  const hudEl = document.createElement('div');
  hudEl.className = 'ugg-hud';
  const prompt = document.createElement('div');
  prompt.className = 'ugg-prompt';
  const actBtn = document.createElement('button');
  actBtn.type = 'button';
  actBtn.className = 'ugg-act';
  actBtn.setAttribute('aria-label', 'Interactuar');
  actBtn.textContent = '✋';
  const fade = document.createElement('div');
  fade.className = 'sea-fade';
  const modal = document.createElement('div');
  modal.className = 'ugg-modal';
  modal.hidden = true;
  document.body.append(hudEl, prompt, actBtn, fade, modal);
  actBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    interact();
  });

  let active = false;
  let locked = false; // escenas: el jugador no controla nada
  let current = null; // interacción disponible
  let escapeT = -1;
  let heartT = 0;
  let sleptAtPC = false;
  const raftStart = raft.position.clone();

  const setInput = (on) => {
    input.setEnabled(on);
    if (on) document.querySelector('#scene')?.focus();
  };

  const pcApi = createPC({
    state: stateRef,
    save,
    secrets,
    onLullaby() {
      if (state.asleep) return;
      state.asleep = true;
      save();
      sleptAtPC = true;
      drawHud();
      secrets.unlock('ugg_nana');
    },
    onLeave() {
      setInput(true);
      if (sleptAtPC) {
        sleptAtPC = false;
        hud.toast('Fuera, Ugg bosteza… y se queda dormido junto a la hoguera. <strong>Zzz</strong>', 4000);
      }
    },
  });

  const tty = createTTY({
    getState: () => state,
    onLogin: () => secrets.unlock('ugg_login'),
    onClose: () => setInput(true),
    onSolved(i) {
      state.solved[i] = true;
      save();
      refreshProps();
      sfx.chain();
      const t = LAYOUT.totems[i];
      bursts.spawn(new THREE.Vector3(U.x + t.x, 1.4, U.z + t.z + 0.6), [0xffd23f, 0xffffff, 0x8b5a34], 30, { speed: 4, up: 4 });
      hud.toast(`<strong>La puerta del tótem se abre:</strong> tiene ${esc(SYMBOL_NAMES[state.totems[i]])} tallado.`, 4000);
      if (state.solved.every(Boolean)) secrets.unlock('ugg_arcade');
    },
  });

  function drawHud() {
    if (!state) return;
    const items = [];
    if (state.paddle) items.push('🛶 Remo');
    if (state.floppy && !state.inserted) items.push('💾 Disquete');
    hudEl.innerHTML = `<span class="ugg-hud-title">Isla de Ugg ♥</span><span>${items.length ? items.join(' · ') : 'Bolsillos vacíos'}</span><span class="ugg-hud-ugg">${state.asleep ? 'Ugg duerme' : 'Ugg te vigila'}</span>`;
  }

  function place(p) {
    const w = W(p);
    player.pos.set(w.x, 0, w.z);
    player.vel.set(0, 0, 0);
    player.vy = 0;
    player.root.position.copy(player.pos);
  }
  function placeUgg() {
    if (state?.asleep) uggPos.set(LAYOUT.sleep.x, 0, LAYOUT.sleep.z);
    else {
      const w = { x: player.pos.x - U.x, z: player.pos.z - U.z };
      uggPos.set(w.x + 1.8, 0, w.z + 1.2);
    }
  }

  function refreshProps() {
    state.totems.forEach((sym, i) => {
      plateMats[i].map?.dispose();
      const tex = new THREE.CanvasTexture(totemPlate(sym));
      tex.colorSpace = THREE.SRGBColorSpace;
      plateMats[i].map = tex;
      plateMats[i].needsUpdate = true;
    });
    lid.rotation.x = state.chest ? -1.9 : 0;
    doors.forEach((d, i) => (d.rotation.y = state.solved[i] ? -1.9 : 0));
    chain.visible = true;
    raft.position.copy(raftStart);
    drawHud();
  }

  // ---------- Entrar / salir ----------
  function enter(fresh) {
    if (!state) return;
    active = true;
    document.body.classList.add('captive');
    refreshProps();
    place(LAYOUT.start);
    player.facing = Math.PI; // mirando al ordenador
    placeUgg();
    if (!fresh) hud.toast('Sigues en la <strong>isla de Ugg</strong>… Él te ha echado de menos. ♥', 3500);
  }
  function capture() {
    state = newUggState();
    tty.reset();
    save();
    enter(true);
    secrets.unlock('ugg_amor');
    hud.toast('Despiertas en una cabaña. Ugg te mira sin parpadear. <strong>«AMOR YA EN CASA ♥»</strong>', 4500);
  }

  function catchPlayer(reason) {
    if (locked) return;
    locked = true;
    clearPrompt();
    fade.classList.add('show');
    sfx.uga();
    setTimeout(() => {
      place(LAYOUT.start);
      player.facing = Math.PI;
      placeUgg();
      fade.classList.remove('show');
      locked = false;
      const lines = {
        sea: '«¿AMOR NADAR? AMOR NO NADAR LEJOS DE UGG.» ♥',
        raft: '«¿AMOR QUERER BALSA? BALSA PELIGROSA. AMOR QUEDARSE CON UGG.» ♥',
      };
      hud.toast(`Ugg te trae de vuelta en brazos. <strong>${lines[reason]}</strong>`, 4000);
      if (reason === 'sea') secrets.unlock('ugg_nadar');
    }, 800);
  }

  // ---------- Cerraduras (fuera del ordenador) ----------
  function openModal(html, setup) {
    modal.innerHTML = `<div class="ugg-card">${html}</div>`;
    modal.hidden = false;
    setInput(false);
    const card = modal.querySelector('.ugg-card');
    const closeModal = () => {
      modal.hidden = true;
      setInput(true);
    };
    modal.querySelector('[data-cancel]')?.addEventListener('click', closeModal);
    setup(card, closeModal);
  }
  function wheelUI(card, count, values, render) {
    const wheels = card.querySelector('.ugg-wheels');
    const idx = new Array(count).fill(0);
    for (let i = 0; i < count; i++) {
      const w = document.createElement('div');
      w.className = 'ugg-wheel';
      w.innerHTML = '<button type="button" aria-label="Subir">▲</button><div class="ugg-face"></div><button type="button" aria-label="Bajar">▼</button>';
      const face = w.querySelector('.ugg-face');
      const show = () => render(face, values[idx[i]]);
      w.querySelectorAll('button').forEach((b, k) =>
        b.addEventListener('click', () => {
          idx[i] = (idx[i] + (k === 0 ? values.length - 1 : 1)) % values.length;
          sfx.enter();
          show();
        })
      );
      show();
      wheels.append(w);
    }
    return () => idx.map((i) => values[i]);
  }
  const shakeCard = (card) => {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    sfx.denied();
  };

  function chestLock() {
    openModal(
      `<p class="ugg-kicker">Cofre de Ugg</p><h3>Una cerradura con cuatro ruedas talladas</h3><div class="ugg-wheels"></div><div class="ugg-actions"><button type="button" class="btn" data-try>Girar la llave</button><button type="button" class="btn btn-ghost" data-cancel>Dejarlo</button></div>`,
      (card, closeModal) => {
        const get = wheelUI(card, 4, SYMBOLS, (face, sym) => {
          face.innerHTML = '';
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          drawSymbol(c.getContext('2d'), sym, 32, 32, 52, '#3b2414');
          face.append(c);
        });
        card.querySelector('[data-try]').addEventListener('click', () => {
          const ok = get().every((s, i) => s === chestCode(state)[i]);
          if (!ok) return shakeCard(card);
          closeModal();
          state.chest = state.paddle = state.floppy = true;
          save();
          refreshProps();
          sfx.chain();
          bursts.spawn(new THREE.Vector3(U.x + LAYOUT.chest.x, 1, U.z + LAYOUT.chest.z), [0xffd23f, 0xffffff, 0x8b5a34], 30, { speed: 4, up: 5 });
          hud.toast('<strong>¡El cofre se abre!</strong> Dentro hay un REMO y un DISQUETE.', 3500);
          secrets.unlock('ugg_cofre');
        });
      }
    );
  }

  function padlock() {
    openModal(
      `<p class="ugg-kicker">Balsa de Ugg</p><h3>Un candado con cuatro ruedas de números</h3><div class="ugg-wheels"></div><div class="ugg-actions"><button type="button" class="btn" data-try>Tirar del candado</button><button type="button" class="btn btn-ghost" data-cancel>Dejarlo</button></div>`,
      (card, closeModal) => {
        const get = wheelUI(card, 4, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], (face, n) => (face.textContent = n));
        card.querySelector('[data-try]').addEventListener('click', () => {
          if (get().join('') !== padlockCode(state)) return shakeCard(card);
          closeModal();
          startEscape();
        });
      }
    );
  }

  // ---------- Interacciones ----------
  const spots = [
    { id: 'pc', p: { x: pc.x, z: pc.z + 1.3 }, r: 1.6, label: 'Usar el ordenador' },
    { id: 'note', p: notePos, r: 1.1, label: 'Leer la nota de la pared' },
    { id: 'chest', p: LAYOUT.chest, r: 1.9, label: 'Abrir el cofre' },
    { id: 'bed', p: LAYOUT.bed, r: 1.8, label: 'Mirar la cama' },
    { id: 'fire', p: LAYOUT.fire, r: 2.1, label: 'Calentarte en la hoguera' },
    ...LAYOUT.totems.map((t, i) => ({ id: `totem${i}`, p: { x: t.x + 0.7, z: t.z + 1.3 }, r: 1.9, label: () => (state.solved[i] ? 'Mirar el tótem' : 'Usar el terminal del tótem') })),
    { id: 'server', p: { x: srv.x, z: srv.z + 1.3 }, r: 1.8, label: 'Usar el servidor UGGNIX' },
    { id: 'raft', p: { x: postW.x, z: postW.z - 0.8 }, r: 2.4, label: 'Subir a la balsa' },
    { id: 'ugg', p: null, r: 2.2, label: 'Hablar con Ugg' },
  ];
  let uggLine = 0;
  function interact() {
    if (!active || locked || !current || pcApi.isOpen || tty.isOpen || !modal.hidden) return;
    const id = current.id;
    if (id === 'pc') {
      setInput(false);
      if (state.floppy && !state.inserted) {
        pcApi.insertFloppy();
        drawHud();
        hud.toast('Metes el disquete en la unidad A:', 2500);
      }
      pcApi.open();
      return;
    }
    if (id === 'note') return hud.toast('Una nota con letra de Ugg: <strong>«UGG APRENDER: CAJA DECIR C:\\&gt; Y UGG ESCRIBIR WIN. CAJA ENSEÑAR VENTANAS.»</strong>', 6000);
    if (id === 'chest') return state.chest ? hud.toast('El cofre está vacío.') : chestLock();
    if (id === 'bed') return hud.toast('Una cama de hojas con un cojín en forma de corazón. Huele a Ugg. Mejor no.', 3500);
    if (id === 'fire') return hud.toast(state.asleep ? 'El fuego crepita. Ugg ronca a su lado.' : 'El fuego crepita. Ugg te mira desde el otro lado, sin parpadear. ♥', 3500);
    if (id.startsWith('totem')) {
      const i = Number(id.slice(5));
      if (state.solved[i]) return hud.toast(`Un tótem con ${esc(SYMBOL_NAMES[state.totems[i]])} tallado.`, 3000);
      setInput(false);
      return tty.open(i);
    }
    if (id === 'server') {
      setInput(false);
      return tty.open('console');
    }
    if (id === 'ugg') {
      if (state.asleep) return hud.toast('Ugg duerme. Murmura: <strong>«…amor… no irse…»</strong>', 3500);
      sfx.uga();
      return hud.toast(`<strong>Ugg:</strong> «${esc(UGG_LINES[uggLine++ % UGG_LINES.length])}»`, 3500);
    }
    if (id === 'raft') {
      if (!state.paddle) return hud.toast('La balsa está atada al poste con una cadena y un candado de cuatro números. Y sin remo no llegarías lejos.', 5000);
      if (!state.asleep) return catchPlayer('raft');
      return padlock();
    }
  }

  // ---------- Huida ----------
  function clearPrompt() {
    current = null;
    prompt.classList.remove('show');
    document.body.classList.remove('ugg-can-act');
  }
  function startEscape() {
    locked = true;
    clearPrompt();
    escapeT = 0;
    chain.visible = false;
    sfx.chain();
    hud.toast('<strong>¡El candado se abre!</strong> Empujas la balsa al agua y empiezas a remar…', 3500);
    const w = W({ x: LAYOUT.raft.x, z: LAYOUT.raft.z });
    player.pos.set(w.x, 0.5, w.z);
  }
  function updateEscape(dt) {
    escapeT += dt;
    const T = escapeT;
    const startZ = U.z + LAYOUT.raft.z;
    const endZ = 40;
    const k = Math.min(1, T / 7.2);
    const ease = k * k * (3 - 2 * k);
    raft.position.set(LAYOUT.raft.x, -0.3 + Math.sin(T * 3) * 0.05, startZ - U.z + (endZ - startZ) * ease - 0.0);
    player.pos.set(U.x + raft.position.x, 0.45 + Math.sin(T * 3) * 0.05, U.z + raft.position.z);
    player.vel.set(0, 0, 0);
    player.vy = 0;
    player.facing = Math.PI;
    player.root.position.copy(player.pos);
    if (T > 1.8 && state.asleep) {
      // Ugg se despierta y corre a la orilla
      state.asleep = false;
      hud.toast('<strong>UGG:</strong> «¿¿AMOR?? ¡¡AMOOOOOOR!!» 😭', 3500);
      sfx.uga();
    }
    if (T > 1.8) {
      const shore = { x: LAYOUT.raft.x, z: -UGG_R + 1.2 };
      uggPos.x += (shore.x - uggPos.x) * Math.min(1, dt * 1.5);
      uggPos.z += (shore.z - uggPos.z) * Math.min(1, dt * 1.5);
      heartT -= dt;
      if (heartT <= 0) {
        heartT = 0.3;
        bursts.spawn(new THREE.Vector3(U.x + uggPos.x, 2.1, U.z + uggPos.z), [0x6ec6ff, 0xbfe9ff], 6, { speed: 2, up: 2 }); // lágrimas
      }
    }
    if (T > 6.4) fade.classList.add('show');
    if (T >= 7.2) {
      escapeT = -1;
      active = false;
      locked = false;
      state = null;
      saveUgg(null);
      document.body.classList.remove('captive');
      document.body.classList.remove('ugg-can-act');
      raft.position.copy(raftStart);
      chain.visible = true;
      player.pos.set(0, 0, 37);
      player.root.position.copy(player.pos);
      setTimeout(() => fade.classList.remove('show'), 300);
      secrets.unlock('ugg_escape');
      hud.toast('<strong>¡Has escapado de la isla de Ugg!</strong> Ojalá no te siga…', 4500);
      onEscaped();
    }
  }

  // ---------- Bucle ----------
  const tmp = new THREE.Vector3();
  function updateUgg(dt, t) {
    if (state?.asleep && escapeT < 0) {
      uggPos.set(LAYOUT.sleep.x, 0, LAYOUT.sleep.z);
      ugg.group.position.set(uggPos.x, 0.35, uggPos.z);
      ugg.group.rotation.set(0, 0.6, Math.PI / 2);
      ugg.legs.forEach((l) => (l.rotation.x = 0));
      ugg.arms.forEach((a) => (a.rotation.x = 0));
      zzz.visible = true;
      zzz.position.set(uggPos.x + 0.6, 1.6 + Math.sin(t * 2) * 0.15, uggPos.z);
      return;
    }
    zzz.visible = false;
    ugg.group.rotation.set(0, ugg.group.rotation.y, 0);
    if (active && escapeT < 0) {
      // Ugg te sigue a todas partes, a unos pasos
      const px = player.pos.x - U.x, pz = player.pos.z - U.z;
      const dx = px - uggPos.x, dz = pz - uggPos.z;
      const d = Math.hypot(dx, dz);
      let moving = false;
      if (d > 3) {
        const sp = Math.min(5.5, (d - 2.6) * 2.5) * dt;
        uggPos.x += (dx / d) * sp;
        uggPos.z += (dz / d) * sp;
        moving = true;
      }
      // Esquivar paredes y muebles
      for (const c of own) {
        const ox = uggPos.x - (c.x - U.x), oz = uggPos.z - (c.z - U.z);
        const od = Math.hypot(ox, oz);
        const min = c.r + 0.6;
        if (od < min && od > 1e-4) {
          uggPos.x += (ox / od) * (min - od);
          uggPos.z += (oz / od) * (min - od);
        }
      }
      ugg.group.rotation.y = Math.atan2(dx, dz);
      const s = moving ? Math.sin(t * 10) * 0.6 : 0;
      ugg.legs[0].rotation.x = s;
      ugg.legs[1].rotation.x = -s;
      ugg.arms[0].rotation.x = -s * 0.6;
      ugg.group.position.set(uggPos.x, moving ? Math.abs(Math.sin(t * 10)) * 0.08 : 0, uggPos.z);
      heartT -= dt;
      if (heartT <= 0) {
        heartT = 1.4;
        bursts.spawn(new THREE.Vector3(U.x + uggPos.x, 2.9, U.z + uggPos.z), [0xff4d8d, 0xff8ab5], 4, { speed: 1.5, up: 2.5, gravity: -1 });
      }
    } else {
      ugg.group.position.set(uggPos.x, 0, uggPos.z);
    }
    uggCol.x = U.x + uggPos.x;
    uggCol.z = U.z + uggPos.z;
  }

  return {
    get active() {
      return active;
    },
    // escenas, ordenador o cerraduras abiertas: sin control del personaje
    get locked() {
      return active && (locked || pcApi.isOpen || tty.isOpen || !modal.hidden);
    },
    get pcOpen() {
      return pcApi.isOpen;
    },
    hasSaved: () => !!state,
    enter,
    capture,
    interact,
    update(dt, t) {
      // la hoguera y la pantalla del ordenador siempre se animan
      flames.forEach((f, i) => f.scale.set(1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 13 + i * 2) * 0.2, 1));
      screenMat.color.setHex(Math.floor(t * 2) % 2 ? 0x0d2b1c : 0x0f3a24);
      leds.forEach((l, i) => (l.visible = Math.sin(t * (3 + (i % 5)) + i * 1.7) > -0.2));
      ttyScreens.forEach((s, i) => s.material.color.setHex(state?.solved?.[i] ? 0x6b4400 : Math.floor(t * 3 + i) % 2 ? 0x3a2200 : 0x4a2c00));
      updateUgg(dt, t);
      if (!active) return;
      if (escapeT >= 0) return updateEscape(dt);
      if (locked) return;
      // ¿Intentas escapar nadando?
      const lx = player.pos.x - U.x, lz = player.pos.z - U.z;
      if (Math.hypot(lx, lz) > UGG_R - 0.6) return catchPlayer('sea');
      // Interacción más cercana
      let best = null;
      let bestD = Infinity;
      for (const s of spots) {
        const p = s.id === 'ugg' ? { x: uggPos.x, z: uggPos.z } : s.p;
        const d = Math.hypot(lx - p.x, lz - p.z);
        if (d < s.r && d < bestD) {
          best = s;
          bestD = d;
        }
      }
      if (best !== current) {
        current = best;
        prompt.innerHTML = best ? `<kbd>E</kbd> ${esc(typeof best.label === 'function' ? best.label() : best.label)}` : '';
        prompt.classList.toggle('show', !!best);
        document.body.classList.toggle('ugg-can-act', !!best);
      }
    },
  };
}
