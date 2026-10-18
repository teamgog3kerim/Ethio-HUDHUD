import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
function load(code, globals, imports = {}) {
  const exports = {};
  const compiled = ts.transpileModule(code.replaceAll('import.meta.env.BASE_URL', '"/"'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, require: id => imports[id] ?? require(id), ...globals,
  });
  return exports;
}

function analytics(window) {
  return load(source('../src/lib/analytics.ts'), { window }).trackEvent;
}

test('tracker absent, blocked storage, throws and rejected requests never break the app', async () => {
  analytics(undefined)('test');
  const window = { navigator: {}, localStorage: { getItem: () => null } };
  analytics(window)('test');
  window.umami = { track: () => { throw Error('offline'); } };
  analytics(window)('test');
  window.umami.track = () => Promise.reject(Error('offline'));
  analytics(window)('test');
  window.localStorage.getItem = () => { throw Error('blocked'); };
  analytics(window)('test');
  await new Promise(resolve => setImmediate(resolve));
});

test('privacy signals and tracker opt-out suppress custom events', () => {
  let calls = 0;
  const window = {
    navigator: {}, localStorage: { getItem: () => null },
    umami: { track: () => { calls++; } },
  };
  const track = analytics(window);
  track('install_prompt_shown', { platform: 'ios' });
  assert.equal(calls, 1);
  window.navigator.doNotTrack = '1';
  track('test');
  window.navigator = { globalPrivacyControl: true };
  track('test');
  window.navigator = {};
  window.localStorage.getItem = () => '1';
  track('test');
  assert.equal(calls, 1);
});

// Deterministic hook harness: exercise the component's event handlers/effects
// without a browser, real tracker, learner session, or additional dependencies.
function mount(platform = 'android', { inApp = false, standalone = false, cooldown = false } = {}) {
  const slots = [], pending = [], listeners = new Map(), timers = new Map(), events = [];
  let cursor = 0, dirty = false, tree, displayChange;
  const media = {
    matches: standalone,
    addEventListener: (_, fn) => { displayChange = fn; },
    removeEventListener: () => {},
  };
  const window = {
    matchMedia: () => media,
    localStorage: { getItem: () => cooldown ? String(Date.now()) : null, setItem: () => {} },
    setTimeout: fn => { timers.set(fn, fn); return fn; },
    clearTimeout: key => timers.delete(key),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, value => { slots[index].value = value; dirty = true; }];
    },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) {
        const old = slots[index];
        slots[index] = { deps };
        pending.push(() => { old?.cleanup?.(); slots[index].cleanup = fn(); });
      }
    },
  };
  const { InstallPrompt } = load(source('../src/components/install-prompt.tsx'), {
    window, navigator: { userAgent: 'test', platform: '', maxTouchPoints: 1 },
    localStorage: window.localStorage,
  }, {
    react: hooks,
    'lucide-react': {},
    '@/components/bits': { Btn: 'button' },
    '@/components/ui/dialog': { Dialog: 'dialog', DialogContent: 'content' },
    '@/lib/app': { useApp: () => ({ t: (_, en) => en, lang: 'en' }) },
    '@/lib/install-platform': { getMobilePlatform: () => platform, isInAppBrowser: () => inApp },
    '@/lib/analytics': { trackEvent: (name, data) => events.push({ name, ...data }) },
  });
  function render() {
    do {
      dirty = false; cursor = 0; tree = InstallPrompt();
      while (pending.length) pending.shift()();
    } while (dirty);
  }
  function find(node, id) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.['data-testid'] === id) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, id);
      if (found) return found;
    }
  }
  render();
  return {
    events, render,
    show() { for (const fn of timers.values()) fn(); timers.clear(); render(); },
    emit(name, event = {}) { listeners.get(name)?.(event); render(); },
    display() { media.matches = true; displayChange?.(); render(); },
    dismiss() { find(tree, 'button-install-later').props.onClick(); render(); },
    async install(outcome, fail = false) {
      this.emit('beforeinstallprompt', {
        preventDefault() {}, prompt: async () => { if (fail) throw Error('cancelled'); },
        userChoice: Promise.resolve({ outcome }),
      });
      find(tree, 'button-install-app').props.onClick();
      await new Promise(resolve => setImmediate(resolve));
      render();
    },
  };
}

const count = (app, name) => app.events.filter(event => event.name === name).length;

test('prompt/instructions count once across rerenders; explicit close counts dismissal', () => {
  const app = mount('ios');
  app.show(); app.render(); app.render();
  assert.equal(count(app, 'install_prompt_shown'), 1);
  assert.equal(count(app, 'install_instructions_shown'), 1);
  assert.equal(app.events[1].instruction_type, 'ios_share_menu');
  app.dismiss();
  assert.equal(count(app, 'install_prompt_dismissed'), 1);
  app.display();
  assert.equal(count(app, 'install_completed'), 0);
});

test('browser acceptance does not count completion or website prompt dismissal', async () => {
  const app = mount();
  app.emit('beforeinstallprompt', { preventDefault() {} });
  app.show();
  await app.install('accepted');
  assert.equal(count(app, 'install_browser_response'), 1);
  assert.equal(app.events.find(event => event.name === 'install_browser_response').outcome, 'accepted');
  assert.equal(count(app, 'install_prompt_dismissed'), 0);
  assert.equal(count(app, 'install_completed'), 0);
  app.display();
  app.emit('appinstalled'); app.emit('appinstalled');
  assert.equal(count(app, 'install_completed'), 1);
  assert.equal(app.events.at(-1).source, 'appinstalled');
});

test('browser dismissal shows instructions without inventing a website dismissal', async () => {
  const app = mount();
  app.emit('beforeinstallprompt', { preventDefault() {} });
  app.show();
  await app.install('dismissed');
  assert.equal(app.events.find(event => event.name === 'install_browser_response').outcome, 'dismissed');
  assert.equal(count(app, 'install_instructions_shown'), 1);
  assert.equal(count(app, 'install_prompt_dismissed'), 0);
  assert.equal(count(app, 'install_completed'), 0);
});

test('failed browser prompt shows fallback instructions, not a fabricated outcome', async () => {
  const app = mount();
  app.emit('beforeinstallprompt', { preventDefault() {} });
  app.show();
  await app.install('accepted', true);
  assert.equal(count(app, 'install_browser_response'), 0);
  assert.equal(count(app, 'install_instructions_shown'), 1);
});

test('in-app instructions have a fixed category, and unprompted appinstalled is observed', () => {
  const app = mount('ios', { inApp: true });
  app.show();
  assert.equal(app.events[1].instruction_type, 'external_browser');
  const other = mount('android', { cooldown: true });
  other.show();
  assert.equal(other.events.length, 0);
  other.emit('appinstalled');
  assert.equal(count(other, 'install_completed'), 1);
});

test('desktop and already-installed launches emit no install funnel events', () => {
  for (const app of [mount(null), mount('ios', { standalone: true })]) {
    app.show(); app.emit('appinstalled');
    assert.equal(app.events.length, 0);
  }
});
