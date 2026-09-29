const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

function runtime() {
  const state = {};
  const appdata = { get: key => state[key], set: (key, value) => { state[key] = value; } };
  const popup = loadTs('src/helpers/Popup.ts', {
    '@/helpers/AppData': appdata,
    '@/helpers/Performance': { limitProjectionWindows: () => false },
    vue: { markRaw: value => value },
    '@/helpers/Window': { open(url) {
      return { url, closed: false, close() { this.closed = true; }, focus() {} };
    } },
  }, { window: { electronAPI: { getDisplays: async () => [{ id: 1, isPrimary: true }, { id: 2 }] } } }).default;
  return { state, popup, appdata };
}

test('projection metadata survives document load and the window is reused after clock focus', async () => {
  const { popup, state } = runtime();
  await popup.openClock(2);
  await popup.syncMonitors([2], 'bible', true);
  const output = state.popups.find(p => p.popupRole === 'projection');
  let focused = 0;
  output.nativeWindow.focus = () => focused++;
  for (const key of ['popupRole', 'monitorId', 'popupModule', 'popupFullscreen']) delete output.nativeWindow[key];
  await popup.syncMonitors([2], 'presentation', true);
  assert.equal(state.popups.length, 2);
  assert.equal(state.popups.find(p => p.popupRole === 'projection'), output);
  assert.equal(output.popupModule, 'presentation');
  assert.equal(focused, 1);
  popup.closeProjection('presentation');
  assert.equal(output.closed, true);
  assert.equal(state.popups[0].popupRole, 'clock');
});

test('window fallback does not reuse or close an independent return window', async () => {
  const { popup, state } = runtime();
  await popup.syncReturnMonitor(2, true);
  const output = state.popups[0];
  await popup.open({ module: 'bible', fullscreen: true });
  assert.equal(output.closed, false);
  assert.equal(state.popups.length, 2);
  assert.equal(state.popups.find(p => p.popupRole === 'projection').popupModule, 'bible');
});

test('clock keeps its window and monitor through music projection and exit', async () => {
  const { popup, state } = runtime();
  await popup.openClock(2);
  const clock = state.popups[0];
  await popup.syncMonitors([2, 3], 'media', true);
  await popup.syncReturnMonitor(2, true);
  assert.equal(state.popups.length, 4);
  const returnOutput = state.popups.find(p => p.popupRole === 'return_monitor');
  assert.equal(returnOutput.monitorId, clock.monitorId);
  assert.equal(clock.closed, false);
  assert.equal(state.popups[1].monitorId, 2);
  assert.equal(state.popups[2].monitorId, 3);
  await popup.exit();
  assert.equal(clock.closed, false);
  assert.equal(state.popups.length, 1);
  assert.equal(state.popups[0], clock);
  assert.equal(clock.monitorId, 2);
  popup.closeClock();
  assert.equal(clock.closed, true);
  assert.equal(state.popups.length, 0);
});

test('enabling clock during a song preserves return output and toggles independently', async () => {
  const { popup, state } = runtime();
  await popup.syncMonitors([2, 3], 'bible', true);
  await popup.syncReturnMonitor(2, true);
  const original = [...state.popups];
  await popup.openClock(2);
  assert.equal(original[0].closed, false);
  assert.equal(original[1].closed, false);
  assert.equal(original[2].closed, false);
  await popup.openClock(2);
  assert.equal(state.popups.length, 4);
  popup.closeClock();
  assert.equal(state.popups.length, 3);
  assert.equal(original[2].closed, false);
  assert.equal(state.popups[0], original[0]);
});

test('window fallback and module-specific closing preserve clock', async () => {
  const { popup, state } = runtime();
  await popup.openClock(2);
  const clock = state.popups[0];
  await popup.open({ module: 'bible', fullscreen: true });
  assert.equal(state.popups.length, 2);
  await popup.open({ module: 'bible', fullscreen: false });
  assert.equal(state.popups.length, 2);
  assert.equal(clock.closed, false);
  popup.closeProjection('bible');
  assert.equal(state.popups.length, 1);
  assert.equal(state.popups[0], clock);
});

