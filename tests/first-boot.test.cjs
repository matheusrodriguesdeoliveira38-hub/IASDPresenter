const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

function runtime(language = 'pt', bundled = true, online = false) {
  const files = new Map();
  const calls = [];
  const required = ['categories', 'musics', 'bible_book', 'bible_version'].map(key => `${language}_${key}`);
  const install = () => required.forEach(key => files.set(key, []));
  const api = {
    isElectron: true,
    getLocalDb: async key => files.get(key),
    hasLocalDbFiles: async keys => keys.every(key => files.has(key)),
    saveLocalDb: async (key, value) => { files.set(key, value); return true; },
    onExtractProgress: () => () => {},
    extractBundledDatabase: async () => {
      calls.push('bundled');
      if (bundled) install();
      return { ok: bundled };
    },
    downloadDatabase: async () => { calls.push('download'); return { ok: true }; },
    extractLocalDb: async () => { calls.push('extract'); install(); return { ok: true }; },
  };
  const component = loadTs('src/layout/FirstBootLoader.vue', {
    'vue-country-flag-next': {},
  }, {
    window: { electronAPI: api, location: { reload: () => calls.push('reload') } },
    navigator: { onLine: online },
    setTimeout: fn => fn(),
    fetch: () => assert.fail('Startup must not request the unused remote config'),
  }).default;
  const context = {
    ...component.methods,
    selectedLanguage: language,
    databaseSourceLanguage: language,
    copy: {},
    $emit() {},
  };
  context.requiredFiles = component.computed.requiredFiles.call(context);
  return { context, files, calls, component, required };
}

test('first install completes offline using the bundled catalog without remote config', async () => {
  const { context, files, calls } = runtime();
  await context.runFirstBootSync();
  assert.equal(context.hasError, undefined);
  assert.equal(files.get('system_first_boot_complete').complete, true);
  assert.deepEqual(calls, ['bundled', 'reload']);
  assert.equal(files.has('config'), false);
});

test('download fallback completes without requesting remote config', async () => {
  const { context, files, calls } = runtime('pt', false, true);
  await context.runFirstBootSync();
  assert.equal(context.hasError, undefined);
  assert.equal(files.get('system_first_boot_complete').complete, true);
  assert.deepEqual(calls, ['bundled', 'download', 'extract', 'reload']);
});

test('an installed catalog does not require the legacy config file', async () => {
  const { context, files, required } = runtime();
  required.forEach(key => files.set(key, []));
  files.set('system_first_boot_complete', { complete: true });
  files.set('system_database_language', { language: 'pt', sourceLanguage: 'pt' });
  context.runFirstBootSync = () => assert.fail('Valid installations must not synchronize');
  await context.checkFirstBoot();
  assert.equal(context.isOpen, false);
});

test('an incomplete catalog cannot be marked complete', async () => {
  const { context, files } = runtime();
  await assert.rejects(context.finishFirstBootSync(), /database is incomplete/);
  assert.equal(files.has('system_first_boot_complete'), false);
});
