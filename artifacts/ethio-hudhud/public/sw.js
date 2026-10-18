/* Network-only PWA worker. Never cache API replies, Clerk sessions or learner data. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#104C3D"><title>هدهد — لا يوجد اتصال</title><style>body{font-family:system-ui,sans-serif;background:#F7F8F5;color:#192B27;min-height:85vh;display:grid;place-items:center;margin:0;padding:24px}main{max-width:360px;text-align:center;line-height:1.9}button{background:#176B55;color:white;border:0;padding:14px 28px;border-radius:16px;font:inherit;cursor:pointer}</style><main><h1>هدهد يحتاج إلى اتصال</h1><p>تحقّق من الإنترنت ثم أعد المحاولة. لن نعرض بيانات تعلّم قديمة أو بيانات حساب آخر.</p><p lang="en" dir="ltr">You’re offline. Connect to the internet to continue learning.</p><form><button type="submit">إعادة المحاولة · Retry</button></form></main></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )));
});
