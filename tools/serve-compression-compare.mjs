// Read-only static server for tools/compression-compare.html.
//   node tools/serve-compression-compare.mjs   → http://127.0.0.1:3108/tools/compression-compare.html
// Serves only tools/, public/ and outputs/compression-samples/ from this repo. Supports Range for video seeking.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = ["tools/", "public/", "outputs/compression-samples/"];
const types = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".webp": "image/webp",
  ".webm": "video/webm", ".mp4": "video/mp4", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json; charset=utf-8" };
// Never cache, so the load-time button measures real transfers every time.
const port = Number(process.env.PORT || 3108);

http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !allowed.some((a) => rel.startsWith(a)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  const size = fs.statSync(file).size;
  const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { "Cache-Control": "no-store", "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "Cache-Control": "no-store", "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  fs.createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/tools/compression-compare.html`));
