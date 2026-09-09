const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));

test('queued dialogs resolve only their own callback, including reentrant alerts', () => {
  const state = {}, answers = [];
  const alert = loadTs('src/helpers/Alert.ts', {
    '@/helpers/Dev': { write() {} },
    '@/helpers/AppData': { set: (key, value) => { state[key] = value; } },
  }).default;
  alert.yesno('first', value => { answers.push(['first', value]); alert.info('third'); });
  alert.yesno('second', value => answers.push(['second', value]));
  assert.equal(state['alert.text'], 'first');
  alert.respond('yes');
  assert.equal(state['alert.text'], 'second');
  assert.deepEqual(answers, [['first', 'yes']]);
  alert.respond('no');
  assert.equal(state['alert.text'], 'third');
  assert.deepEqual(answers, [['first', 'yes'], ['second', 'no']]);
  alert.respond('close');
  assert.equal(state['alert.show'], false);
});

test('replacing and cancelling fades settles promises and removes timers', async () => {
  const timers = new Set();
  const { fadeVolume, cancelFade } = loadTs('src/helpers/AudioFade.ts', {}, {
    setInterval: fn => { timers.add(fn); return fn; },
    clearInterval: fn => timers.delete(fn),
  });
  const audio = { volume: 1, paused: false, pause() { this.paused = true; } };
  const outgoing = fadeVolume(audio, 0, 1000, true);
  const incoming = fadeVolume(audio, 0.7, 100);
  assert.equal(await outgoing, false);
  assert.equal(timers.size, 1);
  for (let i = 0; i < 2; i++) for (const tick of [...timers]) tick();
  assert.equal(await incoming, true);
  assert.equal(audio.volume, 0.7);
  assert.equal(audio.paused, false);
  const stopped = fadeVolume(audio, 0, 1000, true);
  cancelFade(audio);
  assert.equal(await stopped, false);
  assert.equal(timers.size, 0);
});

function pdfFixture() {
  const loads = [], canvases = [];
  const api = { GlobalWorkerOptions: {}, getDocument() {
    const ready = deferred();
    const task = { promise: ready.promise, destroyCount: 0, async destroy() { this.destroyCount++; ready.reject(new Error('destroyed')); } };
    loads.push({ task, ready });
    return task;
  } };
  const exports = loadTs('src/helpers/PresentationPdf.ts', {
    'pdfjs-dist/legacy/build/pdf.mjs': api,
    'pdfjs-dist/legacy/build/pdf.worker.mjs?url': 'worker',
  }, { document: { createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({}), toDataURL: () => 'image' };
    canvases.push(canvas);
    return canvas;
  } } });
  return { ...exports, loads, canvases, pdf: new exports.PresentationPdf() };
}

test('shared PDF byte conversion accepts IPC formats and rejects invalid data', () => {
  const { toPdfBytes } = pdfFixture();
  for (const data of [new Uint8Array([1, 2]), new Uint8Array([1, 2]).buffer, [1, 2], { type: 'Buffer', data: [1, 2] }, { data: [1, 2] }]) {
    assert.deepEqual([...toPdfBytes(data)], [1, 2]);
  }
  assert.throws(() => toPdfBytes(null), /Formato/);
});

test('late PDF reads cannot create workers after replacement or unmount', async () => {
  const { pdf, loads } = pdfFixture();
  const oldRead = deferred();
  const old = pdf.load(() => oldRead.promise, pdf.reset());
  pdf.reset();
  oldRead.resolve([1]);
  assert.equal(await old, null);
  assert.equal(loads.length, 0);
  const loading = pdf.load(async () => [2]);
  await flush();
  pdf.reset();
  assert.equal(await loading, null);
  assert.equal(loads[0].task.destroyCount, 1);
});

test('PDF replacement cancels rendering, destroys worker and clears canvas', async () => {
  const { pdf, loads, canvases } = pdfFixture();
  const render = deferred();
  let cancelled = 0, cleaned = 0;
  const page = {
    getViewport: () => ({ width: 400, height: 300 }),
    render: () => ({ promise: render.promise, cancel() { cancelled++; render.reject({ name: 'RenderingCancelledException' }); } }),
    cleanup: () => { cleaned++; },
  };
  const loading = pdf.load(async () => [1]);
  await flush();
  loads[0].ready.resolve({ getPage: async () => page });
  await loading;
  const image = pdf.render(1, 1, 0.8, 'preview', pdf.beginRender('preview'));
  await flush();
  pdf.reset();
  assert.equal(await image, '');
  assert.equal(cancelled, 1);
  assert.equal(cleaned, 1);
  assert.equal(loads[0].task.destroyCount, 1);
  assert.equal(canvases[0].width, 0);
  assert.equal(canvases[0].height, 0);
});

