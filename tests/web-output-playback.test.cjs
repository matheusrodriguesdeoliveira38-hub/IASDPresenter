const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('late video readiness uses current position and pause state and ignores closed output', () => {
  const source = fs.readFileSync('electron/main.ts', 'utf8');
  const start = source.indexOf('      function stopDirect()');
  const end = source.indexOf('      function startBroadcast(', start);
  const calls = [];
  const context = vm.createContext({
    stopBroadcast() {}, stopYoutubeHandshake() {}, showOnly() {}, render() {},
    directKind: '', directSession: '', directMedia: null, broadcastMode: false,
    directFrame: { removeAttribute() {} }, directVideo: { load() {}, pause() {}, removeAttribute() {} },
  });
  vm.runInContext(source.slice(start, end), context);
  context.syncDirect = (media, force) => calls.push({ time: media.currentTime, paused: media.paused, force });
  context.startDirect({ kind: 'video', sessionId: 'one', url: 'video.mp4', currentTime: 0, paused: false });
  context.startDirect({ kind: 'video', sessionId: 'one', url: 'video.mp4', currentTime: 80, paused: true });
  context.directVideo.oncanplay();
  assert.deepEqual(calls.at(-1), { time: 80, paused: true, force: false });
  context.directVideo.onloadedmetadata();
  assert.deepEqual(calls.at(-1), { time: 80, paused: true, force: true });
  context.stopDirect();
  const count = calls.length;
  context.directVideo.oncanplay();
  assert.equal(calls.length, count);
});

test('web output disables captions on readiness and later module loading', () => {
  const source = fs.readFileSync('electron/main.ts', 'utf8');
  const start = source.indexOf("      window.addEventListener('message',function(event){if(event.origin!==YOUTUBE_ORIGIN");
  let handler;
  const frame = {};
  const commands = [];
  const context = vm.createContext({
    window: { addEventListener: (_, callback) => { handler = callback; } },
    YOUTUBE_ORIGIN: 'https://www.youtube.com', directFrame: { contentWindow: frame },
    stopYoutubeHandshake() {}, ytCommand: (...args) => commands.push(args),
  });
  vm.runInContext(source.slice(start, source.indexOf('      live=new EventSource', start)), context);
  const event = { origin: 'https://www.youtube.com', source: frame, data: { event: 'onReady' } };
  handler({ ...event, source: {} });
  assert.equal(commands.length, 0);
  handler(event);
  assert.ok(commands.some(([name, args]) => name === 'addEventListener' && args[0] === 'onApiChange'));
  assert.equal(commands.filter(([name]) => name === 'unloadModule').length, 1);
  handler({ ...event, data: JSON.stringify({ event: 'onApiChange' }) });
  const unloads = commands.filter(([name]) => name === 'unloadModule');
  assert.equal(unloads.length, 2);
  assert.ok(unloads.every(([, args]) => args[0] === 'captions'));
});

function player() {
  const source = fs.readFileSync('electron/main.ts', 'utf8');
  const start = source.indexOf('      function syncDirect(media,force)');
  const commands = [];
  let now = 10000;
  const context = vm.createContext({
    targetTime: () => 20, youtubeReady: true, youtubeSampleAt: 0,
    youtubeCurrentTime: 0, lastYoutubeSyncAt: 0,
    Date: { now: () => now },
    ytCommand: (...args) => commands.push(args),
  });
  vm.runInContext(source.slice(start, source.indexOf('      function startDirect(media)', start)), context);
  return { context, commands, advance: ms => { now += ms; },
    sync: (media = {}, force = false) => context.syncDirect({ kind: 'youtube', paused: false, buffering: false, ...media }, force),
    seeks: () => commands.filter(([command]) => command === 'seekTo') };
}

test('web YouTube waits for readiness and a time sample and avoids seeks while buffering', () => {
  const p = player();
  p.context.youtubeReady = false;
  p.sync({}, true);
  assert.equal(p.commands.length, 0);
  p.context.youtubeReady = true;
  p.sync();
  assert.equal(p.seeks().length, 0);
  p.context.youtubeSampleAt = 10000;
  p.sync({ buffering: true });
  assert.equal(p.seeks().length, 0);
  assert.ok(p.commands.some(([command]) => command === 'pauseVideo'));
});

test('web YouTube tolerates small drift and limits repeated corrections', () => {
  const p = player();
  p.context.youtubeSampleAt = 10000;
  p.context.youtubeCurrentTime = 19.5;
  p.sync();
  assert.equal(p.seeks().length, 0);
  p.context.youtubeCurrentTime = 10;
  p.sync();
  assert.equal(p.seeks().length, 1);
  p.advance(500);
  p.sync();
  assert.equal(p.seeks().length, 1);
  p.advance(2000);
  p.sync();
  assert.equal(p.seeks().length, 2);
});

test('web YouTube preserves immediate explicit seeks despite the correction interval', () => {
  const p = player();
  p.context.lastYoutubeSyncAt = 10000;
  p.sync({ paused: true }, true);
  assert.equal(p.seeks().length, 1);
  assert.deepEqual(Array.from(p.seeks()[0][1]), [20, true]);
});
