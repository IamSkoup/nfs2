import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../src/config.js";
import { Race } from "../src/race.js";
import { fresh } from "../src/save.js";

test("«НЕ ТУДА» зависит от направления движения, в том числе на обочине", () => {
  const race = new Race(events[1], fresh());
  race.countdown = 0;
  const route = race.event.route;
  for (const offset of [0, 32]) {
    const s = 80;
    const pos = route.sample(s, offset);
    const near = route.project(pos.x, pos.z, s);
    const h = route.sample(near.s).h;
    const p = race.player;
    Object.assign(p, pos, { s, heading: h + Math.PI, speed: 8 });
    for (const [angle, speed, expected] of [
      [h, 8, false], [h + Math.PI/2, 8, false], [h + Math.PI, 8, true],
      [h + Math.PI, 0, false],
    ]) {
      p.vx = speed * Math.sin(angle);
      p.vz = speed * Math.cos(angle);
      assert.equal(race.wrongWay, expected);
    }
  }
});
