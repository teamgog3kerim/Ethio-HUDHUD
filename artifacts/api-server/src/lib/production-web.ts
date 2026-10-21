import express, { type Express } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function mountProductionWeb(app: Express, directory?: string) {
  // Relative to the bundled dist/index.mjs. Tests pass an isolated fixture directory.
  const publicDir = directory ?? fileURLToPath(new URL("../../ethio-hudhud/dist/public/", import.meta.url));
  const index = path.join(publicDir, "index.html");
  if (!existsSync(index)) throw new Error("Web build is missing. Run pnpm run deploy:build before starting.");
  // Unknown API paths must not become successful HTML SPA responses.
  app.use("/api", (_req, res) => { res.status(404).json({ error: "API route not found" }); });
  app.use(express.static(publicDir, {
    index: false,
    dotfiles: "deny",
    setHeaders(res, file) {
      res.setHeader("Cache-Control", file.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable" : "no-cache");
      if (file.endsWith(`${path.sep}sw.js`)) res.setHeader("Service-Worker-Allowed", "/");
    },
  }));
  app.get("/{*path}", (req, res, next) => {
    if (path.extname(req.path) || !req.accepts("html")) { next(); return; }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });
}
