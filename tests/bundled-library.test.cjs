const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { bucketFor } = require('../scripts/export-web-library.cjs');

function reader(fetch) {
  const source = fs.readFileSync('src/helpers/BundledLibrary.ts', 'utf8')
    .replaceAll('import.meta.env.BASE_URL', '"/test/"');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, fetch, __BUNDLED_LIBRARY_VERSION__: 'version' });
  return exports;
}

test('web reader uses versioned subpaths, retries failed requests and shares a bucket request', async () => {
  let calls = 0;
  const key = 'pt_hymnal';
  const db = reader(async url => {
    calls++;
    assert.equal(url, `/test/library/version/${bucketFor(key)}.json`);
    return { ok: calls > 1, status: 503, json: async () => ({ [key]: [{ id_music: 1 }] }) };
  });
  await assert.rejects(db.readBundledLibrary(key), /503/);
  const values = await Promise.all([db.readBundledLibrary(key), db.readBundledLibrary(key)]);
  assert.equal(values[0][0].id_music, 1);
  assert.equal(calls, 2);
  assert.equal(db.bucketFor(key), bucketFor(key));
});

test('missing content produces an explicit error', async () => {
  const db = reader(async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(db.readBundledLibrary('missing'), /não incluído/);
});

test('exported library contains complete hymn references and readable Bible chapters', {
  skip: !fs.existsSync('tmp/chromeos-library/manifest.json') && 'Run npm run build:chromeos first',
}, async () => {
  const records = {};
  const manifest = JSON.parse(fs.readFileSync('tmp/chromeos-library/manifest.json'));
  const db = reader(async url => {
    const name = url.split('/').pop();
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(`tmp/chromeos-library/${name}`)) };
  });
  for (const bucket of manifest.buckets) {
    const data = JSON.parse(fs.readFileSync(`tmp/chromeos-library/${bucket}.json`));
    for (const key of Object.keys(data)) assert.equal(db.bucketFor(key), bucket);
    Object.assign(records, data);
  }
  assert.equal(Object.keys(records).length, manifest.records);
  assert.ok(records.pt_musics.length > 1000);
  assert.ok(records.pt_categories.length > 0);
  for (const name of ['pt_hymnal', 'pt_hymnal_1996']) {
    const hymns = await db.readBundledLibrary(name);
    assert.ok(hymns.length > 500);
    for (const hymn of hymns) {
      const song = records[`music_${hymn.id_music}`];
      assert.ok(song, `Missing song ${hymn.id_music}`);
      assert.ok(song.lyric.length > 0, `Missing lyrics ${hymn.id_music}`);
    }
  }
  for (const version of records.pt_bible_version) {
    for (const book of records.pt_bible_book) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        assert.ok(records[`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`]);
      }
    }
  }
  const firstVersion = records.pt_bible_version[0].id_bible_version;
  const firstBook = records.pt_bible_book[0].id_bible_book;
  const verses = await db.readBundledLibrary(`bible_${firstVersion}_${firstBook}_1`);
  assert.ok(Object.keys(verses).length > 0);
});
