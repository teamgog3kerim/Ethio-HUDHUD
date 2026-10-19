import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const bootstrap = source('../public/analytics-privacy.js');

function browser({ values = new Map(), navigator = {}, blocked = false } = {}) {
  const listeners = new Map();
  const window = {
    navigator,
    localStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return values.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('blocked'); values.set(key, value); },
      removeItem(key) { if (blocked) throw Error('blocked'); values.delete(key); },
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent: event => listeners.get(event.type)?.(event),
  };
  vm.runInNewContext(bootstrap, { window, Event });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source('../src/lib/analytics.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { window, exports });
  return { window, values, privacy: window.hudhudAnalyticsPrivacy, ...exports };
}

test('choice persists through reloads and gates both events and tracker automatic sends', () => {
  const app = browser();
  let events = 0, pageviews = 0;
  app.window.umami = { track: () => { events++; } };
  // Umami checks this same localStorage flag before every automatic send.
  const autoPageview = () => {
    if (!app.window.localStorage.getItem('umami.disabled')) pageviews++;
  };
  app.trackEvent('install_prompt_shown'); autoPageview();
  assert.equal(events, 1); assert.equal(pageviews, 1);
  assert.equal(app.setAnalyticsEnabled(false), true);
  app.trackEvent('install_prompt_shown'); autoPageview();
  assert.equal(events, 1); assert.equal(pageviews, 1);
  const reloaded = browser({ values: app.values });
  assert.equal(reloaded.getAnalyticsPrivacy().enabled, false);
  assert.ok(app.values.get('umami.disabled'));
  assert.equal(reloaded.setAnalyticsEnabled(true), true);
  assert.equal(reloaded.values.has('umami.disabled'), false);
  assert.equal(browser({ values: app.values }).getAnalyticsPrivacy().enabled, true);
  assert.equal(events, 1); // No replay or preference-change analytics.
});

test('DNT variants and GPC suppress automatic tracking before app startup', () => {
  for (const navigator of [{ doNotTrack: '1' }, { doNotTrack: 'yes' },
    { msDoNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const app = browser({ navigator });
    assert.equal(app.getAnalyticsPrivacy().reason, 'browser');
    assert.ok(app.values.get('umami.disabled'));
    app.setAnalyticsEnabled(true);
    assert.equal(app.getAnalyticsPrivacy().enabled, false);
    assert.ok(app.values.get('umami.disabled'));
    const refreshed = browser({ values: app.values, navigator });
    assert.equal(refreshed.getAnalyticsPrivacy().enabled, false);
  }
});

test('external tracker opt-outs are never cleared, including when saving fails', () => {
  for (const optOut of ['true', '1', 'false', 'extension']) {
    const app = browser({ values: new Map([['umami.disabled', optOut]]) });
    app.setAnalyticsEnabled(false);
    app.setAnalyticsEnabled(true);
    assert.equal(app.getAnalyticsPrivacy().reason, 'tracker');
    assert.equal(app.values.get('umami.disabled'), optOut);
    app.window.localStorage.setItem = () => { throw Error('quota'); };
    assert.equal(app.setAnalyticsEnabled(false), false);
    assert.equal(app.values.get('umami.disabled'), optOut);
  }
});

test('browser signals do not erase a saved off choice, and temporary owned blocks can clear', () => {
  const app = browser({ navigator: { globalPrivacyControl: true } });
  app.setAnalyticsEnabled(false);
  app.window.navigator = {};
  assert.equal(app.getAnalyticsPrivacy().reason, 'preference');
  app.setAnalyticsEnabled(true);
  assert.equal(app.getAnalyticsPrivacy().enabled, true);
  app.window.navigator = { globalPrivacyControl: true };
  app.window.dispatchEvent(new Event('focus'));
  assert.ok(app.values.get('umami.disabled'));
  app.window.navigator = {};
  app.window.dispatchEvent(new Event('focus'));
  assert.equal(app.values.has('umami.disabled'), false);
});

test('storage changes synchronize another tab before its next automatic pageview', () => {
  const values = new Map();
  const first = browser({ values }), second = browser({ values });
  first.setAnalyticsEnabled(false);
  second.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'hudhud.analytics' }));
  assert.equal(second.getAnalyticsPrivacy().enabled, false);
  assert.ok(values.get('umami.disabled'));
  first.setAnalyticsEnabled(true);
  second.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'hudhud.analytics' }));
  assert.equal(second.getAnalyticsPrivacy().enabled, true);
});

test('blocked storage and quota failures are explicit and suppress custom events', () => {
  const blocked = browser({ blocked: true });
  assert.equal(blocked.getAnalyticsPrivacy().reason, 'storage');
  assert.equal(blocked.setAnalyticsEnabled(false), false);
  let sent = 0;
  blocked.window.umami = { track: () => sent++ };
  blocked.trackEvent('test');
  assert.equal(sent, 0);
  const quota = browser();
  const write = quota.window.localStorage.setItem;
  quota.window.localStorage.setItem = (key, value) => {
    if (key === 'hudhud.analytics') throw Error('quota');
    write(key, value);
  };
  assert.equal(quota.setAnalyticsEnabled(false), false);
  assert.equal(quota.getAnalyticsPrivacy().reason, 'storage');
  assert.ok(quota.values.get('umami.disabled'));
});

test('privacy runs synchronously in the head and never injects or configures a tracker', () => {
  const html = source('../index.html');
  assert.ok(html.indexOf('analytics-privacy.js') < html.indexOf('</head>'));
  assert.match(html, /<script src="%BASE_URL%analytics-privacy\.js"><\/script>/);
  assert.doesNotMatch(bootstrap, /createElement|fetch\(|website-id|identify\(/);
});
