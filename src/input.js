// Teclado + joystick táctil
export function createInput({ joystick, knob, jumpBtn, onInteract, onAnyInput }) {
  const keys = new Set();
  let jumpQueued = false;
  const stick = { x: 0, z: 0, id: null };
  let enabled = false;

  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  window.addEventListener('keydown', (e) => {
    if (!enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (e.code === 'Space' && !e.repeat) jumpQueued = true;
    if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) onInteract();
    keys.add(e.code);
    onAnyInput();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // Joystick virtual
  const setStick = (cx, cy) => {
    const rect = joystick.getBoundingClientRect();
    const r = rect.width / 2;
    let dx = cx - (rect.left + r);
    let dy = cy - (rect.top + r);
    const d = Math.hypot(dx, dy);
    const max = r * 0.6;
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.x = dx / max;
    stick.z = dy / max;
  };
  const resetStick = () => {
    stick.id = null;
    stick.x = stick.z = 0;
    knob.style.transform = '';
  };
  joystick.addEventListener('pointerdown', (e) => {
    stick.id = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    setStick(e.clientX, e.clientY);
    onAnyInput();
  });
  joystick.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.id) setStick(e.clientX, e.clientY);
  });
  joystick.addEventListener('pointerup', resetStick);
  joystick.addEventListener('pointercancel', resetStick);
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jumpQueued = true;
    onAnyInput();
  });

  const has = (...codes) => codes.some((c) => keys.has(c));

  return {
    setEnabled(v) {
      enabled = v;
      if (!v) keys.clear();
    },
    axis() {
      if (!enabled) return { x: 0, z: 0 };
      const x = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0) + stick.x;
      const z = (has('KeyS', 'ArrowDown') ? 1 : 0) - (has('KeyW', 'ArrowUp') ? 1 : 0) + stick.z;
      return { x, z };
    },
    running() {
      return has('ShiftLeft', 'ShiftRight') || Math.hypot(stick.x, stick.z) > 0.95;
    },
    consumeJump() {
      const j = jumpQueued && enabled;
      jumpQueued = false;
      return j;
    },
  };
}
