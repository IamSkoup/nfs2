import { stats } from "./tuning.js";
import { raceShoulder, angle, clamp } from "./map.js";
import { idealWindow } from "./drag.js";
import { drive } from "./ai.js";
import { move, roadDistance } from "./physics.js";
import { ravine, crossRavine } from "./ravine.js";
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
        d += event.type === "Драг" ? 53 : 90, i++
      ) {
        const clearOfJump = s => !event.ravine || s < ravine.start - 36 || s > ravine.start + 32;
        const extra = d - (event.type === "Драг" ? 25 : 43);
        if (clearOfJump(extra)) this.obstacles.push({
          s: extra + lap * event.route.length,
          off: (i % 2 ? -1 : 1) * event.obstacleOffset,
          kind: i % 2 ? "Бревно" : "Камень",
        });
        if (!clearOfJump(d)) continue;
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
          st.speed *= event.level * (1 + 0.017 * id) * 1.008;
          st.accel *= (event.level + 0.08 * id) * 1.015;
          st.turn += 0.1 * id;
          st.grip *= 1 + 0.15 * event.level;
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
          obstacleCooldown: new Map(),
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
    if (this.failure) {
      this.time += dt;
      this.over = this.time >= this.tipUntil;
      return;
    }
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
          let ideal = r.rev >= idealWindow(r) && r.rev <= 0.9;
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
        r.surface = roadDistance(r.x, r.z) > raceShoulder ? "grass" : "dry";
      const previousOffset = r.offset;
      move(r, c, dt, t, e, bend, this.free && !r.id);
      if (!this.free && drag && !r.id && r.fatigue >= 1) {
        this.fail("Сгорел мотор", 1.5);
        return;
      }
      if (!this.free && e.ravine && crossRavine(r, before[r.id], dt, t)) {
        if (!r.id) { this.fail("Разбился!", 3); return; }
        r.out = true;
        r.speed = 0;
        continue;
      }
      const hit = !r.flight && this.collides?.(r.x, r.z);
      if (hit) {
        this.contact(
          r,
          hit.animal ? "animal" : hit.kind === "stone" ? "stone" : "wood",
        );
        if (hit.kind === "fence" && this.time >= (r.nextFenceHit || 0)) {
          r.speed *= 0.52;
          r.nextFenceHit = this.time + 0.6;
        }
        if (hit.animal && this.time >= (r.nextAnimalHit || 0)) {
          r.speed *= 0.12;
          r.vx *= 0.12;
          r.vz *= 0.12;
          r.nextAnimalHit = this.time + 0.8;
          if (!r.id) this.say("Косуля");
        }
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
      for (let i = 0; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        const halfLength = o.kind === "Лужа" ? 2.1 : o.kind === "Бревно" ? 0.82 : 1.35;
        if (o.s - halfLength > Math.max(r.s,before[r.id])) break;
        if (Math.min(r.s,before[r.id]) > o.s + halfLength) continue;
        // Clip the movement segment to the obstacle's longitudinal extent.
        const span = r.s - before[r.id];
        const at = edge => previousOffset + (r.offset - previousOffset) *
          (span ? clamp((edge - before[r.id]) / span, 0, 1) : 1);
        const a = at(o.s - halfLength), b = at(o.s + halfLength);
        const halfWidth = o.kind === "Камень" ? 1.70 : o.kind === "Лужа" ? 1.8 : 1.675;
        if (o.off >= Math.min(a, b) - halfWidth && o.off <= Math.max(a, b) + halfWidth &&
            this.time >= (r.obstacleCooldown.get(i) || 0)) {
          r.obstacleCooldown.set(i, this.time + 1);
          if (o.kind !== "Лужа")
            this.contact(r, o.kind === "Камень" ? "stone" : "wood");
          r.speed *= o.kind === "Лужа" ? 0.74 : 0.46;
          r.vx *= 0.8;
          r.vz *= 0.8;
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
  contact(racer, kind) {
    if (racer.id || racer.speed < 2 || this.time < (this.nextImpact || 0))
      return;
    this.impact = { kind, speed: racer.speed };
    this.nextImpact = this.time + 0.65;
  }
  fail(message, delay) {
    const p = this.player;
    this.failure = this.feedback = message;
    this.tipUntil = this.time + delay;
    this.rank = Math.max(2, this.racers.length);
    this.impact = { kind: "stone", speed: Math.max(12, p.speed) };
    Object.assign(p, { vx: 0, vz: 0, speed: 0, side: 0, boosting: false });
  }
  recover() {
    if (this.failure || this.player.flight) return;
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
      detour: 0,
      routeDistance: 0,
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
