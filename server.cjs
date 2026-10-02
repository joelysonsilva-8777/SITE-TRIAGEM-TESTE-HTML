const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, process.argv[2] || ".");
if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("index.html ausente. Para visualizar dist/, execute npm run build primeiro.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
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
      return res.end("URL inválida");
    }
    const target = path.resolve(
      root,
      "." + (decoded === "/" ? "/index.html" : decoded),
    );
    if (
      !target.startsWith(root + path.sep) ||
      /(?:^|[\\/])(?:node_modules|tests|\.git)(?:[\\/]|$)/.test(
        target.slice(root.length),
      )
    ) {
      res.writeHead(403);
      return res.end("Acesso indisponível");
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Página não encontrada");
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    });
  })
  .listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
    console.log(
      "Clara disponível em http://localhost:" + (process.env.PORT || 4173),
    ),
  );
