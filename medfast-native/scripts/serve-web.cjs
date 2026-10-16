const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    let decoded;
    try {
      decoded = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let target = path.resolve(
      root,
      "." + (decoded === "/" ? "/index.html" : decoded),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!path.extname(target)) target = path.join(root, "index.html");
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Não encontrado");
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(Number(process.env.PORT) || 8082, "127.0.0.1", () =>
    console.log("MedFast Native: http://localhost:" + (process.env.PORT || 8082)),
  );
