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
let previousUrl;
document.getElementById('fullscreen').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{});
async function next(){
  try{
    const response=await fetch('/virtual-monitor/frame.jpg',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(response.status===200){
      const url=URL.createObjectURL(await response.blob());
      frame.src=url;frame.hidden=false;status.hidden=true;
      if(previousUrl)URL.revokeObjectURL(previousUrl);previousUrl=url;
    }else{
      frame.hidden=true;status.hidden=false;
      status.textContent=response.status===404?'Monitor virtual desativado.':'Aguardando projeção no monitor virtual…';
    }
  }catch(error){frame.hidden=true;status.hidden=false;status.textContent='Conexão perdida. Reconectando…'}
  setTimeout(next,frame.hidden?1000:66);
}
next();
</script></body></html>`;

// Share a capture across viewers; never retain a frame after its window closes.
export function createVirtualMonitorHandler({ enabled, getWindow }) {
  let pending = null;
  let lastWindow = null;
  let lastFrame = null;
  let capturedAt = 0;
  return async (request: IncomingMessage, response: ServerResponse, pathname: string) => {
    if (!['/virtual-monitor', '/virtual-monitor/', '/virtual-monitor/frame.jpg'].includes(pathname)) return false;
    response.setHeader('Cache-Control', 'no-store');
    if (!enabled()) {
      response.writeHead(404); response.end('Monitor virtual desativado.'); return true;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }); response.end(); return true;
    }
    if (pathname !== '/virtual-monitor/frame.jpg') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(viewerHtml); return true;
    }
    const win = getWindow();
    if (win !== lastWindow) { lastFrame = null; lastWindow = win; }
    if (!win || win.isDestroyed()) {
      response.writeHead(204); response.end(); return true;
    }
    try {
      if (!pending && (!lastFrame || Date.now() - capturedAt >= 66)) {
        pending = (async () => {
          const image = await win.webContents.capturePage();
          if (getWindow() !== win || win.isDestroyed() || !enabled() || image.isEmpty()) return;
          lastFrame = image.resize({ width: 1920, height: 1080, quality: 'good' }).toJPEG(78);
          capturedAt = Date.now();
        })().finally(() => { pending = null; });
      }
      await pending;
      if (!enabled() || win.isDestroyed() || getWindow() !== win || !lastFrame) {
        response.writeHead(204); response.end(); return true;
      }
      response.writeHead(200, { 'Content-Type': 'image/jpeg' }); response.end(lastFrame);
    } catch {
      lastFrame = null;
      response.writeHead(204); response.end();
    }
    return true;
  };
}
