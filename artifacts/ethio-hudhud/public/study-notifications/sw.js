// Independent scope and database: studying never opts a learner into billing
// alerts, and disabling billing never silently cancels study notifications.
const DB = 'hudhud-study-notifications';
async function state() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'STUDY_BINDING') return;
  event.waitUntil((async () => {
    let db;
    try {
      db = await state();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite');
        if (event.data.id) tx.objectStore('state').put(event.data.id, 'binding');
        else tx.objectStore('state').delete('binding');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      if (!event.data.id) for (const notice of await self.registration.getNotifications()) notice.close();
      event.ports[0]?.postMessage({ ok: true });
    } catch { event.ports[0]?.postMessage({ ok: false }); }
    finally { db?.close(); }
  })());
});
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data.json(); } catch { return; }
    if (payload.kind !== 'study' || !/^[0-9a-f]{64}$/.test(payload.binding)
      || !/^study-[0-9a-f]{64}$/.test(payload.period)
      || !Number.isFinite(Date.parse(payload.expiresAt)) || Date.parse(payload.expiresAt) <= Date.now()) return;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: payload.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const value = type => parts.find(p => p.type === type).value;
      if (`${value('year')}-${value('month')}-${value('day')}` !== payload.date) return;
    } catch { return; }
    const db = await state();
    try {
      const claimed = await new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite');
        const store = tx.objectStore('state');
        let allowed = false;
        const binding = store.get('binding');
        binding.onsuccess = () => {
          if (binding.result !== payload.binding) return;
          const prior = store.get(payload.period);
          prior.onsuccess = () => {
            if (prior.result) return;
            store.put(true, payload.period); // Claim before display; never replay a stale alert.
            allowed = true;
          };
        };
        tx.oncomplete = () => resolve(allowed);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      if (!claimed) return;
      await self.registration.showNotification('هدهد — حان وقت التعلّم', {
        body: 'جلسة الأمهرية بانتظارك. اضغط لمتابعة برنامجك.',
        icon: new URL('../icons/icon-192.png', self.registration.scope).href,
        tag: payload.period, data: { study: true },
        actions: [{ action: 'learn', title: 'تابع التعلّم' }],
      });
    } finally { db.close(); }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    // Fixed, same-origin destination; push payloads cannot supply redirect URLs.
    const href = new URL('../plan', self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = windows.find(client => new URL(client.url).origin === new URL(href).origin
      && new URL(client.url).pathname.startsWith(new URL('../', self.registration.scope).pathname));
    if (app) { await app.navigate(href); await app.focus(); }
    else await self.clients.openWindow(href);
  })());
});
