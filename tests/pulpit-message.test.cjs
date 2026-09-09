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
