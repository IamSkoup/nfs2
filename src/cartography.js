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
  if (el)
    el.innerHTML = r.racers
      .filter((a) => !a.out)
      .map((a) => {
        let [x, y] = xy([a.x, a.z]);
        return (
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="' +
          (a.id ? 9 : 13) +
          '" fill="' +
          (a.id ? "#a2adba" : "white") +
          '"/>'
        );
      })
      .join("");
}
