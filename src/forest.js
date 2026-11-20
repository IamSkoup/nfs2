import { roadHalfWidth } from "./map.js";
import * as T from "./vendor.js";
import { edges, terrain } from "./map.js";
import { roadDistance } from "./physics.js";
let seed = 3781;
const rand = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const material = (color, extra = {}) =>
  new T.MeshStandardMaterial({ color, flatShading: true, ...extra });
function dirt() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d"),
    im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const v =
        rand() * 32 +
        5 * Math.sin(y * 0.046 + x * 0.3) -
        (Math.abs(Math.abs(x - 128) - 63 + Math.sin(y * 0.0245) * 3) < 9
          ? 20
          : 0);
      im.data.set([103 + v, 83 + v, 65 + v, 255], (y * 256 + x) * 4);
    }
  g.putImageData(im, 0, 0);
  const t = new T.CanvasTexture(c);
  t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function ridge(radius, height) {
  const g = new T.ConeGeometry(radius, height, 21, 7);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      v = y / height + 0.5,
      a = Math.atan2(z, x),
      n = 0.78 + 0.14 * Math.sin(a * 3) + 0.13 * Math.cos(a * 5);
    p.setXYZ(
      i,
      x * n + v * radius * 0.19,
      y +
        Math.sin(x * 0.061 + z * 0.04) * Math.min(17, Math.hypot(x, z) * 0.47) -
        v * v * 19,
      z * n + v * radius * 0.16,
    );
  }
  g.computeVertexNormals();
  return g;
}
function pine() {
  const pos = [],
    colors = [];
  let sides = 9,
    rings = [];
  for (let j = 0; j < 4; j++) {
    const ring = [];
    for (let i = 0; i < sides; i++) {
      let a = (i / sides) * Math.PI * 2 + j * 0.07,
        rad =
          [0.19, 1, 0.6, 0.01][j] *
          (0.8 + 0.22 * Math.sin(i * 34 + j) + 0.09 * Math.cos(i * 7));
      ring.push([
        Math.cos(a) * rad,
        [-0.4, -0.32, -0.13, 0.5][j] - (j === 1 ? 0.1 * (i % 2) : 0),
        Math.sin(a) * rad,
      ]);
    }
    rings.push(ring);
  }
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < sides; i++) {
      let n = (i + 1) % sides;
      for (const v of [
        rings[j][i],
        rings[j + 1][i],
        rings[j][n],
        rings[j][n],
        rings[j + 1][i],
        rings[j + 1][n],
      ]) {
        pos.push(...v);
        let k = 0.72 + 0.18 * Math.cos(i) * Math.cos(j);
        colors.push(k, k, k);
      }
    }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
