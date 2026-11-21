import { clamp } from "./map.js";

export const ravine = { start: 158, width: 11, flightTime: 0.94 };

// The same cross-section cuts both the dirt road and the ground beneath it.
export function carveRavine(meshes, route) {
  const p = route.sample(ravine.start + ravine.width / 2);
  const sin = Math.sin(p.h), cos = Math.cos(p.h);
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    const carved = position.clone();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) - p.x, z = position.getZ(i) - p.z;
      const across = x * cos - z * sin;
      const along = x * sin + z * cos;
      const width = ravine.width / 2 + 0.55 * Math.sin(across * 0.24);
      const depth = clamp((width + 1.4 - Math.abs(along)) / 2, 0, 1)
        * clamp((38 - Math.abs(across)) / 9, 0, 1);
      carved.setY(i, position.getY(i) - depth * 9);
    }
    mesh.geometry.morphAttributes.position = [carved];
    mesh.updateMorphTargets();
  }
  return active => {
    for (const mesh of meshes) mesh.morphTargetInfluences[0] = Number(active);
  };
}

export function crossRavine(racer, previousS, dt, route) {
  const { start, width, flightTime } = ravine;
  if (!racer.flight && previousS < start && racer.s >= start) {
    const speed = Math.max(0.01, racer.speed);
    racer.flight = { speed, elapsed: (racer.s - start) / speed };
  } else if (racer.flight) {
    racer.flight.elapsed += dt;
  }
  const flight = racer.flight;
  if (!flight) return false;
  racer.speed = flight.speed;
  const distance = flight.speed * flight.elapsed;
  racer.s = start + distance;
  const pos = route.sample(racer.s, racer.offset);
  racer.x = pos.x;
  racer.z = pos.z;
  racer.air = 10 * flight.elapsed * (flightTime - flight.elapsed);
  if (flight.elapsed < flightTime) return false;
  if (flight.speed * flightTime < width) {
    // Continue down into the cut after missing the far lip.
    racer.s = start + Math.min(width - 1, flight.speed * flightTime);
    const fall = route.sample(racer.s, racer.offset);
    racer.x = fall.x;
    racer.z = fall.z;
    if (racer.air > -6) return false;
    racer.flight = null;
    return true;
  }
  racer.flight = null;
  racer.air = 0;
  return false;
}
