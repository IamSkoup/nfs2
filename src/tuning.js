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
export const tiers = ["Заводской", "Уличный", "Профессиональный", "Экстремальный"];
export const maxTier = tiers.length - 1;
// The top package retains the performance of the previous four-upgrade maximum.
const performanceSteps = [0, 1, 2, 4];
const prices = [0, 340, 700, 2000];
export const installedTier = (s, k) => s.installed?.[k] ?? s.upgrades[k] ?? 0;
export const tierValue = (base, step, tier) => base + step * performanceSteps[tier];

export const stats = (s) => Object.fromEntries(
  upgrades.map(([k, , base, step]) => [k, tierValue(base, step, installedTier(s, k))]),
);

export function offer(s, k) {
  const level = s.upgrades[k] || 0;
  return {
    level,
    price: prices[level + 1] ?? 0,
    requirement: level * 2,
  };
}

export function equip(s, k, tier) {
  if (!upgrades.some(([key]) => key === k) || !Number.isInteger(tier) ||
      tier < 0 || tier > (s.upgrades[k] || 0)) return false;
  s.installed[k] = tier;
  return true;
}

export function buy(s, k) {
  if (!upgrades.some(([key]) => key === k)) return false;
  const { level, price, requirement } = offer(s, k);
  if (level >= maxTier || s.money < price || s.done.length < requirement) return false;
  s.money -= price;
  s.upgrades[k] = level + 1;
  s.installed[k] = level + 1;
  return true;
}

export function unlockWorkshop(s) {
  for (const [key] of upgrades) {
    s.installed[key] = installedTier(s, key);
    s.upgrades[key] = maxTier;
  }
  s.cosmetics = [0, 1, 2];
}
