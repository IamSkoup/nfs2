import { courseFence } from "./course-fence.js";
import * as T from "./vendor.js";
import { Actors } from "./actors.js";
import { forest } from "./forest.js";
import { terrain, clamp, edges } from "./map.js";
const vec = (x, y, z) => new T.Vector3(x, y, z);
export class World extends Actors {
  constructor(canvas) {
    super();
    this.scene = new T.Scene();
    this.actors = [];
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.camera = new T.PerspectiveCamera(43, 1, 0.1, 1250);
    this.camera.position.set(6, 2.85, 7.5);
    this.target = vec(-1, 1.7, 0);
    this.scene.fog = new T.FogExp2(0x354550, 0.0039);
    const sky = new T.Mesh(
      new T.SphereGeometry(900, 32, 24),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        vertexShader:
          "varying vec3 pos;void main(){pos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `varying vec3 pos;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}float noise(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+1.),u.x),u.y);}void main(){vec3 d=normalize(pos);float h=d.y;float m=distance(d,normalize(vec3(-.43,.145,-.96)));vec3 sky=mix(vec3(.14,.21,.27),vec3(.014,.034,.076),smoothstep(-.05,.43,h));sky+=vec3(.33,.31,.25)*exp(-m*11.)+vec3(.86,.81,.65)*(.88+.12*sin(d.y*433.)*sin(d.x*316.))*(1.-smoothstep(.045,.047,m));vec2 uv=d.xz/max(.06,d.y+.07)*2.;float cloud=.55*noise(uv)+.3*noise(uv*2.)+.15*noise(uv*4.);sky=mix(sky,vec3(.115,.155,.19),smoothstep(.39,.8,cloud)*smoothstep(-.04,.09,h)*.62);float star=fract(sin(dot(floor(d.xy*800.),vec2(127.1,311.7)))*43758.5453);sky+=smoothstep(.9982,1.,star)*smoothstep(.14,.6,h)*.42;gl_FragColor=vec4(sky,1.);}`,
      }),
    );
    this.sky = sky;
    this.scene.add(sky, new T.HemisphereLight(0xa6c5e5, 0x413d38, 0.79));
    this.light = new T.DirectionalLight(0xc7d8f2, 1.37);
    this.light.castShadow = true;
    Object.assign(this.light.shadow.camera, {
      left: -22,
      right: 22,
      top: 22,
      bottom: -22,
      far: 140,
    });
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.bias = -0.0009;
    this.scene.add(this.light, this.light.target);
    const rim = new T.DirectionalLight(0x96ceff, 1.72);
    rim.position.set(-20, 12, -18);
    this.scene.add(rim);
    this.keyLight = new T.PointLight(0xffc482, 28, 14, 2);
    this.scene.add(this.keyLight);
    this.environment = forest(this.scene);
    this.items = new T.Group();
    this.scene.add(this.items);
    this.orbit = 0;
    this.viewOffset = 0;
    canvas.addEventListener("pointerdown", (e) => {
      if (document.body.dataset.page === "race") {
        this.dragCamera = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.dragCamera != null) {
        this.viewOffset += (e.clientX - this.dragCamera) * 0.009;
        this.dragCamera = e.clientX;
      }
    });
    canvas.addEventListener(
      "lostpointercapture",
      () => (this.dragCamera = null),
    );
    this.t = 0;
    this.trailHistory = [];
    this.trailPositions = new Float32Array(24 * 2 * 3);
    const trailGeo = new T.BufferGeometry();
    trailGeo.setAttribute(
      "position",
      new T.BufferAttribute(this.trailPositions, 3).setUsage(
        T.DynamicDrawUsage,
      ),
    );
    const indices = [];
    for (let i = 0; i < 23; i++)
      indices.push(
        2 * i,
        2 * i + 1,
        2 * i + 2,
        2 * i + 1,
        2 * i + 3,
        2 * i + 2,
      );
    trailGeo.setIndex(indices);
    this.trail = new T.Mesh(
      trailGeo,
      new T.MeshBasicMaterial({
        color: 0xe6b262,
        transparent: true,
        opacity: 0.36,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
    this.markIndex = 0;
    this.step = 0;
    this.dust = new T.InstancedMesh(
      new T.IcosahedronGeometry(0.12, 0),
      new T.MeshBasicMaterial({
        color: 0xaa8865,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
      60,
    );
    this.marks = new T.InstancedMesh(
      new T.CircleGeometry(0.14, 5),
      new T.MeshBasicMaterial({
        color: 0x322b27,
        transparent: true,
        opacity: 0.48,
      }),
      120,
    );
    this.scene.add(this.dust, this.marks);
    this.cloud = [];
    this.dummy = new T.Object3D();
    this.marks.count = 0;
    this.dust.count = 0;
    this.marks.frustumCulled = this.dust.frustumCulled = false;
    const points = new Float32Array(440 * 3);
    for (let i = 0; i < 440; i++) {
      let x = (Math.random() - 0.5) * 100,
        z = (Math.random() - 0.5) * 100;
      points.set([x, Math.random() * 19, z], i * 3);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(points, 3));
    this.motes = new T.Points(
      geometry,
      new T.PointsMaterial({
        color: 0xfbcb7b,
        size: 0.065,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.scene.add(this.motes);
    const rainPos = new Float32Array(180 * 6);
    for (let i = 0; i < 180; i++) {
      const x = (Math.random() - 0.5) * 32,
        y = Math.random() * 22,
        z = (Math.random() - 0.5) * 32;
      rainPos.set([x, y, z, x + 0.09, y - 0.7, z], i * 6);
    }
    const rg = new T.BufferGeometry();
    rg.setAttribute("position", new T.BufferAttribute(rainPos, 3));
    this.rain = new T.LineSegments(
      rg,
      new T.LineBasicMaterial({
        color: 0x9cbed2,
        transparent: true,
        opacity: 0.44,
      }),
    );
    this.scene.add(this.rain);
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    this.resize();
    addEventListener("resize", this.resize);
  }
  async load() {
    this.gltf = await new T.GLTFLoader().loadAsync("assets/models/fuli.glb");
    const buffer = await (
        await fetch("assets/models/fuli-lod.bin")
      ).arrayBuffer(),
      words = new Uint32Array(buffer),
      rows = new Map();
    for (let i = 0; i < words.length; ) {
      let mesh = words[i++],
        prim = words[i++],
        count = words[i++];
      rows.set(mesh + ":" + prim, words.subarray(i, i + count));
      i += count;
    }
    this.lod = new Map();
    this.gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const a = this.gltf.parser.associations.get(o),
        indices = rows.get(a?.meshes + ":" + (a?.primitives ?? 0));
      if (!indices) return;
      const low = new T.BufferGeometry();
      for (const [k, attr] of Object.entries(o.geometry.attributes))
        low.setAttribute(k, attr);
      low.setIndex(new T.BufferAttribute(indices, 1));
      low.boundingSphere = o.geometry.boundingSphere;
      this.lod.set(o.geometry, low);
    });
    this.setActors(1);
  }
  populate(r, look) {
    this.items.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      o.geometry?.dispose();
      o.material?.map?.dispose();
      o.material?.dispose();
    });
    this.items.clear();
    this.snap = true;
    this.viewOffset = 0;
    const count = r?.racers.length || 1;
    if (this.actorKey !== count + "-" + (r?.event.id === 10)) {
      this.setActors(count, r?.event.id === 10 ? "kion" : "");
      this.actorKey = count + "-" + (r?.event.id === 10);
    }
    this.coat(look);
    this.cloud = [];
    this.marks.count = 0;
    this.markIndex = 0;
    if (!r) return;
    const fence = courseFence(this.items, r.free ? undefined : r.event.route.pts);
    r.collides = (x,z) => fence(x,z) || this.environment.collides(x,z);
    if (r.free) return;
    const add = (g, c, x, y, z) => {
      const m = new T.Mesh(
        g,
        new T.MeshStandardMaterial({ color: c, roughness: 0.78 }),
      );
      m.position.set(x, y, z);
      this.items.add(m);
      return m;
    };
    for (const o of r.obstacles.filter((o) => o.s < r.event.route.length)) {
      const p = r.event.route.sample(o.s, o.off),
        y = terrain(p.x, p.z);
      let m;
      if (o.kind === "Лужа") {
        m = add(new T.SphereGeometry(1, 12, 6), 0x677989, p.x, y + 0.19, p.z);
        m.scale.set(1.45, 0.08, 2.1);
        m.material.roughness = 0.12;
      } else if (o.kind === "Камень") {
        m = add(new T.DodecahedronGeometry(1), 0x96948f, p.x, y + 0.48, p.z);
        m.scale.set(1.35, 0.83, 1);
      } else {
        m = add(
          new T.CylinderGeometry(0.37, 0.43, 2.65, 8),
          0x886045,
          p.x,
          y + 0.54,
          p.z,
        );
        m.rotation.z = 1.48;
        m.rotation.y = p.h;
      }
    }
    for (let d = 16; d < r.event.route.length; d += 24) {
      const p = r.event.route.sample(d, 12.6);
      let m = add(
        new T.ConeGeometry(0.23, 0.65, 4),
        0xff9829,
        p.x,
        terrain(p.x, p.z) + 0.65,
        p.z,
      );
      m.rotation.x = Math.PI * 0.5;
      m.rotation.z = -p.h;
      m.material.emissive.setHex(0x915124);
    }
    // Mark unused exits at junctions along this event.
    for (const [edge, points] of Object.entries(edges)) {
      const code = r.event.code;
      if (code.includes(edge) || code.includes([...edge].reverse().join("")))
        continue;
      for (const side of [0, 1]) {
        if (!code.includes(edge[side])) continue;
        const path = side ? [...points].reverse() : points;
        let i = 1;
        while (
          i < path.length - 1 &&
          Math.hypot(path[i][0] - path[0][0], path[i][1] - path[0][1]) < 18
        )
          i++;
        const [x, z] = path[i],
          prev = path[i - 1];
        const h = Math.atan2(x - prev[0], z - prev[1]);
        for (let k = -3; k <= 3; k++) {
          const X = x + k * 1.6 * Math.cos(h),
            Z = z - k * 1.6 * Math.sin(h);
          const panel = add(
            new T.BoxGeometry(1.6, 0.85, 0.3),
            k % 2 ? 0xff9a32 : 0xffeacc,
            X,
            terrain(X, Z) + 1.05,
            Z,
          );
          panel.rotation.y = h;
          panel.material.emissive.setHex(k % 2 ? 0x954414 : 0x746645);
        }
      }
    }
    const banner = (p, label) => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 80;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#1b2223";
      ctx.fillRect(0, 0, 512, 80);
      ctx.fillStyle = "#f5ab46";
      ctx.fillRect(0, 70, 512, 10);
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++)
          if ((j + k) % 2 === 0) {
            ctx.fillStyle = "#d7d9d1";
            ctx.fillRect(10 + j * 15, k * 15 + 5, 15, 15);
            ctx.fillRect(440 + j * 15, k * 15 + 5, 15, 15);
          }
      ctx.fillStyle = "#f6f1e3";
      ctx.textAlign = "center";
      ctx.font = "bold italic 45px sans-serif";
      ctx.fillText(label, 256, 52);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      const mesh = new T.Mesh(
        new T.PlaneGeometry(27, 2.05),
        new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
      );
      const heightAt = sign => terrain(p.x + Math.cos(p.h)*13.45*sign, p.z - Math.sin(p.h)*13.45*sign);
      const top = Math.max(heightAt(-1),heightAt(1),terrain(p.x,p.z))+6.5;
      mesh.position.set(p.x, top-1.025, p.z);
      mesh.rotation.y = p.h + Math.PI;
      this.items.add(mesh);
      for (const sign of [-1, 1]) {
        const x = p.x + Math.cos(p.h) * 13.45 * sign,
          z = p.z - Math.sin(p.h) * 13.45 * sign;
        add(
          new T.CylinderGeometry(0.13, 0.16, top-heightAt(sign), 6),
          0x685849,
          x,
          (top+heightAt(sign))/2,
          z,
        );
      }
    };
    const finish = r.event.route.sample(r.event.route.length);
    banner(finish, "ФИНИШ");
    if (r.event.id === 9) {
      const p = r.event.route.sample(8);
      banner(p, "СУДНЫЙ ЧАС");
      for (const side of [-1, 1]) {
        const light = new T.PointLight(
          side === 1 ? 0xff922e : 0x95b9e4,
          95,
          24,
        );
        light.position.set(p.x + side * 6, terrain(p.x, p.z) + 4, p.z);
        this.items.add(light);
      }
    }
  }
  coat(look) {
    const a = this.actors[0];
    if (!a) return;
    if (!a.band) {
      a.band = new T.Mesh(
        new T.TorusGeometry(0.46, 0.055, 6, 30),
        new T.MeshStandardMaterial({ color: 0xda912e }),
      );
      a.band.position.set(0, 1.05, 0.58);
      a.root.add(a.band);
    }
    a.band.visible = look > 0;
    a.band.material.color.setHex(look === 2 ? 0x7fc6e7 : 0xffab43);
    this.trail.material.color.setHex(
      [0xe6b262, 0xff902e, 0x87d8ff][look] || 0xe6b262,
    );
    this.dust.material.color.setHex(
      [0xaa8865, 0xce995a, 0x96b4c2][look] || 0xaa8865,
    );
  }
  settings(s) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * s.scale);
    this.renderer.shadowMap.enabled = !!s.shadows;
    this.renderer.toneMappingExposure = s.post ? 1.14 : 1;
    this.camera.far = Math.max(s.distance, 950);
    this.environment.chunks.forEach((o) => {
      o.count = Math.floor(
        o.userData.full *
          (["wood", "pine", "grass", "leaves"].includes(o.userData.kind)
            ? s.trees
            : 1),
      );
    });
    this.motes.geometry.setDrawRange(0, Math.floor(440 * s.particles));
  }
  update(dt, r, page, s) {
    if (this.dragCamera == null) this.viewOffset *= Math.exp(-dt * 3);
    this.t += dt;
    const t = this.t;
    this.environment.wind.value = t;
    const P = r?.player || { x: 0, z: 0, heading: 0, speed: 0 };
    const rain = r?.event.weather === "Дождь",
      fog = r?.event.weather === "Туман";
    this.scene.fog.density =
      ((fog ? 0.009 : rain ? 0.006 : 0.0045) * 760) / s.distance;
    this.sky.position.copy(this.camera.position);
    this.light.position.set(P.x + 19, terrain(P.x, P.z) + 38, P.z + 28);
    this.keyLight.position.set(P.x + 2.3, terrain(P.x, P.z) + 4.5, P.z + 3.6);
    this.light.target.position.set(P.x, terrain(P.x, P.z), P.z);
    this.actors.forEach((a, i) => {
      let p = r?.racers[i] || P;
      const simple =
        !!r &&
        (s.quality === "Низкое" ||
          (i && Math.hypot(p.x - P.x, p.z - P.z) > 28));
      if (a.simple !== simple) {
        a.simple = simple;
        a.root.traverse((o) => {
          if (!o.isMesh) return;
          const full = o.userData.fullGeometry || o.geometry;
          o.userData.fullGeometry = full;
          o.geometry = simple ? this.lod.get(full) || full : full;
        });
      }
      a.root.visible = !p.out;
      let y = terrain(p.x, p.z);
      a.root.position.set(p.x, y + 0.19, p.z);
      a.root.rotation.y = r
        ? p.heading
        : -0.28 + this.orbit + 0.035 * Math.sin(t * 0.23);
      if (r) {
        const dx = Math.sin(p.heading),
          dz = Math.cos(p.heading),
          slope =
            (terrain(p.x + dx, p.z + dz) - terrain(p.x - dx, p.z - dz)) * 0.5;
        a.root.rotation.order = "YXZ";
        a.root.rotation.x +=
          (-Math.atan(slope) - a.root.rotation.x) * (1 - Math.exp(-dt * 6));
      } else a.root.rotation.x = 0;
      a.root.rotation.z = r ? clamp(-p.side * 0.016, -0.13, 0.13) : 0;
      if (a.mixer) {
        a.run.weight +=
          (clamp(p.speed / 4, 0, 1) - a.run.weight) * (1 - Math.exp(-dt * 12));
        a.idle.weight = 1 - a.run.weight;
        a.run.timeScale = 0.39 + p.speed / 11;
        a.mixer.update(dt);
      }
      if (a.wheels)
        a.wheels.forEach((w) => (w.rotation.x += (p.speed * dt) / 0.44));
    });
    const center = vec(P.x, terrain(P.x, P.z) + 1.38, P.z),
      portrait = innerWidth / innerHeight < 0.86;
    let dest, aim;
    if (r) {
      let mode = s.camera,
        h = P.heading + this.viewOffset,
        back = [7.8, 13, 4.7, 0.15, 9][mode],
        height = [3, 6, 2.4, 1, 3.5][mode],
        side = mode === 4 ? 5 : 0;
      if (r.countdown > 1) {
        side = (r.countdown - 1) * (r.event.id === 9 ? 4.5 : 2.6);
        back -= side * 0.8;
      }
      dest = vec(
        P.x - Math.sin(h) * back + Math.cos(h) * side,
        center.y + height + Math.sin(t * 18) * P.speed * 0.002 * s.shake,
        P.z - Math.cos(h) * back - Math.sin(h) * side,
      );
      aim = center.clone().add(vec(Math.sin(h) * 5, 0.1, Math.cos(h) * 5));
      if (mode === 3) this.actors[0].root.visible = false;
    } else {
      const tune = page === "tuning",
        z = portrait ? 12.5 : 6.8;
      dest = vec(
        (tune ? 5.6 : 5.15) + Math.sin(t * 0.08) * 0.26,
        2.25 + Math.sin(t * 0.12) * 0.09,
        z,
      );
      aim = vec(
        portrait ? -0.15 : tune ? -1.4 : -1.9,
        portrait ? 1.8 : 1.65,
        portrait ? 0.1 : 0.75,
      );
    }
    if (r && this.snap) {
      this.camera.position.copy(dest);
      this.target.copy(aim);
    } else {
      this.camera.position.lerp(dest, 1 - Math.exp(-dt * (r ? 6 : 3)));
      this.target.lerp(aim, 1 - Math.exp(-dt * 8));
    }
    this.snap = false;
    this.camera.lookAt(this.target);
    this.camera.fov +=
      ((r ? 57 + (P.speed * 0.13 + (P.boosting ? 6 : 0)) * s.effects : 42) -
        this.camera.fov) *
      Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
    this.motes.position.set(
      P.x + Math.sin(t) * 0.25,
      center.y + (rain ? -((t * 9) % 9) : Math.sin(t) * 0.5),
      P.z,
    );
    this.motes.material.color.setHex(0xfad38e);
    this.environment.road.roughness = rain ? 0.26 : 0.92;
    this.environment.road.color.setHex(rain ? 0xb5c0c4 : 0xffffff);
    this.trail.visible = !!(r && P.boosting && s.effects);
    if (this.trail.visible) {
      this.trailHistory.unshift([
        P.x - Math.sin(P.heading),
        terrain(P.x, P.z) + 0.47,
        P.z - Math.cos(P.heading),
        P.heading,
      ]);
      if (this.trailHistory.length > 24) this.trailHistory.pop();
      this.trailHistory.forEach(([x, y, z, h], i) => {
        const w = 0.18 * (1 - i / 24);
        this.trailPositions.set(
          [
            x - w * Math.cos(h),
            y,
            z + w * Math.sin(h),
            x + w * Math.cos(h),
            y,
            z - w * Math.sin(h),
          ],
          i * 6,
        );
      });
      this.trail.geometry.attributes.position.needsUpdate = true;
      this.trail.geometry.setDrawRange(
        0,
        Math.max(0, this.trailHistory.length - 1) * 6,
      );
      this.trail.material.opacity = 0.36 * s.effects;
    } else this.trailHistory.length = 0;
    this.motes.visible = !rain;
    this.rain.visible = rain && s.particles > 0;
    this.rain.position.set(P.x, center.y - ((t * 12) % 10), P.z);
    this.rain.geometry.setDrawRange(0, 2 * Math.floor(180 * s.particles));
    if (r && P.speed > 2 && s.particles && t > this.step) {
      this.step = t + 0.11;
      const sign = this.markIndex % 2 ? 1 : -1,
        x = P.x + Math.cos(P.heading) * 0.35 * sign,
        z = P.z - Math.sin(P.heading) * 0.35 * sign;
      this.cloud.push({ x, y: terrain(x, z) + 0.3, z, born: t });
      this.dummy.position.set(x, terrain(x, z) + 0.175, z);
      this.dummy.rotation.set(-Math.PI / 2, 0, P.heading);
      this.dummy.scale.set(1, 1.45, 1);
      this.dummy.updateMatrix();
      this.marks.setMatrixAt(this.markIndex++ % 120, this.dummy.matrix);
      this.marks.count = Math.min(120, this.markIndex);
      this.marks.instanceMatrix.needsUpdate = true;
    }
    this.cloud = this.cloud.filter((q) => t - q.born < 1);
    this.dust.count = this.cloud.length;
    this.cloud.forEach((q, i) => {
      const a = t - q.born;
      this.dummy.position.set(q.x + a * 0.45, q.y + a * 0.65, q.z);
      this.dummy.scale.setScalar((1 - a) * 2);
      this.dummy.updateMatrix();
      this.dust.setMatrixAt(i, this.dummy.matrix);
    });
    this.dust.instanceMatrix.needsUpdate = true;
    for (const o of this.environment.chunks) {
      const d = o.boundingSphere.center.distanceTo(this.camera.position);
      o.visible =
        d < s.distance * 0.66 + 100 && (o.userData.kind !== "grass" || d < 210);
      if (o.userData.kind === "pine" && d > 230)
        o.count = Math.floor(o.userData.full * s.trees * 0.52);
      else if (o.userData.kind === "pine")
        o.count = Math.floor(o.userData.full * s.trees);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
