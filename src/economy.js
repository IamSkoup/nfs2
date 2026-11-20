export function settle(s, r, career) {
  if (r.paid) return 0;
  r.paid = true;
  const e = r.event,
    win = r.rank === 1;
  let money = 0;
  if (career) {
    s.careerTime += r.time;
    s.careerWins += Number(win);
    s.careerRaces++;
  }
  s.races++;
  s.wins += Number(win);
  s.seconds += r.time;
  s.distance += r.player.s;
  s.peak = Math.max(s.peak, r.peak);
  s.passes += r.passes;
  if (win && career) {
    if (e.id === 10) {
      if (!["won", "closed"].includes(s.offer)) {
        money = e.prize;
        s.offer = "won";
      }
    } else {
      const repeat = s.done.includes(e.id);
      money = repeat ? Math.floor(e.prize * 0.35) : e.prize;
      if (!repeat) s.done.push(e.id);
      if (e.id === 9) s.ending = true;
    }
  }
  if (r.player.s >= r.total && (!s.records[e.id] || r.time < s.records[e.id]))
    s.records[e.id] = r.time;
  s.money += money;
  s.earned += money;
  return money;
}
