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
    if (this.paused) return;
    if (this.kind && !this.current) this.next();
    else this.current?.play().catch(() => {});
  }
  mode(kind, fresh = false) {
    if (this.kind === kind && !fresh) return;
    this.paused = false;
    this.wind?.pause();
    this.setBoost(false);
    this.kind = kind;
    this.current = null;
    if (!kind || kind === "drag") {
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
    if (!kind || kind === "drag" || this.paused) return;
    const count = kind === "menu" ? 4 : 9;
    const available = Array.from({ length: count }, (_, i) => i + 1).filter(
      (i) => !this.missing.has(kind + i),
    );
    if (!available.length) return;
    const i = available.find(n => n > (this.last[kind] || 0)) ?? available[0];
    const a = new Audio();
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
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.setBoost(false);
      for (const a of [...this.players, ...this.fx.values()]) a.pause();
      this.wind?.pause();
    } else if (this.enabled) {
      if (this.current) this.current.play().catch(() => {});
      else this.next();
    }
  }
  ambience(speed) {
    if (
      !this.enabled ||
      this.paused ||
      !(this.kind === "race" || this.kind === "drag")
    )
      return;
    if (!this.wind) {
      this.wind = new Audio("assets/sfx/wind.wav");
      this.wind.loop = true;
    }
    this.wind.volume = this.s.sfx * (0.21 + Math.min(0.45, speed / 70));
    if (this.wind.paused && this.wind.volume) this.wind.play().catch(() => {});
  }
  update(dt) {
    if (this.paused) return;
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
  impact(kind, speed) {
    this.effect(
      "hit-" + kind,
      0.94 + Math.random() * 0.12,
      Math.min(1, 0.78 + speed / 100),
    );
  }
  effect(name, rate = 1, volume = 0.5) {
    if (this.paused || !this.enabled || !this.s.sfx || !this.kind) return;
    let a = this.fx.get(name);
    if (!a) {
      a = new Audio(
        "assets/sfx/" +
          name +
          (name.startsWith("hit-") ||
          ["leaves", "gravel", "mud", "breath-cue"].includes(name)
            ? ".wav"
            : ".ogg"),
      );
      this.fx.set(name, a);
    }
    a.volume = this.s.sfx * volume;
    a.playbackRate = rate;
    a.currentTime = 0;
    a.play().catch(() => {});
  }
  setBoost(active) {
    const playing = Boolean(
      active &&
        this.enabled &&
        (this.kind === "race" || this.kind === "drag") &&
        this.s.sfx,
    );
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
