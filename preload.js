if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./media-worker.js")
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => registration.active?.postMessage("preload"))
    .catch(() => {});
}
