// Arte pixelado de UGGDOWS 3.1: solo los 16 colores de la paleta VGA
import { drawSymbol, LAYOUT, UGG_R } from './state.js';

export const VGA = {
  black: '#000000', navy: '#000080', green: '#008000', teal: '#008080',
  maroon: '#800000', purple: '#800080', olive: '#808000', silver: '#c0c0c0',
  gray: '#808080', blue: '#0000ff', lime: '#00ff00', cyan: '#00ffff',
  red: '#ff0000', magenta: '#ff00ff', yellow: '#ffff00', white: '#ffffff',
};
const C = VGA;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// Rectángulo con borde negro de 1px
function frame(ctx, x, y, w, h, fill, line = C.black) {
  ctx.fillStyle = line;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}
const px = (ctx, color, ...rects) => {
  ctx.fillStyle = color;
  for (const [x, y, w = 1, h = 1] of rects) ctx.fillRect(x, y, w, h);
};
function heart(ctx, x, y, color = C.red) {
  px(ctx, color, [x + 1, y, 2, 1], [x + 4, y, 2, 1], [x, y + 1, 7, 2], [x + 1, y + 3, 5, 1], [x + 2, y + 4, 3, 1], [x + 3, y + 5, 1, 1]);
}

// ---------- Iconos de 32x32 ----------
const ICONS = {
  winfile(ctx) {
    frame(ctx, 6, 4, 20, 26, C.olive);
    for (const y of [7, 15, 23]) {
      frame(ctx, 8, y, 16, 6, C.yellow);
      px(ctx, C.black, [13, y + 2, 6, 2]);
    }
  },
  control(ctx) {
    frame(ctx, 3, 4, 26, 19, C.silver);
    frame(ctx, 6, 7, 16, 12, C.teal);
    px(ctx, C.white, [8, 9, 6, 1]);
    for (const y of [8, 12, 16]) px(ctx, C.black, [24, y, 3, 2]);
    frame(ctx, 9, 23, 14, 3, C.gray);
    frame(ctx, 5, 26, 22, 4, C.silver);
  },
  dos(ctx) {
    frame(ctx, 2, 5, 28, 22, C.silver);
    px(ctx, C.navy, [3, 6, 26, 3]);
    frame(ctx, 4, 10, 24, 15, C.black, C.gray);
    // "C:\>_"
    px(ctx, C.white, [6, 13, 3, 1], [6, 14, 1, 4], [6, 18, 3, 1], [11, 14, 1, 1], [11, 17, 1, 1], [13, 13, 1, 1], [14, 14, 1, 2], [15, 16, 1, 2], [17, 14, 1, 1], [18, 15, 1, 1], [17, 16, 1, 1], [21, 18, 4, 1]);
  },
  notepad(ctx) {
    frame(ctx, 7, 3, 19, 27, C.white);
    for (let y = 8; y < 28; y += 4) px(ctx, C.cyan, [9, y, 15, 1]);
    for (let x = 9; x < 25; x += 3) px(ctx, C.black, [x, 2, 1, 3]);
    px(ctx, C.red, [11, 6, 1, 22]);
  },
  paint(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.ellipse(16, 18, 14, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.olive;
    ctx.beginPath();
    ctx.ellipse(16, 18, 13, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, C.white, [18, 21, 4, 3]);
    for (const [x, y, c] of [[8, 16, C.red], [12, 12, C.yellow], [18, 11, C.lime], [23, 14, C.blue], [10, 21, C.magenta]]) px(ctx, c, [x, y, 3, 3]);
    px(ctx, C.maroon, [22, 2, 2, 12]);
    px(ctx, C.silver, [21, 13, 4, 2]);
    px(ctx, C.black, [22, 15, 2, 3]);
  },
  calc(ctx) {
    frame(ctx, 6, 2, 20, 28, C.silver);
    frame(ctx, 8, 4, 16, 6, C.white);
    px(ctx, C.black, [18, 6, 4, 2]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) frame(ctx, 8 + c * 4, 12 + r * 4, 4, 4, c === 3 ? C.red : C.gray);
  },
  clock(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      px(ctx, C.navy, [Math.round(16 + Math.cos(a) * 10), Math.round(16 + Math.sin(a) * 10), 1, 1]);
    }
    px(ctx, C.black, [15, 7, 2, 10], [16, 15, 7, 2]);
  },
  soundrec(ctx) {
    frame(ctx, 12, 2, 8, 16, C.gray);
    for (let y = 4; y < 16; y += 3) px(ctx, C.black, [13, y, 6, 1]);
    px(ctx, C.black, [15, 18, 2, 7], [9, 25, 14, 2]);
    px(ctx, C.black, [8, 10, 1, 7], [23, 10, 1, 7], [9, 17, 2, 1], [21, 17, 2, 1]);
  },
  piedra(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.moveTo(4, 24); ctx.lineTo(9, 9); ctx.lineTo(20, 5); ctx.lineTo(29, 14); ctx.lineTo(27, 27); ctx.lineTo(10, 29);
    ctx.fill();
    ctx.fillStyle = C.gray;
    ctx.beginPath();
    ctx.moveTo(6, 23); ctx.lineTo(10, 10); ctx.lineTo(20, 7); ctx.lineTo(27, 14); ctx.lineTo(26, 26); ctx.lineTo(11, 27);
    ctx.fill();
    px(ctx, C.silver, [12, 11, 5, 3], [10, 15, 2, 3]);
  },
  mamut(ctx) {
    frame(ctx, 6, 8, 20, 14, C.maroon);
    frame(ctx, 2, 10, 8, 10, C.maroon);
    px(ctx, C.white, [1, 18, 4, 2], [0, 15, 2, 3]);
    px(ctx, C.black, [5, 12, 2, 2]);
    for (const x of [8, 13, 18, 22]) frame(ctx, x, 21, 4, 8, C.maroon);
  },
  diary(ctx) {
    frame(ctx, 6, 3, 21, 27, C.maroon);
    px(ctx, C.white, [24, 4, 2, 25]);
    heart(ctx, 12, 11, C.magenta);
    px(ctx, C.yellow, [9, 22, 13, 2]);
  },
  photos(ctx) {
    frame(ctx, 3, 5, 26, 22, C.olive);
    frame(ctx, 6, 8, 20, 16, C.white);
    heart(ctx, 9, 11, C.red);
    heart(ctx, 17, 15, C.magenta);
  },
  uggexe(ctx) {
    // un garrote
    ctx.save();
    ctx.translate(16, 16);
    ctx.rotate(-0.7);
    px(ctx, C.black, [-2, -2, 5, 17]);
    px(ctx, C.maroon, [-1, -1, 3, 15]);
    px(ctx, C.black, [-5, -15, 11, 14]);
    px(ctx, C.olive, [-4, -14, 9, 12]);
    px(ctx, C.yellow, [-2, -12, 2, 3]);
    ctx.restore();
  },
  group(ctx) {
    frame(ctx, 3, 6, 26, 20, C.white);
    px(ctx, C.navy, [4, 7, 24, 3]);
    for (const [x, y] of [[6, 13], [13, 13], [20, 13], [6, 19], [13, 19]]) frame(ctx, x, y, 5, 4, C.teal);
  },
  // Iconos de diálogo
  stop(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, C.white, [6, 14, 20, 4]);
  },
  info(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, C.blue, [14, 7, 4, 4], [14, 13, 4, 12], [12, 13, 2, 2], [12, 23, 8, 2]);
  },
  warn(ctx) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.moveTo(16, 1); ctx.lineTo(31, 29); ctx.lineTo(1, 29);
    ctx.fill();
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(29, 28); ctx.lineTo(3, 28);
    ctx.fill();
    px(ctx, C.black, [15, 11, 3, 10], [15, 23, 3, 3]);
  },
  ugg(ctx) {
    frame(ctx, 8, 9, 16, 16, '#c0c0c0');
    px(ctx, C.olive, [8, 9, 16, 16]);
    px(ctx, C.black, [6, 5, 20, 7], [6, 5, 4, 14], [22, 5, 4, 14]);
    px(ctx, C.white, [11, 14, 3, 2], [18, 14, 3, 2]);
    px(ctx, C.red, [12, 14, 2, 2], [19, 14, 2, 2]);
    px(ctx, C.black, [10, 12, 12, 1], [9, 20, 14, 6]);
    heart(ctx, 23, 1, C.magenta);
  },
};