test('clock rendering and button state are independent of shared projection state', async () => {
  const { popup, state, appdata } = runtime();
  await popup.openClock(2);
  state.popup_module = 'media';
  const screen = loadTs('src/components/buttons/Screen.vue', { '@/helpers/UserData': {} }).default;
  const context = { module: 'clock', $appdata: appdata };
  context.is_popup_opened = screen.computed.is_popup_opened.call(context);
  assert.equal(screen.computed.is_selected.call(context), true);
  const page = loadTs('src/views/Popup.vue', {
    vue: { defineAsyncComponent() {} }, '@/components/PulpitMessageOverlay.vue': {},
  }).default;
  assert.equal(page.computed.module.call({ $route: { query: { module: 'clock' } }, $appdata: appdata }), 'clock');
  assert.equal(page.computed.projectionOverride.call(context), 'none');
  assert.equal(page.computed.projectionTransition.call(context).active, false);
});

test('toggle remains usable after the child document replaces window properties', async () => {
  const { popup, state, appdata } = runtime();
  const button = loadTs('src/components/buttons/Screen.vue', {
    '@/helpers/UserData': { get: () => 2 },
  }, { window: { electronAPI: { getDisplays: async () => [{ id: 2 }] } } }).default;
  const context = { module: 'clock', $appdata: appdata, $popup: popup };
  Object.defineProperty(context, 'is_popup_opened', { get: () => button.computed.is_popup_opened.call(context) });
  Object.defineProperty(context, 'is_selected', { get: () => button.computed.is_selected.call(context) });
  await button.methods.popup.call(context);
  assert.equal(context.is_selected, true);
  assert.equal(state.popups[0].popupRole, 'clock');
  await button.methods.popup.call(context);
  assert.equal(context.is_selected, false);
  assert.equal(state.popups.length, 0);
  await button.methods.popup.call(context);
  assert.equal(context.is_selected, true);
});

test('clock control and visual messages survive child document loading', async () => {
  const state = {};
  const messages = [];
  const child = { closed: false, close() { this.closed = true; }, focus() {}, postMessage(value) { messages.push(value); } };
  const popup = loadTs('src/helpers/Popup.ts', {
    '@/helpers/AppData': { get: key => state[key], set: (key, value) => { state[key] = value; } },
    '@/helpers/Performance': { limitProjectionWindows: () => false },
    vue: { markRaw: value => value },
    '@/helpers/Window': { open: () => child },
  }).default;
  await popup.openClock(2);
  // A new document discards properties assigned to the old Window global.
  for (const key of ['popupRole', 'popupModule', 'popupFullscreen', 'monitorId']) delete child[key];
  assert.equal(popup.isClockMonitor(2), true);
  const config = { bgColor: '#123456', textColor: '#abcdef', style: 'analog' };
  state.popups[0].postMessage({ param: 'clock_config', value: config }, '*');
  assert.deepEqual(messages[0].value, config);
  await popup.exit();
  assert.equal(child.closed, false);
  popup.closeClock();
  assert.equal(child.closed, true);
});

test('clock restores saved appearance and applies live changes', () => {
  const screen = loadTs('src/modules/clock/components/Screen.vue').default;
  const state = { 'user_data.clock_config': { bgColor: '#123456', textColor: '#abcdef', style: 'analog' } };
  const context = { ...screen.data(), $appdata: { get: key => state[key] } };
  assert.equal(screen.computed.config.call(context).bgColor, '#123456');
  assert.equal(screen.computed.config.call(context).showSeconds, true);
  state.clock_config = { bgColor: '#987654', style: 'digital' };
  assert.equal(screen.computed.config.call(context).bgColor, '#987654');
  assert.equal(screen.computed.config.call(context).style, 'digital');
});

