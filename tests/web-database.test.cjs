const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

function runtime(fail = false) {
  const entries = new Map();
  const caches = { async open() {
    if (fail) throw new Error('storage unavailable');
    return {
      async put(url, response) { entries.set(url, await response.text()); },
      async match(url) { return entries.has(url) ? new Response(entries.get(url)) : undefined; },
    };
  } };
  return loadTs('src/helpers/WebDatabase.ts', {}, { caches, Response, console: { warn() {} } });
}

test('persists parsed data and isolates libraries by source URL', async () => {
  const db = runtime();
  await db.saveWebDatabase('https://first.example/music_1', { name: 'Hino', slides: [1, 2] });
  const data = await db.readWebDatabase('https://first.example/music_1');
  assert.deepEqual(data, { name: 'Hino', slides: [1, 2] });
  assert.equal(await db.readWebDatabase('https://second.example/music_1'), null);
});

test('storage failure does not prevent online use', async () => {
  const db = runtime(true);
  await assert.doesNotReject(db.saveWebDatabase('https://first.example/music_1', {}));
  assert.equal(await db.readWebDatabase('https://first.example/music_1'), null);
});

test('corrupted cached JSON is ignored', async () => {
  const db = loadTs('src/helpers/WebDatabase.ts', {}, {
    caches: { open: async () => ({ match: async () => new Response('<html>error</html>') }) }, Response,
  });
  assert.equal(await db.readWebDatabase('https://first.example/music_1'), null);
});
