import { prepareAssets } from "../preload.js";
import { World } from "./world.js";
import { idealWindow } from "./drag.js";
import { Race } from "./race.js";
import { events } from "./config.js";
import { read, write } from "./save.js";
import { settle } from "./economy.js";
import { Engine } from "./engine.js";
import {
  isOpen,
  offerAvailable,
  beforeRace,
  afterVictory,
  decide,
} from "./career.js";
const engine = new Engine();
import { buy } from "./tuning.js";
import { AudioManager } from "./audio.js";
import { cinema, opening } from "./video.js";
import { Input } from "./input.js";
import { dots } from "./cartography.js";
import * as ui from "./ui.js";
const $ = (id) => document.getElementById(id),
  s = read(),
  audio = new AudioManager(s.settings),
  input = new Input(s.settings, action);
let world,
  page = "home",
  r,
  selected = Math.min(9, s.done.length),
  career = true,
  video = false,
  paused = false,
  remap = "",
  lastHud = -1,
  lastStep = 0,
  reward = 0;
const save = () => write(s);
function notice(msg) {
  $("notice").textContent = msg;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => ($("notice").textContent = ""), 2300);
}
function refresh() {
  document.body.dataset.page = page;
  const running = page === "race";
  $("top").hidden = running;
  $("hud").hidden = !running || paused;
  $("touch").hidden = !running || paused;
  $("touch").dataset.drag = r?.event.type === "Драг";
  $("section").textContent = (ui.pages[page] || "Карьера").toUpperCase();
  $("bank").textContent = ui.num(s.money);
  input.active = running && !paused && !video;
  const screens = {
    home: () => ui.home(s),
    career: () => ui.career(s, events[selected], false),
    quick: () => ui.career(s, events[selected], true),
    deal: () => ui.deal(s),
    tuning: () => ui.tuning(s),
    stats: () => ui.statsPage(s),
    ending: () => ui.statsPage(s, true),
    clips: () => ui.movies(s),
    settings: () => ui.settings(s),
    result: () => ui.result(r, reward, career),
    thirdVictory: () =>
      '<section class="panel"><h1>Победа</h1><p>Встречная полоса</p><button class="primary" data-act="return">Вернуться в карьеру</button></section>',
    claimed: () =>
      '<section class="panel"><h1>Кайон побеждён</h1><p>Награда зачислена.</p><button class="primary" data-act="return">Вернуться в карьеру</button></section>',
    race: () =>
      paused
        ? '<div class="pause"><h1>Пауза</h1><button class="primary" data-act="pause">Продолжить</button><button class="secondary" data-act="recover-resume">Вернуться на дорогу</button><button class="secondary" data-act="retry">Сначала</button>' +
          (r.free
            ? '<button class="secondary" data-go="quick">Выбрать трассу</button>'
            : "") +
          '<button class="secondary" data-go="home">Главное меню</button></div>'
        : "",
  };
  $("ui").innerHTML = screens[page]();
  $("ui").scrollTop = 0;
  if (running && !paused) {
    $("hud").innerHTML = ui.hud(r, s);
    updateHud();
  }
}
function menu(p) {
  if (!world?.gltf || video) return;
  input.reset();
  paused = false;
  remap = "";
  if (p === "free") {
    career = false;
    begin(events[0], true);
    return;
  }
  r = null;
  world.populate(null, s.look);
  audio.mode("menu");
  if (p === "career" || p === "quick") {
    career = p === "career";
    if (career && !s.scenes.includes(1)) return movie(1, () => menu("career"));
    if (career && s.pending === 3) p = "thirdVictory";
    if (career && s.offer === "won") p = "claimed";
    if (career && s.pending === 8) {
      movie(8, () => {
        s.pending = 0;
        save();
        menu("ending");
      });
      return;
    }
  }
  page = p;
  refresh();
}
function movie(n, next) {
  if (video) return;
  video = true;
  input.active = false;
  input.reset();
  audio.silence();
  if (!s.scenes.includes(n)) s.scenes.push(n);
  save();
  cinema(n, s, () => {
    video = false;
    save();
    next();
  });
}
function select(id) {
  selected = id;
  if (page === "career" && offerAvailable(s, id)) {
    const show = () => {
      page = "deal";
      audio.mode("menu");
      refresh();
    };
    if (s.offer === "new") {
      s.offer = "offered";
      save();
      movie(4, show);
    } else show();
  } else refresh();
}
function start() {
  if (page === "career" && !isOpen(s, selected)) return;
  if (career && offerAvailable(s, selected)) {
    select(6);
    return;
  }
  const e = events[selected];
  if (career && beforeRace(selected))
    movie(beforeRace(selected), () => begin(e));
  else begin(e);
}
function begin(e, free = false) {
  paused = false;
  r = new Race(e, s, free);
  page = "race";
  input.reset();
  engine.remainder = 0;
  lastHud = -1;
  lastStep = 0;
  audio.setBoost(false);
  world.populate(r, s.look);
  world.update(1 / 60, r, page, s.settings);
  audio.mode(!free && e.type === "Драг" ? "drag" : "race", true);
  refresh();
}
function finish() {
  audio.setBoost(false);
  reward = settle(s, r, career);
  const win = r.rank === 1,
    id = r.event.id;
  page = "result";
  input.active = false;
  input.reset();
  if (career && win) s.pending = afterVictory(id);
  save();
  const show = () => {
    audio.mode("menu");
    refresh();
  };
  if (s.pending === 8 && career && win && id === 9) {
    let clip = s.pending;
    movie(clip, () => {
      s.pending = 0;
      save();
      if (clip === 8) menu("ending");
      else show();
    });
  } else show();
}
function action(a) {
  if (video) return;
  if (a === "recover-resume") {
    r.recover();
    action("pause");
    return;
  }
  if (a === "reset" && page === "race" && !paused) {
    r.recover();
    return;
  }
  if (a === "challenge" && r?.free) {
    const nearest = nearby();
    if (nearest) {
      selected = nearest.id;
      career = false;
      begin(nearest);
    }
    return;
  }
  if (a === "pause" && page === "race") {
    paused = !paused;
    audio.setPaused(paused);
    input.reset();
    refresh();
    return;
  }
  if (a === "camera" && page === "race") {
    s.settings.camera = (s.settings.camera + 1) % 5;
    save();
    return;
  }
  if (a === "start") start();
  if (a === "retry" && r) {
    if (career && !r.free && [2, 9].includes(r.event.id)) start();
    else begin(r.event, r.free);
  }
  if (a === "accept") {
    if (!decide(s, true)) return;
    save();
    movie(5, () => begin(events[10]));
  }
  if (a === "decline") {
    if (!decide(s, false)) return;
    save();
    selected = 6;
    menu("career");
  }
  if (a === "return") {
    if (
      career &&
      s.pending === 3 &&
      (page === "thirdVictory" ||
        (page === "result" && r?.rank === 1 && r.event.id === 2))
    ) {
      movie(3, () => {
        s.pending = 0;
        save();
        selected = Math.min(9, s.done.length);
        menu("career");
      });
      return;
    }
    if (career && s.offer === "won") {
      movie(6, () => {
        s.offer = "closed";
        save();
        selected = 6;
        menu("career");
      });
    } else {
      if (career) selected = Math.min(9, s.done.length);
      menu(career ? "career" : "quick");
    }
  }
}
document.addEventListener(
  "pointerdown",
  () => {
    if (!video) audio.unlock();
  },
  { once: true },
);
document.addEventListener(
  "keydown",
  () => {
    if (!video) audio.unlock();
  },
  { once: true },
);
document.addEventListener("click", (e) => {
  let b = e.target.closest("button,[data-select]");
  if (!b || b.disabled || video || !world?.gltf) return;
  const d = b.dataset;
  if (!audio.enabled) audio.unlock();
  if (d.go) menu(d.go);
  else if (d.act) action(d.act);
  else if (d.select != null) select(+d.select);
  else if (d.buy && buy(s, d.buy)) {
    save();
    audio.effect("coin");
    refresh();
  } else if (d.look != null) {
    let i = +d.look;
    if (!s.cosmetics.includes(i)) {
      if (s.money < i * 500) return;
      s.money -= i * 500;
      s.cosmetics.push(i);
    }
    s.look = i;
    save();
    world.coat(i);
    refresh();
  } else if (d.clip && s.scenes.includes(+d.clip))
    movie(+d.clip, () => menu("clips"));
  else if (d.bind) {
    remap = d.bind;
    b.textContent = "Нажмите клавишу";
  }
});
document.addEventListener(
  "keydown",
  (e) => {
    if (video) return;
    if (remap) {
      e.preventDefault();
      const keys = s.settings.keys,
        old = keys[remap],
        other = Object.keys(keys).find((k) => keys[k] === e.code);
      if (other) keys[other] = old;
      keys[remap] = e.code;
      remap = "";
      save();
      refresh();
    } else if (paused && e.code === s.settings.keys.pause) {
      e.preventDefault();
      e.stopImmediatePropagation();
      action("pause");
    } else if (e.key === "Enter" && e.target.matches?.("g[data-select]"))
      select(+e.target.dataset.select);
  },
  true,
);
document.addEventListener("change", (e) => {
  const k = e.target.dataset.setting;
  if (!k) return;
  const v = s.settings;
  if (k === "quality") {
    v.quality = e.target.value;
    let i = ["Низкое", "Среднее", "Высокое"].indexOf(v.quality);
    if (i >= 0)
      Object.assign(v, {
        trees: [0.4, 0.75, 1][i],
        distance: [450, 760, 950][i],
        scale: [0.7, 1, 1.3][i],
        particles: [0.3, 0.75, 1][i],
        shadows: +(i > 0),
        post: +(i > 0),
        fps: [30, 60, 60][i],
      });
  } else {
    v[k] = Number(e.target.value);
    if (
      [
        "trees",
        "distance",
        "shadows",
        "particles",
        "scale",
        "post",
        "fps",
      ].includes(k)
    )
      v.quality = "Свой";
  }
  world.settings(v);
  save();
  const y = $("ui").scrollTop;
  refresh();
  $("ui").scrollTop = y;
});
document.oninput = (e) => {
  if (e.target.type === "range")
    e.target.nextElementSibling.textContent = e.target.value;
};
let dragX = null;
document.addEventListener("pointerdown", (e) => {
  if (page === "tuning" && !e.target.closest("button,article,.upgrades"))
    dragX = e.clientX;
});
document.addEventListener("pointermove", (e) => {
  if (dragX != null) {
    world.orbit += (e.clientX - dragX) * 0.015;
    dragX = e.clientX;
  }
});
document.addEventListener("pointerup", () => (dragX = null));
document.addEventListener("pointercancel", () => (dragX = null));
function nearby() {
  if (!r?.free) return null;
  return events.slice(0, 10).find((e) => {
    const p = e.route.pts[0];
    return Math.hypot(r.player.x - p[0], r.player.z - p[1]) < 13;
  });
}
function updateHud() {
  if (!r || !$("speed")) return;
  const p = r.player,
    e = r.event;
  $("speed").textContent = Math.round(p.speed * 3.6);
  $("charge").style.width = (p.boost / p.st.tank) * 100 + "%";
  $("signal").textContent =
    r.countdown > 0
      ? Math.min(3, Math.ceil(r.countdown))
      : r.time < 0.8 && !r.free
        ? "Старт"
        : r.tipUntil > r.time
          ? r.feedback
          : "";
  $("timing").innerHTML = r.free
    ? ""
    : `<b>${r.rank} <small>/ ${r.racers.length}</small></b><span>${e.laps > 1 ? "Круг " + Math.min(e.laps, p.lap + 1) + " / " + e.laps : ui.km(r.total - p.s)}　 ·　 ${ui.time(e.type === "На время" ? Math.max(0, r.limit - r.time) : r.time)}</span>`;
  if ($("phase")) {
    const dial = document.querySelector(".dial"),
      green = idealWindow(p) * 180;
    dial.style.background =
      "conic-gradient(from -90deg at 50% 100%,#757e79 0 106deg,#53ade3 106deg " +
      green +
      "deg,#78c963 " +
      green +
      "deg 162deg,#dd5c4c 162deg 180deg,transparent 180deg)";
    $("phase").textContent = "ФАЗА " + p.phase + " / 5";
    $("needle").style.transform = "rotate(" + (-90 + p.rev * 180) + "deg)";
    $("fatigue").value = p.fatigue;
  }
  const keys = s.settings.keys;
  const junction = document.querySelector("#direction");
  if (junction && !r.free && e.type !== "Драг") {
    let route = e.route,
      d = p.s % route.length,
      a = route.sample(d + 4),
      b = route.sample(d + 28),
      turn = Math.atan2(Math.sin(b.h - a.h), Math.cos(b.h - a.h));
    $("wrong-way").hidden = !r.wrongWay;
    junction.textContent =
      Math.abs(turn) > 0.35 ? (turn > 0 ? "↰ Влево" : "↱ Вправо") : "↑ Прямо";
  }
  $("tip").textContent =
    r.countdown > 0
      ? r.racers
          .slice(1)
          .map((x) => x.name)
          .join("　/　") +
        (e.type === "Драг" ? "　·　Удержите старт в зелёной зоне" : "")
      : r.time < 7
        ? e.type === "Драг"
          ? ui.keyName(keys.breath) + " · Перевести дыхание по сигналу"
          : ui.keyName(keys.gas) +
            " · Газ　 " +
            ui.keyName(keys.left) +
            " / " +
            ui.keyName(keys.right) +
            " · Поворот　 " +
            ui.keyName(keys.boost) +
            " · Адреналин"
        : "";
  if (r.free) {
    const e = nearby();
    $("tip").innerHTML = e
      ? '<button class="secondary" data-act="challenge">Старт · ' +
        e.name +
        "</button>"
      : $("tip").textContent;
  }
  dots(r);
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!world || video || portrait.matches || document.hidden) return;
  const dt = engine.elapsed(now, s.settings.fps);
  if (!dt) return;
  audio.update(dt);
  if (page === "race" && !paused) {
    engine.advance(dt, r, input);
    if (r.player.breathCue) {
      audio.effect("breath-cue", 1, 0.92);
      r.player.breathCue = false;
    }
    if (r.impact) {
      audio.impact(r.impact.kind, r.impact.speed);
      r.impact = null;
    }
    if (
      r.time - lastStep > Math.max(0.15, 0.45 - r.player.speed * 0.012) &&
      !r.player.flight && r.player.speed > 2
    ) {
      lastStep = r.time;
      audio.effect(
        r.player.surface === "grass"
          ? "leaves"
          : r.player.surface === "dry"
            ? "gravel"
            : "mud",
        0.85 + Math.random() * 0.32,
      );
      audio.effect("walking", Math.min(1.85, 0.8 + r.player.speed * 0.034));
    }
    audio.ambience(r.player.speed);
    audio.setBoost(r.player.boosting);
    if (r.feedback === "Идеально" && r.tipUntil !== r.playedTip) {
      r.playedTip = r.tipUntil;
      audio.effect("coin", 1.4);
    }
    if (r.over) {
      finish();
      return;
    }
    if (now - lastHud > 75) {
      updateHud();
      lastHud = now;
    }
  }
  if (!paused)
    world.update(
      dt,
      page === "race" || page === "result" ? r : null,
      page,
      s.settings,
    );
}
const portrait = matchMedia(
  "(orientation: portrait) and (pointer: coarse) and (max-width: 700px)",
);
function updateOrientation() {
  const dialog = $("rotate");
  const player = $("cinema").querySelector("video");
  if (portrait.matches) {
    if (!dialog.open) dialog.showModal();
    input.reset();
    if (page === "race" && !paused && !video) action("pause");
    if (video) player.pause();
  } else {
    dialog.close();
    if (video && player.paused)
      $("cinema").querySelector("[data-play]").click();
  }
  engine.stamp = performance.now();
}
$("rotate").oncancel = (e) => e.preventDefault();
portrait.addEventListener("change", updateOrientation);
updateOrientation();
document.addEventListener("visibilitychange", () => {
  input.reset();
  if (document.hidden && page === "race" && !paused && !video) action("pause");
  engine.stamp = performance.now();
});
try {
  world = new World($("world"));
  if (matchMedia("(pointer: coarse)").matches && !s.scenes.length)
    Object.assign(s.settings, {
      quality: "Низкое",
      trees: 0.4,
      scale: 0.7,
      shadows: 0,
      particles: 0.3,
      distance: 450,
      fps: 30,
      post: 0,
    });
  world.settings(s.settings);
  const [hasIntro] = await Promise.all([
    prepareAssets((done, total) => {
      $("boot-count").textContent = Math.round((done / total) * 100) + "%";
      $("boot-progress").value = (done / total) * 100;
    }),
    world.load(),
  ]);
  world.populate(null, s.look);
  world.update(0.1, null, "home", s.settings);
  if (hasIntro) {
    video = true;
    await new Promise((resolve) => opening(s.settings, resolve));
    video = false;
  }
  menu("home");
  requestAnimationFrame(frame);
} catch (err) {
  console.error(err);
  $("ui").innerHTML =
    '<section class="panel"><h1>Не удалось открыть игру</h1><p>Запустите локальный сервер и включите аппаратное ускорение WebGL 2 в браузере.</p><button class="primary" onclick="location.reload()">Повторить</button></section>';
}
