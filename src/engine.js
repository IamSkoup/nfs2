export class Engine {
  constructor() {
    this.remainder = 0;
    this.stamp = 0;
  }
  elapsed(now, fps) {
    const delta = now - this.stamp;
    if (delta < 1000 / fps - 0.7) return 0;
    this.stamp = now;
    return Math.min(delta / 1000, 0.12);
  }
  advance(dt, race, input) {
    this.remainder += dt;
    while (this.remainder >= 1 / 60 && !race.over) {
      race.tick(1 / 60, input.read());
      this.remainder -= 1 / 60;
    }
  }
}
