const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { zipSync, unzipSync, strToU8, strFromU8 } = require('fflate');

function installer(entries) {
  const source = fs.readFileSync('electron/main.ts', 'utf8');
  const start = source.indexOf('ipcMain.handle("download-database"');
  const end = source.indexOf('function buildApiUrl(', start);
  const files = new Map();
  const progress = [];
  let install;
  vm.runInNewContext(source.slice(start, end), {
    ipcMain: { handle: (_channel, handler) => { install = handler; } },
    normalizeDatabaseLanguage: lang => lang,
    getDatabaseSourceLanguage: lang => lang === 'en' ? 'pt' : lang,
    net: { fetch: async url => {
      assert.equal(url, 'https://api.louvorja.workers.dev/db/bundle');
      return { ok: true, arrayBuffer: async () => zipSync(entries) };
    } },
    unzipSync, strFromU8, Uint8Array,
    writeLocalDbFile: async (key, data) => files.set(key, data),
    writeFirstBootErrorLog() {},
  });
  return { files, run: lang => install({ sender: { send: (_channel, value) => progress.push(value.progress) } }, lang), progress };
}
function catalog() {
  return Object.fromEntries(['categories', 'musics', 'bible_book', 'bible_version'].map(key =>
    ['pt_' + key + '.json', strToU8(JSON.stringify([{ url_music: 'https://files.louvorja.com.br/musics/pt/song.mp3' }]))]));
}
test('Workers ZIP installs local JSON and preserves offline media paths', async () => {
  const app = installer(catalog());
  const result = await app.run('pt');
  assert.equal(result.ok, true);
  assert.equal(result.installed, true);
  assert.equal(app.files.get('pt_musics')[0].url_music, '/musics/pt/song.mp3');
  assert.equal(app.progress.at(-1), 100);
});
test('Workers ZIP maps Portuguese content for English installations', async () => {
  const app = installer(catalog());
  assert.equal((await app.run('en')).ok, true);
  assert.equal(app.files.has('en_musics'), true);
});
test('incomplete Workers ZIP fails before changing local data', async () => {
  const entries = catalog();
  delete entries['pt_categories.json'];
  const app = installer(entries);
  assert.equal((await app.run('pt')).ok, false);
  assert.equal(app.files.size, 0);
});
