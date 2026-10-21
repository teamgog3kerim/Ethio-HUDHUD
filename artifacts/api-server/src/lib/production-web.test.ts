import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mountProductionWeb } from "./production-web";

test("single server serves SPA routes, PWA files and assets but not unknown APIs", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "hudhud-web-"));
  await mkdir(path.join(dir, "assets"));
  await writeFile(path.join(dir, "index.html"), "<html>HUDHUD fixture</html>");
  await writeFile(path.join(dir, "sw.js"), "// fixture");
  await writeFile(path.join(dir, "manifest.webmanifest"), '{"name":"HUDHUD"}');
  await writeFile(path.join(dir, "assets", "test-123.js"), "// fixture");
  const app = express();
  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  mountProductionWeb(app, dir);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const route of ["/", "/learn", "/sign-in", "/admin/users", "/lesson/numbers-course-0-10"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /HUDHUD fixture/);
      assert.equal(response.headers.get("cache-control"), "no-cache");
    }
    assert.equal((await fetch(base + "/api/healthz")).status, 200);
    assert.equal((await fetch(base + "/api/missing")).status, 404);
    assert.equal((await fetch(base + "/missing.js")).status, 404);
    const sw = await fetch(base + "/sw.js");
    assert.equal(sw.headers.get("service-worker-allowed"), "/");
    assert.equal(sw.headers.get("cache-control"), "no-cache");
    assert.equal((await fetch(base + "/manifest.webmanifest")).status, 200);
    assert.match((await fetch(base + "/assets/test-123.js")).headers.get("cache-control")!, /immutable/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
