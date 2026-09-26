const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
const profiles = loadTs('electron/MixerProfiles.ts');
const { default: config } = loadTs('src/modules/core/config/interface/Index.vue', {
  '../manifest.json': {},
  '@/components/MenuToggleButton.vue': {},
  '@/components/inputs/ModernColorPicker.vue': {},
  './ConfigMiniPreview.vue': {},
  './CollapsiblePanel.vue': {},
  '@/helpers/Media': {},
  '../../../../../electron/MixerProfiles': profiles,
});
const plain = value => JSON.parse(JSON.stringify(value));
function context() {
  const errors = [];
  const ctx = {
    ...config.data(), ...config.methods,
    $alert: { error: value => errors.push(value.text), info: () => {} },
    $userdata: { set: () => {} }, errors,
  };
  return ctx;
}

test('loading and saving preserves legacy Ui16 IDs and multiple device bindings', () => {
  const ctx = context();
  const devices = [
    { id: 'soundcraft_ui16', name: 'Antiga', type: 'soundcraft-ui', ip: '192.168.0.80' },
    { id: 'second', name: 'Palco', type: 'behringer-x32', model: 'x32', ip: '192.168.0.81', port: 10023 },
  ];
  const actions = devices.map(device => ({ id: device.id + '_action', deviceId: device.id, target: 'input', channel: 9, operation: 'mute' }));
  ctx.applyAutomationConfig({ devices, triggers: [{ id: 'video', name: 'Vídeo', actions }] });
  const saved = plain(ctx.normalizeAutomationConfig());
  assert.equal(saved.devices.length, 2);
  assert.equal(saved.devices[0].model, 'ui16');
  assert.equal(saved.devices[0].id, 'soundcraft_ui16');
  assert.deepEqual(saved.triggers[0].actions.map(action => action.deviceId), ['soundcraft_ui16', 'second']);
  ctx.applyAutomationConfig(saved);
  assert.deepEqual(plain(ctx.normalizeAutomationConfig()), saved);
});

test('devices in use cannot be removed or silently redirect existing actions', () => {
  const ctx = context();
  ctx.addAutomationDevice();
  ctx.addAutomationTrigger();
  const first = ctx.automation_config.devices[0];
  ctx.removeAutomationDevice(first.id);
  assert.equal(ctx.automation_config.devices.length, 1);
  assert.equal(ctx.errors.length, 1);
  ctx.addAutomationDevice();
  const second = ctx.automation_config.devices[1];
  second.model = 'm32';
  ctx.changeAutomationModel(second);
  assert.equal(second.type, 'midas-m32');
  assert.equal(second.port, 10023);
  ctx.addAutomationAction(ctx.automation_config.triggers[0]);
  assert.equal(ctx.automation_config.triggers[0].actions.length, 2);
  ctx.automation_config.triggers[0].actions.forEach(action => { action.deviceId = second.id; });
  ctx.removeAutomationDevice(first.id);
  assert.equal(ctx.automation_config.devices.length, 1);
  assert.equal(ctx.automation_config.triggers[0].actions[0].deviceId, second.id);
});

test('trigger testing stops when saving fails', async () => {
  const ctx = context();
  ctx.saveAutomationConfig = async () => false;
  // No desktop API exists in this test; accessing it would throw.
  await ctx.testAutomationTrigger({ id: 'test' });
});
