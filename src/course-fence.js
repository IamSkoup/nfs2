import * as T from "./vendor.js";
import { buildFence } from "./fence.js";
import { terrain } from "./map.js";

export function courseFence(group, samples) {
  const boards = [],
    colors = [],
    posts = new Set(),
    piece = new T.Object3D();
  function box(x, y, z, w, h, d, yaw, pitch, color) {
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    piece.rotation.set(pitch, yaw, 0, "YXZ");
    piece.updateMatrix();
    boards.push(piece.matrix.clone());
    colors.push(color);
  }
  const hit = buildFence((a, b) => {
    for (const p of [a, b]) {
      const key = p.x.toFixed(3) + "," + p.z.toFixed(3);
      if (posts.has(key)) continue;
      posts.add(key);
      const floor = terrain(p.x, p.z);
      box(p.x, floor + 1.03, p.z, 0.29, 2.26, 0.29, 0, 0, 0x77583e);
      box(p.x, floor + 2.01, p.z, 0.31, 0.13, 0.31, 0, 0, 0xc29a63);
    }
    const dx = b.x - a.x,
      dz = b.z - a.z,
      ya = terrain(a.x, a.z),
      yb = terrain(b.x, b.z);
    const yaw = Math.atan2(dx, dz),
      pitch = -Math.atan2(yb - ya, Math.hypot(dx, dz));
    const tones = [0x715239, 0x816044, 0x79583e, 0x89674a];
    for (let i = 0; i < 4; i++) {
      box(
        (a.x + b.x) / 2,
        (ya + yb) / 2 + 0.18 + i * 0.48,
        (a.z + b.z) / 2,
        0.19,
        0.49,
        Math.hypot(dx, dz, yb - ya) + 0.09,
        yaw,
        pitch,
        tones[i],
      );
    }
  }, samples);
  const mesh = new T.InstancedMesh(
    new T.BoxGeometry(),
    new T.MeshStandardMaterial({
      roughness: 1,
      emissive: 0x241a12,
      emissiveIntensity: 0.48,
    }),
    boards.length,
  );
  const color = new T.Color();
  boards.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.setHex(colors[i]));
  });
  mesh.computeBoundingSphere();
  mesh.name = "Деревянное ограждение трассы";
  mesh.receiveShadow = true;
  group.add(mesh);
  return hit;
}
