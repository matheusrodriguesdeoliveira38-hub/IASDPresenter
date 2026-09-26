const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
let selected = 'hymnal';
const helpers = loadTs('src/helpers/HymnalPreference.ts', {
  '@/helpers/UserData': { get: () => selected },
});
const album = (id, track) => ({ id_album: id, type: 'hymnal', pivot: { track } });
const current = { name: 'Hino', albums: [album(712, 10)] };
const old = { name: 'Hino', albums: [album(629, 10)] };
const shared = { name: 'Hino comum', albums: [album(712, 20), album(629, 10)] };
const song = { name: 'Cântico', albums: [{ type: 'album' }] };
const { default: quick } = loadTs('src/components/QuickSearchOverlay.vue', {
  '@/helpers/HymnalPreference': helpers,
  '@/helpers/BibleSearch': { normalizeBibleSearchText: value => value.toLowerCase() },
});
function search(query) {
  return Array.from(quick.computed.musicResults.call({
    query, musics: [current, old, shared, song], musicScore: () => 0,
  }));
}
test('text search includes only the selected edition and preserves other songs', () => {
  selected = 'hymnal';
  assert.deepEqual(search('hino'), [current, shared]);
  assert.deepEqual(search('cântico'), [song]);
  selected = 'hymnal_1996';
  assert.deepEqual(search('hino'), [old, shared]);
});
test('number search uses only the selected edition numbering for shared hymns', () => {
  selected = 'hymnal';
  assert.deepEqual(search('10'), [current]);
  assert.deepEqual(search('20'), [shared]);
  selected = 'hymnal_1996';
  assert.deepEqual(search('10'), [old, shared]);
  assert.deepEqual(search('20'), []);
});
