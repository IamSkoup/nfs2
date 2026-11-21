import test from "node:test";
import assert from "node:assert/strict";
import { events } from "../src/config.js";
import { Race } from "../src/race.js";
import { fresh } from "../src/save.js";
import { ravine } from "../src/ravine.js";

const dt = 1 / 60;
const control = { gas: true, steer: 0 };
function approach(speed) {
  const r = new Race(events[3],fresh());
  r.countdown = 0;
  const s = ravine.start - 0.04;
  Object.assign(r.player, r.event.route.sample(s), { s, speed, phase: 4 });
  return r;
}
test("Разгон определяет дальность автоматического прыжка", () => {
  const fast = approach(18);
  for(let i=0;i<36;i++) fast.tick(dt,control);
  assert.ok(fast.player.air>1);
  for(let i=0;i<35;i++) fast.tick(dt,control);
  assert.equal(fast.player.air,0);
  assert.ok(fast.player.s>ravine.start+ravine.width);
  assert.ok(!fast.failure);

  const slow=approach(6);
  for(let i=0;i<120 && !slow.failure;i++) slow.tick(dt,control);
  assert.equal(slow.feedback,"Разбился!");
  assert.equal(slow.impact.kind,"stone");
  assert.equal(slow.player.speed,0);
  assert.ok(!slow.over);
  const s=slow.player.s;
  for(let i=0;i<182;i++) slow.tick(dt,control);
  assert.equal(slow.player.s,s);
  assert.ok(slow.over && slow.rank>1);
});
test("Максимальная усталость останавливает Фули в обеих драг-гонках",()=>{
  for(const event of events.filter(e=>e.type==="Драг")){
    const r=new Race(event,fresh());
    r.countdown=0;
    Object.assign(r.player,{rev:1,fatigue:.999,speed:16});
    r.tick(dt,control);
    assert.equal(r.feedback,"Сгорел мотор");
    assert.equal(r.player.speed,0);
    assert.equal(r.impact.kind,"stone");
    for(let i=0;i<100;i++) r.tick(dt,control);
    assert.ok(r.over && r.rank>1);
  }
});
test("Край бревна регистрирует удар по всей его ширине",()=>{
  const r=new Race(events[7],fresh());
  r.countdown=0;
  r.obstacles=[{s:50,off:1.6,kind:"Бревно"}];
  Object.assign(r.player,{s:49.15,speed:19});
  r.tick(dt,control);
  assert.equal(r.impact.kind,"wood");
  assert.ok(r.player.speed<12);
});
