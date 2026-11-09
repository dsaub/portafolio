// Terminales tontos de los tótems, conectados al servidor UGGNIX central.
// Login rancio de Unix, un menú de texto y un minijuego en modo texto (80x24).
// Ganar el minijuego "abre" el tótem y deja ver su símbolo.
import { sfx } from '../audio.js';
import { GAME_NAMES } from './state.js';

const COLS = 80;
const ROWS = 24;
const USER = 'ugg';
const PASS = 'mamut';

// ---------- Búfer de texto ----------
function makeBuffer() {
  let rows = [];
  const api = {
    clear() {
      rows = Array.from({ length: ROWS }, () => new Array(COLS).fill(' '));
    },
    put(x, y, str) {
      x = Math.round(x);
      y = Math.round(y);
      if (y < 0 || y >= ROWS) return;
      for (let i = 0; i < str.length; i++) if (x + i >= 0 && x + i < COLS) rows[y][x + i] = str[i];
    },
    box(x, y, w, h, title = '', double = false) {
      // Solo ASCII: la fuente VT323 no trae caracteres de dibujo de cajas
      const [tl, tr, bl, br, hz, vt] = double ? ['#', '#', '#', '#', '=', '|'] : ['+', '+', '+', '+', '-', '|'];
      api.put(x, y, tl + hz.repeat(w - 2) + tr);
      for (let j = 1; j < h - 1; j++) {
        api.put(x, y + j, vt);
        api.put(x + w - 1, y + j, vt);
      }
      api.put(x, y + h - 1, bl + hz.repeat(w - 2) + br);
      if (title) api.put(x + 2, y, ` ${title} `);
    },
    fill(x, y, w, h, ch = ' ') {
      for (let j = 0; j < h; j++) api.put(x, y + j, ch.repeat(w));
    },
    center(y, str) {
      api.put(Math.floor((COLS - str.length) / 2), y, str);
    },
    text: () => rows.map((r) => r.join('')).join('\n'),
  };
  api.clear();
  return api;
}

// ---------- Minijuegos ----------
// Cada juego: { name, help, init(), tick(dt), key(code, down), draw(buf), status, info() }
function serpiente() {
  const X0 = 20, Y0 = 3, FW = 40, FH = 18, GOAL = 12;
  let snake, dir, queue, food, t, eaten;
  const g = {
    name: 'SERPIENTE',
    help: 'Flechas: girar · Come 12 manzanas (*) sin chocar',
    status: 'play',
    init() {
      snake = [[19, 9], [18, 9], [17, 9]];
      dir = [1, 0];
      queue = [];
      t = 0;
      eaten = 0;
      g.status = 'play';
      place();
    },
    info: () => `Manzanas ${eaten}/${GOAL}`,
    key(code, down) {
      if (!down) return;
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }[code];
      if (!d) return;
      const last = queue[queue.length - 1] || dir;
      if ((d[0] === -last[0] && d[1] === -last[1]) || (d[0] === last[0] && d[1] === last[1])) return;
      if (queue.length < 3) queue.push(d);
    },
    tick(dt) {
      t += dt;
      const step = Math.max(0.065, 0.12 - eaten * 0.004);
      while (t >= step && g.status === 'play') {
        t -= step;
        if (queue.length) dir = queue.shift();
        const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
        if (h[0] < 0 || h[1] < 0 || h[0] >= FW - 2 || h[1] >= FH - 2 || snake.slice(0, -1).some(([x, y]) => x === h[0] && y === h[1])) {
          g.status = 'lose';
          return;
        }
        snake.unshift(h);
        if (h[0] === food[0] && h[1] === food[1]) {
          eaten++;
          sfx.eat();
          if (eaten >= GOAL) g.status = 'win';
          else place();
        } else snake.pop();
      }
    },
    draw(b) {
      b.box(X0, Y0, FW, FH);
      b.put(X0 + 1 + food[0], Y0 + 1 + food[1], '*');
      snake.forEach(([x, y], i) => b.put(X0 + 1 + x, Y0 + 1 + y, i === 0 ? '@' : 'o'));
    },
  };
  function place() {
    do food = [Math.floor(Math.random() * (FW - 2)), Math.floor(Math.random() * (FH - 2))];
    while (snake.some(([x, y]) => x === food[0] && y === food[1]));
  }
  return g;
}

