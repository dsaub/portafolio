// Estado persistente del secuestro de Ugg: si recargas, sigues en su isla hasta escapar.
const KEY = 'elordenador-ugg';

export const SYMBOLS = ['sol', 'luna', 'pez', 'hueso', 'fuego', 'corazon'];
// Minijuegos de los terminales de los tótems (uno por tótem)
export const GAMES = ['serpiente', 'raqueta', 'apilador', 'saltarin'];
export const GAME_NAMES = { serpiente: 'SERPIENTE', raqueta: 'RAQUETA', apilador: 'APILADOR', saltarin: 'SALTARÍN' };
export const SYMBOL_NAMES = { sol: 'un SOL', luna: 'una LUNA', pez: 'un PEZ', hueso: 'un HUESO', fuego: 'un FUEGO', corazon: 'un CORAZÓN' };

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function newUggState() {
  return {
    captive: true,
    arrived: Date.now(), // la fecha de TU.TXT y, por tanto, el código del candado
    totems: shuffle(SYMBOLS).slice(0, 4), // símbolo tallado en cada tótem (0..3)
    order: shuffle([0, 1, 2, 3]), // order[n] = tótem marcado con el numeral n+1 en MAPA.BMP
    games: shuffle(GAMES), // minijuego del terminal de cada tótem
    solved: [false, false, false, false], // el símbolo solo se ve tras ganar su minijuego
    chest: false, // cofre abierto
    paddle: false, // tienes el remo
    floppy: false, // tienes el disquete
    inserted: false, // el disquete está en la unidad A:
    driver: false, // controlador Sound Blaster instalado
    asleep: false, // Ugg duerme
  };
}

export function loadUgg() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || !s.captive) return null;
    // Estados de una versión anterior (3 tótems): se rehace el puzle conservando el día de llegada
    if (!s.games || s.totems.length !== 4) return { ...newUggState(), arrived: s.arrived };
    return s;
  } catch {
    return null;
  }
}

export function saveUgg(state) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {}
}

export const chestCode = (s) => s.order.map((t) => s.totems[t]);

const arrivedDate = (s) => new Date(s.arrived);
export const padlockCode = (s) => {
  const d = arrivedDate(s);
  return String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
};
// Fecha en formato DOS (dd-mm-aa) y hora del día de llegada
export function arrivedStamp(s) {
  const d = arrivedDate(s);
  const p = (n) => String(n).padStart(2, '0');
  return { date: `${p(d.getDate())}-${p(d.getMonth() + 1)}-${p(d.getFullYear() % 100)}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

// Dibuja un símbolo tallado (para los tótems, el cofre y MAPA.BMP)
export function drawSymbol(ctx, id, cx, cy, s, color = '#2b1d14') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (id) {
    case 'sol':
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
        ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46);
      }
      ctx.stroke();
      break;
    case 'luna':
      ctx.arc(0, 0, 40, 0.35 * Math.PI, 1.65 * Math.PI);
      ctx.arc(-14, 0, 32, 1.55 * Math.PI, 0.45 * Math.PI, true);
      ctx.fill();
      break;
    case 'pez':
      ctx.ellipse(-6, 0, 34, 20, 0, 0, Math.PI * 2);
      ctx.moveTo(24, 0);
      ctx.lineTo(46, -20);
      ctx.lineTo(46, 20);
      ctx.fill();
      ctx.fillStyle = '#f5f0e0';
      ctx.beginPath();
      ctx.arc(-24, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hueso':
      ctx.lineWidth = 16;
      ctx.moveTo(-28, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();
      for (const x of [-32, 32]) for (const y of [-9, 9]) {
        ctx.moveTo(x + 11, y);
        ctx.arc(x, y, 11, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 'fuego':
      ctx.moveTo(0, -46);
      ctx.quadraticCurveTo(30, -10, 26, 16);
      ctx.quadraticCurveTo(20, 42, 0, 42);
      ctx.quadraticCurveTo(-20, 42, -26, 16);
      ctx.quadraticCurveTo(-28, -4, -10, -20);
      ctx.quadraticCurveTo(-8, -2, 2, 0);
      ctx.quadraticCurveTo(-4, -24, 0, -46);
      ctx.fill();
      break;
    case 'corazon':
      ctx.moveTo(0, 38);
      ctx.bezierCurveTo(-50, 4, -34, -42, 0, -16);
      ctx.bezierCurveTo(34, -42, 50, 4, 0, 38);
      ctx.fill();
      break;
  }
  ctx.restore();
}

// Disposición de la isla de Ugg (coordenadas locales: x = este, z = sur; el norte mira a casa)
export const UGG_CENTER = { x: 0, z: 160 };
export const UGG_R = 20;
export const LAYOUT = {
  hut: { x: 0, z: 3, r: 4.2 },
  pc: { x: 0, z: 0.4 },
  chest: { x: 2.7, z: 4.4 },
  bed: { x: -2.6, z: 4.2 },
  fire: { x: 0, z: 10 },
  totems: [{ x: -13, z: -5 }, { x: 13, z: 3 }, { x: -7, z: 13 }, { x: 10, z: 13 }],
  server: { x: -5, z: -11 },
  raft: { x: 6, z: -17.6 },
  post: { x: 6, z: -15.4 },
  start: { x: 0, z: 2.4 },
  sleep: { x: 3.2, z: 11.6 },
};
