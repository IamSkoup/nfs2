export const isOpen = (s, id) => id === 0 || s.done.includes(id - 1);
export const offerAvailable = (s, id) =>
  id === 6 && isOpen(s, id) && ["new", "offered", "accepted"].includes(s.offer);
export const beforeRace = (id) => ({ 2: 2, 9: 7 })[id] || 0;
export const afterVictory = (id) => ({ 2: 3, 9: 8 })[id] || 0;
export function decide(s, accepted) {
  if (!["offered", "accepted"].includes(s.offer)) return false;
  s.offer = accepted ? "accepted" : "declined";
  return true;
}
