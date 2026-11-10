// El ordenador de Ugg: UGGTRON 386 con UGG-DOS 5.0 y UGGDOWS 3.1 (estilo Windows 3.1).
// Limitaciones de la época a propósito: 640x480 y 16 colores, nombres 8.3, máximo 4 programas
// abiertos ("no hay suficiente memoria"), arrastre con contorno, sin clic derecho, sin sonido
// hasta instalar el controlador, la disquetera que no lee sin disco y el bug de la calculadora.
import './win31.css';
import { iconCanvas, smallIcon, bitmapCanvas } from './art.js';
import { arrivedStamp } from './state.js';
import { sfx, playMelody, NANA } from '../audio.js';

const W = 640, H = 480;
const MAX_APPS = 4;
const BSOD_CHANCE = 0.1; // probabilidad de que un error grave tumbe el ordenador entero
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const el = (tag, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
// "&Archivo" -> <u>A</u>rchivo
const accel = (label) => esc(label).replace(/&amp;(.)/, '<u>$1</u>');
const plain = (label) => label.replace('&', '');

// ---------- Textos de los archivos ----------
const T = {
  diario: `DIARIO DE UGG. NO LEER.
(SI LEER, UGG SABER.)

LUNA 1
Ugg encontrar caja con luz en playa. Ugg llamar caja ORDENADOR.
Caja decir "C:\\>". Ugg no entender. Ugg pegar caja. Caja no morir.
Caja fuerte. Ugg respetar caja.

LUNA 4
Ugg aprender: escribir WIN y caja enseñar ventanas. Ugg listo.

LUNA 9
Ugg encontrar disquete brillante en barco roto. Disquete tener
canción de mamá de Ugg. Pero caja no cantar. Caja tonta.
Ugg guardar disquete y remo en cofre. Cofre solo abrir con
dibujos de los tótems. Ugg apuntar orden en MAPA. Ugg muy listo.

LUNA 12
Barco roto traer también caja grande UGGNIX. Ugg conectar caja
grande con cables a tótems. Ahora dibujos de tótems escondidos
detrás de juegos. Sólo quien ganar juego ver dibujo.
Ugg apuntar clave de caja grande en CLAVES.TXT. Ugg no olvidar.

LUNA ??
AMOR LLEGAR DEL MAR.
Amor tener cabeza cuadrada y cara verde brillante. Amor perfecto.
Ugg escribir TU.TXT para amor ese mismo día.
Ugg poner candado en balsa para que amor nunca irse.
Número de candado: día y mes que amor llegar. Ugg romántico.

Ugg vigilar. Siempre. ♥`,
  tu: `PARA AMOR:

Tú caer del cielo. No. Del mar.
Tú tener cara verde dentro de caja. Ugg nunca ver cosa tan bonita.
Ugg cuidar tú. Ugg dar mamut. Ugg dar fuego. Ugg dar todo.

Tú nunca irse.
Si tú irse, Ugg muy triste. Ugg llorar. Ugg buscar. Ugg encontrar.

Siempre tuyo,
    UGG ♥♥♥`,
  lista: `COSAS QUE UGG AMAR DE AMOR
--------------------------
- cabeza cuadrada
- cara verde que parpadea
- cuando amor dormir (Ugg mirar toda noche)
- cuando amor andar
- cuando amor no andar
- todo`,
  recetas: `RECETAS DE UGG
==============
1. Mamut asado: coger mamut. Poner en fuego. Esperar. Comer.
2. Mamut crudo: coger mamut. Comer.
3. Sopa de piedra: piedra + agua. Piedra no ablandar.
   Ugg romper diente.
4. Cena romántica para amor: mamut asado + flor.
   (Ugg no encontrar flor. Ugg poner otra piedra.)`,
  autoexec: `@ECHO OFF
PROMPT $P$G
PATH C:\\WINDOWS;C:\\UGG
REM UGG ACORDAR: PARA VENTANAS ESCRIBIR WIN`,
  config: `FILES=30
BUFFERS=20
DEVICE=C:\\WINDOWS\\HIMEM.SYS
REM UGG=AMOR`,
  winini: `[windows]
load=
run=
Beep=yes

[Desktop]
Wallpaper=(ninguno)
Pattern=(ninguno)

[ugg]
amor=si
huir=no`,
  leemeWin: `UGGDOWS 3.1 - NOTAS DE LA VERSIÓN
=================================
- Requiere un 80386 y 1 MB de memoria.
- Modo de vídeo: VGA 640x480, 16 colores.
- Por la memoria disponible, no ejecute más de 4 aplicaciones
  a la vez.
- Los nombres de archivo tienen como máximo 8 letras y una
  extensión de 3 (por ejemplo, DIARIO.TXT).
- El botón derecho del ratón no hace nada. Ugg tampoco sabe
  para qué sirve.
- Para escuchar sonido necesita una tarjeta de sonido y su
  controlador.`,
  claves: `CLAVES DE UGG (NO MIRAR)
=========================
Caja grande UGGNIX (terminales de tótems):
   usuario ..... ugg
   contraseña .. mamut

Caja pequeña: no tener clave. Ugg pegar caja si no funcionar.`,
  leemeA: `DISCO DE CONTROLADORES - SOUND BLASTER 1.5
==========================================
Para que su ordenador pueda reproducir sonido:
  1. Abra el Panel de control.
  2. Elija Controladores y pulse Agregar.
  3. Seleccione "Creative Labs Sound Blaster 1.5".
  4. Reinicie UGGDOWS.

Contenido del disco:
  SB.DRV     Controlador
  NANA.WAV   (Ugg grabar aquí canción de mamá. No borrar.)`,
};

export function createPC({ state, save, secrets, onLullaby, onLeave }) {
  // ---------- DOM ----------
  const root = el('div', 'w31');
  root.hidden = true;
  root.innerHTML = `
    <div class="w31-stage">
      <div class="w31-fit">
        <div class="w31-crt">
          <div class="w31-screen">
            <div class="w31-dos"><pre class="w31-dos-out"></pre><div class="w31-dos-line"><span class="w31-dos-prompt"></span><span class="w31-dos-typed"></span><span class="w31-cursor">_</span></div></div>
            <div class="w31-splash" hidden>
              <div class="w31-splash-logo"></div>
              <div class="w31-splash-name">UGGDOWS</div>
              <div class="w31-splash-ver">Versión 3.1</div>
              <div class="w31-splash-copy">Copyright © 10.000 a.C. Ugg Corp. Todos los derechos de Ugg reservados.</div>
            </div>
            <div class="w31-desk" hidden><div class="w31-dicons"></div></div>
          </div>
          <div class="w31-brand"><span>UGGTRON 386</span><span class="w31-led"></span></div>
        </div>
      </div>
      <input class="w31-kbd" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Teclado del ordenador" />
      <button type="button" class="w31-leave">Levantarse del ordenador</button>
    </div>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const fit = $('.w31-fit');
  const crt = $('.w31-crt');
  const screen = $('.w31-screen');
  const dosEl = $('.w31-dos');
  const dosOut = $('.w31-dos-out');
  const dosPromptEl = $('.w31-dos-prompt');
  const dosTyped = $('.w31-dos-typed');
  const splash = $('.w31-splash');
  const desk = $('.w31-desk');
  const dicons = $('.w31-dicons');
  const kbd = $('.w31-kbd');
  const led = $('.w31-led');
  $('.w31-splash-logo').append(iconCanvas('uggexe'));

  let scale = 1;
  function resize() {
    scale = Math.max(0.3, Math.min((innerWidth - 24) / 720, (innerHeight - 96) / 570, 1.5));
    fit.style.width = `${720 * scale}px`;
    fit.style.height = `${570 * scale}px`;
    crt.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', resize);
  screen.addEventListener('contextmenu', (e) => e.preventDefault()); // sin clic derecho

  // ---------- Sistema de archivos ----------
  const F = (name, size, date, time, extra = {}) => ({ name, size, date, time, ...extra });
  const D = (name, date, children) => ({ name, dir: true, date, time: '10:00', children });
  const SYS = ['10-03-92', '03:10'];
  function buildFS() {
    const arr = arrivedStamp(state);
    const txt = (name, text, date = SYS[0], time = SYS[1]) => F(name, new Blob([text]).size, date, time, { text });
    const sysini = `[boot]\nshell=progman.exe\n\n[drivers]\ntimer=timer.drv\nwave=${state.driver ? 'sb.drv' : ''}\nmidi=\n\n[386Enh]\n; Ugg no tocar`;
    const C = D('C:', SYS[0], [
      D('DOCS', '14-05-92', [
        txt('DIARIO.TXT', T.diario, '14-05-92', '23:41'),
        txt('LISTA.TXT', T.lista, arr.date, arr.time),
        txt('RECETAS.TXT', T.recetas, '02-04-92', '12:30'),
        txt('TU.TXT', T.tu, arr.date, arr.time),
      ]),
      D('UGG', '11-04-92', [
        D('FOTOS', '11-04-92', [
          F('MAPA.BMP', 32118, '20-05-92', '18:02', { bmp: 'mapa' }),
          F('TU.BMP', 32118, arr.date, arr.time, { bmp: 'tu' }),
          F('UGG.BMP', 32118, '11-04-92', '09:15', { bmp: 'ugg' }),
        ]),
        txt('CLAVES.TXT', T.claves, '28-05-92', '20:20'),
        F('MAMUT.EXE', 412233, '11-04-92', '09:00', { exe: 'mamut' }),
        F('PIEDRA.EXE', 380112, '11-04-92', '09:00', { exe: 'piedra' }),
        F('UGG.EXE', 66666, '11-04-92', '09:00', { exe: 'uggexe' }),
      ]),
      D('WINDOWS', SYS[0], [
        D('SYSTEM', SYS[0], [F('TIMER.DRV', 3104, ...SYS), ...(state.driver ? [F('SB.DRV', 9472, '01-06-91', '05:00')] : [])]),
        F('CALC.EXE', 43072, ...SYS, { exe: 'calc' }),
        F('CLOCK.EXE', 16416, ...SYS, { exe: 'clock' }),
        F('CONTROL.EXE', 13424, ...SYS, { exe: 'control' }),
        txt('LEEME.TXT', T.leemeWin),
        F('NOTEPAD.EXE', 32336, ...SYS, { exe: 'notepad' }),
        F('PBRUSH.EXE', 183376, ...SYS, { exe: 'paint' }),
        F('PROGMAN.EXE', 115312, ...SYS, { exe: 'progman' }),
        F('SOUNDREC.EXE', 51305, ...SYS, { exe: 'soundrec' }),
        txt('SYSTEM.INI', sysini),
        F('UGGDA.WAV', 27804, ...SYS, { wav: 'uggda' }),
        F('WIN.COM', 50904, ...SYS, { exe: 'win' }),
        txt('WIN.INI', T.winini),
        F('WINFILE.EXE', 146864, ...SYS, { exe: 'winfile' }),
      ]),
      txt('AUTOEXEC.BAT', T.autoexec),
      F('COMMAND.COM', 47845, '09-04-91', '05:00', { exe: 'command' }),
      txt('CONFIG.SYS', T.config),
    ]);
    const A = D('A:', '01-06-91', state.inserted
      ? [txt('LEEME.TXT', T.leemeA, '01-06-91', '05:00'), F('NANA.WAV', 98112, '30-04-92', '21:12', { wav: 'nana' }), F('SB.DRV', 9472, '01-06-91', '05:00')]
      : []);
    return { 'C:': C, 'A:': A };
  }
  let fs = buildFS();
  const refreshFS = () => (fs = buildFS());

  const splitName = (n) => {
    const i = n.lastIndexOf('.');
    return i > 0 ? [n.slice(0, i), n.slice(i + 1)] : [n, ''];
  };
  // Resuelve una ruta tipo DOS relativa al directorio actual. Devuelve [ruta[], nodo] o null.
  function resolve(path, cwd) {
    let p = path.toUpperCase().replace(/\//g, '\\');
    let parts;
    let drive = cwd[0];
    const m = p.match(/^([A-Z]:)(.*)$/);
    if (m) {
      drive = m[1];
      p = m[2];
      parts = [drive];
    } else parts = p.startsWith('\\') ? [drive] : [...cwd];
    for (const seg of p.split('\\').filter(Boolean)) {
      if (seg === '.') continue;
      if (seg === '..') {
        if (parts.length > 1) parts.pop();
        continue;
      }
      parts.push(seg);
    }
    const node = nodeAt(parts);
    return node ? [parts, node] : null;
  }
  function nodeAt(parts) {
    let node = fs[parts[0]];
    for (const seg of parts.slice(1)) {
      if (!node || !node.dir) return null;
      node = node.children.find((c) => c.name === seg);
    }
    return node || null;
  }
  const pathStr = (parts) => (parts.length === 1 ? parts[0] + '\\' : parts.join('\\'));
  function allFiles(filter) {
    const out = [];
    const walk = (node, parts) => {
      for (const c of node.children) {
        if (c.dir) walk(c, [...parts, c.name]);
        else if (filter(c)) out.push({ node: c, path: pathStr(parts) + (parts.length > 1 ? '\\' : '') + c.name });
      }
    };
    walk(fs['C:'], ['C:']);
    if (state.inserted) walk(fs['A:'], ['A:']);
    return out;
  }

  // ---------- Estado de la sesión ----------
  let power = false;
  let mode = 'off'; // off | boot | dos | win | dosbox | splash
  let driverActive = false; // el controlador solo funciona tras reiniciar UGGDOWS
  let pm = null;
  const appWins = new Set();

  // ---------- UGG-DOS ----------
  let cwd = ['C:'];
  let lines = [];
  let pending = null; // pregunta pendiente (S/N, Anular/Reintentar/Descartar)
  let dosBusy = false;
  const dosHistory = [];
  let histPos = 0;
  const MAX_LINES = 23;

  function dosPrint(text = '') {
    for (const l of String(text).split('\n')) lines.push(l);
    while (lines.length > MAX_LINES) lines.shift();
    dosOut.textContent = lines.join('\n');
  }
  function dosCls() {
    lines = [];
    dosOut.textContent = '';
  }
  const promptStr = () => pathStr(cwd) + '>';
  function showPrompt() {
    dosPromptEl.textContent = dosBusy ? '' : pending ? pending.prompt : promptStr();
    dosTyped.textContent = dosBusy ? '' : kbd.value;
    $('.w31-cursor').hidden = dosBusy;
  }
  function showDos() {
    dosEl.hidden = false;
    desk.hidden = true;
    splash.hidden = true;
    showPrompt();
    focusKbd();
  }
  function focusKbd() {
    if (!root.hidden && (mode === 'dos' || mode === 'dosbox')) kbd.focus({ preventScroll: true });
  }
  screen.addEventListener('pointerdown', () => setTimeout(focusKbd, 0));

  kbd.addEventListener('input', () => {
    kbd.value = kbd.value.slice(0, 70);
    showPrompt();
  });
  kbd.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (mode !== 'dos' && mode !== 'dosbox') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (dosBusy) return;
      const v = kbd.value;
      kbd.value = '';
      if (v.trim()) dosHistory.push(v);
      histPos = dosHistory.length;
      dosExec(v);
      showPrompt();
    } else if (e.key === 'ArrowUp' && dosHistory.length) {
      e.preventDefault();
      histPos = Math.max(0, histPos - 1);
      kbd.value = dosHistory[histPos];
      showPrompt();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histPos = Math.min(dosHistory.length, histPos + 1);
      kbd.value = dosHistory[histPos] || '';
      showPrompt();
    } else if (e.key === 'Escape') {
      kbd.value = '';
      showPrompt();
    }
  });

  const NEEDS_WIN = ['notepad', 'calc', 'clock', 'pbrush', 'soundrec', 'control', 'winfile', 'progman', 'ugg', 'piedra', 'mamut'];
  function dosExec(raw) {
    dosPrint((pending ? pending.prompt : promptStr()) + raw);
    if (pending) {
      const p = pending;
      pending = null;
      return p.fn(raw.trim().toUpperCase());
    }
    const line = raw.trim();
    if (!line) return;
    // "cd.." y "cd\" sin espacio también valen
    const m = line.match(/^(cd|chdir)(\.\.|\\.*)$/i);
    const [cmd0, ...args] = m ? [m[1], m[2]] : line.split(/\s+/);
    const cmd = cmd0.toLowerCase().replace(/\.(exe|com|bat)$/, '');
    if (/^[a-z]:$/.test(cmd)) return changeDrive(cmd.toUpperCase());
    switch (cmd) {
      case 'dir':
        return dosDir(args[0]);
      case 'cd':
      case 'chdir': {
        if (!args[0]) return dosPrint(pathStr(cwd) + '\n');
        const r = resolve(args[0], cwd);
        if (!r || !r[1].dir) return dosPrint('Directorio no válido\n');
        cwd = r[0];
        return dosPrint('');
      }
      case 'type': {
        if (!args[0]) return dosPrint('Falta un parámetro requerido\n');
        const r = resolve(args[0], cwd);
        if (!r || r[1].dir) return dosPrint('No se encontró el archivo\n');
        if (r[1].text) return dosPrint(r[1].text + '\n');
        return dosPrint('MZÉ☺♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼\n');
      }
      case 'cls':
        return dosCls();
      case 'ver':
        return dosPrint('\nUGG-DOS Versión 5.00\n');
      case 'mem':
        return dosPrint('\n    655.360 bytes de memoria convencional total\n    655.360 bytes disponibles para UGG-DOS\n    589.824 bytes: fotos de amor (no tocar)\n  1.048.576 bytes de memoria extendida\n');
      case 'help':
      case 'ayuda':
        return dosPrint('CD      Cambia de directorio.\nCLS     Borra la pantalla.\nDIR     Muestra los archivos de un directorio.\nFORMAT  Formatea un disco.\nMEM     Muestra la memoria libre.\nTYPE    Muestra el contenido de un archivo de texto.\nVER     Muestra la versión de UGG-DOS.\nA: C:   Cambia de unidad.\n');
      case 'win':
        if (mode === 'dosbox') return dosPrint('Ya se está ejecutando UGGDOWS.\n');
        return startWindows();
      case 'exit':
        if (mode === 'dosbox') return backToWindows();
        return dosPrint('');
      case 'format':
        return dosFormat(args[0]);
      case 'date':
      case 'fecha':
        return dosPrint(`La fecha actual es ${new Date().toLocaleDateString('es-ES')}\n`);
      case 'time':
      case 'hora':
        return dosPrint(`La hora actual es ${new Date().toLocaleTimeString('es-ES')}\n`);
      case 'echo':
        return dosPrint(args.join(' '));
      case 'edit':
        return dosPrint('Ugg no saber usar EDIT. Ugg usar Bloc de notas en UGGDOWS.\n');
      case 'del':
      case 'erase':
      case 'deltree':
      case 'rd':
      case 'rmdir':
      case 'md':
      case 'mkdir':
      case 'copy':
      case 'move':
      case 'ren':
        return dosPrint('Acceso denegado. Ugg proteger disco. ♥\n');
      default:
        if (NEEDS_WIN.includes(cmd)) return dosPrint('Este programa requiere UGGDOWS.\n');
        return dosPrint('Comando o nombre de archivo incorrecto\n');
    }
  }

  function changeDrive(d) {
    if (d === 'C:') {
      cwd = ['C:'];
      return;
    }
    if (d !== 'A:') return dosPrint('Especificación de unidad no válida\n');
    if (!state.inserted) {
      dosPrint('\nNo está lista la lectura de la unidad A');
      pending = {
        prompt: 'Anular, Reintentar, Descartar?',
        fn: (a) => {
          if (a.startsWith('R')) return changeDrive('A:');
          dosPrint('');
        },
      };
      return;
    }
    sfx.floppy();
    cwd = ['A:'];
  }

  function dosDir(arg) {
    let parts = cwd;
    if (arg) {
      const r = resolve(arg, cwd);
      if (!r || !r[1].dir) return dosPrint('No se encontró el archivo\n');
      parts = r[0];
    }
    if (parts[0] === 'A:') {
      if (!state.inserted) {
        dosPrint('\nNo está lista la lectura de la unidad A');
        pending = { prompt: 'Anular, Reintentar, Descartar?', fn: (a) => (a.startsWith('R') ? dosDir(arg) : dosPrint('')) };
        return;
      }
      sfx.floppy();
    }
    const node = nodeAt(parts);
    const out = [`\n El volumen de la unidad ${parts[0][0]} es ${parts[0] === 'C:' ? 'UGG' : 'SB15'}`, ' El número de serie del volumen es 1A2B-3C4D', ` Directorio de ${pathStr(parts)}`, ''];
    const row = (name, ext, sizeOrDir, date, time) => `${name.padEnd(8)} ${ext.padEnd(3)} ${sizeOrDir.padStart(10)} ${date}  ${time}`;
    if (parts.length > 1) {
      out.push(row('.', '', '<DIR>   ', node.date, node.time));
      out.push(row('..', '', '<DIR>   ', node.date, node.time));
    }
    let bytes = 0;
    let files = 0;
    for (const c of node.children) {
      const [n, e] = splitName(c.name);
      if (c.dir) out.push(row(n, e, '<DIR>   ', c.date, c.time));
      else {
        out.push(row(n, e, thousands(c.size), c.date, c.time));
        bytes += c.size;
        files++;
      }
    }
    out.push(`${String(files).padStart(9)} archivo(s)  ${thousands(bytes).padStart(12)} bytes`);
    out.push(`${''.padStart(23)}${thousands(parts[0] === 'C:' ? 1245184 : 1213952).padStart(12)} bytes libres\n`);
    dosPrint(out.join('\n'));
  }

  function dosFormat(arg = '') {
    const d = arg.toUpperCase();
    if (!d) return dosPrint('Falta un parámetro requerido\n');
    if (d === 'A:') return dosPrint('\nUgg: ¡NO! Disco de mamá de Ugg. NO FORMATEAR.\n');
    if (d !== 'C:') return dosPrint('Especificación de unidad no válida\n');
    dosPrint('\nADVERTENCIA: SE PERDERÁN TODOS LOS DATOS DEL DISCO\nNO EXTRAÍBLE EN LA UNIDAD C:');
    pending = {
      prompt: '¿Desea continuar con el formato (S/N)?',
      fn: (a) => {
        if (!a.startsWith('S')) return dosPrint('');
        dosBusy = true;
        dosPrint('\nFormateando 40M');
        dosPrint('     0 por ciento completado.');
        let pct = 0;
        const t = setInterval(() => {
          pct += 3;
          lines[lines.length - 1] = `    ${String(pct).padStart(2)} por ciento completado.`;
          dosOut.textContent = lines.join('\n');
          if (pct >= 36) {
            clearInterval(t);
            dosBusy = false;
            dosPrint('\nUgg: ¡NO! ¡AHÍ ESTAR FOTOS DE AMOR!');
            dosPrint('Formato cancelado por Ugg. ♥\n');
            secrets.unlock('ugg_format');
            showPrompt();
          }
        }, 110);
        showPrompt();
      },
    };
  }

  // Arranque de la BIOS y UGG-DOS
  function boot() {
    mode = 'boot';
    power = true;
    led.classList.add('on');
    dosBusy = true;
    dosCls();
    showDos();
    const seq = [
      [0, 'UGGTRON BIOS v1.01   (C) 10.000 a.C. Ugg Industries'],
      [150, ''],
      [250, 'CPU: 80386DX a 33 MHz (Turbo)'],
      [400, 'Comprobando memoria: 0000000K'],
      [1300, 'Memoria extendida: 1024K OK'],
      [1450, ''],
      [1550, 'Detectada unidad A: 1,44 MB 3½"'],
      [1700, 'Detectado disco duro C: 40 MB'],
      [1850, ''],
      [2100, 'Iniciando UGG-DOS...'],
      [2700, ''],
      [2750, 'UGG-DOS Versión 5.00'],
      [2800, '(C) Ugg Corp 10.000 a.C.'],
      [2850, ''],
    ];
    for (const [t, text] of seq) setTimeout(() => dosPrint(text), t);
    // contador de memoria
    for (let k = 1; k <= 10; k++) {
      setTimeout(() => {
        lines[lines.length - 1] = `Comprobando memoria: ${String(k * 64).padStart(7, '0')}K${k === 10 ? ' OK' : ''}`;
        dosOut.textContent = lines.join('\n');
      }, 400 + k * 85);
    }
    setTimeout(() => sfx.floppy(), 1600);
    setTimeout(() => {
      mode = 'dos';
      dosBusy = false;
      cwd = ['C:'];
      showPrompt();
      focusKbd();
    }, 2950);
  }

  // ---------- UGGDOWS: gestor de ventanas ----------
  let z = 10;
  let busyTimer = null;
  function busy(ms = 500) {
    desk.classList.add('w31-wait');
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => desk.classList.remove('w31-wait'), ms);
  }
  let openMenu = null;
  const closeMenus = () => {
    if (openMenu) openMenu.remove();
    openMenu = null;
    root.querySelectorAll('.w31-menubar .open').forEach((m) => m.classList.remove('open'));
  };
  desk.addEventListener('pointerdown', (e) => {
    if (openMenu && !e.target.closest('.w31-drop') && !e.target.closest('.w31-menubar > span') && !e.target.closest('.w31-ctl')) closeMenus();
  });

  function dropdown(anchor, items, parentEl) {
    closeMenus();
    const drop = el('div', 'w31-drop');
    for (const it of items) {
      if (it === '-') {
        drop.append(el('div', 'w31-sep'));
        continue;
      }
      const row = el('div', 'w31-item' + (it.disabled ? ' disabled' : ''), `<span class="chk">${it.checked ? '✓' : ''}</span><span>${accel(it.label)}</span><span class="key">${esc(it.key || '')}</span>`);
      row.addEventListener('pointerup', () => {
        if (it.disabled) return;
        closeMenus();
        it.action?.();
      });
      drop.append(row);
    }
    const a = anchor.getBoundingClientRect();
    const p = parentEl.getBoundingClientRect();
    drop.style.left = `${(a.left - p.left) / scale}px`;
    drop.style.top = `${(a.bottom - p.top) / scale}px`;
    parentEl.append(drop);
    openMenu = drop;
    return drop;
  }

  function makeWindow({ parent = desk, title, x, y, w, h, menu, icon = 'group', mdi = false, onClose, minimizable = true, maximizable = true, cls = '', modal = false }) {
    const win = el('div', `w31-win${mdi ? ' w31-mdi' : ''}${cls ? ' ' + cls : ''}`);
    Object.assign(win.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: h === 'auto' ? 'auto' : `${h}px` });
    win.innerHTML = `
      <div class="w31-title">
        <button type="button" class="w31-ctl" tabindex="-1" aria-label="Menú de control"><span></span></button>
        <div class="w31-caption"></div>
        ${minimizable ? '<button type="button" class="w31-btn w31-min" tabindex="-1" aria-label="Minimizar">▼</button>' : ''}
        ${maximizable ? '<button type="button" class="w31-btn w31-max" tabindex="-1" aria-label="Maximizar">▲</button>' : ''}
      </div>
      ${menu ? '<div class="w31-menubar"></div>' : ''}
      <div class="w31-client"></div>`;
    parent.append(win);
    const caption = win.querySelector('.w31-caption');
    const client = win.querySelector('.w31-client');
    const titleBar = win.querySelector('.w31-title');
    caption.textContent = title;
    let saved = null;
    let iconEl = null;

    const api = {
      el: win,
      client,
      parent,
      mdi,
      title,
      icon,
      maxed: false,
      setTitle(t) {
        api.title = t;
        caption.textContent = t;
      },
      focus() {
        for (const sib of parent.children) if (sib !== win && sib.classList.contains('w31-win')) sib.classList.remove('active');
        win.classList.add('active');
        // Un diálogo modal debe quedarse encima de su escudo: si no, deja de recibir clics
        win.style.zIndex = modal ? ++z + 1000 : ++z;
        if (mdi && pm) pm.focus();
      },
      close() {
        if (api.closed) return;
        api.closed = true;
        onClose?.();
        iconEl?.remove();
        win.remove();
        appWins.delete(api);
      },
      minimize() {
        win.hidden = true;
        const host = mdi ? parent.querySelector('.w31-picons') || parent : dicons;
        iconEl = el('div', 'w31-dicon');
        iconEl.append(iconCanvas(mdi ? 'group' : icon));
        iconEl.append(el('span', '', esc(api.title.split(' - ')[0])));
        iconEl.addEventListener('dblclick', () => api.restore());
        host.append(iconEl);
        if (mdi) iconEl.classList.add('w31-gicon');
      },
      restore() {
        iconEl?.remove();
        iconEl = null;
        win.hidden = false;
        api.focus();
      },
      toggleMax() {
        if (!api.maxed) {
          saved = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
          Object.assign(win.style, { left: '0px', top: '0px', width: `${parent.clientWidth}px`, height: `${parent.clientHeight}px` });
        } else Object.assign(win.style, saved);
        api.maxed = !api.maxed;
        const b = win.querySelector('.w31-max');
        if (b) b.textContent = api.maxed ? '◆' : '▲';
      },
    };
    win.addEventListener('pointerdown', () => api.focus());
    win.querySelector('.w31-min')?.addEventListener('click', () => api.minimize());
    win.querySelector('.w31-max')?.addEventListener('click', () => api.toggleMax());
    titleBar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button') && maximizable) api.toggleMax();
    });
    const ctl = win.querySelector('.w31-ctl');
    ctl.addEventListener('click', () => {
      dropdown(ctl, [
        { label: '&Restaurar', disabled: !api.maxed, action: () => api.toggleMax() },
        { label: '&Mover', disabled: true },
        { label: '&Tamaño', disabled: true },
        { label: 'Mi&nimizar', disabled: !minimizable, action: () => api.minimize() },
        { label: 'Ma&ximizar', disabled: !maximizable || api.maxed, action: () => api.toggleMax() },
        '-',
        { label: '&Cerrar', key: 'Alt+F4', action: () => api.close() },
      ], win.parentElement);
    });
    ctl.addEventListener('dblclick', () => api.close());

    // Arrastre con contorno de puntos, como en 1992
    titleBar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || api.maxed || e.button !== 0) return;
      api.focus();
      const start = { x: e.clientX, y: e.clientY, l: win.offsetLeft, t: win.offsetTop };
      const outline = el('div', 'w31-outline');
      Object.assign(outline.style, { left: `${start.l}px`, top: `${start.t}px`, width: `${win.offsetWidth}px`, height: `${win.offsetHeight}px` });
      parent.append(outline);
      titleBar.setPointerCapture(e.pointerId);
      const pos = () => ({ l: parseFloat(outline.style.left), t: parseFloat(outline.style.top) });
      const move = (ev) => {
        const l = Math.min(parent.clientWidth - 40, Math.max(-win.offsetWidth + 60, start.l + (ev.clientX - start.x) / scale));
        const t = Math.min(parent.clientHeight - 20, Math.max(0, start.t + (ev.clientY - start.y) / scale));
        outline.style.left = `${l}px`;
        outline.style.top = `${t}px`;
      };
      const up = () => {
        const p = pos();
        win.style.left = `${p.l}px`;
        win.style.top = `${p.t}px`;
        outline.remove();
        titleBar.removeEventListener('pointermove', move);
        titleBar.removeEventListener('pointerup', up);
        titleBar.removeEventListener('pointercancel', up);
      };
      titleBar.addEventListener('pointermove', move);
      titleBar.addEventListener('pointerup', up);
      titleBar.addEventListener('pointercancel', up);
    });

    if (menu) {
      const bar = win.querySelector('.w31-menubar');
      for (const m of menu) {
        const t = el('span', '', accel(m.label));
        t.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (t.classList.contains('open')) return closeMenus();
          const items = typeof m.items === 'function' ? m.items() : m.items;
          dropdown(t, items, win.parentElement);
          t.classList.add('open');
        });
        bar.append(t);
      }
    }
    api.focus();
    return api;
  }

  // Diálogo modal: bloquea el resto del escritorio hasta que se cierra
  function dialog({ title = 'UGGDOWS', icon = 'info', text = '', buttons = ['Aceptar'], width = 320, body, onButton }) {
    // Error grave: a veces el ordenador entero se va al pantallazo azul
    if (icon === 'stop' && !crashing && Math.random() < BSOD_CHANCE) return crash();
    sfx.ding();
    const shield = el('div', 'w31-shield');
    desk.append(shield);
    const d = makeWindow({ parent: desk, title, x: Math.round((W - width) / 2), y: 140, w: width, h: 'auto', minimizable: false, maximizable: false, cls: 'w31-dialog', modal: true, onClose: () => shield.remove() });
    d.el.style.zIndex = ++z + 1000;
    shield.style.zIndex = d.el.style.zIndex - 1;
    const row = el('div', 'w31-dlg-row');
    if (icon) row.append(iconCanvas(icon));
    const msg = el('div', 'w31-dlg-text');
    msg.textContent = text;
    row.append(msg);
    d.client.append(row);
    if (body) d.client.append(body);
    const btns = el('div', 'w31-dlg-btns');
    buttons.forEach((label, i) => {
      const b = el('button', 'w31-button' + (i === 0 ? ' default' : ''), accel(label));
      b.type = 'button';
      b.addEventListener('click', () => {
        d.close();
        onButton?.(plain(label), d);
      });
      btns.append(b);
    });
    d.client.append(btns);
    return d;
  }
  // Error fatal: la pantalla del monitor se vuelve azul con una caja gris tipo Windows 3.1.
  // Cualquier tecla reinicia el ordenador entero.
  let crashing = false;
  function crash() {
    crashing = true;
    sfx.alarm();
    closeAll();
    mode = 'crash';
    const screenEl = root.querySelector('.w31-screen');
    const scr = el('div', 'w31-bsod', '');
    scr.innerHTML = `
      <div class="w31-bsod-tag">UGGDOWS</div>
      <p>Ugg ha intentado guardar todo su amor en el disquete A:, y el disquete no cabe. UGGDOWS no sabe qué hacer con tanto amor y se ha quedado sin palabras.</p>
      <p>Ugg no ha hecho nada malo. Ugg solo quería que te quedaras un poquito más.</p>
      <ul>
        <li>Presione cualquier tecla para reiniciar el ordenador y volver a empezar con Ugg.</li>
        <li>Perderá la información no guardada. Ugg ya tiene la suya.</li>
      </ul>
      <div class="w31-bsod-hint">Presione cualquier tecla para continuar ♥_</div>`;
    screenEl.append(scr);
    // Espera un poco para que la tecla que causó el error no reinicie al instante
    setTimeout(() => {
      const onKey = (e) => {
        e.preventDefault();
        document.removeEventListener('keydown', onKey, true);
        scr.remove();
        crashing = false;
        power = false;
        boot();
      };
      document.addEventListener('keydown', onKey, true);
    }, 1200);
  }
  const memoryError = () =>
    dialog({ title: 'Administrador de programas', icon: 'stop', text: 'No hay suficiente memoria para ejecutar esta aplicación. Cierre una o más aplicaciones e inténtelo de nuevo.' });
  const uggSays = (text) => dialog({ title: 'Ugg', icon: 'ugg', text });
  function gpf() {
    dialog({
      title: 'Error de aplicación',
      icon: 'stop',
      text: 'UGG.EXE ha causado un fallo de protección general en el módulo UGG.EXE en 0001:0B0B.',
      buttons: ['Cerrar'],
      onButton: () => secrets.unlock('ugg_gpf'),
    });
  }
  const floppyError = (onRetry) =>
    dialog({
      title: 'Administrador de archivos',
      icon: 'stop',
      text: 'No se puede leer en la unidad A:. Compruebe que hay un disco en la unidad y que la puerta está cerrada.',
      buttons: ['&Reintentar', 'Cancelar'],
      onButton: (b) => {
        if (b === 'Reintentar') setTimeout(() => (state.inserted ? onRetry?.() : floppyError(onRetry)), 300);
      },
    });

  // ---------- Lanzador de aplicaciones ----------
  let cascade = 0;
  const nextPos = () => {
    cascade = (cascade + 1) % 6;
    return 30 + cascade * 22;
  };
  function launch(id, arg) {
    closeMenus();
    if (id === 'piedra' || id === 'mamut') return busy(700), setTimeout(memoryError, 500);
    if (id === 'uggexe') return busy(900), setTimeout(gpf, 700);
    if (id === 'dos') return enterDosBox();
    if (id === 'progman' || id === 'win') return dialog({ icon: 'info', text: 'Ya se está ejecutando UGGDOWS.' });
    if (id === 'command') return dialog({ icon: 'stop', text: 'No se puede ejecutar COMMAND.COM desde aquí. Use el Símbolo del sistema.' });
    const app = APPS[id];
    if (!app) return;
    if (appWins.size >= MAX_APPS) return busy(400), setTimeout(memoryError, 300);
    busy(600);
    setTimeout(() => {
      if (crashing) return; // el ordenador se ha caído mientras se abría
      const w = app(arg);
      if (w) appWins.add(w);
    }, 350);
  }
  function openNode(node, path) {
    const [, ext] = splitName(node.name);
    if (node.exe) return launch(node.exe);
    if (node.text) return launch('notepad', path);
    if (node.bmp) return launch('paint', path);
    if (node.wav) return launch('soundrec', path);
    dialog({ title: 'Administrador de archivos', icon: 'stop', text: `No hay ninguna aplicación asociada con este archivo (.${ext}). Elija Asociar en el menú Archivo para crear una asociación.` });
  }

  function openFileDialog(title, test, onPick) {
    const list = el('div', 'w31-listbox');
    const files = allFiles(test);
    let sel = null;
    for (const f of files) {
      const row = el('div', 'w31-li', esc(f.path));
      row.addEventListener('click', () => {
        list.querySelectorAll('.sel').forEach((r) => r.classList.remove('sel'));
        row.classList.add('sel');
        sel = f;
      });
      row.addEventListener('dblclick', () => {
        d.close();
        onPick(f);
      });
      list.append(row);
    }
    if (!files.length) list.append(el('div', 'w31-li disabled', '(ninguno)'));
    const d = dialog({ title, icon: null, text: 'Archivos:', body: list, buttons: ['Aceptar', 'Cancelar'], width: 300, onButton: (b) => {
        if (b === 'Aceptar' && sel) setTimeout(() => onPick(sel), 0);
      } });
  }

  // ---------- Aplicaciones ----------
  const APPS = {
    notepad(path) {
      const node = path ? resolve(path, ['C:'])?.[1] : null;
      const name = node ? node.name : '(Sin título)';
      const ta = el('textarea', 'w31-notepad');
      ta.spellcheck = false;
      ta.value = node?.text || '';
      let wrap = true;
      const w = makeWindow({
        title: `Bloc de notas - ${name}`,
        x: nextPos() + 20, y: nextPos(), w: 440, h: 310, icon: 'notepad',
        menu: [
          { label: '&Archivo', items: () => [
            { label: '&Nuevo', action: () => { ta.value = ''; w.setTitle('Bloc de notas - (Sin título)'); } },
            { label: '&Abrir...', action: () => openFileDialog('Abrir', (f) => f.text, (f) => { ta.value = f.node.text; w.setTitle(`Bloc de notas - ${f.node.name}`); }) },
            { label: '&Guardar', action: () => dialog({ title: 'Bloc de notas', icon: 'stop', text: 'No se puede escribir en el disco: está protegido contra escritura. (Ugg proteger todo.)' }) },
            { label: 'Guardar &como...', action: () => dialog({ title: 'Bloc de notas', icon: 'stop', text: 'No se puede escribir en el disco: está protegido contra escritura.' }) },
            '-',
            { label: '&Imprimir', action: () => dialog({ title: 'Bloc de notas', icon: 'warn', text: 'No hay ninguna impresora instalada. Ugg pintar en pared.' }) },
            '-',
            { label: '&Salir', action: () => w.close() },
          ] },
          { label: '&Edición', items: () => [
            { label: '&Deshacer', disabled: true },
            '-',
            { label: 'Seleccionar &todo', action: () => ta.select() },
            { label: '&Hora/fecha', key: 'F5', action: () => { ta.setRangeText(new Date().toLocaleString('es-ES')); } },
            '-',
            { label: '&Ajuste de línea', checked: wrap, action: () => { wrap = !wrap; ta.style.whiteSpace = wrap ? 'pre-wrap' : 'pre'; ta.wrap = wrap ? 'soft' : 'off'; } },
          ] },
          { label: '&Buscar', items: [{ label: '&Buscar...', disabled: true }, { label: 'Buscar &siguiente', disabled: true }] },
          { label: 'A&yuda', items: [{ label: '&Acerca del Bloc de notas...', action: () => dialog({ title: 'Acerca del Bloc de notas', text: 'Bloc de notas para UGGDOWS 3.1\nUn editor de texto. Máximo 64 KB. Ugg escribir corto.' }) }] },
        ],
      });
      w.client.append(ta);
      setTimeout(() => ta.focus(), 50);
      ta.addEventListener('keydown', (e) => e.stopPropagation());
      return w;
    },

    paint(path) {
      const node = path ? resolve(path, ['C:'])?.[1] : null;
      const w = makeWindow({
        title: `Paintbrush - ${node ? node.name : '(Sin título)'}`,
        x: nextPos(), y: nextPos() - 10, w: 470, h: 350, icon: 'paint',
        menu: [
          { label: '&Archivo', items: () => [
            { label: '&Nuevo', action: () => { const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); } },
            { label: '&Abrir...', action: () => openFileDialog('Abrir', (f) => f.bmp, (f) => { cv.getContext('2d').drawImage(bitmapCanvas(f.node.bmp, state), 0, 0); w.setTitle(`Paintbrush - ${f.node.name}`); }) },
            { label: '&Guardar', action: () => dialog({ title: 'Paintbrush', icon: 'stop', text: 'No se puede escribir en el disco: está protegido contra escritura.' }) },
            '-',
            { label: '&Salir', action: () => w.close() },
          ] },
          { label: '&Edición', items: [{ label: '&Deshacer', disabled: true }] },
          { label: '&Ver', items: [{ label: '&Zoom', disabled: true }] },
          { label: '&Texto', items: [{ label: '&Normal', checked: true }] },
          { label: 'Ta&maño', items: [{ label: '&Píxel', checked: true }] },
        ],
      });
      const wrap = el('div', 'w31-paint');
      const tools = el('div', 'w31-tools');
      ['✂', '▭', '✎', '🖌', 'A', '◯', '▢', '⌒', '╱', '⬚'].forEach((g, i) => tools.append(el('div', 'w31-tool' + (i === 2 ? ' on' : ''), g)));
      const area = el('div', 'w31-canvas');
      const cv = node?.bmp ? bitmapCanvas(node.bmp, state) : bitmapCanvas('blank', state);
      if (!node?.bmp) {
        const c = cv.getContext('2d');
        c.fillStyle = '#fff';
        c.fillRect(0, 0, cv.width, cv.height);
      }
      area.append(cv);
      const pal = el('div', 'w31-palette');
      const cur = el('div', 'w31-cur');
      pal.append(cur);
      const colors = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
      let color = '#000000';
      cur.style.background = color;
      colors.forEach((c) => {
        const s = el('div', 'w31-swatch');
        s.style.background = c;
        s.addEventListener('click', () => {
          color = c;
          cur.style.background = c;
        });
        pal.append(s);
      });
      wrap.append(tools, area);
      w.client.append(wrap, pal);
      // Lápiz de 1 píxel
      let drawing = false;
      let last = null;
      const at = (e) => {
        const r = cv.getBoundingClientRect();
        return [Math.floor(((e.clientX - r.left) / r.width) * cv.width), Math.floor(((e.clientY - r.top) / r.height) * cv.height)];
      };
      const ctx = cv.getContext('2d');
      cv.addEventListener('pointerdown', (e) => {
        drawing = true;
        last = at(e);
        cv.setPointerCapture(e.pointerId);
        ctx.fillStyle = color;
        ctx.fillRect(last[0], last[1], 1, 1);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const p = at(e);
        const steps = Math.max(Math.abs(p[0] - last[0]), Math.abs(p[1] - last[1]), 1);
        ctx.fillStyle = color;
        for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(last[0] + ((p[0] - last[0]) * i) / steps), Math.round(last[1] + ((p[1] - last[1]) * i) / steps), 1, 1);
        last = p;
      });
      cv.addEventListener('pointerup', () => (drawing = false));
      return w;
    },

    calc() {
      const w = makeWindow({
        title: 'Calculadora', x: 360, y: 60, w: 236, h: 252, icon: 'calc', maximizable: false,
        menu: [
          { label: '&Edición', items: [{ label: '&Copiar', disabled: true }, { label: '&Pegar', disabled: true }] },
          { label: '&Ver', items: [{ label: '&Científica', action: () => memoryError() }, { label: '&Estándar', checked: true }] },
          { label: 'A&yuda', items: [{ label: '&Acerca de Calculadora...', action: () => dialog({ title: 'Acerca de Calculadora', text: 'Calculadora para UGGDOWS 3.1\nUgg contar con dedos. Calculadora contar mejor. Casi siempre.' }) }] },
        ],
      });
      const disp = el('div', 'w31-calc-disp', '0.');
      const grid = el('div', 'w31-calc-grid');
      let acc = null, op = null, entry = '0', fresh = true;
      const show = (v) => {
        if (typeof v === 'string') return (disp.textContent = v);
        if (!isFinite(v)) return (disp.textContent = 'Error');
        const s = Number.isInteger(v) ? `${v}.` : String(parseFloat(v.toPrecision(12)));
        disp.textContent = s;
      };
      const compute = (a, o, b) => {
        // El bug de la calculadora de la época: 2.01 - 2 = 0.00
        if (o === '-' && Math.trunc(a) === Math.trunc(b) && a !== b && Math.abs(a - b) < 0.1) {
          secrets.unlock('ugg_bug');
          return 'bug';
        }
        return o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : o === '/' ? a / b : b;
      };
      const press = (k) => {
        if (/^[0-9]$/.test(k)) {
          entry = fresh ? k : entry === '0' ? k : entry + k;
          fresh = false;
          return show(entry.includes('.') ? entry : entry + '.');
        }
        if (k === '.') {
          if (fresh) entry = '0';
          if (!entry.includes('.')) entry += '.';
          fresh = false;
          return show(entry);
        }
        if (k === 'C') {
          acc = null; op = null; entry = '0'; fresh = true;
          return show(0);
        }
        if (k === 'CE') {
          entry = '0'; fresh = true;
          return show(0);
        }
        if (k === '±') {
          entry = String(-parseFloat(entry));
          return show(parseFloat(entry));
        }
        if (k === 'sqrt') {
          entry = String(Math.sqrt(parseFloat(entry)));
          fresh = true;
          return show(parseFloat(entry));
        }
        const val = parseFloat(entry);
        if (k === '+' || k === '-' || k === '*' || k === '/' || k === '=') {
          if (op && !fresh) {
            const r = compute(acc, op, val);
            if (r === 'bug') {
              acc = 0;
              show('0.00');
            } else {
              acc = r;
              show(r);
            }
          } else if (!op || k !== '=') acc = val;
          op = k === '=' ? null : k;
          entry = String(acc);
          fresh = true;
        }
      };
      const keys = ['C', 'CE', '±', 'sqrt', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];
      for (const k of keys) {
        const b = el('button', 'w31-button w31-ck' + (/[0-9.]/.test(k) ? '' : ' op'), k === 'sqrt' ? '√' : k);
        b.type = 'button';
        b.addEventListener('click', () => press(k));
        grid.append(b);
      }
      w.client.append(disp, grid);
      return w;
    },

    clock() {
      let digital = false;
      const w = makeWindow({
        title: `Reloj - ${new Date().toLocaleDateString('es-ES')}`,
        x: 430, y: 220, w: 180, h: 200, icon: 'clock', maximizable: false,
        menu: [{ label: '&Configuración', items: () => [
          { label: '&Analógico', checked: !digital, action: () => (digital = false) },
          { label: '&Digital', checked: digital, action: () => (digital = true) },
        ] }],
        onClose: () => clearInterval(t),
      });
      const cv = el('canvas', 'w31-clock');
      cv.width = 170;
      cv.height = 140;
      w.client.append(cv);
      const ctx = cv.getContext('2d');
      const draw = () => {
        const d = new Date();
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, 0, 170, 140);
        if (digital) {
          ctx.fillStyle = '#000080';
          ctx.font = '700 34px "VT323", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(d.toLocaleTimeString('es-ES'), 85, 80);
          return;
        }
        const cx = 85, cy = 70, r = 60;
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2;
          ctx.fillStyle = i % 5 ? '#008080' : '#000080';
          const s = i % 5 ? 2 : 5;
          ctx.fillRect(cx + Math.sin(a) * r - s / 2, cy - Math.cos(a) * r - s / 2, s, s);
        }
        const hand = (a, len, wd, col) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = wd;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
          ctx.stroke();
        };
        hand(((d.getHours() % 12) + d.getMinutes() / 60) * (Math.PI / 6), 32, 5, '#008080');
        hand((d.getMinutes() + d.getSeconds() / 60) * (Math.PI / 30), 48, 4, '#008080');
        hand(d.getSeconds() * (Math.PI / 30), 52, 1, '#000000');
      };
      draw();
      const t = setInterval(draw, 1000);
      return w;
    },

    soundrec(path) {
      let file = path ? resolve(path, ['C:'])?.[1] : null;
      let playing = null;
      let start = 0;
      let raf = 0;
      const w = makeWindow({
        title: `Grabadora de sonidos - ${file ? file.name : '(Sin título)'}`,
        x: 150, y: 130, w: 330, h: 190, icon: 'soundrec', maximizable: false,
        menu: [
          { label: '&Archivo', items: () => [
            { label: '&Abrir...', action: () => openFileDialog('Abrir', (f) => f.wav, (f) => { stop(); file = f.node; w.setTitle(`Grabadora de sonidos - ${f.node.name}`); info(); }) },
            '-',
            { label: '&Salir', action: () => w.close() },
          ] },
          { label: '&Edición', items: [{ label: '&Insertar archivo...', disabled: true }, { label: '&Mezclar con archivo...', disabled: true }] },
          { label: 'E&fectos', items: [{ label: '&Aumentar volumen', disabled: true }, { label: '&Reverso', disabled: true }] },
        ],
        onClose: () => stop(),
      });
      const top = el('div', 'w31-sr-top');
      const status = el('div', 'w31-sr-status', 'Detenido');
      const wave = el('canvas', 'w31-sr-wave');
      wave.width = 140;
      wave.height = 44;
      const len = el('div', 'w31-sr-len');
      top.append(status, wave, len);
      const bar = el('div', 'w31-sr-bar', '<span></span>');
      const btns = el('div', 'w31-sr-btns');
      const mk = (g, label, fn) => {
        const b = el('button', 'w31-button', g);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.addEventListener('click', fn);
        btns.append(b);
      };
      const melodyFor = (f) => (f?.wav === 'nana' ? NANA : f?.wav === 'uggda' ? [[523, 0.5], [659, 0.5], [784, 0.5], [1047, 1.5]] : null);
      const duration = (f) => (melodyFor(f) ? melodyFor(f).reduce((s, n) => s + n[1], 0) * 0.42 : 0);
      const info = () => (len.textContent = `Longitud: ${duration(file).toFixed(2).replace('.', ',')} s`);
      const wctx = wave.getContext('2d');
      const drawWave = (t) => {
        wctx.fillStyle = '#000';
        wctx.fillRect(0, 0, 140, 44);
        wctx.fillStyle = '#00ff00';
        for (let x = 0; x < 140; x++) {
          const a = playing ? Math.sin(x * 0.35 + t * 18) * Math.sin(x * 0.07 + t * 3) * 16 : 0;
          wctx.fillRect(x, 22 + a, 1, 1);
        }
      };
      function stop() {
        playing?.stop();
        playing = null;
        cancelAnimationFrame(raf);
        status.textContent = 'Detenido';
        drawWave(0);
      }
      mk('◄◄', 'Al principio', () => stop());
      mk('►►', 'Al final', () => stop());
      mk('►', 'Reproducir', () => {
        if (!file) return dialog({ title: 'Grabadora de sonidos', icon: 'warn', text: 'Abra primero un archivo de sonido (.WAV).' });
        if (!driverActive) {
          return dialog({ title: 'Grabadora de sonidos', icon: 'stop', text: 'No hay ningún dispositivo de onda instalado que pueda reproducir archivos en el formato actual. Use la opción Controladores del Panel de control para instalar el dispositivo de onda.' });
        }
        if (playing) return;
        const mel = melodyFor(file);
        playing = playMelody(mel);
        start = performance.now();
        status.textContent = 'Reproduciendo';
        const isNana = file.wav === 'nana';
        const loop = () => {
          const t = (performance.now() - start) / 1000;
          drawWave(t);
          bar.firstChild.style.width = `${Math.min(100, (t / playing.duration) * 100)}%`;
          if (t >= playing.duration) {
            playing = null;
            status.textContent = 'Detenido';
            drawWave(0);
            if (isNana) onLullaby();
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      });
      mk('■', 'Detener', () => stop());
      mk('●', 'Grabar', () => dialog({ title: 'Grabadora de sonidos', icon: 'stop', text: driverActive ? 'No hay micrófono. Ugg comer micrófono.' : 'No hay ningún dispositivo de grabación instalado.' }));
      w.client.append(top, bar, btns);
      info();
      drawWave(0);
      return w;
    },

    control() {
      const w = makeWindow({
        title: 'Panel de control', x: 90, y: 70, w: 420, h: 220, icon: 'control',
        menu: [
          { label: '&Configuración', items: () => [{ label: '&Controladores...', action: drivers }, { label: '&Sonido...', action: sound }, '-', { label: '&Salir', action: () => w.close() }] },
          { label: 'A&yuda', items: [{ label: '&Contenido', action: () => uggSays('Ugg no escribir ayuda. Ugg ocupado mirándote.') }] },
        ],
      });
      const grid = el('div', 'w31-icons');
      const items = [
        ['Colores', 'paint'], ['Fuentes', 'notepad'], ['Puertos', 'control'], ['Mouse', 'control'],
        ['Escritorio', 'control'], ['Teclado', 'control'], ['Impresoras', 'control'], ['Internacional', 'control'],
        ['Fecha/Hora', 'clock'], ['386 mejorado', 'control'], ['Controladores', 'winfile'], ['Sonido', 'soundrec'],
      ];
      for (const [label, icon] of items) {
        const it = programIcon(icon, label);
        it.addEventListener('dblclick', () => {
          if (label === 'Controladores') return drivers();
          if (label === 'Sonido') return sound();
          if (label === 'Fecha/Hora') return dialog({ title: 'Fecha y hora', icon: 'info', text: `Fecha: ${new Date().toLocaleDateString('es-ES')}\nHora: ${new Date().toLocaleTimeString('es-ES')}` });
          uggSays('Ugg no dejar tocar esto. Esto de Ugg.');
        });
        grid.append(it);
      }
      w.client.append(grid);
      return w;
    },

    winfile() {
      let drive = 'C:';
      let cur = ['C:'];
      const w = makeWindow({
        title: 'Administrador de archivos', x: 40, y: 24, w: 540, h: 340, icon: 'winfile',
        menu: [
          { label: '&Archivo', items: () => [
            { label: '&Abrir', key: 'Entrar', action: () => selected && openNode(selected.node, selected.path) },
            { label: '&Mover...', action: denied },
            { label: '&Copiar...', action: denied },
            { label: '&Eliminar...', action: denied },
            { label: 'Ca&mbiar nombre...', action: denied },
            '-',
            { label: '&Ejecutar...', action: runDialog },
            '-',
            { label: '&Salir', action: () => w.close() },
          ] },
          { label: '&Disco', items: [
            { label: '&Copiar disco...', action: denied },
            { label: '&Etiquetar disco...', action: denied },
            { label: '&Formatear disco...', action: () => uggSays('Ugg no dejar formatear. Ahí estar fotos de amor.') },
          ] },
          { label: 'Á&rbol', items: [{ label: '&Expandir todo', checked: true }] },
          { label: '&Ver', items: [{ label: '&Todos los detalles', checked: true }, '-', { label: 'Ordenar por &nombre', checked: true }] },
          { label: 'A&yuda', items: [{ label: '&Acerca del Administrador de archivos...', action: () => dialog({ title: 'Acerca del Administrador de archivos', text: 'Administrador de archivos para UGGDOWS 3.1\nNombres de 8 letras y extensión de 3. Ugg contar letras con dedos.' }) }] },
        ],
      });
      const drives = el('div', 'w31-drives');
      const label = el('span', 'w31-vol');
      const split = el('div', 'w31-split');
      const tree = el('div', 'w31-tree');
      const list = el('div', 'w31-list');
      const statusBar = el('div', 'w31-status');
      split.append(tree, list);
      w.client.append(drives, split, statusBar);
      let selected = null;
      const driveBtn = (d) => {
        const b = el('div', 'w31-drive');
        b.append(smallIcon(d === 'A:' ? 'driveA' : 'driveC'), el('span', '', d[0].toLowerCase()));
        b.addEventListener('click', () => pickDrive(d));
        drives.append(b);
        return b;
      };
      const btnA = driveBtn('A:');
      const btnC = driveBtn('C:');
      drives.append(label);
      function pickDrive(d) {
        if (d === 'A:' && !state.inserted) return floppyError(() => pickDrive('A:'));
        if (d === 'A:') sfx.floppy();
        drive = d;
        cur = [d];
        render();
      }
      function render() {
        refreshFS();
        btnA.classList.toggle('on', drive === 'A:');
        btnC.classList.toggle('on', drive === 'C:');
        label.textContent = `${drive} [${drive === 'C:' ? 'UGG' : 'SB15'}]`;
        // árbol
        tree.innerHTML = '';
        const walk = (node, parts, depth) => {
          const row = el('div', 'w31-tn' + (parts.join('\\') === cur.join('\\') ? ' sel' : ''));
          row.style.paddingLeft = `${4 + depth * 14}px`;
          row.append(smallIcon('dir'), el('span', '', esc(depth ? node.name : `${drive}\\`)));
          row.addEventListener('click', () => {
            cur = parts;
            render();
          });
          tree.append(row);
          for (const c of node.children) if (c.dir) walk(c, [...parts, c.name], depth + 1);
        };
        walk(fs[drive], [drive], 0);
        // lista
        list.innerHTML = '';
        selected = null;
        const node = nodeAt(cur);
        if (!node) return;
        const entries = [];
        if (cur.length > 1) entries.push({ up: true });
        for (const c of [...node.children].sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1))) entries.push({ node: c });
        let bytes = 0;
        for (const ent of entries) {
          const c = ent.node;
          const row = el('div', 'w31-fr');
          if (ent.up) {
            row.append(smallIcon('up'), el('span', 'n', '..'));
            row.addEventListener('dblclick', () => {
              cur = cur.slice(0, -1);
              render();
            });
          } else {
            const kind = c.dir ? 'dir' : c.exe ? 'exe' : c.text ? 'doc' : 'file';
            row.append(smallIcon(kind), el('span', 'n', esc(c.name.toLowerCase())), el('span', 's', c.dir ? '' : thousands(c.size)), el('span', 'd', c.date.replace(/-/g, '/')), el('span', 't', c.time));
            if (!c.dir) bytes += c.size;
            const path = pathStr(cur) + (cur.length > 1 ? '\\' : '') + c.name;
            row.addEventListener('click', () => {
              list.querySelectorAll('.sel').forEach((r) => r.classList.remove('sel'));
              row.classList.add('sel');
              selected = { node: c, path };
            });
            row.addEventListener('dblclick', () => {
              if (c.dir) {
                cur = [...cur, c.name];
                render();
              } else openNode(c, path);
            });
          }
          list.append(row);
        }
        statusBar.textContent = `${drive} ${thousands(drive === 'C:' ? 1216 : 1185)} KB libres · Total ${node.children.filter((c) => !c.dir).length} archivo(s) (${thousands(bytes)} bytes)`;
      }
      render();
      return w;
    },
  };

  const denied = () => uggSays('Acceso denegado. Ugg proteger disco. ♥');

  function runDialog() {
    const input = el('input', 'w31-input');
    input.addEventListener('keydown', (e) => e.stopPropagation());
    const d = dialog({
      title: 'Ejecutar', icon: null, text: 'Línea de comandos:', body: input, buttons: ['Aceptar', 'Cancelar'],
      onButton: (b) => {
        if (b !== 'Aceptar') return;
        const v = input.value.trim().toUpperCase();
        const name = v.split('\\').pop().replace(/\.(EXE|COM)$/, '');
        const map = { NOTEPAD: 'notepad', CALC: 'calc', CLOCK: 'clock', PBRUSH: 'paint', SOUNDREC: 'soundrec', CONTROL: 'control', WINFILE: 'winfile', PROGMAN: 'progman', UGG: 'uggexe', PIEDRA: 'piedra', MAMUT: 'mamut', COMMAND: 'dos', WIN: 'win' };
        if (map[name]) return setTimeout(() => launch(map[name]), 0);
        const r = resolve(v, ['C:']);
        if (r && !r[1].dir) return setTimeout(() => openNode(r[1], v), 0);
        setTimeout(() => dialog({ title: 'Ejecutar', icon: 'stop', text: `No se encuentra el archivo '${v}' (o uno de sus componentes). Compruebe que la ruta y el nombre son correctos.` }), 0);
      },
    });
    setTimeout(() => input.focus(), 30);
    return d;
  }

  // Panel de control > Controladores
  function drivers() {
    const list = el('div', 'w31-listbox');
    const installed = ['Temporizador estándar del sistema', 'Controlador de MIDI Mapper', ...(state.driver ? ['Creative Labs Sound Blaster 1.5'] : [])];
    for (const d of installed) list.append(el('div', 'w31-li', esc(d)));
    dialog({
      title: 'Controladores', icon: null, text: 'Controladores instalados:', body: list, width: 340,
      buttons: ['Cerrar', '&Agregar...', '&Quitar', '&Configurar...'],
      onButton: (b) => {
        if (b === 'Agregar...') setTimeout(addDriver, 0);
        if (b === 'Quitar') setTimeout(() => uggSays('Ugg no dejar quitar nada.'), 0);
        if (b === 'Configurar...') setTimeout(() => dialog({ title: 'Configurar', icon: 'info', text: 'Este controlador no tiene opciones que configurar.' }), 0);
      },
    });
  }
  function addDriver() {
    const options = ['Controlador no listado o actualizado', 'Ad Lib', 'Altavoz del PC', 'Creative Labs Sound Blaster 1.5', 'Media Vision Thunder Board', 'Roland LAPC1', 'Sintetizador MIDI MT-32'];
    const list = el('div', 'w31-listbox');
    let sel = null;
    for (const o of options) {
      const row = el('div', 'w31-li', esc(o));
      row.addEventListener('click', () => {
        list.querySelectorAll('.sel').forEach((r) => r.classList.remove('sel'));
        row.classList.add('sel');
        sel = o;
      });
      list.append(row);
    }
    dialog({
      title: 'Agregar', icon: null, text: 'Lista de controladores:', body: list, width: 340, buttons: ['Aceptar', 'Cancelar'],
      onButton: (b) => {
        if (b !== 'Aceptar' || !sel) return;
        setTimeout(() => insertDisk(sel), 0);
      },
    });
  }
  function insertDisk(driver) {
    const input = el('input', 'w31-input');
    input.value = 'A:\\';
    input.addEventListener('keydown', (e) => e.stopPropagation());
    dialog({
      title: 'Instalar controlador', icon: 'info', text: `Inserte el disco con el controlador "${driver}" en la unidad A: o escriba la ruta del archivo.`, body: input, buttons: ['Aceptar', 'Cancelar'],
      onButton: (b) => {
        if (b !== 'Aceptar') return;
        const onA = input.value.trim().toUpperCase().startsWith('A:');
        setTimeout(() => {
          busy(900);
          if (onA && !state.inserted) return setTimeout(() => floppyError(() => insertDisk(driver)), 400);
          if (onA) sfx.floppy();
          const ok = onA && driver.includes('Sound Blaster');
          setTimeout(() => {
            if (!ok) {
              return dialog({ title: 'Instalar controlador', icon: 'stop', text: `No se encuentra el archivo del controlador en ${input.value.trim().toUpperCase() || 'A:\\'}. Inserte el disco correcto o escriba otra ruta.` });
            }
            dialog({
              title: 'Configuración de Sound Blaster', icon: 'info', text: 'Puerto E/S: 220\nInterrupción: 7\n\nUgg no saber qué es esto. Ugg pulsar Aceptar.',
              onButton: () => {
                state.driver = true;
                save();
                refreshFS();
                setTimeout(() => dialog({
                  title: 'Cambios en el sistema', icon: 'warn', text: 'Debe reiniciar UGGDOWS para que los cambios tengan efecto.', buttons: ['&Reiniciar ahora', '&No reiniciar'],
                  onButton: (r) => r === 'Reiniciar ahora' && setTimeout(restartWindows, 0),
                }), 0);
              },
            });
          }, 700);
        }, 0);
      },
    });
    setTimeout(() => input.focus(), 30);
  }
  function sound() {
    if (!driverActive) return dialog({ title: 'Sonido', icon: 'warn', text: 'No hay ningún dispositivo de sonido instalado. Los sonidos del sistema sonarán por el altavoz del PC (pitido).' });
    dialog({ title: 'Sonido', icon: 'info', text: 'Eventos:\n  Inicio de UGGDOWS ........ UGGDA.WAV\n  Ugg te echa de menos ..... (siempre)' });
  }

  // Icono de programa (32x32 + etiqueta)
  function programIcon(icon, label) {
    const it = el('div', 'w31-pi');
    it.tabIndex = -1;
    it.append(iconCanvas(icon), el('span', '', esc(label)));
    it.addEventListener('click', () => {
      it.parentElement.querySelectorAll('.w31-pi.sel').forEach((p) => p.classList.remove('sel'));
      it.classList.add('sel');
    });
    return it;
  }

  // ---------- Administrador de programas ----------
  const GROUPS = [
    { title: 'Principal', open: true, x: 8, y: 6, w: 330, h: 150, items: [['winfile', 'Administrador de archivos'], ['control', 'Panel de control'], ['dos', 'Símbolo del sistema'], ['leeme', 'Léame', 'notepad']] },
    { title: 'Accesorios', open: true, x: 150, y: 120, w: 418, h: 154, items: [['notepad', 'Bloc de notas'], ['paint', 'Paintbrush'], ['calc', 'Calculadora'], ['clock', 'Reloj'], ['soundrec', 'Grabadora de sonidos']] },
    { title: 'Juegos', open: false, x: 40, y: 60, w: 260, h: 120, items: [['piedra', 'Piedra'], ['mamut', 'Mamut']] },
    { title: 'Cosas de Ugg', open: false, x: 60, y: 80, w: 330, h: 120, items: [['diary', 'Diario de Ugg'], ['photos', 'Fotos de amor'], ['uggexe', 'UGG.EXE']] },
  ];
  function startProgman() {
    pm = makeWindow({
      title: 'Administrador de programas', x: 14, y: 10, w: 610, h: 430, icon: 'group',
      onClose: () => {
        pm = null;
        setTimeout(exitWindowsDialog, 0);
      },
      menu: [
        { label: '&Archivo', items: [
          { label: '&Nuevo...', action: () => uggSays('Ugg no dejar crear cosas nuevas. Todo ya perfecto.') },
          { label: '&Abrir', key: 'Entrar', disabled: true },
          { label: '&Mover...', key: 'F7', disabled: true },
          { label: '&Copiar...', key: 'F8', disabled: true },
          { label: '&Eliminar', key: 'Supr', action: () => uggSays('Ugg no dejar borrar.') },
          { label: '&Propiedades...', disabled: true },
          '-',
          { label: 'E&jecutar...', action: runDialog },
          '-',
          { label: '&Salir de UGGDOWS...', action: exitWindowsDialog },
        ] },
        { label: '&Opciones', items: [{ label: '&Organizar automáticamente', checked: true }, { label: '&Minimizar al usar' }, { label: '&Guardar configuración al salir', checked: true }] },
        { label: '&Ventana', items: () => [
          { label: '&Cascada', key: 'Mayús+F5', disabled: true },
          { label: '&Mosaico', key: 'Mayús+F4', disabled: true },
          '-',
          ...groupWins.map((g, i) => ({ label: `&${i + 1} ${g.title}`, action: () => (g.el.hidden ? g.restore() : g.focus()) })),
        ] },
        { label: 'A&yuda', items: [
          { label: '&Contenido', action: () => uggSays('Ugg no escribir ayuda. Ugg ocupado mirándote. ♥') },
          '-',
          { label: '&Acerca del Administrador de programas...', action: about },
        ] },
      ],
    });
    pm.client.classList.add('w31-pm');
    pm.client.append(el('div', 'w31-picons'));
    const groupWins = [];
    for (const g of GROUPS) {
      const gw = makeWindow({ parent: pm.client, title: g.title, x: g.x, y: g.y, w: g.w, h: g.h, mdi: true, icon: 'group', onClose: () => {} });
      // Los grupos no se cierran: se minimizan
      gw.close = () => gw.minimize();
      const grid = el('div', 'w31-icons');
      for (const [id, label, icon] of g.items) {
        const it = programIcon(icon || id, label);
        it.addEventListener('dblclick', () => {
          if (id === 'leeme') return launch('notepad', 'C:\\WINDOWS\\LEEME.TXT');
          if (id === 'diary') return launch('notepad', 'C:\\DOCS\\DIARIO.TXT');
          if (id === 'photos') return launch('paint', 'C:\\UGG\\FOTOS\\TU.BMP');
          launch(id);
        });
        grid.append(it);
      }
      gw.client.append(grid);
      groupWins.push(gw);
      if (!g.open) gw.minimize();
    }
    groupWins[1].focus();
    pm.focus();
  }
  function about() {
    dialog({ title: 'Acerca del Administrador de programas', icon: 'ugg', width: 360, text: `UGGDOWS\nVersión 3.1\nCopyright © 10.000 a.C. Ugg Corp.\n\nModo 386 mejorado\nMemoria: 2.048 KB libres\nRecursos del sistema: ${71 - appWins.size * 9}% libres\nUsuario registrado: Amor de Ugg ♥` });
  }

  // ---------- Arrancar / salir de UGGDOWS ----------
  function startWindows() {
    mode = 'splash';
    dosEl.hidden = true;
    splash.hidden = false;
    desk.hidden = true;
    kbd.blur();
    driverActive = state.driver;
    setTimeout(() => {
      splash.hidden = true;
      desk.hidden = false;
      mode = 'win';
      startProgman();
      busy(800);
      if (driverActive) sfx.boot();
      secrets.unlock('ugg_win');
    }, 1700);
  }
  function closeAll() {
    closeMenus();
    for (const w of [...appWins]) w.close();
    desk.querySelectorAll('.w31-win, .w31-shield').forEach((n) => n.remove());
    dicons.innerHTML = '';
    pm = null;
  }
  function exitWindowsDialog() {
    if (mode !== 'win') return;
    dialog({
      title: 'Salir de UGGDOWS', icon: 'warn', text: 'Esto terminará su sesión de UGGDOWS.', buttons: ['Aceptar', 'Cancelar'],
      onButton: (b) => {
        if (b === 'Aceptar') {
          setTimeout(() => {
            closeAll();
            mode = 'dos';
            cwd = ['C:'];
            dosPrint('');
            showDos();
          }, 0);
        } else if (!pm) setTimeout(startProgman, 0);
      },
    });
  }
  function restartWindows() {
    closeAll();
    startWindows();
  }
  function enterDosBox() {
    mode = 'dosbox';
    desk.hidden = true;
    dosCls();
    dosPrint('Escriba EXIT y presione ENTRAR para volver a UGGDOWS.\n');
    cwd = ['C:', 'WINDOWS'];
    showDos();
  }
  function backToWindows() {
    mode = 'win';
    dosEl.hidden = true;
    desk.hidden = false;
    kbd.blur();
  }

  // ---------- API ----------
  $('.w31-leave').addEventListener('click', () => close());
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openMenu) closeMenus();
    e.stopPropagation();
  });

  function open() {
    root.hidden = false;
    resize();
    if (!power) boot();
    else if (mode === 'dos' || mode === 'dosbox') showDos();
  }
  function close() {
    if (root.hidden) return;
    closeMenus();
    kbd.blur();
    root.hidden = true;
    onLeave();
  }

  return {
    open,
    close,
    get isOpen() {
      return !root.hidden;
    },
    // Meter el disquete del cofre en la unidad A:
    insertFloppy() {
      state.inserted = true;
      save();
      refreshFS();
      sfx.floppy();
    },
  };
}