function raqueta() {
  const X0 = 9, Y0 = 3, FW = 62, FH = 18, PH = 4, GOAL = 5;
  const IW = FW - 2, IH = FH - 2;
  let py, cy, bx, by, vx, vy, sp, sc, held, serveT, aimErr = 0;
  const g = {
    name: 'RAQUETA',
    help: 'Arriba/Abajo: mover tu raqueta (izquierda) · Gana a la caja: 5 puntos',
    status: 'play',
    init() {
      py = cy = IH / 2 - PH / 2;
      sp = sc = 0;
      held = { up: false, down: false };
      g.status = 'play';
      serve(1);
    },
    info: () => `TÚ ${sp} - ${sc} UGGSRV`,
    key(code, down) {
      if (code === 'ArrowUp' || code === 'KeyW') held.up = down;
      if (code === 'ArrowDown' || code === 'KeyS') held.down = down;
    },
    tick(dt) {
      py += ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * 17 * dt;
      py = Math.max(0, Math.min(IH - PH, py));
      // La máquina persigue la pelota con pereza: solo reacciona cuando cruza la red
      const target = vx > 0 && bx > IW * 0.45 ? by - PH / 2 + 0.5 + aimErr : IH / 2 - PH / 2;
      cy += Math.max(-7 * dt, Math.min(7 * dt, target - cy));
      cy = Math.max(0, Math.min(IH - PH, cy));
      if (serveT > 0) {
        serveT -= dt;
        return;
      }
      bx += vx * dt;
      by += vy * dt;
      if (by < 0) (by = -by), (vy = -vy);
      if (by > IH - 1) (by = 2 * (IH - 1) - by), (vy = -vy);
      if (vx < 0 && bx <= 2 && bx > 0.5 && by + 0.5 >= py && by - 0.5 <= py + PH) hit(py, 1);
      if (vx > 0 && bx >= IW - 3 && bx < IW - 1.5 && by + 0.5 >= cy && by - 0.5 <= cy + PH) hit(cy, -1);
      if (bx < 0) {
        sc++;
        sfx.denied();
        if (sc >= GOAL) g.status = 'lose';
        else serve(1);
      } else if (bx > IW - 1) {
        sp++;
        sfx.discover();
        if (sp >= GOAL) g.status = 'win';
        else serve(-1);
      }
    },
    draw(b) {
      b.box(X0, Y0, FW, FH);
      for (let y = 0; y < IH; y += 2) b.put(X0 + 1 + IW / 2, Y0 + 1 + y, ':');
      for (let k = 0; k < PH; k++) {
        b.put(X0 + 2, Y0 + 1 + Math.round(py) + k, '#');
        b.put(X0 + IW - 1, Y0 + 1 + Math.round(cy) + k, '#');
      }
      b.put(X0 + 1 + bx, Y0 + 1 + by, 'O');
    },
  };
  function serve(direction) {
    bx = IW / 2;
    by = IH / 2;
    vx = 24 * direction;
    vy = (Math.random() - 0.5) * 14;
    serveT = 0.8;
  }
  function hit(paddle, direction) {
    const off = (by - (paddle + PH / 2)) / (PH / 2);
    vx = Math.min(44, Math.abs(vx) * 1.06) * direction;
    vy = off * 17; // golpear con el borde de la raqueta cruza la pelota
    aimErr = (Math.random() - 0.5) * 3;
    bx = direction > 0 ? 2.1 : IW - 3.1;
    sfx.kick();
  }
  return g;
}

