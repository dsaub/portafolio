// Terminal secreta (tecla º / ` o 5 toques en el nombre) con un Snake dentro
import { sfx } from './audio.js';
import { NOTE_CMD } from './note.js';
import { deletionStream, rmLine, RM_BUSY } from './rmlog.js';

const BEST_KEY = 'elordenador-snake-best';
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const NEOFETCH_ART = [
  '  ┌──────────┐ ',
  '  │ ▮      ▮ │ ',
  '  │   ────   │ ',
  '  └──┬────┬──┘ ',
  '   ══╧════╧══  ',
];

export function createTerminal({ profile, projects, secrets, onOpen, onClose, onParty, onDestroy }) {
  const root = document.createElement('section');
  root.className = 'term';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Terminal');
  root.innerHTML = `
    <div class="term-win">
      <div class="term-bar">
        <span class="term-title">daniel@isla: ~</span>
        <button type="button" class="term-x" aria-label="Cerrar terminal">×</button>
      </div>
      <div class="term-body">
        <div class="term-out"></div>
        <form class="term-line">
          <label for="term-in">daniel@isla:~$</label>
          <input id="term-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" />
        </form>
      </div>
      <div class="snake" hidden>
        <div class="snake-hud"><span class="snake-score">0</span><span class="snake-best"></span></div>
        <canvas width="336" height="336" aria-label="Snake"></canvas>
        <p class="snake-msg"></p>
      </div>
    </div>`;
  document.body.appendChild(root);

  const body = root.querySelector('.term-body');
  const out = root.querySelector('.term-out');
  const form = root.querySelector('.term-line');
  const field = root.querySelector('#term-in');
  const history = [];
  let histPos = 0;
  let booted = false;

  const print = (html = '', cls = '') => {
    const line = document.createElement('div');
    line.className = 'term-l' + (cls ? ' ' + cls : '');
    line.innerHTML = html;
    out.appendChild(line);
    while (out.childElementCount > 300) out.firstChild.remove();
    body.scrollTop = body.scrollHeight;
  };
  const link = (url, text = url.replace(/^https?:\/\//, '')) =>
    `<a href="${url}" target="_blank" rel="noopener">${esc(text)}</a>`;

  // ---------- Comandos ----------
  const commands = {
    help: {
      desc: 'muestra esta ayuda',
      run() {
        print('Comandos disponibles:');
        for (const [name, c] of Object.entries(commands)) if (!c.hidden) print(`  <b>${name.padEnd(10)}</b> ${c.desc}`);
        print('Pista: <b>Tab</b> autocompleta y <b>↑</b> recupera comandos anteriores.', 'dim');
      },
    },
    whoami: { desc: 'quién soy', run: () => print(`${profile.name.toLowerCase()} (aka ${profile.alias}) · ${esc(profile.role)}`) },
    ls: {
      desc: 'lista archivos',
      run: () => print(`<b>proyectos/</b>  <b>secretos/</b>  sobre-mi.txt  snake*${secrets.has('nota') ? '  nota.txt' : ''}`),
    },
    cat: {
      desc: 'muestra un archivo',
      run(args) {
        const f = (args[0] || '').replace(/\/$/, '');
        if (f === 'sobre-mi.txt') {
          print(esc(profile.bio));
          print(`${esc(profile.role)}. Lenguajes: ${profile.languages.map(esc).join(', ')}.`);
          print(link(profile.github));
        } else if (f === 'proyectos') commands.proyectos.run();
        else if (f === 'secretos') commands.logros.run();
        else if (f === 'nota.txt' && secrets.has('nota')) {
          print('NOTA DEL SYSADMIN', 'err');
          print(`Pase lo que pase, NUNCA escribas <b>${esc(NOTE_CMD)}</b> en esta terminal.`);
          print('La isla no lo perdonaría. — el sysadmin', 'dim');
        } else if (f === 'snake') print('cat: snake: es un binario. Mejor ejecútalo: <b>snake</b>', 'dim');
        else if (!f) print('uso: cat &lt;archivo&gt;', 'err');
        else print(`cat: ${esc(f)}: No existe el archivo o el directorio`, 'err');
      },
    },
    proyectos: {
      desc: 'mis proyectos',
      run() {
        projects.forEach((p, i) => print(`${i + 1}. <b>${esc(p.name)}</b> — ${esc(p.tagline)}<br>   ${link(p.repo)}`));
      },
    },
    neofetch: {
      desc: 'info del sistema',
      run() {
        const info = [
          `<b>daniel@isla</b>`,
          '───────────',
          `<b>OS:</b> Isla de vóxeles 1.0`,
          `<b>Host:</b> ${esc(profile.alias)} (CRT 14")`,
          `<b>Shell:</b> elsh 0.1`,
          `<b>Lenguajes:</b> ${profile.languages.map(esc).join(', ')}`,
          `<b>Proyectos:</b> ${projects.length}`,
          `<b>Secretos:</b> ${secrets.count}/${secrets.total}`,
        ];
        const rows = Math.max(NEOFETCH_ART.length, info.length);
        for (let i = 0; i < rows; i++) print(`<span class="ok">${esc(NEOFETCH_ART[i] || ' '.repeat(NEOFETCH_ART[0].length))}</span>  ${info[i] || ''}`);
      },
    },
    logros: {
      desc: 'secretos encontrados',
      run() {
        print(`Secretos: <b>${secrets.count}/${secrets.total}</b>`);
        for (const s of secrets.list()) {
          print(s.found ? `  <span class="ok">[✓]</span> ${esc(s.name)}` : `  <span class="dim">[ ] ??? — ${esc(s.hint)}</span>`);
        }
      },
    },
    snake: { desc: 'un clásico', run: () => startSnake() },
    fiesta: { desc: 'activa/desactiva el modo fiesta', run: () => print(onParty() ? '¡Modo fiesta activado! 🎉' : 'Modo fiesta desactivado.') },
    github: {
      desc: 'abre mi GitHub',
      run() {
        print(`Abriendo ${link(profile.github)}…`);
        window.open(profile.github, '_blank', 'noopener');
      },
    },
    echo: { desc: 'repite lo que escribas', run: (args) => print(esc(args.join(' '))) },
    date: { desc: 'fecha y hora', run: () => print(esc(new Date().toLocaleString('es-ES'))) },
    clear: { desc: 'limpia la pantalla', run: () => (out.innerHTML = '') },
    exit: { desc: 'vuelve a la isla', run: () => close() },
    sudo: {
      hidden: true,
      run(args) {
        if (!args.length) return print('uso: sudo &lt;comando&gt;', 'err');
        print('[sudo] contraseña para daniel: ********', 'dim');
        print('daniel no está en el archivo sudoers. Este incidente será reportado. 🚨', 'err');
        if (args.join(' ') === NOTE_CMD) print('…aunque para eso no te hace falta sudo 👀', 'dim');
        secrets.unlock('sudo');
      },
    },
    rm: {
      hidden: true,
      run(args) {
        const line = args.join(' ');
        if (line === NOTE_CMD.slice(3)) return destroyAll();
        const recursive = args.some((a) => /^-[a-z]*r/i.test(a) || a === '--recursive');
        if (recursive && args.includes('/')) {
          if (args.includes('--no-preserve-root')) return print('rm: casi… pero tiene que ser exactamente como en la nota 😉', 'err');
          print("rm: es peligroso operar recursivamente sobre '/'", 'err');
          print('rm: use --no-preserve-root para anular esta protección', 'err');
          return;
        }
        if (!args.length) return print('rm: falta un operando', 'err');
        print('rm: buen intento 😏', 'err');
      },
    },
    vim: { hidden: true, run: () => print('Llevas 3 años intentando salir de vim. Pista: <b>:q!</b>', 'dim') },
    ':q!': { hidden: true, run: () => print('¿Ves? No era tan difícil.', 'ok') },
    cd: { hidden: true, run: () => print('Ya estás en la isla. No hay a dónde ir 🏝️') },
    hola: { hidden: true, run: () => print('¡Hola! 👋 Gracias por pasarte por mi portfolio.') },
  };
  commands.ayuda = { ...commands.help, hidden: true };
  commands.quit = { ...commands.exit, hidden: true };

  // rm -rf --no-preserve-root /: la terminal se va a segundo plano (arriba a la
  // izquierda) y sigue "borrando" el sistema mientras el minijuego arranca ya
  let background = false;
  let streamTimer = null;
  const title = root.querySelector('.term-title');

  function destroyAll() {
    if (background) return;
    background = true;
    field.disabled = true;
    field.blur();
    root.classList.add('term-bg');
    root.setAttribute('aria-modal', 'false');
    title.textContent = 'root@isla: / — rm -rf --no-preserve-root /';
    onClose();
    onDestroy();
    const stream = deletionStream(projects);
    const tick = () => {
      // ráfagas irregulares, como un disco real
      const n = Math.random() < 0.25 ? 2 + Math.floor(Math.random() * 5) : 1;
      for (let k = 0; k < n; k++) print(...rmLine(stream.next().value).map((v, i) => (i === 0 ? esc(v) : v)));
      streamTimer = setTimeout(tick, 70 + Math.random() * 230);
    };
    tick();
  }

  // Termina el modo segundo plano: últimas líneas y, tras una pausa, se oculta
  function finishBackground(lines, hideAfter = 2500) {
    if (!background) return;
    clearTimeout(streamTimer);
    streamTimer = null;
    for (const [text, cls] of lines) print(esc(text), cls);
    setTimeout(() => {
      background = false;
      root.classList.remove('term-bg');
      root.setAttribute('aria-modal', 'true');
      title.textContent = 'daniel@isla: ~';
      field.disabled = false;
      root.hidden = true;
      print('[sistema reinstalado]', 'ok');
    }, hideAfter);
  }

  function run(line) {
    const [name, ...args] = line.trim().split(/\s+/);
    print(`<span class="prompt">daniel@isla:~$</span> ${esc(line)}`);
    if (!name) return;
    const cmd = commands[name.toLowerCase()];
    if (cmd) cmd.run(args);
    else print(`elsh: ${esc(name)}: orden no encontrada. Escribe <b>help</b>.`, 'err');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = field.value;
    field.value = '';
    if (line.trim()) history.push(line);
    histPos = history.length;
    run(line);
  });

  field.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      histPos = Math.max(0, histPos - 1);
      field.value = history[histPos];
    } else if (e.key === 'ArrowDown' && history.length) {
      e.preventDefault();
      histPos = Math.min(history.length, histPos + 1);
      field.value = history[histPos] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = field.value.trim().toLowerCase();
      const matches = Object.keys(commands).filter((n) => !commands[n].hidden && n.startsWith(v));
      if (matches.length === 1) field.value = matches[0] + ' ';
      else if (matches.length > 1) print(matches.join('  '), 'dim');
    }
  });

  root.querySelector('.term-x').addEventListener('click', () => close());
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });

  // ---------- Snake ----------
  const snakeBox = root.querySelector('.snake');
  const canvas = snakeBox.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = snakeBox.querySelector('.snake-score');
  const bestEl = snakeBox.querySelector('.snake-best');
  const msgEl = snakeBox.querySelector('.snake-msg');
  const N = 21;
  const C = canvas.width / N;
  let snake, dir, nextDirs, food, score, alive, timer = null, playing = false;
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {}

  const DIRS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };

  function placeFood() {
    do food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
    while (snake.some(([x, y]) => x === food[0] && y === food[1]));
  }

  function draw() {
    ctx.fillStyle = '#0d2b1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(93,255,138,0.06)';
    for (let i = 0; i < N; i++) for (let j = (i % 2); j < N; j += 2) ctx.fillRect(i * C, j * C, C, C);
    ctx.fillStyle = '#ff7a3d';
    ctx.fillRect(food[0] * C + 3, food[1] * C + 3, C - 6, C - 6);
    snake.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? '#b6ffca' : '#5dff8a';
      ctx.fillRect(x * C + 1, y * C + 1, C - 2, C - 2);
    });
  }

  function resetSnake() {
    snake = [[10, 10], [9, 10], [8, 10]];
    dir = [1, 0];
    nextDirs = [];
    score = 0;
    alive = true;
    placeFood();
    scoreEl.textContent = 'Puntos: 0';
    bestEl.textContent = `Récord: ${best}`;
    msgEl.textContent = 'Flechas / WASD o desliza · Esc para salir';
    draw();
    clearInterval(timer);
    timer = setInterval(step, 120);
  }

  function step() {
    const nd = nextDirs.shift();
    if (nd) dir = nd;
    const head = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
    const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N;
    const hitSelf = snake.slice(0, -1).some(([x, y]) => x === head[0] && y === head[1]);
    if (hitWall || hitSelf) return gameOver();
    snake.unshift(head);
    if (head[0] === food[0] && head[1] === food[1]) {
      score++;
      scoreEl.textContent = `Puntos: ${score}`;
      sfx.eat();
      if (score >= 10) secrets.unlock('snake');
      placeFood();
      // acelera un poco cada 5 puntos
      if (score % 5 === 0) {
        clearInterval(timer);
        timer = setInterval(step, Math.max(60, 120 - score * 3));
      }
    } else snake.pop();
    draw();
  }

  function gameOver() {
    alive = false;
    clearInterval(timer);
    sfx.over();
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {}
      bestEl.textContent = `Récord: ${best}`;
    }
    msgEl.textContent = `Fin de la partida: ${score} puntos · Espacio / toca para repetir · Esc para salir`;
  }

  function queueDir(d) {
    const last = nextDirs[nextDirs.length - 1] || dir;
    if (d[0] === -last[0] && d[1] === -last[1]) return; // no se puede dar media vuelta
    if (d[0] === last[0] && d[1] === last[1]) return;
    if (nextDirs.length < 3) nextDirs.push(d);
  }

  function startSnake() {
    playing = true;
    snakeBox.hidden = false;
    field.blur();
    resetSnake();
  }

  function stopSnake() {
    playing = false;
    clearInterval(timer);
    snakeBox.hidden = true;
    print(`Snake: ${score} puntos (récord ${best}).`, 'dim');
    field.focus();
  }

  window.addEventListener('keydown', (e) => {
    if (root.hidden || !playing) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return stopSnake();
    }
    if (DIRS[e.code]) {
      e.preventDefault();
      if (alive) queueDir(DIRS[e.code]);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!alive) resetSnake();
    }
  }, true);

  let touch = null;
  canvas.addEventListener('pointerdown', (e) => {
    touch = [e.clientX, e.clientY];
    if (!alive) resetSnake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!touch || !alive) return;
    const dx = e.clientX - touch[0], dy = e.clientY - touch[1];
    if (Math.hypot(dx, dy) < 24) return;
    queueDir(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
    touch = [e.clientX, e.clientY];
  });
  canvas.addEventListener('pointerup', () => (touch = null));
  canvas.addEventListener('pointercancel', () => (touch = null));

  // ---------- Abrir / cerrar ----------
  function open() {
    if (!root.hidden) return;
    root.hidden = false;
    onOpen();
    secrets.unlock('terminal');
    if (!booted) {
      booted = true;
      print('elsh 0.1 — la shell de elordenador', 'ok');
      print('Escribe <b>help</b> para ver los comandos. <b>Esc</b> para volver a la isla.', 'dim');
    }
    setTimeout(() => field.focus(), 30);
  }

  function close() {
    if (root.hidden || background) return;
    if (playing) stopSnake();
    root.hidden = true;
    onClose();
  }

  return {
    open,
    close,
    // abierta e interactiva (no cuenta el modo segundo plano)
    get isOpen() {
      return !root.hidden && !background;
    },
    // Una línea del borrado relacionada con el juego (árboles, rocas…)
    removed(path) {
      if (background) print(`eliminado '${esc(path)}'`, 'isla');
    },
    stopRemoving: () => {
      clearTimeout(streamTimer);
      streamTimer = null;
    },
    finishWin: () =>
      finishBackground([
        ["eliminado el directorio '/isla'", 'isla'],
        [`rm: no se puede borrar '/': ${RM_BUSY}`, 'err'],
        ['[ 1337.000000] isla: singularidad detectada en el sector 0', 'err'],
      ], 4600),
    finishLose: () =>
      finishBackground([
        ['[ 1337.000000] Kernel panic - not syncing: Attempted to kill init!', 'err'],
      ], 3200),
  };
}
