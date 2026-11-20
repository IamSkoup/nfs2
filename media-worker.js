const cacheName = "fuli2-media-v1";
const files = [
  "cutscenes/cut-scene.mp4",
  ...Array.from({ length: 4 }, (_, i) => "music/menu" + (i + 1) + ".mp3"),
  ...Array.from(
    { length: 7 },
    (_, i) => "cutscenes/cut-scene" + (i + 2) + ".mp4",
  ),
  ...Array.from({ length: 9 }, (_, i) => "music/race" + (i + 1) + ".mp3"),
].map((name) => new URL("assets/" + name, self.registration.scope).href);
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
let pending;
async function preload() {
  const cache = await caches.open(cacheName);
  async function loadGroup(urls) {
    for (const url of urls) {
      try {
        const saved = await cache.match(url);
        const headers = {};
        const etag = saved?.headers.get("etag");
        const modified = saved?.headers.get("last-modified");
        if (etag) headers["If-None-Match"] = etag;
        else if (modified) headers["If-Modified-Since"] = modified;
        else if (saved) continue;
        const response = await fetch(url, { priority: "low", headers });
        if (response.status === 200) await cache.put(url, response);
      } catch {}
    }
  }
  await Promise.all([
    loadGroup(files.filter((url) => url.endsWith(".mp3"))),
    loadGroup(files.filter((url) => url.endsWith(".mp4"))),
  ]);
}
self.addEventListener("message", (event) => {
  if (event.data === "preload") {
    pending ??= preload()
      .catch(() => {})
      .finally(() => {
        pending = null;
      });
    event.waitUntil(pending);
  }
});
async function serve(request) {
  const cached = await caches.match(request.url, { cacheName });
  if (!cached) return fetch(request);
  const range = request.headers.get("Range");
  if (!range) return cached;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return fetch(request);
  const blob = await cached.blob();
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, blob.size - Number(match[2]));
  const end =
    match[1] && match[2]
      ? Math.min(Number(match[2]), blob.size - 1)
      : blob.size - 1;
  if (start > end || start >= blob.size)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": "bytes */" + blob.size },
    });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || blob.type,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": "bytes " + start + "-" + end + "/" + blob.size,
    },
  });
}
self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && files.includes(event.request.url))
    event.respondWith(serve(event.request).catch(() => fetch(event.request)));
});
