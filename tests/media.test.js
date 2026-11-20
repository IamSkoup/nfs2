import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../src/audio.js";
import { cinema } from "../src/video.js";
import { fresh } from "../src/save.js";
class Sound {
  constructor() {
    this.volume = 1;
    this.paused = true;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
test("Плейлист между экранами, затухание, следующий трек и тишина во время ролика", () => {
  globalThis.Audio = Sound;
  const a = new AudioManager(fresh().settings);
  a.mode("menu");
  a.unlock();
  const first = a.current;
  first.currentTime = 23;
  a.mode("menu");
  assert.equal(a.current, first);
  assert.equal(first.currentTime, 23);
  first.onended();
  assert.notEqual(a.current.src, first.src);
  const next = a.current;
  a.update(1);
  a.mode("race", true);
  assert.match(a.current.src, /race[1-9].mp3$/);
  a.update(1);
  assert.equal(next.paused, true);
  a.silence();
  assert.equal(a.players.length, 0);
  assert.equal(a.current, null);
});
test("Отсутствующие треки перебираются конечное число раз", () => {
  globalThis.Audio = Sound;
  const a = new AudioManager(fresh().settings);
  a.unlock();
  a.mode("race");
  for (let i = 0; i < 9; i++) a.current.onerror();
  assert.equal(a.current, null);
  assert.equal(a.missing.size, 9);
});
test("Отказ autoplay, ручной запуск, пропуск и отсутствие видео", async () => {
  let v = new Sound(),
    s = fresh(),
    count = 0,
    blocked = true;
  Object.assign(v, {
    removeAttribute() {},
    load() {},
    play: () =>
      blocked
        ? Promise.reject(Object.assign(Error(), { name: "NotAllowedError" }))
        : Promise.resolve(),
  });
  const play = {},
    skip = {},
    layer = {
      hidden: true,
      querySelector: (q) =>
        q === "video" ? v : q === "[data-play]" ? play : skip,
    };
  globalThis.document = { querySelector: () => layer };
  cinema(5, s, () => count++);
  await Promise.resolve();
  assert.equal(play.hidden, false);
  blocked = false;
  await play.onclick();
  v.onplaying();
  assert.ok(play.hidden);
  skip.onclick();
  skip.onclick();
  assert.equal(count, 1);
  assert.deepEqual(s.seen, [5]);
  cinema(7, s, () => count++);
  v.onerror();
  assert.equal(count, 2);
  assert.ok(layer.hidden);
  assert.deepEqual(s.seen, [5]);
  cinema(8, s, () => count++);
  v.onended();
  assert.deepEqual(s.seen, [5, 8]);
  assert.equal(count, 3);
});

test("Звук адреналина прекращается при отпускании и смене экрана", () => {
  globalThis.Audio = Sound;
  const audio = new AudioManager(fresh().settings);
  audio.unlock();
  audio.mode("race");
  audio.setBoost(true);
  const hiss = audio.fx.get("adrenaline-hiss");
  assert.equal(hiss.paused, false);
  hiss.currentTime = 2;
  audio.setBoost(true);
  assert.equal(hiss.currentTime, 2);
  audio.setBoost(false);
  assert.equal(hiss.paused, true);
  assert.equal(hiss.currentTime, 0);
  audio.setBoost(true);
  audio.mode("menu");
  assert.equal(hiss.paused, true);
});

test("Пауза останавливает музыку, ветер и шаги и сохраняет позицию трека", () => {
  globalThis.Audio = Sound;
  const audio = new AudioManager(fresh().settings);
  assert.equal(audio.s.music, 0.2);
  audio.unlock();
  audio.mode("race");
  audio.ambience(15);
  audio.effect("gravel");
  const track = audio.current;
  track.currentTime = 18;
  audio.setPaused(true);
  audio.unlock();
  for (const sound of [track, audio.wind, audio.fx.get("gravel")]) assert.ok(sound.paused);
  audio.setPaused(false);
  assert.equal(audio.current, track);
  assert.equal(track.currentTime, 18);
  assert.equal(track.paused, false);
});

test("Целый цикл плейлиста и переход в следующий проходят без повторов", () => {
  globalThis.Audio = Sound;
  const a = new AudioManager(fresh().settings);
  a.unlock();
  for (const [kind, size] of [["menu", 4], ["race", 9]]) {
    a.mode(kind);
    let previous;
    for (let cycle = 0; cycle < 4; cycle++) {
      const tracks = new Set();
      for (let i = 0; i < size; i++) {
        const track = a.current.src;
        assert.equal(track, "assets/music/" + kind + (i + 1) + ".mp3");
        assert.notEqual(track, previous);
        tracks.add(track);
        previous = track;
        a.current.onended();
      }
      assert.equal(tracks.size, size);
    }
  }
});
