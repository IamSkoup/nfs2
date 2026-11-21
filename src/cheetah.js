import * as T from "./vendor.js";

// Positions in this file are in the GLB's bind pose (+Z points towards the nose).
const coats = {
  fuli: [0xf3bc29, 0x49171c, 0xffe3a3],
  azdat: [0xf8cb31, 0x241f29, 0xffe6a0],
  tano: [0xc78b54, 0x49352b, 0xf1d5a3],
  nuru: [0xe3b976, 0x514638, 0xf8e7c5],
  safira: [0xb99479, 0x3f3035, 0xf4dcca],
};
const variants = new WeakMap();
const clamp = T.MathUtils.clamp;

function sculpt(position, name, type) {
  const fuli = type === "fuli", azdat = type === "azdat";
  for (let i = 0; i < position.count; i++) {
    let x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const side = Math.sign(x);
    const head = clamp((y - 1.72) * 5, 0, 1) * clamp((z - .68) * 5, 0, 1);
    if (/eye|iris|pupil/.test(name)) {
      const dx = Math.abs(x) - .182;
      y = 2.1 + (y - 2.1) * (azdat ? .67 : .83) *
        (1 - .32 * Math.min(1, Math.abs(dx) / .14)) + dx * (azdat ? .36 : .26);
    }
    if (name.includes("ear")) {
      const tip = clamp((y - 2.25) / .27, 0, 1);
      x = side * (.29 + (Math.abs(x) - .29) * (1 - .45 * tip) + tip * .075);
      y += tip * (fuli ? .07 : .035);
    }
    if (name.includes("ivory_muzzle") || name.includes("whisker_dot")) {
      const lift = .15 * Math.abs(x);
      y = 1.915 + (y-1.915) * .73 + lift;
      z -= .028;
    }
    if (name.includes("chin")) { y += .019; z -= .028; }
    if (name.includes("nose")) {
      x *= .64 + .5 * clamp((y - 1.94) / .09, 0, 1);
    }
    x *= 1 + head * (fuli ? .19 : azdat ? -.06 : .025);
    const torso = clamp((y-.82)*2.5,0,1) * clamp((.75-z)*4,0,1)
      * clamp((z+1.25)*5,0,1);
    const waist = Math.exp(-((z+.36)**2)/.11);
    x *= 1-torso*waist*(azdat ? .19 : fuli ? .12 : .06);
    y += torso*waist*clamp((1.62-y)*2,0,1)*(azdat ? .17 : .10);
    const tail = clamp((-z - 1.24) / 1.29, 0, 1);
    y += (azdat ? 1.02 : fuli ? .38 : .56) * tail ** 2;
    if (tail > 0.5) {
      const tip = clamp((tail-.5)*2,0,1);
      x += (x+.04)*tip*1.3;
      y += (position.getY(i)-1.18)*tip*.85;
    }
    z += head * (azdat ? .085 : -.012) + tail ** 3 * (azdat ? .38 : .08);
    if (azdat) y *= 1.07;
    if (type === "tano") x *= 1.07;
    if (type === "safira") z *= 1.04;
    position.setXYZ(i, x, y, z);
  }
}

