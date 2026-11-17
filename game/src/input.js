// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (start,
// restart, pause, dash, mute) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. The pointer steers too: when the
// mouse moves, the ship turns toward it; a click or Space dashes.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const MUTE = new Set(['KeyM']);

export function createInput(target, toField) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let pointer = null;
  let pointerSeen = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });
  target.addEventListener('pointermove', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerSeen = performance.now();
  });
  target.addEventListener('pointerdown', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerSeen = performance.now();
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The held-keys direction, as x/y components of -1, 0 or 1. */
    keys() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** The pointer's field position, or null when the mouse has not moved recently. */
    pointer() {
      if (pointer === null) return null;
      if (performance.now() - pointerSeen > 2500) return null;
      return pointer;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
