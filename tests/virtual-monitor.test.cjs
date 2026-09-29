const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

function configRuntime(electronAPI) {
  const config = loadTs('src/modules/core/config/interface/Index.vue', {
    '../manifest.json': {}, '@/components/MenuToggleButton.vue': {},
    '@/components/inputs/ModernColorPicker.vue': {}, './ConfigMiniPreview.vue': {},
    './CollapsiblePanel.vue': {}, '@/helpers/Media': {},
    '../../../../../electron/MixerProfiles': loadTs('electron/MixerProfiles.ts'),
  }, { window: { electronAPI } }).default;
  const state = {};
  return {
    ...config.data(), ...config.methods, state,
    $appdata: { set: (key, value) => { state[key] = value; } },
    $alert: { info() {}, error(value) { assert.fail(value.text); } },
  };
}

test('old Electron process cannot report virtual monitor as enabled', async () => {
  const ctx = configRuntime({ saveRemoteControlConfig() { assert.fail('Unsupported runtime'); } });
  ctx.remote_control_config.virtualMonitorEnabled = true;
  ctx.applyRemoteControlStatus({ config: { enabled: true }, addresses: [] });
  assert.equal(ctx.virtual_monitor_supported, false);
  assert.equal(ctx.remote_control_config.virtualMonitorEnabled, false);
  await ctx.updateVirtualMonitorEnabled(true);
  assert.equal(ctx.remote_control_config.virtualMonitorEnabled, false);
});

test('activation refreshes shared display lists and addresses without a display event', async () => {
  let enabled = false;
  const address = 'http://192.168.1.10:1975/virtual-monitor';
  const status = () => ({ config: { virtualMonitorEnabled: enabled }, virtualMonitorAddresses: enabled ? [address] : [] });
  const ctx = configRuntime({
    getRemoteControlStatus: async () => status(),
    saveRemoteControlConfig: async config => { enabled = config.virtualMonitorEnabled; return status(); },
    getDisplays: async () => enabled ? [{ id: 1 }, { id: 'virtual-monitor' }] : [{ id: 1 }],
  });
  await ctx.loadRemoteControlStatus();
  await ctx.updateVirtualMonitorEnabled(true);
  assert.equal(ctx.remote_control_config.virtualMonitorEnabled, true);
  assert.equal(ctx.virtual_monitor_addresses[0], address);
  assert.equal(ctx.state.system_displays[1].id, 'virtual-monitor');
  await ctx.updateVirtualMonitorEnabled(false);
  assert.equal(ctx.virtual_monitor_addresses.length, 0);
  assert.equal(ctx.state.system_displays.length, 1);
});

function runtime() {
  const state = { system_displays: [{ id: 1, isPrimary: true }, { id: 'virtual-monitor', isVirtual: true }] };
  const windows = [];
  const popup = loadTs('src/helpers/Popup.ts', {
    '@/helpers/AppData': { get: key => state[key], set: (key, value) => { state[key] = value; } },
    '@/helpers/Performance': { limitProjectionWindows: () => false },
    vue: { markRaw: value => value },
    '@/helpers/Window': { open(url, name, features) {
      const win = { url, name, features, closed: false, close() { this.closed = true; }, focus() {} };
      windows.push(win);
      return win;
    } },
  }).default;
  return { state, windows, popup };
}

test('virtual projection opens, reuses its window, and stops after deselection', async () => {
  const { popup, state, windows } = runtime();
  await popup.syncMonitors(['virtual-monitor', 2], 'bible', true);
  assert.equal(windows.length, 2);
  assert.match(windows[0].features, /monitor=virtual-monitor/);
  await popup.syncMonitors(['virtual-monitor', 2], 'presentation', true);
  assert.equal(windows.length, 2);
  assert.equal(state.popups[0].popupModule, 'presentation');
  await popup.syncMonitors([2], 'presentation', true);
  assert.equal(windows[0].closed, true);
  assert.equal(windows[1].closed, false);
  assert.equal(state.popups.length, 1);
});

test('disabled virtual display cannot reopen through saved projection or return preferences', async () => {
  const { popup, state, windows } = runtime();
  await popup.syncReturnMonitor('virtual-monitor', true);
  assert.equal(state.popups[0].popupModule, 'return_monitor');
  state.system_displays = [{ id: 1, isPrimary: true }];
  await popup.syncReturnMonitor('virtual-monitor', true);
  assert.equal(windows[0].closed, true);
  await popup.syncMonitors(['virtual-monitor'], 'bible', true);
  await popup.open({ monitorId: 'virtual-monitor', module: 'bible' });
  assert.equal(windows.length, 1);
});
