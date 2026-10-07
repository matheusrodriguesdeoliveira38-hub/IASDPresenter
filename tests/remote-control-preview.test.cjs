const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('electron/main.ts', 'utf8');
function section(from, until) {
  const start = source.indexOf(from);
  return source.slice(start, source.indexOf(until, start));
}
function evaluate(code, context) {
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}

test('remote preview captures the actual slide rather than the web output or return monitor', async () => {
  const captured = [];
  const window = (name, query) => ({
    isDestroyed: () => false,
    webContents: {
      isDestroyed: () => false,
      getURL: () => 'http://localhost/#/popup?' + query,
      capturePage: async () => {
        captured.push(name);
        return { isEmpty: () => false, resize: () => ({ toJPEG: () => Buffer.from('slide') }) };
      },
    },
  });
  const context = vm.createContext({
    URLSearchParams, Buffer, mainAppWindow: null,
    remoteControlState: { projection: { active: true, module: 'presentation' } },
    getOutputExternalMediaState: () => ({ kind: 'video' }),
    BrowserWindow: { getAllWindows: () => [
      window('web', 'module=presentation&webOutput=1'),
      window('return', 'module=return_monitor'),
      window('clock', 'module=clock'),
      window('pulpit', 'module=pulpit_message'),
      // Projection windows are reused when switching modules; the URL can be old.
      window('slide', 'module=bible'),
    ] },
  });
  evaluate(section('async function sendRemoteControlPreview(', 'function hasWebOutputFrameConsumers'), context);
  const response = { writeHead(status) { this.status = status; }, end(body) { this.body = body; } };
  await context.sendRemoteControlPreview(response);
  assert.deepEqual(captured, ['slide']);
  assert.equal(response.status, 200);
  assert.equal(response.body.toString(), 'slide');
  for (const projection of [
    { active: false, module: 'presentation' },
    { active: true, module: 'media' },
    { active: true, module: 'external_media' },
  ]) {
    context.remoteControlState.projection = projection;
    await context.sendRemoteControlPreview(response);
    assert.equal(response.status, 204);
  }
  assert.deepEqual(captured, ['slide']);
});

test('remote page has one preview and preserves complete lyrics and frozen content', () => {
  const context = vm.createContext({});
  evaluate(section('function getRemoteControlHtml()', 'const handleVirtualMonitorRequest'), context);
  const html = context.getRemoteControlHtml();
  assert.equal((html.match(/id="projectionPreview"/g) || []).length, 1);
  assert.equal(html.includes('id="currentText"'), false);
  assert.equal(html.includes('id="nextText"'), false);
  assert.equal(html.includes('id="currentTitle"'), false);
  assert.equal((html.match(/id="previewTitle"/g) || []).length, 1);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  const elements = new Map();
  context.document = { getElementById: id => {
    if (!elements.has(id)) elements.set(id, { hidden: true, textContent: '' });
    return elements.get(id);
  } };
  context.setInterval = () => {};
  vm.runInContext(script.slice(script.indexOf("  var previewKey="), script.indexOf('  async function poll()')), context);
  context.updatePreview({ projection: { active: true, module: 'media' }, current: { text: 'Linha 1<br>Linha 2<br/>Linha 3<br />Linha 4', number: 1 } });
  assert.equal(elements.get('previewText').textContent, 'Linha 1\nLinha 2\nLinha 3\nLinha 4');
  context.updatePreview({ projection: { active: true, module: 'media', override: 'freeze' }, current: { text: 'Outra letra', number: 2 } });
  assert.equal(elements.get('previewText').textContent, 'Linha 1\nLinha 2\nLinha 3\nLinha 4');
  context.updatePreview({ projection: { active: true, module: 'external_media' }, externalMedia: { video: true } });
  assert.equal(elements.get('previewText').textContent, 'Vídeo em exibição');
  assert.equal(context.previewState.capture, false);
});
