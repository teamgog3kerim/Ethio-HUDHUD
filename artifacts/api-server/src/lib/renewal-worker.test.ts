import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { IDBFactory } from "fake-indexeddb";

test("real PWA worker isolates accounts, suppresses duplicates/expired notices, and opens a scoped URL", async () => {
  const handlers = new Map<string, (event: any) => void>();
  const shown: any[] = [];
  const opened: string[] = [];
  let closed = 0;
  const self = {
    addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    registration: {
      scope: "https://example.invalid/course/",
      showNotification: async (title: string, options: unknown) => { shown.push({ title, options }); },
      getNotifications: async () => [{ close: () => closed++ }],
    },
    clients: { openWindow: async (url: string) => opened.push(url) },
  };
  runInNewContext(await readFile(new URL("../../../ethio-hudhud/public/sw.js", import.meta.url), "utf8"), { self, indexedDB: new IDBFactory(), URL, Date });
  const emit = async (name: string, event: object) => {
    let pending: Promise<unknown> | undefined;
    handlers.get(name)!({ ...event, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  };
  const bind = async (id: string | null) => {
    let reply: any;
    await emit("message", { data: { type: "RENEWAL_BINDING", id }, ports: [{ postMessage: (value: any) => { reply = value; } }] });
    assert.equal(reply.ok, true);
  };
  const payload = { title: "test", body: "generic access notice", binding: "device-a", period: "account-a-period", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const push = async (value: typeof payload) => emit("push", { data: { json: () => value } });
  await push(payload);
  assert.equal(shown.length, 0, "No consent means no notification");
  await bind("device-a");
  await Promise.all([push(payload), push(payload)]);
  assert.equal(shown.length, 1);
  await push({ ...payload, period: "expired", expiresAt: "2020-01-01T00:00:00Z" });
  await push({ ...payload, period: "invalid", expiresAt: "invalid" });
  assert.equal(shown.length, 1);
  await bind(null);
  assert.equal(closed, 1, "Revocation closes existing account notifications");
  await push({ ...payload, period: "queued-after-signout" });
  assert.equal(shown.length, 1);
  await bind("device-b");
  await push({ ...payload, period: "queued-from-old-account" });
  assert.equal(shown.length, 1);
  await push({ ...payload, binding: "device-b", period: "account-b-period" });
  assert.equal(shown.length, 2);
  await emit("notificationclick", { notification: { close: () => {} } });
  assert.equal(opened[0], "https://example.invalid/course/premium");
});
