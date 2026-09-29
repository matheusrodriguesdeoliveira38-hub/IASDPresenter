import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once, EventEmitter } from 'node:events';
import { createVirtualMonitorHandler, virtualMonitorDisplay } from './VirtualMonitor';

test('virtual monitor serves only its selected window and stops when disabled or closed', async () => {
  let enabled = false;
  let win = null;
  let captureCount = 0;
  let finishCapture;
  const bytes = Buffer.from('jpeg-frame');
  const image = { isEmpty: () => false, getSize: () => ({ width: 1920, height: 1080 }), resize: () => { throw new Error('Full HD must not be resized'); }, toJPEG: () => bytes };
  const captureWindow = {
    isDestroyed: () => false,
    webContents: { capturePage: async () => {
      captureCount++;
      if (finishCapture) await new Promise(resolve => { finishCapture = resolve; });
      return image;
    } },
  };
  const handler = createVirtualMonitorHandler({ enabled: () => enabled, getWindow: () => win });
  const server = createServer(async (req, res) => {
    if (!await handler(req, res, new URL(req.url, 'http://localhost').pathname)) {
      res.writeHead(418); res.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === 'object' ? address.port : 0}`;
  const frame = () => fetch(`${base}/virtual-monitor/frame.jpg`);
  try {
    assert.equal((await frame()).status, 404);
    enabled = true;
    const page = await fetch(`${base}/virtual-monitor`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /requestFullscreen/);
    assert.equal((await frame()).status, 204);
    assert.equal((await fetch(`${base}/output`)).status, 418);
    assert.equal((await fetch(`${base}/virtual-monitor`, { method: 'POST' })).status, 405);
    win = captureWindow;
    const frames = await Promise.all([frame(), frame(), frame()]);
    for (const response of frames) {
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('content-type'), 'image/jpeg');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
    assert.equal(captureCount, 1);
    win = null;
    assert.equal((await frame()).status, 204);
    // Closing a window during capture must not return its old content.
    win = captureWindow;
    finishCapture = true;
    const pending = frame();
    while (typeof finishCapture !== 'function') await new Promise(resolve => setTimeout(resolve, 5));
    win = null;
    finishCapture();
    assert.equal((await pending).status, 204);
    enabled = false;
    assert.equal((await frame()).status, 404);
    assert.equal((await fetch(`${base}/virtual-monitor`)).status, 404);
    assert.equal(virtualMonitorDisplay().isPrimary, false);
    assert.equal(virtualMonitorDisplay().bounds.width, 1920);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('continuous stream shares capture, skips blocked viewers and stops after disconnect', async () => {
  let captures = 0;
  const image = {
    isEmpty: () => false, getSize: () => ({ width: 1920, height: 1080 }),
    toJPEG: () => Buffer.from(`frame-${captures}`),
  };
  const win = { isDestroyed: () => false, webContents: { capturePage: async (_rect, options) => {
    assert.equal(options.stayHidden, true);
    assert.equal(options.stayAwake, true);
    captures++;
    return image;
  } } };
  const handler = createVirtualMonitorHandler({ enabled: () => true, getWindow: () => win });
  function client(blocked = false) {
    const res = new EventEmitter() as any;
    Object.assign(res, {
      frames: [], setHeader() {}, writeHead(code, headers) { this.headers = headers; }, flushHeaders() {},
      write(packet) { this.frames.push(packet.toString()); return !blocked; },
      destroy() { this.destroyed = true; this.emit('close'); }, end() { this.destroy(); },
    });
    return res;
  }
  const slow = client(true), fast = client();
  try {
    await handler({ method: 'GET' } as any, slow, '/virtual-monitor/stream.mjpg');
    await handler({ method: 'GET' } as any, fast, '/virtual-monitor/stream.mjpg');
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.match(fast.headers['Content-Type'], /multipart\/x-mixed-replace/);
    assert.ok(fast.frames.length >= 2);
    assert.equal(slow.frames.length, 1);
    assert.ok(captures <= fast.frames.length + 1);
    slow.emit('drain');
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(slow.frames.length, 2);
    assert.match(slow.frames[1], /Content-Length:/);
  } finally {
    slow.destroy(); fast.destroy();
  }
  const stopped = captures;
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(captures, stopped);
});

test('stream ends when disabled and state identifies a replacement window', async () => {
  let enabled = true;
  let win = { isDestroyed: () => false, webContents: { capturePage: async () => ({
    isEmpty: () => false, getSize: () => ({ width: 1920, height: 1080 }), toJPEG: () => Buffer.from('frame'),
  }) } };
  const handler = createVirtualMonitorHandler({ enabled: () => enabled, getWindow: () => win });
  const server = createServer(async (req, res) => {
    await handler(req, res, new URL(req.url, 'http://localhost').pathname);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as any;
  const base = `http://127.0.0.1:${address.port}/virtual-monitor`;
  try {
    const before = await (await fetch(`${base}/state`)).json();
    win = { ...win };
    const after = await (await fetch(`${base}/state`)).json();
    assert.notEqual(after.session, before.session);
    const reader = (await fetch(`${base}/stream.mjpg`)).body.getReader();
    assert.equal((await reader.read()).done, false);
    enabled = false;
    while (!(await reader.read()).done) { /* Drain at most the in-flight frame. */ }
    assert.equal((await fetch(`${base}/state`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