test('newest music wins when database replies arrive in reverse order', async () => {
  const reads = new Map(), state = new Map();
  const dependencies = {};
  for (const name of ['Dev','AppData','UserData','DateTime','Path','Alert','Modules','Database','History','Performance','Automation','Popup','AudioFade']) dependencies[`@/helpers/${name}`] = {};
  dependencies['@/helpers/Dev'] = { write() {} };
  dependencies['@/helpers/AppData'] = { get: key => state.get(key), set: (key, value) => state.set(key, value) };
  dependencies['@/helpers/UserData'] = { get() {} };
  dependencies['@/helpers/Database'] = { get: key => { const d = deferred(); reads.set(key, d); return d.promise; } };
  dependencies['@/helpers/History'] = { addSongPlay() {} };
  dependencies['@/helpers/Alert'] = { error() { assert.fail('Unexpected media error'); } };
  const media = loadTs('src/helpers/Media.ts', dependencies, { window: {} }).default;
  Object.assign(media, { clearQueue() {}, stopAudio() {}, clearVariables() {}, getElement: () => ({}), slides: () => [], setAlbumInfo() {}, maximize() {}, minimize() {}, async syncProjectionMonitors() {}, async syncReturnMonitor() {} });
  const first = media.open(1), second = media.open(2);
  reads.get('music_2').resolve({ name: 'second', albums: [] });
  await second;
  reads.get('music_1').resolve({ name: 'first', albums: [] });
  await first;
  assert.equal(state.get('modules.media.id_music'), 2);
  assert.equal(state.get('modules.media.config.title'), 'second');
});

function presentationComponent(globals = {}) {
  class Pdf {
    revision = 0;
    channels = new Map();
    reset() { return ++this.revision; }
    beginRender(channel) { const token = (this.channels.get(channel) || 0) + 1; this.channels.set(channel, token); return token; }
    isRenderCurrent(channel, token) { return this.channels.get(channel) === token; }
    async render(page) { return `page:${page}`; }
  }
  const component = loadTs('src/modules/presentation/interface/Index.vue', {
    '@/helpers/PresentationPdf': { PresentationPdf: Pdf },
    vue: { markRaw: value => value },
    '@/layout/ModuleContainer.vue': {},
    '@/helpers/Performance': { optimizePresentations: () => false },
    '../manifest.json': { id: 'presentation' },
  }, globals).default;
  const instance = component.data();
  for (const [key, fn] of Object.entries(component.methods)) instance[key] = fn.bind(instance);
  instance.t = key => key;
  instance.syncState = () => {};
  return instance;
}

test('thumbnail cache stays bounded after visiting every page of a large PDF', async () => {
  const instance = presentationComponent();
  instance.pdfDoc = { numPages: 100 };
  instance.slides = Array.from({ length: 100 }, (_, index) => ({ pageNumber: index + 1, thumbnail: '' }));
  for (let index = 0; index < 100; index++) {
    instance.slideIndex = index;
    await instance.renderVisibleThumbnails();
    assert.ok(Object.keys(instance.thumbnailCache).length <= 9);
    assert.ok(instance.slides.filter(slide => slide.thumbnail).length <= 9);
    assert.ok(instance.slides[index].thumbnail);
  }
});

test('late presentation conversion cannot replace the newest selection', async () => {
  const pending = new Map();
  const instance = presentationComponent({ window: { electronAPI: { preparePresentationFile(path) {
    const result = deferred(); pending.set(path, result); return result.promise;
  } } } });
  const loaded = [];
  instance.loadPdf = async path => { loaded.push(path); };
  const first = instance.loadFile('first.pptx');
  const second = instance.loadFile('second.pptx');
  pending.get('second.pptx').resolve({ ok: true, filePath: 'second.pdf' });
  await second;
  pending.get('first.pptx').resolve({ ok: true, filePath: 'first.pdf' });
  await first;
  assert.deepEqual(loaded, ['second.pdf']);
  assert.equal(instance.preparedPath, 'second.pdf');
  assert.equal(instance.loading, false);
});