function apilador() {
  const WW = 10, WH = 18, X0 = 29, Y0 = 3, GOAL = 6;
  const SHAPES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
  ];
  let well, piece, next, t, lines;
  const g = {
    name: 'APILADOR',
    help: 'Izq/Der: mover · Arriba: girar · Abajo: bajar · Espacio: soltar · 6 filas',
    status: 'play',
    init() {
      well = Array.from({ length: WH }, () => new Array(WW).fill(0));
      lines = 0;
      t = 0;
      g.status = 'play';
      next = rand();
      spawn();
    },
    info: () => `Filas ${lines}/${GOAL}`,
    key(code, down) {
      if (!down || g.status !== 'play') return;
      if (code === 'ArrowLeft' || code === 'KeyA') tryMove(-1, 0);
      else if (code === 'ArrowRight' || code === 'KeyD') tryMove(1, 0);
      else if (code === 'ArrowDown' || code === 'KeyS') {
        if (!tryMove(0, 1)) lock();
      } else if (code === 'ArrowUp' || code === 'KeyW') rotate();
      else if (code === 'Space' || code === 'Enter') {
        while (tryMove(0, 1));
        lock();
      }
    },
    tick(dt) {
      t += dt;
      const step = Math.max(0.18, 0.6 - lines * 0.06);
      while (t >= step && g.status === 'play') {
        t -= step;
        if (!tryMove(0, 1)) lock();
      }
    },
    draw(b) {
      b.box(X0 - 1, Y0 - 1, WW * 2 + 2, WH + 2);
      for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (well[y][x]) b.put(X0 + x * 2, Y0 + y, '##');
      for (const [x, y] of cells(piece)) b.put(X0 + x * 2, Y0 + y, '[]');
      b.box(X0 + WW * 2 + 4, Y0 - 1, 14, 6, 'Siguiente');
      for (const [x, y] of next.cells) b.put(X0 + WW * 2 + 7 + x * 2, Y0 + 1 + y, '[]');
    },
  };
  const rand = () => ({ cells: SHAPES[Math.floor(Math.random() * SHAPES.length)].map((c) => [...c]) });
  const cells = (p) => p.cells.map(([x, y]) => [x + p.x, y + p.y]);
  const fits = (cs) => cs.every(([x, y]) => x >= 0 && x < WW && y < WH && (y < 0 || !well[y][x]));
  function spawn() {
    piece = { ...next, x: 3, y: 0 };
    next = rand();
    if (!fits(cells(piece))) g.status = 'lose';
  }
  function tryMove(dx, dy) {
    const cand = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!fits(cells(cand))) return false;
    piece = cand;
    return true;
  }
  function rotate() {
    const maxX = Math.max(...piece.cells.map((c) => c[0]));
    const rot = piece.cells.map(([x, y]) => [y, maxX - x]);
    for (const kick of [0, -1, 1, -2, 2]) {
      const cand = { ...piece, cells: rot, x: piece.x + kick };
      if (fits(cells(cand))) {
        piece = cand;
        return;
      }
    }
  }
  function lock() {
    for (const [x, y] of cells(piece)) {
      if (y < 0) {
        g.status = 'lose';
        return;
      }
      well[y][x] = 1;
    }
    sfx.thud();
    const before = well.length;
    well = well.filter((row) => row.some((c) => !c));
    const cleared = before - well.length;
    while (well.length < WH) well.unshift(new Array(WW).fill(0));
    if (cleared) {
      lines += cleared;
      sfx.discover();
      if (lines >= GOAL) {
        g.status = 'win';
        return;
      }
    }
    spawn();
  }
  return g;
}