export function iconCanvas(id) {
  const [c, ctx] = canvas(32, 32);
  (ICONS[id] || ICONS.group)(ctx);
  c.className = 'w31-icon-img';
  return c;
}

// ---------- Iconos pequeños (16x16) del Administrador de archivos ----------
const SMALL = {
  dir(ctx) {
    frame(ctx, 1, 4, 14, 10, C.yellow);
    frame(ctx, 1, 2, 6, 4, C.yellow);
  },
  up(ctx) {
    frame(ctx, 1, 4, 14, 10, C.yellow);
    px(ctx, C.black, [7, 6, 2, 6], [5, 8, 6, 1], [6, 7, 4, 1]);
  },
  doc(ctx) {
    frame(ctx, 3, 1, 11, 14, C.white);
    for (let y = 4; y < 13; y += 2) px(ctx, C.black, [5, y, 7, 1]);
  },
  exe(ctx) {
    frame(ctx, 1, 3, 14, 11, C.white);
    px(ctx, C.navy, [2, 4, 12, 2]);
  },
  file(ctx) {
    frame(ctx, 3, 1, 11, 14, C.white);
  },
  driveA(ctx) {
    frame(ctx, 0, 4, 16, 9, C.silver);
    px(ctx, C.black, [3, 7, 10, 2]);
  },
  driveC(ctx) {
    frame(ctx, 0, 4, 16, 9, C.silver);
    px(ctx, C.lime, [12, 10, 2, 1]);
    px(ctx, C.gray, [2, 7, 8, 1]);
  },
};
export function smallIcon(id) {
  const [c, ctx] = canvas(16, 16);
  (SMALL[id] || SMALL.file)(ctx);
  c.className = 'w31-small-img';
  return c;
}

