import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise both real components' handlers with a deterministic hook/JSX harness.
// Hidden answers must not exist in the rendered tree, including accessibility text.
const turns = [
  { speakerAr: 'أ', speakerEn: 'A', amharic: 'ሰላም', arabic: 'مرحباً', transliteration: 'سَلام' },
  { speakerAr: 'ب', speakerEn: 'B', amharic: 'ደህና', arabic: 'بخير', transliteration: 'دِهنا' },
  { speakerAr: 'ب', speakerEn: 'B', amharic: 'አንተ', arabic: 'وأنت', transliteration: 'أنتَ' },
  { speakerAr: 'أ', speakerEn: 'A', amharic: 'እሺ', arabic: 'حسناً', transliteration: 'إشّي' },
];

function mount(mobile, lang = 'ar') {
  const file = mobile ? '../../hudhud-mobile/components/ConversationPractice.tsx' : '../src/components/conversation-card.tsx';
  const slots = [];
  let cursor = 0, tree, showPronunciation = true;
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: {
      useId: () => 'reply',
      useState(initial) {
        const index = cursor++;
        if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
        return [slots[index].value, update => {
          slots[index].value = typeof update === 'function' ? update(slots[index].value) : update;
        }];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-native': { Pressable: 'Pressable', View: 'View' },
    '@/components/LearningUI': { Card: 'Card', Txt: 'Txt', styles: {} },
    '@/hooks/useColors': { useColors: () => ({}) },
    '@/components/bits': { Am: 'Am', Card: 'Card' },
    '@/components/pronunciation-note': { PronunciationNote: 'PronunciationNote' },
    '@/lib/app': { useApp: () => ({ lang, t: (ar, en) => lang === 'ar' ? ar : en }) },
    '@/lib/utils': { cn: (...values) => values.join(' ') },
  };
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require: name => {
    assert.ok(imports[name], `Unexpected runtime import: ${name}`);
    return imports[name];
  } });
  const component = mobile ? exports.ConversationPractice : exports.ConversationCard;
  function render() { cursor = 0; tree = component({ turns, showPronunciation }); }
  function nodes(value) {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    return [value, ...nodes(value.props?.children)];
  }
  function find(id) {
    return nodes(tree).find(node => (node.props?.testID ?? node.props?.['data-testid']) === id);
  }
  function click(id) {
    const node = find(id);
    assert.ok(node, `Missing control: ${id}`);
    (node.props.onClick ?? node.props.onPress)();
    render();
  }
  function content(index, visible, pronunciation = visible) {
    const text = JSON.stringify(find(`dialogue-turn-${index}`));
    for (const field of ['amharic', 'arabic']) assert.equal(text.includes(turns[index][field]), visible, `${field} turn ${index}`);
    assert.equal(text.includes(turns[index].transliteration), pronunciation, `pronunciation turn ${index}`);
  }
  render();
  return { find, click, content, hints(value) {
    if (mobile) { showPronunciation = value; render(); }
    else if (slots[0].value !== value) click('button-toggle-dialogue-pronunciation');
  } };
}

for (const [name, mobile, lang] of [['Arabic web', false, 'ar'], ['English web', false, 'en'], ['mobile', true, 'ar']]) {
  test(`${name}: either role, independent replies, reset, hints and read-all`, () => {
    const ui = mount(mobile, lang);
    turns.forEach((_, i) => ui.content(i, true));
    ui.click('button-practise-speaker-0');
    ui.content(0, false); ui.content(3, false); ui.content(1, true);
    const button = ui.find('button-reveal-dialogue-0');
    assert.equal(mobile ? button.props.accessibilityRole : button.type, 'button');
    assert.equal(mobile ? button.props.accessibilityState.expanded : button.props['aria-expanded'], false);
    ui.click('button-reveal-dialogue-0');
    ui.content(0, true); ui.content(3, false);
    ui.hints(false);
    ui.content(0, true, false); ui.content(1, true, false);
    ui.hints(true);
    ui.content(3, false); // Hint toggles cannot disclose a hidden reply.
    ui.click('button-reveal-dialogue-0');
    ui.content(0, false);
    ui.click('button-reveal-dialogue-3');
    ui.click('button-reset-dialogue');
    ui.content(0, false); ui.content(3, false);
    ui.click('button-practise-speaker-1');
    ui.content(0, true); ui.content(1, false); ui.content(2, false);
    ui.click('button-reveal-dialogue-1');
    ui.content(1, true); ui.content(2, false); // Consecutive turns use speaker identity, not parity.
    ui.click('button-practise-speaker-0');
    ui.click('button-practise-speaker-1');
    ui.content(1, false); // Role switching clears previous reveals.
    ui.click('button-dialogue-read-all');
    turns.forEach((_, i) => ui.content(i, true));
    assert.equal(ui.find('button-reset-dialogue'), undefined);
  });
}
