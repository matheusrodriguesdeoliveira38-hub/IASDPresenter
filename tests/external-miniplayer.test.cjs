const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/views/Main.vue', 'utf8');
const start = source.indexOf('    async onExternalMiniPlayerEnded()');
assert.ok(start >= 0);
const end = source.indexOf('    closeAllModules()', start);
assert.ok(end > start);
const ended = vm.runInNewContext('({' + source.slice(start, end) + '})').onExternalMiniPlayerEnded;
function fixture(volume) {
  let finish;
  let exits = 0;
  const state = {
    'modules.external_media.filePath': 'first.mp4',
    'modules.external_media.config.session_id': 'first',
    'modules.external_media.config.volume': volume,
    popup_module: 'external_media',
  };
  const context = {
    $appdata: { get: key => state[key], set: (key, value) => { state[key] = value; } },
    $automation: { restore: () => new Promise(resolve => { finish = resolve; }) },
    $popup: { exit() { exits++; } },
  };
  return { state, context, finish: () => finish(), exits: () => exits };
}
test('old miniplayer completion preserves a replacement, including the same file reopened', async () => {
  for (const path of ['second.mp4', 'first.mp4', '']) {
    const f = fixture(0);
    const pending = ended.call(f.context);
    f.state['modules.external_media.filePath'] = path;
    f.state['modules.external_media.config.session_id'] = 'replacement';
    f.state['modules.external_media.config.is_paused'] = false;
    f.finish();
    await pending;
    assert.equal(f.state['modules.external_media.filePath'], path);
    assert.equal(f.state['modules.external_media.config.is_paused'], false);
    assert.equal(f.state['modules.external_media.config'], undefined);
    assert.equal(f.exits(), 0);
  }
});
test('current miniplayer completion closes projection and preserves zero and nonzero volume', async () => {
  for (const volume of [0, 37, undefined]) {
    const f = fixture(volume);
    const pending = ended.call(f.context);
    f.finish();
    await pending;
    assert.equal(f.state['modules.external_media.filePath'], '');
    assert.equal(f.state['modules.external_media.config'].volume, volume ?? 100);
    assert.equal(f.exits(), 1);
  }
});
