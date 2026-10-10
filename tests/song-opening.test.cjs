const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');

test('opening logo follows the selected album and clears when a song has no album', () => {
  const state = new Map();
  const dependencies = {};
  for (const name of ['Dev','AppData','UserData','DateTime','Path','Alert','Modules','Database','History','Performance','Automation','Popup','AudioFade']) dependencies[`@/helpers/${name}`] = {};
  dependencies['@/helpers/AppData'] = { get: key => state.get(key), set: (key, value) => state.set(key, value) };
  dependencies['@/helpers/HymnalPreference'] = loadTs('src/helpers/HymnalPreference.ts', { '@/helpers/UserData': { get: () => null } });
  const media = loadTs('src/helpers/Media.ts', dependencies).default;
  state.set('modules.media.data', { albums: [
    { id_album: 712, name: 'Hinário Adventista', pivot: { track: 321 } },
    { id_album: 900, name: 'Outra coletânea', track: 4 },
  ] });
  media.setAlbumInfo(712);
  assert.equal(state.get('modules.media.config.is_hymnal'), true);
  assert.equal(state.get('modules.media.config.track'), 321);
  media.setAlbumInfo(900);
  assert.equal(state.get('modules.media.config.is_hymnal'), false);
  assert.equal(state.get('modules.media.config.track'), 4);
  state.set('modules.media.data', { albums: [] });
  media.setAlbumInfo(null);
  assert.equal(state.get('modules.media.config.is_hymnal'), false);
  assert.equal(state.get('modules.media.config.track'), 0);
});
