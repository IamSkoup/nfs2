import { edges } from "./map.js";
import { events } from "./config.js";
const W = 740,
  H = 660,
  xy = ([x, z]) => [(x + 320) * 1.08 + 12, 510 - z * 0.99];
const line = (pts) =>
  pts
    .filter((_, i) => i % 3 === 0 || i === pts.length - 1)
    .map((p) =>
      xy(p)
        .map((n) => n.toFixed(1))
        .join(","),
    )
    .join(" ");
const base = Object.values(edges)
  .map((p) => '<polyline points="' + line(p) + '"/>')
  .join("");
export function chart(e, s, interactive = false, quick = false) {
  const pins = interactive
    ? events
        .slice(0, 10)
        .map((v) => {
          let pos = v.route.sample(26 + v.id * 12),
            [x, y] = xy([pos.x, pos.z]);
          return `<g class="pin ${v.id === e.id ? "chosen" : s.done.includes(v.id) ? "done" : quick || !v.id || s.done.includes(v.id - 1) ? "open" : ""}" role="button" tabindex="0" aria-label="${v.name}" data-select="${v.id}" transform="translate(${x} ${y})"><circle r="16"/><text y="5">${v.id + 1}</text></g>`;
        })
        .join("")
    : "";
  return `<svg viewBox="0 32 ${W} 726" class="map" aria-label="Карта маршрута"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#344344" stroke-width="1"/></pattern></defs><rect x="-100" y="-100" width="950" height="950" fill="url(#grid)"/><g fill="none" stroke="#525e60" stroke-width="4">${base}</g><polyline points="${line(e.route.pts)}" fill="none" stroke="#ffa741" stroke-width="5"/>${pins}<g id="dots"></g></svg>`;
}
export function dots(r) {
  let el = document.querySelector("#dots");
  if (!el) return;
  const [cx, cy] = xy([r.player.x, r.player.z]);
  const size = r.free ? 260 : 175;
  el.ownerSVGElement.setAttribute(
    "viewBox",
    [cx - size / 2, cy - size / 2, size, size].join(" "),
  );
  const route = r.event.route;
  const next = [];
  if (!r.free) {
    for (
      let d = r.player.s;
      d <= Math.min(r.total - 0.001, r.player.s + 90);
      d += 3
    ) {
      const p = route.sample(d % route.length);
      next.push(xy([p.x, p.z]).join(","));
    }
  }
  el.innerHTML =
    '<polyline points="' +
    next.join(" ") +
    '" fill="none" stroke="#fff5ba" stroke-width="4"/>' +
    r.racers
      .filter((a) => a.id && !a.out)
      .map((a) => {
        const [x, y] = xy([a.x, a.z]);
        return (
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="3.5" fill="#b3d8f5" stroke="#182025"/>'
        );
      })
      .join("") +
    '<path d="M0 -9 L6 6 L0 3 L-6 6 Z" fill="white" stroke="#372817" stroke-width="1.6" transform="translate(' +
    cx +
    " " +
    cy +
    ") rotate(" +
    (Math.atan2(
      1.08 * Math.sin(r.player.heading),
      0.99 * Math.cos(r.player.heading),
    ) *
      180) /
      Math.PI +
    ')"/>';
}
