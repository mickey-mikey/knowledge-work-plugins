const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const html = readFileSync(join(__dirname, '../skills/dashboard.html'), 'utf8');
const themeScript = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)[1];
const storageKey = 'productivity-theme';

function dashboard({ dark = false, saved = null, blockRead = false, blockWrite = false } = {}) {
  const documentListeners = {};
  const selectorListeners = {};
  const mediaListeners = {};
  const writes = [];
  const root = { dataset: {} };
  const selector = {
    value: 'system',
    addEventListener: (name, handler) => { selectorListeners[name] = handler; },
  };
  const media = {
    matches: dark,
    addEventListener: (name, handler) => { mediaListeners[name] = handler; },
  };
  runInNewContext(themeScript, {
    window: { matchMedia: (query) => {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return media;
    } },
    document: {
      documentElement: root,
      addEventListener: (name, handler) => { documentListeners[name] = handler; },
      getElementById: (id) => {
        assert.equal(id, 'themeSelect');
        return selector;
      },
    },
    localStorage: {
      getItem: (key) => {
        assert.equal(key, storageKey);
        if (blockRead) throw new Error('Storage is blocked');
        return saved;
      },
      setItem: (key, value) => {
        if (blockWrite) throw new Error('Storage is blocked');
        writes.push({ key, value });
      },
    },
  });
  return {
    root, selector, writes,
    ready: () => documentListeners.DOMContentLoaded(),
    select: (value) => { selector.value = value; selectorListeners.change(); },
    system: (dark) => { media.matches = dark; mediaListeners.change(); },
  };
}

test('theme initializes before styles and before the selector is available', () => {
  assert.ok(html.indexOf('id="theme-init"') < html.indexOf('<style>'));
  const page = dashboard({ dark: true });
  assert.equal(page.root.dataset.theme, 'dark');
  assert.deepEqual(page.writes, []);
});

for (const dark of [false, true]) {
  test(`System defaults to the ${dark ? 'dark' : 'light'} device theme and tracks changes`, () => {
    const page = dashboard({ dark });
    page.ready();
    assert.equal(page.selector.value, 'system');
    assert.equal(page.root.dataset.theme, dark ? 'dark' : 'light');
    page.system(!dark);
    assert.equal(page.root.dataset.theme, dark ? 'light' : 'dark');
    assert.deepEqual(page.writes, []);
  });
}

for (const saved of ['light', 'dark']) {
  test(`saved ${saved} choice overrides the device and survives device changes`, () => {
    const page = dashboard({ dark: saved === 'light', saved });
    page.ready();
    assert.equal(page.selector.value, saved);
    assert.equal(page.root.dataset.theme, saved);
    page.system(true);
    page.system(false);
    assert.equal(page.root.dataset.theme, saved);
  });
}

test('manual choices are persisted and restored on reload', () => {
  const page = dashboard();
  page.ready();
  for (const choice of ['dark', 'light', 'system']) {
    page.select(choice);
    assert.deepEqual(page.writes.at(-1), { key: storageKey, value: choice });
    const reloaded = dashboard({ dark: true, saved: page.writes.at(-1).value });
    reloaded.ready();
    assert.equal(reloaded.selector.value, choice);
    assert.equal(reloaded.root.dataset.theme, choice === 'system' ? 'dark' : choice);
  }
});

test('returning to System uses the current device setting', () => {
  const page = dashboard({ saved: 'light' });
  page.ready();
  page.system(true);
  assert.equal(page.root.dataset.theme, 'light');
  page.select('system');
  assert.equal(page.root.dataset.theme, 'dark');
  page.system(false);
  assert.equal(page.root.dataset.theme, 'light');
});

test('invalid stored values fall back to System', () => {
  const page = dashboard({ dark: true, saved: 'invalid' });
  page.ready();
  assert.equal(page.selector.value, 'system');
  assert.equal(page.root.dataset.theme, 'dark');
});

test('blocked storage does not prevent initialization or manual switching', () => {
  const page = dashboard({ dark: true, blockRead: true, blockWrite: true });
  page.ready();
  assert.equal(page.root.dataset.theme, 'dark');
  page.select('light');
  assert.equal(page.root.dataset.theme, 'light');
  page.select('system');
  page.system(false);
  assert.equal(page.root.dataset.theme, 'light');
});

test('selector has a visible label and native keyboard-accessible options', () => {
  assert.match(html, /<label[^>]+for="themeSelect"/);
  assert.match(html, /<select id="themeSelect">/);
  for (const mode of ['system', 'light', 'dark']) {
    assert.match(html, new RegExp(`<option value="${mode}">`));
  }
  assert.match(html, /select:focus-visible/);
  assert.match(html, /:root\[data-theme="dark"\]\s*\{\s*color-scheme: dark;/);
});
