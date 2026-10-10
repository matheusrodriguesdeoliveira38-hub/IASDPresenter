const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const ts = require('typescript');
const source = fs.readFileSync('electron/main.ts', 'utf8');
function section(from, until) { return source.slice(source.indexOf(from), source.indexOf(until, source.indexOf(from))); }
function runtime(port = 0) {
  const context = vm.createContext({
    http, console: { log() {}, error() {} },
    os: { networkInterfaces: () => ({ wifi: [{ family: 'IPv4', internal: false, address: '192.168.100.228' }] }) },
    QRCode: require('qrcode'),
    remoteControlConfig: { enabled: true, host: '192.168.1.8', port, webOutputEnabled: true },
    remoteControlServer: null, remoteControlStartPromise: null, remoteControlError: '', remoteControlHost: '0.0.0.0',
    handleRemoteControlRequest: async (_, response) => response.end('remote ready'),
  });
  const code = section('function getRemoteControlPort()', 'function isRemoteControlPasswordValid')
    + section('function shouldRunNetworkServer()', 'function loadRemoteControlConfig')
    + section('function startRemoteControlServer()', 'async function stopRemoteControlServer')
    + section('async function getRemoteControlStatus()', 'function resolveInsideBase');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context;
}
test('stale saved IP recovers and status waits for a listening server with a QR code', async () => {
  const app = runtime();
  try {
    app.startRemoteControlServer();
    const status = await app.getRemoteControlStatus();
    assert.equal(status.running, true);
    assert.equal(status.effectiveHost, '0.0.0.0');
    assert.equal(status.addresses[0], 'http://192.168.100.228:0');
    assert.match(status.qrCode, /^data:image\/png;base64,/);
    assert.equal(app.remoteControlConfig.host, '192.168.1.8');
    const response = await fetch('http://127.0.0.1:' + app.remoteControlServer.address().port);
    assert.equal(await response.text(), 'remote ready');
  } finally {
    app.remoteControlServer?.closeAllConnections();
    if (app.remoteControlServer) await new Promise(resolve => app.remoteControlServer.close(resolve));
  }
});
test('virtual monitor accepts Ethernet with a saved mixer Wi-Fi IP', async () => {
  const app = runtime();
  app.os.networkInterfaces = () => ({
    WiFi: [{ family: 'IPv4', internal: false, address: '127.0.0.2' }],
    Ethernet: [{ family: 'IPv4', internal: false, address: '127.0.0.1' }],
  });
  Object.assign(app.remoteControlConfig, { host: '127.0.0.2', virtualMonitorEnabled: true });
  try {
    await app.startRemoteControlServer();
    const status = await app.getRemoteControlStatus();
    assert.equal(status.effectiveHost, '0.0.0.0');
    assert.equal(status.virtualMonitorAddresses.length, 2);
    assert.ok(status.virtualMonitorAddresses.includes('http://127.0.0.1:0/virtual-monitor'));
    assert.equal(status.networkOptions[2].title, 'Ethernet — 127.0.0.1');
    assert.equal(app.remoteControlConfig.host, '127.0.0.2');
    for (const host of ['127.0.0.1', '127.0.0.2']) {
      const response = await fetch(`http://${host}:${app.remoteControlServer.address().port}/virtual-monitor`);
      assert.equal(await response.text(), 'remote ready');
    }
  } finally {
    app.remoteControlServer?.closeAllConnections();
    if (app.remoteControlServer) await new Promise(resolve => app.remoteControlServer.close(resolve));
  }
});

test('occupied port reports failure without advertising a dead URL or QR code', async () => {
  const occupied = http.createServer();
  await new Promise(resolve => occupied.listen(0, '0.0.0.0', resolve));
  try {
    const app = runtime(occupied.address().port);
    await app.startRemoteControlServer();
    const status = await app.getRemoteControlStatus();
    assert.equal(status.running, false);
    assert.equal(status.addresses.length, 0);
    assert.equal(status.qrCode, '');
    assert.match(status.error, /porta.*uso/);
  } finally { await new Promise(resolve => occupied.close(resolve)); }
});

test('enabled server advertises the virtual monitor without web output', async () => {
  const app = runtime();
  Object.assign(app.remoteControlConfig, { enabled: true, webOutputEnabled: false, virtualMonitorEnabled: true });
  try {
    await app.startRemoteControlServer();
    const status = await app.getRemoteControlStatus();
    assert.equal(status.running, true);
    assert.equal(status.outputAddresses.length, 0);
    assert.equal(status.virtualMonitorAddresses[0], 'http://192.168.100.228:0/virtual-monitor');
    app.remoteControlConfig.virtualMonitorEnabled = false;
    assert.equal(app.shouldRunNetworkServer(), true);
    assert.equal((await app.getRemoteControlStatus()).virtualMonitorAddresses.length, 0);
  } finally {
    app.remoteControlServer?.closeAllConnections();
    if (app.remoteControlServer) await new Promise(resolve => app.remoteControlServer.close(resolve));
  }
});

test('disabled startup keeps the server stopped regardless of enabled viewers', async () => {
  for (const webOutputEnabled of [false, true]) {
    for (const virtualMonitorEnabled of [false, true]) {
      const app = runtime();
      Object.assign(app.remoteControlConfig, { enabled: false, webOutputEnabled, virtualMonitorEnabled });
      assert.equal(app.shouldRunNetworkServer(), false);
      await app.startRemoteControlServer();
      const status = await app.getRemoteControlStatus();
      assert.equal(status.running, false);
      assert.equal(app.remoteControlServer, null);
      assert.equal(status.addresses.length, 0);
      assert.equal(status.qrCode, '');
    }
  }
});

test('saving the switch and manual controls stop and restart the shared server', async () => {
  const handlers = new Map();
  const app = runtime();
  Object.assign(app, {
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    saveRemoteControlConfig: config => Object.assign(app.remoteControlConfig, config),
    stopRemoteControlServer: async () => { app.remoteControlServer = null; },
    startRemoteControlServer: () => { app.remoteControlServer = { listening: true }; },
    sendWebOutputDemand() {},
    releaseWebOutputFrameWaitersWithoutFrame() {},
    getWebOutputViewerCount: () => 0,
  });
  const code = section("ipcMain.handle('save-remote-control-config'", 'const isDev =');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, app);
  app.remoteControlConfig.virtualMonitorEnabled = true;
  app.remoteControlServer = { listening: true };

  let status = await handlers.get('save-remote-control-config')(null, { enabled: false });
  assert.equal(status.running, false);
  assert.equal(app.remoteControlConfig.enabled, false);

  status = await handlers.get('save-remote-control-config')(null, { port: 9000 });
  assert.equal(status.running, false);

  status = await handlers.get('save-remote-control-config')(null, { enabled: true });
  assert.equal(status.running, true);

  status = await handlers.get('stop-remote-control-server')();
  assert.equal(status.running, false);
  assert.equal(app.remoteControlConfig.enabled, false);

  status = await handlers.get('start-remote-control-server')();
  assert.equal(status.running, true);
  assert.equal(app.remoteControlConfig.enabled, true);
});
