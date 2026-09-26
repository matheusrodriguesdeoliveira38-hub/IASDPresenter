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

test('virtual monitor alone starts the network server and advertises its viewer', async () => {
  const app = runtime();
  Object.assign(app.remoteControlConfig, { enabled: false, webOutputEnabled: false, virtualMonitorEnabled: true });
  try {
    await app.startRemoteControlServer();
    const status = await app.getRemoteControlStatus();
    assert.equal(status.running, true);
    assert.equal(status.outputAddresses.length, 0);
    assert.equal(status.virtualMonitorAddresses[0], 'http://192.168.100.228:0/virtual-monitor');
    app.remoteControlConfig.virtualMonitorEnabled = false;
    assert.equal(app.shouldRunNetworkServer(), false);
    assert.equal((await app.getRemoteControlStatus()).virtualMonitorAddresses.length, 0);
  } finally {
    app.remoteControlServer?.closeAllConnections();
    if (app.remoteControlServer) await new Promise(resolve => app.remoteControlServer.close(resolve));
  }
});
