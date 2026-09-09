const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function storage() {
  const entries = new Map();
  return {
    get length() { return entries.size; },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}

function loadHelper(name, globals = {}, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/helpers', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source.replaceAll('import.meta.env', '({})'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => dependencies[id] || (id === '@/helpers/AudioFade' ? { cancelFade() {} } : {}),
    ...globals,
  });
  return exports.default;
}

test('session cleanup preserves local data and unrelated session keys', () => {
  const localStorage = storage();
  const sessionStorage = storage();
  localStorage.setItem('db:a', 'local');
  sessionStorage.setItem('db:a', 'cached');
  sessionStorage.setItem('db:b', 'cached');
  sessionStorage.setItem('settings', 'keep');
  loadHelper('Storage', { localStorage, sessionStorage }).removeAll('db', 'session');
  assert.equal(localStorage.getItem('db:a'), 'local');
  assert.equal(sessionStorage.length, 1);
  assert.equal(sessionStorage.getItem('settings'), 'keep');
});

function database(sessionStorage, data) {
  return loadHelper('Database', {
    sessionStorage,
    window: { electronAPI: { isElectron: true, getLocalDb: async () => data } },
  }, {
    '@/helpers/Storage': { get: (key) => JSON.parse(sessionStorage.getItem(key)) },
    '@/helpers/Dev': { write() {} },
    '@/helpers/Alert': { error() { assert.fail('Valid local data must remain available'); } },
  });
}

test('cache quota failure does not discard valid local data', async () => {
  const cache = storage();
  cache.setItem = () => { throw new Error('QuotaExceededError'); };
  const data = { name: 'Song' };
  assert.equal(await database(cache, data).get('music_1'), data);
});

test('disabled session storage does not block local data', async () => {
  const cache = storage();
  cache.getItem = () => { throw new Error('SecurityError'); };
  const data = { name: 'Song' };
  assert.equal(await database(cache, data).get('music_1'), data);
});

test('database cache is bounded without deleting unrelated settings', async () => {
  const cache = storage();
  cache.setItem('settings', 'keep');
  cache.setItem('db:old', JSON.stringify('a'.repeat(1500000)));
  const data = { content: 'b'.repeat(1000000) };
  assert.equal(await database(cache, data).get('music_1'), data);
  assert.equal(cache.getItem('db:old'), null);
  assert.equal(cache.getItem('settings'), 'keep');
  assert.deepEqual(JSON.parse(cache.getItem('db:music_1')), data);
});

test('oversized database is usable without being cached', async () => {
  const cache = storage();
  const data = { content: 'a'.repeat(3 * 1024 * 1024) };
  assert.equal(await database(cache, data).get('music_1'), data);
  assert.equal(cache.length, 0);
});

test('stopping media releases both audio sources without creating elements', () => {
  const calls = [];
  const audio = (id) => ({
    pause: () => calls.push(`${id}:pause`),
    removeAttribute: (name) => calls.push(`${id}:remove:${name}`),
    load: () => calls.push(`${id}:load`),
  });
  const elements = { __audio_a: audio('a'), __audio_b: audio('b') };
  const media = loadHelper('Media', {
    document: { getElementById: (id) => elements[id] },
  }, { '@/helpers/AppData': { set() {} } });
  media.stopAudio();
  assert.deepEqual(calls, ['a:pause', 'a:remove:src', 'a:load', 'b:pause', 'b:remove:src', 'b:load']);
  delete elements.__audio_a;
  delete elements.__audio_b;
  media.stopAudio();
});
