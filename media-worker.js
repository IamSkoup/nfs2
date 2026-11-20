const cacheName = "fuli2-media-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
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
  const url = new URL(event.request.url);
  const root = self.registration.scope;
  if (
    event.request.method === "GET" &&
    !event.request.headers.has("X-Fuli-Preload") &&
    (url.href === root + "assets/cutscenes/video.mp4" ||
      ["music", "cutscenes", "sfx", "fonts"].some((group) =>
        url.href.startsWith(root + "assets/" + group + "/"),
      ))
  )
    event.respondWith(serve(event.request).catch(() => fetch(event.request)));
});
