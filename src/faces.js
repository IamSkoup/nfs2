import * as T from "./vendor.js";

const styles = {
  fuli:   { iris: "#3b7131", nose: "#985d48", muzzle: "#f6dfb5", spots: "#501b20", brow: -3, lid: -4 },
  azdat:  { iris: "#a0ba50", nose: "#52412d", muzzle: "#f5e5ae", spots: "#302727", brow: 9, lid: 6 },
  tano:   { iris: "#ab7132", nose: "#6f4033", muzzle: "#edd0a6", spots: "#513428", brow: 3, lid: 3 },
  nuru:   { iris: "#699088", nose: "#906555", muzzle: "#f7ead0", spots: "#584539", brow: -7, lid: -1 },
  safira: { iris: "#81964c", nose: "#795059", muzzle: "#f3dfcf", spots: "#48333e", brow: 0, lid: -5 },
};

const textures = new Map();

// The horizontal axis wraps around the cheeks. The seam is behind the ears.
export function faceMap(type) {
  if (textures.has(type)) return textures.get(type);
  const style = styles[type], fuli = type === "fuli", azdat = type === "azdat";
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  c.translate(256, 0);
  const ink = "#332324";
  function fill(d, color) {
    c.fillStyle = color;
    c.fill(new Path2D(d));
  }
  function oval(x, y, rx, ry, color, rotation = 0) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  function line(d, color, width) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.stroke(new Path2D(d));
  }

  // A single light muzzle flows down the bridge, over the lips and under the jaw.
  fill("M 0 204 C 14 206 19 223 29 232 C 44 246 69 251 73 272 C 75 296 48 320 45 344 Q 35 388 0 392 Q -38 387 -48 343 C -55 319 -79 298 -76 275 C -73 253 -46 246 -31 233 C -16 220 -13 207 0 204Z", style.muzzle);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    const lid = style.lid;
    fill("M 24 171 C 21 133 44 102 77 100 C 111 96 137 118 138 151 C 139 183 114 203 80 205 C 49 206 27 195 24 171Z", "#f7dfaa");
    const eye = new Path2D(`M 27 162 C 28 ${137+lid} 45 ${115+lid} 75 ${113+lid}
      C 104 ${111+lid} 125 ${131+lid} 128 157 C 127 181 105 196 79 197
      C 52 198 32 187 27 162Z`);
    c.fillStyle = "#fff6d7";
    c.fill(eye);
    c.save();
    c.clip(eye);
    const gaze = 69 + side * 3;
    oval(gaze, 154, azdat ? 32 : 35, 42, style.iris);
    oval(gaze, 156, azdat ? 15 : 17, 22, "#243623");
    oval(gaze + side * 9, 144, 7, 8, "#fffbe8");
    c.restore();
    c.strokeStyle = ink;
    c.lineWidth = 3.2;
    c.stroke(eye);
    line(`M 28 159 C 31 ${131+lid} 50 ${114+lid} 76 ${113+lid} C 100 ${112+lid} 122 ${131+lid} 127 154`, ink, 4.5);
    c.translate(0, 4);
    fill(`M 30 ${94+style.brow*.22} C 49 80 74 77 96 82 Q 111 85 121 95 Q 95 85 75 86
      Q 50 85 32 98 Q 28 100 30 ${94+style.brow*.22}Z`, "#523329");
    c.translate(0, -4);

    if (fuli) {
      oval(157, 207, 9, 12, style.spots, .35);
      oval(129, 232, 22, 16, style.spots, -.38);
      oval(91, 258, 23, 20, style.spots, -.50);
      oval(94, 260, 9, 10, "#f3bc29", -.50);
    } else {
      fill("M 126 160 Q 128 193 92 224 Q 73 241 67 262 Q 66 244 79 222 Q 103 197 108 189Z", style.spots);
      oval(156, 214, 8, 11, style.spots, .3);
      oval(134, 242, 10, 7, style.spots, -.4);
      oval(169, 252, 7, 9, style.spots);
    }
    c.restore();
  }

  if (fuli) {
    fill("M -56 0 Q -73 18 -49 32 Q -29 44 -42 57 Q -59 65 -64 47 Q -47 51 -52 41 Q -81 27 -77 9 L -75 0Z", style.spots);
    fill("M -15 0 Q -31 14 -22 25 Q -6 41 -24 53 Q -38 48 -37 38 Q -25 38 -31 28 Q -42 15 -30 0Z", style.spots);
    oval(-22, 65, 6, 5, style.spots);
    oval(45, 27, 12, 6, style.spots, -.34);
  } else {
    for (const [x,y,r] of [[-49,27,6],[-23,42,5],[13,29,7],[45,45,6],[64,18,8]])
      oval(x,y,r,r*1.35,style.spots,x/100);
  }

  // The nose, philtrum and mouth follow the same surface as the cheeks.
  fill("M -25 237 C -20 225 -9 218 0 217 C 10 218 23 224 26 235 Q 20 247 2 256 Q -1 258 -5 254 Q -19 247 -25 237Z", style.nose);
  fill("M -24 236 Q -15 236 -10 242 Q -2 245 0 253 Q 8 245 16 241 Q 20 234 25 234 Q 23 245 2 257 Q -3 258 -7 253 Q -20 247 -24 236Z", "#57372f");
  line("M 0 255 Q 1 266 -1 273", ink, 2.7);
  line("M -36 275 Q -18 283 0 275 Q 18 283 36 275", ink, 2.8);
  line("M -12 290 Q 1 294 14 290", "#c2a37f", 1.8);

  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  textures.set(type, texture);
  return texture;
}
