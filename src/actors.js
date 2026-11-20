import * as T from "./vendor.js";
import { clone } from "./vendor.js";
const mat = (color, roughness = 0.85, emissive = 0) =>
  new T.MeshStandardMaterial({
    color,
    roughness,
    emissive,
    emissiveIntensity: 1.5,
  });
function mesh(g, m, x = 0, y = 0, z = 0, parent) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent?.add(o);
  return o;
}
function branch(a, b, r1, r2, m, parent) {
  const d = new T.Vector3().subVectors(b, a),
    o = mesh(new T.CylinderGeometry(r2, r1, d.length(), 7), m, 0, 0, 0, parent);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return o;
}

export class Actors {
  setActors(n, boss) {
    if (this.ghost) {
      this.scene.remove(this.ghost.root);
      this.ghost = null;
    }
    for (const a of this.actors) {
      this.scene.remove(a.root);
      a.mixer?.stopAllAction();
      a.root.traverse((o) => {
        if (a.wheels || o === a.band) {
          o.geometry?.dispose();
          o.material?.map?.dispose();
          o.material?.dispose();
        } else if (o.isMesh && o.userData.ownMaterial) o.material.dispose();
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
    }
    this.actors = [];
    for (let i = 0; i < n; i++) {
      if (i === 1 && boss === "kion") {
        this.actors.push(this.scooter());
        continue;
      }
      const model = clone(this.gltf.scene);
      const root = new T.Group();
      root.add(model);
      root.scale.setScalar(1.25);
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          if (i) {
            o.material = o.material.clone();
            o.userData.ownMaterial = true;
            o.material.color.multiply(
              new T.Color([0xffffff, 0xbbcde4, 0xd6b890, 0xb6d9c3][i]),
            );
          }
        }
      });
      this.scene.add(root);
      const mixer = new T.AnimationMixer(model),
        actions = {};
      for (const c of this.gltf.animations)
        actions[c.name] = mixer.clipAction(c);
      const clips = Object.keys(actions);
      const idle =
          actions.Idle ||
          actions[clips.find((x) => x.includes("Idle"))] ||
          actions[clips[0]],
        run =
          actions.Run || actions[clips.find((x) => x.includes("Run"))] || idle;
      idle?.play();
      run?.play();
      if (run) run.weight = 0;
      this.actors.push({ root, model, mixer, idle, run });
    }
  }
  scooter() {
    const root = new T.Group();
    this.scene.add(root);
    const metal = mat(0x232b30, 0.45),
      rubber = mat(0x12151b),
      seat = mat(0x302e2c),
      skin = mat(0xb88b68),
      cloth = mat(0x2f7385),
      wheels = [];
    for (const z of [-1.05, 1.05]) {
      const w = mesh(
        new T.TorusGeometry(0.44, 0.13, 10, 24),
        rubber,
        0,
        0.57,
        z,
        root,
      );
      w.rotation.y = Math.PI / 2;
      wheels.push(w);
      const hub = mesh(
        new T.CylinderGeometry(0.22, 0.22, 0.28, 16),
        metal,
        0,
        0.57,
        z,
        root,
      );
      hub.rotation.z = Math.PI / 2;
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        const t = mesh(
          new T.BoxGeometry(0.22, 0.07, 0.13),
          seat,
          0,
          0.57 + Math.sin(a) * 0.52,
          z + Math.cos(a) * 0.52,
          root,
        );
        t.rotation.x = -a;
      }
    }
    branch(
      new T.Vector3(0, 0.65, -1),
      new T.Vector3(0, 0.5, 0.65),
      0.12,
      0.12,
      metal,
      root,
    );
    mesh(new T.BoxGeometry(0.7, 0.15, 1.3), metal, 0, 0.48, 0, root);
    branch(
      new T.Vector3(0, 0.5, 0.7),
      new T.Vector3(0, 1.8, 1),
      0.1,
      0.1,
      metal,
      root,
    );
    branch(
      new T.Vector3(-0.5, 1.8, 1),
      new T.Vector3(0.5, 1.8, 1),
      0.045,
      0.045,
      metal,
      root,
    );
    for (const z of [-0.65, 0]) {
      branch(
        new T.Vector3(0, 0.5, z),
        new T.Vector3(0, 1.18, z),
        0.08,
        0.08,
        metal,
        root,
      );
      mesh(new T.BoxGeometry(0.65, 0.19, 0.55), seat, 0, 1.2, z, root);
    }
    const headlight = mesh(
      new T.SphereGeometry(0.18, 12, 8),
      mat(0xe6ffff, 0.2, 0x91bdc9),
      0,
      1.5,
      1.14,
      root,
    );
    const lamp = new T.PointLight(0xc3eeff, 12, 18);
    lamp.position.copy(headlight.position);
    root.add(lamp);
    // Seated stylized human; no claim of portrait resemblance.
    const torso = mesh(
      new T.CapsuleGeometry(0.25, 0.48, 5, 10),
      cloth,
      0,
      1.85,
      -0.05,
      root,
    );
    torso.rotation.x = 0.2;
    mesh(new T.SphereGeometry(0.24, 16, 12), skin, 0, 2.42, 0.08, root);
    mesh(
      new T.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      metal,
      0,
      2.48,
      0.08,
      root,
    );
    for (const s of [-1, 1]) {
      branch(
        new T.Vector3(s * 0.22, 2.1, 0.02),
        new T.Vector3(s * 0.4, 1.8, 0.94),
        0.1,
        0.07,
        cloth,
        root,
      );
      branch(
        new T.Vector3(s * 0.17, 1.55, -0.1),
        new T.Vector3(s * 0.3, 0.83, 0.45),
        0.14,
        0.09,
        metal,
        root,
      );
      mesh(
        new T.BoxGeometry(0.18, 0.12, 0.4),
        rubber,
        s * 0.3,
        0.64,
        0.38,
        root,
      );
    }
    for (const x of [-0.4, 0.4])
      for (const z of [-1.4, -0.8])
        branch(
          new T.Vector3(x, 1.3, z),
          new T.Vector3(x + 0.06, 1.8, z),
          0.025,
          0.025,
          metal,
          root,
        );
    for (const y of [1.35, 1.5, 1.7]) {
      branch(
        new T.Vector3(-0.4, y, -1.4),
        new T.Vector3(0.4, y, -1.4),
        0.025,
        0.025,
        metal,
        root,
      );
      for (const x of [-0.4, 0.4])
        branch(
          new T.Vector3(x, y, -1.4),
          new T.Vector3(x, y, -0.8),
          0.025,
          0.025,
          metal,
          root,
        );
    }
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#242b2a";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#d0c5aa";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("К А Й О Н", 20, 60);
    ctx.font = "22px sans-serif";
    ctx.fillText("ЭЛЕКТРОСКУТЕР", 20, 112);
    ctx.fillText("", 20, 156);
    ctx.fillText("", 20, 205);
    const sticker = new T.CanvasTexture(canvas);
    for (const s of [-1, 1]) {
      const plane = mesh(
        new T.PlaneGeometry(0.9, 0.45),
        new T.MeshStandardMaterial({ map: sticker, side: T.DoubleSide }),
        s * 0.37,
        0.75,
        -0.15,
        root,
      );
      plane.rotation.y = Math.PI / 2;
    }
    return { root, wheels };
  }
}
