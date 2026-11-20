export class Input {
  constructor(s, action) {
    this.s = s;
    this.action = action;
    this.keys = new Set();
    this.touch = new Map();
    this.edges = new Set();
    this.active = false;
    const key = (e) =>
      Object.keys(s.keys).find((k) => s.keys[k] === e.code) ||
      {
        ArrowUp: "gas",
        ArrowDown: "brake",
        ArrowLeft: "left",
        ArrowRight: "right",
      }[e.code];
    addEventListener("keydown", (e) => {
      if (!this.active || e.repeat) return;
      const k = key(e);
      if (!k) return;
      e.preventDefault();
      this.keys.add(k);
      this.press(k);
    });
    addEventListener("keyup", (e) => this.keys.delete(key(e)));
    addEventListener("blur", () => this.reset());
    const controls = document.querySelector("#touch");
    controls.onpointerdown = (e) => {
      let b = e.target.closest("[data-key]");
      if (!b || !this.active) return;
      e.preventDefault();
      const k = b.dataset.key;
      b.setPointerCapture(e.pointerId);
      this.touch.set(e.pointerId, k);
      b.classList.add("pressed");
      this.press(k);
    };
    controls.onlostpointercapture =
      controls.onpointercancel =
      controls.onpointerup =
        (e) => {
          this.touch.delete(e.pointerId);
          e.target.closest("button")?.classList.remove("pressed");
        };
  }
  press(k) {
    this.edges.add(k);
    if (k === "pause" || k === "camera" || k === "reset") this.action(k);
  }
  reset() {
    this.keys.clear();
    this.touch.clear();
    this.edges.clear();
    document
      .querySelectorAll(".pressed")
      .forEach((b) => b.classList.remove("pressed"));
  }
  read() {
    const on = (k) => this.keys.has(k) || [...this.touch.values()].includes(k);
    const c = {
      gas: on("gas"),
      brake: on("brake"),
      boost: on("boost"),
      steer: (Number(on("right")) - Number(on("left"))) * this.s.sensitivity,
      breath: this.edges.has("breath"),
      lane: Number(this.edges.has("right")) - Number(this.edges.has("left")),
    };
    this.edges.clear();
    return c;
  }
}
