const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

function runtime(fetchImpl) {
  const entries = new Map();
  const cache = {
    match: async key => entries.get(key)?.clone(),
    put: async (key, response) => { entries.set(key, response.clone()); },
    keys: async () => [...entries.keys()].map(url => ({ url })),
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/helpers/WebMedia.ts', 'utf8').replaceAll('import.meta.env.BASE_URL', '"/app/"'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const records = {
    album_1: { url_image: '/covers/a.jpg', musics: [{ id_music: 2 }] },
    music_2: { url_music: '/musics/a.mp3', url_instrumental_music: '/musics/b.mp3', url_image: '/images/a.jpg', lyric: [{ url_image: '/images/a.jpg' }] },
  };
  vm.runInNewContext(code, {
    exports, fetch: fetchImpl, caches: { open: async () => cache }, Response, URL,
    crypto: require('node:crypto').webcrypto, location: { origin: 'https://app.example' },
    require: id => ({
      '@/helpers/Database': { get: async key => records[key] },
      '@/helpers/Path': { file: key => 'https://media.example' + key },
    })[id],
  });
  return { api: exports, entries };
}

test('album downloads include vocals, playback, covers and slides without duplicates', async () => {
  const { api } = runtime();
  const urls = await api.albumMediaFiles(1);
  assert.equal(urls.length, 4);
  assert.ok(urls.includes('https://media.example/musics/b.mp3'));
  await assert.rejects(api.albumMediaFiles(99), /coletânea/);
});

test('download saves complete media and resumes without downloading it twice', async () => {
  let count = 0;
  const { api, entries } = runtime(async () => { count++; return new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }); });
  await api.saveRemoteMedia('https://media.example/a.mp3');
  await api.saveRemoteMedia('https://media.example/a.mp3');
  assert.equal(count, 1);
  assert.equal(await entries.get('https://media.example/a.mp3').text(), 'audio');
});

test('rate limits, partial responses and HTML are not saved as offline media', async () => {
  for (const response of [new Response('rate limit', { status: 429 }), new Response('part', { status: 206 }), new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } })]) {
    const { api, entries } = runtime(async () => response);
    await assert.rejects(api.saveRemoteMedia('https://media.example/a.mp3'));
    assert.equal(entries.size, 0);
  }
});

test('imported media persists with its name and is restored as a playable object URL', async () => {
  const { api } = runtime();
  await api.importLocalMedia(new File(['video'], 'Vídeo teste.mp4', { type: 'video/mp4' }));
  const [file] = await api.listLocalMedia();
  assert.equal(file.name, 'Vídeo teste.mp4');
  const url = await api.localMediaUrl(file.key, file.name);
  const external = loadTs('src/helpers/ExternalMedia.ts');
  assert.equal(external.isVideoFile(url), true);
  assert.equal(external.isWebUrl(url), false);
  URL.revokeObjectURL(url.split('#')[0]);
  await assert.rejects(api.importLocalMedia(new File(['bad'], 'page.html')), /Formato/);
});
