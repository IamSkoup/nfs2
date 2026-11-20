import { clamp } from "./map.js";
export function drive(r, race, bend) {
  const { time, event, obstacles } = race;
  const drag = event.type === "Драг";
  const style =
    r.name === "Аздат"
      ? { line: 1.1, apex: 13, attack: 0.26 }
      : r.name === "Кайон"
        ? { line: 0.55, apex: 4, attack: 0.09 }
        : { line: 2 + r.id * 0.15, apex: 8 + r.id, attack: 0.18 };
  let goal =
    Math.sin(time * 0.25 + r.id) * style.line -
    clamp(bend * style.apex, -2.3, 2.3);
  const ahead = obstacles.find(
    (o) =>
      o.s > r.s &&
      o.s - r.s < 16 + r.speed * (0.55 + 0.22 * event.level) &&
      Math.abs(o.off - r.offset) < 2.1,
  );
  const rival = race.racers.find(
    (b) =>
      b !== r &&
      !b.out &&
      b.s > r.s &&
      b.s - r.s < 8 &&
      Math.abs(r.offset - b.offset) < 1.45,
  );
  if (ahead || rival) {
    const x = ahead ? ahead.off : rival.offset;
    goal = x >= 0 ? -3.85 : 3.85;
    r.avoid = goal;
    r.avoidUntil = time + 1.1;
  }
  if (time < r.avoidUntil) goal = r.avoid;
  let lane = 0;
  if (drag && ahead) {
    let choices = [-1, 0, 1].filter(
      (k) =>
        !obstacles.some(
          (o) =>
            o.s >= ahead.s &&
            o.s <= ahead.s + 5 &&
            Math.abs(o.off - k * 3.85) < 2,
        ),
    );
    choices.sort((a, b) => Math.abs(a - r.lane) - Math.abs(b - r.lane));
    lane = Math.sign((choices[0] ?? 0) - r.lane);
  }
  if (!drag && Math.abs(r.offset) > 5) goal = 0;
  const target = event.route.sample(
    Math.min(
      event.route.length - 0.02,
      (r.s % event.route.length) + 6 + r.speed * 0.55,
    ),
    goal,
  );
  const beyond =
    (r.s % event.route.length) + 6 + r.speed * 0.55 - event.route.length;
  if (beyond > 0) {
    if (r.lap + 1 < event.laps)
      Object.assign(target, event.route.sample(beyond, goal));
    else {
      target.x += Math.sin(target.h) * beyond;
      target.z += Math.cos(target.h) * beyond;
    }
  }
  const aim = Math.atan2(target.x - r.x, target.z - r.z),
    yaw = Math.atan2(Math.sin(r.heading - aim), Math.cos(r.heading - aim));
  const error =
    Math.sin(r.id * 8.42 + time * 0.71) * (0.18 - 0.095 * event.level);
  return {
    gas: drag || Math.abs(yaw) < 0.73 || r.speed < 6,
    brake: !drag && Math.abs(yaw) > 0.73 && r.speed > 6,
    steer: clamp(yaw * 1.9, -1, 1),
    lane,
    breath: drag && r.rev > 0.82 + error,
    boost:
      Math.abs(bend) < style.attack &&
      r.s > 24 &&
      !ahead &&
      (r.boosting ? r.boost > 8 : r.boost > 38) &&
      Math.sin(time * 0.32 + r.id) > -0.32,
  };
}