function saltarin() {
  const X0 = 2, Y0 = 3, LW = 76, LH = 18;
  // Nivel construido a mano: # suelo, ^ pinchos, F bandera
  const map = Array.from({ length: LH }, () => new Array(LW).fill(' '));
  const seg = (x0, x1, y, ch = '#') => {
    for (let x = x0; x <= x1; x++) map[y][x] = ch;
  };
  seg(0, 12, 17); seg(17, 30, 17); seg(35, 50, 17); seg(51, 75, 17);
  seg(47, 48, 16, '^'); seg(57, 59, 16, '^'); seg(66, 67, 16, '^');
  seg(20, 26, 14); seg(28, 33, 11); seg(46, 50, 13); seg(54, 60, 10); seg(63, 70, 7);
  map[6][69] = 'F';
  const solid = (cx, cy) => cx < 0 || cx >= LW || (cy >= 0 && cy < LH && map[cy][cx] === '#');
  const tile = (cx, cy) => (cy >= 0 && cy < LH && cx >= 0 && cx < LW ? map[cy][cx] : ' ');
  const PW = 0.8, PHt = 0.95;
  let x, y, vx, vy, onGround, lives, held, jumpQ, enemy, flash;
  const g = {
    name: 'SALTARÍN',
    help: 'Izq/Der: andar · Arriba/Espacio: saltar · Llega a la F. Cuidado con ^ y con U',
    status: 'play',
    init() {
      lives = 3;
      held = { l: false, r: false };
      enemy = { x: 20, dir: 1 };
      g.status = 'play';
      respawn();
    },
    info: () => `Vidas ${'<3 '.repeat(lives).trim()}`,
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'KeyA') held.l = down;
      if (code === 'ArrowRight' || code === 'KeyD') held.r = down;
      if ((code === 'ArrowUp' || code === 'KeyW' || code === 'Space') && down) jumpQ = 0.12;
    },
    tick(dt) {
      if (flash > 0) {
        flash -= dt;
        return;
      }
      // Ugg patrulla el suelo entre 18 y 29
      enemy.x += enemy.dir * 5 * dt;
      if (enemy.x > 29) enemy.dir = -1;
      if (enemy.x < 18) enemy.dir = 1;
      vx = ((held.r ? 1 : 0) - (held.l ? 1 : 0)) * 13;
      jumpQ -= dt;
      if (jumpQ > 0 && onGround) {
        vy = -20;
        onGround = false;
        jumpQ = 0;
        sfx.jump();
      }
      vy = Math.min(30, vy + 46 * dt);
      // eje X
      let nx = x + vx * dt;
      if (overlaps(nx, y)) {
        nx = vx > 0 ? Math.floor(nx + PW) - PW - 0.001 : Math.floor(nx) + 1;
      }
      x = nx;
      // eje Y
      let ny = y + vy * dt;
      onGround = false;
      if (overlaps(x, ny)) {
        if (vy > 0) {
          ny = Math.floor(ny + PHt) - PHt - 0.001;
          onGround = true;
        } else ny = Math.floor(ny) + 1;
        vy = 0;
      }
      y = ny;
      const cx = Math.floor(x + PW / 2), cy = Math.floor(y + PHt / 2);
      if (tile(cx, cy) === 'F') {
        g.status = 'win';
        return;
      }
      if (y > LH || tile(cx, cy) === '^' || tile(cx, Math.floor(y + PHt)) === '^' || (Math.abs(x - enemy.x) < 0.9 && Math.abs(y - 16) < 0.9)) die();
    },
    draw(b) {
      for (let j = 0; j < LH; j++) b.put(X0, Y0 + j, map[j].join(''));
      b.put(X0 + enemy.x, Y0 + 16, 'U');
      if (!(flash > 0 && Math.floor(flash * 10) % 2)) b.put(X0 + x + PW / 2 - 0.5, Y0 + y + PHt / 2 - 0.5, '@');
    },
  };
  function overlaps(px, py) {
    for (let cx = Math.floor(px); cx <= Math.floor(px + PW); cx++) for (let cy = Math.floor(py); cy <= Math.floor(py + PHt); cy++) if (solid(cx, cy)) return true;
    return false;
  }
  function respawn() {
    x = 2;
    y = 15.9;
    vx = vy = 0;
    onGround = false;
    jumpQ = 0;
    flash = 0;
  }
  function die() {
    lives--;
    sfx.hurt();
    if (lives <= 0) {
      g.status = 'lose';
      return;
    }
    respawn();
    flash = 0.8;
  }
  return g;
}

export const MAKERS = { serpiente, raqueta, apilador, saltarin }; // exportado también para las pruebas

