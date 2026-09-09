const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');

function component(name, globals = {}) {
  return loadTs(`src/modules/core/external_media/interface/${name}.vue`, {
    '../manifest.json': {}, '@/components/Window.vue': {}, '@/components/buttons/Screen.vue': {},
    '@/helpers/ExternalMedia': {}, '@/helpers/YouTube': { YOUTUBE_PLAYER_ORIGIN: 'https://www.youtube.com' }, '@/helpers/ProjectionPreferences': {},
  }, globals).default;
}

test('reopening the same media creates a fresh session starting at zero', () => {
  const { openExternalMedia } = loadTs('src/helpers/ExternalMedia.ts');
  const state = {};
  const store = { get: key => state[key], set: (key, value) => { state[key] = value; } };
  openExternalMedia(store, { filePath: 'same.mp4' });
  const first = state['modules.external_media.config'].session_id;
  state['modules.external_media.config'].current_time = 98;
  openExternalMedia(store, { filePath: 'same.mp4' });
  assert.notEqual(state['modules.external_media.config'].session_id, first);
  assert.equal(state['modules.external_media.config'].current_time, 0);
  const context = { rawFilePath: 'same.mp4', currentTime: 98, progress: 44, duration: 200, $appdata: { get: () => 73 }, $nextTick() {} };
  component('Index').watch.playbackSession.call(context);
  assert.equal(context.currentTime, 0);
  assert.equal(context.progress, 0);
  assert.equal(context.duration, 0);
});

test('late playback notifications cannot republish old position after close', () => {
  const context = { isClosing: true, currentTime: 98, $appdata: { set() { assert.fail('Closed playback must not write state'); } } };
  for (const method of ['sharePlaybackPosition', 'onPlay', 'onPause', 'onLoadedMetadata']) component('Index').methods[method].call(context);
});

test('YouTube links with timestamp can explicitly start at zero', () => {
  const { getYouTubeEmbedUrl } = loadTs('src/helpers/YouTube.ts', {}, { URL, URLSearchParams });
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=98';
  assert.equal(new URL(getYouTubeEmbedUrl(url)).searchParams.get('start'), '98');
  assert.equal(new URL(getYouTubeEmbedUrl(url, { startSeconds: 0 })).searchParams.get('start'), null);
});

test('projection freezes its clock while the operator buffers and caps stale extrapolation', () => {
  const context = { currentTime: 10, playbackUpdatedAt: Date.now() - 60000, isPaused: false, isBuffering: true, $appdata: { get: () => 1000 } };
  const target = component('Popup').methods.getSynchronizedTargetTime;
  assert.equal(target.call(context), 10);
  context.isBuffering = false;
  assert.equal(target.call(context), 10.5);
});

test('YouTube miniplayer messages cannot overwrite the operator clock', () => {
  const frame = {};
  const context = { isYouTube: true, isClosing: false, $refs: { youtubeFrame: { contentWindow: frame } },
    currentTime: 12, duration: 100, sharePlaybackPosition() {} };
  const handle = component('Index').methods.handleYouTubeMessage;
  handle.call(context, { origin: 'https://www.youtube.com', source: {}, data: { event: 'infoDelivery', info: { currentTime: 55 } } });
  assert.equal(context.currentTime, 12);
  handle.call(context, { origin: 'https://www.youtube.com', source: frame, data: { event: 'infoDelivery', info: { currentTime: 13 } } });
  assert.equal(context.currentTime, 13);
});

test('forced projection seek is immediate even inside the usual drift correction interval', () => {
  const calls = [];
  const context = { isYouTube: true, youtubeReady: true, isPaused: true, isBuffering: false, popupYouTubeCurrentTime: 50,
    lastYouTubeSyncAt: Date.now(), getSynchronizedTargetTime: () => 0,
    sendYouTubeCommand: (...args) => calls.push(args) };
  component('Popup').methods.syncPlaybackPosition.call(context, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['pauseVideo'], ['seekTo', [0, true]]]);
});

for (const name of ['Index', 'Popup']) {
  test(name + ' initializes YouTube once after readiness and assigns audio ownership', () => {
    const timers = new Set();
    const definition = component(name, {
      setInterval(fn) { timers.add(fn); return fn; },
      clearInterval(fn) { timers.delete(fn); },
    });
    const messages = [];
    const frame = { postMessage(message) { messages.push(JSON.parse(message)); } };
    const context = {
      ...definition.data(), isYouTube: true, isClosing: false, userPaused: false,
      isPaused: false, isBuffering: false, volume: 73, currentTime: 0,
      $refs: { youtubeFrame: { contentWindow: frame }, popupYouTube: { contentWindow: frame } },
      getSynchronizedTargetTime: () => 0,
      onPlay() { assert.fail('Readiness must not fabricate a playing event'); },
    };
    for (const method of ['initializeYouTubePlayer', 'sendYouTubeCommand']) {
      context[method] = definition.methods[method].bind(context);
    }
    definition.methods[name === 'Index' ? 'onYouTubeFrameLoad' : 'onYouTubeLoad'].call(context);
    assert.deepEqual(messages.map(message => message.event), ['listening']);
    assert.equal(timers.size, 1);
    const ready = { origin: 'https://www.youtube.com', source: frame, data: { event: 'onReady' } };
    definition.methods.handleYouTubeMessage.call(context, { ...ready, source: {} });
    assert.equal(context.youtubeReady, false);
    definition.methods.handleYouTubeMessage.call(context, ready);
    const expected = name === 'Index'
      ? ['addEventListener', 'unMute', 'setVolume', 'seekTo', 'playVideo']
      : ['addEventListener', 'mute', 'seekTo', 'playVideo'];
    assert.deepEqual(messages.filter(message => message.event === 'command').map(message => message.func), expected);
    assert.deepEqual(messages.find(message => message.func === 'seekTo').args, [0, true]);
    if (name === 'Index') assert.deepEqual(messages.find(message => message.func === 'setVolume').args, [73]);
    assert.equal(timers.size, 0);
    const count = messages.length;
    definition.methods.handleYouTubeMessage.call(context, ready);
    assert.equal(messages.length, count);
  });
}

test('projection cannot start or seek before its YouTube player is ready', () => {
  component('Popup').methods.syncPlaybackPosition.call({
    isYouTube: true, youtubeReady: false, getSynchronizedTargetTime: () => 0,
    sendYouTubeCommand() { assert.fail('Player is not ready'); },
  }, true);
});
