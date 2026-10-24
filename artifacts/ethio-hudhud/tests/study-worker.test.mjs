import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function harness() {
  const listeners = {}, values = new Map(), shown = [], opened = [];
  const db = {
    close() {},
    transaction() {
      const tx = { objectStore: () => ({
        get(key) {
          const req = {};
          queueMicrotask(() => { req.result = values.get(key); req.onsuccess?.(); });
          return req;
        },
        put(value, key) { values.set(key, value); },
        delete(key) { values.delete(key); },
      }) };
      setTimeout(() => tx.oncomplete?.(), 0);
      return tx;
    },
  };
  const self = {
    addEventListener: (name, fn) => { listeners[name] = fn; },
    registration: {
      scope: 'https://example.invalid/app/study-notifications/',
      showNotification: async (title, data) => { shown.push({ title, ...data }); },
      getNotifications: async () => [],
    },
    clients: { matchAll: async () => [], openWindow: async href => { opened.push(href); } },
  };
  vm.runInNewContext(readFileSync(new URL('../public/study-notifications/sw.js', import.meta.url), 'utf8'), {
    self, URL, Intl, Date, indexedDB: {
      open() { const req = {}; queueMicrotask(() => { req.result = db; req.onsuccess?.(); }); return req; },
    },
  });
  const fire = async (type, extra) => {
    let pending;
    listeners[type]({ ...extra, waitUntil: promise => { pending = promise; } });
    await pending;
  };
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = name => parts.find(p => p.type === name).value;
  const payload = {
    kind: 'study', binding: 'a'.repeat(64), period: `study-${'b'.repeat(64)}`,
    date: `${part('year')}-${part('month')}-${part('day')}`, timezone: 'UTC',
    expiresAt: new Date(Date.now() + 900000).toISOString(),
  };
  return { fire, values, shown, opened, payload };
}
test('background worker rejects unbound, old-account and expired notifications', async () => {
  const h = harness();
  await h.fire('push', { data: { json: () => h.payload } });
  assert.equal(h.shown.length, 0);
  h.values.set('binding', 'c'.repeat(64));
  await h.fire('push', { data: { json: () => h.payload } });
  assert.equal(h.shown.length, 0);
  h.values.set('binding', h.payload.binding);
  await h.fire('push', { data: { json: () => ({ ...h.payload, expiresAt: '2000-01-01' }) } });
  assert.equal(h.shown.length, 0);
});
test('background worker displays once, claims before display, and never trusts redirect content', async () => {
  const h = harness(); h.values.set('binding', h.payload.binding);
  const data = { json: () => ({ ...h.payload, url: 'https://untrusted.invalid' }) };
  await h.fire('push', { data }); await h.fire('push', { data });
  assert.equal(h.shown.length, 1);
  assert.equal(h.values.get(h.payload.period), true);
  await h.fire('notificationclick', { notification: { close() {} } });
  assert.deepEqual(h.opened, ['https://example.invalid/app/plan']);
});
test('clearing study consent blocks messages already in transit', async () => {
  const h = harness(); h.values.set('binding', h.payload.binding);
  let ok = false;
  await h.fire('message', { data: { type: 'STUDY_BINDING', id: null }, ports: [{ postMessage: result => { ok = result.ok; } }] });
  assert.equal(ok, true);
  await h.fire('push', { data: { json: () => h.payload } });
  assert.equal(h.shown.length, 0);
});
test('billing payloads and notifications delivered on a different study date are ignored', async () => {
  const h = harness(); h.values.set('binding', h.payload.binding);
  await h.fire('push', { data: { json: () => ({ ...h.payload, kind: 'renewal' }) } });
  await h.fire('push', { data: { json: () => ({ ...h.payload, date: '2000-01-01' }) } });
  assert.equal(h.shown.length, 0);
});
