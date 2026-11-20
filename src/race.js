import { stats } from "./tuning.js";
import { angle, clamp } from "./map.js";
import { drive } from "./ai.js";
import { move, roadDistance } from "./physics.js";
export class Race {
  constructor(event, save, free = false) {
    this.event = event;
    this.free = free;
    this.time = 0;
    this.countdown = free ? 0 : 3.6;
    this.total = event.route.length * event.laps;
    this.obstacles = [];
    this.passes = 0;
    this.peak = 0;
    this.bestLap = Infinity;
    this.lastLap = 0;
    this.eliminated = 0;
    this.rank = 1;
    this.feedback = "";
    this.tipUntil = 0;
    for (let lap = 0; lap < event.laps; lap++)
      for (
        let d = 65, i = 0;
        d < event.route.length - 22;
        d += event.type === "Драг" ? 65 : 125, i++
      ) {
        this.obstacles.push({
          s: d + lap * event.route.length,
          off: (((i * 7 + event.id) % 3) - 1) * 3.85,
          kind: ["Бревно", "Камень", "Лужа"][i % 3],
        });
        if (event.type === "Драг" && i % 4 === 2)
          this.obstacles.push({
            s: d + lap * event.route.length,
            off: (((i * 7 + event.id + 1) % 3) - 1) * 3.85,
            kind: "Камень",
          });
      }
    this.racers = Array.from(
      { length: 1 + (free ? 2 : event.bots) },
      (_, id) => {
        const st = stats(id ? { upgrades: {} } : save);
        if (id) {
          st.speed *= event.level * (1 + 0.017 * id);
          st.accel *= event.level + 0.08 * id;
          st.turn += 0.1 * id;
        }
        let offset =
            (id === 0 ? 0 : id === 1 ? -1 : id === 2 ? 1 : -0.5) * 3.85,
          s = id === 3 ? 0 : 2;
        const p = event.route.sample(s, offset);
        return {
          id,
          name:
            id === 0
              ? "Фули"
              : event.id === 10
                ? "Кайон"
                : event.type === "Дуэль"
                  ? "Аздат"
                  : ["", "Тано", "Нуру", "Сафира"][id],
          st,
          s,
          ...p,
          heading: p.h,
          offset,
          side: 0,
          vx: 0,
          vz: 0,
          speed: 0,
          phase: 1,
          rev: 0,
          fatigue: 0,
          pulse: 1,
          cool: 0,
          lane: Math.round(offset / 3.85),
          boost: st.tank,
          duration: 0,
          surface: "dry",
          lastObstacle: -1,
          lap: 0,
          feedback: "",
          air: 0,
          blink: 0,
        };
      },
    );
    this.player = this.racers[0];
  }
  ranking() {
    return [...this.racers].sort(
      (a, b) =>
        Number(!!a.out) - Number(!!b.out) ||
        (a.finish ?? Infinity) - (b.finish ?? Infinity) ||
        b.s - a.s,
    );
  }
  tick(dt, input) {
    if (this.over) return;
    let e = this.event,
      t = e.route;
    const drag = e.type === "Драг";
    if (this.countdown > 0) {
      this.countdown -= dt;
      for (const r of this.racers) {
        r.rev = clamp(
          r.rev +
            dt *
              (r.id ? (r.rev < 0.82 ? 0.7 : -0.36) : input.gas ? 0.76 : -0.46),
          0,
          1,
        );
        if (this.countdown <= 0) {
          let ideal = r.rev >= 0.9 - r.st.breath / 100 && r.rev <= 0.9;
          r.speed =
            r.st.launch * (drag ? (ideal ? 2 : r.rev > 0.9 ? 0.45 : 1) : 1);
          r.rev = 0.1;
          if (!r.id && drag && ideal) this.say("Идеальный старт");
        }
      }
      return;
    }
    this.time += dt;
    const before = this.racers.map((r) => r.s);
    for (const r of this.racers) {
      if (r.out || r.finish != null) continue;
      const s = r.s % t.length,
        bend = angle(t.sample(Math.min(t.length, s + 12)).h - t.sample(s).h);
      const c = r.id ? drive(r, this, bend) : input;
      if (this.free && !r.id)
        r.surface = roadDistance(r.x, r.z) > 7 ? "grass" : "dry";
      move(r, c, dt, t, e, bend, this.free && !r.id);
      const hit = this.collides?.(r.x, r.z);
      if (hit) {
        const dx = r.x - hit.x,
          dz = r.z - hit.z,
          d = Math.hypot(dx, dz) || 1;
        r.x = hit.x + (dx / d) * (hit.r + 0.05);
        r.z = hit.z + (dz / d) * (hit.r + 0.05);
        const inward = Math.min(0, (r.vx * dx + r.vz * dz) / d);
        r.vx -= (inward * dx) / d;
        r.vz -= (inward * dz) / d;
        r.speed = Math.max(0, r.speed - 11 * dt);
        if (r.id && r.speed < 3)
          r.heading +=
            Math.sign(Math.sin(r.heading - Math.atan2(dx, dz)) || 1) * dt * 1.7;
      }
      if (r.feedback) {
        if (!r.id) this.say(r.feedback);
        r.feedback = "";
      }
      if (this.free) {
        if (r.id) {
          const f = t.project(r.x, r.z, r.s % t.length);
          if (f.s > t.length - 1) Object.assign(r, { s: 0, lap: 0 });
        }
        continue;
      }
      for (let i = r.lastObstacle + 1; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        if (o.s > r.s) break;
        r.lastObstacle = i;
        if (Math.abs(r.offset - o.off) < 1.35) {
          r.speed *= o.kind === "Лужа" ? 0.74 : 0.46;
          if (!r.id) this.say(o.kind);
        }
      }
      const lap = Math.floor(r.s / t.length);
      if (lap > r.lap) {
        r.lap = lap;
        if (!r.id) {
          this.bestLap = Math.min(this.bestLap, this.time - this.lastLap);
          this.lastLap = this.time;
        }
      }
      if (r.s >= this.total) {
        r.finish = this.time - (r.s - this.total) / Math.max(1, r.speed);
        r.s = this.total;
        r.speed = 0;
      }
    }
    if (this.free) return;
    for (let i = 0; i < this.racers.length; i++) {
      const a = this.racers[i];
      if (a.out || a.finish != null) continue;
      for (const b of this.racers.slice(i + 1)) {
        if (b.out || b.finish != null || Math.abs(a.s - b.s) > 2.1) continue;
        let dx = b.x - a.x,
          dz = b.z - a.z,
          d = Math.hypot(dx, dz);
        if (d > 0 && d < 1.05) {
          const push = (1.05 - d) * 0.48;
          if (!drag) {
            a.x -= (dx / d) * push;
            a.z -= (dz / d) * push;
            b.x += (dx / d) * push;
            b.z += (dz / d) * push;
          }
          const behind = a.s <= b.s ? a : b;
          behind.speed = Math.max(0, behind.speed - 3 * dt);
        }
      }
    }
    this.peak = Math.max(this.peak, this.player.speed * 3.6);
    for (const r of this.racers.slice(1)) {
      if (!r.out && before[r.id] > before[0] && r.s <= this.player.s) {
        this.passes++;
        this.player.boost = Math.min(
          this.player.st.tank,
          this.player.boost + 8,
        );
      }
    }
    if (e.type === "Выбывание" && this.ranking()[0].lap > this.eliminated) {
      const last = this.ranking()
        .filter((r) => !r.out)
        .at(-1);
      last.out = true;
      this.eliminated++;
      this.say(last.name + " выбывает");
    }
    this.rank = this.ranking().indexOf(this.player) + 1;
    if (
      this.player.finish != null ||
      this.player.out ||
      (e.type === "На время" && this.time > this.limit)
    ) {
      this.over = true;
      if (this.player.out) this.rank = this.racers.length - this.eliminated + 1;
      if (e.type === "На время" && this.time > this.limit) this.rank = 2;
    }
  }
  recover() {
    let p = this.player,
      route = this.event.route,
      pos = route.sample(
        this.free ? 0 : Math.max(0, (p.s % route.length) - 0.4),
      );
    Object.assign(p, {
      x: pos.x,
      z: pos.z,
      heading: pos.h,
      vx: 0,
      vz: 0,
      speed: 0,
      offset: 0,
      side: 0,
      lane: 0,
    });
  }
  get limit() {
    return this.event.route.length / 18.7 + 4;
  }
  say(text) {
    this.feedback = text;
    this.tipUntil = this.time + 1.25;
  }
}
