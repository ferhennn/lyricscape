// Shared, render-free pointer state. Normalized to -1..1 with the origin at the
// viewport centre. Smoothed value is what visual systems should read.

export const pointer = {
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
};

let bound = 0;

export function bindPointer(): () => void {
  bound++;
  if (bound === 1) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt);
  }
  return () => {
    bound = Math.max(0, bound - 1);
    if (bound === 0) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    }
  };
}

function onMove(e: PointerEvent) {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
}

function onTilt(e: DeviceOrientationEvent) {
  if (e.gamma == null || e.beta == null) return;
  pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
  pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
}

/** Advance the smoothed pointer. Call once per frame with delta seconds. */
export function stepPointer(dt: number) {
  const k = 1 - Math.exp(-6 * dt);
  pointer.x += (pointer.tx - pointer.x) * k;
  pointer.y += (pointer.ty - pointer.y) * k;
}
