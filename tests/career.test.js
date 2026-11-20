import test from "node:test";
import assert from "node:assert/strict";
import { events } from "../src/config.js";
import { Race } from "../src/race.js";
import { drive } from "../src/ai.js";
import { fresh } from "../src/save.js";
import { settle } from "../src/economy.js";
import { buy } from "../src/tuning.js";
import { breathe } from "../src/drag.js";
function run(e, s) {
  const r = new Race(e, s);
  for (let n = 0; n < 60 * 450 && !r.over; n++) {
    let p = r.player,
      c = drive(p, r, 0);
    if (e.type === "Драг") c.breath = p.rev >= 0.81;
    r.tick(1 / 60, c);
  }
  return r;
}
test("Прохождение карьеры с оплатой улучшений", () => {
  const s = fresh();
  for (const e of events.slice(0, 10)) {
    const r = run(e, s);
    assert.equal(r.over, true, e.name + " " + r.player.s);
    assert.equal(r.rank, 1, e.name + " " + r.time);
    assert.equal(settle(s, r, true), e.prize);
    assert.ok(!settle(s, r, true));
    for (const key of [
      "speed",
      "accel",
      "turn",
      "grip",
      "launch",
      "breath",
      "tank",
      "power",
      "stamina",
    ])
      buy(s, key);
  }
  assert.ok(s.ending);
  assert.equal(s.done.length, 10);
});
test("Повторные гонки и разовая выплата за Кайона", () => {
  let s = fresh();
  for (let i = 0; i < 2; i++) {
    for (const id of [0, 10]) {
      let r = new Race(events[id], s);
      r.time = 60;
      assert.equal(
        settle(s, r, true),
        id === 0 ? (i ? 227 : 650) : i ? 0 : 7000,
      );
      s = JSON.parse(JSON.stringify(s));
    }
  }
  assert.deepEqual(s.done, [0]);
  assert.equal(s.offer, "won");
});
test("Поражения в дуэлях и финале", () => {
  for (const id of [2, 9, 10]) {
    let s = fresh(),
      r = new Race(events[id], s);
    r.rank = 2;
    assert.equal(settle(s, r, true), 0);
    assert.equal(s.ending, false);
    assert.deepEqual(s.done, []);
    assert.equal(s.offer, "new");
  }
});
test("Дыхание, зелёная и красная зоны", () => {
  let r = new Race(events[3], fresh()).player;
  r.rev = 0.83;
  assert.equal(breathe(r), "Идеально");
  assert.equal(r.phase, 2);
  r.rev = 1;
  r.cool = 0;
  r.speed = 10;
  assert.equal(breathe(r), "Потеря темпа");
  assert.ok(r.speed < 10);
});
test("Свободный бег и быстрые гонки", () => {
  let s = fresh(),
    r = new Race(events[0], s, true);
  for (let i = 0; i < 600; i++) r.tick(1 / 60, { gas: true, steer: 0.1 });
  assert.ok(r.player.s > 50);
  assert.ok(!r.over);
  assert.equal(settle(s, r, false), 0);
  assert.deepEqual(s.done, []);
});

test("В обеих драг-гонках сигнал указывает на штатное окно дыхания", async () => {
  for (const event of events.filter((e) => e.type === "Драг")) {
    const race = new Race(event, fresh());
    let reaction = -1,
      cues = 0;
    for (let frame = 0; frame < 12000 && !race.over; frame++) {
      const p = race.player;
      if (p.breathCue) {
        assert.ok(p.rev >= 0.9 - p.st.breath / 100 && p.rev <= 0.9);
        p.breathCue = false;
        reaction = frame + 13;
        cues++;
      }
      const control = drive(p, race, 0);
      race.tick(1 / 60, {
        ...control,
        gas: true,
        boost: false,
        breath: frame === reaction,
      });
    }
    assert.ok(cues >= 4);
    assert.ok(race.over);
    assert.equal(race.player.phase, 5);
  }
});

test("Северный отсев засчитывает круг на прямой по всей ширине дороги", () => {
  const event = events[5];
  const route = event.route;
  assert.ok(Math.abs(route.sample(12).h - route.sample(route.length - 12).h) < 0.04);
  for (const offset of [-16, -6, 0, 6, 16]) {
    const race = new Race(event, fresh());
    race.countdown = 0;
    const distance = route.length - 9;
    const pos = route.sample(distance, offset);
    Object.assign(race.player, pos, {
      s: distance, heading: pos.h, speed: 18, offset,
      lastObstacle: race.obstacles.findIndex(o => o.s > distance) - 1,
    });
    for (let frame = 0; frame < 100; frame++)
      race.tick(1 / 60, {gas:true, steer:0});
    assert.equal(race.player.lap, 1);
    assert.ok(race.player.s > route.length + 10);
  }
});

test("Возврат после длинного съезда восстанавливает прогресс и скорость", async () => {
  const {move} = await import("../src/physics.js");
  const route = events[5].route;
  const p = new Race(events[5], fresh()).player;
  p.s = 30;
  for (let i=0; i<180; i++) {
    const d=30+i*.5, off=i<110 ? 38 : Math.max(12,38-(i-110)*.7);
    const pos=route.sample(d,off);
    Object.assign(p,pos,{heading:pos.h,speed:26,vx:26*Math.sin(pos.h),vz:26*Math.cos(pos.h)});
    move(p,{gas:true,steer:0},1/50,route,events[5],0);
  }
  assert.ok(p.s>110);
  assert.equal(p.surface,"dry");
});
