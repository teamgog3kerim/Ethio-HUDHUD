import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
function load(path, globals, imports = {}) {
  const exports = {};
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { ...globals, exports, require(name) {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

function mount(options = {}) {
  const events = [], values = new Map();
  if (options.consent !== null) values.set('hudhud.analytics', options.consent ?? 'on');
  if (options.disabled) values.set('umami.disabled', 'external');
  const navigator = {
    doNotTrack: options.dnt,
    globalPrivacyControl: options.gpc,
    clipboard: { writeText: async () => {
      if (options.copyFails) throw Error('clipboard denied');
    } },
    share: options.noShare ? undefined : async () => {
      if (options.shareFails) throw { name: options.shareFails };
    },
  };
  const window = {
    navigator,
    location: { reload() {} },
    localStorage: {
      getItem: key => { if (options.storageFails) throw Error('blocked'); return values.get(key) ?? null; },
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    },
    addEventListener() {}, dispatchEvent() {},
  };
  if (!options.noTracker) window.umami = { track(name, data) {
    if (options.trackerThrows) throw Error('tracker failed');
    if (options.trackerRejects) return Promise.reject(Error('tracker failed'));
    events.push(JSON.parse(JSON.stringify({ name, ...data })));
  } };
  vm.runInNewContext(read('../public/analytics-privacy.js'), { window, Event });
  const analytics = load('../src/lib/analytics.ts', { window });
  const slots = [];
  let cursor = 0, effects = [], tree;
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: {
      useState(initial) {
        const i = cursor++;
        slots[i] ??= { value: initial };
        return [slots[i].value, value => { slots[i].value = value; }];
      },
      useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useEffect(fn, deps) {
        const i = cursor++;
        if (!slots[i] || deps.some((dep, j) => dep !== slots[i][j])) effects.push(fn);
        slots[i] = deps;
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'lucide-react': Object.fromEntries(['Check', 'Copy', 'Send', 'Share2', 'UserPlus'].map(k => [k, k])),
    '@workspace/api-client-react': {
      INVITE_APP_URL: 'https://example.test',
      INVITE_MESSAGES: Array.from({ length: 4 }, () => ({ ar: 'رسالة', en: 'Template' })),
      getInviteText: i => `Template ${i}`,
      getInviteLinks: () => ({ whatsapp: 'https://wa.me/', telegram: 'https://t.me/share/url' }),
    },
    '@/components/bits': { Btn: 'button', btnClass: () => '' },
    '@/components/ui/dialog': Object.fromEntries(
      ['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map(k => [k, k]),
    ),
    '@/lib/utils': { cn: () => '' },
    '@/lib/app': { useApp: () => ({ t: (ar, en) => en, lang: 'en' }) },
    '@/lib/analytics': analytics,
  };
  const { InviteFriend } = load('../src/components/invite-friend.tsx', {
    navigator, setTimeout: fn => fn(), DOMException,
    document: { querySelector: () => ({ focus() {} }) },
  }, imports);
  function render() {
    cursor = 0;
    tree = InviteFriend({ source: options.source ?? 'dashboard' });
    const pending = effects; effects = [];
    pending.forEach(fn => fn());
  }
  function find(id, node) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.['data-testid'] === id) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(id, child);
      if (found) return found;
    }
  }
  render(); render();
  return {
    events, analytics, window,
    async click(id) { await find(id, tree).props.onClick(); render(); render(); },
    edit(value) { find('input-invite-message', tree).props.onChange({ target: { value } }); render(); },
    key(id, key) {
      find(id, tree).props.onKeyDown({ key, preventDefault() {} });
      render(); render();
    },
    status: () => find('invite-status', tree).props.children,
  };
}

async function inviteFlow(app) {
  await app.click('button-invite-friend');
  await app.click('invite-template-2');
  app.edit('PRIVATE draft email@example.test recipient-123 https://session.test/?token=secret');
  await app.click('button-copy-invite');
  await app.click('link-invite-whatsapp');
  await app.click('link-invite-telegram');
  await app.click('button-share-invite');
}

test('real invitation handlers emit only fixed categories, never draft or URL data', async () => {
  const app = mount({ source: 'account' });
  await inviteFlow(app);
  assert.deepEqual(app.events, [
    { name: 'invite_opened', source: 'account' },
    { name: 'invite_template_selected', source: 'account', template: 'template_3' },
    { name: 'invite_copy_succeeded', source: 'account', method: 'clipboard' },
    { name: 'invite_share_handoff', source: 'account', method: 'whatsapp' },
    { name: 'invite_share_handoff', source: 'account', method: 'telegram' },
    { name: 'invite_share_handoff', source: 'account', method: 'system_share' },
  ]);
  await app.click('button-invite-friend');
  assert.equal(app.events.filter(e => e.name === 'invite_opened').length, 1);
});

for (const [name, options] of Object.entries({
  'consent off': { consent: 'off' },
  'no explicit consent': { consent: null },
  'no tracker': { noTracker: true },
  DNT: { dnt: '1' },
  'legacy DNT': { dnt: 'yes' },
  GPC: { gpc: true },
  'external tracker opt-out': { disabled: true },
  'unavailable storage': { storageFails: true },
  'throwing tracker': { trackerThrows: true },
  'rejecting tracker': { trackerRejects: true },
})) {
  test(`${name}: invitations work without emitting events`, async () => {
    const app = mount(options);
    await inviteFlow(app);
    assert.equal(app.events.length, 0);
    assert.equal(app.status(), 'The share menu was opened.');
  });
}

test('failed copy, manual fallback, unavailable share and cancelled/failed share are not successes', async () => {
  for (const options of [
    { noShare: true }, { shareFails: 'AbortError' }, { shareFails: 'NotAllowedError' },
  ]) {
    const app = mount({ ...options, copyFails: true });
    await app.click('button-copy-invite');
    assert.match(app.status(), /Could not copy/);
    await app.click('button-share-invite');
    assert.equal(app.events.length, 0);
  }
});

test('consent is checked at each interaction; skipped events are never replayed', async () => {
  const app = mount({ consent: 'off' });
  await app.click('button-invite-friend');
  app.window.hudhudAnalyticsPrivacy.setEnabled(true);
  await app.click('button-copy-invite');
  app.window.hudhudAnalyticsPrivacy.setEnabled(false);
  await app.click('link-invite-whatsapp');
  assert.deepEqual(app.events, [
    { name: 'invite_copy_succeeded', source: 'dashboard', method: 'clipboard' },
  ]);
});

test('all template categories work for explicit selection, including keyboard selection', async () => {
  const app = mount();
  await app.click('button-invite-friend');
  for (let i = 0; i < 4; i++) await app.click(`invite-template-${i}`);
  app.key('invite-template-3', 'Home');
  app.key('invite-template-0', 'ArrowRight');
  assert.deepEqual(app.events.slice(1).map(e => e.template),
    ['template_1', 'template_2', 'template_3', 'template_4', 'template_1', 'template_2']);
});

test('runtime whitelist rejects unknown categories and drops extra properties', () => {
  const app = mount();
  app.analytics.trackInviteEvent('https://private.test', { action: 'opened' });
  app.analytics.trackInviteEvent('dashboard', { action: 'template_selected', template: 'private draft' });
  app.analytics.trackInviteEvent('dashboard', { action: 'share_handoff', method: 'recipient-id' });
  app.analytics.trackInviteEvent('dashboard', { action: 'delivered' });
  app.analytics.trackInviteEvent('dashboard', { action: 'opened', draft: 'private' });
  assert.deepEqual(app.events, [{ name: 'invite_opened', source: 'dashboard' }]);
});

test('server rendering without a window safely skips invitation analytics', () => {
  const analytics = load('../src/lib/analytics.ts', {});
  assert.doesNotThrow(() => analytics.trackInviteEvent('dashboard', { action: 'opened' }));
});

test('both languages disclose categorical invitation measurement next to the consent control', () => {
  for (const lang of ['ar', 'en']) {
    const jsx = (type, props) => ({ type, props });
    const { AnalyticsPreference } = load('../src/components/analytics-preference.tsx', {}, {
      react: {
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
        useEffect() {},
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/lib/app': { useApp: () => ({ t: (ar, en) => lang === 'ar' ? ar : en }) },
      '@/lib/analytics': {
        getAnalyticsPrivacy: () => ({ enabled: false, reason: 'preference' }),
        hasAnalyticsOptIn: () => false,
        setAnalyticsEnabled() {},
      },
    });
    const nodes = node => !node || typeof node !== 'object' ? []
      : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
    const rendered = nodes(AnalyticsPreference());
    const disclosure = rendered.find(node => node.props?.id === 'analytics-description');
    const checkbox = rendered.find(node => node.props?.['data-testid'] === 'switch-analytics');
    assert.ok(checkbox.props['aria-describedby'].includes(disclosure.props.id));
    assert.equal(checkbox.props.checked, false);
    const required = lang === 'ar'
      ? ['صراحةً', 'فتح الدعوة', 'اختيار القالب', 'نجاح النسخ', 'تطبيق مشاركة', 'بفئات ثابتة',
        'لا نرسل نصوص الدعوات', 'معرّفات المستلمين', 'روابط الجلسات', 'لا يعني تسليم رسالة']
      : ['explicitly enable', 'invitation opening', 'template selection', 'successful copying',
        'handoff to a sharing app', 'fixed categories', 'do not send invitation drafts',
        'recipient or learner identifiers', 'session URLs', 'does not mean a delivered message'];
    for (const phrase of required) assert.ok(disclosure.props.children.includes(phrase), `${lang}: ${phrase}`);
  }
});

test('first-visit consent control is unchecked and can directly opt in to invitation events', async () => {
  const app = mount({ consent: null });
  const jsx = (type, props) => ({ type, props });
  const { AnalyticsPreference } = load('../src/components/analytics-preference.tsx', { window: app.window }, {
    react: {
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/app': { useApp: () => ({ t: (ar, en) => en }) },
    '@/lib/analytics': app.analytics,
  });
  const nodes = node => !node || typeof node !== 'object' ? []
    : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const render = () => nodes(AnalyticsPreference());
  let rendered = render();
  const checkbox = rendered.find(node => node.props?.['data-testid'] === 'switch-analytics');
  assert.equal(app.analytics.getAnalyticsPrivacy().enabled, true, 'legacy pageview default is preserved');
  assert.equal(checkbox.props.checked, false);
  assert.equal(checkbox.props.disabled, false);
  assert.match(rendered.find(node => node.props?.id === 'analytics-status').props.children,
    /Invitation measurement is off until you enable analytics here/);
  await app.click('button-invite-friend');
  assert.equal(app.events.length, 0);
  checkbox.props.onChange({ target: { checked: true } });
  assert.equal(app.analytics.hasAnalyticsOptIn(), true);
  rendered = render();
  assert.equal(rendered.find(node => node.props?.['data-testid'] === 'switch-analytics').props.checked, true);
  await app.click('button-copy-invite');
  assert.deepEqual(app.events, [{ name: 'invite_copy_succeeded', source: 'dashboard', method: 'clipboard' }]);
});
