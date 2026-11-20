import { edges, roadHalfWidth } from "./map.js";

// Contour only the supplied route. Nearby sections merge at shared junctions.
export function buildFence(rail, samples = Object.values(edges).flat()) {
  const step = 5,
    width = roadHalfWidth + 2.5;
  const cells = new Map();
  const bin = 24;
  for (const [x, z] of samples) {
    const key = Math.floor(x / bin) + "," + Math.floor(z / bin);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push([x, z]);
  }
  function roadDistance(x, z) {
    let best = (width + step * 2) ** 2;
    const cx = Math.floor(x / bin),
      cz = Math.floor(z / bin);
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (const [X, Z] of cells.get(i + "," + j) || [])
          best = Math.min(best, (X - x) ** 2 + (Z - z) ** 2);
      }
    return Math.sqrt(best);
  }
  const bounds = (axis) => {
    const values = samples.map((p) => p[axis]);
    return [
      Math.floor((Math.min(...values) - width) / step) - 1,
      Math.ceil((Math.max(...values) + width) / step) + 1,
    ];
  };
  const [left, right] = bounds(0),
    [bottom, top] = bounds(1);
  const grid = new Map(),
    walls = new Map();
  function field(x, z) {
    const key = x + "," + z;
    if (!grid.has(key))
      grid.set(key, Math.min(roadDistance(x, z), width + step * 2) - width);
    return grid.get(key);
  }
  function segment(a, b) {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length2 = dx * dx + dz * dz;
    if (length2 < 0.000001) return;
    rail(a, b);
    const key =
      Math.floor((a.x + b.x) / 24) + "," + Math.floor((a.z + b.z) / 24);
    if (!walls.has(key)) walls.set(key, []);
    walls.get(key).push({ a, dx, dz, length2 });
  }
  for (let i = left; i < right; i++)
    for (let j = bottom; j < top; j++) {
      const x = i * step,
        z = j * step;
      const corners = [
        [x, z],
        [x + step, z],
        [x + step, z + step],
        [x, z + step],
      ];
      const crossings = [];
      for (let k = 0; k < 4; k++) {
        const [ax, az] = corners[k],
          [bx, bz] = corners[(k + 1) % 4];
        const va = field(ax, az),
          vb = field(bx, bz);
        if (va < 0 === vb < 0) continue;
        const t = va / (va - vb);
        crossings.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t });
      }
      if (
        crossings.length === 4 &&
        field(x + step / 2, z + step / 2) < 0 !== field(x, z) < 0
      )
        crossings.push(crossings.shift());
      for (let k = 0; k < crossings.length; k += 2)
        segment(crossings[k], crossings[k + 1]);
    }
  return function collision(x, z) {
    const cx = Math.floor(x / 12),
      cz = Math.floor(z / 12);
    let best = 0.93 ** 2,
      hit = null;
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (const { a, dx, dz, length2 } of walls.get(i + "," + j) || []) {
          const t = Math.max(
            0,
            Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2),
          );
          const X = a.x + t * dx,
            Z = a.z + t * dz,
            d = (x - X) ** 2 + (z - Z) ** 2;
          if (d < best) {
            best = d;
            hit = { x: X, z: Z, r: 0.93, kind: "fence" };
          }
        }
      }
    return hit;
  };
}
