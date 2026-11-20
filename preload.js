const cacheName = "fuli2-media-v1";
const media = [
  "video.mp4",
  ...Array.from(
    { length: 8 },
    (_, i) => "assets/cutscenes/cut-scene" + (i ? i + 1 : "") + ".mp4",
  ),
  ...Array.from(
    { length: 4 },
    (_, i) => "assets/music/menu" + (i + 1) + ".mp3",
  ),
  ...Array.from(
    { length: 9 },
    (_, i) => "assets/music/race" + (i + 1) + ".mp3",
  ),
  ...[
    "adrenaline-hiss.ogg",
    "adrenaline-release.ogg",
    "break.ogg",
    "coin.ogg",
    "fall.ogg",
    "jump.ogg",
    "land.ogg",
    "walking.ogg",
    "breath-cue.wav",
    "gravel.wav",
    "hit-animal.wav",
    "hit-stone.wav",
    "hit-wood.wav",
    "leaves.wav",
    "mud.wav",
    "wind.wav",
  ].map((name) => "assets/sfx/" + name),
  ...[
    "BarlowCondensed-Regular",
    "BarlowCondensed-SemiBoldItalic",
    "RobotoCondensed-Italic",
    "RobotoCondensed",
  ].map((name) => "assets/fonts/" + name + ".ttf"),
];
export async function prepareAssets(report) {
  let cache;
  try {
    cache = await caches.open(cacheName);
  } catch {}
  let completed = 0,
    hasIntro = false;
  async function download(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);
    try {
      const url = new URL(path, document.baseURI);
      const saved = await cache?.match(url);
      const headers = {};
      if (saved?.headers.get("etag"))
        headers["If-None-Match"] = saved.headers.get("etag");
      else if (saved?.headers.get("last-modified"))
        headers["If-Modified-Since"] = saved.headers.get("last-modified");
      if (path === "video.mp4" && saved) hasIntro = true;
      if (saved && !Object.keys(headers).length) return;
      headers["X-Fuli-Preload"] = "1";
      const response = await fetch(url, {
        headers,
        cache: "no-cache",
        signal: controller.signal,
      });
      if (response.status !== 200) return;
      if (path === "video.mp4") hasIntro = true;
      if (cache) await cache.put(url, response);
      else await response.arrayBuffer();
    } catch {
    } finally {
      clearTimeout(timer);
      report(++completed, media.length);
    }
  }
  const videos = media.filter((path) => path.endsWith(".mp4"));
  const other = media.filter((path) => !path.endsWith(".mp4"));
  async function drain() {
    while (other.length) await download(other.shift());
  }
  await Promise.all([...videos.map(download), drain(), drain()]);
  return hasIntro;
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./media-worker.js").catch(() => {});
