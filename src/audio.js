export class AudioManager {
  constructor(settings) {
    this.s = settings;
    this.kind = "";
    this.enabled = false;
    this.missing = new Set();
    this.players = [];
    this.last = {};
    this.fx = new Map();
  }
  unlock() {
    this.enabled = true;
    if (this.kind && !this.current) this.next();
    else this.current?.play().catch(() => {});
  }
  mode(kind, fresh = false) {
    if (this.kind === kind && !fresh) return;
    this.setBoost(false);
    this.kind = kind;
    this.current = null;
    if (!kind) {
      for (const a of this.players) {
        a.pause();
        a.src = "";
        a.onerror = null;
      }
      this.players = [];
    } else if (this.enabled) this.next();
  }
  next() {
    const kind = this.kind;
    if (!kind) return;
    const count = kind === "menu" ? 4 : 9;
    let all = Array.from({ length: count }, (_, i) => i + 1).filter(
      (i) => !this.missing.has(kind + i),
    );
    if (!all.length) return;
    if (all.length > 1) all = all.filter((i) => i !== this.last[kind]);
    const i = all[Math.floor(Math.random() * all.length)],
      a = new Audio();
    this.last[kind] = i;
    this.players.push(a);
    this.current = a;
    a.volume = 0;
    a.onended = () => {
      if (a === this.current) this.next();
    };
    a.onerror = () => {
      if (a !== this.current) return;
      this.missing.add(kind + i);
      this.current = null;
      this.next();
    };
    a.src = "assets/music/" + kind + i + ".mp3";
    a.play().catch(() => {});
  }
  update(dt) {
    this.players = this.players.filter((a) => {
      let target = a === this.current ? this.s.music : 0;
      a.volume +=
        Math.sign(target - a.volume) *
        Math.min(Math.abs(target - a.volume), dt * 1.7);
      if (a !== this.current && a.volume < 0.002) {
        a.pause();
        a.onerror = null;
        a.onended = null;
        return false;
      }
      return true;
    });
  }
  effect(name, rate = 1) {
    if (!this.enabled || !this.s.sfx || !this.kind) return;
    let a = this.fx.get(name);
    if (!a) {
      a = new Audio("assets/sfx/" + name + ".ogg");
      this.fx.set(name, a);
    }
    a.volume = this.s.sfx * 0.5;
    a.playbackRate = rate;
    a.currentTime = 0;
    a.play().catch(() => {});
  }
  setBoost(active) {
    const playing = Boolean(active && this.enabled && this.kind === "race" && this.s.sfx);
    if (playing === Boolean(this.boostActive)) return;
    this.boostActive = playing;
    if (playing) {
      this.effect("adrenaline-hiss");
      this.fx.get("adrenaline-hiss").loop = true;
    } else {
      const sound = this.fx.get("adrenaline-hiss");
      if (sound) {
        sound.pause();
        sound.currentTime = 0;
      }
    }
  }
  silence() {
    this.mode("");
    for (const a of this.fx.values()) a.pause();
  }
}
