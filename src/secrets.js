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
  { id: 'hundido', name: 'Glu glu… ¡BOOM!', hint: 'El mar no es buen sitio para un ordenador' },
  { id: 'naufrago', name: 'Náufrago', hint: 'Métete al mar… a veces la marea te lleva muy lejos (1 de cada 10)' },
  { id: 'nota', name: 'Nota del sysadmin', hint: 'Alguien dejó una nota clavada en la playa del norte' },
  { id: 'rmrf', name: 'Destrucción masiva', hint: 'Escribe el comando prohibido… y gana a la isla' },
  { id: 'panic', name: 'Kernel panic', hint: 'Escribe el comando prohibido… y deja que la isla te gane' },
  // Isla de Ugg: sin pistas, hay que averiguarlos
  { id: 'ugg_amor', name: 'Amor prehistórico', group: 'ugg' },
  { id: 'ugg_win', name: 'Ventanas para Ugg', group: 'ugg' },
  { id: 'ugg_login', name: 'Usuario de UGGNIX', group: 'ugg' },
  { id: 'ugg_arcade', name: 'Jugón del Paleolítico', group: 'ugg' },
  { id: 'ugg_cofre', name: 'El cofre de Ugg', group: 'ugg' },
  { id: 'ugg_nana', name: 'Duérmete, Ugg', group: 'ugg' },
  { id: 'ugg_escape', name: 'Libre otra vez', group: 'ugg' },
  { id: 'ugg_bug', name: 'El bug del 2,01', group: 'ugg' },
  { id: 'ugg_gpf', name: 'Fallo de protección general', group: 'ugg' },
  { id: 'ugg_format', name: 'Formatear el amor', group: 'ugg' },
  { id: 'ugg_nadar', name: 'Ugg siempre vigila', group: 'ugg' },
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
