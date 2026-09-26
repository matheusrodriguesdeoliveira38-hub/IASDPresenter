const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');
const profiles = loadTs('electron/MixerProfiles.ts');
const source = fs.readFileSync('electron/main.ts', 'utf8');
const section = (from, until) => {
  const start = source.indexOf(from);
  const end = source.indexOf(until, start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
};
const ui = { id: 'old', name: 'Ui16', type: 'soundcraft-ui', ip: '192.168.0.80' };
const x32 = { id: 'new', name: 'X32', type: 'behringer-x32', model: 'x32', ip: '192.168.0.81', port: 10023 };
const action = (deviceId, extra = {}) => ({ id: deviceId + '_a', deviceId, operation: 'fadeToDB', target: 'input', channel: 1, valueDB: -18, fadeMs: 0, restoreOnMediaEnd: true, endValueDB: 0, endFadeMs: 0, ...extra });
function runtime() {
  const calls = [];
  const context = vm.createContext({
    ...profiles, automationConfig: { devices: [ui, x32] }, automationQueue: Promise.resolve(),
    pendingAutomationRestores: [],
    getSoundcraftConnection: async device => ({ device }),
    getSoundcraftTarget: (connection, action) => ({
      fadeToDB: async value => calls.push({ type: 'ui', device: connection.device.id, value, target: action.target }),
    }),
    executeOscAction: async (device, action) => {
      calls.push({ type: 'osc', device: device.id, ip: device.ip, value: action.valueDB, target: action.target });
      return { ok: true };
    },
  });
  const code = section('function sanitizeAutomationConfig', 'function loadAutomationConfig')
    + section('async function runMixerAction', 'function getRemoteControlPort')
    + section('function queueAutomation', "ipcMain.handle('test-automation-trigger'");
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { app: context, calls };
}

test('runtime preserves mixer types and action routing, including legacy configurations', () => {
  const { app } = runtime();
  const config = app.sanitizeAutomationConfig({ devices: [ui, x32], triggers: [{ id: 't', name: 't', actions: [action('old'), action('new')] }] });
  assert.equal(config.devices[0].model, 'ui16');
  assert.equal(config.devices[1].type, 'behringer-x32');
  assert.equal(config.triggers[0].actions[1].deviceId, 'new');
  profiles.validateMixerConfig(config);
});

test('mixed-family triggers restore through the correct adapter and original device address', async () => {
  const { app, calls } = runtime();
  const trigger = { name: 'Vídeo', actions: [action('old'), action('new', { target: 'master' })] };
  await app.executeAutomationTrigger(trigger);
  app.automationConfig = { devices: [{ ...x32, ip: '192.168.0.99' }] };
  const result = await app.restorePendingAutomation('media_ended');
  assert.equal(result.restored, 2);
  assert.deepEqual(calls.map(call => [call.type, call.device, call.value]), [
    ['ui', 'old', -18], ['osc', 'new', -18], ['osc', 'new', 0], ['ui', 'old', 0],
  ]);
  assert.equal(calls[2].ip, '192.168.0.81');
  assert.equal(calls[2].target, 'master');
});

test('invalid later actions prevent partial execution on earlier devices', async () => {
  const { app, calls } = runtime();
  await assert.rejects(app.executeAutomationTrigger({ name: 'Vídeo', actions: [action('old'), action('new', { channel: 33 })] }), /1 e 32/);
  assert.equal(calls.length, 0);
  await assert.rejects(app.executeAutomationTrigger({ name: 'Vídeo', actions: [action('old', { target: 'master', operation: 'mute' })] }), /Master Soundcraft/);
});

test('media completion waits for running fades and the queue recovers after failure', async () => {
  const { app, calls } = runtime();
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  const run = app.queueAutomation(async () => {
    await hold;
    return app.executeAutomationTrigger({ name: 'Vídeo', actions: [action('new')] });
  });
  const restore = app.queueAutomation(() => app.restorePendingAutomation('media_ended'));
  release();
  await run;
  assert.equal((await restore).restored, 1);
  assert.deepEqual(calls.map(call => call.value), [-18, 0]);
  await assert.rejects(app.queueAutomation(() => { throw new Error('offline'); }), /offline/);
  assert.equal(await app.queueAutomation(() => 'ready'), 'ready');
});