const faceMaps = new Map();
function faceMap(type) {
  if (faceMaps.has(type)) return faceMaps.get(type);
  const azdat=type==="azdat", fuli=type==="fuli";
  const canvas=document.createElement("canvas");
  canvas.width=768; canvas.height=512;
  const c=canvas.getContext("2d");
  c.scale(1.5,1);
  function shape(path,color) { c.fillStyle=color; c.fill(new Path2D(path)); }
  function oval(x,y,rx,ry,ink) {
    c.beginPath(); c.ellipse(x,y,rx,ry,0,0,2*Math.PI); c.fillStyle=ink; c.fill();
  }
  for (const side of [-1,1]) {
    c.save();
    c.translate(256,0); c.scale(side,1);
    shape("M 12 280 Q 20 210 48 180 Q 94 148 154 177 Q 136 252 93 277 Q 52 302 12 280Z","#fbe4a1");
    const eye=new Path2D(azdat ?
      "M 24 231 Q 74 206 145 189 Q 126 253 90 263 Q 55 272 24 231Z":
      "M 22 244 Q 62 193 150 183 Q 128 246 88 263 Q 53 277 22 244Z");
    c.fillStyle="#fff4cb"; c.fill(eye);
    c.save(); c.clip(eye);
    oval(67,236,31,38,azdat?"#a4c34f":"#447e35");
    oval(61,239,13,27,"#1e2719");
    oval(71,220,7,8,"#fffbe3"); c.restore();
    c.strokeStyle="#291c1d"; c.lineWidth=4; c.stroke(eye);
    shape(azdat?"M 20 226 Q 72 206 150 182 L 144 199 Q 87 213 24 236Z":
      "M 15 250 Q 56 194 155 174 L 146 194 Q 75 199 25 247Z","#271918");
    shape(azdat?"M 18 164 Q 51 171 89 148 Q 122 134 157 145 Q 99 149 56 185 Q 25 197 18 164Z":
      "M 19 171 Q 87 111 147 150 Q 102 133 55 168 Q 33 189 19 182Z","#3a2020");
    if(azdat)shape("M 112 255 Q 105 296 69 343 Q 86 296 89 263Z","#352626");
    if(fuli) {
      oval(136,297,20,18,"#4b1921");oval(144,345,31,23,"#4b1921");oval(145,347,13,11,"#f3bc29");
      oval(90,327,12,10,"#4b1921");
    }
    c.restore();
  }
  if (fuli) {
    shape("M 244 52 Q 204 37 209 70 Q 211 82 225 89 Q 234 100 220 109 Q 196 94 192 75 Q 187 47 204 37 Q 227 21 244 52Z","#511b20");
    shape("M 249 107 Q 230 96 237 80 Q 250 63 240 47 Q 268 54 258 76 Q 248 89 255 97Z","#511b20");
    oval(245,121,8,6,"#511b20"); oval(291,72,15,8,"#511b20");
  } else {
    for (const [x,y,r] of [[224,62,7],[266,73,6],[289,53,9],[243,97,5]])
      oval(x,y,r,r*1.55,"#302728");
  }
  const tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  faceMaps.set(type,tex);
  return tex;
}
function coatMaterial(type) {
  const [gold, ink, ivory] = coats[type].map(c => new T.Color(c));
  const mat = new T.MeshStandardMaterial({ roughness: .92 });
  const fuli = type === "fuli", azdat = type === "azdat";
  mat.customProgramCacheKey = () => "cheetah-" + type;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      faceArt: { value: faceMap(type) }, furGold: { value: gold }, furInk: { value: ink }, furIvory: { value: ivory },
    });
    shader.vertexShader = "attribute vec3 coatPoint; varying vec3 furPoint; varying vec3 furNormal;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nfurPoint = coatPoint; furNormal = normal;");
    shader.fragmentShader = `varying vec3 furPoint;
      varying vec3 furNormal;
      uniform sampler2D faceArt;
      uniform vec3 furGold, furInk, furIvory;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(41.3,97.1)))*4375.13); }
      ` + shader.fragmentShader.replace("#include <color_fragment>", `
        vec3 p = furPoint;
        float tail = step(p.z,-1.25);
        float head = smoothstep(1.72,1.94,p.y)*smoothstep(.65,.9,p.z);
        vec2 uv = vec2(p.z + .48*p.x, p.y + .68*p.x*p.x + .15*p.x)
          * vec2(${fuli ? "3.5,4.5" : azdat ? "6.2,7.2" : "5.4,6.3"});
        uv += .11*sin(uv.yx*2.1);
        float spot = 0.;
        for (int row=-1;row<=1;row++) for (int col=-1;col<=1;col++) {
          vec2 cell=floor(uv)+vec2(float(col),float(row));
          float seed=hash(cell);
          vec2 center=cell+.5+.60*(vec2(seed,hash(cell+7.1))-.5);
          vec2 v=(uv-center)*vec2(.94,1.12);
          float radius=length(v)+.025*sin(atan(v.y,v.x)*3.+seed*9.);
          float mark=1.-smoothstep(.30,.33,radius);
          ${fuli ? "if(seed>.28) mark *= smoothstep(.11,.15,radius);" : ""}
          spot=max(spot,mark);
        }
        float cheek = smoothstep(.14,.26,abs(p.x));
        spot *= mix(1., max(cheek,smoothstep(2.20,2.32,p.y)),head);
        float bib = smoothstep(.32,.64,furNormal.z) * smoothstep(.36,.62,p.z)
          * (1.-smoothstep(1.76,1.94,p.y)) * smoothstep(.83,1.24,p.y);
        float belly = smoothstep(.12,.77,-furNormal.y) * smoothstep(.82,1.15,p.y)
          * (1.-smoothstep(1.40,1.69,p.y));
        float toes = 1.-smoothstep(.12,.17,p.y);
        float cream=max(max(bib,belly)*(1.-tail),toes);
        float rings=step(.47,fract((-p.z-1.35)*3.4));
        if(p.z < -1.63) spot=max(rings,1.-step(-2.39,p.z));
        float faceAngle=atan(p.x,p.z-1.055);
        float front=1.-smoothstep(1.28,1.60,abs(faceAngle));
        spot*=1.-front*head*(1.-smoothstep(2.25,2.35,p.y));
        diffuseColor.rgb=mix(mix(furGold,furInk,spot),furIvory,cream);
        vec2 portrait=vec2(.5+faceAngle/3.3,(p.y-1.69)/.81);
        vec4 art=texture2D(faceArt,clamp(portrait,0.,1.));
        diffuseColor.rgb=mix(diffuseColor.rgb,art.rgb,art.a*front*head);
      `);
  };
  return mat;
}