export function forest(scene) {
  let ground = new T.PlaneGeometry(1300, 1350, 210, 210);
  ground.rotateX(-Math.PI / 2);
  let p = ground.attributes.position,
    col = [];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, terrain(x, z) - 0.17);
    const c = new T.Color().setHSL(
      0.24 + rand() * 0.07,
      0.32,
      0.037 + 0.022 * rand() + 0.014 * Math.sin(x * 0.07 + z * 0.12),
    );
    col.push(c.r, c.g, c.b);
  }
  ground.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  ground.computeVertexNormals();
  const land = new T.Mesh(ground, material(0xffffff, { vertexColors: true }));
  land.receiveShadow = true;
  scene.add(land);
  const road = material(0xffffff, {
    map: dirt(),
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const path of Object.values(edges)) {
    const pos = [],
      uv = [],
      idx = [];
    let d = 0;
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i],
        a = path[Math.max(0, i - 1)],
        b = path[Math.min(path.length - 1, i + 1)],
        h = Math.atan2(b[0] - a[0], b[1] - a[1]);
      d += Math.hypot(x - a[0], z - a[1]);
      for (let j = 0; j < 5; j++) {
        const off = (j - 2) * (roadHalfWidth / 2 + 0.16 * Math.sin(d * 0.16));
        let X = x + Math.cos(h) * off,
          Z = z - Math.sin(h) * off;
        pos.push(X, terrain(X, Z) + 0.13, Z);
        uv.push(j / 4, d / 15);
        let k = i * 5 + j;
        if (i && j) idx.push(k - 6, k - 1, k, k - 6, k, k - 5);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new T.Mesh(g, road);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const waterVerts = [],
    waterIdx = [];
  const bridge = edges.IJ[23];
  for (let i = -26; i <= 26; i++) {
    let x = bridge[0] + i * 3,
      z = bridge[1] + Math.sin(i * 0.16) * 4;
    for (let k of [-1, 1]) {
      const Z = z + k * (5 + 0.8 * Math.cos(i * 0.29));
      waterVerts.push(x, terrain(x, Z) + 0.025, Z);
    }
    let a = (i + 26) * 2;
    if (i > -26) waterIdx.push(a - 2, a - 1, a, a - 1, a + 1, a);
  }
  const wg = new T.BufferGeometry();
  wg.setAttribute("position", new T.Float32BufferAttribute(waterVerts, 3));
  wg.setIndex(waterIdx);
  wg.computeVertexNormals();
  scene.add(
    new T.Mesh(
      wg,
      material(0x345c71, {
        roughness: 0.18,
        metalness: 0.38,
        side: T.DoubleSide,
      }),
    ),
  );
  const batches = new Map(),
    geos = {
      wood: new T.CylinderGeometry(0.64, 1, 1, 7),
      pine: pine(),
      leaves: new T.IcosahedronGeometry(1, 0),
      stone: new T.DodecahedronGeometry(1, 0),
      box: new T.BoxGeometry(),
      grass: new T.ConeGeometry(1, 1, 3),
    },
    dummy = new T.Object3D();
  function add(k, x, y, z, w, h, d, c, rot = 0, tilt = 0) {
    const cell = k + ":" + Math.floor(x / 150) + ":" + Math.floor(z / 150);
    if (!batches.has(cell)) batches.set(cell, { k, items: [] });
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, rot, tilt);
    dummy.updateMatrix();
    batches.get(cell).items.push([dummy.matrix.clone(), new T.Color(c)]);
  }
  const greens = [0x30423b, 0x273f39, 0x354d45, 0x334641],
    trees = [];
  for (let i = 0; i < 11500; i++) {
    let x = (rand() - 0.5) * 1000,
      z = (rand() - 0.47) * 1040,
      dist = roadDistance(x, z),
      y = terrain(x, z);
    if (dist < roadHalfWidth + 2 || Math.hypot(x, z) < 20) continue;
    const clearing = Math.sin(x * 0.027) * Math.cos(z * 0.021) > 0.35;
    if (i < 4750 && (!clearing || rand() < 0.1)) {
      let h = 7 + rand() ** 1.3 * 19,
        w = h * (0.2 + rand() * 0.13),
        c = greens[i % 4];
      trees.push([x, z]);
      if (i % 9 === 0) {
        add("wood", x, y + h * 0.29, z, 0.48, h * 0.66, 0.5, 0x554838);
        for (let j = 0; j < 5; j++) {
          let a = j * 1.27;
          add(
            "leaves",
            x + Math.cos(a) * w * 0.63,
            y + h * 0.65 + rand() * 2,
            z + Math.sin(a) * w * 0.63,
            w * 0.92,
            h * 0.18,
            w * 0.84,
            0x314434,
            i + j,
          );
        }
        continue;
      }
      add("wood", x, y + h * 0.29, z, 0.35, h * 0.6, 0.35, 0x594737);
      for (let j = 0; j < 3; j++)
        add(
          "pine",
          x + 0.1 * j,
          y + h * (0.39 + j * 0.22),
          z,
          w * (1 - j * 0.25),
          h * (0.6 - j * 0.055),
          w * (1 - j * 0.25),
          c,
          i + j * 0.35,
        );
    } else if (i % 7 === 0)
      add("stone", x, y + 0.4, z, 1 + rand() * 2, 1.4, 2, 0x62656a, i);
    else if (i % 5 === 0) add("leaves", x, y + 0.5, z, 2, 1, 1.6, 0x46513e, i);
    else add("grass", x, y + 0.35, z, 0.65, 0.9, 0.55, 0x6e7054, i, 0.2);
  }
  for (const [key, path] of Object.entries(edges)) {
    for (let i = 12; i < path.length - 2; i += 12) {
      const [x, z] = path[i],
        q = path[i + 1],
        h = Math.atan2(q[0] - x, q[1] - z),
        side = i % 24 ? 1 : -1,
        X = x + Math.cos(h) * 8.4 * side,
        Z = z - Math.sin(h) * 8.4 * side,
        Y = terrain(X, Z);
      add("box", X, Y + 0.65, Z, 0.17, 1.3, 0.17, 0x81705b, h);
      add("box", X, Y + 1.18, Z, 0.19, 0.18, 0.19, 0xffb04b, h);
      for (let j = 0; j < 6; j++) {
        let a = X + rand() * 2,
          b = Z + rand() * 2;
        add(
          "grass",
          a,
          terrain(a, b) + 0.32,
          b,
          0.28,
          0.7,
          0.24,
          0x797756,
          j,
          0.15,
        );
      }
      if (i % 36 === 0) {
        add("wood", X + 2, Y + 0.6, Z + 2, 0.6, 1.25, 0.6, 0x6d5546);
        add("wood", X + 4, Y + 0.5, Z + 3, 0.4, 4, 0.42, 0x5e4f42, h, 1.42);
      }
    }
  }
  for (const i of [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]) {
    const path = edges.IJ,
      [x, z] = path[i],
      p = path[i + 1],
      h = Math.atan2(p[0] - x, p[1] - z);
    add("box", x, terrain(x, z) + 0.19, z, 15.4, 0.14, 2.1, 0x715a44, h);
    for (const side of [-1, 1]) {
      const X = x + side * 7.5 * Math.cos(h),
        Z = z - side * 7.5 * Math.sin(h);
      add("box", X, terrain(X, Z) + 1, Z, 0.25, 0.22, 2.2, 0x937b5f, h);
      if (i % 2 === 0)
        add("box", X, terrain(X, Z) + 0.5, Z, 0.27, 1.22, 0.29, 0x726446, h);
    }
  }
  for (const [x, z] of [
    [185, -113],
    [-250, 245],
    [65, 175],
  ]) {
    let y = terrain(x, z);
    add("box", x, y + 2, z, 8, 4, 6, 0x534539);
    for (let s of [-1, 1])
      add(
        "box",
        x + s * 2.15,
        y + 4.65,
        z,
        4.9,
        0.34,
        7.3,
        0x394447,
        0,
        -s * 0.3,
      );
    add("box", x, y + 1.5, z + 3.05, 2.2, 3, 0.1, 0x212526);
    for (let i = 0; i < 9; i++) {
      add("box", x + i * 2.8, y + 0.7, z + 7, 0.2, 1.5, 0.2, 0x7e6c53);
      add("box", x + i * 2.8, y + 0.95, z + 7, 2.9, 0.2, 0.14, 0x8a735a);
    }
  }
  for (let i = 0; i < 9100; i++) {
    let x = (rand() - 0.5) * 690,
      z = (rand() - 0.4) * 800;
    if (roadDistance(x, z) < roadHalfWidth + 1) continue;
    let y = terrain(x, z),
      c = rand() > 0.5 ? 0x5f6240 : 0x415444;
    for (let j = 0; j < 3; j++)
      add(
        "grass",
        x + 0.21 * j,
        y + 0.24,
        z + 0.13 * j,
        0.12 + rand() * 0.16,
        0.35 + rand() * 0.45,
        0.1,
        c,
        i + j,
        (j - 1) * 0.29,
      );
  }
  const solids = new Map();
  for (const { k, items } of batches.values()) {
    if (!["wood", "box", "stone"].includes(k)) continue;
    for (const [m] of items) {
      const a = m.elements,
        x = a[12],
        z = a[14],
        radius = Math.min(
          4.2,
          Math.max(0.35, Math.hypot(a[0], a[1], a[2]) * 0.7),
        );
      if (k === "box" && (radius < 1 || Math.hypot(a[4], a[5], a[6]) < 2))
        continue;
      const key = Math.floor(x / 12) + "," + Math.floor(z / 12);
      if (roadDistance(x, z) < radius + roadHalfWidth + 1) continue;
      if (!solids.has(key)) solids.set(key, []);
      solids.get(key).push([x, z, radius, false, k]);
    }
  }
  // Roe deer stand at the shoulders of several forest roads.
  for (const [edge, fraction, off] of [
    ["BC", 0.46, 4.9],
    ["DA", 0.28, -6.2],
    ["GH", 0.31, 5.1],
    ["IJ", 0.7, -5],
    ["LE", 0.52, 6],
    ["EF", 0.36, -5.3],
  ]) {
    const path = edges[edge],
      i = Math.floor(path.length * fraction),
      [cx, cz] = path[i];
    const h = Math.atan2(path[i + 1][0] - cx, path[i + 1][1] - cz);
    const x = cx + Math.cos(h) * off,
      z = cz - Math.sin(h) * off,
      y = terrain(x, z) + 0.14;
    const part = (dx, dy, dz, w, height, depth, color) =>
      add("stone", x + dx, y + dy, z + dz, w, height, depth, color);
    part(0, 1, 0, 0.47, 0.51, 0.94, 0xaa7851);
    part(0, 1.49, 0.64, 0.27, 0.55, 0.28, 0xba885b);
    part(0, 1.92, 0.77, 0.28, 0.24, 0.34, 0xc19569);
    part(0, 1.87, 1.05, 0.17, 0.14, 0.2, 0x53483f);
    part(0, 1.12, -0.85, 0.2, 0.2, 0.19, 0xe8d8b4);
    for (const side of [-1, 1]) {
      part(side * 0.19, 2.14, 0.69, 0.11, 0.26, 0.08, 0xbb966c);
      for (const stride of [-1, 1])
        part(side * 0.28, 0.51, stride * 0.54, 0.09, 0.54, 0.1, 0x896b51);
    }
    const key = Math.floor(x / 12) + "," + Math.floor(z / 12);
    if (!solids.has(key)) solids.set(key, []);
    solids.get(key).unshift([x, z, 1.05, true]);
  }
  function collides(x, z) {
    let cx = Math.floor(x / 12),
      cz = Math.floor(z / 12);
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cz - 1; j <= cz + 1; j++)
        for (let [X, Z, r, animal, kind] of solids.get(i + "," + j) || [])
          if ((x - X) ** 2 + (z - Z) ** 2 < (r + 0.35) ** 2)
            return { x: X, z: Z, r: r + 0.35, animal, kind };
    return null;
  }
  const chunks = [];
  const wind = { value: 0 };
  for (const { k, items } of batches.values()) {
    const m = material(0xffffff, { vertexColors: k === "pine" });
    if (["grass", "pine"].includes(k))
      m.onBeforeCompile = (s) => {
        s.uniforms.wind = wind;
        s.vertexShader =
          "uniform float wind;\n" +
          s.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n transformed.x += sin(wind+instanceMatrix[3].x*0.7)*0.025*(position.y+0.5);",
          );
      };
    const o = new T.InstancedMesh(geos[k], m, items.length);
    items.forEach(([matrix, color], i) => {
      o.setMatrixAt(i, matrix);
      o.setColorAt(i, color);
    });
    o.computeBoundingSphere();
    o.receiveShadow = true;
    o.castShadow = k === "pine";
    o.userData.kind = k;
    o.userData.full = items.length;
    chunks.push(o);
    scene.add(o);
  }
  for (let i = 0; i < 28; i++) {
    let a = i * 0.226,
      h = 80 + rand() * 140;
    let m = new T.Mesh(ridge(90 + rand() * 110, h), material(0x324353));
    m.position.set(Math.sin(a) * 570, h * 0.27, Math.cos(a) * 570);
    m.rotation.y = i;
    scene.add(m);
  }
  return { chunks, wind, road, collides };
}
