import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".glb": "model/gltf-binary",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".ttf": "font/ttf",
};
const server = http.createServer((req, res) => {
  let name;
  try {
    name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
  if (
    !file.startsWith(path.resolve(root) + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404).end();
    return;
  }
  const size = fs.statSync(file).size,
    headers = {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Accept-Ranges": "bytes",
    };
  let start = 0,
    end = size - 1,
    status = 200;
  if (req.headers.range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if (!m || +m[1] >= size) {
      res.writeHead(416).end();
      return;
    }
    start = +m[1];
    end = Math.min(end, m[2] ? +m[2] : end);
    if (end < start) {
      res.writeHead(416).end();
      return;
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  res.writeHead(status, { ...headers, "Content-Length": end - start + 1 });
  if (req.method === "HEAD" || !size) res.end();
  else fs.createReadStream(file, { start, end }).pipe(res);
});
server.listen(Number(process.env.PORT) || 8080, "0.0.0.0", () => {
  const url = "http://localhost:" + server.address().port + "/";
  console.log("Игра открывается по адресу " + url);
  if (process.argv.includes("--open") && process.platform === "win32")
    spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
});