function variant(original, name, type, lod) {
  let cache = variants.get(original);
  if (!cache) variants.set(original, cache = new Map());
  if (cache.has(type)) return cache.get(type);
  const g = new T.BufferGeometry();
  for (const [key, value] of Object.entries(original.attributes)) g.setAttribute(key, value);
  g.setIndex(original.index);
  const pos = original.attributes.position.clone();
  sculpt(pos, name, type);
  g.setAttribute("position", pos);
  g.setAttribute("coatPoint", original.attributes.position);
  if (lod.has(original)) {
    const low = new T.BufferGeometry();
    for (const [key,value] of Object.entries(g.attributes)) low.setAttribute(key,value);
    low.setIndex(lod.get(original).index);
    lod.set(g,low);
  }
  cache.set(type,g);
  return g;
}

// Cut a fabric panel directly from the skinned surface. Its vertices have the
// very same weights and bind matrix as the fur beneath them.
function garment(body, scarf) {
  const base = body.geometry, p = base.attributes.position;
  const g = new T.BufferGeometry(), indices = [], pos = p.clone();
  const seam = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    seam[i] = scarf ? (y - 1.77 + .24 * (z-.74) + .14 * Math.max(0,1-Math.abs(x)*4)) / .075
      : (y - .43 - .12*x) / .10;
    if (scarf ? z < .34 : z < .16) seam[i]=20;
    const n=base.attributes.normal;
    pos.setXYZ(i,x+.014*n.getX(i),y+.014*n.getY(i),z+.014*n.getZ(i));
  }
  for (let i=0;i<base.index.count;i+=3) {
    const tri=[base.index.getX(i),base.index.getX(i+1),base.index.getX(i+2)];
    if (Math.min(...tri.map(j=>seam[j]))<=1 && Math.max(...tri.map(j=>seam[j]))>=-1)
      indices.push(...tri);
  }
  for (const key of ["skinIndex","skinWeight","normal"]) g.setAttribute(key,base.attributes[key]);
  g.setAttribute("position",pos);
  g.setAttribute("seam",new T.BufferAttribute(seam,1));
  g.setIndex(indices);
  const mat=new T.MeshStandardMaterial({color:scarf?0xb84024:0x277194,roughness:.84});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader="attribute float seam; varying float edge;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nedge=seam;");
    shader.fragmentShader="varying float edge;\n"+shader.fragmentShader.replace("#include <color_fragment>",
      "if(abs(edge)>1.) discard; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.61,.23),smoothstep(.62,.66,abs(edge))*(1.-smoothstep(.81,.86,abs(edge))));");
  };
  const cloth=new T.SkinnedMesh(g,mat);
  cloth.bind(body.skeleton,body.bindMatrix);
  cloth.frustumCulled=false;
  cloth.userData.garment=true;
  body.parent.add(cloth);
  return cloth;
}

export function dressModel(model,type,lod) {
  let body;
  model.traverse(o=>{
    if (!o.isMesh) return;
    const name=o.name.toLowerCase();
    o.geometry=variant(o.geometry,name,type,lod);
    o.castShadow=o.receiveShadow=true;
    if(name.includes("continuous_skin")) {
      body=o;
      o.material=coatMaterial(type);
    } else {
      o.material=o.material.clone();
      if (/eye|iris|pupil|tear_stripe/.test(name)) o.visible=false;
      if(name.includes("ivory_muzzle")) {
        o.material.onBeforeCompile = shader => {
          shader.vertexShader = "varying vec3 muzzle;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\nmuzzle=position;");
          shader.fragmentShader = "varying vec3 muzzle;\n" + shader.fragmentShader.replace(
            "#include <color_fragment>", `float cheek=abs(muzzle.x);
              float smile=1.907+.84*(cheek-.08)*(cheek-.08);
              float lip=(1.-smoothstep(.003,.008,abs(muzzle.y-smile)))*
                smoothstep(1.425,1.48,muzzle.z)*(1.-smoothstep(.17,.20,cheek));
              diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.085,.040,.028),lip);`);
        };
      }
      if(name.includes("nose")) o.material.color.setHex(type==="fuli"?0x875044:0x453728);
      if(name.includes("ear_interior")) o.material.color.setHex(0xb78465);

      if(name.includes("rounded_ear")) {
        const positions=o.geometry.attributes.position;
        const colors=new Float32Array(positions.count*3);
        const dark=new T.Color(type==="fuli"?0x4a1721:0x2f2928);
        const gold=new T.Color(coats[type][0]);
        const color=new T.Color();
        for(let i=0;i<positions.count;i++) {
          const y=positions.getY(i)/(type==="azdat"?1.07:1);
          color.copy(gold).lerp(dark,clamp((y-2.48)*25,0,1)).toArray(colors,3*i);
        }
        const attr=new T.BufferAttribute(colors,3);
        o.geometry.setAttribute("color",attr);
        lod.get(o.geometry)?.setAttribute("color",attr);
        o.material.color.setHex(0xffffff);
        o.material.vertexColors=true;
      }
    }
    o.userData.ownMaterial=true;
  });
  return type==="fuli" ? [garment(body,true),garment(body,false)] : [];
}
