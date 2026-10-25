import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const target = path.resolve(
      root,
      "." + (requestPath === "/" ? "/index.html" : requestPath),
    );
    if (!target.startsWith(path.resolve(root) + path.sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const file = await fs.readFile(target);
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found. Run npm run build if dist is missing.");
  }
});
server.on("error", (error) => {
  console.error("Unable to start:", error.message);
  process.exitCode = 1;
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "MediSystem is ready: http://127.0.0.1:4173\nOpen this address in your browser. Press Ctrl+C to stop.",
  ),
);
