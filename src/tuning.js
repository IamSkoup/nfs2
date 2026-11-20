export const upgrades = [
  ["speed", "Скорость", 22, 2, "м/с"],
  ["accel", "Ускорение", 7, 1.3, "м/с²"],
  ["turn", "Управляемость", 1.45, 0.18, "рад/с"],
  ["grip", "Сцепление", 4, 0.8, ""],
  ["stamina", "Выносливость", 75, 15, "с"],
  ["tank", "Запас адреналина", 80, 14, "%"],
  ["power", "Эффективность адреналина", 28, 5, "%"],
  ["launch", "Стартовое ускорение", 3, 1, "м/с"],
  ["breath", "Окно дыхания", 12, 2, "%"],
];
export const stats = (s) =>
  Object.fromEntries(
    upgrades.map(([k, , base, step]) => [
      k,
      base + step * (s.upgrades[k] || 0),
    ]),
  );
export function offer(s, k) {
  const level = s.upgrades[k] || 0;
  return {
    level,
    price: Math.round(340 * (level + 1) ** 1.35),
    requirement: level * 2,
  };
}
export function buy(s, k) {
  if (!upgrades.some((v) => v[0] === k)) return false;
  const { level, price, requirement } = offer(s, k);
  if (level >= 4 || s.money < price || s.done.length < requirement)
    return false;
  s.money -= price;
  s.upgrades[k] = level + 1;
  return true;
}
