import type { IncomingMessage, ServerResponse } from 'node:http';

export const VIRTUAL_MONITOR_ID = 'virtual-monitor';

export function virtualMonitorDisplay() {
  return {
    id: VIRTUAL_MONITOR_ID,
    label: 'Monitor virtual',
    isVirtual: true,
    isPrimary: false,
    scaleFactor: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  };
}

const viewerHtml = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monitor virtual • IASDPresenter</title><style>
html,body{margin:0;width:100%;height:100%;background:#000;color:#fff;font:16px system-ui;overflow:hidden}
img{width:100%;height:100%;object-fit:contain}img[hidden]{display:none}
#status{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px}#status[hidden]{display:none}
button{position:absolute;right:16px;bottom:16px;padding:10px;border:0;border-radius:6px;background:#252525;color:white;cursor:pointer}
:fullscreen button{display:none}
</style></head><body><img id="frame" alt="Projeção" hidden><div id="status" role="status">Aguardando projeção no monitor virtual…</div>
<button id="fullscreen">Tela cheia</button><script>
const frame=document.getElementById('frame'),status=document.getElementById('status');
let session=null;
frame.onerror=()=>{session=null;frame.hidden=true;status.hidden=false};
document.getElementById('fullscreen').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{});
async function next(){
  try{
    const response=await fetch('/virtual-monitor/state',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    const state=response.ok?await response.json():{active:false};
    if(state.active){
      if(session!==state.session){session=state.session;frame.src='/virtual-monitor/stream.mjpg?t='+Date.now()}
      frame.hidden=false;status.hidden=true;
    }else{
      session=null;frame.removeAttribute('src');frame.hidden=true;status.hidden=false;
      status.textContent=response.status===404?'Monitor virtual desativado.':'Aguardando projeção no monitor virtual…';
    }
  }catch(error){session=null;frame.removeAttribute('src');frame.hidden=true;status.hidden=false;status.textContent='Conexão perdida. Reconectando…'}
  setTimeout(next,500);
}
next();
</script></body></html>`;

// Share a capture across viewers; never retain a frame after its window closes.
export function createVirtualMonitorHandler({ enabled, getWindow }) {
  let pending = null;
  let lastWindow = null;
  let lastFrame = null;
  let capturedAt = 0;
  let session = 0;
  const clients = new Set<{ response: ServerResponse; blocked: boolean }>();
  let timer = null;
  let streaming = false;
  const interval = 1000 / 30;
  function currentWindow() {
    const win = enabled() ? getWindow() : null;
    if (win !== lastWindow) { lastFrame = null; lastWindow = win; session++; }
    return win && !win.isDestroyed() ? win : null;
  }
  async function capture() {
    const win = currentWindow();
    if (!win) return null;
    if (!pending && (!lastFrame || Date.now() - capturedAt >= interval)) {
      capturedAt = Date.now();
      pending = (async () => {
        const image = await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true });
        if (currentWindow() !== win || image.isEmpty()) return;
        const size = image.getSize();
        const output = size.width === 1920 && size.height === 1080
          ? image : image.resize({ width: 1920, height: 1080, quality: 'good' });
        lastFrame = output.toJPEG(78);
      })().finally(() => { pending = null; });
    }
    await pending;
    return currentWindow() === win ? lastFrame : null;
  }
  async function stream() {
    timer = null;
    if (streaming || !clients.size) return;
    streaming = true;
    const started = Date.now();
    try {
      if (!currentWindow()) {
        for (const client of clients) client.response.end();
        clients.clear();
        return;
      }
      // A slow viewer drops frames instead of retaining an ever-growing queue.
      if ([...clients].some(client => !client.blocked)) {
        const frame = await capture();
        if (frame) {
          const packet = Buffer.concat([
            Buffer.from(`--iasdvirtual\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`),
            frame, Buffer.from('\r\n'),
          ]);
          for (const client of clients) {
            if (!client.blocked && !client.response.destroyed) client.blocked = !client.response.write(packet);
          }
        }
      }
    } catch {
      lastFrame = null;
      for (const client of clients) client.response.destroy();
      clients.clear();
    } finally {
      streaming = false;
      if (clients.size) timer = setTimeout(stream, Math.max(1, Math.ceil(interval - (Date.now() - started))));
    }
  }
  return async (request: IncomingMessage, response: ServerResponse, pathname: string) => {
    if (!['/virtual-monitor', '/virtual-monitor/', '/virtual-monitor/frame.jpg', '/virtual-monitor/stream.mjpg', '/virtual-monitor/state'].includes(pathname)) return false;
    response.setHeader('Cache-Control', 'no-store');
    if (!enabled()) {
      response.writeHead(404); response.end('Monitor virtual desativado.'); return true;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }); response.end(); return true;
    }
    if (pathname === '/virtual-monitor/state') {
      const win = currentWindow();
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ active: Boolean(win), session })); return true;
    }
    if (pathname === '/virtual-monitor/stream.mjpg') {
      if (!currentWindow()) { response.writeHead(204); response.end(); return true; }
      response.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=iasdvirtual', 'X-Accel-Buffering': 'no' });
      response.flushHeaders();
      const client = { response, blocked: false };
      clients.add(client);
      response.on('drain', () => { client.blocked = false; });
      response.on('close', () => {
        clients.delete(client);
        if (!clients.size && timer) { clearTimeout(timer); timer = null; }
      });
      if (!timer && !streaming) void stream();
      return true;
    }
    if (pathname !== '/virtual-monitor/frame.jpg') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(viewerHtml); return true;
    }
    try {
      const frame = await capture();
      if (!frame) {
        response.writeHead(204); response.end(); return true;
      }
      response.writeHead(200, { 'Content-Type': 'image/jpeg' }); response.end(frame);
    } catch {
      lastFrame = null;
      response.writeHead(204); response.end();
    }
    return true;
  };
}
