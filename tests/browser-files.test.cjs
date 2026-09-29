const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

function runtime(shared = new Map(), window = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/helpers/BrowserFiles.ts', 'utf8')
    .replaceAll('import.meta.env.BASE_URL', '"/IASDPresenter/"'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, window, URL, Response, Blob, Uint8Array,
    crypto: require('node:crypto').webcrypto, location: { origin: 'https://app.example' },
    caches: { open: async name => {
      if (!shared.has(name)) shared.set(name, new Map());
      const entries = shared.get(name);
      return { match: async key => entries.get(key)?.clone(),
        put: async (key, response) => entries.set(key, response.clone()) };
    } },
  });
  return exports;
}

test('custom records and PDF files survive a new browser session', async () => {
  const shared = new Map();
  const first = runtime(shared);
  await first.saveUserRecord('music_900001', { name: 'Minha música' });
  const path = await first.storeUserFile(new File(['%PDF-1.7'], 'Culto sábado.pdf', { type: 'application/pdf' }));
  const next = runtime(shared);
  assert.equal((await next.readUserRecord('music_900001')).name, 'Minha música');
  assert.equal(await next.readUserRecord('missing'), null);
  assert.equal(await next.browserFiles.isFileReadable(path), true);
  assert.equal((await next.browserFiles.preparePresentationFile(path)).ok, true);
  assert.equal(Buffer.from((await next.browserFiles.readPresentationFile(path)).data).toString(), '%PDF-1.7');
  await assert.rejects(next.browserFiles.readPresentationFile('missing'), /não encontrado/);
});

test('PowerPoint requires explicit PDF conversion and empty imports are rejected', async () => {
  const api = runtime();
  const path = await api.storeUserFile(new File(['pptx'], 'slides.pptx'));
  const result = await api.browserFiles.preparePresentationFile(path);
  assert.equal(result.ok, false);
  assert.equal(result.needsConversion, true);
  await assert.rejects(api.storeUserFile(new File([], 'empty.pdf')), /vazio/);
});

test('local media URLs remain media rather than external websites', () => {
  const api = loadTs('src/helpers/ExternalMedia.ts', {}, { URL, location: { origin: 'https://app.example' } });
  const path = 'https://app.example/IASDPresenter/user-files/123/video.mp4';
  assert.equal(api.isVideoFile(path), true);
  assert.equal(api.isWebUrl(path), false);
  assert.equal(api.isWebUrl('https://elsewhere.example/user-files/123/video.mp4'), true);
});

test('desktop file operations retain the native implementation', () => {
  const desktop = { openFileDialog() {} };
  assert.equal(runtime(new Map(), { electronAPI: desktop }).default, desktop);
});

test('save cancellation produces no pending write and successful export closes the file', async () => {
  const cancelled = runtime(new Map(), { showSaveFilePicker: async () => { const error = new Error(); error.name = 'AbortError'; throw error; } });
  assert.equal(await cancelled.browserFiles.saveFileDialog({ defaultPath: 'liturgia.json' }), null);
  const writes = [];
  const api = runtime(new Map(), { showSaveFilePicker: async () => ({ createWritable: async () => ({
    write: async text => writes.push(text), close: async () => writes.push('closed'),
  }) }) });
  const path = await api.browserFiles.saveFileDialog({ defaultPath: 'liturgia.json' });
  assert.equal((await api.browserFiles.writeTextFile(path, '{"liturgies":[]}')).ok, true);
  assert.deepEqual(writes, ['{"liturgies":[]}', 'closed']);
});