// ---------- Terminal ----------
export function createTTY({ getState, onSolved, onLogin, onClose }) {
  const root = document.createElement('div');
  root.className = 'tty';
  root.hidden = true;
  root.innerHTML = `
    <div class="tty-stage">
      <div class="tty-fit"><div class="tty-crt"><pre class="tty-screen"></pre><div class="tty-brand"><span>UGG-VT100</span><span class="tty-led"></span></div></div></div>
      <div class="tty-pad" aria-hidden="true">
        <button type="button" data-k="ArrowLeft">←</button><button type="button" data-k="ArrowUp">↑</button><button type="button" data-k="ArrowDown">↓</button><button type="button" data-k="ArrowRight">→</button><button type="button" data-k="Space">␣</button><button type="button" data-k="Enter">⏎</button>
      </div>
      <input class="tty-kbd" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Teclado del terminal" />
      <button type="button" class="w31-leave tty-leave">Dejar el terminal</button>
    </div>`;
  document.body.append(root);
  const screen = root.querySelector('.tty-screen');
  const fit = root.querySelector('.tty-fit');
  const crt = root.querySelector('.tty-crt');
  const kbd = root.querySelector('.tty-kbd');
  const buf = makeBuffer();

  let scale = 1;
  const resize = () => {
    scale = Math.max(0.3, Math.min((innerWidth - 24) / 720, (innerHeight - 170) / 560, 1.4));
    fit.style.width = `${720 * scale}px`;
    fit.style.height = `${560 * scale}px`;
    crt.style.transform = `scale(${scale})`;
  };
  window.addEventListener('resize', resize);

  let tty = 0; // 0..3 = tótems, 'console' = servidor
  let mode = 'off'; // user | pass | motd | menu | game | result | console
  let lines = [];
  let typed = '';
  let user = '';
  let menuSel = 0;
  let game = null;
  let raf = 0;
  let last = 0;
  let loggedTTY = new Set();

  const ttyName = () => (tty === 'console' ? 'console' : `tty${tty + 1}`);
  const println = (s = '') => {
    lines.push(...String(s).split('\n'));
    while (lines.length > ROWS - 1) lines.shift();
  };
  function renderLines(cursorText = '') {
    buf.clear();
    lines.forEach((l, i) => buf.put(0, i, l));
    if (cursorText !== null) buf.put(0, lines.length, cursorText + (Math.floor(performance.now() / 500) % 2 ? '_' : ' '));
    screen.textContent = buf.text();
  }

  function banner() {
    lines = [];
    println('');
    println('UGGNIX System V/386 Release 4.0 · uggsrv');
    println(`Conectado por /dev/${ttyName()} a 9600 baudios`);
    println('');
    println('   ___   ___  ___  _  _ _____  __');
    println('  | | | / __|/ __|| \\| |_ _\\ \\/ /');
    println('  | |_| | (_ | (_ || .` || | >  < ');
    println('   \\___/ \\___|\\___||_|\\_|___/_/\\_\\');
    println('');
    println('Cuenta de invitado deshabilitada. Pregunte al administrador (Ugg).');
    println('');
  }

  function startLogin() {
    banner();
    mode = 'user';
    typed = '';
  }

  function submit() {
    if (mode === 'user') {
      println(`uggsrv login: ${typed}`);
      user = typed.trim();
      typed = '';
      mode = 'pass';
      return;
    }
    if (mode === 'pass') {
      println('Password:');
      const ok = user.toLowerCase() === USER && typed === PASS;
      typed = '';
      if (!ok) {
        sfx.denied();
        println('Login incorrect');
        println('');
        mode = 'user';
        return;
      }
      loggedTTY.add(tty);
      onLogin?.();
      println(`Último acceso: ${new Date(Date.now() - 864e5 * 3).toUTCString()} en ${ttyName()}`);
      println('Tienes correo.');
      println('');
      mode = 'motd';
      motdT = performance.now();
    }
  }
  let motdT = 0;

  // Menú de texto con marco (pantalla "curses")
  function drawMenu() {
    const st = getState();
    buf.clear();
    buf.fill(0, 0, COLS, 1, '=');
    buf.put(1, 0, `[ UGGNIX ${ttyName()} - ugg@uggsrv ]`);
    buf.put(COLS - 14, 0, `[ ${new Date().toLocaleTimeString('es-ES')} ]`);
    if (tty === 'console') {
      buf.box(6, 2, 68, 19, 'who - estado de los terminales', true);
      buf.put(9, 4, 'USUARIO  LÍNEA   PROGRAMA     ESTADO');
      buf.put(9, 5, '-------- ------- ------------ ------------------------');
      st.games.forEach((gm, i) => {
        buf.put(9, 6 + i, `ugg      tty${i + 1}    ${GAME_NAMES[gm].padEnd(12)} ${st.solved[i] ? 'superado · dibujo visible' : 'bloqueado'}`);
      });
      buf.put(9, 11, 'Correo (1):');
      buf.put(11, 12, 'De: ugg@uggsrv');
      buf.put(11, 13, 'Asunto: para amor');
      buf.put(11, 14, '"Amor jugar con juegos de Ugg. Ugg hacer juegos para');
      buf.put(11, 15, ' amor. Si amor ganar todos, amor muy listo. Ugg orgulloso."');
      buf.put(9, 18, '[ ESC / Dejar el terminal: cerrar sesión ]');
    } else {
      const gm = st.games[tty];
      buf.box(14, 4, 52, 14, `Tótem ${tty + 1}`, true);
      buf.center(6, 'ESTE TÓTEM GUARDA UN DIBUJO.');
      buf.center(7, 'GANA EL JUEGO PARA VERLO.');
      buf.center(9, `Programa: ${GAME_NAMES[gm]}`);
      buf.center(10, st.solved[tty] ? '(ya superado: el tótem está abierto)' : '');
      const opts = ['  Jugar  ', '  Salir  '];
      const row = opts.map((o, i) => (i === menuSel ? `[${o}]` : ` ${o} `)).join('    ');
      buf.center(13, row);
      buf.center(16, 'Izq/Der: elegir · ENTER: aceptar');
    }
    buf.put(0, ROWS - 1, '-'.repeat(COLS));
    screen.textContent = buf.text();
  }

  function startGame() {
    const gm = getState().games[tty];
    game = MAKERS[gm]();
    game.init();
    mode = 'game';
  }

  function drawGame() {
    buf.clear();
    buf.fill(0, 0, COLS, 1, '=');
    buf.put(1, 0, `[ ${ttyName()} · ugg@uggsrv · ${game.name} ]`);
    const info = `[ ${game.info()} ]`;
    buf.put(COLS - info.length - 1, 0, info);
    game.draw(buf);
    buf.put(1, ROWS - 2, game.help);
    if (game.status !== 'play') {
      const win = game.status === 'win';
      buf.fill(20, 8, 40, 7, ' ');
      buf.box(20, 8, 40, 7, win ? 'SUPERADO' : 'FIN', true);
      buf.center(10, win ? '¡Has ganado! El tótem se abre...' : 'Has perdido. La caja se ríe de ti.');
      buf.center(12, win ? 'ENTER: volver a la isla' : 'ENTER: reintentar · ESC: salir');
    }
    screen.textContent = buf.text();
  }

  function frame(now) {
    if (root.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (mode === 'game') {
      if (game.status === 'play') game.tick(dt);
      drawGame();
    } else if (mode === 'motd') {
      renderLines(null);
      if (now - motdT > 1300) {
        mode = tty === 'console' ? 'console' : 'menu';
        menuSel = 0;
      }
    } else if (mode === 'menu' || mode === 'console') drawMenu();
    else renderLines(mode === 'user' ? `uggsrv login: ${typed}` : 'Password: ');
    raf = requestAnimationFrame(frame);
  }

  // ---------- Entrada ----------
  function key(code, down, ev) {
    if (mode === 'game') {
      if (down && game.status !== 'play' && code === 'Enter') {
        if (game.status === 'win') {
          const idx = tty;
          close();
          onSolved(idx);
        } else game.init();
        return;
      }
      if (down && code === 'Escape') return close();
      game.key(code, down);
      return;
    }
    if (!down) return;
    if (mode === 'menu') {
      if (code === 'ArrowLeft' || code === 'ArrowRight') menuSel = 1 - menuSel;
      else if (code === 'Enter') menuSel === 0 ? startGame() : close();
      else if (code === 'Escape') close();
      return;
    }
    if (mode === 'console') {
      if (code === 'Escape' || code === 'Enter') close();
      return;
    }
    if (mode === 'user' || mode === 'pass') {
      if (code === 'Enter') submit();
      else if (code === 'Backspace') typed = typed.slice(0, -1);
      else if (code === 'Escape') close();
      else if (ev && ev.key.length === 1 && typed.length < 24) typed += ev.key;
    }
  }
  kbd.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Backspace'].includes(e.code)) e.preventDefault();
    // en el login, la tecla ya se procesa aquí (así el evento "input" no la duplica)
    if ((mode === 'user' || mode === 'pass') && e.key.length === 1) e.preventDefault();
    if (e.repeat && mode !== 'game') return;
    key(e.code, true, e);
    kbd.value = '';
  });
  kbd.addEventListener('keyup', (e) => {
    e.stopPropagation();
    key(e.code, false, e);
  });
  // Teclados móviles: algunos solo emiten "input"
  kbd.addEventListener('input', () => {
    if ((mode === 'user' || mode === 'pass') && kbd.value) typed = (typed + kbd.value).slice(0, 24);
    kbd.value = '';
  });
  root.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('button')) setTimeout(() => kbd.focus({ preventScroll: true }), 0);
  });
  // Cruceta táctil (con repetición al mantener pulsado)
  root.querySelectorAll('.tty-pad button').forEach((b) => {
    let rep = null;
    const code = b.dataset.k;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      key(code, true);
      if (mode === 'game' && (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowDown')) rep = setInterval(() => key(code, true), 110);
    });
    const up = () => {
      clearInterval(rep);
      key(code, false);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
  root.querySelector('.tty-leave').addEventListener('click', () => close());

  function open(which) {
    tty = which;
    root.hidden = false;
    resize();
    // si ya iniciaste sesión en este terminal, no vuelve a pedir la clave
    if (loggedTTY.has(which)) {
      lines = [];
      mode = which === 'console' ? 'console' : 'menu';
      menuSel = 0;
    } else startLogin();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    setTimeout(() => kbd.focus({ preventScroll: true }), 30);
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    cancelAnimationFrame(raf);
    game = null;
    mode = 'off';
    kbd.blur();
    onClose();
  }

  return {
    open,
    close,
    get isOpen() {
      return !root.hidden;
    },
    // nueva partida de secuestro: hay que volver a iniciar sesión
    reset: () => loggedTTY.clear(),
  };
}
