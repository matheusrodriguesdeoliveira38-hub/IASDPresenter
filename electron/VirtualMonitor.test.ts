import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createVirtualMonitorHandler, virtualMonitorDisplay } from './VirtualMonitor';

test('virtual monitor serves only its selected window and stops when disabled or closed', async () => {
  let enabled = false;
  let win = null;
  let captureCount = 0;
  let finishCapture;
  const bytes = Buffer.from('jpeg-frame');
  const image = { isEmpty: () => false, resize: () => image, toJPEG: () => bytes };
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
