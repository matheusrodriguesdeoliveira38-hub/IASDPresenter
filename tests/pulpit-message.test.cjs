const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
const { activePulpitMessage, sendPulpitMessage } = loadTs('src/helpers/PulpitMessage.ts');

test('private messages and removal go only to open return monitors', () => {
  const received = [];
  const popup = (popupRole, closed = false) => ({ popupRole, closed, postMessage: data => received.push({ popupRole, data }) });
  const targets = [popup('projection'), popup('web_output'), popup('return_monitor', true), popup('return_monitor')];
  const message = { text: 'Microfone desligado', expiresAt: null };
  assert.equal(sendPulpitMessage(targets, message), 1);
  assert.equal(sendPulpitMessage(targets, null), 1);
  assert.equal(received.length, 2);
  assert.ok(received.every(item => item.popupRole === 'return_monitor'));
  assert.equal(received[0].data.message, message);
  assert.equal(received[1].data.message, null);
});

test('expiry uses absolute time, including delayed delivery and replacement', () => {
  const first = { text: 'Primeira', expiresAt: 1000 };
  const replacement = { text: 'Segunda', expiresAt: 3000 };
  assert.equal(activePulpitMessage(first, 999), first);
  assert.equal(activePulpitMessage(first, 1000), null);
  assert.equal(activePulpitMessage(first, 2000), null);
  assert.equal(activePulpitMessage(replacement, 2000), replacement);
  const persistent = { text: 'Aguardar', expiresAt: null };
  assert.equal(activePulpitMessage(persistent, 999999), persistent);
});

test('closing a monitor during delivery does not stop other return monitors', () => {
  let delivered = false;
  assert.equal(sendPulpitMessage([
    { popupRole: 'return_monitor', postMessage() { throw new Error('closed'); } },
    { popupRole: 'return_monitor', postMessage() { delivered = true; } },
  ], null), 1);
  assert.equal(delivered, true);
});

test('explicit monitor selection delivers only to that screen and excludes web output', () => {
  const received = [];
  const targets = ['projection', 'return_monitor', 'clock', 'pulpit_message', 'web_output'].flatMap(popupRole =>
    [2, 3].map(monitorId => ({ popupRole, monitorId, postMessage: data => received.push({ popupRole, monitorId, data }) })));
  const message = { text: 'Aviso', expiresAt: null };
  assert.equal(sendPulpitMessage(targets, message, '3'), 4);
  assert.ok(received.every(entry => entry.monitorId === 3 && entry.popupRole !== 'web_output'));
  assert.equal(sendPulpitMessage(targets, null, 3), 4);
});

function control() {
  const state = {}, saved = {}, delivered = [];
  const displays = [{ id: 1, label: 'Tela principal', isPrimary: true }, { id: 2, label: 'Retorno' }];
  const helper = loadTs('src/helpers/PulpitMessage.ts');
  const component = loadTs('src/components/PulpitMessageControl.vue', {
    '@/helpers/PulpitMessage': helper, '@/components/PulpitMessageBanner.vue': {},
  }, { window: { electronAPI: { getDisplays: async () => displays } } }).default;
  const popup = loadTs('src/helpers/Popup.ts', {
    '@/helpers/AppData': { get: key => state[key], set: (key, value) => { state[key] = value; } },
    '@/helpers/Performance': { limitProjectionWindows: () => false }, vue: { markRaw: value => value },
    '@/helpers/Window': { open: () => ({ closed: false, close() { this.closed = true; }, postMessage: data => delivered.push(data), focus() {} }) },
  }).default;
  const ctx = { ...component.data(), $popup: popup,
    $appdata: { get: key => state[key] },
    $userdata: { get: key => saved[key], set: (key, value) => { saved[key] = value; } },
  };
  for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx);
  for (const [name, get] of Object.entries(component.computed)) Object.defineProperty(ctx, name, { get: () => get.call(ctx) });
  return { ctx, state, saved, delivered, displays, component };
}

test('send opens only selected monitor, delivers after load and clears old destination', async () => {
  const { ctx, state, saved, delivered } = control();
  saved['modules.config.return_monitor'] = 2;
  await ctx.refreshMonitors();
  assert.equal(ctx.monitorId, 2);
  ctx.monitorId = 1;
  ctx.draft = 'Aguardar';
  ctx.duration = 0;
  await ctx.send();
  const first = state.popups[0];
  assert.equal(first.monitorId, 1);
  assert.equal(state.popup_module, undefined);
  assert.equal(saved['modules.config.pulpit_message_monitor'], 1);
  delivered.length = 0;
  ctx.onReady({ source: first.nativeWindow, data: { action: 'pulpit-ready' } });
  assert.equal(delivered[0].message.text, 'Aguardar');
  ctx.monitorId = 2;
  await ctx.send();
  assert.equal(first.closed, true);
  assert.equal(state.popups.length, 1);
  assert.equal(state.popups[0].monitorId, 2);
  ctx.clear();
  assert.equal(state.popups.length, 0);
});

test('existing projection is preserved and unplugged selection never sends elsewhere', async () => {
  const { ctx, state, displays } = control();
  let delivered = 0;
  const projection = { popupRole: 'projection', monitorId: 2, closed: false, postMessage: () => delivered++ };
  state.popups = [projection];
  ctx.monitorId = 2;
  ctx.draft = 'Aviso';
  await ctx.send();
  assert.equal(state.popups.length, 1);
  assert.equal(delivered, 1);
  ctx.clear();
  assert.equal(projection.closed, false);
  displays.pop();
  await ctx.send();
  assert.match(ctx.error, /conectado/);
  assert.equal(delivered, 2);
});
