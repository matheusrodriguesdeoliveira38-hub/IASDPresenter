const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');

function button(settings, calls) {
  return loadTs('src/components/buttons/Screen.vue', {
    '@/helpers/UserData': { get: key => settings[key] },
  }, { window: { electronAPI: { getDisplays: async () => [{ id: 1, isPrimary: true }, { id: 2 }, { id: 3 }] } } }).default.methods.popup.bind({
    module: 'external_media', is_selected: true,
    $popup: { exit() { throw new Error('Automatic projection must not toggle off'); }, async syncMonitors(...args) { calls.push(args); } },
    $emit() { throw new Error('Must use the selected monitor'); },
  });
}

test('automatic media projection uses the selected extended monitor with fullscreen enabled', async () => {
  const calls = [];
  const open = button({ 'modules.config.slide_monitor': ['2'], 'modules.config.slide_fullscreen': true }, calls);
  await open(true);
  await open(true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[[2], 'external_media', true, true], [[2], 'external_media', true, true]]);
});

test('independent media monitor preferences override shared preferences', async () => {
  const calls = [];
  await button({
    'modules.config.media_sync_projection_settings': false,
    'modules.config.slide_monitor': [2],
    'modules.config.media_slide_monitor': [3],
    'modules.config.media_slide_fullscreen': false,
  }, calls)(true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[[3], 'external_media', true, false]]);
});

const preferences = loadTs('src/helpers/ProjectionPreferences.ts');
const displays = [{ id: 1, isPrimary: true }, { id: 2 }];
const mediaComponent = (getDisplays = async () => displays) => loadTs('src/modules/core/external_media/interface/Index.vue', {
  '../manifest.json': {}, '@/components/Window.vue': {}, '@/components/buttons/Screen.vue': {},
  '@/helpers/ExternalMedia': {}, '@/helpers/YouTube': {}, '@/helpers/WebMedia': {}, '@/helpers/ProjectionPreferences': preferences,
}, { window: { electronAPI: { getDisplays } } }).default;

function operator(settings, file = 'video.mp4') {
  const calls = [], state = {};
  const context = {
    rawFilePath: file, isVisualMedia: true, isClosing: false, autoProject: true, preferenceRequest: 0, isFullscreen: false,
    $userdata: { get: key => settings[key] },
    $appdata: { set: (key, value) => { state[key] = value; } },
    $nextTick: async () => {},
    $popup: { async syncMonitors(...args) { calls.push(args); }, closeProjection() {} },
  };
  return { context, calls, state };
}

test('operator layout follows the music rules for every fullscreen/disable/minimize combination', async () => {
  for (const fullscreen of [false, true]) for (const disable of [false, true]) for (const minimize of [false, true]) {
    const settings = { 'modules.config.slide_monitor': [2], 'modules.config.slide_fullscreen': fullscreen,
      'modules.config.slide_disable_main_if_extended': disable, 'modules.config.slide_minimize_player': minimize };
    const { context, calls, state } = operator(settings);
    await mediaComponent().methods.projectVisualMediaIfNeeded.call(context);
    const expected = fullscreen && !disable;
    assert.equal(context.isFullscreen, expected);
    assert.equal(state['modules.external_media.minimized'] === true, minimize && !expected);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[[2], 'external_media', true, fullscreen]]);
  }
});

test('links keep operator preview and honor independent settings', async () => {
  for (const file of ['https://youtube.com/watch?v=example', 'https://example.org', 'video.mp4', 'document.pdf']) {
    const { context } = operator({
      'modules.config.slide_disable_main_if_extended': false,
      'modules.config.media_sync_projection_settings': false,
      'modules.config.media_slide_monitor': [2],
      'modules.config.media_slide_fullscreen': true,
      'modules.config.media_slide_disable_main_if_extended': true,
    }, file);
    await mediaComponent().methods.projectVisualMediaIfNeeded.call(context);
    assert.equal(context.isFullscreen, false);
  }
  const videoEl = {};
  assert.equal(mediaComponent().methods.getMediaEl.call({ isVideo: true, isPlayableMedia: true, isProjectionActive: true, $refs: { videoEl } }), videoEl);
});

test('unavailable extended monitor falls back to configured main fullscreen', async () => {
  const { context } = operator({ 'modules.config.slide_monitor': [2] });
  await mediaComponent(async () => [displays[0]]).methods.projectVisualMediaIfNeeded.call(context);
  assert.equal(context.isFullscreen, true);
});

test('disabled auto projection leaves projection windows untouched', async () => {
  const { context, calls } = operator({ 'modules.config.slide_monitor': [2] });
  context.autoProject = false;
  await mediaComponent().methods.projectVisualMediaIfNeeded.call(context);
  assert.equal(calls.length, 0);
  assert.equal(context.isFullscreen, false);
});

test('closing media during display lookup prevents late fullscreen and projection', async () => {
  let resolve;
  const { context, calls } = operator({ 'modules.config.slide_monitor': [2] });
  const promise = mediaComponent(() => new Promise(done => { resolve = done; })).methods.projectVisualMediaIfNeeded.call(context);
  assert.equal(context.isFullscreen, false);
  context.isClosing = true;
  resolve(displays);
  await promise;
  assert.equal(context.isFullscreen, false);
  assert.equal(calls.length, 0);
});

test('a reused projection window adopts the new module metadata', async () => {
  const popup = { monitorId: 2, popupRole: 'projection', popupModule: 'media', popupFullscreen: true, closed: false };
  const state = { popups: [popup], popup_module: 'media' };
  const helper = loadTs('src/helpers/Popup.ts', {
    '@/helpers/AppData': { get: key => state[key], set: (key, value) => { state[key] = value; } },
    '@/helpers/Window': { open() { throw new Error('Existing window should be reused'); } },
    '@/helpers/Performance': { limitProjectionWindows: () => false },
    vue: { markRaw: value => value },
  }).default;
  await helper.syncMonitors([2], 'external_media', true, true);
  assert.equal(popup.popupModule, 'external_media');
  assert.equal(state.popup_module, 'external_media');
});
