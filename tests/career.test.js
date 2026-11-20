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

test("Оба драга можно выиграть без тюнинга и адреналина по звуковому сигналу", async () => {
  for (const event of events.filter((e) => e.type === "Драг")) {
    const race = new Race(event, fresh());
    let reaction = -1,
      cues = 0;
    for (let frame = 0; frame < 12000 && !race.over; frame++) {
      const p = race.player;
      if (p.breathCue) {
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
    assert.equal(race.rank, 1, event.name);
  }
});
