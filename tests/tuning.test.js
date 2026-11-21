import test from "node:test";
import assert from "node:assert/strict";
import { fresh, restore } from "../src/save.js";
import { buy, equip, installedTier, stats, tiers, upgrades } from "../src/tuning.js";
import { events } from "../src/config.js";
import { Race } from "../src/race.js";
import { settle } from "../src/economy.js";

test("Покупка открывает уровень, а бесплатная установка меняет характеристики следующего заезда", () => {
  const s = fresh();
  s.money = 6000;
  s.done = [0, 1, 2, 3];
  assert.equal(equip(s, "speed", 2), false);
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(buy(s, "speed"));
    assert.equal(installedTier(s, "speed"), i);
    assert.ok(equip(s, "speed", 0));
  }
  const balance = s.money;
  for (const [i, speed] of [22, 24, 26, 30].entries()) {
    assert.ok(equip(s, "speed", i));
    const loaded = restore(JSON.parse(JSON.stringify(s)));
    assert.equal(new Race(events[0], loaded).player.st.speed, speed);
    assert.equal(loaded.money, balance);
    assert.equal(loaded.upgrades.speed, 3);
  }
  assert.equal(buy(s, "speed"), false);
});

test("Финал бесплатно открывает мастерскую и сохраняет установленную сборку", () => {
  const s = fresh();
  s.upgrades.accel = 2;
  s.installed.accel = 0;
  const before = stats(s);
  const race = new Race(events[9], s);
  settle(s, race, false);
  assert.deepEqual(s.cosmetics, [0]);
  settle(s, new Race(events[9], s), true);
  assert.deepEqual(s.cosmetics, [0, 1, 2]);
  assert.deepEqual(stats(s), before);
  assert.equal(s.money, events[9].prize);
  for (const [key] of upgrades) assert.ok(equip(s, key, 3));
  assert.deepEqual(stats(restore(s)), stats(s));
});

test("Старые сохранения с четвёртым уровнем и пройденным финалом", () => {
  const raw = { ...fresh(), upgrades: { speed: 4, accel: 1 } };
  delete raw.installed;
  assert.equal(stats(restore(raw)).speed, 30);
  const completed = restore({ ...raw, ending: true });
  assert.deepEqual(completed.cosmetics, [0, 1, 2]);
  assert.equal(installedTier(completed, "accel"), 1);
  assert.equal(installedTier(completed, "tank"), 0);
  for (const [key] of upgrades) assert.equal(completed.upgrades[key], 3);
  assert.deepEqual(restore(completed), completed);
});
