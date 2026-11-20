export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const terrain = (x, z) =>
  2.5 * Math.sin(x * 0.019) +
  2 * Math.sin(z * 0.025) +
  4 * Math.sin((x + z) * 0.012) +
  0.14 * Math.sin(x * 0.12 + z * 0.08);
export const nodes = {
  A: [0, 0],
  B: [-110, 85],
  C: [-95, 220],
  D: [40, 195],
  E: [145, 70],
  F: [172, -105],
  G: [25, -200],
  H: [-150, -125],
  I: [-276, 15],
  J: [-265, 250],
  K: [48, 365],
  L: [270, 265],
};
const defs = {
  AB: [[-57, 29]],
  BC: [[-124, 150]],
  CD: [[-33, 235]],
  DA: [
    [40, 130],
    [20, 58],
  ],
  DE: [[104, 156]],
  EA: [[83, 22]],
  EF: [[174, -10]],
  FG: [[115, -175]],
  GH: [[-65, -198]],
  HA: [[-70, -62]],
  HI: [[-228, -90]],
  IJ: [[-288, 126]],
  JC: [[-180, 267]],
  CK: [[-45, 300]],
  KL: [
    [150, 350],
    [218, 326],
  ],
  LE: [[241, 179]],
  DJ: [
    [12, 258],
    [-108, 315],
  ],
  BF: [
    [-35, 68],
    [71, 3],
  ],
  GB: [
    [0, -119],
    [-72, -10],
  ],
  FK: [
    [270, -34],
    [327, 104],
    [333, 319],
    [200, 411],
  ],
};
export const edges = {};
function smooth(list) {
  const out = [];
  for (let i = 0; i < list.length - 1; i++) {
    let a = list[Math.max(0, i - 1)],
      b = list[i],
      c = list[i + 1],
      d = list[Math.min(list.length - 1, i + 2)],
      n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 2);
    for (let j = 0; j < n; j++) {
      let t = j / n;
      out.push(
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * b[k] +
              (-a[k] + c[k]) * t +
              (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t +
              (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t),
        ),
      );
    }
  }
  return [...out, list.at(-1)];
}
for (const [key, mid] of Object.entries(defs))
  edges[key] = smooth([nodes[key[0]], ...mid, nodes[key[1]]]);
export function makeRoute(code) {
  let pts = [];
  for (let i = 1; i < code.length; i++) {
    const k = code.slice(i - 1, i + 1);
    const p = edges[k] || [...edges[k[1] + k[0]]].reverse();
    pts.push(...(i === 1 ? p : p.slice(1)));
  }
  const ds = [0];
  for (let i = 1; i < pts.length; i++)
    ds.push(
      ds[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const length = ds.at(-1);
  function at(s) {
    s = clamp(s, 0, length);
    let lo = 0,
      hi = ds.length - 1;
    while (hi - lo > 1) {
      let m = (lo + hi) >> 1;
      if (ds[m] <= s) lo = m;
      else hi = m;
    }
    const f = (s - ds[lo]) / (ds[hi] - ds[lo] || 1),
      a = pts[lo],
      b = pts[hi];
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f };
  }
  function sample(s, offset = 0) {
    let p = at(s),
      a = at(s - 4),
      b = at(s + 4),
      h = Math.atan2(b.x - a.x, b.z - a.z);
    return { x: p.x - Math.cos(h) * offset, z: p.z + Math.sin(h) * offset, h };
  }
  function project(x, z, previous) {
    let lo = 0,
      hi = ds.length - 1;
    while (hi - lo > 1) {
      let m = (hi + lo) >> 1;
      if (ds[m] < previous) lo = m;
      else hi = m;
    }
    let best = Infinity,
      s = previous,
      off = 0;
    for (
      let i = Math.max(0, lo - 10);
      i < Math.min(pts.length - 1, lo + 12);
      i++
    ) {
      const a = pts[i],
        b = pts[i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = ds[i + 1] - ds[i],
        f = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (len * len || 1), 0, 1),
        rx = x - a[0] - f * dx,
        rz = z - a[1] - f * dz,
        d = rx * rx + rz * rz;
      if (d < best) {
        best = d;
        s = ds[i] + f * len;
        off = (-rx * dz + rz * dx) / (len || 1);
      }
    }
    return { s, off, dist: Math.sqrt(best) };
  }
  return { pts, length, sample, project };
}
export const angle = (x) => Math.atan2(Math.sin(x), Math.cos(x));