// ---------- Bitmaps (.BMP) ----------
const BMPS = {
  // Mapa de la isla con los tótems numerados según el orden del cofre
  mapa(ctx, w, h, st) {
    ctx.fillStyle = C.blue;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.navy;
    for (let y = 6; y < h; y += 14) for (let x = (y % 28) / 2; x < w; x += 22) ctx.fillRect(x, y, 6, 1);
    const cx = w / 2, cy = h / 2 + 6;
    const k = (h / 2 - 20) / UGG_R;
    const tx = (x) => Math.round(cx + x * k);
    const ty = (z) => Math.round(cy + z * k);
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.arc(cx, cy, UGG_R * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(cx, cy, (UGG_R - 3) * k, 0, Math.PI * 2);
    ctx.fill();
    // Cabaña, hoguera y balsa
    frame(ctx, tx(LAYOUT.hut.x) - 7, ty(LAYOUT.hut.z) - 6, 14, 12, C.maroon);
    px(ctx, C.red, [tx(LAYOUT.fire.x) - 2, ty(LAYOUT.fire.z) - 2, 4, 4]);
    frame(ctx, tx(LAYOUT.server.x) - 3, ty(LAYOUT.server.z) - 6, 7, 12, C.gray);
    frame(ctx, tx(LAYOUT.raft.x) - 8, ty(LAYOUT.raft.z) - 3, 16, 6, C.olive);
    // Tótems y su numeral (orden del cofre)
    ctx.font = '700 15px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    st.order.forEach((t, n) => {
      const pos = LAYOUT.totems[t];
      px(ctx, C.black, [tx(pos.x) - 2, ty(pos.z) - 6, 5, 12]);
      ctx.fillStyle = C.white;
      ctx.fillText(['I', 'II', 'III', 'IV'][n], tx(pos.x), ty(pos.z) - 14);
    });
    // Rosa de los vientos (el norte, hacia "casa")
    ctx.fillStyle = C.white;
    ctx.fillText('N', w - 22, 16);
    px(ctx, C.white, [w - 23, 24, 2, 14]);
    ctx.font = '700 13px "Pixelify Sans", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ISLA DE UGG. AMOR NUNCA IRSE', 8, h - 10);
  },
  // Dibujo inquietante: tú y Ugg cogidos de la mano
  tu(ctx, w, h) {
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) heart(ctx, (i * 53) % (w - 8), (i * 37) % (h - 8), i % 2 ? C.red : C.magenta);
    // Tú (monitor)
    frame(ctx, 70, 50, 50, 40, C.silver);
    frame(ctx, 76, 55, 38, 28, C.black);
    px(ctx, C.lime, [84, 62, 4, 6], [102, 62, 4, 6], [86, 74, 18, 2]);
    px(ctx, C.red, [86, 90, 18, 34], [70, 95, 16, 6]);
    px(ctx, C.navy, [86, 124, 7, 26], [97, 124, 7, 26]);
    // Ugg
    px(ctx, C.black, [190, 40, 46, 22], [186, 46, 8, 30], [232, 46, 8, 30]);
    px(ctx, C.olive, [194, 56, 38, 34]);
    px(ctx, C.magenta, [202, 66, 7, 6], [218, 66, 7, 6]);
    px(ctx, C.black, [196, 80, 34, 14]);
    px(ctx, C.maroon, [190, 94, 46, 40]);
    px(ctx, C.olive, [196, 134, 10, 18], [220, 134, 10, 18], [120, 100, 72, 6]);
    heart(ctx, 150, 80, C.red);
    ctx.fillStyle = C.red;
    ctx.font = '700 22px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UGG + TÚ = SIEMPRE', w / 2, h - 20);
  },
  ugg(ctx, w, h) {
    ctx.fillStyle = C.cyan;
    ctx.fillRect(0, 0, w, h);
    px(ctx, C.yellow, [0, h - 40, w, 40]);
    px(ctx, C.black, [110, 20, 100, 40], [100, 30, 20, 80], [200, 30, 20, 80]);
    px(ctx, C.olive, [120, 50, 80, 80]);
    px(ctx, C.white, [135, 70, 20, 12], [165, 70, 20, 12]);
    px(ctx, C.black, [142, 72, 8, 8], [172, 72, 8, 8], [130, 62, 60, 5], [125, 100, 70, 40]);
    px(ctx, C.maroon, [100, 140, 120, 30]);
    ctx.fillStyle = C.navy;
    ctx.font = '700 18px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UGG GUAPO. FOTO PARA AMOR', w / 2, h - 14);
  },
};
export function bitmapCanvas(id, state, w = 320, h = 200) {
  const [c, ctx] = canvas(w, h);
  (BMPS[id] || BMPS.ugg)(ctx, w, h, state);
  return c;
}

// Placa del tótem (textura 3D)
export function totemPlate(id) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#c9a26b';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#6b4226';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 120);
  drawSymbol(ctx, id, 64, 64, 90, '#3b2414');
  return c;
}
