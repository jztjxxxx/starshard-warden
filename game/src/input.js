// Keyboard and mouse state, translated each frame into the plain controls
// object the world consumes: { moveX, moveY, aimX, aimY, firing, dashPressed }.
// The screenshot autopilot produces the same shape, so live play and staged
// scenes drive the world through exactly one path.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false };
  let dashQueued = false;
  let scaleX = 1;
  let scaleY = 1;

  function refreshScale() {
    const rect = canvas.getBoundingClientRect();
    scaleX = canvas.width / Math.max(1, rect.width);
    scaleY = canvas.height / Math.max(1, rect.height);
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.key === ' ' || event.key === 'Shift') dashQueued = true;
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  canvas.addEventListener('pointermove', (event) => {
    refreshScale();
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * scaleX;
    mouse.y = (event.clientY - rect.top) * scaleY;
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) mouse.down = true;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  return {
    mouse,
    keys,
    controls(player) {
      let moveX = 0;
      let moveY = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) moveX -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) moveX += 1;
      if (keys.has('w') || keys.has('ArrowUp')) moveY -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) moveY += 1;
      const length = Math.hypot(moveX, moveY);
      if (length > 0) {
        moveX /= length;
        moveY /= length;
      }
      const dash = dashQueued;
      dashQueued = false;
      return {
        moveX,
        moveY,
        aimX: player ? player.x + (mouse.x - player.x) : mouse.x,
        aimY: player ? player.y + (mouse.y - player.y) : mouse.y,
        mouseX: mouse.x,
        mouseY: mouse.y,
        firing: mouse.down || keys.has('j'),
        dashPressed: dash,
      };
    },
    pressed(key) {
      return keys.has(key);
    },
    consumeDash() {
      const dash = dashQueued;
      dashQueued = false;
      return dash;
    },
  };
}
