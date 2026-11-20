import { clamp } from "./map.js";
export function breathe(r) {
  if (r.cool > 0) return "";
  let perfect = r.rev >= 0.9 - r.st.breath / 100 && r.rev <= 0.9,
    good = !perfect && r.rev >= 0.59 && r.rev < 0.9;
  r.cool = 0.45;
  r.pulse = perfect ? 1.55 : good ? 1.16 : 0.62;
  if (perfect || good) {
    r.phase = Math.min(5, r.phase + 1);
    r.fatigue = Math.max(0, r.fatigue - (perfect ? 0.64 : 0.38));
  } else r.speed *= 0.84;
  r.rev = 0.12;
  return perfect ? "Идеально" : good ? "Хорошо" : "Потеря темпа";
}
export function dragStep(r, c, dt) {
  r.cool = Math.max(0, r.cool - dt);
  r.rev = clamp(
    r.rev + dt * (c.gas ? 0.37 + (0.08 * r.speed) / r.st.speed : -0.25),
    0,
    1,
  );
  r.fatigue = clamp(
    r.fatigue +
      (dt * (r.rev > 0.9 ? 0.42 : r.phase === 5 ? 0.07 : -0.075) * 75) /
        r.st.stamina,
    0,
    1,
  );
  if (c.breath) r.feedback = breathe(r);
  if (c.lane) r.lane = clamp(r.lane + c.lane, -1, 1);
  r.offset += (r.lane * 3.85 - r.offset) * (1 - Math.exp(-dt * r.st.grip));
  return (0.43 + 0.117 * r.phase) * (1 - 0.32 * r.fatigue);
}
