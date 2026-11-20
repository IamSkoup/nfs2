import { bindings } from "./config.js";
export const KEY = "need-for-speed-fuli-2.v2";
export const fresh = () => ({
  version: 2,
  careerTime: 0,
  careerWins: 0,
  careerRaces: 0,
  money: 0,
  earned: 0,
  done: [],
  upgrades: {},
  records: {},
  scenes: [],
  seen: [],
  offer: "new",
  ending: false,
  pending: 0,
  races: 0,
  wins: 0,
  seconds: 0,
  distance: 0,
  peak: 0,
  passes: 0,
  cosmetics: [0],
  look: 0,
  settings: {
    music: 0.45,
    sfx: 0.55,
    video: 0.9,
    quality: "Среднее",
    distance: 760,
    shadows: 1,
    trees: 0.75,
    particles: 0.75,
    post: 1,
    scale: 1,
    fps: 60,
    camera: 0,
    sensitivity: 1,
    effects: 1,
    shake: 0.4,
    keys: { ...bindings },
  },
});
export function read() {
  const base = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.version === 2) return restore(raw);
  } catch {}
  return base;
}
export function restore(raw) {
  const base = fresh(),
    s = {
      ...base,
      ...raw,
      settings: { ...base.settings, ...raw.settings, keys: { ...bindings } },
    };
  for (let [k, v] of Object.entries(base))
    if (typeof v === "number" && (!Number.isFinite(s[k]) || s[k] < 0)) s[k] = v;
  const ids = (value, min, max) => [
    ...new Set(
      (Array.isArray(value) ? value : []).filter(
        (n) => Number.isInteger(n) && n >= min && n <= max,
      ),
    ),
  ];
  s.done = ids(s.done, 0, 9);
  s.scenes = ids(s.scenes, 1, 8);
  s.seen = ids(s.seen, 1, 8);
  s.cosmetics = [...new Set([0, ...ids(s.cosmetics, 0, 2)])];
  if (!s.cosmetics.includes(s.look)) s.look = 0;
  if (
    !["new", "offered", "accepted", "declined", "won", "closed"].includes(
      s.offer,
    )
  )
    s.offer = "new";
  s.upgrades = Object.fromEntries(
    Object.entries(s.upgrades || {}).filter(
      ([, v]) => Number.isInteger(v) && v >= 0 && v <= 4,
    ),
  );
  s.records = Object.fromEntries(
    Object.entries(s.records || {}).filter(
      ([k, v]) => /^([0-9]|10)$/.test(k) && Number.isFinite(v) && v > 0,
    ),
  );
  for (const [k, [a, b]] of Object.entries({
    music: [0, 1],
    sfx: [0, 1],
    video: [0, 1],
    sensitivity: [0.55, 1.6],
    trees: [0.35, 1],
    scale: [0.5, 1.5],
    fps: [30, 90],
    distance: [400, 950],
    camera: [0, 4],
    effects: [0, 1],
    shake: [0, 1],
    particles: [0, 1],
    post: [0, 1],
    shadows: [0, 1],
  })) {
    const v = s.settings[k];
    s.settings[k] = Number.isFinite(v)
      ? Math.min(b, Math.max(a, v))
      : base.settings[k];
  }
  s.settings.camera = Math.round(s.settings.camera);
  for (const k in bindings)
    if (/^[a-z0-9]{1,30}$/i.test(raw.settings?.keys?.[k] || ""))
      s.settings.keys[k] = raw.settings.keys[k];
  if (![0, 3, 8].includes(s.pending)) s.pending = 0;
  return s;
}
export function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    document.getElementById("notice").textContent =
      "Браузер не смог сохранить прогресс";
  }
}
