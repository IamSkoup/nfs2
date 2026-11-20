export function cinema(id, s, done) {
  const layer = document.querySelector("#cinema"),
    video = layer.querySelector("video"),
    play = layer.querySelector("[data-play]");
  layer.hidden = false;
  play.hidden = true;
  video.volume = s.settings.video * 0.5;
  let ended = false;
  function finish(watched) {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    video.onerror = video.onended = video.onplaying = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
    layer.hidden = true;
    if (id && watched && !s.seen.includes(id)) s.seen.push(id);
    done();
  }
  const timer = setTimeout(() => {
    if (video.readyState === 0) finish(false);
  }, 45000);
  video.onended = () => finish(true);
  video.onerror = () => finish(false);
  video.onplaying = () => {
    clearTimeout(timer);
    play.hidden = true;
  };
  layer.querySelector("[data-skip]").onclick = () => finish(true);
  video.src = !id ? "assets/cutscenes/video.mp4" : "assets/cutscenes/cut-scene" + (id === 1 ? "" : id) + ".mp4";
  const start = () =>
    video.play().catch((err) => {
      if (ended || err.name === "AbortError") return;
      if (err.name === "NotAllowedError") play.hidden = false;
      else finish(false);
    });
  play.onclick = start;
  if (!document.querySelector("#rotate").open) start();
}

export function opening(settings, done) {
  const layer = document.querySelector("#cinema");
  const video = layer.querySelector("video");
  const play = layer.querySelector("[data-play]");
  const skip = layer.querySelector("[data-skip]");
  const path = "assets/cutscenes/video.mp4";
  let blobURL, closed = false, position = 0, retry = false, loading = false;
  const controller = new AbortController();
  layer.hidden = false;
  play.hidden = true;
  video.volume = settings.video * 0.5;
  function finish() {
    if (closed) return;
    closed = true;
    controller.abort();
    video.onerror = video.onended = video.ontimeupdate = video.onplaying = null;
    play.onclick = skip.onclick = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (blobURL) URL.revokeObjectURL(blobURL);
    play.textContent = "Воспроизвести";
    layer.hidden = true;
    done();
  }
  function showButton(failed) {
    if (closed) return;
    retry = failed;
    play.textContent = failed ? "Повторить загрузку" : "Воспроизвести";
    play.hidden = false;
  }
  async function start() {
    if (closed || loading) return;
    loading = true;
    play.hidden = true;
    try {
      if (!blobURL || retry) {
        const saved = !retry && await globalThis.caches?.match(path,{cacheName:"fuli2-media-v1"}).catch(()=>null);
        const response = saved || await fetch(path,{headers:{"X-Fuli-Preload":"1"},cache:"reload",signal:controller.signal});
        if (response.status===404 || response.status===410) return finish();
        if (!response.ok) throw Error();
        const blob = await response.blob();
        if (closed) return;
        if (!blob.size) throw Error();
        if (blobURL) URL.revokeObjectURL(blobURL);
        blobURL = URL.createObjectURL(blob);
        video.src = blobURL;
        if (position) video.currentTime = position;
        retry = false;
      }
      if (!document.querySelector("#rotate").open) await video.play();
    } catch (e) {
      showButton(e.name !== "NotAllowedError" && e.name !== "AbortError");
    } finally { loading = false; }
  }
  play.onclick = start;
  skip.onclick = finish;
  video.ontimeupdate = () => {position = Math.max(position, video.currentTime)};
  video.onerror = () => showButton(true);
  video.onplaying = () => {play.hidden = true};
  video.onended = () => {
    if (Number.isFinite(video.duration) && video.currentTime >= video.duration - 0.25) finish();
    else showButton(true);
  };
  start();
}
