import { events, clips, labels } from "./config.js";
import { stats, upgrades, offer } from "./tuning.js";
import { chart } from "./cartography.js";
import { icon } from "./icons.js";
export const num = (n) => Math.round(n).toLocaleString("ru-RU"),
  time = (t) =>
    Number.isFinite(t)
      ? Math.floor(t / 60) + ":" + (t % 60).toFixed(2).padStart(5, "0")
      : "—",
  km = (n) => (n / 1000).toFixed(2).replace(".", ",") + " км";
export const pages = {
  home: "Главное меню",
  career: "Карьера",
  quick: "Быстрые гонки",
  free: "Свободный бег",
  tuning: "Тюнинг",
  stats: "Статистика",
  settings: "Настройки",
  clips: "Кат-сцены",
};
const button = (action, label, primary = false) =>
  `<button data-act="${action}" class="${primary ? "primary" : "secondary"}">${label}</button>`;
const metrics = (rows) =>
  "<dl>" +
  rows
    .map(([k, v]) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>")
    .join("") +
  "</dl>";
const panel = (title, content) =>
  '<section class="panel"><button class="back" data-go="home">← Главное меню</button><h1>' +
  title +
  "</h1>" +
  content +
  "</section>";
export function home(s) {
  const next = events[Math.min(9, s.done.length)];
  return `<section class="home"><div class="hero"><div class="franchise"><i></i> NEED FOR SPEED</div><h1>FULI <em>2</em></h1><div class="location"><span></span> ЛЕСНОЙ КОРДОН <b>/</b> НОЧЬ</div></div><div class="dashboard"><div class="menuhead"><span>ВЫБОР РЕЖИМА</span><i></i><b>01 — 03</b></div><div class="modes">${[
    ["career", "Карьера", s.done.length + " / 10 гонок", "01"],
    ["free", "Свободный бег", "Открытая карта", "02"],
    ["quick", "Быстрые гонки", "Выбор события", "03"],
  ]
    .map(
      ([id, title, sub, n]) =>
        `<button class="mode ${id}" data-go="${id}"><div class="mode-top">${icon(id)}<small>/ ${n}</small></div><strong>${title}</strong><span>${sub}</span><b class="arrow">↗</b></button>`,
    )
    .join(
      "",
    )}</div><nav>${["tuning", "stats", "settings", "clips"].map((k) => `<button data-go="${k}">${icon(k)}${pages[k]}</button>`).join("")}</nav></div></section>`;
}
export function career(s, e, quick) {
  let open = quick || !e.id || s.done.includes(e.id - 1),
    repeat = s.done.includes(e.id);
  return panel(
    quick ? pages.quick : pages.career,
    `<div class="route-layout"><div class="mapbox">${chart(e, s, true, quick)}<div class="legend">● Пройдена　 ◉ Доступна　 ○ Закрыта</div></div><article><div class="over">СОБЫТИЕ ${String(e.id + 1).padStart(2, "0")} / 10</div><h2>${e.name}</h2><p>${e.desc}</p>${metrics(
      [
        ["Тип", e.type],
        ["Длина", km(e.route.length * e.laps)],
        ["Соперники", e.bots],
        [
          "Сложность",
          ["Начальная", "Умеренная", "Высокая", "Предельная"][
            Math.min(3, Math.floor(e.id / 3))
          ],
        ],
        ["Погода", e.weather],
        ["Награда", num(quick ? 0 : repeat ? e.prize * 0.35 : e.prize) + " ₵"],
      ],
    )}${open ? button("start", "Старт　→", true) : '<p class="locked">Откроется после победы в «' + events[e.id - 1].name + "».</p>"}</article></div><div class="eventlist">${events
      .slice(0, 10)
      .map(
        (v) =>
          `<button data-select="${v.id}" class="${v.id === e.id ? "sel" : ""}">${v.id + 1} · ${v.name}</button>`,
      )
      .join("")}</div>`,
  );
}
export function deal(s) {
  return panel(
    "Предложение Аздата",
    `<article class="single"><h2>Дуэль с Кайоном</h2><p>Аздат предлагает 7 000 ₵ за победу над Кайоном. Один заезд от лесопилки до северного спуска.</p>${metrics(
      [
        ["Соперник", "Кайон"],
        ["Транспорт", "Электроскутер"],
        ["Скорость", "83 км/ч"],
        ["Ускорение", "7,8 м/с²"],
        ["Запас адреналина", "80 %"],
        ["Дистанция", km(events[10].route.length)],
        ["Награда", "7 000 ₵"],
      ],
    )}<div class="actions">${button("accept", s.offer === "accepted" ? "Повторить" : "Принять", true)}${button("decline", "Отказаться")}</div></article>`,
  );
}
export function tuning(s) {
  return panel(
    "Тюнинг",
    `<div class="workshop"><div class="upgrades">${upgrades
      .map(([k, name, b, step, unit]) => {
        let o = offer(s, k),
          val = stats(s)[k],
          max = o.level === 4,
          locked = s.done.length < o.requirement;
        return `<div class="upgrade"><div><b>${name}</b><small>${Number(val.toFixed(2))}${max ? "" : " → " + Number((val + step).toFixed(2))} ${unit} · ${o.level}/4</small></div><button data-buy="${k}" ${max || locked || s.money < o.price ? "disabled" : ""}>${max ? "Максимум" : locked ? "После гонки " + o.requirement : num(o.price) + " ₵"}</button></div>`;
      })
      .join(
        "",
      )}</div><article class="looks"><h2>Оформление</h2><p>Потяните модель, чтобы повернуть.</p>${["Без аксессуаров", "Янтарный браслет и пыль", "Стальной браслет и след"].map((v, i) => `<button class="secondary" data-look="${i}" ${s.look === i || (!s.cosmetics.includes(i) && s.money < 500 * i) ? "disabled" : ""}>${v} · ${s.look === i ? "Выбрано" : s.cosmetics.includes(i) ? "Надеть" : num(i * 500) + " ₵"}</button>`).join("")}</article></div>`,
  );
}
export function statsPage(s, final = false) {
  return panel(
    final ? "Карьера завершена" : "Статистика",
    `<article class="single">${metrics([["Основные гонки", s.done.length + " / 10"], ["Победы", final ? s.careerWins + " / " + s.careerRaces : s.wins + " / " + s.races], ["Заработано", num(s.earned) + " ₵"], [final ? "Время прохождения" : "Время в гонках", time(final ? s.careerTime : s.seconds)], ["Дистанция", km(s.distance)], ["Максимальная скорость", num(s.peak) + " км/ч"], ["Обгоны", s.passes], ["Кайон", ["won", "closed"].includes(s.offer) ? "Побеждён" : "—"], ...Object.entries(s.records).map(([id, t]) => [events[id].name, time(t)])])}<div class="actions"><button class="primary" data-go="free">Свободный бег</button><button class="secondary" data-go="clips">Кат-сцены</button></div></article>`,
  );
}
export function movies(s) {
  return panel(
    "Кат-сцены",
    '<div class="clipgrid">' +
      clips
        .map(
          (v, i) =>
            `<button data-clip="${i + 1}" ${s.scenes.includes(i + 1) ? "" : "disabled"}><small>${String(i + 1).padStart(2, "0")}</small><b>${v}</b><span>${s.scenes.includes(i + 1) ? "▶ Смотреть" : "Закрыто"}</span></button>`,
        )
        .join("") +
      "</div>",
  );
}
export const keyName = (k) =>
  k.replace("Key", "").replace("Left", "").replace("Right", "") || k;
export function settings(s) {
  const v = s.settings;
  const ranges = [
    ["distance", "Дальность обзора", 400, 950, 10],
    ["trees", "Растительность", 0.35, 1, 0.05],
    ["scale", "Разрешение", 0.5, 1.5, 0.05],
    ["shadows", "Тени", 0, 1, 1],
    ["particles", "Частицы", 0, 1, 0.05],
    ["post", "Цветокоррекция", 0, 1, 1],
    ["fps", "Лимит кадров", 30, 90, 5],
    ["sensitivity", "Чувствительность", 0.55, 1.6, 0.05],
    ["shake", "Тряска камеры", 0, 1, 0.05],
    ["effects", "Эффекты скорости", 0, 1, 0.05],
    ["music", "Музыка", 0, 1, 0.05],
    ["sfx", "Эффекты", 0, 1, 0.05],
    ["video", "Кат-сцены", 0, 1, 0.05],
  ];
  return panel(
    "Настройки",
    `<div class="settings"><article><h2>Изображение и звук</h2><label>Профиль графики<select data-setting="quality">${["Низкое", "Среднее", "Высокое", "Свой"].map((a) => "<option " + (a === v.quality ? "selected" : "") + ">" + a + "</option>").join("")}</select></label>${ranges.map(([k, n, min, max, step]) => `<label>${n}<input type="range" data-setting="${k}" min="${min}" max="${max}" step="${step}" value="${v[k]}"><output>${v[k]}</output></label>`).join("")}</article><article><h2>Управление</h2><label>Камера<select data-setting="camera">${["Сзади", "Дальняя", "Ближняя", "От первого лица", "Сбоку"].map((n, i) => '<option value="' + i + '" ' + (i === v.camera ? "selected" : "") + ">" + n + "</option>").join("")}</select></label>${Object.entries(
      labels,
    )
      .map(
        ([k, n]) =>
          `<label>${n}<button data-bind="${k}">${keyName(v.keys[k])}</button></label>`,
      )
      .join("")}</article></div>`,
  );
}
export function result(r, reward, career) {
  const e = r.event,
    k = career && e.id === 10,
    won = r.rank === 1;
  return panel(
    won ? "Победа" : "Заезд завершён",
    `<article class="single"><h2>${e.name}</h2>${metrics([
      ["Место", r.rank + " / " + r.racers.length],
      ["Время", time(r.time)],
      ["Лучший круг", e.laps > 1 ? time(r.bestLap) : "—"],
      ["Максимальная скорость", num(r.peak) + " км/ч"],
      ["Обгоны", r.passes],
      ["Награда", "+" + num(reward) + " ₵"],
    ])}<div class="actions">${k && !won ? button("decline", "Отказаться") : button("return", career ? "Вернуться в карьеру" : "К быстрым гонкам", true)}${k && won ? "" : button("retry", "Повторить")}</div></article>`,
  );
}
export function hud(r, s) {
  const drag = r.event.type === "Драг" && !r.free;
  return `<div class="racebar"><button data-act="pause" aria-label="Пауза">Ⅱ <span class="pause-label">Пауза</span></button><div><small>${r.free ? "ЛЕСНОЙ КОРДОН" : r.event.type.toUpperCase()}</small><b>${r.free ? "Свободный бег" : r.event.name}</b></div><button data-act="camera" aria-label="Сменить камеру">◉</button></div><div class="timing" id="timing"></div><div id="direction"></div><div id="wrong-way" hidden>НЕ ТУДА</div><div class="signal" id="signal"></div><div class="mini">${chart(r.event, s)}</div><div class="gauge"><strong id="speed">0</strong> км/ч<small>АДРЕНАЛИН</small><div class="fuel"><i id="charge"></i></div></div>${drag ? '<div class="tach"><b id="phase"></b><div class="dial"><i id="needle"></i></div><small>ДЫХАНИЕ · ' + keyName(s.settings.keys.breath) + '</small><small>Усталость</small><progress id="fatigue" max="1" aria-label="Усталость"></progress></div>' : ""}<div id="tip"></div>`;
}
