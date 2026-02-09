/**
 * Minimal static file server for Replit deploy.
 * Serves the Expo web export (dist/) and responds to / with 200 quickly for health checks.
 * Listens on 0.0.0.0 so Replit can reach it.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";
const DIST = path.join(__dirname, "dist");

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("Missing dist/index.html. Run: npm run build:web");
  process.exit(1);
}

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  res.setHeader("Content-Type", mime);
  stream.pipe(res);
  stream.on("error", () => {
    res.writeHead(404);
    res.end("Not found");
  });
}

const server = http.createServer((req, res) => {
  const url = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(DIST, path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, ""));

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback: serve index.html for client-side routes
      const indexPath = path.join(DIST, "index.html");
      fs.stat(indexPath, (e, s) => {
        if (e || !s?.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        serveFile(indexPath, res);
      });
      return;
    }
    serveFile(filePath, res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
