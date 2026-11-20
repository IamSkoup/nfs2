import { angle, clamp, edges, terrain } from "./map.js";
import { dragStep } from "./drag.js";
export const surfaces = {
  dry: [1, 1],
  mud: [0.81, 0.64],
  wet: [0.93, 0.77],
  grass: [0.59, 0.61],
};
export function move(r, c, dt, route, event, bend, free = false) {
  const st = r.st;
  let f = r.surface;
  if (!free) {
    f =
      Math.abs(r.offset) > 7
        ? "grass"
        : event.weather === "Дождь"
          ? Math.sin(r.s * 0.035) > 0.66
            ? "mud"
            : "wet"
          : "dry";
  }
  r.surface = f;
  const [speedFactor, grip] = surfaces[f];
  const drag = event.type === "Драг" && !free;
  let multiplier = drag ? dragStep(r, c, dt) : 1;
  const frac = clamp(r.speed / st.speed, 0, 1.5);
  if (!c.boost) r.lock = false;
  r.boosting = c.boost && !r.lock && r.boost > 0 && r.speed > 2;
  r.boost = clamp(
    r.boost +
      dt *
        (r.boosting
          ? -19
          : r.speed > 6 && Math.abs(bend) > 0.12 && Math.abs(r.offset) < 4
            ? 7
            : r.speed > 2
              ? 0.85
              : 0),
    0,
    st.tank,
  );
  if (!r.boost) r.lock = true;
  const slope =
    (terrain(r.x + Math.sin(r.heading) * 2, r.z + Math.cos(r.heading) * 2) -
      terrain(r.x, r.z)) /
    2;
  let max =
    st.speed *
    speedFactor *
    multiplier *
    (1 + (r.boosting ? st.power / 100 : 0)) *
    (1 - clamp(slope, -0.2, 0.2) * 0.28) *
    (1 - Math.min(0.09, (r.duration / st.stamina) * 0.025));
  if (!drag && !free) max *= 1 - clamp(Math.abs(bend) * frac * 0.34, 0, 0.29);
  const target = c.brake ? 0 : c.gas ? max : 0;
  const accel =
    target < r.speed
      ? c.brake
        ? 17
        : c.gas
          ? 8
          : 3.5
      : st.accel *
        (1 - 0.32 * Math.min(1, frac)) *
        (r.boosting ? 1.6 : 1) *
        (drag ? r.pulse : 1);
  r.speed = Math.max(
    0,
    r.speed + clamp(target - r.speed, -accel * dt, accel * dt),
  );
  r.duration += dt;
  if (free || !drag) {
    r.heading -=
      (c.steer * st.turn * dt * clamp(r.speed / 4, 0, 1)) / (1 + 0.28 * frac);
    const drift = 1 - Math.exp(-dt * st.grip * grip);
    r.vx += (Math.sin(r.heading) * r.speed - r.vx) * drift;
    r.vz += (Math.cos(r.heading) * r.speed - r.vz) * drift;
    r.x = clamp(r.x + r.vx * dt, -440, 440);
    r.z = clamp(r.z + r.vz * dt, -295, 480);
    if (free) {
      r.s += dt * r.speed;
      return;
    }
    const lap = r.lap,
      prev = r.s - lap * route.length,
      near = route.project(r.x, r.z, prev);
    r.offset = near.off;
    r.side = c.steer * r.speed * 0.25;
    if (near.dist < 13 && Math.abs(near.s - prev) < 20) {
      r.s = lap * route.length + near.s;
      if (near.s >= route.length - 0.65 && near.dist < 7)
        r.s = (lap + 1) * route.length;
    }
    return;
  }

  if (Math.abs(r.offset) > 11) r.speed *= Math.exp(-dt * 0.48);
  r.s += r.speed * dt;
  const p = route.sample(
    Math.min(r.s, event.laps * route.length - 0.001) % route.length,
    r.offset,
  );
  r.x = p.x;
  r.z = p.z;
  r.heading +=
    angle(p.h - Math.atan2(r.side, Math.max(3, r.speed)) * 0.55 - r.heading) *
    (1 - Math.exp(-dt * 9));
}
const cells = new Map();
for (const path of Object.values(edges))
  for (const [x, z] of path) {
    let key = Math.floor(x / 16) + "," + Math.floor(z / 16);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push([x, z]);
  }
export function roadDistance(x, z) {
  let best = Infinity;
  const a = Math.floor(x / 16),
    b = Math.floor(z / 16);
  for (let i = a - 1; i <= a + 1; i++)
    for (let j = b - 1; j <= b + 1; j++)
      for (const p of cells.get(i + "," + j) || [])
        best = Math.min(best, (p[0] - x) ** 2 + (p[1] - z) ** 2);
  return Math.sqrt(best);
}