test('closing return output after a song reveals the same running clock', async () => {
  const { popup, state } = runtime();
  state.clock_timer = { running: true, endsAt: Date.now() + 600000 };
  const timer = state.clock_timer;
  await popup.openClock(2);
  const clock = state.popups[0];
  await popup.syncReturnMonitor(2, true);
  const output = state.popups[1];
  for (const key of ['popupRole', 'monitorId']) delete output.nativeWindow[key];
  await popup.syncReturnMonitor(2, true);
  assert.equal(state.popups.length, 2);
  popup.closeReturnMonitor();
  assert.equal(output.closed, true);
  assert.equal(clock.closed, false);
  assert.equal(state.popups.length, 1);
  assert.equal(state.popup, clock);
  assert.equal(state.clock_timer, timer);
  assert.equal(state.clock_timer.running, true);
});

for (const { label, module, filePath } of [
  { label: 'Bible', module: 'bible' },
  { label: 'local media', module: 'external_media', filePath: 'video.mp4' },
  { label: 'links', module: 'external_media', filePath: 'https://www.youtube.com/watch?v=example' },
]) {
  test(`${label} overlays clock on the same monitor and closing preserves its timer`, async () => {
    const { popup, state } = runtime();
    const timer = { running: true, endsAt: Date.now() + 600000 };
    state.clock_timer = timer;
    if (filePath) state['modules.external_media.filePath'] = filePath;
    await popup.openClock(2);
    const clock = state.popups[0];
    await popup.syncMonitors([2], module, true);
    assert.equal(state.popups.length, 2);
    const overlay = state.popups[1];
    assert.equal(overlay.monitorId, clock.monitorId);
    assert.equal(overlay.popupModule, module);
    assert.equal(clock.closed, false);
    popup.closeProjection(module);
    assert.equal(overlay.closed, true);
    assert.equal(state.popups.length, 1);
    assert.equal(state.popups[0], clock);
    assert.equal(state.clock_timer, timer);
    assert.equal(clock.closed, false);
  });
}

test('direct projections reuse the overlay and track the module without closing clock', async () => {
  const { popup, state } = runtime();
  await popup.openClock(2);
  const clock = state.popups[0];
  await popup.open({ monitorId: 2, module: 'bible', fullscreen: true });
  const overlay = state.popups[1];
  await popup.open({ monitorId: 2, module: 'external_media', fullscreen: true });
  assert.equal(state.popups.length, 2);
  assert.equal(state.popups[1], overlay);
  assert.equal(overlay.popupModule, 'external_media');
  popup.closeProjection('external_media');
  assert.equal(overlay.closed, true);
  assert.equal(clock.closed, false);
});

test('all liturgy outputs cover the return clock and closing reveals the running timer', async () => {
  const { popup, state, appdata } = runtime();
  const page = loadTs('src/views/Popup.vue', {
    vue: {}, '@/components/PulpitMessageOverlay.vue': {},
  }).default;
  const timer = { running: true, endsAt: Date.now() + 600000 };
  state.clock_timer = timer;
  await popup.openClock(2);
  const clock = state.popups[0];
  for (const module of ['bible', 'external_media', 'presentation', 'media']) {
    await popup.syncReturnMonitor(2, true, module);
    const output = state.popups.find(p => p.popupRole === 'return_monitor');
    assert.equal(output.monitorId, clock.monitorId);
    assert.equal(page.computed.module.call({
      $route: { query: { module: 'return_monitor' } }, $appdata: appdata,
    }), module === 'media' ? 'return_monitor' : module);
    assert.equal(clock.closed, false);
    popup.closeProjection(module);
    assert.equal(output.closed, true);
    assert.equal(state.popups.length, 1);
    assert.equal(state.popups[0], clock);
    assert.equal(state.clock_timer, timer);
  }
});
