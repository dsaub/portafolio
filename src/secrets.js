// Registro de secretos / logros escondidos (persistidos en localStorage)
const KEY = 'elordenador-secrets';

export const SECRETS = [
  { id: 'terminal', name: 'Hola, terminal', hint: 'Todo ordenador tiene una terminal' },
  { id: 'sudo', name: 'Sin permisos', hint: 'Intenta ser administrador' },
  { id: 'snake', name: 'Serpiente', hint: 'Consigue 10 puntos en cierto juego clásico' },
  { id: 'konami', name: '↑↑↓↓←→←→BA', hint: 'Un código que todo gamer conoce' },
  { id: 'gol', name: '¡Gol!', hint: 'Hay una portería en la isla' },
  { id: 'hattrick', name: 'Hat-trick', hint: 'Tres goles en una misma visita' },
  { id: 'chapuzon', name: 'Chapuzón', hint: 'A los cubos también les gusta el mar (5 veces)' },
  { id: 'siesta', name: 'Siesta', hint: 'Deja al ordenador tranquilo un rato' },
  { id: 'disquetes', name: 'Coleccionista', hint: 'Hay 5 disquetes perdidos por la isla' },
];

function load() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(ids.filter((id) => SECRETS.some((s) => s.id === id)));
  } catch {
    return new Set();
  }
}

export function createSecrets({ onUnlock, onAll }) {
  const found = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...found]));
    } catch {}
  };

  return {
    total: SECRETS.length,
    get count() {
      return found.size;
    },
    has: (id) => found.has(id),
    unlock(id) {
      const secret = SECRETS.find((s) => s.id === id);
      if (!secret || found.has(id)) return false;
      found.add(id);
      save();
      onUnlock(secret, found.size, SECRETS.length);
      if (found.size === SECRETS.length) onAll();
      return true;
    },
    list: () => SECRETS.map((s) => ({ ...s, found: found.has(s.id) })),
  };
}

// Detecta el código Konami en una secuencia de teclas
export function konamiDetector(onMatch) {
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let i = 0;
  return (code) => {
    // un ↑ de más (↑↑↑↓↓…) no debe reiniciar la secuencia
    if (code === CODE[i]) i++;
    else i = code === 'ArrowUp' ? (i === 2 ? 2 : 1) : 0;
    if (i === CODE.length) {
      i = 0;
      onMatch();
    }
  };
}
