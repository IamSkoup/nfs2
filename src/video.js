export function cinema(id, s, done) {
  const layer = document.querySelector("#cinema"),
    video = layer.querySelector("video"),
    play = layer.querySelector("[data-play]");
  layer.hidden = false;
  play.hidden = true;
  video.volume = s.settings.video;
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
    if (watched && !s.seen.includes(id)) s.seen.push(id);
    done();
  }
  const timer = setTimeout(() => {
    if (video.readyState === 0) finish(false);
  }, 7000);
  video.onended = () => finish(true);
  video.onerror = () => finish(false);
  video.onplaying = () => {
    clearTimeout(timer);
    play.hidden = true;
  };
  layer.querySelector("[data-skip]").onclick = () => finish(true);
  video.src = "assets/cutscenes/cut-scene" + (id === 1 ? "" : id) + ".mp4";
  const start = () =>
    video.play().catch((err) => {
      if (ended) return;
      if (err.name === "NotAllowedError") play.hidden = false;
      else finish(false);
    });
  play.onclick = start;
  start();
}
