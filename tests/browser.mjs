import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    }),
    errors = [],
    requests = [];
  page.setDefaultTimeout(25000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (r.url().includes("cut-scene")) requests.push(r.url().split("/").pop());
  });
  await page.route("**/src/main.js", async (route) => {
    const resp = await route.fetch();
    await route.fulfill({
      response: resp,
      body:
        (await resp.text()) +
        `
window.qa={s,get race(){return r},get page(){return page},finishTest(win){r.rank=win?1:2;r.time=73;r.peak=85;r.over=true;r.player.s=r.total;finish()},selectStage(id){s.done=Array.from({length:id},(_,i)=>i);selected=id;save();menu('career')},keys:()=>input.read(),world,scene:()=>world.renderer.info.render,save};
`,
    });
  });
  await page.goto("http://127.0.0.1:8080");
  await page.waitForFunction(
    () =>
      window.qa?.page === "home" && document.querySelector("#cinema").hidden,
  );
  await page.waitForTimeout(850);
  console.log("WEBGL", await page.evaluate(() => qa.scene()));
  const physical = await page.evaluate(async () => {
    const { Race } = await import("./src/race.js"),
      { drive } = await import("./src/ai.js"),
      { events } = await import("./src/config.js"),
      { fresh } = await import("./src/save.js"),
      { settle } = await import("./src/economy.js"),
      { buy } = await import("./src/tuning.js");
    let s = fresh(),
      result = [];
    for (const event of events) {
      const r = new Race(event, s);
      r.collides = qa.world.environment.collides;
      for (let i = 0; i < 60 * 450 && !r.over; i++) {
        let c = drive(r.player, r, 0);
        if (event.type === "Драг") c.breath = r.player.rev >= 0.81;
        r.tick(1 / 60, c);
      }
      result.push([event.name, r.over, r.rank, Math.round(r.player.s)]);
      settle(s, r, true);
      for (const k of [
        "speed",
        "accel",
        "turn",
        "grip",
        "launch",
        "breath",
        "tank",
        "power",
        "stamina",
      ])
        buy(s, k);
    }
    return result;
  });
  console.log("С препятствиями", physical);
  assert.ok(physical.every((a) => a[1] && a[2] === 1));
  const go = async (act) =>
    page
      .locator('[data-go="' + act + '"]:visible')
      .first()
      .click();
  const click = async (act) =>
    page
      .locator('[data-act="' + act + '"]:visible')
      .first()
      .click();
  const wait = async (p) =>
    page.waitForFunction(
      (p) => window.qa?.page === p && document.querySelector("#cinema").hidden,
      p,
    );
  await go("career");
  await click("start");
  await wait("race");
  await page.keyboard.down("w");
  await page.waitForTimeout(750);
  await page.keyboard.up("w");
  await click("pause");
  await click("pause");
  await page.evaluate(() => qa.finishTest(true));
  await wait("result");
  await click("return");
  await go("home");
  await go("tuning");
  await page.locator("[data-buy=speed]").click();
  const bank = await page.evaluate(() => qa.s.money);
  await page.reload();
  await wait("home");
  assert.equal(await page.evaluate(() => qa.s.money), bank);
  for (let id of [2, 9]) {
    await page.evaluate((id) => qa.selectStage(id), id);
    await click("start");
    await wait("race");
    let prior = requests.length;
    await page.evaluate(() => qa.finishTest(false));
    await wait("result");
    assert.equal(requests.length, prior);
    await click("retry");
    await wait("race");
    await page.evaluate(() => qa.finishTest(true));
    await wait(id === 2 ? "result" : "ending");
    if (id === 2) {
      assert.ok(!requests.includes("cut-scene3.mp4"));
      await click("return");
      await wait("career");
    }
    assert.equal(requests.at(-1), "cut-scene" + (id === 2 ? 3 : 8) + ".mp4");
  }
  await page.evaluate(() => qa.selectStage(6));
  const pick = () => page.locator('button[data-select="6"]').click();
  await pick();
  await wait("deal");
  assert.equal(requests.at(-1), "cut-scene4.mp4");
  await click("decline");
  await wait("career");
  let before = requests.length;
  await pick();
  assert.equal(requests.length, before);
  await page.evaluate(() => {
    qa.s.offer = "new";
    qa.save();
  });
  await pick();
  await wait("deal");
  await click("accept");
  await wait("race");
  assert.equal(requests.at(-1), "cut-scene5.mp4");
  await page.evaluate(() => qa.finishTest(false));
  await wait("result");
  await click("retry");
  await wait("race");
  const money = await page.evaluate(() => qa.s.money);
  await page.evaluate(() => qa.finishTest(true));
  await wait("result");
  assert.equal(await page.evaluate(() => qa.s.money), money + 7000);
  assert.ok(!requests.includes("cut-scene6.mp4"));
  await page.reload();
  await wait("home");
  await go("career");
  await wait("claimed");
  await click("return");
  await wait("career");
  assert.equal(requests.at(-1), "cut-scene6.mp4");
  assert.equal(await page.evaluate(() => qa.s.money), money + 7000);
  await go("home");
  await go("free");
  await wait("race");
  await page.locator("[data-act=challenge]").click();
  assert.equal(await page.evaluate(() => qa.race.free), false);
  await click("pause");
  await go("home");
  await go("settings");
  await page.locator("[data-bind=breath]").click();
  await page.keyboard.press("q");
  assert.equal(await page.evaluate(() => qa.s.settings.keys.breath), "KeyQ");
  await go("home");
  await go("clips");
  await page.locator('[data-clip="6"]').click();
  await wait("clips");
  await page.setViewportSize({ width: 390, height: 844 });
  await go("home");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await go("quick");
  await page.locator('button[data-select="3"]').click();
  await click("start");
  await wait("race");
  await page.evaluate(() => {
    for (const [i, k] of ["gas", "boost", "breath"].entries()) {
      const b = document.querySelector('[data-key="' + k + '"]');
      b.setPointerCapture = () => {};
      b.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: i + 1 }),
      );
    }
  });
  assert.ok(await page.evaluate(() => qa.keys().boost && qa.keys().gas));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(800);
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll("#touch button")]
        .filter((b) => b.offsetWidth)
        .every((b) => {
          let r = b.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight + 1
          );
        }),
    ),
  );
  const timings = await page.evaluate(async () => {
    let samples = [],
      prev = performance.now();
    return await new Promise((ok) => {
      function frame(t) {
        samples.push(t - prev);
        prev = t;
        if (samples.length === 45) {
          ok(samples.sort((a, b) => a - b)[22]);
          return;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  });
  console.log("Интервал rAF, мс", timings);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document
      .querySelector("#touch")
      .dispatchEvent(
        new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 }),
      );
    for (let id of [2, 3])
      document
        .querySelector("#touch")
        .dispatchEvent(
          new PointerEvent("pointercancel", { bubbles: true, pointerId: id }),
        );
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const coords = await page.evaluate(() =>
    ["gas", "boost"].map((k, i) => {
      let r = document
        .querySelector('[data-key="' + k + '"]')
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: i + 1 };
    }),
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: coords,
  });
  assert.ok(
    await page.evaluate(() => {
      let v = qa.keys();
      return v.gas && v.boost;
    }),
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.ok(await page.evaluate(() => !qa.keys().gas));
  let frames = await page.evaluate(async () => {
    let start = qa.scene().frame,
      now = performance.now();
    await new Promise((r) => setTimeout(r, 2000));
    return Math.round(
      ((qa.scene().frame - start) * 1000) / (performance.now() - now),
    );
  });
  console.log("Кадры 3D/с, эмуляция Chrome", frames);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: секции, перезагрузка, сцены, обе ветви, финал, мобильные кнопки",
    requests,
  );
} finally {
  await browser.close();
}
