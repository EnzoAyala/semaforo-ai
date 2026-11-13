/** Registro compartido de vehículos (autos + bus) y peatones en cruce. */

const buckets = new Map();
let vehicles = [];

const pedBuckets = new Map();
let pedestrians = [];

function rebuild() {
  const all = [];
  buckets.forEach((list) => {
    all.push(...list);
  });
  vehicles = all;
}

function rebuildPeds() {
  pedestrians = [...pedBuckets.values()];
}

/**
 * @param {string} key
 * @param {{ id: string, x: number, z: number, len?: number, halfW?: number, dir: number }[]} list
 */
export function publishBucket(key, list) {
  buckets.set(key, list);
  rebuild();
}

export function getVehicles() {
  return vehicles;
}

/**
 * Publica o limpia un peatón en el registro de cruce.
 * @param {string} id
 * @param {{ id: string, x: number, z: number } | null} entry
 */
export function publishPedestrian(id, entry) {
  if (!entry) pedBuckets.delete(id);
  else pedBuckets.set(id, entry);
  rebuildPeds();
}

/**
 * @param {{ id: string, x: number, z: number }[]} list
 */
export function publishPedestrians(list) {
  pedBuckets.clear();
  list.forEach((p) => {
    if (p?.id != null) pedBuckets.set(p.id, p);
  });
  rebuildPeds();
}

export function getPedestrians() {
  return pedestrians;
}

/** ¿Hay peatones aún sobre la calzada / cebra? */
export function pedestriansOnCrosswalk() {
  for (const p of pedestrians) {
    // Dentro de la pista y cerca del paso (eje X de la cebra)
    if (Math.abs(p.z) < 7.2 && Math.abs(p.x) < 4.5) return true;
  }
  return false;
}

export function vehicleBlocksCrosswalk(x, z, clearRadius = 1.4) {
  for (const v of vehicles) {
    const half = (v.len ?? 1.8) * 0.5;
    const hw = v.halfW ?? 0.55;
    if (
      Math.abs(x - v.x) < half + clearRadius * 0.4 &&
      Math.abs(z - v.z) < hw + clearRadius
    ) {
      return true;
    }
  }
  return false;
}

export function leadGap(x, z, dir, selfId = null, laneTol = 0.65) {
  let best = Infinity;
  for (const v of vehicles) {
    if (selfId && v.id === selfId) continue;
    if (Math.abs(v.z - z) > laneTol) continue;
    if (dir > 0 && v.x > x) {
      const gap = v.x - x - (v.len ?? 1.8) * 0.5;
      if (gap < best) best = gap;
    } else if (dir < 0 && v.x < x) {
      const gap = x - v.x - (v.len ?? 1.8) * 0.5;
      if (gap < best) best = gap;
    }
  }
  return best;
}
